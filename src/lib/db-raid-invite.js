import { and, desc, eq, gt, gte, inArray, or } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { db } from "./db";
import { follows, raidInvitations, userPresence, users } from "./schema";
import { getAblyRestRaidLobbyChannel } from "./ably-server";
import { clearUserFromRaidLobby, getRaidLobbyPresenceKey, markUserInRaidLobby } from "./db-presence";

const INVITE_TTL_MS = 120_000; // 2 minutes
const RAID_LOBBY_PRESENCE_WINDOW_MS = 20_000;

function resolveDisplayName(user) {
  if (!user) return "Player";
  const full = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  return full || user.username || "Player";
}

async function pubLobby(teamGroupId, payload = {}) {
  if (!teamGroupId) return;
  await getAblyRestRaidLobbyChannel(teamGroupId)
    .publish("raid-lobby-updated", { ...payload, sentAt: new Date().toISOString() })
    .catch((e) => console.error("[raid-lobby] Ably publish failed:", e?.message));
}

function clearRaidLobbyRuntime(teamGroupId) {
  return teamGroupId;
}

function latestInviteRows(rows) {
  const sorted = [...rows].sort((a, b) => {
    const aTime = new Date(a.updatedAt ?? a.createdAt ?? 0).getTime();
    const bTime = new Date(b.updatedAt ?? b.createdAt ?? 0).getTime();
    return bTime - aTime;
  });

  const deduped = [];
  const seen = new Set();
  for (const row of sorted) {
    if (seen.has(row.inviteeClerkId)) continue;
    seen.add(row.inviteeClerkId);
    deduped.push(row);
  }

  return deduped.sort((a, b) => {
    const aTime = new Date(a.createdAt ?? 0).getTime();
    const bTime = new Date(b.createdAt ?? 0).getTime();
    return aTime - bTime;
  });
}

function buildRaidLobbyState(rows, presentClerkIds = new Set()) {
  if (!rows?.length) return null;

  const ordered = latestInviteRows(rows);
  const first = ordered[0];
  const now = Date.now();

  const invitees = ordered.map((row) => {
    const isExpiredPending = row.status === "pending" && new Date(row.expiresAt).getTime() < now;
    const currentStatus = isExpiredPending ? "expired" : row.status;
    return {
      inviteId: row.id,
      clerkId: row.inviteeClerkId,
      name: row.inviteeName,
      status: currentStatus,
      present: presentClerkIds.has(row.inviteeClerkId),
      expiresAt: row.expiresAt,
      updatedAt: row.updatedAt,
      isCaptain: false,
    };
  });

  const anyCancelled = invitees.some((m) => m.status === "team_cancelled");
  const anyRejected = invitees.some((m) => m.status === "rejected");
  const anyExpired = invitees.some((m) => m.status === "expired");
  const started = invitees.length > 0 && invitees.every((m) => m.status === "started");
  const allAccepted = invitees.length > 0 && invitees.every((m) => ["accepted", "started"].includes(m.status));

  return {
    teamGroupId: first.teamGroupId,
    inviterClerkId: first.inviterClerkId,
    inviterName: first.inviterName,
    sourceTeamId: first.sourceTeamId ?? null,
    sourceTeamName: first.sourceTeamName ?? null,
    squadName: first.sourceTeamName ?? `${first.inviterName}'s Squad`,
    expiresAt: first.expiresAt,
    createdAt: first.createdAt,
    updatedAt: new Date(ordered.reduce((latest, row) => {
      const rowTime = new Date(row.updatedAt ?? row.createdAt ?? 0).getTime();
      return rowTime > latest ? rowTime : latest;
    }, new Date(first.updatedAt ?? first.createdAt ?? 0).getTime())).toISOString(),
    memberCount: invitees.length + 1,
    acceptedCount: invitees.filter((m) => ["accepted", "started"].includes(m.status)).length + 1,
    captain: {
      clerkId: first.inviterClerkId,
      name: first.inviterName,
      status: started ? "started" : "accepted",
      present: presentClerkIds.has(first.inviterClerkId),
      isCaptain: true,
    },
    invitees,
    members: [
      {
        clerkId: first.inviterClerkId,
        name: first.inviterName,
        status: started ? "started" : "accepted",
        present: presentClerkIds.has(first.inviterClerkId),
        isCaptain: true,
      },
      ...invitees,
    ],
    status: anyCancelled
      ? "cancelled"
      : anyRejected
        ? "rejected"
        : anyExpired
          ? "expired"
          : started
            ? "started"
            : allAccepted
            ? "accepted"
            : "pending",
    allAccepted,
    everyonePresent: false,
    canStart: false,
    started,
    startedAt: started ? new Date().toISOString() : null,
    anyCancelled,
    anyRejected,
    anyExpired,
  };
}

