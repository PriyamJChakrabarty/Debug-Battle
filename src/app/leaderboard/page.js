import Link from "next/link";
import SiteNav from "@/components/site-nav";
import { getLeaderboard } from "@/lib/db-users";

export const metadata = { title: "Leaderboard — DebugBattle" };
export const dynamic = "force-dynamic";

const RANK_COLORS = ["#f5c518", "#adb5bd", "#cd7f32"];
const RANK_LABELS = ["1ST", "2ND", "3RD"];

function displayName(row) {
  if (row.username) return row.username;
  const full = [row.firstName, row.lastName].filter(Boolean).join(" ").trim();
  if (full) return full;
  return "Anonymous";
}

async function fetchRows() {
  try {
    return await getLeaderboard(100);
  } catch {
    return null;
  }
}

export default async function LeaderboardPage() {
  const rows = await fetchRows();

  return (
    <div
      style={{
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
      }}
    >
      <SiteNav active="/leaderboard" />

      <main style={{ maxWidth: "760px", margin: "0 auto", padding: "60px 24px 80px" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "48px" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "7px",
              background: "rgba(61,220,132,0.08)",
              border: "1px solid rgba(61,220,132,0.25)",
              padding: "5px 16px",
              borderRadius: "999px",
              fontSize: "12px",
              color: "#3ddc84",
              fontWeight: 600,
              marginBottom: "20px",
            }}
          >
            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#3ddc84", display: "inline-block" }} />
            Global Rankings
          </div>
          <h1
            style={{
              fontSize: "clamp(28px, 5vw, 48px)",
              fontWeight: 900,
              color: "#e8f0f3",
              letterSpacing: "-0.03em",
              margin: "0 0 12px",
            }}
          >
            Leaderboard
          </h1>
          <p style={{ fontSize: "15px", color: "#8ba0a6", margin: 0 }}>
            Top bug slayers ranked by best score across all duels.
          </p>
        </div>

        {/* Error state */}
        {rows === null && (
          <div
            style={{
              background: "rgba(245,90,90,0.07)",
              border: "1px solid rgba(245,90,90,0.2)",
              borderRadius: "10px",
              padding: "24px",
              textAlign: "center",
              color: "#ff8080",
              fontSize: "14px",
            }}
          >
            Could not load leaderboard — database not connected yet.
            <br />
            <span style={{ fontSize: "12px", color: "#8ba0a6", marginTop: "6px", display: "block" }}>
              Make sure DATABASE_URL is set and <code style={{ color: "#3ddc84" }}>npm run db:push</code> has been run.
            </span>
          </div>
        )}

        {/* Empty state */}
        {rows !== null && rows.length === 0 && (
          <div
            style={{
              background: "rgba(61,220,132,0.04)",
              border: "1px solid rgba(61,220,132,0.12)",
              borderRadius: "10px",
              padding: "48px 24px",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "32px", marginBottom: "12px" }}>🏆</div>
            <p style={{ fontSize: "15px", color: "#8ba0a6", margin: "0 0 20px" }}>
              No scores yet — be the first on the board.
            </p>
            <Link
              href="/duel"
              style={{
                background: "#3ddc84",
                color: "#0d1a1f",
                textDecoration: "none",
                padding: "10px 24px",
                borderRadius: "7px",
                fontSize: "13px",
                fontWeight: 800,
              }}
            >
              Start a Duel →
            </Link>
          </div>
        )}

        {/* Leaderboard table */}
        {rows !== null && rows.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {rows.map((row, i) => {
              const rank = i + 1;
              const isTop3 = rank <= 3;
              const rankColor = isTop3 ? RANK_COLORS[i] : "#4a6570";
              const name = displayName(row);
              const maxScore = rows[0].bestScore || 1;
              const barPct = Math.max(4, (row.bestScore / maxScore) * 100);

              return (
                <div
                  key={row.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "16px",
                    background: isTop3 ? "rgba(61,220,132,0.04)" : "#0e191f",
                    border: `1px solid ${isTop3 ? `${rankColor}30` : "rgba(201,214,218,0.07)"}`,
                    borderRadius: "10px",
                    padding: "14px 20px",
                    boxShadow: rank === 1 ? `0 0 32px ${rankColor}18` : "none",
                  }}
                >
                  {/* Rank */}
                  <div
                    style={{
                      width: "36px",
                      flexShrink: 0,
                      textAlign: "center",
                      fontSize: isTop3 ? "11px" : "13px",
                      fontWeight: 800,
                      color: rankColor,
                      letterSpacing: "0.04em",
                    }}
                  >
                    {isTop3 ? RANK_LABELS[i] : `#${rank}`}
                  </div>

                  {/* Avatar */}
                  <div
                    style={{
                      width: "34px",
                      height: "34px",
                      borderRadius: "50%",
                      background: `linear-gradient(135deg, ${rankColor}44, ${rankColor}18)`,
                      border: `1.5px solid ${rankColor}40`,
                      flexShrink: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "14px",
                      fontWeight: 700,
                      color: rankColor,
                    }}
                  >
                    {name.charAt(0).toUpperCase()}
                  </div>

                  {/* Name + bar */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "14px", fontWeight: 600, color: "#e8f0f3", marginBottom: "6px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {name}
                    </div>
                    <div style={{ height: "4px", background: "rgba(201,214,218,0.08)", borderRadius: "2px", overflow: "hidden" }}>
                      <div
                        style={{
                          height: "100%",
                          width: `${barPct}%`,
                          background: isTop3
                            ? `linear-gradient(90deg, ${rankColor}, ${rankColor}aa)`
                            : "linear-gradient(90deg, #3ddc84, #22d3ee)",
                          borderRadius: "2px",
                        }}
                      />
                    </div>
                  </div>

                  {/* Score */}
                  <div style={{ flexShrink: 0, textAlign: "right" }}>
                    <div style={{ fontSize: "18px", fontWeight: 800, color: isTop3 ? rankColor : "#3ddc84", lineHeight: 1 }}>
                      {row.bestScore}
                    </div>
                    <div style={{ fontSize: "10px", color: "#4a6570", marginTop: "2px" }}>pts</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* CTA */}
        {rows !== null && rows.length > 0 && (
          <div style={{ textAlign: "center", marginTop: "48px" }}>
            <Link
              href="/duel"
              style={{
                background: "#3ddc84",
                color: "#0d1a1f",
                textDecoration: "none",
                padding: "12px 32px",
                borderRadius: "8px",
                fontSize: "14px",
                fontWeight: 800,
                boxShadow: "0 0 32px rgba(61,220,132,0.2)",
              }}
            >
              Claim Your Spot →
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
