"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const KEYFRAMES = `
@keyframes notif-pop {
  0%   { transform: scale(0.85) translateY(12px); opacity: 0; }
  60%  { transform: scale(1.03) translateY(-2px); opacity: 1; }
  100% { transform: scale(1)    translateY(0);    opacity: 1; }
}
@keyframes notif-exit {
  to { transform: scale(0.85) translateY(12px); opacity: 0; }
}
`;

function timeAgo(isoStr) {
  if (!isoStr) return "";
  const diff = Date.now() - new Date(isoStr).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60)  return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60)  return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
}

export default function RaidNotificationsGlobal() {
  const [pending, setPending]         = useState([]);
  const [dismissed, setDismissed]     = useState(new Set());
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory]         = useState([]);
  const [histLoading, setHistLoading] = useState(false);
  const [authFailed, setAuthFailed]   = useState(false);
  const router = useRouter();
  const pollRef = useRef(null);

  // Poll for pending invites every 5s
  useEffect(() => {
    if (authFailed) return;
    let active = true;

    const tick = async () => {
      if (!active) return;
      try {
        const r = await fetch("/api/raid/invite/pending");
        if (r.status === 401) { setAuthFailed(true); return; }
        if (!r.ok || !active) return;
        const data = await r.json();
        if (active) setPending(data.invites ?? []);
      } catch {}
    };

    tick();
    pollRef.current = setInterval(tick, 5000);
    return () => { active = false; clearInterval(pollRef.current); };
  }, [authFailed]);

  async function fetchHistory() {
    setHistLoading(true);
    try {
      const r = await fetch("/api/raid/invite/notifications");
      if (r.ok) {
        const data = await r.json();
        setHistory(data.notifications ?? []);
      }
    } catch {}
    setHistLoading(false);
  }

  async function handleAccept(invite) {
    try {
      const r    = await fetch(`/api/raid/invite/${invite.id}/accept`, { method: "POST" });
      const data = await r.json();
      if (data.teamGroupId) {
        setPending([]);
        setShowHistory(false);
        router.push(`/group-raid-page?teamGroupId=${data.teamGroupId}&partnerName=${encodeURIComponent(data.inviterName ?? "")}`);
      }
    } catch {}
  }

  async function handleReject(invite, fromHistory = false) {
    try {
      await fetch(`/api/raid/invite/${invite.id}/reject`, { method: "POST" });
    } catch {}
    setPending((prev) => prev.filter((i) => i.id !== invite.id));
    if (fromHistory) {
      setHistory((prev) => prev.map((n) => n.id === invite.id ? { ...n, status: "rejected", isLive: false } : n));
    }
  }

  // Visible pending invites (not dismissed locally)
  const visible = pending.filter((i) => !dismissed.has(i.id));
  const topInvite = visible[0] ?? null;

  const hasPending = visible.length > 0;

  return (
    <>
      <style>{KEYFRAMES}</style>

      {/* Floating speech bubble */}
      {topInvite && (
        <div
          key={topInvite.id}
          style={{
            position: "fixed", bottom: "28px", right: "28px",
            background: "#12232b",
            border: "2px solid #f5b942",
            borderRadius: "16px 16px 4px 16px",
            padding: "16px 18px",
            boxShadow: "0 8px 40px rgba(0,0,0,0.55), 0 0 0 1px rgba(245,185,66,0.12)",
            zIndex: 9999, maxWidth: "290px", minWidth: "240px",
            animation: "notif-pop 0.35s cubic-bezier(0.34,1.56,0.64,1) forwards",
            fontFamily: "'Segoe UI','Aptos','Trebuchet MS',sans-serif",
          }}
        >
          {/* Speech bubble tail */}
          <div style={{
            position: "absolute", bottom: "-10px", right: "20px",
            width: 0, height: 0,
            borderLeft: "9px solid transparent",
            borderRight: "0px solid transparent",
            borderTop: "10px solid #f5b942",
          }} />

          {/* Dismiss × */}
          <button
            onClick={() => setDismissed((s) => new Set([...s, topInvite.id]))}
            style={{
              position: "absolute", top: "8px", right: "10px",
              background: "none", border: "none", cursor: "pointer",
              color: "#6b7280", fontSize: "15px", lineHeight: 1,
              padding: 0,
            }}
          >×</button>

          <div style={{ marginRight: "16px" }}>
            <div style={{ fontSize: "13px", fontWeight: 700, color: "#f5b942", marginBottom: "4px" }}>
              ⚔️ Raid Invitation
            </div>
            <div style={{ fontSize: "13px", color: "#c9d6da", marginBottom: "14px" }}>
              <strong>{topInvite.inviterName}</strong> wants you on their team!
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                onClick={() => handleAccept(topInvite)}
                style={{
                  flex: 1, background: "#22c55e", color: "#000",
                  border: "none", borderRadius: "8px", padding: "7px 0",
                  fontWeight: 800, cursor: "pointer", fontSize: "13px",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "#16a34a"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "#22c55e"; }}
              >
                Accept
              </button>
              <button
                onClick={() => handleReject(topInvite)}
                style={{
                  flex: 1, background: "#1f2d34", color: "#9ca3af",
                  border: "1px solid #334155", borderRadius: "8px", padding: "7px 0",
                  cursor: "pointer", fontSize: "13px", fontWeight: 600,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = "#e8f0f3"; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = "#9ca3af"; }}
              >
                Reject
              </button>
            </div>
          </div>

          {/* History link */}
          <button
            onClick={() => { fetchHistory(); setShowHistory(true); }}
            style={{
              marginTop: "10px", background: "none", border: "none",
              color: "#4a6570", fontSize: "11px", cursor: "pointer",
              textDecoration: "underline", padding: 0, display: "block", width: "100%", textAlign: "center",
            }}
          >
            {visible.length > 1 ? `+${visible.length - 1} more · ` : ""}View all invitations
          </button>
        </div>
      )}

      {/* Notification history dialog */}
      {showHistory && (
        <div
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)",
            zIndex: 10000, display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "'Segoe UI','Aptos','Trebuchet MS',sans-serif",
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowHistory(false); }}
        >
          <div style={{
            background: "#12232b", border: "1px solid #1e3a48",
            borderRadius: "16px", padding: "24px",
            maxWidth: "500px", width: "90%", maxHeight: "70vh",
            overflowY: "auto",
          }}>
            <div style={{ display: "flex", alignItems: "center", marginBottom: "18px" }}>
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "#f5b942" }}>
                📨 Raid Invitations
              </h3>
              <div style={{ flex: 1 }} />
              <button
                onClick={() => setShowHistory(false)}
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  color: "#6b7280", fontSize: "20px", lineHeight: 1, padding: 0,
                }}
              >×</button>
            </div>

            {histLoading && (
              <div style={{ color: "#4a6570", textAlign: "center", padding: "32px", fontSize: "13px" }}>
                Loading…
              </div>
            )}

            {!histLoading && history.length === 0 && (
              <div style={{ color: "#4a6570", textAlign: "center", padding: "32px", fontSize: "13px" }}>
                No invitations yet
              </div>
            )}

            {!histLoading && history.map((n) => {
              const isSent = n.isSent;
              const isLive = n.isLive;

              const statusColor = {
                pending:  "#f5b942",
                accepted: "#22c55e",
                rejected: "#ef4444",
                expired:  "#4a6570",
              }[n.status] ?? "#4a6570";

              return (
                <div key={n.id} style={{
                  border: "1px solid #1e3a48", borderRadius: "10px",
                  padding: "13px 16px", marginBottom: "8px",
                  opacity: isLive ? 1 : 0.6,
                  background: "rgba(201,214,218,0.02)",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                    <span style={{ fontSize: "13px", color: "#e8f0f3", fontWeight: 600, flex: 1 }}>
                      {isSent
                        ? `You → ${n.inviteeName}`
                        : `${n.inviterName} → You`}
                    </span>
                    <span style={{ fontSize: "11px", color: "#4a6570" }}>{timeAgo(n.createdAt)}</span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{
                      fontSize: "11px", fontWeight: 700, color: statusColor,
                      textTransform: "uppercase", letterSpacing: "0.06em",
                    }}>
                      {n.status}
                    </span>

                    {/* Accept/Reject for live received invites */}
                    {isLive && !isSent && (
                      <div style={{ display: "flex", gap: "6px", marginLeft: "auto" }}>
                        <button
                          onClick={() => { handleAccept(n); setShowHistory(false); }}
                          style={{
                            background: "#22c55e", color: "#000",
                            border: "none", borderRadius: "6px", padding: "4px 12px",
                            fontWeight: 700, cursor: "pointer", fontSize: "12px",
                          }}
                        >Accept</button>
                        <button
                          onClick={() => handleReject(n, true)}
                          style={{
                            background: "#1f2d34", color: "#9ca3af",
                            border: "1px solid #334155", borderRadius: "6px", padding: "4px 12px",
                            cursor: "pointer", fontSize: "12px",
                          }}
                        >Reject</button>
                      </div>
                    )}

                    {/* Dead label for non-live */}
                    {!isLive && n.status !== "accepted" && (
                      <span style={{
                        marginLeft: "auto", fontSize: "10px", fontWeight: 700,
                        color: "#334155", border: "1px solid #334155",
                        borderRadius: "4px", padding: "2px 7px", letterSpacing: "0.08em",
                        textTransform: "uppercase",
                      }}>Dead</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