async function expireLobbyInvites(teamGroupId) {
  const now = new Date();
  const pendingRows = await db
    .select({ id: raidInvitations.id, expiresAt: raidInvitations.expiresAt })
    .from(raidInvitations)
    .where(and(
      eq(raidInvitations.teamGroupId, teamGroupId),
      eq(raidInvitations.status, "pending"),
    ));

  const expiredIds = pendingRows
    .filter((row) => new Date(row.expiresAt).getTime() < now.getTime())
    .map((row) => row.id);

  if (expiredIds.length === 0) return;

  const expired = await db
    .update(raidInvitations)
    .set({ status: "expired", updatedAt: now })
    .where(inArray(raidInvitations.id, expiredIds))
    .returning({ id: raidInvitations.id });

  if (expired.length > 0) {
    await pubLobby(teamGroupId, { status: "expired" });
  }
}

export async function sendInvite(inviterClerkId, inviterName, inviteeClerkId) {
  const now = new Date();

  // Look up invitee's display name
  const [inviteeUser] = await db
    .select({ firstName: users.firstName, lastName: users.lastName, username: users.username })
    .from(users)
    .where(eq(users.clerkId, inviteeClerkId))
    .limit(1);
  const inviteeName = resolveDisplayName(inviteeUser ?? null);

  // Expire any existing pending invite from this pair
  await db
    .update(raidInvitations)
    .set({ status: "expired", updatedAt: now })
    .where(and(
      eq(raidInvitations.inviterClerkId, inviterClerkId),
      eq(raidInvitations.inviteeClerkId, inviteeClerkId),
      eq(raidInvitations.status, "pending"),
    ));

  const expiresAt = new Date(now.getTime() + INVITE_TTL_MS);
  const teamGroupId = randomUUID();
  const [invite] = await db
    .insert(raidInvitations)
    .values({ inviterClerkId, inviteeClerkId, inviterName, inviteeName, teamGroupId, expiresAt })
    .returning();

  await pubLobby(teamGroupId, { status: "pending" });
  return invite;
}

export async function getEligibleFriends(myClerkId) {
  const following = await db
    .select({
      clerkId:   users.clerkId,
      firstName: users.firstName,
      lastName:  users.lastName,
      username:  users.username,
      imageUrl:  users.imageUrl,
    })
    .from(follows)
    .innerJoin(users, eq(users.clerkId, follows.followingClerkId))
    .where(eq(follows.followerClerkId, myClerkId));

  if (following.length === 0) return [];

  // My active pending outgoing invites
  const now = new Date();
  const pendingRows = await db
    .select({ inviteeClerkId: raidInvitations.inviteeClerkId, id: raidInvitations.id })
    .from(raidInvitations)
    .where(and(
      eq(raidInvitations.inviterClerkId, myClerkId),
      eq(raidInvitations.status, "pending"),
      gt(raidInvitations.expiresAt, now),
    ));

  const pendingMap = Object.fromEntries(pendingRows.map((p) => [p.inviteeClerkId, p.id]));

  return following.map((f) => ({
    clerkId:         f.clerkId,
    displayName:     resolveDisplayName(f),
    imageUrl:        f.imageUrl ?? null,
    pendingInviteId: pendingMap[f.clerkId] ?? null,
  }));
}

export async function getPendingInvitesForMe(clerkId) {
  return db
    .select()
    .from(raidInvitations)
    .where(and(
      eq(raidInvitations.inviteeClerkId, clerkId),
      eq(raidInvitations.status, "pending"),
      gt(raidInvitations.expiresAt, new Date()),
    ))
    .orderBy(desc(raidInvitations.createdAt));
}

