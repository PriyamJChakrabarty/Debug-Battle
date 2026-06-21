"use client";

import { useState } from "react";
import Link from "next/link";
import ReturnToDuelButton from "@/components/return-to-duel";
import OnlinePlayersWidget from "@/components/online-players";

// ── Constants ──────────────────────────────────────────────────
const CARDS = [
  {
    id:        "practice",
    label:     "Practice",
    icon:      "🎯",
    sub:       "SOLO MODE",
    desc:      "Debug real code at your own pace. Hunt bugs across Security, Performance, Scalability, Ethics, and Maintainability.",
    href:      "/duel",
    color:     "#22d3ee",
    cta:       "Start Practice →",
    available: true,
  },
  {
    id:        "duel",
    label:     "1v1 Duel",
    icon:      "⚔️",
    sub:       "LIVE PvP",
    desc:      "Race another engineer in real-time. First to find all five bug categories wins. Skill decides everything.",
    href:      "/live-battle",
    color:     "#3ddc84",
    cta:       "Find Opponent →",
    available: true,
  },
  {
    id:        "raid",
    label:     "Group Raid",
    icon:      "🛡️",
    sub:       "SQUADS",
    desc:      "Form a squad, divide bug categories between teammates, and out-debug the enemy crew together.",
    href:      null,
    color:     "#f5b942",
    cta:       "Coming Soon",
    available: false,
  },
];

const TABS = [
  { label: "Questions Solved", icon: "📋" },
  { label: "Past Duels",       icon: "⚔️" },
  { label: "Group Raids",      icon: "🛡️" },
];

const RESULT = {
  win:  { emoji: "🏆", color: "#3ddc84", label: "WIN"  },
  loss: { emoji: "💀", color: "#ff5c5c", label: "LOSS" },
  draw: { emoji: "🤝", color: "#f5b942", label: "DRAW" },
};

// ── Helpers ────────────────────────────────────────────────────
function fmt(n) {
  if (n == null) return "—";
  return Number(n).toLocaleString();
}

