"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { topics } from "@/lib/problems";
import { overallScore, type SessionRecord } from "@/lib/interviewer";

const diffInfo: Record<string, string> = {
  Easy: "Foundations, strict about specifics, one small hint allowed, target about 20 min",
  Mid: "Real interview level, deep follow-ups, hints only when asked and recorded, target about 30 min",
  Hard: "Very strict interviewer, no hints, brute force gets sent back, pushes on trade-offs and optimisation, target about 45 min",
};

function loadHistory(): SessionRecord[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem("interviewai-history") || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (h): h is SessionRecord =>
        !!h &&
        typeof h === "object" &&
        typeof (h as SessionRecord).date === "string" &&
        !!(h as SessionRecord).scores &&
        typeof (h as SessionRecord).scores.problemSolving === "number" &&
        typeof (h as SessionRecord).scores.coding === "number"
    );
  } catch {
    return [];
  }
}

const features = [
  {
    title: "Live voice interview",
    text: "Alex, your interviewer, speaks with a natural Gemini Live voice and listens while you answer. No typing your way through a voice round.",
  },
  {
    title: "Code watching AI",
    text: "In the technical room the interviewer reads your code as you write it, including deletions, and stops you to explain the lines it picks.",
  },
  {
    title: "Strict, honest feedback",
    text: "Thin answers get pushed back in the room. After it, you get scores, phase by phase notes, weak areas and the exact problems to do next.",
  },
];

const steps = [
  { n: "1", title: "Set up", text: "Pick a room, a difficulty and a topic. Allow camera and mic." },
  { n: "2", title: "Interview", text: "Introduction, clarifying questions, approach, coding, dry run, complexity, then your questions." },
  { n: "3", title: "Feedback", text: "Scores with reasons, weak areas, and a practice plan you can act on the same day." },
];

