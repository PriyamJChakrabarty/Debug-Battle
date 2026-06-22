import { and, asc, desc, eq, inArray, isNotNull, ne, sql } from "drizzle-orm";
import { db } from "./db";
import { teamMembers, teamMessages, teamRaids, teams, raidMatchPlayers, raidMatches, raidInvitations, users } from "./schema";

const ROLE_RANK = { captain: 0, vice_captain: 1, member: 2 };

function canAct(actorRole, targetRole) {
  return ROLE_RANK[actorRole] < ROLE_RANK[targetRole];
}

// ── Create ─────────────────────────────────────────────────────

export async function createTeam(captainClerkId, captainName, name, emoji, size) {
  // Player must not already be in a team
  const [existing] = await db.select({ id: teamMembers.id })
    .from(teamMembers).where(eq(teamMembers.clerkId, captainClerkId)).limit(1);
  if (existing) throw new Error("Already in a team");

  const [team] = await db.insert(teams).values({ name, emoji, size }).returning();

  await db.insert(teamMembers).values({
    teamId: team.id, clerkId: captainClerkId, role: "captain",
  });

  return team;
}

// ── Read ───────────────────────────────────────────────────────

export async function getMyTeam(clerkId) {
  const [membership] = await db.select({ teamId: teamMembers.teamId, role: teamMembers.role })
    .from(teamMembers).where(eq(teamMembers.clerkId, clerkId)).limit(1);
  if (!membership) return null;

  const [team] = await db.select().from(teams).where(eq(teams.id, membership.teamId)).limit(1);
  if (!team) return null;

  const members = await db
    .select({
      clerkId:     teamMembers.clerkId,
      role:        teamMembers.role,
      joinedAt:    teamMembers.joinedAt,
      displayName: users.username,
      firstName:   users.firstName,
      lastName:    users.lastName,
      imageUrl:    users.imageUrl,
    })
    .from(teamMembers)
    .leftJoin(users, eq(users.clerkId, teamMembers.clerkId))
    .where(eq(teamMembers.teamId, team.id))
    .orderBy(asc(teamMembers.role), asc(teamMembers.joinedAt));

  return {
    ...team,
    myRole: membership.role,
    members: members.map((m) => ({
      clerkId:     m.clerkId,
      role:        m.role,
      joinedAt:    m.joinedAt,
      displayName: resolveDisplayName(m),
      imageUrl:    m.imageUrl ?? null,
    })),
  };
}

export async function listOpenTeams() {
  // All teams — client filters by available slots
  const allTeams = await db.select().from(teams).orderBy(desc(teams.createdAt)).limit(50);
  if (allTeams.length === 0) return [];

  const teamIds = allTeams.map((t) => t.id);
  const counts  = await db
    .select({ teamId: teamMembers.teamId, count: sql`count(*)::int` })
    .from(teamMembers)
    .where(inArray(teamMembers.teamId, teamIds))
    .groupBy(teamMembers.teamId);

  const countMap = Object.fromEntries(counts.map((c) => [c.teamId, c.count]));
  return allTeams
    .map((t) => ({ ...t, memberCount: countMap[t.id] ?? 0 }))
    .filter((t) => t.memberCount < t.size);
}

// ── Join / Leave ───────────────────────────────────────────────

export async function joinTeam(teamId, clerkId) {
  const [existing] = await db.select({ id: teamMembers.id })
    .from(teamMembers).where(eq(teamMembers.clerkId, clerkId)).limit(1);
  if (existing) throw new Error("Already in a team");

  const [team] = await db.select().from(teams).where(eq(teams.id, teamId)).limit(1);
  if (!team) throw new Error("Team not found");

  const [{ count }] = await db
    .select({ count: sql`count(*)::int` })
    .from(teamMembers).where(eq(teamMembers.teamId, teamId));
  if (count >= team.size) throw new Error("Team is full");

  await db.insert(teamMembers).values({ teamId, clerkId, role: "member" });
  return { ok: true };
}

