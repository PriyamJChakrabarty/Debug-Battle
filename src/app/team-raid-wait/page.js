import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { hasClerkCredentials } from "@/lib/clerk-config";
import { getRaidMatchForUser } from "@/lib/db-raid";

export const dynamic = "force-dynamic";
export const metadata = { title: "Waiting for Team - DebugBattle" };

export default async function TeamRaidWaitPage({ searchParams }) {
  if (!hasClerkCredentials()) redirect("/sign-in");

  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const existing = await getRaidMatchForUser(userId);
  if (existing) redirect(`/group-raid-page/arena/${existing.matchId}`);

  const { teamGroupId, teamId } = await searchParams;
  if (!teamGroupId || !teamId) redirect("/home");

  redirect(`/raid-lobby/${teamGroupId}`);
}
