import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { hasClerkCredentials } from "@/lib/clerk-config";
import { getUserByClerkId } from "@/lib/db-users";
import { getRaidMatchForUser } from "@/lib/db-raid";
import { getRaidLobbyState } from "@/lib/db-raid-invite";
import HeartbeatClient from "@/components/heartbeat";
import SiteNav from "@/components/site-nav";
import RaidLobbyClient from "./raid-lobby-client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Raid Lobby - DebugBattle" };

function resolveDisplayName(user) {
  if (!user) return "Player";
  const full = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  return full || user.username || "Player";
}

export default async function RaidLobbyPage({ params }) {
  if (!hasClerkCredentials()) redirect("/sign-in");

  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const existing = await getRaidMatchForUser(userId);
  if (existing) redirect(`/group-raid-page/arena/${existing.matchId}`);

  const { teamGroupId } = await params;
  if (!teamGroupId) redirect("/home");

  const lobby = await getRaidLobbyState(teamGroupId);
  if (!lobby) redirect("/home");

  const isParticipant = lobby.members.some((member) => member.clerkId === userId);
  if (!isParticipant) redirect("/home");

  let myName = "Player";
  try {
    const user = await getUserByClerkId(userId);
    myName = resolveDisplayName(user);
  } catch {}

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      height: "100vh",
      overflow: "hidden",
      background: "#0d1a1f",
      fontFamily: "'Segoe UI', 'Aptos', 'Trebuchet MS', sans-serif",
    }}>
      <HeartbeatClient />
      <SiteNav active="" />
      <RaidLobbyClient
        teamGroupId={teamGroupId}
        myClerkId={userId}
        myName={myName}
        initialLobby={lobby}
      />
    </div>
  );
}
