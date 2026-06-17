import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { hasClerkCredentials } from "@/lib/clerk-config";
import SocialClient from "./social-client";

export const metadata = { title: "Social — DebugBattle" };

export default async function SocialPage() {
  if (hasClerkCredentials()) {
    const { userId } = await auth();
    if (!userId) redirect("/sign-in");
    return <SocialClient myClerkId={userId} />;
  }
  return <SocialClient myClerkId={null} />;
}
