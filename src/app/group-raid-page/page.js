import SiteNav from "@/components/site-nav";
import HeartbeatClient from "@/components/heartbeat";
import GroupRaidArena from "@/components/group-raid-arena";
import { loadCodebase } from "@/lib/load-codebase";

export const dynamic = "force-dynamic";
export const metadata = { title: "Group Raid — DebugBattle" };

export default function GroupRaidPage() {
  const data = loadCodebase("AstroStructure");

  return (
    <div style={{
      height: "100vh",
      display: "flex",
      flexDirection: "column",
      background: "#0d1a1f",
      color: "#c9d6da",
      fontFamily: "'Segoe UI', 'Aptos', 'Trebuchet MS', sans-serif",
      overflow: "hidden",
    }}>
      <HeartbeatClient />
      <SiteNav active="/group-raid-page" />
      <GroupRaidArena {...data} />
    </div>
  );
}