function timeAgo(d) {
  if (!d) return "";
  const s = (Date.now() - new Date(d)) / 1000;
  if (s < 60)        return "just now";
  if (s < 3600)      return `${Math.floor(s / 60)}m ago`;
  if (s < 86400)     return `${Math.floor(s / 3600)}h ago`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)}d ago`;
  return new Date(d).toLocaleDateString();
}

// ── Stat chip ─────────────────────────────────────────────────
function StatChip({ label, value, color }) {
  return (
    <div style={{
      background: "rgba(201,214,218,0.03)",
      border:     "1px solid rgba(201,214,218,0.08)",
      borderRadius: "14px",
      padding: "18px 28px",
      textAlign: "center",
      minWidth: "120px",
      flex: "1 1 120px",
      maxWidth: "170px",
    }}>
      <div style={{ fontSize: "28px", fontWeight: 900, color, lineHeight: 1, letterSpacing: "-0.02em" }}>
        {value}
      </div>
      <div style={{ fontSize: "10.5px", color: "#4a6570", marginTop: "6px", letterSpacing: "0.07em", textTransform: "uppercase" }}>
        {label}
      </div>
    </div>
  );
}

// ── Duel history row ──────────────────────────────────────────
function DuelRow({ duel }) {
  const meta = RESULT[duel.result] ?? RESULT.draw;
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: "16px",
      background: "#080f12",
      border: "1px solid rgba(201,214,218,0.07)",
      borderRadius: "10px",
      padding: "13px 18px",
    }}>
      <div style={{ width: "42px", textAlign: "center", flexShrink: 0 }}>
        <div style={{ fontSize: "20px", lineHeight: 1 }}>{meta.emoji}</div>
        <div style={{ fontSize: "9px", fontWeight: 800, color: meta.color, letterSpacing: "0.06em", marginTop: "2px" }}>
          {meta.label}
        </div>
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: "13px", fontWeight: 600, color: "#e8f0f3", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {duel.challengeSlot}
        </div>
        <div style={{ fontSize: "11.5px", color: "#4a6570", marginTop: "2px" }}>
          vs {duel.opponentName}
        </div>
      </div>

      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <div style={{ fontSize: "13.5px", fontWeight: 700, color: meta.color }}>
          {duel.myScore} <span style={{ color: "#4a6570", fontWeight: 400, fontSize: "12px" }}>vs</span> {duel.opponentScore}
        </div>
        <div style={{ fontSize: "10.5px", color: "#4a6570", marginTop: "2px" }}>
          {timeAgo(duel.startedAt)}
        </div>
      </div>
    </div>
  );
}

// ── Question row ──────────────────────────────────────────────
function QuestionRow({ duel }) {
  const meta = RESULT[duel.result] ?? RESULT.draw;
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: "14px",
      background: "#080f12",
      border: "1px solid rgba(201,214,218,0.07)",
      borderRadius: "10px",
      padding: "12px 18px",
    }}>
      <div style={{ fontSize: "18px", flexShrink: 0 }}>📄</div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: "13px", fontWeight: 600, color: "#e8f0f3", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {duel.challengeSlot}
        </div>
        <div style={{ fontSize: "11px", color: "#4a6570", marginTop: "2px" }}>
          {timeAgo(duel.startedAt)}
        </div>
      </div>

      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <div style={{ fontSize: "13px", fontWeight: 700, color: meta.color }}>{duel.myScore} pts</div>
        <div style={{ fontSize: "10px", color: meta.color, marginTop: "2px", letterSpacing: "0.04em" }}>
          {meta.emoji} {meta.label}
        </div>
      </div>
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────
function EmptyState({ icon, msg, hint, href, cta }) {
  return (
    <div style={{ textAlign: "center", padding: "60px 0" }}>
      <div style={{ fontSize: "36px", marginBottom: "14px" }}>{icon}</div>
      <p style={{ fontSize: "15px", color: "#8ba0a6", margin: "0 0 6px" }}>{msg}</p>
      {hint && <p style={{ fontSize: "13px", color: "#4a6570", margin: "0 0 20px" }}>{hint}</p>}
      {href && cta && (
        <Link href={href} style={{
          background: "#3ddc84", color: "#0d1a1f",
          textDecoration: "none", padding: "10px 24px",
          borderRadius: "7px", fontSize: "13px", fontWeight: 800,
        }}>
          {cta}
        </Link>
      )}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────
export default function HomeClient({ stats, history = [] }) {
  const [focused,    setFocused]    = useState(1); // Duel is default active card
  const [activeTab,  setActiveTab]  = useState(0);

  const hasStats = !!stats;

  return (
    <div style={{
      backgroundImage: [
        "radial-gradient(ellipse 90% 55% at 50% -5%, rgba(61,220,132,0.1), transparent 65%)",
        "linear-gradient(rgba(201,214,218,0.022) 1px, transparent 1px)",
        "linear-gradient(90deg, rgba(201,214,218,0.022) 1px, transparent 1px)",
      ].join(", "),
      backgroundSize: "100% 100%, 44px 44px, 44px 44px",
    }}>

      {/* ── Hero ──────────────────────────────────────────────── */}
      <section style={{
        maxWidth: "1100px", margin: "0 auto",
        padding: "72px 40px 52px",
        position: "relative",
      }}>
        {/* Return-to-duel badge — top-right of hero */}
        <div style={{ position: "absolute", top: "24px", right: "40px" }}>
          <ReturnToDuelButton />
        </div>

        {/* Welcome + name */}
        <div style={{ textAlign: "center", marginBottom: "44px" }}>
          <p style={{
            fontSize: "12px", fontWeight: 700, color: "#3ddc84",
            letterSpacing: "0.1em", textTransform: "uppercase",
            margin: "0 0 10px",
          }}>
            {hasStats ? "Welcome back," : "Welcome to"}
          </p>
          <h1 style={{
            fontSize: "clamp(28px, 5vw, 42px)",
            fontWeight: 900, letterSpacing: "-0.03em",
            color: "#e8f0f3", margin: 0, lineHeight: 1.1,
          }}>
            {hasStats ? stats.name : "DebugBattle"}
          </h1>
          {!hasStats && (
            <p style={{ fontSize: "15px", color: "#8ba0a6", margin: "12px 0 0", lineHeight: 1.6 }}>
              The competitive arena where engineers hunt bugs — category by category, round by round.
            </p>
          )}
        </div>

        {/* Trophy number */}
        <div style={{ textAlign: "center", marginBottom: "44px", position: "relative" }}>
          {/* Glow behind number */}
          <div style={{
            position: "absolute", top: "50%", left: "50%",
            transform: "translate(-50%, -50%)",
            width: "300px", height: "180px",
            background: "radial-gradient(ellipse, rgba(61,220,132,0.15), transparent 70%)",
            pointerEvents: "none",
          }} />

          <div style={{ fontSize: "52px", lineHeight: 1, marginBottom: "0px" }}>🏆</div>
          <div style={{
            fontSize: "clamp(80px, 13vw, 130px)",
            fontWeight: 900,
            color: "#3ddc84",
            lineHeight: 1.0,
            letterSpacing: "-0.04em",
            textShadow: "0 0 48px rgba(61,220,132,0.45), 0 0 100px rgba(61,220,132,0.2)",
            fontVariantNumeric: "tabular-nums",
          }}>
            {hasStats ? fmt(stats.bestScore) : "—"}
          </div>
          <div style={{
            fontSize: "11px", color: "#4a6570",
            letterSpacing: "0.1em", textTransform: "uppercase",
            marginTop: "6px",
          }}>
            Bug Slayer Score
          </div>
        </div>

        {/* Stats row */}
        {hasStats ? (
          <div style={{ display: "flex", gap: "14px", justifyContent: "center", flexWrap: "wrap" }}>
            <StatChip label="Total Points"  value={fmt(stats.totalPoints)}        color="#22d3ee" />
            <StatChip label="Wins"          value={fmt(stats.wins)}               color="#3ddc84" />
            <StatChip label="Losses"        value={fmt(stats.losses)}             color="#ff5c5c" />
            <StatChip label="Practiced"     value={fmt(stats.questionsPracticed)} color="#a78bfa" />
          </div>
        ) : (
          <div style={{ textAlign: "center" }}>
            <Link href="/sign-in" style={{
              display: "inline-block",
              background: "#3ddc84", color: "#0d1a1f",
              textDecoration: "none", padding: "13px 32px",
              borderRadius: "8px", fontSize: "14px", fontWeight: 800,
              boxShadow: "0 0 40px rgba(61,220,132,0.25)",
            }}>
              Sign In to See Your Stats →
            </Link>
          </div>
        )}
      </section>

      {/* ── Carousel ──────────────────────────────────────────── */}
      <section style={{ maxWidth: "1100px", margin: "0 auto", padding: "8px 40px 64px" }}>
        <div style={{ textAlign: "center", marginBottom: "36px" }}>
          <h2 style={{
            fontSize: "clamp(18px, 3vw, 24px)",
            fontWeight: 800, color: "#e8f0f3",
            letterSpacing: "-0.02em", margin: "0 0 6px",
          }}>
            Choose Your Arena
          </h2>
          <p style={{ fontSize: "13px", color: "#4a6570", margin: 0 }}>
            Hover a card to explore each mode
          </p>
        </div>

        <div
          onMouseLeave={() => setFocused(1)}
          style={{
            display: "flex", gap: "20px",
            justifyContent: "center", alignItems: "center",
            minHeight: "310px",
          }}
        >
          {CARDS.map((card, i) => {
            const isActive = focused === i;
            return (
              <div
                key={card.id}
                onMouseEnter={() => setFocused(i)}
                onClick={() => setFocused(i)}
                style={{
                  flexShrink: 0,
                  width:      isActive ? "360px" : "215px",
                  minHeight:  isActive ? "290px" : "220px",
                  transition: "all 0.35s cubic-bezier(0.4, 0, 0.2, 1)",
                  opacity:    isActive ? 1 : 0.48,
                  background: isActive ? `${card.color}0c` : "rgba(8,15,18,0.7)",
                  border:     `1px solid ${isActive ? card.color + "48" : "rgba(201,214,218,0.06)"}`,
                  borderRadius: "20px",
                  padding:    isActive ? "32px 28px" : "24px 20px",
                  cursor:     "pointer",
                  boxShadow:  isActive
                    ? `0 0 0 1px ${card.color}20, 0 16px 56px ${card.color}18, 0 4px 20px rgba(0,0,0,0.3)`
                    : "none",
                  transform:  isActive ? "translateY(-10px)" : "translateY(0)",
                  display: "flex", flexDirection: "column",
                  alignItems: "center", gap: "10px",
                  textAlign: "center",
                  overflow: "hidden",
                }}
              >
                {/* Sub-label */}
                <div style={{
                  fontSize: "9px", fontWeight: 800, letterSpacing: "0.1em",
                  color: isActive ? card.color : "#4a6570",
                  textTransform: "uppercase",
                  transition: "color 0.35s",
                }}>
                  {card.sub}
                </div>

                {/* Icon */}
                <div style={{
                  fontSize: isActive ? "60px" : "40px",
                  lineHeight: 1,
                  transition: "font-size 0.35s",
                  marginBottom: "2px",
                }}>
                  {card.icon}
                </div>

                {/* Title */}
                <div style={{
                  fontSize: isActive ? "22px" : "15px",
                  fontWeight: 900,
                  color: isActive ? "#e8f0f3" : "#8ba0a6",
                  letterSpacing: "-0.02em",
                  transition: "all 0.35s",
                }}>
                  {card.label}
                </div>

                {/* Description — only when active */}
                <div style={{
                  fontSize: "13px", color: "#8ba0a6",
                  lineHeight: 1.6, margin: "0",
                  maxHeight: isActive ? "120px" : "0px",
                  overflow: "hidden",
                  transition: "max-height 0.4s ease, opacity 0.35s",
                  opacity: isActive ? 1 : 0,
                }}>
                  {card.desc}
                </div>

                {/* CTA — only when active */}
                <div style={{
                  marginTop: "auto",
                  maxHeight: isActive ? "60px" : "0px",
                  overflow: "hidden",
                  transition: "max-height 0.4s ease, opacity 0.35s",
                  opacity: isActive ? 1 : 0,
                  width: "100%",
                  display: "flex", justifyContent: "center",
                }}>
                  {card.available ? (
                    <Link href={card.href} style={{
                      display: "inline-block",
                      background: card.color, color: "#0d1a1f",
                      textDecoration: "none",
                      padding: "11px 28px",
                      borderRadius: "9px",
                      fontSize: "13px", fontWeight: 800,
                      boxShadow: `0 0 28px ${card.color}48`,
                      letterSpacing: "-0.01em",
                    }}>
                      {card.cta}
                    </Link>
                  ) : (
                    <span style={{
                      display: "inline-block",
                      background: "transparent", color: card.color,
                      border: `1px solid ${card.color}48`,
                      padding: "11px 28px",
                      borderRadius: "9px",
                      fontSize: "13px", fontWeight: 700,
                    }}>
                      Coming Soon
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Online players indicator */}
        <OnlinePlayersWidget />
      </section>

      {/* ── Activity Tabs ──────────────────────────────────────── */}
      <section style={{ maxWidth: "1100px", margin: "0 auto", padding: "0 40px 100px" }}>

        {/* Tab bar */}
        <div style={{
          display: "flex", gap: "0",
          borderBottom: "1px solid rgba(201,214,218,0.08)",
          marginBottom: "28px",
        }}>
          {TABS.map((tab, i) => (
            <button
              key={tab.label}
              onClick={() => setActiveTab(i)}
              style={{
                background: "none", border: "none",
                borderBottom: `2px solid ${activeTab === i ? "#3ddc84" : "transparent"}`,
                color: activeTab === i ? "#3ddc84" : "#4a6570",
                padding: "10px 18px",
                fontSize: "13px", fontWeight: activeTab === i ? 700 : 400,
                cursor: "pointer",
                transition: "all 0.15s",
                marginBottom: "-1px",
                display: "flex", alignItems: "center", gap: "6px",
              }}
            >
              <span style={{ fontSize: "14px" }}>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {!hasStats ? (
          <EmptyState
            icon="🔐"
            msg="Sign in to see your activity"
            hint="Your solved questions and duel history will appear here."
            href="/sign-in"
            cta="Sign In →"
          />

        ) : activeTab === 0 ? (
          /* Questions Solved */
          history.length === 0 ? (
            <EmptyState
              icon="📋"
              msg="No questions solved yet."
              hint="Complete a duel to see your history here."
              href="/live-battle"
              cta="Start a Duel →"
            />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {history.map((d) => <QuestionRow key={d.matchId} duel={d} />)}
            </div>
          )

        ) : activeTab === 1 ? (
          /* Past Duels */
          history.length === 0 ? (
            <EmptyState
              icon="⚔️"
              msg="No duels on record yet."
              hint="Complete a 1v1 duel for it to appear here."
              href="/live-battle"
              cta="Find an Opponent →"
            />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {history.map((d) => <DuelRow key={d.matchId} duel={d} />)}
            </div>
          )

        ) : (
          /* Group Raids */
          <EmptyState
            icon="🛡️"
            msg="Group Raids are coming soon."
            hint="Squad-based bug hunting is in development."
          />
        )}
      </section>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <div style={{ borderTop: "1px solid rgba(201,214,218,0.07)" }}>
      <footer style={{
        maxWidth: "1100px", margin: "0 auto",
        padding: "24px 40px",
        display: "flex", justifyContent: "space-between",
        alignItems: "center", flexWrap: "wrap", gap: "12px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "2px" }}>
          <span style={{ fontSize: "14px", fontWeight: 900, color: "#3ddc84", letterSpacing: "-0.02em" }}>Debug</span>
          <span style={{ fontSize: "14px", fontWeight: 900, color: "#e8f0f3", letterSpacing: "-0.02em" }}>Battle</span>
        </div>
        <span style={{ fontSize: "12px", color: "#4a6570" }}>Powered by Groq — Competitive Code Review Arena</span>
      </footer>
      </div>
    </div>
  );
}
