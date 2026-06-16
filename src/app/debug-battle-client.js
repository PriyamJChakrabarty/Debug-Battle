"use client";

import { startTransition, useState } from "react";

const assistantPrompt =
  "Type how you would fix this error. We will keep your debugging notes here.";

function createInitialMessages() {
  return [
    {
      id: "assistant-intro",
      role: "assistant",
      content: assistantPrompt,
    },
  ];
}

function createUserMessage(content) {
  return {
    id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role: "user",
    content,
  };
}

export default function DebugBattleClient({ initialPayload }) {
  const [challenge, setChallenge] = useState(initialPayload.challenge);
  const [messages, setMessages] = useState(createInitialMessages);
  const [draft, setDraft] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [source, setSource] = useState(initialPayload.source || "fallback");
  const [notice, setNotice] = useState(initialPayload.message || "");
  const [loadError, setLoadError] = useState("");

  async function loadChallenge() {
    setRefreshing(true);
    setLoadError("");

    try {
      const response = await fetch("/api/debug-battle", {
        cache: "no-store",
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.error || "Could not generate a debugging challenge.");
      }

      startTransition(() => {
        setChallenge(payload.challenge);
        setSource(payload.source || "fallback");
        setNotice(payload.message || "");
        setMessages(createInitialMessages());
        setDraft("");
      });
    } catch (error) {
      setLoadError(
        error instanceof Error
          ? error.message
          : "Could not generate a debugging challenge.",
      );
    } finally {
      setRefreshing(false);
    }
  }

  function handleSubmit(event) {
    event.preventDefault();

    const trimmedDraft = draft.trim();

    if (!trimmedDraft) {
      return;
    }

    setMessages((currentMessages) => [
      ...currentMessages,
      createUserMessage(trimmedDraft),
    ]);
    setDraft("");
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.22),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(14,165,233,0.2),_transparent_28%),linear-gradient(180deg,_#fffaf0_0%,_#f5f7fb_55%,_#eef4ff_100%)] px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <section className="overflow-hidden rounded-[32px] border border-slate-200/80 bg-white/88 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl space-y-4">
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <span className="rounded-full border border-amber-300 bg-amber-100 px-3 py-1 font-medium text-amber-950">
                  AI Debug Arena
                </span>
                <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 font-medium text-slate-700">
                  {source === "groq" ? "Live Groq challenge" : "Fallback challenge"}
                </span>
              </div>
              <div className="space-y-3">
                <h1 className="max-w-3xl font-sans text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
                  Hard DSA prompt, broken C++ code, and the error you need to beat.
                </h1>
                <p className="max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
                  Each round gives you a LeetCode-style problem, intentionally faulty
                  C++ code, and the exact error output. Use the chatbox to write how
                  you would fix it.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={loadChallenge}
              disabled={refreshing}
              className="inline-flex h-12 items-center justify-center rounded-full bg-slate-950 px-6 font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {refreshing ? "Generating..." : "New Challenge"}
            </button>
          </div>
          {notice ? (
            <p className="mt-5 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm leading-6 text-sky-900">
              {notice}
            </p>
          ) : null}
          {loadError ? (
            <p className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-900">
              {loadError}
            </p>
          ) : null}
        </section>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
          <div className="space-y-6">
            <article className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-medium uppercase tracking-[0.24em] text-slate-500">
                    Problem Statement
                  </p>
                  <h2 className="mt-3 text-2xl font-semibold text-slate-950">
                    {challenge.title}
                  </h2>
                </div>
                <span className="w-fit rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
                  {challenge.difficulty}
                </span>
              </div>
              <div className="mt-5 rounded-[24px] bg-slate-50 p-5 text-sm leading-7 text-slate-700 sm:text-base">
                <pre className="whitespace-pre-wrap font-sans">
                  {challenge.statement}
                </pre>
              </div>
            </article>

            <article className="rounded-[28px] border border-slate-200 bg-[#08111f] p-6 text-slate-100 shadow-[0_20px_60px_rgba(8,17,31,0.24)]">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium uppercase tracking-[0.24em] text-sky-200/80">
                    Broken C++ Submission
                  </p>
                  <p className="mt-2 text-sm text-slate-300">
                    This snippet is intentionally broken and should surface the error
                    shown on the right.
                  </p>
                </div>
                <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300 sm:flex">
                  <span className="h-2 w-2 rounded-full bg-rose-400" />
                  <span className="h-2 w-2 rounded-full bg-amber-400" />
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                </div>
              </div>
              <pre className="mt-5 overflow-x-auto rounded-[24px] border border-white/10 bg-black/30 p-5 font-mono text-sm leading-7 text-sky-100">
                <code>{challenge.code}</code>
              </pre>
            </article>
          </div>

          <div className="space-y-6">
            <article className="rounded-[28px] border border-rose-200 bg-[#17080c] p-6 text-rose-50 shadow-[0_20px_60px_rgba(127,29,29,0.2)]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium uppercase tracking-[0.24em] text-rose-200/80">
                    Error Output
                  </p>
                  <p className="mt-2 text-sm text-rose-100/80">
                    Read the terminal trace before proposing the fix.
                  </p>
                </div>
                <span className="rounded-full border border-rose-400/20 bg-rose-400/10 px-3 py-1 text-xs font-medium text-rose-100">
                  {challenge.errorLabel}
                </span>
              </div>
              <pre className="mt-5 overflow-x-auto rounded-[24px] border border-rose-300/15 bg-black/25 p-5 font-mono text-sm leading-7 text-rose-100">
                <code>{challenge.error}</code>
              </pre>
            </article>

            <article className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium uppercase tracking-[0.24em] text-slate-500">
                    Resolution Chatbox
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Write the steps you would take to resolve the bug.
                  </p>
                </div>
                <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                  {messages.length - 1} note{messages.length === 2 ? "" : "s"}
                </span>
              </div>

              <div className="mt-5 h-[280px] space-y-3 overflow-y-auto rounded-[24px] bg-slate-50 p-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`max-w-[92%] rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm ${
                      message.role === "assistant"
                        ? "bg-white text-slate-700"
                        : "ml-auto bg-slate-950 text-white"
                    }`}
                  >
                    {message.content}
                  </div>
                ))}
              </div>

              <form onSubmit={handleSubmit} className="mt-4 space-y-3">
                <label className="block">
                  <span className="sr-only">Describe your fix</span>
                  <textarea
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    placeholder="Example: The comparator is missing a return path, so I would..."
                    className="min-h-28 w-full rounded-[24px] border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                  />
                </label>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs leading-5 text-slate-500">
                    Keep your fix concise and focused on the root cause.
                  </p>
                  <button
                    type="submit"
                    disabled={!draft.trim()}
                    className="inline-flex h-11 items-center justify-center rounded-full border border-slate-950 px-5 text-sm font-medium text-slate-950 transition hover:bg-slate-950 hover:text-white disabled:cursor-not-allowed disabled:border-slate-300 disabled:text-slate-300"
                  >
                    Save Note
                  </button>
                </div>
              </form>
            </article>
          </div>
        </section>
      </div>
    </main>
  );
}