export async function leaveTeam(teamId, clerkId) {
  const [me] = await db.select({ role: teamMembers.role })
    .from(teamMembers)
    .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.clerkId, clerkId)))
    .limit(1);
  if (!me) throw new Error("Not in this team");

  if (me.role === "captain") {
    // Try to promote a VC, then a member, to captain before leaving
    const [nextCaptain] = await db.select({ clerkId: teamMembers.clerkId, role: teamMembers.role })
      .from(teamMembers)
      .where(and(eq(teamMembers.teamId, teamId), ne(teamMembers.clerkId, clerkId)))
      .orderBy(asc(teamMembers.role), asc(teamMembers.joinedAt))
      .limit(1);

    if (!nextCaptain) {
      // Last member — disband the team
      await db.delete(teamMembers).where(eq(teamMembers.teamId, teamId));
      await db.delete(teams).where(eq(teams.id, teamId));
      return { disbanded: true };
    }

    await db.update(teamMembers)
      .set({ role: "captain" })
      .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.clerkId, nextCaptain.clerkId)));
  }

  await db.delete(teamMembers)
    .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.clerkId, clerkId)));

  return { ok: true };
}

// ── Role management ────────────────────────────────────────────

export async function kickMember(teamId, kickerClerkId, targetClerkId) {
  const [kicker] = await db.select({ role: teamMembers.role })
    .from(teamMembers)
    .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.clerkId, kickerClerkId)))
    .limit(1);
  const [target] = await db.select({ role: teamMembers.role })
    .from(teamMembers)
    .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.clerkId, targetClerkId)))
    .limit(1);

  if (!kicker || !target) throw new Error("Member not found");
  if (!canAct(kicker.role, target.role)) throw new Error("Insufficient authority");

  await db.delete(teamMembers)
    .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.clerkId, targetClerkId)));
  return { ok: true };
}

export async function promoteOrDemote(teamId, changerClerkId, targetClerkId, action) {
  const [changer] = await db.select({ role: teamMembers.role })
    .from(teamMembers)
    .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.clerkId, changerClerkId)))
    .limit(1);
  const [target] = await db.select({ role: teamMembers.role })
    .from(teamMembers)
    .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.clerkId, targetClerkId)))
    .limit(1);

  if (!changer || !target) throw new Error("Member not found");
  if (!canAct(changer.role, target.role)) throw new Error("Insufficient authority");

  if (action === "promote") {
    const newTargetRole = target.role === "member" ? "vice_captain" : "captain";

    if (newTargetRole === "captain") {
      // Swap: current captain becomes vice_captain
      await db.update(teamMembers)
        .set({ role: "vice_captain" })
        .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.clerkId, changerClerkId)));
    }
    await db.update(teamMembers)
      .set({ role: newTargetRole })
      .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.clerkId, targetClerkId)));

  } else if (action === "demote") {
    if (!canAct(changer.role, target.role)) throw new Error("Insufficient authority");
    if (target.role === "member") throw new Error("Cannot demote further");

    const newRole = target.role === "captain" ? "vice_captain" : "member";
    await db.update(teamMembers)
      .set({ role: newRole })
      .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.clerkId, targetClerkId)));
  }

  return { ok: true };
}

// ── Chat ───────────────────────────────────────────────────────

export async function sendTeamMessage(teamId, senderClerkId, senderName, content) {
  // Verify sender is a team member
  const [membership] = await db.select({ id: teamMembers.id })
    .from(teamMembers)
    .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.clerkId, senderClerkId)))
    .limit(1);
  if (!membership) throw new Error("Not a team member");

  const [msg] = await db.insert(teamMessages)
    .values({ teamId, senderClerkId, senderName, content })
    .returning();
  return msg;
}

export async function getTeamMessages(teamId, limit = 60) {
  return db.select().from(teamMessages)
    .where(eq(teamMessages.teamId, teamId))
    .orderBy(asc(teamMessages.createdAt))
    .limit(limit);
}

