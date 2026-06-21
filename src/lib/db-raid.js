import { and, asc, eq, gt, gte, inArray, isNull, ne } from "drizzle-orm";
import { db } from "./db";
import { raidMatches, raidMatchPlayers, raidQueue, userPresence } from "./schema";
import { updateBestScore } from "./db-users";

// ── Constants ── change RAID_MATCH_DURATION_MS to adjust match length ──
const QUEUE_TTL_MS           = 60_000;
const PRESENCE_WINDOW_MS     = 20_000;
const REQUIRED_PLAYERS       = 4;           // 2 per team
const RAID_MATCH_DURATION_MS = 90_000;      // 30 seconds
const DEFAULT_CODEBASE       = "AstroStructure";

// ── Queue ──────────────────────────────────────────────────────

export async function enqueueForRaid(clerkId, displayName) {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + QUEUE_TTL_MS);
  await db
    .insert(raidQueue)
    .values({ clerkId, displayName, joinedAt: now, expiresAt, matchId: null })
    .onConflictDoUpdate({
      target: raidQueue.clerkId,
      set: { displayName, joinedAt: now, expiresAt, matchId: null, updatedAt: now },
    });
}

export async function cancelRaidQueue(clerkId) {
  await db.delete(raidQueue).where(eq(raidQueue.clerkId, clerkId));
}

export async function getRaidQueueEntry(clerkId) {
  const [row] = await db.select().from(raidQueue).where(eq(raidQueue.clerkId, clerkId)).limit(1);
  return row ?? null;
}

// ── Matchmaking ────────────────────────────────────────────────

export async function tryMatchRaid(myClerkId, myDisplayName) {
  const presenceThreshold = new Date(Date.now() - PRESENCE_WINDOW_MS);
  const needed = REQUIRED_PLAYERS - 1; // 3 others

  const others = await db
    .select({ clerkId: raidQueue.clerkId, displayName: raidQueue.displayName })
    .from(raidQueue)
    .innerJoin(userPresence, eq(userPresence.clerkId, raidQueue.clerkId))
    .where(and(
      ne(raidQueue.clerkId, myClerkId),
      isNull(raidQueue.matchId),
      gt(raidQueue.expiresAt, new Date()),
      gte(userPresence.lastSeenAt, presenceThreshold),
    ))
    .orderBy(asc(raidQueue.joinedAt))
    .limit(needed);

  if (others.length < needed) return null;

  const now    = new Date();
  const endsAt = new Date(now.getTime() + RAID_MATCH_DURATION_MS);

  const [match] = await db
    .insert(raidMatches)
    .values({ status: "active", codebaseFolder: DEFAULT_CODEBASE, startedAt: now, endsAt })
    .returning();

  // Atomically claim the 3 others — abort if any were already claimed
  const otherIds = others.map((o) => o.clerkId);
  const claimed  = await db
    .update(raidQueue)
    .set({ matchId: match.id, updatedAt: now })
    .where(and(inArray(raidQueue.clerkId, otherIds), isNull(raidQueue.matchId)))
    .returning({ clerkId: raidQueue.clerkId });

  if (claimed.length < needed) {
    await db
      .update(raidMatches)
      .set({ status: "abandoned" })
      .where(eq(raidMatches.id, match.id))
      .catch(() => {});
    return null;
  }

  // Claim my own row
  await db
    .update(raidQueue)
    .set({ matchId: match.id, updatedAt: now })
    .where(eq(raidQueue.clerkId, myClerkId));

  // Team assignment: [me, others[0]] → Team 0 ; [others[1], others[2]] → Team 1
  await db.insert(raidMatchPlayers).values([
    { matchId: match.id, clerkId: myClerkId,         displayName: myDisplayName,      teamId: 0 },
    { matchId: match.id, clerkId: others[0].clerkId, displayName: others[0].displayName, teamId: 0 },
    { matchId: match.id, clerkId: others[1].clerkId, displayName: others[1].displayName, teamId: 1 },
    { matchId: match.id, clerkId: others[2].clerkId, displayName: others[2].displayName, teamId: 1 },
  ]);

  return { matchId: match.id, endsAt: match.endsAt?.toISOString?.() ?? null };
}

