"use client";

import { useEffect, useRef, useState } from "react";

const KEYFRAMES = `
@keyframes radar-ring {
  0%   { transform: scale(0.4); opacity: 0.9; }
  100% { transform: scale(2.4); opacity: 0; }
}
@keyframes float-in {
  from { transform: translateY(20px) scale(0.85); opacity: 0; }
  to   { transform: translateY(0)    scale(1);    opacity: 1; }
}
@keyframes glow-pulse {
  0%, 100% { box-shadow: 0 0 0px rgba(245,185,66,0); }
  50%       { box-shadow: 0 0 28px rgba(245,185,66,0.45); }
}
@keyframes dot-bounce {
  0%, 80%, 100% { transform: scale(0.4); opacity: 0.4; }
  40%           { transform: scale(1);   opacity: 1; }
}
@keyframes shield-drop {
  0%   { transform: scale(0) rotate(-15deg); opacity: 0; }
  60%  { transform: scale(1.2) rotate(4deg); opacity: 1; }
  100% { transform: scale(1) rotate(0deg);   opacity: 1; }
}
@keyframes flash-bg {
  0%   { opacity: 0; }
  25%  { opacity: 0.5; }
  100% { opacity: 0; }
}
`;

const TEAM_COLORS = ["#3ddc84", "#22d3ee"];

function Avi({ name, size = 64, color = "#f5b942", empty = false }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: empty ? "rgba(201,214,218,0.05)" : `linear-gradient(135deg, ${color}30, ${color}08)`,
      border: `2px solid ${empty ? "rgba(201,214,218,0.1)" : `${color}60`}`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.38, fontWeight: 900,
      color: empty ? "#2a3a40" : color,
      userSelect: "none", flexShrink: 0,
    }}>
      {empty ? "?" : (name || "?")[0].toUpperCase()}
    </div>
  );
}

function RadarRing({ delay = 0 }) {
  return (
    <div style={{
      position: "absolute", width: "120px", height: "120px", borderRadius: "50%",
      border: "2px solid rgba(245,185,66,0.35)",
      animation: `radar-ring 2.2s ease-out ${delay}s infinite`,
      pointerEvents: "none",
    }} />
  );
}

