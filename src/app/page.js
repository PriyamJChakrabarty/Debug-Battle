import Link from "next/link";

import SiteNav from "@/components/site-nav";
import HeartbeatClient from "@/components/heartbeat";
import OnlinePlayersWidget from "@/components/online-players";
import ReturnToDuelButton from "@/components/return-to-duel";

const MODES = [
  {
    id: "duel",
    name: "1v1 Duel",
    desc: "Go head-to-head against another engineer. Hunt bugs across five categories - first to fix them all wins.",
    badge: "Live",
    badgeColor: "#3ddc84",
    href: "/duel",
    available: true,
  },
  {
    id: "team",
    name: "Team Match",
    desc: "Squad up and divide categories between teammates. Cooperate to out-debug the opposing squad.",
    badge: "Coming Soon",
    badgeColor: "#f5b942",
    href: null,
    available: false,
  },
  {
    id: "royale",
    name: "Battle Royale",
    desc: "Up to 8 engineers, one codebase. Every round the lowest scorer is eliminated until one Bug Slayer remains.",
    badge: "Coming Soon",
    badgeColor: "#f5b942",
    href: null,
    available: false,
  },
];

const CATEGORIES = [
  { name: "Security", icon: "🔒", color: "#ff5c5c", desc: "Auth flaws, plaintext credentials, injection vectors" },
  { name: "Performance", icon: "⚡", color: "#f5b942", desc: "O(n^2) loops, unnecessary copies, redundant work" },
  { name: "Scalability", icon: "📈", color: "#3ddc84", desc: "Linear lookups, in-memory bloat, flat-file storage" },
  { name: "Ethics", icon: "⚖️", color: "#22d3ee", desc: "Demographic bias, PII exposure, missing consent" },
  { name: "Maintainability", icon: "🔧", color: "#a78bfa", desc: "Hardcoded rules, global state, missing error handling" },
];

const BG = {
  root: {
    minHeight: "100vh",
    background: "#0d1a1f",
    color: "#c9d6da",
    fontFamily: "'Segoe UI', 'Aptos', 'Trebuchet MS', sans-serif",
    backgroundImage: [
      "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(61,220,132,0.08), transparent 70%)",
      "linear-gradient(rgba(201,214,218,0.025) 1px, transparent 1px)",
      "linear-gradient(90deg, rgba(201,214,218,0.025) 1px, transparent 1px)",
    ].join(", "),
    backgroundSize: "100% 100%, 44px 44px, 44px 44px",
  },
};

