import { getRequestAuth } from "@/lib/clerk-guard";
import { getRaidLobbyState } from "@/lib/db-raid-invite";

export const dynamic = "force-dynamic";

export async function GET(request, { params }) {
  const session = await getRequestAuth();
  if ((session.clerkEnabled && !session.isAuthenticated) || !session.userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { teamGroupId } = await params;
  if (!teamGroupId) return Response.json({ error: "Invalid id" }, { status: 400 });

  const lobby = await getRaidLobbyState(teamGroupId);
  if (!lobby) return Response.json({ error: "Not found" }, { status: 404 });

  const isParticipant = lobby.members.some((member) => member.clerkId === session.userId);
  if (!isParticipant) return Response.json({ error: "Not a participant" }, { status: 403 });

  return Response.json(lobby);
}
