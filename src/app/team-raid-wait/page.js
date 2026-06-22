import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { hasClerkCredentials } from "@/lib/clerk-config";
import { getUserByClerkId } from "@/lib/db-users";
import { getRaidMatchForUser } from "@/lib/db-raid";
import SiteNav from "@/components/site-nav";
import HeartbeatClient from "@/components/heartbeat";
import TeamRaidWaitClient from "./wait-client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Waiting for Team — DebugBattle" };

function resolveDisplayName(u) {
  if (!u) return "Player";
  const full = [u.firstName, u.lastName].filter(Boolean).join(" ").trim();
  return full || u.username || "Player";
}

export default async function TeamRaidWaitPage({ searchParams }) {
  if (!hasClerkCredentials()) redirect("/sign-in");

  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  // Reconnect to an existing active match
  const existing = await getRaidMatchForUser(userId);
  if (existing) redirect(`/group-raid-page/arena/${existing.matchId}`);

  const { teamGroupId, teamId, teamName, teamEmoji } = await searchParams;
  if (!teamGroupId || !teamId) redirect("/home");

  let myName = "Player";
  try {
    const user = await getUserByClerkId(userId);
    myName = resolveDisplayName(user);
  } catch {}

  return (
    <div style={{
      display: "flex", flexDirection: "column", height: "100vh",
      overflow: "hidden", background: "#0d1a1f",
      fontFamily: "'Segoe UI', 'Aptos', 'Trebuchet MS', sans-serif",
    }}>
      <HeartbeatClient />
      <SiteNav active="" />
      <TeamRaidWaitClient
        myName={myName}
        myClerkId={userId}
        teamGroupId={teamGroupId}
        teamId={parseInt(teamId, 10)}
        initialTeamName={teamName ? decodeURIComponent(teamName) : "Your Team"}
        initialTeamEmoji={teamEmoji ? decodeURIComponent(teamEmoji) : "🛡️"}
      />
    </div>
  );
}
