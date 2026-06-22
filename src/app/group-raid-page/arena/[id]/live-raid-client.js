"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import AceEditor from "react-ace";
import "ace-builds/src-noconflict/mode-c_cpp";
import "ace-builds/src-noconflict/theme-monokai";
import "ace-builds/src-noconflict/ext-language_tools";

// ── Constants ──────────────────────────────────────────────────
const CATS = [
  { key: "Security",        icon: "🔒", color: "#ff5c5c" },
  { key: "Performance",     icon: "⚡", color: "#f5b942" },
  { key: "Scalability",     icon: "📈", color: "#3ddc84" },
  { key: "Ethics",          icon: "⚖️",  color: "#22d3ee" },
  { key: "Maintainability", icon: "🔧", color: "#a78bfa" },
];
const PTS_PER_FIX   = 20;
const TEAM_COLORS   = ["#3ddc84", "#22d3ee"];
const TEAM_LABELS   = ["Alpha", "Bravo"];

function formatTime(secs) {
  if (secs <= 0) return "0:00";
  const m = Math.floor(secs / 60);
  const s = (secs % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

// ── File tree ──────────────────────────────────────────────────
function FileLeaf({ node, selectedPath, onSelect, fileProg }) {
  const fixed = Object.values(fileProg).filter((c) => c.fixed?.length > 0).length;
  const isSel = selectedPath === node.path;
  return (
    <button
      onClick={() => onSelect(node.path)}
      title={node.path}
      style={{
        width: "100%", background: "none", border: "none",
        cursor: "pointer", textAlign: "left",
        padding: "5px 10px 5px 20px",
        display: "flex", alignItems: "center", gap: "7px",
        borderLeft: isSel ? "2px solid #f5b942" : "2px solid transparent",
        background: isSel ? "rgba(245,185,66,0.05)" : "transparent",
      }}
    >
      <span style={{ fontSize: "11px", flexShrink: 0 }}>📄</span>
      <span style={{
        fontSize: "12px", color: isSel ? "#e8f0f3" : "#8ba0a6",
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1,
      }}>
        {node.name}
      </span>
      {fixed > 0 && (
        <span style={{
          fontSize: "10px", fontWeight: 700, color: "#f5b942",
          background: "rgba(245,185,66,0.12)", padding: "1px 6px", borderRadius: "999px",
          flexShrink: 0,
        }}>
          {fixed}/5
        </span>
      )}
    </button>
  );
}

function FolderBranch({ node, selectedPath, onSelect, progress }) {
  const [open, setOpen] = useState(true);
  if (node.type === "file") {
    return <FileLeaf node={node} selectedPath={selectedPath} onSelect={onSelect} fileProg={progress[node.path] ?? {}} />;
  }
  if (!node.name) {
    return (
      <div>
        {node.children.map((c) => (
          <FolderBranch key={c.name} node={c} selectedPath={selectedPath} onSelect={onSelect} progress={progress} />
        ))}
      </div>
    );
  }
  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          width: "100%", background: "none", border: "none",
          cursor: "pointer", textAlign: "left",
          padding: "5px 10px", display: "flex", alignItems: "center", gap: "6px",
        }}
      >
        <span style={{ fontSize: "9px", color: "#4a6570", width: "10px", flexShrink: 0 }}>{open ? "▾" : "▸"}</span>
        <span style={{ fontSize: "12px", flexShrink: 0 }}>📁</span>
        <span style={{ fontSize: "12px", fontWeight: 600, color: "#8ba0a6" }}>{node.name}</span>
      </button>
      {open && (
        <div style={{ paddingLeft: "14px" }}>
          {node.children.map((c) => (
            <FolderBranch key={c.name} node={c} selectedPath={selectedPath} onSelect={onSelect} progress={progress} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Category row (right panel) ─────────────────────────────────
function CategoryRow({ cat, vulns, catProg, isActive, onToggle, onCheck, checking, lastCheck }) {
  const fixedIdxs  = catProg?.fixed ?? [];
  const isDone     = vulns.length > 0 && fixedIdxs.length >= vulns.length;
  const justChecked = lastCheck?.category === cat.key && !lastCheck?.error;
  const justFixed   = justChecked && (lastCheck?.added ?? 0) > 0;

  return (
    <div style={{ borderBottom: "1px solid rgba(201,214,218,0.05)" }}>
      <button
        onClick={onToggle}
        style={{
          width: "100%", border: "none", cursor: "pointer",
          background: isActive ? `${cat.color}09` : "none",
          padding: "10px 14px", display: "flex", alignItems: "center", gap: "10px",
        }}
      >
        <span style={{ fontSize: "15px", flexShrink: 0 }}>{cat.icon}</span>
        <span style={{ fontSize: "12px", fontWeight: 600, flex: 1, textAlign: "left", color: isDone ? cat.color : "#e8f0f3" }}>
          {cat.key}
        </span>
        {isDone ? (
          <span style={{ fontSize: "9px", fontWeight: 800, color: cat.color, background: `${cat.color}18`, padding: "2px 7px", borderRadius: "4px" }}>
            ✓ FIXED
          </span>
        ) : (
          <span style={{ fontSize: "10px", color: fixedIdxs.length > 0 ? cat.color : "#4a6570" }}>
            {fixedIdxs.length}/{vulns.length}
          </span>
        )}
        <span style={{ fontSize: "10px", color: "#4a6570", flexShrink: 0 }}>{isActive ? "▾" : "▸"}</span>
      </button>

      {isActive && (
        <div style={{ padding: "0 12px 12px 12px" }}>
          {vulns.map((vuln, vi) => {
            const fixed = fixedIdxs.includes(vi);
            const lines = Array.isArray(vuln["Line Number"]) ? vuln["Line Number"].join("–") : "?";
            return (
              <div key={vi} style={{
                marginBottom: "9px",
                background: fixed ? "rgba(61,220,132,0.04)" : "#080f12",
                border: `1px solid ${fixed ? "rgba(61,220,132,0.22)" : "rgba(201,214,218,0.06)"}`,
                borderRadius: "7px", padding: "10px",
              }}>
                <div style={{ fontSize: "10px", fontWeight: 700, color: cat.color, letterSpacing: "0.04em", marginBottom: "6px" }}>
                  📍 Lines {lines}
                </div>
                <pre style={{
                  margin: "0 0 7px", fontSize: "10.5px",
                  fontFamily: "'Cascadia Code','Fira Code','Consolas',monospace",
                  color: "#c9d6da", background: "#0d1117",
                  borderRadius: "4px", padding: "6px 8px",
                  border: "1px solid rgba(201,214,218,0.05)",
                  overflowX: "auto", whiteSpace: "pre-wrap", wordBreak: "break-all", lineHeight: 1.5,
                }}>
                  {vuln["Vulnerability Code"]}
                </pre>
                <p style={{ margin: 0, fontSize: "11px", color: "#8ba0a6", lineHeight: 1.5 }}>
                  💡 {vuln["Hint"]}
                </p>
                {fixed && <div style={{ marginTop: "6px", fontSize: "10.5px", fontWeight: 700, color: "#3ddc84" }}>✓ Fixed!</div>}
              </div>
            );
          })}

          {justChecked && (
            <div style={{
              padding: "8px 11px", borderRadius: "6px", marginBottom: "9px",
              background: justFixed ? "rgba(61,220,132,0.1)" : "rgba(245,90,90,0.08)",
              border: `1px solid ${justFixed ? "rgba(61,220,132,0.3)" : "rgba(245,90,90,0.2)"}`,
              fontSize: "11.5px", fontWeight: 600,
              color: justFixed ? "#3ddc84" : isDone ? "#3ddc84" : "#ff8080",
            }}>
              {isDone
                ? "✓ All fixed in this category!"
                : justFixed
                ? `✓ Fixed! +${lastCheck.added} pts`
                : "✗ Not fixed yet — review the hint."}
            </div>
          )}

          {!isDone && (
            <button
              onClick={onCheck}
              disabled={checking}
              style={{
                width: "100%",
                background: checking ? "rgba(201,214,218,0.05)" : cat.color,
                color: checking ? "#4a6570" : "#0d1a1f",
                border: "none", cursor: checking ? "not-allowed" : "pointer",
                padding: "8px 0", borderRadius: "6px",
                fontSize: "12px", fontWeight: 800,
                transition: "background 0.15s",
              }}
            >
              {checking ? "Checking…" : `Check ${cat.key} →`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Live scoreboard (right panel top) ─────────────────────────
function Scoreboard({ teams, myTeamId, timeLeft, matchStatus, winnerTeam }) {
  const timerColor  = timeLeft !== null && timeLeft <= 10 ? "#ff5c5c" : "#f5b942";
  const matchEnded  = matchStatus === "completed" || matchStatus === "abandoned";

  return (
    <div style={{
      padding: "10px 14px",
      borderBottom: "1px solid rgba(201,214,218,0.07)",
      flexShrink: 0,
      background: "#060c0f",
    }}>
      {/* Timer row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
        <span style={{ fontSize: "10px", fontWeight: 700, color: "#4a6570", letterSpacing: "0.1em", textTransform: "uppercase" }}>
          Live Scoreboard
        </span>
        {matchEnded ? (
          <span style={{ fontSize: "11px", fontWeight: 700, color: winnerTeam !== null ? TEAM_COLORS[winnerTeam] : "#f5b942" }}>
            {matchStatus === "abandoned" ? "⚠ Abandoned" : winnerTeam !== null ? `${TEAM_LABELS[winnerTeam]} wins!` : "Draw"}
          </span>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
            <span style={{ fontSize: "11px", color: "#4a6570" }}>⏱</span>
            <span style={{ fontSize: "14px", fontWeight: 900, color: timerColor, fontVariantNumeric: "tabular-nums" }}>
              {timeLeft !== null ? formatTime(timeLeft) : "—"}
            </span>
          </div>
        )}
      </div>

      {/* Teams */}
      <div style={{ display: "flex", gap: "8px" }}>
        {teams.map((team) => {
          const color     = TEAM_COLORS[team.teamId];
          const isMyTeam  = team.teamId === myTeamId;
          const isWinner  = matchEnded && winnerTeam === team.teamId;
          return (
            <div key={team.teamId} style={{
              flex: 1,
              background: isMyTeam ? `${color}0a` : "rgba(201,214,218,0.03)",
              border: `1px solid ${isMyTeam ? `${color}30` : "rgba(201,214,218,0.06)"}`,
              borderRadius: "8px", padding: "8px 10px",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "5px", marginBottom: "6px" }}>
                <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: color, flexShrink: 0 }} />
                <span style={{ fontSize: "10px", fontWeight: 800, color, letterSpacing: "0.06em" }}>
                  {TEAM_LABELS[team.teamId]}
                  {isWinner && " 🏆"}
                </span>
                <span style={{ marginLeft: "auto", fontSize: "14px", fontWeight: 900, color, fontVariantNumeric: "tabular-nums" }}>
                  {team.totalScore}
                </span>
              </div>
              {team.players.map((p) => (
                <div key={p.clerkId} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "2px 0", gap: "4px",
                }}>
                  <span style={{
                    fontSize: "11px",
                    color: p.isMe ? "#e8f0f3" : "#8ba0a6",
                    fontWeight: p.isMe ? 700 : 400,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1,
                  }}>
                    {p.isMe ? "◆ " : ""}{p.displayName}
                  </span>
                  <span style={{ fontSize: "11px", fontWeight: 700, color, flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>
                    {p.totalScore}
                  </span>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────
export default function LiveRaidClient({
  matchId, myClerkId, myName,
  initialState,
  codebaseName, files, filesCode, fileTree,
}) {
  const [selectedPath,   setSelectedPath]   = useState(files[0]?.Path ?? null);
  const [editedCodes,    setEditedCodes]    = useState(() => ({ ...filesCode }));
  const [progress,       setProgress]       = useState(() => initialState.me.fileProgress ?? {});
  const [myTotalScore,   setMyTotalScore]   = useState(initialState.me.totalScore);
  const [myTeamId]                          = useState(initialState.me.teamId);
  const [teams,          setTeams]          = useState(initialState.teams);
  const [matchStatus,    setMatchStatus]    = useState(initialState.status);
  const [winnerTeam,     setWinnerTeam]     = useState(initialState.winnerTeam ?? null);
  const [timeLeft,       setTimeLeft]       = useState(null);
  const [activeCategory, setActiveCat]      = useState(null);
  const [checking,       setChecking]       = useState(false);
  const [lastCheck,      setLastCheck]      = useState(null);

  const pollRef  = useRef(null);
  const timerRef = useRef(null);

  const matchEnded   = matchStatus === "completed" || matchStatus === "abandoned";
  const selectedFile = files.find((f) => f.Path === selectedPath) ?? null;
  const fileProgress = progress[selectedPath] ?? {};

  const { totalVulns, totalFixed } = useMemo(() => {
    let tv = 0, tf = 0;
    for (const f of files) {
      for (const c of CATS) {
        tv += f.Vulnerabilities?.[c.key]?.length ?? 0;
        tf += progress[f.Path]?.[c.key]?.fixed?.length ?? 0;
      }
    }
    return { totalVulns: tv, totalFixed: tf };
  }, [files, progress]);

  const fileScore = Object.values(fileProgress).reduce((s, c) => s + (c.score ?? 0), 0);
  const fileCatsDone = CATS.filter((c) => {
    const vulns = selectedFile?.Vulnerabilities?.[c.key] ?? [];
    const fixed = fileProgress[c.key]?.fixed?.length ?? 0;
    return vulns.length > 0 && fixed >= vulns.length;
  }).length;

  const pct = totalVulns > 0 ? Math.round((totalFixed / totalVulns) * 100) : 0;

  // ── Timer ────────────────────────────────────────────────────
  useEffect(() => {
    if (!initialState.endsAt) return;
    const endsAt = new Date(initialState.endsAt).getTime();
    const tick = () => setTimeLeft(Math.max(0, Math.floor((endsAt - Date.now()) / 1000)));
    tick();
    timerRef.current = setInterval(tick, 1000);
    return () => clearInterval(timerRef.current);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Poll match state every 2s ─────────────────────────────────
  useEffect(() => {
    if (matchEnded) return;
    const poll = async () => {
      try {
        const r = await fetch(`/api/raid/match/${matchId}`);
        if (!r.ok) return;
        const d = await r.json();
        if (d.teams) setTeams(d.teams);
        if (d.status && d.status !== "active") {
          setMatchStatus(d.status);
          setWinnerTeam(d.winnerTeam ?? null);
          clearInterval(pollRef.current);
          clearInterval(timerRef.current);
        }
        if (d.me) {
          setMyTotalScore(d.me.totalScore);
          setProgress(d.me.fileProgress ?? {});
        }
      } catch {}
    };
    poll();
    pollRef.current = setInterval(poll, 2000);
    return () => clearInterval(pollRef.current);
  }, [matchEnded]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Auto-end when timer hits 0 ────────────────────────────────
  useEffect(() => {
    if (timeLeft === 0 && !matchEnded) {
      clearInterval(timerRef.current);
      fetch(`/api/raid/match/${matchId}`)
        .then((r) => r.json())
        .then((d) => {
          setMatchStatus(d.status ?? "completed");
          setWinnerTeam(d.winnerTeam ?? null);
          if (d.teams) setTeams(d.teams);
          clearInterval(pollRef.current);
        })
        .catch(() => setMatchStatus("completed"));
    }
  }, [timeLeft]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Handlers ──────────────────────────────────────────────────
  function handleFileSelect(path) {
    setSelectedPath(path);
    setLastCheck(null);
    setActiveCat(null);
  }

  function handleCodeChange(code) {
    setEditedCodes((prev) => ({ ...prev, [selectedPath]: code }));
    setLastCheck(null);
  }

  async function handleCheck(catKey) {
    if (checking || !selectedFile || matchEnded) return;
    setChecking(true);
    setLastCheck(null);

    const alreadyFixed = fileProgress[catKey]?.fixed ?? [];

    try {
      const r = await fetch(`/api/raid/match/${matchId}/submit`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          filePath:     selectedPath,
          categoryKey:  catKey,
          userCode:     editedCodes[selectedPath],
          alreadyFixed,
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? "Check failed");

      const newlyFixed = data.fixed ?? [];
      const allFixed   = data.allFixed ?? [...new Set([...alreadyFixed, ...newlyFixed])];
      const added      = newlyFixed.length * PTS_PER_FIX;

      // Optimistic local update
      setProgress(data.fileProgress ?? ((prev) => {
        const next = { ...prev };
        if (!next[selectedPath]) next[selectedPath] = {};
        const prevCat = next[selectedPath][catKey] ?? { fixed: [], score: 0 };
        next[selectedPath][catKey] = { fixed: allFixed, score: prevCat.score + added };
        return next;
      }));
      setMyTotalScore(data.newScore ?? myTotalScore + added);
      setLastCheck({ category: catKey, added, newlyFixed, allFixed });
    } catch (err) {
      setLastCheck({ category: catKey, error: err.message });
    } finally {
      setChecking(false);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // END SCREEN
  // ─────────────────────────────────────────────────────────────
  if (matchEnded) {
    const myTeam    = teams.find((t) => t.teamId === myTeamId);
    const enemyTeam = teams.find((t) => t.teamId !== myTeamId);
    const weWon     = winnerTeam === myTeamId;
    const isDraw    = matchStatus === "completed" && winnerTeam === null;

    return (
      <div style={{
        flex: 1, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", gap: "28px",
        background: "#0d1a1f", fontFamily: "'Segoe UI','Aptos','Trebuchet MS',sans-serif",
      }}>
        <div style={{ fontSize: "52px" }}>
          {matchStatus === "abandoned" ? "🔌" : weWon ? "🏆" : isDraw ? "🤝" : "💀"}
        </div>
        <h1 style={{
          fontSize: "clamp(28px,5vw,52px)", fontWeight: 900,
          color: matchStatus === "abandoned" ? "#8ba0a6" : weWon ? "#3ddc84" : isDraw ? "#f5b942" : "#ff5c5c",
          letterSpacing: "-0.03em", margin: 0,
        }}>
          {matchStatus === "abandoned" ? "Match Abandoned"
            : weWon ? "Your Team Wins!"
            : isDraw ? "It's a Draw"
            : "Your Team Lost"}
        </h1>

        {/* Team score card */}
        <div style={{
          display: "flex", gap: "32px", alignItems: "center",
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(201,214,218,0.1)",
          borderRadius: "14px", padding: "22px 36px",
        }}>
          {[myTeam, enemyTeam].filter(Boolean).map((team, i) => {
            const color = TEAM_COLORS[team.teamId];
            const isWinner = winnerTeam === team.teamId;
            return (
              <>
                {i === 1 && <div style={{ fontSize: "20px", color: "#4a6570", fontWeight: 900 }}>VS</div>}
                <div key={team.teamId} style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "10px", fontWeight: 800, color, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "10px" }}>
                    Team {TEAM_LABELS[team.teamId]}{isWinner ? " 🏆" : ""}{team.teamId === myTeamId ? " (You)" : ""}
                  </div>
                  <div style={{ fontSize: "38px", fontWeight: 900, color: "#e8f0f3" }}>{team.totalScore}</div>
                  <div style={{ marginTop: "8px", display: "flex", flexDirection: "column", gap: "2px" }}>
                    {team.players.map((p) => (
                      <div key={p.clerkId} style={{ fontSize: "11px", color: "#8ba0a6" }}>
                        {p.displayName}: {p.totalScore} pts
                      </div>
                    ))}
                  </div>
                </div>
              </>
            );
          })}
        </div>

        <div style={{ display: "flex", gap: "12px" }}>
          <button
            onClick={() => { window.location.href = "/group-raid-page"; }}
            style={{
              background: "#f5b942", color: "#0d1a1f", border: "none",
              padding: "12px 32px", borderRadius: "8px",
              fontSize: "14px", fontWeight: 800, cursor: "pointer",
            }}
          >
            Raid Again →
          </button>
          <button
            onClick={() => { window.location.href = "/home"; }}
            style={{
              background: "transparent", color: "#8ba0a6",
              border: "1px solid rgba(201,214,218,0.15)",
              padding: "12px 24px", borderRadius: "8px",
              fontSize: "14px", fontWeight: 600, cursor: "pointer",
            }}
          >
            Home
          </button>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // MAIN ARENA
  // ─────────────────────────────────────────────────────────────
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, overflow: "hidden" }}>

      {/* ── Top bar ─────────────────────────────────────────── */}
      <div style={{
        display: "flex", alignItems: "center", gap: "12px",
        padding: "0 18px", height: "48px", flexShrink: 0,
        background: "#060c0f",
        borderBottom: "1px solid rgba(201,214,218,0.08)",
      }}>
        {/* Mode badge */}
        <span style={{
          fontSize: "10px", fontWeight: 800, color: "#f5b942",
          background: "rgba(245,185,66,0.12)", border: "1px solid rgba(245,185,66,0.3)",
          padding: "2px 10px", borderRadius: "999px", letterSpacing: "0.08em",
        }}>
          LIVE RAID
        </span>

        {/* Codebase */}
        <span style={{ fontSize: "12.5px", fontWeight: 700, color: "#e8f0f3" }}>{codebaseName}</span>
        <span style={{
          fontSize: "10px", fontWeight: 700, color: "#f5b942",
          background: "rgba(245,185,66,0.1)", border: "1px solid rgba(245,185,66,0.2)",
          padding: "1px 7px", borderRadius: "999px",
        }}>
          {files.length} FILES
        </span>

        {/* My score */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginLeft: "8px" }}>
          <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: TEAM_COLORS[myTeamId] }} />
          <span style={{ fontSize: "11.5px", color: "#8ba0a6" }}>{myName}</span>
          <span style={{ fontSize: "13px", fontWeight: 800, color: TEAM_COLORS[myTeamId], fontVariantNumeric: "tabular-nums" }}>
            {myTotalScore}pts
          </span>
        </div>

        <div style={{ flex: 1 }} />

        {/* Progress bar */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "10.5px", color: "#4a6570" }}>{totalFixed}/{totalVulns}</span>
          <div style={{ width: "120px", height: "4px", background: "rgba(201,214,218,0.07)", borderRadius: "2px", overflow: "hidden" }}>
            <div style={{
              height: "100%", width: `${pct}%`,
              background: "linear-gradient(90deg, #f5b942, #3ddc84)",
              borderRadius: "2px", transition: "width 0.4s ease",
            }} />
          </div>
          <span style={{ fontSize: "10.5px", color: "#8ba0a6" }}>{pct}%</span>
        </div>

        {/* Timer */}
        <div style={{ display: "flex", alignItems: "center", gap: "5px", marginLeft: "4px" }}>
          <span style={{ fontSize: "11px", color: "#4a6570" }}>⏱</span>
          <span style={{
            fontSize: "14px", fontWeight: 900, fontVariantNumeric: "tabular-nums",
            color: timeLeft !== null && timeLeft <= 10 ? "#ff5c5c" : "#f5b942",
          }}>
            {timeLeft !== null ? formatTime(timeLeft) : "—"}
          </span>
        </div>

        <span style={{ fontSize: "10px", color: "#2a3a40" }}>#{matchId}</span>
      </div>

      {/* ── Three-column layout ──────────────────────────────── */}
      <div style={{ flex: 1, display: "flex", minHeight: 0, overflow: "hidden" }}>

        {/* Left: File tree */}
        <div style={{
          width: "240px", flexShrink: 0, background: "#060c0f",
          borderRight: "1px solid rgba(201,214,218,0.07)",
          display: "flex", flexDirection: "column", overflow: "hidden",
        }}>
          <div style={{
            padding: "9px 13px 7px",
            borderBottom: "1px solid rgba(201,214,218,0.06)",
            flexShrink: 0, display: "flex", alignItems: "center", gap: "6px",
          }}>
            <span style={{ fontSize: "10px", fontWeight: 700, color: "#4a6570", letterSpacing: "0.07em", textTransform: "uppercase" }}>
              Explorer
            </span>
            <span style={{ fontSize: "10px", color: "#4a6570", marginLeft: "auto" }}>{files.length} files</span>
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "5px 0" }}>
            <FolderBranch node={fileTree} selectedPath={selectedPath} onSelect={handleFileSelect} progress={progress} />
          </div>
        </div>

        {/* Center: Ace Editor */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, minHeight: 0, background: "#1e1e1e" }}>
          <div style={{
            padding: "5px 14px", background: "#0d1117",
            borderBottom: "1px solid rgba(201,214,218,0.07)",
            display: "flex", alignItems: "center", gap: "10px", flexShrink: 0,
          }}>
            <span style={{ fontSize: "13px" }}>📄</span>
            <span style={{ fontSize: "12px", fontWeight: 600, color: "#e8f0f3", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {selectedPath ?? "No file selected"}
            </span>
            <span style={{
              fontSize: "10px", fontWeight: 700, color: "#22d3ee",
              background: "rgba(34,211,238,0.1)", border: "1px solid rgba(34,211,238,0.2)",
              padding: "2px 7px", borderRadius: "4px", flexShrink: 0,
            }}>
              C++
            </span>
            <span style={{ fontSize: "10.5px", color: "#4a6570", flexShrink: 0 }}>
              {fileCatsDone}/5 done · {fileScore} pts
            </span>
          </div>

          <div style={{ flex: 1, minHeight: 0 }}>
            {selectedPath ? (
              <AceEditor
                key={selectedPath}
                mode="c_cpp"
                theme="monokai"
                value={editedCodes[selectedPath] ?? ""}
                onChange={handleCodeChange}
                width="100%"
                height="100%"
                fontSize={13}
                showPrintMargin={false}
                wrapEnabled={false}
                setOptions={{ useWorker: false, tabSize: 4, enableLiveAutocompletion: false }}
                style={{ lineHeight: "1.7" }}
              />
            ) : (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#4a6570", fontSize: "14px" }}>
                Select a file from the explorer
              </div>
            )}
          </div>
        </div>

        {/* Right: Scoreboard + Vulnerability hunter */}
        <div style={{
          width: "360px", flexShrink: 0, background: "#0a1419",
          borderLeft: "1px solid rgba(201,214,218,0.07)",
          display: "flex", flexDirection: "column", overflow: "hidden",
        }}>
          {/* Live scoreboard */}
          <Scoreboard
            teams={teams}
            myTeamId={myTeamId}
            timeLeft={timeLeft}
            matchStatus={matchStatus}
            winnerTeam={winnerTeam}
          />

          {/* Vulnerability hunter header */}
          <div style={{
            padding: "9px 14px", borderBottom: "1px solid rgba(201,214,218,0.07)", flexShrink: 0,
          }}>
            <div style={{ fontSize: "11.5px", fontWeight: 700, color: "#e8f0f3" }}>Vulnerability Hunter</div>
            <div style={{ fontSize: "10.5px", color: "#4a6570", marginTop: "1px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {selectedPath ? selectedPath.split("/").pop() : "Select a file to begin"}
            </div>
          </div>

          {/* Category accordion */}
          <div style={{ flex: 1, overflowY: "auto" }}>
            {!selectedFile ? (
              <div style={{ padding: "36px 18px", textAlign: "center", color: "#4a6570", fontSize: "12.5px" }}>
                Select a file from the explorer to see its vulnerabilities.
              </div>
            ) : (
              CATS.map((cat) => {
                const vulns = selectedFile.Vulnerabilities?.[cat.key] ?? [];
                return (
                  <CategoryRow
                    key={cat.key}
                    cat={cat}
                    vulns={vulns}
                    catProg={fileProgress[cat.key]}
                    isActive={activeCategory === cat.key}
                    onToggle={() => setActiveCat((prev) => (prev === cat.key ? null : cat.key))}
                    onCheck={() => handleCheck(cat.key)}
                    checking={checking && activeCategory === cat.key}
                    lastCheck={lastCheck}
                  />
                );
              })
            )}
          </div>

          {/* File score footer */}
          {lastCheck?.error ? (
            <div style={{
              padding: "9px 14px", flexShrink: 0,
              background: "rgba(245,90,90,0.07)",
              borderTop: "1px solid rgba(245,90,90,0.18)",
              fontSize: "11px", color: "#ff8080",
            }}>
              ✗ {lastCheck.error}
            </div>
          ) : (
            <div style={{
              padding: "10px 14px", flexShrink: 0,
              borderTop: "1px solid rgba(201,214,218,0.07)",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <span style={{ fontSize: "10.5px", color: "#4a6570" }}>
                {selectedPath?.split("/").pop() ?? "File"} score
              </span>
              <span style={{ fontSize: "13px", fontWeight: 800, color: "#f5b942" }}>
                {fileScore} pts
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
