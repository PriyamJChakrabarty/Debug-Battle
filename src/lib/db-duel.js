import { readFileSync } from "fs";
import { join } from "path";
import { and, asc, eq, gt, gte, isNull, ne } from "drizzle-orm";
import { db } from "./db";
import { duelMatchPlayers, duelMatches, duelQueue, userPresence } from "./schema";

const QUEUE_TTL_MS       = 60_000;
const MATCH_DURATION_MS  = 10 * 60_000;
const PRESENCE_WINDOW_MS = 20_000;
const TOTAL_CATEGORIES   = 5;

// ── Challenge selection ───────────────────────────────────────

function pickRandomProblem() {
  const raw = JSON.parse(
    readFileSync(join(process.cwd(), "public", "data", "data.json"), "utf-8")
  );
  const problems = raw.Problems;
  const chosen   = problems[Math.floor(Math.random() * problems.length)];
  return {
    challengeSlot: chosen.Code,
    challengeData: JSON.stringify(chosen.Vulnerabilities),
  };
}

// ── Queue ─────────────────────────────────────────────────────

export async function enqueuePlayer(clerkId, displayName) {
  const now       = new Date();
  const expiresAt = new Date(now.getTime() + QUEUE_TTL_MS);

  await db
    .insert(duelQueue)
    .values({ clerkId, displayName, joinedAt: now, expiresAt, matchId: null })
    .onConflictDoUpdate({
      target: duelQueue.clerkId,
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
  const presenceThreshold = new Date(Date.now() - PRESENCE_WINDOW_MS);

  const [opponent] = await db
    .select({ clerkId: duelQueue.clerkId, displayName: duelQueue.displayName, matchId: duelQueue.matchId })
    .from(duelQueue)
    .innerJoin(userPresence, eq(userPresence.clerkId, duelQueue.clerkId))
    .where(and(
      ne(duelQueue.clerkId, myClerkId),
      isNull(duelQueue.matchId),
      gt(duelQueue.expiresAt, new Date()),
      gte(userPresence.lastSeenAt, presenceThreshold),
    ))
    .orderBy(asc(duelQueue.joinedAt))
    .limit(1);

  if (!opponent) return null;

  const now    = new Date();
  const endsAt = new Date(now.getTime() + MATCH_DURATION_MS);
  const { challengeSlot, challengeData } = pickRandomProblem();

  const [match] = await db
    .insert(duelMatches)
    .values({ status: "active", startedAt: now, endsAt, challengeSlot, challengeData })
    .returning();

  // Atomic claim — only one concurrent writer wins
  const claimed = await db
    .update(duelQueue)
    .set({ matchId: match.id, updatedAt: now })
    .where(and(eq(duelQueue.clerkId, opponent.clerkId), isNull(duelQueue.matchId)))
    .returning({ clerkId: duelQueue.clerkId });

  if (claimed.length === 0) {
    await db.update(duelMatches).set({ status: "abandoned" }).where(eq(duelMatches.id, match.id)).catch(() => {});
    return null;
  }

  await db.update(duelQueue).set({ matchId: match.id, updatedAt: now }).where(eq(duelQueue.clerkId, myClerkId));

  await db.insert(duelMatchPlayers).values([
    { matchId: match.id, clerkId: myClerkId,        displayName: myDisplayName },
    { matchId: match.id, clerkId: opponent.clerkId, displayName: opponent.displayName },
  ]);

  return { matchId: match.id, endsAt: match.endsAt, opponentName: opponent.displayName };
}

export async function abandonMatch(matchId) {
  await db.update(duelMatches).set({ status: "abandoned", updatedAt: new Date() }).where(eq(duelMatches.id, matchId));
  await db.update(duelQueue).set({ matchId: null, updatedAt: new Date() }).where(eq(duelQueue.matchId, matchId));
}

// ── Match lookup (for queue/matchmaking polling) ──────────────

export async function getMatchForUser(clerkId) {
  const queueRow = await getQueueEntry(clerkId);
  if (!queueRow?.matchId) return null;

  const [match] = await db
    .select()
    .from(duelMatches)
    .where(and(eq(duelMatches.id, queueRow.matchId), eq(duelMatches.status, "active")))
    .limit(1);

  if (!match) return null;

  const players  = await db.select().from(duelMatchPlayers).where(eq(duelMatchPlayers.matchId, match.id));
  const opponent = players.find((p) => p.clerkId !== clerkId);

  return {
    matchId:      match.id,
    endsAt:       match.endsAt,
    opponentName: opponent?.displayName ?? "Opponent",
  };
}

// ── Match state (for the arena page) ─────────────────────────

export async function getMatchState(matchId, myClerkId) {
  const [match] = await db.select().from(duelMatches).where(eq(duelMatches.id, matchId)).limit(1);
  if (!match) return null;

  const players  = await db.select().from(duelMatchPlayers).where(eq(duelMatchPlayers.matchId, matchId));
  const me       = players.find((p) => p.clerkId === myClerkId);
  const opponent = players.find((p) => p.clerkId !== myClerkId);

  if (!me) return null;

  return {
    matchId:        match.id,
    status:         match.status,
    endsAt:         match.endsAt,
    winnerClerkId:  match.winnerClerkId ?? null,
    challengeSlot:  match.challengeSlot,
    challengeData:  match.challengeData,
    me: {
      clerkId:       me.clerkId,
      displayName:   me.displayName,
      score:         me.score,
      categoryIndex: me.categoryIndex,
      fixedCounts:   JSON.parse(me.fixedCounts || "{}"),
      status:        me.status,
    },
    opponent: opponent ? {
      clerkId:       opponent.clerkId,
      displayName:   opponent.displayName,
      score:         opponent.score,
      categoryIndex: opponent.categoryIndex,
      status:        opponent.status,
    } : null,
  };
}

// ── Progress update (called by submit route) ──────────────────

export async function updatePlayerProgress(matchId, clerkId, { score, fixedCounts }) {
  await db
    .update(duelMatchPlayers)
    .set({ score, fixedCounts: JSON.stringify(fixedCounts), updatedAt: new Date() })
    .where(and(eq(duelMatchPlayers.matchId, matchId), eq(duelMatchPlayers.clerkId, clerkId)));
}

// ── Category advance (called by advance route) ────────────────

export async function advanceCategory(matchId, clerkId) {
  const [player] = await db
    .select()
    .from(duelMatchPlayers)
    .where(and(eq(duelMatchPlayers.matchId, matchId), eq(duelMatchPlayers.clerkId, clerkId)))
    .limit(1);

  if (!player) return null;

  const newIdx    = player.categoryIndex + 1;
  const finished  = newIdx >= TOTAL_CATEGORIES;

  await db
    .update(duelMatchPlayers)
    .set({ categoryIndex: newIdx, status: finished ? "finished" : "active", updatedAt: new Date() })
    .where(and(eq(duelMatchPlayers.matchId, matchId), eq(duelMatchPlayers.clerkId, clerkId)));

  let matchCompleted = false;
  let winnerClerkId  = null;

  if (finished) {
    const allPlayers = await db.select().from(duelMatchPlayers).where(eq(duelMatchPlayers.matchId, matchId));
    if (allPlayers.every((p) => p.status === "finished" || p.clerkId === clerkId)) {
      // Both done — determine winner by score
      const sorted = [...allPlayers].sort((a, b) => b.score - a.score);
      winnerClerkId = sorted[0].score > sorted[1]?.score ? sorted[0].clerkId : null;
      await db.update(duelMatches)
        .set({ status: "completed", winnerClerkId, updatedAt: new Date() })
        .where(eq(duelMatches.id, matchId));
      matchCompleted = true;
    }
  }

  return { categoryIndex: newIdx, finished, matchCompleted, winnerClerkId };
}

// ── Timeout auto-complete (called from GET match/[id]) ────────

export async function autoCompleteIfExpired(matchId) {
  const [match] = await db
    .select()
    .from(duelMatches)
    .where(and(eq(duelMatches.id, matchId), eq(duelMatches.status, "active")))
    .limit(1);

  if (!match || !match.endsAt || new Date() <= new Date(match.endsAt)) return false;

  const players = await db.select().from(duelMatchPlayers).where(eq(duelMatchPlayers.matchId, matchId));
  const sorted  = [...players].sort((a, b) => b.score - a.score);
  const winner  = sorted.length >= 2 && sorted[0].score > sorted[1].score ? sorted[0].clerkId : null;

  await db.update(duelMatches)
    .set({ status: "completed", winnerClerkId: winner, updatedAt: new Date() })
    .where(eq(duelMatches.id, matchId));

  return true;
}

// ── Disconnect check (used during matchmaking polling) ────────

export async function getMatchStatus(matchId, myClerkId) {
  const [match] = await db.select().from(duelMatches).where(eq(duelMatches.id, matchId)).limit(1);
  if (!match) return { status: "not_found" };
  if (match.status !== "active") return { status: match.status };

  const players  = await db.select().from(duelMatchPlayers).where(eq(duelMatchPlayers.matchId, matchId));
  const opponent = players.find((p) => p.clerkId !== myClerkId);
  if (!opponent) return { status: "active" };

  const threshold = new Date(Date.now() - PRESENCE_WINDOW_MS);
  const [pres]    = await db
    .select({ lastSeenAt: userPresence.lastSeenAt })
    .from(userPresence)
    .where(eq(userPresence.clerkId, opponent.clerkId))
    .limit(1);

  const opponentOnline = pres && pres.lastSeenAt >= threshold;
  if (!opponentOnline) {
    await abandonMatch(matchId);
    return { status: "abandoned", reason: "opponent_offline" };
  }
  return { status: "active", opponentName: opponent.displayName };
}
