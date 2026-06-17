"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";

const C = {
  bg:          "#0d1a1f",
  panel:       "#0a1419",
  card:        "#0e191f",
  border:      "rgba(201,214,218,0.07)",
  borderHover: "rgba(61,220,132,0.22)",
  green:       "#3ddc84",
  cyan:        "#22d3ee",
  text:        "#e8f0f3",
  sub:         "#8ba0a6",
  muted:       "#4a6570",
  sent:        "rgba(61,220,132,0.12)",
  sentBorder:  "rgba(61,220,132,0.3)",
  recv:        "rgba(201,214,218,0.05)",
  recvBorder:  "rgba(201,214,218,0.12)",
};

function avatar(name, size = 36, color = C.green) {
  return (
    <div
      style={{
        width: size, height: size, borderRadius: "50%", flexShrink: 0,
        background: `linear-gradient(135deg, ${color}30, ${color}10)`,
        border: `1.5px solid ${color}50`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: size * 0.42, fontWeight: 700, color,
      }}
    >
      {(name || "?").charAt(0).toUpperCase()}
    </div>
  );
}

function timeAgo(dateStr) {
  if (!dateStr) return "";
  const diff = (Date.now() - new Date(dateStr)) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

async function apiFetch(url, opts = {}) {
  const res = await fetch(url, { ...opts, headers: { "Content-Type": "application/json", ...opts.headers } });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "Request failed");
  return data;
}

