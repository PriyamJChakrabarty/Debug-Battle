"use client";

import { useState } from "react";

const C = {
  bg:     "#0d1a1f",
  card:   "#0e191f",
  border: "rgba(201,214,218,0.07)",
  green:  "#3ddc84",
  cyan:   "#22d3ee",
  amber:  "#f5b942",
  gold:   "#f5c518",
  silver: "#adb5bd",
  bronze: "#cd7f32",
  text:   "#e8f0f3",
  sub:    "#8ba0a6",
  muted:  "#4a6570",
};

const RANK_COLORS = [C.gold, C.silver, C.bronze];
const RANK_LABELS = ["1ST", "2ND", "3RD"];

function dname(row) {
  const full = [row.firstName, row.lastName].filter(Boolean).join(" ").trim();
  return row.username || full || "Anonymous";
}

function PlayerRow({ row, i, valueKey, valueLabel, valueColor }) {
  const rank = i + 1;
  const top3 = rank <= 3;
  const rc = top3 ? RANK_COLORS[i] : C.muted;
  const name = dname(row);
  const value = row[valueKey] ?? 0;

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: "14px",
      background: top3 ? `${rc}09` : C.card,
      border: `1px solid ${top3 ? rc + "28" : C.border}`,
      borderRadius: "10px", padding: "12px 18px",
      boxShadow: rank === 1 ? `0 0 28px ${rc}14` : "none",
    }}>
      <div style={{
        width: "32px", flexShrink: 0, textAlign: "center",
        fontSize: top3 ? "10px" : "12px", fontWeight: 800,
        color: rc, letterSpacing: "0.04em",
      }}>
        {top3 ? RANK_LABELS[i] : `#${rank}`}
      </div>
      <div style={{
        width: "30px", height: "30px", borderRadius: "50%", flexShrink: 0,
        background: `linear-gradient(135deg, ${rc}40, ${rc}14)`,
        border: `1.5px solid ${rc}38`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: "13px", fontWeight: 700, color: rc,
      }}>
        {name.charAt(0).toUpperCase()}
      </div>
      <div style={{
        flex: 1, fontSize: "13px", fontWeight: 600, color: C.text,
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
      }}>
        {name}
      </div>
      <div style={{ flexShrink: 0, textAlign: "right" }}>
        <div style={{ fontSize: "17px", fontWeight: 800, color: top3 ? rc : (valueColor || C.green), lineHeight: 1 }}>
          {value}
        </div>
        <div style={{ fontSize: "10px", color: C.muted, marginTop: "2px" }}>{valueLabel}</div>
      </div>
    </div>
  );
}

function Section({ icon, title, subtitle, rows, valueKey, valueLabel, valueColor }) {
  return (
    <div style={{ marginBottom: "52px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "18px" }}>
        <span style={{ fontSize: "22px" }}>{icon}</span>
        <div>
          <div style={{
            fontSize: "11px", fontWeight: 800, color: C.sub,
            letterSpacing: "0.1em", textTransform: "uppercase",
          }}>
            {title}
          </div>
          <div style={{ fontSize: "12px", color: C.muted, marginTop: "2px" }}>{subtitle}</div>
        </div>
      </div>
      {rows.length === 0 ? (
        <div style={{
          padding: "28px", textAlign: "center", color: C.muted, fontSize: "13px",
          background: "rgba(14,25,31,0.6)", borderRadius: "10px", border: `1px solid ${C.border}`,
        }}>
          No data yet — be the first on this board.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {rows.map((row, i) => (
            <PlayerRow key={row.id} row={row} i={i} valueKey={valueKey} valueLabel={valueLabel} valueColor={valueColor} />
          ))}
        </div>
      )}
    </div>
  );
}

function TeamRow({ team, i }) {
  const rank = i + 1;
  const top3 = rank <= 3;
  const rc = top3 ? RANK_COLORS[i] : C.muted;
  const total = (team.wins || 0) + (team.losses || 0);
  const wr = total > 0 ? Math.round((team.wins / total) * 100) : 0;

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: "14px",
      background: top3 ? `${rc}09` : C.card,
      border: `1px solid ${top3 ? rc + "28" : C.border}`,
      borderRadius: "10px", padding: "14px 18px",
      boxShadow: rank === 1 ? `0 0 28px ${rc}14` : "none",
    }}>
      <div style={{
        width: "32px", flexShrink: 0, textAlign: "center",
        fontSize: top3 ? "10px" : "12px", fontWeight: 800,
        color: rc, letterSpacing: "0.04em",
      }}>
        {top3 ? RANK_LABELS[i] : `#${rank}`}
      </div>
      <div style={{ fontSize: "22px", flexShrink: 0 }}>{team.emoji}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: "13px", fontWeight: 700, color: C.text,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {team.name}
        </div>
        <div style={{ fontSize: "11px", color: C.muted, marginTop: "2px" }}>
          {team.wins}W – {team.losses}L · {wr}% win rate
        </div>
      </div>
      <div style={{ flexShrink: 0, textAlign: "right" }}>
        <div style={{ fontSize: "17px", fontWeight: 800, color: top3 ? rc : C.amber, lineHeight: 1 }}>
          {team.wins}
        </div>
        <div style={{ fontSize: "10px", color: C.muted, marginTop: "2px" }}>wins</div>
      </div>
    </div>
  );
}

