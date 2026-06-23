"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const KEYFRAMES = `
@keyframes raid-lobby-float {
  from { transform: translateY(18px); opacity: 0; }
  to   { transform: translateY(0); opacity: 1; }
}
@keyframes raid-ready-pulse {
  0%, 100% { transform: scale(1); box-shadow: 0 0 0 rgba(61,220,132,0); }
  50% { transform: scale(1.04); box-shadow: 0 0 30px rgba(61,220,132,0.18); }
}
@keyframes raid-orb {
  0% { transform: scale(0.8); opacity: 0.85; }
  100% { transform: scale(2); opacity: 0; }
}
`;

function formatCountdown(expiresAt) {
  const diff = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
  const mins = Math.floor(diff / 60);
  const secs = String(diff % 60).padStart(2, "0");
  return `${mins}:${secs}`;
}

function MemberCard({ member, accent, isMe }) {
  const statusMap = {
    accepted: { label: "Ready", color: "#3ddc84" },
    pending: { label: "Waiting", color: "#f5b942" },
    rejected: { label: "Declined", color: "#ef4444" },
    expired: { label: "Expired", color: "#ef4444" },
    team_cancelled: { label: "Cancelled", color: "#ef4444" },
  };
  const meta = statusMap[member.status] ?? { label: member.status, color: "#8ba0a6" };

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: 14,
      padding: "14px 16px",
      borderRadius: 14,
      background: "rgba(201,214,218,0.03)",
      border: `1px solid ${meta.color}22`,
    }}>
      <div style={{
        width: 46,
        height: 46,
        borderRadius: "50%",
        background: `linear-gradient(135deg, ${accent}28, ${accent}08)`,
        border: `2px solid ${meta.color}55`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 18,
        fontWeight: 900,
        color: accent,
        flexShrink: 0,
      }}>
        {(member.name || "?")[0].toUpperCase()}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: "#e8f0f3" }}>
          {member.name}{isMe ? " (you)" : ""}{member.isCaptain ? " - captain" : ""}
        </div>
        <div style={{ marginTop: 4, fontSize: 10, color: meta.color, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase" }}>
          {meta.label}
        </div>
      </div>
    </div>
  );
}

export default function RaidLobbyClient({ teamGroupId, myClerkId, myName, initialLobby }) {
  const [lobby, setLobby] = useState(initialLobby);
  const [accepting, setAccepting] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [clock, setClock] = useState(0);
  const router = useRouter();
  const redirectTimerRef = useRef(null);
  const pollRef = useRef(null);
  const sseRef = useRef(null);

  const myInvite = lobby.invitees.find((invitee) => invitee.clerkId === myClerkId) ?? null;
  const amCaptain = lobby.inviterClerkId === myClerkId;
  const lobbyDead = ["cancelled", "rejected", "expired"].includes(lobby.status);
  const everyoneReady = lobby.allAccepted;
  const partnerName = amCaptain
    ? (lobby.invitees.find((invitee) => invitee.status === "accepted")?.name ?? lobby.inviterName)
    : lobby.inviterName;
  const countdown = lobby.expiresAt ? formatCountdown(lobby.expiresAt) : null;

  function applyLobby(nextLobby) {
    setLobby(nextLobby);
  }

  useEffect(() => {
    const id = setInterval(() => setClock(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let active = true;
    const sse = new EventSource(`/api/raid/lobby/${teamGroupId}/events`);
    sseRef.current = sse;

    sse.addEventListener("lobby", (event) => {
      try {
        if (!active) return;
        applyLobby(JSON.parse(event.data));
      } catch {}
    });
    sse.onerror = () => {};

    pollRef.current = setInterval(async () => {
      if (!active) return;
      try {
        const response = await fetch(`/api/raid/lobby/${teamGroupId}`);
        if (!response.ok || !active) return;
        applyLobby(await response.json());
      } catch {}
    }, 10_000);

    return () => {
      active = false;
      sse.close();
      clearInterval(pollRef.current);
    };
  }, [teamGroupId]);

  useEffect(() => {
    if (!everyoneReady || lobbyDead) return;
    clearTimeout(redirectTimerRef.current);
    redirectTimerRef.current = setTimeout(() => {
      const params = new URLSearchParams({ teamGroupId });
      if (partnerName) params.set("partnerName", partnerName);
      if (lobby.sourceTeamName) params.set("teamName", lobby.sourceTeamName);
      router.replace(`/group-raid-page?${params.toString()}`);
    }, 1400);

    return () => clearTimeout(redirectTimerRef.current);
  }, [everyoneReady, lobbyDead, teamGroupId, partnerName, lobby.sourceTeamName, router]);

  useEffect(() => () => clearTimeout(redirectTimerRef.current), []);

  async function handleAccept() {
    if (!myInvite || accepting) return;
    setAccepting(true);
    try {
      const response = await fetch(`/api/raid/invite/${myInvite.inviteId}/accept`, { method: "POST" });
      if (!response.ok) setAccepting(false);
    } catch {
      setAccepting(false);
    }
  }

  async function handleReject() {
    if (!myInvite || rejecting) return;
    setRejecting(true);
    try {
      await fetch(`/api/raid/invite/${myInvite.inviteId}/reject`, { method: "POST" });
    } finally {
      setRejecting(false);
    }
  }

  async function handleLeave() {
    if (leaving) return;
    setLeaving(true);
    try {
      await fetch(`/api/raid/lobby/${teamGroupId}/cancel`, { method: "POST" });
    } catch {}
    router.replace("/home");
  }

  const title = lobby.sourceTeamName ? `${lobby.sourceTeamName} Team Raid` : "Group Raid Lobby";
  const subtitle = everyoneReady
    ? "Squad locked in. Entering matchmaking..."
    : amCaptain
      ? "Waiting for everyone to accept your raid invite."
      : myInvite?.status === "pending"
        ? "Accept to join this raid squad."
        : "Waiting for the full squad to be ready.";

  const showAcceptActions = !lobbyDead && myInvite?.status === "pending";

  return (
    <>
      <style>{KEYFRAMES}</style>
      <div style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#0d1a1f",
        backgroundImage: [
          "linear-gradient(rgba(201,214,218,0.02) 1px, transparent 1px)",
          "linear-gradient(90deg, rgba(201,214,218,0.02) 1px, transparent 1px)",
        ].join(", "),
        backgroundSize: "52px 52px",
        padding: 24,
        overflow: "hidden",
      }}>
        <div style={{
          width: "100%",
          maxWidth: 620,
          borderRadius: 24,
          border: "1px solid rgba(245,185,66,0.16)",
          background: "linear-gradient(180deg, rgba(18,35,43,0.94), rgba(10,20,25,0.96))",
          boxShadow: "0 22px 80px rgba(0,0,0,0.38)",
          padding: 28,
          animation: "raid-lobby-float 0.35s ease forwards",
          position: "relative",
          overflow: "hidden",
        }}>
          {everyoneReady && !lobbyDead && (
            <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
              <div style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                width: 10,
                height: 10,
                marginLeft: -5,
                marginTop: -5,
                borderRadius: "50%",
                background: "#3ddc84",
                animation: "raid-orb 1.4s ease-out infinite",
              }} />
            </div>
          )}

          <div style={{ textAlign: "center", marginBottom: 26 }}>
            <div style={{ fontSize: 12, color: "#f5b942", fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 10 }}>
              Raid Lobby
            </div>
            <div style={{ fontSize: 30, fontWeight: 900, color: "#e8f0f3", letterSpacing: "-0.03em" }}>
              {title}
            </div>
            <div style={{ marginTop: 8, fontSize: 13, color: everyoneReady ? "#3ddc84" : "#8ba0a6", fontWeight: everyoneReady ? 700 : 500 }}>
              {subtitle}
            </div>
            {!everyoneReady && !lobbyDead && countdown && (
              <div style={{ marginTop: 12, fontSize: 26, fontWeight: 900, color: new Date(lobby.expiresAt).getTime() - clock < 30_000 ? "#ef4444" : "#f5b942", letterSpacing: "-0.04em" }}>
                {countdown}
              </div>
            )}
          </div>

          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 14,
            marginBottom: 22,
            padding: "14px 16px",
            borderRadius: 16,
            background: everyoneReady ? "rgba(61,220,132,0.08)" : "rgba(255,255,255,0.03)",
            border: everyoneReady ? "1px solid rgba(61,220,132,0.22)" : "1px solid rgba(255,255,255,0.05)",
            animation: everyoneReady ? "raid-ready-pulse 1.6s ease infinite" : "none",
          }}>
            <div>
              <div style={{ fontSize: 11, color: "#8ba0a6", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                Squad Status
              </div>
              <div style={{ marginTop: 4, fontSize: 18, color: "#e8f0f3", fontWeight: 900 }}>
                {lobby.acceptedCount}/{lobby.memberCount} ready
              </div>
            </div>
            <div style={{ fontSize: 12, color: "#8ba0a6", textAlign: "right" }}>
              {lobby.sourceTeamName ? "Formal team raid squad" : "Followed-player squad"}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
            {lobby.members.map((member) => (
              <MemberCard
                key={`${member.clerkId}-${member.name}`}
                member={member}
                accent={member.isCaptain ? "#f5b942" : "#3ddc84"}
                isMe={member.clerkId === myClerkId || member.name === myName}
              />
            ))}
          </div>

          {showAcceptActions && (
            <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
              <button
                type="button"
                onClick={handleAccept}
                disabled={accepting}
                style={{
                  flex: 1,
                  background: "#f5b942",
                  color: "#0d1a1f",
                  border: "none",
                  borderRadius: 12,
                  padding: "12px 18px",
                  fontSize: 14,
                  fontWeight: 900,
                  cursor: accepting ? "not-allowed" : "pointer",
                  opacity: accepting ? 0.7 : 1,
                }}
              >
                {accepting ? "Accepting..." : "Accept Raid"}
              </button>
              <button
                type="button"
                onClick={handleReject}
                disabled={rejecting}
                style={{
                  flex: 1,
                  background: "transparent",
                  color: "#ef4444",
                  border: "1px solid rgba(239,68,68,0.3)",
                  borderRadius: 12,
                  padding: "12px 18px",
                  fontSize: 14,
                  fontWeight: 800,
                  cursor: rejecting ? "not-allowed" : "pointer",
                  opacity: rejecting ? 0.7 : 1,
                }}
              >
                {rejecting ? "Declining..." : "Decline"}
              </button>
            </div>
          )}

          {!showAcceptActions && !lobbyDead && (
            <div style={{ marginBottom: 16, fontSize: 12, color: "#8ba0a6", textAlign: "center" }}>
              {everyoneReady ? "Matchmaking will open for the whole squad in a moment." : "This lobby updates live as your squad accepts or declines."}
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "center" }}>
            <button
              type="button"
              onClick={handleLeave}
              disabled={leaving}
              style={{
                background: "transparent",
                color: lobbyDead ? "#f5b942" : "#8ba0a6",
                border: `1px solid ${lobbyDead ? "rgba(245,185,66,0.28)" : "rgba(201,214,218,0.16)"}`,
                borderRadius: 10,
                padding: "10px 22px",
                fontSize: 13,
                fontWeight: 700,
                cursor: leaving ? "not-allowed" : "pointer",
                opacity: leaving ? 0.7 : 1,
              }}
            >
              {lobbyDead ? "Back to Home" : amCaptain ? "Cancel Raid" : "Leave Lobby"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