// ── Team Raids ──────────────────────────────────────────────────

// Called by the Captain's Raid button — registers the intent. matchId is filled in post-match.
export async function registerTeamRaid(teamId, captainClerkId, teamGroupId) {
  void teamGroupId;

  const [membership] = await db.select({ role: teamMembers.role })
    .from(teamMembers)
    .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.clerkId, captainClerkId)))
    .limit(1);
  if (!membership || membership.role !== "captain") throw new Error("Only the captain can start a team raid");

  const [row] = await db.insert(teamRaids).values({ teamId }).returning();
  return row;
}

// Called post-match — links the completed match back to the team and updates W/L.
export async function resolveTeamRaidResult(matchId, players, winnerTeam) {
  const clerkIds = players.map((p) => p.clerkId);
  if (clerkIds.length === 0) return;

  console.log(`[resolveTeamRaidResult] matchId=${matchId} players=${clerkIds.map((c) => c.slice(-6))} winnerTeam=${winnerTeam}`);

  const invites = await db
    .select({
      sourceTeamId: raidInvitations.sourceTeamId,
      teamGroupId: raidInvitations.teamGroupId,
      inviterClerkId: raidInvitations.inviterClerkId,
      inviteeClerkId: raidInvitations.inviteeClerkId,
    })
    .from(raidInvitations)
    .where(and(
      inArray(raidInvitations.inviteeClerkId, clerkIds),
      isNotNull(raidInvitations.sourceTeamId),
      eq(raidInvitations.status, "accepted"),
    ))
    .limit(1);

  console.log(`[resolveTeamRaidResult] invite lookup returned ${invites.length} row(s):`, JSON.stringify(invites));

  if (invites.length === 0) {
    console.log(`[resolveTeamRaidResult] no team invite found — skipping (not a team raid or invite missing sourceTeamId)`);
    return;
  }

  const { sourceTeamId, teamGroupId, inviterClerkId, inviteeClerkId } = invites[0];

  const captainPlayer = players.find((p) => p.clerkId === inviterClerkId);
  const inviteePlayer = players.find((p) => p.clerkId === inviteeClerkId);
  const refPlayer     = captainPlayer ?? inviteePlayer ?? null;
  const myTeamSideId  = refPlayer?.teamId ?? null;

  if (myTeamSideId === null) {
    console.log(`[resolveTeamRaidResult] could not determine the source team's side for teamId=${sourceTeamId}`);
    return;
  }

  const result = winnerTeam === null ? "draw"
               : winnerTeam === myTeamSideId ? "win" : "loss";

  console.log(`[resolveTeamRaidResult] teamId=${sourceTeamId} teamGroupId=${teamGroupId?.slice(-8)} side=${myTeamSideId} result=${result}`);

  const [pendingRaid] = await db
    .select({ id: teamRaids.id })
    .from(teamRaids)
    .where(and(
      eq(teamRaids.teamId, sourceTeamId),
      sql`${teamRaids.matchId} IS NULL`,
    ))
    .orderBy(desc(teamRaids.createdAt))
    .limit(1);

  if (!pendingRaid) {
    console.log(`[resolveTeamRaidResult] no pending team raid registration found for teamId=${sourceTeamId}`);
    return;
  }

  const updated = await db.update(teamRaids)
    .set({ matchId })
    .where(and(
      eq(teamRaids.id, pendingRaid.id),
      sql`${teamRaids.matchId} IS NULL`,
    ))
    .returning({ id: teamRaids.id });

  console.log(`[resolveTeamRaidResult] team_raids updated ${updated.length} row(s)`);

  if (updated.length === 0) {
    console.log(`[resolveTeamRaidResult] team raid already linked for teamId=${sourceTeamId}; skipping W/L update`);
    return;
  }

  if (result === "win") {
    await db.update(teams).set({ wins: sql`${teams.wins} + 1` }).where(eq(teams.id, sourceTeamId));
    console.log(`[resolveTeamRaidResult] incremented wins for teamId=${sourceTeamId}`);
  } else if (result === "loss") {
    await db.update(teams).set({ losses: sql`${teams.losses} + 1` }).where(eq(teams.id, sourceTeamId));
    console.log(`[resolveTeamRaidResult] incremented losses for teamId=${sourceTeamId}`);
  }
}

