import { getRequestAuth } from "@/lib/clerk-guard";
import { getUserByClerkId } from "@/lib/db-users";
import { enqueueForRaid, getRaidMatchForUser, tryMatchRaid } from "@/lib/db-raid";
import { markUserQueueing } from "@/lib/db-presence";

export const dynamic = "force-dynamic";

function getDisplayName(user) {
  if (!user) return "Player";
  if (user.username) return user.username;
  const full = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  return full || "Player";
}

export async function POST(request) {
  const session = await getRequestAuth();
  if (session.clerkEnabled && !session.isAuthenticated) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!session.userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const clerkId = session.userId;
  const body = await request.json().catch(() => ({}));
  const teamGroupId = body?.teamGroupId ?? null;

  // Already matched from a previous poll?
  const existing = await getRaidMatchForUser(clerkId);
  if (existing) {
    return Response.json({ matched: true, ...existing });
  }

  let displayName = "Player";
  try {
    const user = await getUserByClerkId(clerkId);
    displayName = getDisplayName(user);
  } catch {}

  await enqueueForRaid(clerkId, displayName, teamGroupId);
  await markUserQueueing(clerkId).catch(() => {});

  const match = await tryMatchRaid(clerkId, displayName, teamGroupId);
  if (match) {
    return Response.json({ matched: true, ...match });
  }

  return Response.json({ matched: false });
}
