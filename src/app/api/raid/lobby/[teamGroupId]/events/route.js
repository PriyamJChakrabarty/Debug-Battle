import { getRequestAuth } from "@/lib/clerk-guard";
import { getRaidLobbyState } from "@/lib/db-raid-invite";
import { getAblyRealtimeRaidLobbyChannel } from "@/lib/ably-server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request, { params }) {
  const session = await getRequestAuth();
  if ((session.clerkEnabled && !session.isAuthenticated) || !session.userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { teamGroupId } = await params;
  if (!teamGroupId) return Response.json({ error: "Invalid id" }, { status: 400 });

  const initial = await getRaidLobbyState(teamGroupId);
  if (!initial) return Response.json({ error: "Not found" }, { status: 404 });

  const isParticipant = initial.members.some((member) => member.clerkId === session.userId);
  if (!isParticipant) return Response.json({ error: "Not a participant" }, { status: 403 });

  const encoder = new TextEncoder();
  const channel = getAblyRealtimeRaidLobbyChannel(teamGroupId);

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data) => {
        try {
          controller.enqueue(encoder.encode(`event: lobby\ndata: ${JSON.stringify(data)}\n\n`));
        } catch {}
      };

      const heartbeat = setInterval(() => {
        try { controller.enqueue(encoder.encode(": keepalive\n\n")); } catch {}
      }, 20_000);

      const onUpdate = async () => {
        const state = await getRaidLobbyState(teamGroupId).catch(() => null);
        if (state) send(state);
      };

      await onUpdate();
      await channel.subscribe("raid-lobby-updated", onUpdate);

      request.signal.addEventListener("abort", async () => {
        clearInterval(heartbeat);
        try { await channel.unsubscribe("raid-lobby-updated", onUpdate); } catch {}
        try { controller.close(); } catch {}
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-store, no-cache, must-revalidate",
      "Connection": "keep-alive",
    },
  });
}