export default function Home() {
  const router = useRouter();
  const [type, setType] = useState<"general" | "technical">("technical");
  const [difficulty, setDifficulty] = useState("Mid");
  const [topic, setTopic] = useState("HashMap");
  const [history, setHistory] = useState<SessionRecord[]>([]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHistory(loadHistory());
  }, []);

  function start() {
    if (type === "technical") {
      const q = new URLSearchParams({ difficulty, topic });
      router.push(`/interview/technical?${q}`);
    } else {
      const q = new URLSearchParams({ difficulty });
      router.push(`/interview/general?${q}`);
    }
  }

  const chronological = [...history].reverse();
  const latestOverall = history.length ? overallScore(history[0].scores) : null;
  const previousOverall = history.length > 1 ? overallScore(history[1].scores) : null;
  const trendDelta = latestOverall !== null && previousOverall !== null ? Math.round((latestOverall - previousOverall) * 10) / 10 : null;

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-5">
      <nav className="flex items-center justify-between border-b border-line py-4">
        <div className="flex items-center gap-2.5">
          <span className="avatar" style={{ width: "2rem", height: "2rem", fontSize: "0.8rem" }}>A</span>
          <span className="text-base font-semibold tracking-tight">InterviewAI</span>
        </div>
        <div className="flex items-center gap-5 text-sm text-zinc-400">
          <a href="#how" className="hidden hover:text-zinc-100 sm:block">How it works</a>
          <a href="#progress" className="hidden hover:text-zinc-100 sm:block">Your progress</a>
          <Link href="/interview/feedback" className="hover:text-zinc-100">Latest feedback</Link>
        </div>
      </nav>

      <section className="grid items-start gap-10 pb-4 pt-14 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <span className="badge badge-live">
            <span className="dot dot-pulse bg-emerald-400" />
            Live voice, powered by Gemini Live
          </span>
          <h1 className="mt-5 text-4xl font-bold leading-[1.12] tracking-tight sm:text-5xl">
            Practice a real interview.
            <br />
            <span className="text-zinc-400">With an AI that pushes back.</span>
          </h1>
          <p className="mt-5 max-w-xl text-[15px] leading-7 text-zinc-400">
            One on one with Alex, a strict AI interviewer who talks and listens like a person, watches your code as you write it,
            challenges vague answers, and records every hint. Every session ends with feedback that teaches: phase by phase notes,
            your weak areas, and the exact problems to do next.
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {features.map((f) => (
              <div key={f.title} className="card p-4">
                <div className="text-sm font-semibold">{f.title}</div>
                <p className="mt-1.5 text-[13px] leading-5 text-zinc-400">{f.text}</p>
              </div>
            ))}
          </div>
        </div>

        <section className="card p-6 shadow-2xl shadow-black/40" aria-label="Start an interview">
          <div className="text-sm font-semibold">Start an interview</div>
          <div className="mt-4 grid gap-3">
            <button type="button" onClick={() => setType("technical")} aria-pressed={type === "technical"} className={`rounded-xl border p-4 text-left transition ${type === "technical" ? "border-accent bg-accent-soft" : "border-line bg-panel2 hover:border-line2"}`}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">Technical / Coding</span>
                <span className="badge">Monaco editor</span>
              </div>
              <p className="mt-1.5 text-[13px] leading-5 text-zinc-400">LeetCode style room. Run and submit against real tests while Alex watches your code live.</p>
            </button>
            <button type="button" onClick={() => setType("general")} aria-pressed={type === "general"} className={`rounded-xl border p-4 text-left transition ${type === "general" ? "border-accent bg-accent-soft" : "border-line bg-panel2 hover:border-line2"}`}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">Live AI Interview</span>
                <span className="badge">Voice first</span>
              </div>
              <p className="mt-1.5 text-[13px] leading-5 text-zinc-400">Behavioural and conceptual questions, spoken answers, strict follow-ups when answers are thin.</p>
            </button>
          </div>

          <div className="mt-6 text-[13px] font-medium text-zinc-300">Difficulty</div>
          <div className="mt-2.5 flex flex-wrap gap-2" role="group" aria-label="Difficulty">
            {["Easy", "Mid", "Hard"].map((d) => (
              <button type="button" key={d} onClick={() => setDifficulty(d)} aria-pressed={difficulty === d} className={difficulty === d ? "btn btn-primary btn-sm" : "btn btn-ghost btn-sm"}>{d}</button>
            ))}
          </div>
          <p className="mt-2.5 text-xs leading-5 text-zinc-500">{diffInfo[difficulty]}</p>

          {type === "technical" && (
            <>
              <div className="mt-6 text-[13px] font-medium text-zinc-300">Topic</div>
              <div className="mt-2.5 flex flex-wrap gap-2" role="group" aria-label="Topic">
                {topics.map((t) => (
                  <button type="button" key={t} onClick={() => setTopic(t)} aria-pressed={topic === t} className={topic === t ? "btn btn-primary btn-sm" : "btn btn-ghost btn-sm"}>{t}</button>
                ))}
              </div>
              <p className="mt-2.5 text-xs leading-5 text-zinc-500">If a topic has no problem at your exact difficulty yet, the room tells you clearly at the top and serves the closest one, scored at its real level.</p>
            </>
          )}

          <button type="button" onClick={start} className="btn btn-accent mt-7 w-full py-3 text-[15px] font-semibold">Start Interview</button>
          <p className="mt-3 text-center text-xs text-zinc-500">Works best in Chrome. Allow camera and mic when asked. No sign up needed.</p>
        </section>
      </section>

      <section id="how" className="mt-14">
        <h2 className="text-lg font-semibold tracking-tight">How it works</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {steps.map((s) => (
            <div key={s.n} className="card p-5">
              <span className="badge badge-accent">Step {s.n}</span>
              <div className="mt-3 text-sm font-semibold">{s.title}</div>
              <p className="mt-1.5 text-[13px] leading-5 text-zinc-400">{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      {history.length > 0 && (
        <section id="progress" className="mt-14">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-lg font-semibold tracking-tight">Your progress</h2>
            {latestOverall !== null && (
              <div className="text-xs text-zinc-400">
                {`Latest overall: `}
                <span className="font-semibold text-zinc-100">{latestOverall}/10</span>
                {trendDelta !== null && (
                  <span className={trendDelta >= 0 ? "ml-2 font-medium text-emerald-400" : "ml-2 font-medium text-red-400"}>
                    {`${trendDelta >= 0 ? "+" : ""}${trendDelta} vs previous session`}
                  </span>
                )}
              </div>
            )}
          </div>
          {chronological.length > 1 && (
            <div className="card mt-4 flex h-24 items-end gap-1.5 p-4" aria-hidden="true">
              {chronological.slice(-14).map((h) => {
                const o = overallScore(h.scores);
                return <div key={h.id} title={`${o}/10`} className="min-w-2 flex-1 rounded-t bg-accent/80" style={{ height: `${Math.max(8, o * 10)}%` }} />;
              })}
            </div>
          )}
          <div className="card mt-4 divide-y divide-line">
            {history.map((h) => (
              <div key={h.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 text-sm">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 truncate font-medium">
                    <span className="truncate">{h.type === "technical" ? h.problemTitle || "Technical interview" : "Live AI Interview"}</span>
                    <span className={`badge ${h.difficulty === "Easy" ? "badge-easy" : h.difficulty === "Hard" ? "badge-hard" : "badge-mid"}`}>{h.difficulty}</span>
                    {h.incomplete && <span className="badge badge-mid">Incomplete</span>}
                  </div>
                  <div className="mt-0.5 text-xs text-zinc-500">{`${new Date(h.date).toLocaleString()} · ${Math.round(h.timeSec / 60)} min${h.targetSec ? ` of ${Math.round(h.targetSec / 60)} target` : ""}`}</div>
                </div>
                <div className="flex items-center gap-4 text-xs text-zinc-400">
                  {h.type === "technical" && (
                    <span>Tests <span className="font-semibold text-zinc-100">{h.testsPassed}/{h.totalTests}</span></span>
                  )}
                  {(h.hintsUsed ?? 0) > 0 && <span>Hints <span className="font-semibold text-zinc-100">{h.hintsUsed}</span></span>}
                  <span>Problem Solving <span className="font-semibold text-zinc-100">{h.scores.problemSolving}/10</span></span>
                  <span>Overall <span className="font-semibold text-zinc-100">{overallScore(h.scores)}/10</span></span>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-zinc-500">History is stored only in this browser.</p>
        </section>
      )}

      <footer className="mb-10 mt-16 border-t border-line pt-6 text-xs leading-5 text-zinc-500">
        InterviewAI, strict AI interview practice. Code runs via the Judge0 API. The interviewer speaks with Gemini Live when available,
        with Gemini text replies, a Gemini voice and a local engine as fallbacks.
        <span className="mt-2 block">After a session, your feedback is ready here: <Link href="/interview/feedback" className="text-zinc-300 underline underline-offset-2 hover:text-zinc-100">open latest feedback</Link>.</span>
      </footer>
    </main>
  );
}