function TeamSlot({ players, teamId, totalSlots = 2 }) {
  const color = TEAM_COLORS[teamId];
  const label = teamId === 0 ? "Team Alpha" : "Team Bravo";

  return (
    <div style={{
      background: `${color}07`,
      border: `1px solid ${color}22`,
      borderRadius: "12px",
      padding: "14px 18px",
      width: "200px",
    }}>
      <div style={{
        fontSize: "10px", fontWeight: 800, color, letterSpacing: "0.1em",
        textTransform: "uppercase", marginBottom: "12px",
      }}>
        {label}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {Array.from({ length: totalSlots }).map((_, i) => {
          const p = players[i];
          return p ? (
            <div key={p.name} style={{ display: "flex", alignItems: "center", gap: "8px", animation: "float-in 0.4s ease forwards" }}>
              <Avi name={p.name} size={32} color={color} />
              <span style={{ fontSize: "12.5px", fontWeight: 700, color: "#e8f0f3", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {p.name}
              </span>
            </div>
          ) : (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Avi name="" size={32} empty />
              <span style={{ fontSize: "12px", color: "#2a3a40" }}>Searching…</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────
export default function RaidMatchmakingClient({ myName, myClerkId }) {
  const [phase,      setPhase]      = useState("searching"); // searching | matched
  const [matchData,  setMatchData]  = useState(null);
  const [countdown,  setCountdown]  = useState(3);
  const [onlineCount, setOnline]    = useState(null);
  const [dotFrame,   setDotFrame]   = useState(0);

  const pollRef = useRef(null);
  const cdRef   = useRef(null);

  useEffect(() => {
    fetch("/api/raid/queue/cancel", { method: "DELETE" }).catch(() => {});
  }, []);

  // Poll queue every 2s
  useEffect(() => {
    if (phase !== "searching") return;

    const poll = async () => {
      try {
        const r    = await fetch("/api/raid/queue", { method: "POST" });
        if (!r.ok) return;
        const data = await r.json();
        if (data.matched) {
          clearInterval(pollRef.current);
          setMatchData(data);
          setPhase("matched");
        }
      } catch {}
    };

    poll();
    pollRef.current = setInterval(poll, 2000);
    return () => clearInterval(pollRef.current);
  }, [phase]);

  // Online count
  useEffect(() => {
    if (phase !== "searching") return;
    fetch("/api/presence/online")
      .then((r) => r.json())
      .then((d) => setOnline(Array.isArray(d) ? d.length : 0))
      .catch(() => {});
  }, [phase]);

  // Animated dots
  useEffect(() => {
    if (phase !== "searching") return;
    const id = setInterval(() => setDotFrame((f) => (f + 1) % 4), 400);
    return () => clearInterval(id);
  }, [phase]);

  // Countdown → redirect to arena
  useEffect(() => {
    if (phase !== "matched" || !matchData?.matchId) return;
    setCountdown(3);
    cdRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(cdRef.current);
          window.location.href = `/group-raid-page/arena/${matchData.matchId}`;
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(cdRef.current);
  }, [phase, matchData?.matchId]);

  async function handleCancel() {
    clearInterval(pollRef.current);
    try { await fetch("/api/raid/queue/cancel", { method: "DELETE" }); } catch {}
    window.location.href = "/";
  }

  const dots = ".".repeat(dotFrame % 4);

  const wrap = (children) => (
    <>
      <style>{KEYFRAMES}</style>
      <div style={{
        flex: 1, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        background: "#0d1a1f", position: "relative", overflow: "hidden", minHeight: 0,
      }}>
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          backgroundImage: [
            "linear-gradient(rgba(201,214,218,0.025) 1px, transparent 1px)",
            "linear-gradient(90deg, rgba(201,214,218,0.025) 1px, transparent 1px)",
          ].join(", "),
          backgroundSize: "48px 48px",
        }} />
        {children}
      </div>
    </>
  );

  // ── Searching ─────────────────────────────────────────────
  if (phase === "searching") {
    return wrap(
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0", zIndex: 1 }}>
        <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", width: "120px", height: "120px", marginBottom: "40px" }}>
          <RadarRing delay={0} />
          <RadarRing delay={0.73} />
          <RadarRing delay={1.46} />
          <div style={{
            width: "72px", height: "72px", borderRadius: "50%",
            background: "rgba(245,185,66,0.08)",
            border: "2px solid rgba(245,185,66,0.4)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "30px",
          }}>
            🛡️
          </div>
        </div>

        <h2 style={{ fontSize: "22px", fontWeight: 800, color: "#e8f0f3", letterSpacing: "-0.02em", margin: "0 0 6px" }}>
          Finding your squad{dots}
        </h2>
        <p style={{ fontSize: "12px", color: "#4a6570", margin: "0 0 6px" }}>
          Need 3 more players · 2v2 Group Raid
        </p>
        {onlineCount !== null && (
          <p style={{ fontSize: "12px", color: "#4a6570", margin: "0 0 40px" }}>
            {onlineCount > 0
              ? `${onlineCount} player${onlineCount !== 1 ? "s" : ""} online`
              : "Waiting for players to join…"}
          </p>
        )}
        {onlineCount === null && (
          <p style={{ fontSize: "12px", color: "#4a6570", margin: "0 0 40px" }}>Searching…</p>
        )}

        <button
          onClick={handleCancel}
          style={{
            background: "transparent", border: "1px solid rgba(201,214,218,0.15)",
            color: "#4a6570", cursor: "pointer",
            padding: "9px 28px", borderRadius: "8px",
            fontSize: "13px", fontWeight: 600,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = "#e8f0f3"; e.currentTarget.style.borderColor = "rgba(201,214,218,0.35)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = "#4a6570"; e.currentTarget.style.borderColor = "rgba(201,214,218,0.15)"; }}
        >
          Cancel
        </button>
      </div>
    );
  }

  // ── Matched ───────────────────────────────────────────────
  // Build team display from matchData (server doesn't give names yet, just matchId)
  // Show "you + teammate" vs "opponents" — names fill in on arena load
  return wrap(
    <>
      <div style={{
        position: "absolute", inset: 0, background: "white",
        animation: "flash-bg 0.5s ease-out forwards", pointerEvents: "none", zIndex: 2,
      }} />

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "36px", zIndex: 1 }}>
        <p style={{ fontSize: "11px", fontWeight: 800, color: "#f5b942", letterSpacing: "0.12em", textTransform: "uppercase", margin: 0 }}>
          Squad Found!
        </p>

        <div style={{ fontSize: "52px", animation: "shield-drop 0.55s cubic-bezier(0.34,1.56,0.64,1) 0.1s both" }}>
          🛡️
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "28px" }}>
          <TeamSlot
            teamId={0}
            players={[{ name: myName }]}
            totalSlots={2}
          />
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
            <span style={{ fontSize: "22px", fontWeight: 900, color: "rgba(201,214,218,0.15)", letterSpacing: "0.06em" }}>
              VS
            </span>
            <div style={{
              fontSize: "38px", fontWeight: 900, color: "#f5b942",
              fontVariantNumeric: "tabular-nums",
              textShadow: "0 0 24px rgba(245,185,66,0.5)",
            }}>
              {countdown}
            </div>
          </div>
          <TeamSlot teamId={1} players={[]} totalSlots={2} />
        </div>

        <p style={{ fontSize: "12px", color: "#4a6570", margin: 0 }}>
          Match #{matchData?.matchId} — loading arena in {countdown}…
        </p>

        <button
          onClick={() => { window.location.href = `/group-raid-page/arena/${matchData?.matchId}`; }}
          style={{ fontSize: "12px", color: "#4a6570", textDecoration: "underline", cursor: "pointer", background: "none", border: "none", padding: 0 }}
        >
          Skip →
        </button>
      </div>
    </>
  );
}
