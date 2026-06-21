import { getRequestAuth } from "@/lib/clerk-guard";
import { cancelRaidQueue } from "@/lib/db-raid";
import { markUserOnline } from "@/lib/db-presence";

export const dynamic = "force-dynamic";

export async function DELETE() {
  const session = await getRequestAuth();
  if (session.clerkEnabled && !session.isAuthenticated) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!session.userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  await cancelRaidQueue(session.userId);
  await markUserOnline(session.userId).catch(() => {});
  return Response.json({ ok: true });
}