export default function SocialClient({ myClerkId }) {
  const [suggested, setSuggested]     = useState([]);
  const [inbox, setInbox]             = useState([]);
  const [activeConvId, setActiveConvId] = useState(null);
  const [messages, setMessages]       = useState([]);
  const [input, setInput]             = useState("");
  const [sending, setSending]         = useState(false);
  const [followedIds, setFollowedIds] = useState(new Set());
  const [loadingInbox, setLoadingInbox] = useState(true);
  const [openingConv, setOpeningConv] = useState(false);
  const messagesEndRef                = useRef(null);
  const pollRef                       = useRef(null);

  const activeConv = inbox.find((c) => c.id === activeConvId) ?? null;

  // ── Data loaders ───────────────────────────────────────────

  const loadSuggested = useCallback(async () => {
    if (!myClerkId) return;
    try {
      const data = await apiFetch("/api/follow/suggested");
      setSuggested(Array.isArray(data) ? data : []);
    } catch { /* silent */ }
  }, [myClerkId]);

  const loadInbox = useCallback(async () => {
    if (!myClerkId) return;
    try {
      const data = await apiFetch("/api/chat/inbox");
      setInbox(Array.isArray(data) ? data : []);
    } catch { /* silent */ }
  }, [myClerkId]);

  const loadMessages = useCallback(async (convId) => {
    if (!convId) return;
    try {
      const data = await apiFetch(`/api/chat/conversation/${convId}`);
      setMessages(Array.isArray(data) ? data : []);
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    loadSuggested();
    loadInbox().then(() => setLoadingInbox(false));
  }, [loadSuggested, loadInbox]);

  // ── Poll for new messages ──────────────────────────────────
  useEffect(() => {
    clearInterval(pollRef.current);
    if (!activeConvId) return;
    loadMessages(activeConvId);
    pollRef.current = setInterval(() => loadMessages(activeConvId), 3000);
    return () => clearInterval(pollRef.current);
  }, [activeConvId, loadMessages]);

  // ── Auto-scroll to bottom ──────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Actions ────────────────────────────────────────────────

  async function handleFollow(clerkId) {
    const already = followedIds.has(clerkId);
    setFollowedIds((prev) => {
      const next = new Set(prev);
      already ? next.delete(clerkId) : next.add(clerkId);
      return next;
    });
    try {
      await apiFetch("/api/follow", {
        method: already ? "DELETE" : "POST",
        body: JSON.stringify({ targetClerkId: clerkId }),
      });
      if (!already) setSuggested((prev) => prev.filter((u) => u.clerkId !== clerkId));
    } catch {
      setFollowedIds((prev) => {
        const next = new Set(prev);
        already ? next.add(clerkId) : next.delete(clerkId);
        return next;
      });
    }
  }

  async function handleMessage(targetClerkId) {
    setOpeningConv(true);
    try {
      const { conversationId } = await apiFetch("/api/chat/conversation", {
        method: "POST",
        body: JSON.stringify({ targetClerkId }),
      });
      await loadInbox();
      setActiveConvId(conversationId);
    } catch { /* silent */ } finally {
      setOpeningConv(false);
    }
  }

  async function handleSend() {
    if (!input.trim() || sending || !activeConvId) return;
    setSending(true);
    const body = input.trim();
    setInput("");
    try {
      await apiFetch(`/api/chat/conversation/${activeConvId}/message`, {
        method: "POST",
        body: JSON.stringify({ body }),
      });
      await Promise.all([loadMessages(activeConvId), loadInbox()]);
    } catch {
      setInput(body);
    } finally {
      setSending(false);
    }
  }

  // ── Unauthenticated ────────────────────────────────────────

  if (!myClerkId) {
    return (
      <PageShell>
        <div style={{ textAlign: "center", padding: "80px 24px" }}>
          <p style={{ fontSize: "16px", color: C.sub, marginBottom: "20px" }}>Sign in to access social features.</p>
          <Link href="/sign-in" style={{ background: C.green, color: "#0d1a1f", textDecoration: "none", padding: "10px 28px", borderRadius: "8px", fontWeight: 800, fontSize: "14px" }}>
            Sign In →
          </Link>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      {/* ── Suggested ───────────────────────────────────────── */}
      {suggested.length > 0 && (
        <section style={{ padding: "28px 32px 0" }}>
          <p style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: C.muted, margin: "0 0 14px" }}>
            Suggested
          </p>
          <div style={{ display: "flex", gap: "12px", overflowX: "auto", paddingBottom: "8px" }}>
            {suggested.map((u) => (
              <SuggestedCard
                key={u.clerkId}
                user={u}
                followed={followedIds.has(u.clerkId)}
                openingConv={openingConv}
                onFollow={() => handleFollow(u.clerkId)}
                onMessage={() => handleMessage(u.clerkId)}
              />
            ))}
          </div>
        </section>
      )}

      {/* ── DM section ──────────────────────────────────────── */}
      <section
        style={{
          display: "flex",
          flex: 1,
          margin: "24px 32px 32px",
          border: `1px solid ${C.border}`,
          borderRadius: "12px",
          overflow: "hidden",
          minHeight: "520px",
        }}
      >
        {/* Left — inbox */}
        <div
          style={{
            width: "260px",
            flexShrink: 0,
            borderRight: `1px solid ${C.border}`,
            background: C.panel,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div style={{ padding: "16px 16px 10px", borderBottom: `1px solid ${C.border}` }}>
            <span style={{ fontSize: "14px", fontWeight: 700, color: C.text }}>Messages</span>
          </div>

          <div style={{ flex: 1, overflowY: "auto" }}>
            {loadingInbox && (
              <p style={{ fontSize: "12px", color: C.muted, padding: "16px", textAlign: "center" }}>Loading…</p>
            )}
            {!loadingInbox && inbox.length === 0 && (
              <p style={{ fontSize: "12px", color: C.muted, padding: "16px", textAlign: "center" }}>No conversations yet.<br />Message someone from Suggested.</p>
            )}
            {inbox.map((conv) => (
              <InboxItem
                key={conv.id}
                conv={conv}
                active={conv.id === activeConvId}
                myClerkId={myClerkId}
                onClick={() => setActiveConvId(conv.id)}
              />
            ))}
          </div>
        </div>

        {/* Right — active conversation */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", background: C.bg }}>
          {activeConvId && activeConv ? (
            <>
              {/* Convo header */}
              <div style={{ padding: "14px 20px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
                {avatar(activeConv.displayName, 30, C.cyan)}
                <span style={{ fontSize: "14px", fontWeight: 600, color: C.text }}>{activeConv.displayName}</span>
              </div>

              {/* Messages */}
              <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: "10px" }}>
                {messages.length === 0 && (
                  <p style={{ fontSize: "12px", color: C.muted, textAlign: "center", marginTop: "40px" }}>No messages yet. Say hello!</p>
                )}
                {messages.map((msg) => {
                  const isMine = msg.senderClerkId === myClerkId;
                  return (
                    <MessageBubble key={msg.id} msg={msg} isMine={isMine} />
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div style={{ padding: "12px 20px", borderTop: `1px solid ${C.border}`, display: "flex", gap: "10px", flexShrink: 0 }}>
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                  placeholder="Message…"
                  maxLength={500}
                  style={{
                    flex: 1,
                    background: C.panel,
                    border: `1px solid ${C.border}`,
                    borderRadius: "8px",
                    padding: "9px 14px",
                    fontSize: "13px",
                    color: C.text,
                    outline: "none",
                  }}
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || sending}
                  style={{
                    background: input.trim() && !sending ? C.green : "transparent",
                    color: input.trim() && !sending ? "#0d1a1f" : C.muted,
                    border: `1px solid ${input.trim() && !sending ? C.green : C.border}`,
                    borderRadius: "8px",
                    padding: "9px 18px",
                    fontSize: "13px",
                    fontWeight: 700,
                    cursor: input.trim() && !sending ? "pointer" : "not-allowed",
                  }}
                >
                  {sending ? "…" : "Send"}
                </button>
              </div>
            </>
          ) : (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "12px" }}>
              <div style={{ fontSize: "28px" }}>💬</div>
              <p style={{ fontSize: "14px", color: C.sub }}>Select a conversation or message someone from Suggested.</p>
            </div>
          )}
        </div>
      </section>
    </PageShell>
  );
}

// ── Sub-components ─────────────────────────────────────────────

function PageShell({ children }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: C.bg,
        color: C.text,
        fontFamily: "'Segoe UI', 'Aptos', 'Trebuchet MS', sans-serif",
        backgroundImage: [
          "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(61,220,132,0.06), transparent 70%)",
          "linear-gradient(rgba(201,214,218,0.025) 1px, transparent 1px)",
          "linear-gradient(90deg, rgba(201,214,218,0.025) 1px, transparent 1px)",
        ].join(", "),
        backgroundSize: "100% 100%, 44px 44px, 44px 44px",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Nav */}
      <nav
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 32px",
          borderBottom: `1px solid ${C.border}`,
          background: "rgba(13,26,31,0.85)",
          backdropFilter: "blur(14px)",
          position: "sticky",
          top: 0,
          zIndex: 50,
        }}
      >
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: "2px", textDecoration: "none" }}>
          <span style={{ fontSize: "16px", fontWeight: 900, color: C.green, letterSpacing: "-0.03em" }}>Debug</span>
          <span style={{ fontSize: "16px", fontWeight: 900, color: C.text, letterSpacing: "-0.03em" }}>Battle</span>
        </Link>
        <div style={{ display: "flex", gap: "24px", alignItems: "center" }}>
          <Link href="/" style={{ fontSize: "13px", color: C.sub, textDecoration: "none" }}>Home</Link>
          <Link href="/leaderboard" style={{ fontSize: "13px", color: C.sub, textDecoration: "none" }}>Leaderboard</Link>
          <Link href="/duel" style={{ fontSize: "13px", color: C.sub, textDecoration: "none" }}>Play</Link>
        </div>
      </nav>

      {/* Page title */}
      <div style={{ padding: "28px 32px 0" }}>
        <h1 style={{ fontSize: "22px", fontWeight: 800, color: C.text, margin: 0, letterSpacing: "-0.02em" }}>Social</h1>
        <p style={{ fontSize: "13px", color: C.sub, margin: "4px 0 0" }}>Follow engineers, send messages.</p>
      </div>

      {children}
    </div>
  );
}