export async function getRaidLobbyState(teamGroupId) {
  const rows = await db
    .select()
    .from(raidInvitations)
    .where(eq(raidInvitations.teamGroupId, teamGroupId))
    .orderBy(desc(raidInvitations.createdAt));

  if (rows.length === 0) return null;
  await expireLobbyInvites(teamGroupId);

  const freshRows = await db
    .select()
    .from(raidInvitations)
    .where(eq(raidInvitations.teamGroupId, teamGroupId))
    .orderBy(desc(raidInvitations.createdAt));

  const lobby = buildRaidLobbyState(freshRows);
  if (!lobby) return null;

  const acceptedMembers = lobby.members.filter((member) => member.status === "accepted");
  const everyonePresent = acceptedMembers.length === lobby.memberCount && acceptedMembers.every((member) => member.present);

  return {
    ...lobby,
    everyonePresent,
    canStart: lobby.allAccepted && everyonePresent && !lobby.started && !["cancelled", "rejected", "expired"].includes(lobby.status),
  };
}

export async function getActiveRaidLobbyForUser(clerkId) {
  const now = new Date();
  const [row] = await db
    .select({ teamGroupId: raidInvitations.teamGroupId })
    .from(raidInvitations)
    .where(and(
      or(
        eq(raidInvitations.inviterClerkId, clerkId),
        eq(raidInvitations.inviteeClerkId, clerkId),
      ),
      inArray(raidInvitations.status, ["pending", "accepted"]),
      gt(raidInvitations.expiresAt, now),
    ))
    .orderBy(desc(raidInvitations.updatedAt), desc(raidInvitations.createdAt))
    .limit(1);

  return row?.teamGroupId ?? null;
}

export async function getSentInviteStatuses(inviterClerkId) {
  return db
    .select()
    .from(raidInvitations)
    .where(eq(raidInvitations.inviterClerkId, inviterClerkId))
    .orderBy(desc(raidInvitations.createdAt))
    .limit(20);
}

export async function getMyNotifications(clerkId) {
  return db
    .select()
    .from(raidInvitations)
    .where(or(
      eq(raidInvitations.inviterClerkId, clerkId),
      eq(raidInvitations.inviteeClerkId, clerkId),
    ))
    .orderBy(desc(raidInvitations.createdAt))
    .limit(40);
}

export async function acceptInvite(inviteId, inviteeClerkId) {
  const [invite] = await db
    .select()
    .from(raidInvitations)
    .where(and(
      eq(raidInvitations.id, inviteId),
      eq(raidInvitations.inviteeClerkId, inviteeClerkId),
      eq(raidInvitations.status, "pending"),
      gt(raidInvitations.expiresAt, new Date()),
    ))
    .limit(1);
  if (!invite) return null;

  // For team raids the teamGroupId is pre-set; for friend invites generate one now
  const teamGroupId = invite.teamGroupId ?? randomUUID();
  await db
    .update(raidInvitations)
    .set({ status: "accepted", teamGroupId, updatedAt: new Date() })
    .where(eq(raidInvitations.id, inviteId));

  await pubLobby(teamGroupId, { status: "accepted" });

  return {
    teamGroupId,
    inviterClerkId:  invite.inviterClerkId,
    inviterName:     invite.inviterName,
    inviteeName:     invite.inviteeName,
    sourceTeamId:    invite.sourceTeamId   ?? null,
    sourceTeamName:  invite.sourceTeamName ?? null,
  };
}

// Send invitations for a team raid — teamGroupId is pre-generated by the captain
export async function sendTeamInvites(captainClerkId, captainName, memberClerkIds, teamGroupId, teamId, teamName) {
  const now       = new Date();
  const expiresAt = new Date(now.getTime() + INVITE_TTL_MS);

  // Expire any pre-existing pending team-raid invites for this team
  await db
    .update(raidInvitations)
    .set({ status: "expired", updatedAt: now })
    .where(and(
      eq(raidInvitations.inviterClerkId, captainClerkId),
      eq(raidInvitations.status, "pending"),
    ));

  if (memberClerkIds.length === 0) return [];

  // Look up display names for all invitees at once
  const userRows = await db
    .select({ clerkId: users.clerkId, firstName: users.firstName, lastName: users.lastName, username: users.username })
    .from(users)
    .where(inArray(users.clerkId, memberClerkIds));
  const nameMap = Object.fromEntries(userRows.map((u) => [u.clerkId, resolveDisplayName(u)]));

  const rows = memberClerkIds.map((clerkId) => ({
    inviterClerkId:  captainClerkId,
    inviteeClerkId:  clerkId,
    inviterName:     captainName,
    inviteeName:     nameMap[clerkId] ?? "Teammate",
    teamGroupId,        // pre-set so all members share the same group
    sourceTeamId:    teamId,
    sourceTeamName:  teamName,
    expiresAt,
  }));

  const inserted = await db.insert(raidInvitations).values(rows).returning();
  await pubLobby(teamGroupId, { status: "pending" });
  return inserted;
}

