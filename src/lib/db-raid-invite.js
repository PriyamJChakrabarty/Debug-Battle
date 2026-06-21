import { and, desc, eq, gt, inArray, or } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { db } from "./db";
import { follows, raidInvitations, users } from "./schema";

const INVITE_TTL_MS = 120_000; // 2 minutes

function resolveDisplayName(user) {
  if (!user) return "Player";
  const full = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  return full || user.username || "Player";
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
  const [invite] = await db
    .insert(raidInvitations)
    .values({ inviterClerkId, inviteeClerkId, inviterName, inviteeName, expiresAt })
    .returning();
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

  const teamGroupId = randomUUID();
  await db
    .update(raidInvitations)
    .set({ status: "accepted", teamGroupId, updatedAt: new Date() })
    .where(eq(raidInvitations.id, inviteId));

  return {
    teamGroupId,
    inviterClerkId: invite.inviterClerkId,
    inviterName:    invite.inviterName,
    inviteeName:    invite.inviteeName,
  };
}

export async function rejectInvite(inviteId, inviteeClerkId) {
  await db
    .update(raidInvitations)
    .set({ status: "rejected", updatedAt: new Date() })
    .where(and(
      eq(raidInvitations.id, inviteId),
      eq(raidInvitations.inviteeClerkId, inviteeClerkId),
    ));
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
