import { getRequestAuth } from "@/lib/clerk-guard";
import { cancelRaidLobby } from "@/lib/db-raid-invite";

export const dynamic = "force-dynamic";

export async function POST(request, { params }) {
  const session = await getRequestAuth();
  if ((session.clerkEnabled && !session.isAuthenticated) || !session.userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { teamGroupId } = await params;
  if (!teamGroupId) return Response.json({ error: "Invalid id" }, { status: 400 });

  const result = await cancelRaidLobby(teamGroupId, session.userId);
  if (!result) return Response.json({ error: "Not found" }, { status: 404 });
  if (result.error === "not_participant") {
    return Response.json({ error: "Not a participant" }, { status: 403 });
  }

  return Response.json({ ok: true, lobby: result });
}
