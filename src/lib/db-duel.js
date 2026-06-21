import { and, asc, eq, gt, isNull, ne } from "drizzle-orm";
import { db } from "./db";
import { duelMatchPlayers, duelMatches, duelQueue } from "./schema";

const QUEUE_TTL_MS  = 60_000;  // queue row expires after 60s of no refresh
const MATCH_DURATION_MS = 10 * 60_000; // 10-minute match timer

// ── Queue ─────────────────────────────────────────────────────

export async function enqueuePlayer(clerkId, displayName) {
  const now       = new Date();
  const expiresAt = new Date(now.getTime() + QUEUE_TTL_MS);

  await db
    .insert(duelQueue)
    .values({ clerkId, displayName, joinedAt: now, expiresAt, matchId: null })
    .onConflictDoUpdate({
      target: duelQueue.clerkId,
      // Refresh timing + name, but never overwrite an already-assigned matchId
      set: { displayName, joinedAt: now, expiresAt, updatedAt: now },
    });
}

export async function getQueueEntry(clerkId) {
  const [row] = await db
    .select()
    .from(duelQueue)
    .where(eq(duelQueue.clerkId, clerkId))
    .limit(1);
  return row ?? null;
}

export async function cancelQueueEntry(clerkId) {
  await db.delete(duelQueue).where(eq(duelQueue.clerkId, clerkId));
}

// ── Matching ──────────────────────────────────────────────────

export async function tryMatchPlayer(myClerkId, myDisplayName) {
  // Find oldest unmatched opponent whose queue row hasn't expired
  const [opponent] = await db
    .select()
    .from(duelQueue)
    .where(
      and(
        ne(duelQueue.clerkId, myClerkId),
        isNull(duelQueue.matchId),
        gt(duelQueue.expiresAt, new Date()),
      )
    )
    .orderBy(asc(duelQueue.joinedAt))
    .limit(1);

  if (!opponent) return null;

  // neon-http has no transaction support — use a conditional UPDATE as the
  // atomic "claim" step. PostgreSQL guarantees that of N concurrent writers
  // only one UPDATE finds match_id IS NULL; the rest get 0 rows affected.

  const now    = new Date();
  const endsAt = new Date(now.getTime() + MATCH_DURATION_MS);

  // Step 1: create the match record (may be orphaned if we lose the race below)
  const [match] = await db
    .insert(duelMatches)
    .values({ status: "active", startedAt: now, endsAt })
    .returning();

  // Step 2: atomically claim the opponent — only succeeds if still unmatched
  const claimed = await db
    .update(duelQueue)
    .set({ matchId: match.id, updatedAt: now })
    .where(and(eq(duelQueue.clerkId, opponent.clerkId), isNull(duelQueue.matchId)))
    .returning({ clerkId: duelQueue.clerkId });

  if (claimed.length === 0) {
    // Lost the race — mark the orphaned match abandoned and let client retry
    await db
      .update(duelMatches)
      .set({ status: "abandoned" })
      .where(eq(duelMatches.id, match.id))
      .catch(() => {});
    return null;
  }

  // Step 3: won the race — assign our own queue row + create player records
  await db
    .update(duelQueue)
    .set({ matchId: match.id, updatedAt: now })
    .where(eq(duelQueue.clerkId, myClerkId));

  await db.insert(duelMatchPlayers).values([
    { matchId: match.id, clerkId: myClerkId,        displayName: myDisplayName },
    { matchId: match.id, clerkId: opponent.clerkId, displayName: opponent.displayName },
  ]);

  return {
    matchId:      match.id,
    endsAt:       match.endsAt,
    opponentName: opponent.displayName,
  };
}

// ── Match lookup ──────────────────────────────────────────────

export async function getMatchForUser(clerkId) {
  const queueRow = await getQueueEntry(clerkId);
  if (!queueRow?.matchId) return null;

  const [match] = await db
    .select()
    .from(duelMatches)
    .where(and(eq(duelMatches.id, queueRow.matchId), eq(duelMatches.status, "active")))
    .limit(1);

  if (!match) return null;

  const players = await db
    .select()
    .from(duelMatchPlayers)
    .where(eq(duelMatchPlayers.matchId, match.id));

  const opponent = players.find((p) => p.clerkId !== clerkId);
  return {
    matchId:      match.id,
    endsAt:       match.endsAt,
    opponentName: opponent?.displayName ?? "Opponent",
  };
}