// ── Match lookup (for queue polling / reconnect) ───────────────

export async function getRaidMatchForUser(clerkId) {
  const entry = await getRaidQueueEntry(clerkId);
  if (!entry?.matchId) return null;

  const [match] = await db
    .select()
    .from(raidMatches)
    .where(and(eq(raidMatches.id, entry.matchId), eq(raidMatches.status, "active")))
    .limit(1);

  if (!match) return null;
  return { matchId: match.id, endsAt: match.endsAt?.toISOString?.() ?? null };
}

// ── Full match state (polled by arena client) ──────────────────

export async function getRaidMatchState(matchId, myClerkId) {
  const [match] = await db
    .select()
    .from(raidMatches)
    .where(eq(raidMatches.id, matchId))
    .limit(1);
  if (!match) return null;

  const players = await db
    .select()
    .from(raidMatchPlayers)
    .where(eq(raidMatchPlayers.matchId, matchId));

  const me = players.find((p) => p.clerkId === myClerkId);
  if (!me) return null;

  const teams = [0, 1].map((teamId) => {
    const members = players.filter((p) => p.teamId === teamId);
    return {
      teamId,
      totalScore: members.reduce((s, p) => s + p.totalScore, 0),
      players: members.map((p) => ({
        clerkId:     p.clerkId,
        displayName: p.displayName,
        totalScore:  p.totalScore,
        status:      p.status,
        isMe:        p.clerkId === myClerkId,
      })),
    };
  });

  return {
    matchId:        match.id,
    status:         match.status,
    codebaseFolder: match.codebaseFolder,
    endsAt:         match.endsAt?.toISOString?.() ?? null,
    winnerTeam:     match.winnerTeam ?? null,
    teams,
    me: {
      clerkId:      me.clerkId,
      displayName:  me.displayName,
      teamId:       me.teamId,
      totalScore:   me.totalScore,
      fileProgress: JSON.parse(me.fileProgress || "{}"),
      status:       me.status,
    },
  };
}

// ── Progress update ────────────────────────────────────────────

export async function updateRaidPlayerProgress(matchId, clerkId, fileProgress, totalScore) {
  await db
    .update(raidMatchPlayers)
    .set({ fileProgress: JSON.stringify(fileProgress), totalScore, updatedAt: new Date() })
    .where(and(eq(raidMatchPlayers.matchId, matchId), eq(raidMatchPlayers.clerkId, clerkId)));
}

// ── Auto-complete when timer expires ──────────────────────────

export async function autoCompleteRaidIfExpired(matchId) {
  const [match] = await db
    .select()
    .from(raidMatches)
    .where(and(eq(raidMatches.id, matchId), eq(raidMatches.status, "active")))
    .limit(1);

  if (!match || !match.endsAt || new Date() <= new Date(match.endsAt)) return false;

  const players = await db
    .select()
    .from(raidMatchPlayers)
    .where(eq(raidMatchPlayers.matchId, matchId));

  const teamScores = [0, 1].map((t) =>
    players.filter((p) => p.teamId === t).reduce((s, p) => s + p.totalScore, 0)
  );

  let winnerTeam = null;
  if (teamScores[0] > teamScores[1]) winnerTeam = 0;
  else if (teamScores[1] > teamScores[0]) winnerTeam = 1;

  await db
    .update(raidMatches)
    .set({ status: "completed", winnerTeam, updatedAt: new Date() })
    .where(eq(raidMatches.id, matchId));

  // Persist each player's match score as personal best if it's their highest
  await Promise.all(
    players.map((p) => updateBestScore(p.clerkId, p.totalScore).catch(() => {}))
  );

  return true;
}