function SuggestedCard({ user, followed, openingConv, onFollow, onMessage }) {
  const name = user.username || [user.firstName, user.lastName].filter(Boolean).join(" ") || "Anonymous";
  return (
    <div
      style={{
        flexShrink: 0,
        width: "148px",
        background: C.card,
        border: `1px solid ${C.border}`,
        borderRadius: "10px",
        padding: "16px 14px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "8px",
        textAlign: "center",
      }}
    >
      {avatar(name, 40, C.green)}
      <div style={{ fontSize: "13px", fontWeight: 600, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", width: "100%" }}>{name}</div>
      <div style={{ fontSize: "11px", color: C.muted }}>{user.bestScore} pts</div>
      <button
        onClick={onFollow}
        style={{
          width: "100%",
          background: followed ? "transparent" : C.green,
          color: followed ? C.sub : "#0d1a1f",
          border: `1px solid ${followed ? C.border : C.green}`,
          borderRadius: "6px",
          padding: "5px 0",
          fontSize: "11px",
          fontWeight: 700,
          cursor: "pointer",
        }}
      >
        {followed ? "Following" : "Follow"}
      </button>
      <button
        onClick={onMessage}
        disabled={openingConv}
        style={{
          width: "100%",
          background: "transparent",
          color: C.cyan,
          border: `1px solid rgba(34,211,238,0.3)`,
          borderRadius: "6px",
          padding: "5px 0",
          fontSize: "11px",
          fontWeight: 600,
          cursor: openingConv ? "not-allowed" : "pointer",
          opacity: openingConv ? 0.5 : 1,
        }}
      >
        Message
      </button>
    </div>
  );
}

function InboxItem({ conv, active, myClerkId, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        width: "100%",
        padding: "12px 14px",
        background: active ? "rgba(61,220,132,0.06)" : "transparent",
        borderLeft: active ? `2px solid ${C.green}` : "2px solid transparent",
        border: "none",
        borderBottom: `1px solid ${C.border}`,
        cursor: "pointer",
        textAlign: "left",
      }}
    >
      {avatar(conv.displayName, 34, active ? C.green : C.sub)}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: "13px", fontWeight: 600, color: active ? C.text : C.sub, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {conv.displayName}
        </div>
        {conv.lastMessage && (
          <div style={{ fontSize: "11px", color: C.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: "2px" }}>
            {conv.lastMessage.senderClerkId === myClerkId ? "You: " : ""}
            {conv.lastMessage.body}
          </div>
        )}
      </div>
      {conv.lastMessage && (
        <div style={{ fontSize: "10px", color: C.muted, flexShrink: 0 }}>{timeAgo(conv.lastMessage.createdAt)}</div>
      )}
    </button>
  );
}

function MessageBubble({ msg, isMine }) {
  return (
    <div style={{ display: "flex", justifyContent: isMine ? "flex-end" : "flex-start" }}>
      <div
        style={{
          maxWidth: "70%",
          background: isMine ? C.sent : C.recv,
          border: `1px solid ${isMine ? C.sentBorder : C.recvBorder}`,
          borderRadius: isMine ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
          padding: "8px 12px",
        }}
      >
        <p style={{ margin: 0, fontSize: "13px", color: C.text, lineHeight: 1.5, wordBreak: "break-word" }}>{msg.body}</p>
        <p style={{ margin: "4px 0 0", fontSize: "10px", color: C.muted, textAlign: isMine ? "right" : "left" }}>{timeAgo(msg.createdAt)}</p>
      </div>
    </div>
  );
}