export default function HomePage() {
  return (
    <div style={BG.root}>
      <HeartbeatClient />
      <SiteNav active="/" />

      <section style={{ padding: "110px 40px 80px", maxWidth: "1100px", margin: "0 auto", textAlign: "center" }}>
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
            marginBottom: "32px",
          }}
        >
          <span
            style={{
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              background: "#3ddc84",
              display: "inline-block",
            }}
          />
          Competitive Code Review Arena
        </div>

        <h1
          style={{
            fontSize: "clamp(38px, 6vw, 72px)",
            fontWeight: 900,
            lineHeight: 1.07,
            color: "#e8f0f3",
            letterSpacing: "-0.03em",
            margin: "0 0 22px",
          }}
        >
          Debug AI.{" "}
          <span style={{ color: "#3ddc84", textShadow: "0 0 28px rgba(61,220,132,0.45)" }}>
            Become a Bug Slayer.
          </span>
        </h1>

        <p style={{ fontSize: "18px", color: "#8ba0a6", maxWidth: "580px", margin: "0 auto 44px", lineHeight: 1.7 }}>
          A competitive arena where engineers hunt security flaws, performance bottlenecks,
          and ethical violations in real code - category by category, round by round.
        </p>

        <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
          <Link
            href="/live-battle"
            style={{
              background: "#3ddc84",
              color: "#0d1a1f",
              textDecoration: "none",
              padding: "14px 34px",
              borderRadius: "8px",
              fontSize: "15px",
              fontWeight: 800,
              letterSpacing: "-0.01em",
              boxShadow: "0 0 40px rgba(61,220,132,0.28)",
            }}
          >
            Start a Duel →
          </Link>
          <ReturnToDuelButton />
          <Link
            href="/duel"
            style={{
              background: "transparent",
              color: "#c9d6da",
              textDecoration: "none",
              border: "1px solid rgba(201,214,218,0.18)",
              padding: "14px 34px",
              borderRadius: "8px",
              fontSize: "15px",
              fontWeight: 600,
            }}
          >
            Solo Practice
          </Link>
        </div>

        <OnlinePlayersWidget />

        <div
          style={{
            margin: "72px auto 0",
            maxWidth: "680px",
            textAlign: "left",
            background: "#080f12",
            border: "1px solid rgba(61,220,132,0.18)",
            borderRadius: "12px",
            overflow: "hidden",
            boxShadow: "0 0 0 1px rgba(61,220,132,0.08), 0 0 80px rgba(61,220,132,0.07)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "10px 16px",
              borderBottom: "1px solid rgba(201,214,218,0.07)",
              background: "#0d1a1f",
            }}
          >
            <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#ff5c5c" }} />
            <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#f5b942" }} />
            <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#3ddc84" }} />
            <span style={{ marginLeft: "10px", fontSize: "11px", color: "#8ba0a6" }}>UserManager.cpp - spot the bugs</span>
          </div>
          <pre
            style={{
              margin: 0,
              padding: "22px 24px",
              fontSize: "12.5px",
              lineHeight: 1.8,
              color: "#c9d6da",
              fontFamily: "'Cascadia Code','Fira Code','Consolas',monospace",
              overflowX: "auto",
            }}
          >
            {`bool login(string username, string password) {
  for (`}
            <span style={{ color: "#ff5c5c", fontWeight: 600 }}>{`auto user : users`}</span>
            {`) {`}
            <span style={{ color: "#8ba0a6" }}>{`  // copies every object`}</span>
            {`
    if (user.username == username &&
        `}
            <span style={{ color: "#ff5c5c", fontWeight: 600 }}>{`user.password == password`}</span>
            {`) {`}
            <span style={{ color: "#8ba0a6" }}>{`  // plaintext`}</span>
            {`
      return true;
    }
  }
}`}
          </pre>
        </div>
      </section>

      <section id="modes" style={{ padding: "80px 40px", maxWidth: "1100px", margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: "52px" }}>
          <h2
            style={{
              fontSize: "clamp(26px, 4vw, 42px)",
              fontWeight: 800,
              color: "#e8f0f3",
              letterSpacing: "-0.025em",
              margin: "0 0 12px",
            }}
          >
            Pick Your Arena
          </h2>
          <p style={{ fontSize: "15px", color: "#8ba0a6" }}>
            From solo duels to eight-way battle royales - a format for every skill level.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(290px, 1fr))", gap: "20px" }}>
          {MODES.map((mode) => (
            <div
              key={mode.id}
              style={{
                background: "#0e191f",
                border: `1px solid ${mode.available ? "rgba(61,220,132,0.22)" : "rgba(201,214,218,0.07)"}`,
                borderRadius: "12px",
                padding: "28px 26px",
                opacity: mode.available ? 1 : 0.6,
                boxShadow: mode.available ? "0 0 40px rgba(61,220,132,0.06)" : "none",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "14px" }}>
                <h3 style={{ fontSize: "18px", fontWeight: 700, color: "#e8f0f3", margin: 0 }}>{mode.name}</h3>
                <span
                  style={{
                    fontSize: "10px",
                    fontWeight: 700,
                    padding: "3px 9px",
                    borderRadius: "999px",
                    background: `${mode.badgeColor}1a`,
                    color: mode.badgeColor,
                    border: `1px solid ${mode.badgeColor}44`,
                    whiteSpace: "nowrap",
                  }}
                >
                  {mode.badge}
                </span>
              </div>
              <p style={{ fontSize: "13px", color: "#8ba0a6", lineHeight: 1.65, margin: "0 0 26px", flex: 1 }}>
                {mode.desc}
              </p>
              {mode.available ? (
                <Link
                  href={mode.href}
                  style={{
                    background: "#3ddc84",
                    color: "#0d1a1f",
                    textDecoration: "none",
                    padding: "10px 20px",
                    borderRadius: "6px",
                    fontSize: "13px",
                    fontWeight: 700,
                    alignSelf: "flex-start",
                  }}
                >
                  Play Now →
                </Link>
              ) : (
                <span
                  style={{
                    background: "rgba(201,214,218,0.05)",
                    color: "#8ba0a6",
                    border: "1px solid rgba(201,214,218,0.1)",
                    padding: "10px 20px",
                    borderRadius: "6px",
                    fontSize: "13px",
                    fontWeight: 600,
                    alignSelf: "flex-start",
                  }}
                >
                  Coming Soon
                </span>
              )}
            </div>
          ))}
        </div>
      </section>

      <section id="categories" style={{ padding: "80px 40px", maxWidth: "1100px", margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: "52px" }}>
          <h2
            style={{
              fontSize: "clamp(26px, 4vw, 42px)",
              fontWeight: 800,
              color: "#e8f0f3",
              letterSpacing: "-0.025em",
              margin: "0 0 12px",
            }}
          >
            Five Battle Fronts
          </h2>
          <p style={{ fontSize: "15px", color: "#8ba0a6" }}>
            Every code file hides vulnerabilities across all five dimensions. Hunt them all to max your score.
          </p>
        </div>

        <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", justifyContent: "center" }}>
          {CATEGORIES.map((cat) => (
            <div
              key={cat.name}
              style={{
                background: "#0e191f",
                border: `1px solid ${cat.color}28`,
                borderRadius: "10px",
                padding: "22px 20px",
                flex: "1 1 175px",
                maxWidth: "210px",
              }}
            >
              <div style={{ fontSize: "26px", marginBottom: "10px" }}>{cat.icon}</div>
              <div style={{ fontSize: "13px", fontWeight: 700, color: cat.color, marginBottom: "6px" }}>{cat.name}</div>
              <div style={{ fontSize: "11.5px", color: "#8ba0a6", lineHeight: 1.55 }}>{cat.desc}</div>
            </div>
          ))}
        </div>
      </section>

      <section style={{ padding: "0 40px 100px", maxWidth: "1100px", margin: "0 auto" }}>
        <div
          style={{
            background: "linear-gradient(135deg, rgba(61,220,132,0.06), rgba(34,211,238,0.03))",
            border: "1px solid rgba(61,220,132,0.14)",
            borderRadius: "16px",
            padding: "64px 40px",
            textAlign: "center",
            boxShadow: "0 0 80px rgba(61,220,132,0.05)",
          }}
        >
          <h2
            style={{
              fontSize: "clamp(24px, 4vw, 38px)",
              fontWeight: 800,
              color: "#e8f0f3",
              letterSpacing: "-0.025em",
              margin: "0 0 14px",
            }}
          >
            Ready to Prove Yourself?
          </h2>
          <p style={{ fontSize: "15px", color: "#8ba0a6", margin: "0 0 32px" }}>
            One file. Five categories. How many bugs can you find before time runs out?
          </p>
          <Link
            href="/duel"
            style={{
              background: "#3ddc84",
              color: "#0d1a1f",
              textDecoration: "none",
              padding: "14px 40px",
              borderRadius: "8px",
              fontSize: "15px",
              fontWeight: 800,
              boxShadow: "0 0 40px rgba(61,220,132,0.28)",
            }}
          >
            Enter the Arena →
          </Link>
        </div>
      </section>

      <footer
        style={{
          borderTop: "1px solid rgba(201,214,218,0.07)",
          padding: "24px 40px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "2px" }}>
          <span style={{ fontSize: "14px", fontWeight: 900, color: "#3ddc84", letterSpacing: "-0.02em" }}>Debug</span>
          <span style={{ fontSize: "14px", fontWeight: 900, color: "#e8f0f3", letterSpacing: "-0.02em" }}>Battle</span>
        </div>
        <span style={{ fontSize: "12px", color: "#4a6570" }}>Powered by Groq - Code Faceoff Arena</span>
      </footer>
    </div>
  );
}
