import SiteNav from "@/components/site-nav";
import { getLeaderboard, getDuelWinsLeaderboard, getGroupWinsLeaderboard, getTeamsLeaderboard } from "@/lib/db-users";
import LeaderboardClient from "./leaderboard-client";

export const metadata = { title: "Leaderboard — DebugRoyale" };
export const dynamic = "force-dynamic";

async function fetchAll() {
  try {
    const [trophies, duelWins, groupWins, teamRankings] = await Promise.all([
      getLeaderboard(10),
      getDuelWinsLeaderboard(10),
      getGroupWinsLeaderboard(10),
      getTeamsLeaderboard(50),
    ]);
    return { trophies, duelWins, groupWins, teamRankings };
  } catch {
    return null;
  }
}

export default async function LeaderboardPage() {
  const data = await fetchAll();

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0d1a1f",
      color: "#c9d6da",
      fontFamily: "'Segoe UI', 'Aptos', 'Trebuchet MS', sans-serif",
      backgroundImage: [
        "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(61,220,132,0.07), transparent 70%)",
        "linear-gradient(rgba(201,214,218,0.025) 1px, transparent 1px)",
        "linear-gradient(90deg, rgba(201,214,218,0.025) 1px, transparent 1px)",
      ].join(", "),
      backgroundSize: "100% 100%, 44px 44px, 44px 44px",
    }}>
      <SiteNav active="/leaderboard" />

      <main style={{ maxWidth: "720px", margin: "0 auto", padding: "60px 24px 100px" }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "52px" }}>
          {/* Large trophy icon */}
          <div style={{
            fontSize: "96px", lineHeight: 1,
            marginBottom: "16px",
            filter: "drop-shadow(0 0 32px rgba(245,197,24,0.35))",
          }}>
            🏆
          </div>

          <h1 style={{
            fontSize: "clamp(28px, 5vw, 44px)",
            fontWeight: 900, color: "#e8f0f3",
            letterSpacing: "-0.03em", margin: "0 0 10px",
          }}>
            Leaderboard
          </h1>

          <div style={{
            display: "inline-flex", alignItems: "center", gap: "7px",
            background: "rgba(61,220,132,0.08)",
            border: "1px solid rgba(61,220,132,0.25)",
            padding: "5px 16px", borderRadius: "999px",
            fontSize: "12px", color: "#3ddc84", fontWeight: 600,
          }}>
            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#3ddc84", display: "inline-block" }} />
            Global Rankings
          </div>
        </div>

        {/* Error state */}
        {data === null && (
          <div style={{
            background: "rgba(245,90,90,0.07)",
            border: "1px solid rgba(245,90,90,0.2)",
            borderRadius: "10px", padding: "24px",
            textAlign: "center", color: "#ff8080", fontSize: "14px",
          }}>
            Could not load leaderboard — database not connected yet.
            <br />
            <span style={{ fontSize: "12px", color: "#8ba0a6", marginTop: "6px", display: "block" }}>
              Make sure DATABASE_URL is set and <code style={{ color: "#3ddc84" }}>npm run db:push</code> has been run.
            </span>
          </div>
        )}

        {data !== null && (
          <LeaderboardClient
            trophies={data.trophies}
            duelWins={data.duelWins}
            groupWins={data.groupWins}
            teamRankings={data.teamRankings}
          />
        )}
      </main>
    </div>
  );
}