// Poll statuses for all invites belonging to a team raid session
export async function getTeamRaidInviteStatuses(teamGroupId) {
  return db
    .select()
    .from(raidInvitations)
    .where(eq(raidInvitations.teamGroupId, teamGroupId));
}

export async function rejectInvite(inviteId, inviteeClerkId) {
  const [updated] = await db
    .update(raidInvitations)
    .set({ status: "rejected", updatedAt: new Date() })
    .where(and(
      eq(raidInvitations.id, inviteId),
      eq(raidInvitations.inviteeClerkId, inviteeClerkId),
    ))
    .returning();

  if (updated?.teamGroupId) {
    await pubLobby(updated.teamGroupId, { status: "rejected" });
  }
}

// Mark every invitation in a team session as cancelled — used to broadcast "team cancelled" to all members
export async function markTeamCancelled(teamGroupId) {
  await db
    .update(raidInvitations)
    .set({ status: "team_cancelled", updatedAt: new Date() })
    .where(eq(raidInvitations.teamGroupId, teamGroupId));

  clearRaidLobbyRuntime(teamGroupId);
  await pubLobby(teamGroupId, { status: "team_cancelled" });
}

export async function isTeamCancelled(teamGroupId) {
  const [row] = await db
    .select({ id: raidInvitations.id })
    .from(raidInvitations)
    .where(and(eq(raidInvitations.teamGroupId, teamGroupId), eq(raidInvitations.status, "team_cancelled")))
    .limit(1);
  return !!row;
}

export async function expireInvitesFromInviter(inviterClerkId) {
  await db
    .update(raidInvitations)
    .set({ status: "expired", updatedAt: new Date() })
    .where(and(
      eq(raidInvitations.inviterClerkId, inviterClerkId),
      eq(raidInvitations.status, "pending"),
    ));
}

export async function cancelRaidLobby(teamGroupId, clerkId) {
  const state = await getRaidLobbyState(teamGroupId);
  if (!state) return null;

  const isParticipant = state.members.some((member) => member.clerkId === clerkId);
  if (!isParticipant) return { error: "not_participant" };

  await db
    .update(raidInvitations)
    .set({ status: "team_cancelled", updatedAt: new Date() })
    .where(and(
      eq(raidInvitations.teamGroupId, teamGroupId),
      inArray(raidInvitations.status, ["pending", "accepted"]),
    ));

  clearRaidLobbyRuntime(teamGroupId);
  await pubLobby(teamGroupId, { status: "team_cancelled" });
  return getRaidLobbyState(teamGroupId);
}

export async function setRaidLobbyPresence(teamGroupId, clerkId, present) {
  const state = await getRaidLobbyState(teamGroupId);
  if (!state) return null;

  const isParticipant = state.members.some((member) => member.clerkId === clerkId);
  if (!isParticipant) return null;

  const presenceMap = getLobbyPresenceMap(teamGroupId);
  presenceMap.set(clerkId, present);
  if ([...presenceMap.values()].every((value) => value === false)) {
    raidLobbyPresence.delete(teamGroupId);
  }

  await pubLobby(teamGroupId, { presenceChanged: true, clerkId, present });
  return getRaidLobbyState(teamGroupId);
}

export async function startRaidLobby(teamGroupId, clerkId) {
  const state = await getRaidLobbyState(teamGroupId);
  if (!state) return { error: "not_found" };
  if (state.inviterClerkId !== clerkId) return { error: "not_captain" };
  if (!state.allAccepted) return { error: "not_all_accepted" };
  if (!state.everyonePresent) return { error: "not_everyone_present" };
  if (state.started) return { ok: true, state };

  raidLobbySessionState.set(teamGroupId, {
    started: true,
    startedAt: new Date().toISOString(),
    startedBy: clerkId,
  });
  await pubLobby(teamGroupId, { started: true, startedBy: clerkId });
  return { ok: true, state: await getRaidLobbyState(teamGroupId) };
}