// Returns { teamName, teamSideId } if the match was a team raid, else null.
export async function getTeamNameForMatch(matchId) {
  const players = await db
    .select({ clerkId: raidMatchPlayers.clerkId, teamId: raidMatchPlayers.teamId })
    .from(raidMatchPlayers)
    .where(eq(raidMatchPlayers.matchId, matchId));

  if (players.length === 0) return null;

  const clerkIds = players.map((p) => p.clerkId);

  const invites = await db
    .select({ sourceTeamName: raidInvitations.sourceTeamName, inviterClerkId: raidInvitations.inviterClerkId, inviteeClerkId: raidInvitations.inviteeClerkId })
    .from(raidInvitations)
    .where(and(
      inArray(raidInvitations.inviteeClerkId, clerkIds),
      isNotNull(raidInvitations.sourceTeamId),
      eq(raidInvitations.status, "accepted"),
    ))
    .limit(1);

  if (invites.length === 0) return null;

  const { sourceTeamName, inviterClerkId, inviteeClerkId } = invites[0];
  const captainPlayer = players.find((p) => p.clerkId === inviterClerkId);
  const inviteePlayer = players.find((p) => p.clerkId === inviteeClerkId);
  const refPlayer     = captainPlayer ?? inviteePlayer;
  const teamSideId    = refPlayer?.teamId ?? 0;

  return { teamName: sourceTeamName, teamSideId };
}

// Only raids explicitly started via the Team Raid button
export async function getTeamRaids(teamId, limit = 20) {
  const registrations = await db
    .select({ matchId: teamRaids.matchId, createdAt: teamRaids.createdAt })
    .from(teamRaids)
    .where(and(eq(teamRaids.teamId, teamId), sql`${teamRaids.matchId} IS NOT NULL`))
    .orderBy(desc(teamRaids.createdAt))
    .limit(limit);

  if (registrations.length === 0) return [];

  const matchIds  = registrations.map((r) => r.matchId);
  const matchData = await db.select().from(raidMatches)
    .where(and(inArray(raidMatches.id, matchIds), eq(raidMatches.status, "completed")));

  if (matchData.length === 0) return [];

  const memberIds = (await db.select({ clerkId: teamMembers.clerkId })
    .from(teamMembers).where(eq(teamMembers.teamId, teamId))).map((m) => m.clerkId);

  const finalIds = matchData.map((m) => m.id);
  const players  = await db.select().from(raidMatchPlayers)
    .where(inArray(raidMatchPlayers.matchId, finalIds));

  return matchData
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    .map((match) => {
      const matchPlayers = players.filter((p) => p.matchId === match.id);
      const myTeam       = matchPlayers.filter((p) => memberIds.includes(p.clerkId));
      const myTeamId     = myTeam[0]?.teamId ?? 0;
      const result       = match.winnerTeam === null ? "draw"
                         : match.winnerTeam === myTeamId ? "win" : "loss";
      const myScore      = myTeam.reduce((s, p) => s + p.totalScore, 0);
      const oppScore     = matchPlayers.filter((p) => p.teamId !== myTeamId).reduce((s, p) => s + p.totalScore, 0);
      return { matchId: match.id, result, myScore, oppScore, endedAt: match.updatedAt };
    });
}

// ── Helpers ────────────────────────────────────────────────────

function resolveDisplayName(u) {
  if (!u) return "Player";
  if (u.displayName) return u.displayName;
  const full = [u.firstName, u.lastName].filter(Boolean).join(" ").trim();
  return full || u.username || "Player";
}