export default function LeaderboardClient({ trophies, duelWins, groupWins, teamRankings }) {
  const [tab, setTab] = useState("individual");

  return (
    <div>
      {/* Tab bar */}
      <div style={{ display: "flex", gap: "6px", justifyContent: "center", marginBottom: "52px" }}>
        {[
          { id: "individual", label: "Individual", icon: "👤" },
          { id: "teams",      label: "Teams",      icon: "🛡️" },
        ].map(({ id, label, icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            style={{
              background: tab === id ? "rgba(61,220,132,0.1)" : "transparent",
              border: `1px solid ${tab === id ? "rgba(61,220,132,0.35)" : C.border}`,
              color: tab === id ? C.green : C.sub,
              padding: "9px 28px", borderRadius: "9px",
              fontSize: "13px", fontWeight: tab === id ? 700 : 400,
              cursor: "pointer",
              display: "flex", alignItems: "center", gap: "7px",
              transition: "all 0.15s",
            }}
          >
            <span style={{ fontSize: "15px" }}>{icon}</span>
            {label}
          </button>
        ))}
      </div>

      {tab === "individual" ? (
        <div>
          <Section
            icon="🏆"
            title="Trophies"
            subtitle="Best score achieved in a single match"
            rows={trophies}
            valueKey="bestScore"
            valueLabel="pts"
          />
          <Section
            icon="⚔️"
            title="Wins"
            subtitle="1v1 duel victories"
            rows={duelWins}
            valueKey="count"
            valueLabel="wins"
            valueColor={C.cyan}
          />
          <Section
            icon="🛡️"
            title="Group Wins"
            subtitle="Group raid victories"
            rows={groupWins}
            valueKey="count"
            valueLabel="wins"
            valueColor={C.amber}
          />
        </div>
      ) : (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "18px" }}>
            <span style={{ fontSize: "22px" }}>🏅</span>
            <div>
              <div style={{
                fontSize: "11px", fontWeight: 800, color: C.sub,
                letterSpacing: "0.1em", textTransform: "uppercase",
              }}>
                Team Rankings
              </div>
              <div style={{ fontSize: "12px", color: C.muted, marginTop: "2px" }}>
                Pre-formed teams ranked by raid victories
              </div>
            </div>
          </div>
          {teamRankings.length === 0 ? (
            <div style={{
              padding: "48px 24px", textAlign: "center", color: C.muted, fontSize: "13px",
              background: "rgba(14,25,31,0.6)", borderRadius: "10px", border: `1px solid ${C.border}`,
            }}>
              No teams have competed yet.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {teamRankings.map((team, i) => <TeamRow key={team.id} team={team} i={i} />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
