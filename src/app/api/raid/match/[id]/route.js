import { getRequestAuth } from "@/lib/clerk-guard";
import { autoCompleteRaidIfExpired, getRaidMatchState } from "@/lib/db-raid";

export const dynamic = "force-dynamic";

export async function GET(request, { params }) {
  const session = await getRequestAuth();
  if (session.clerkEnabled && !session.isAuthenticated) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!session.userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const matchId = parseInt(id, 10);
  if (isNaN(matchId)) return Response.json({ error: "Invalid match id" }, { status: 400 });

  await autoCompleteRaidIfExpired(matchId).catch(() => {});

  const state = await getRaidMatchState(matchId, session.userId);
  if (!state)     return Response.json({ error: "Match not found" }, { status: 404 });
  if (!state.me)  return Response.json({ error: "Not in this match" }, { status: 403 });

  return Response.json(state);
}
