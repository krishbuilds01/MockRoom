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
    <main className="mx-auto min-h-screen w-full max-w-5xl px-5 py-10">
      <header className="flex items-center justify-between">
        <div className="text-lg font-semibold tracking-tight">InterviewAI</div>
        <div className="text-xs text-neutral-400">AI Interview Practice Platform</div>
      </header>

      <section className="mt-12">
        <h1 className="text-4xl font-bold leading-tight">Practice a real interview.<br />With an AI that watches, listens and pushes back.</h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-neutral-400">
          One on one live interview with camera and a human sounding AI voice, or a technical coding interview with a LeetCode style editor.
          The interviewer is strict: it asks for your approach, watches your code as you write it, challenges vague answers, records hints, and scores you honestly.
          Every session ends with feedback that teaches: phase by phase notes, your weak areas, and the exact problems to do next.
        </p>
      </section>

      <section className="mt-10 grid gap-4 md:grid-cols-2">
        <button type="button" onClick={() => setType("general")} aria-pressed={type === "general"} className={`rounded-2xl border p-5 text-left ${type === "general" ? "border-white bg-neutral-900" : "border-neutral-800 bg-neutral-950 hover:border-neutral-600"}`}>
          <div className="font-semibold">Live AI Interview</div>
          <p className="mt-2 text-sm leading-6 text-neutral-400">General, behavioural and conceptual questions. Speak your answers, the AI follows up and pushes when answers are thin.</p>
        </button>
        <button type="button" onClick={() => setType("technical")} aria-pressed={type === "technical"} className={`rounded-2xl border p-5 text-left ${type === "technical" ? "border-white bg-neutral-900" : "border-neutral-800 bg-neutral-950 hover:border-neutral-600"}`}>
          <div className="font-semibold">Technical / Coding Interview</div>
          <p className="mt-2 text-sm leading-6 text-neutral-400">Live coding environment, run code against test cases, camera on. The AI watches your code and asks counter questions while you write.</p>
        </button>
      </section>

      <section className="mt-8 rounded-2xl border border-neutral-800 p-5">
        <div className="text-sm font-medium text-neutral-300">Difficulty</div>
        <div className="mt-3 flex flex-wrap gap-2">
          {["Easy", "Mid", "Hard"].map((d) => (
            <button type="button" key={d} onClick={() => setDifficulty(d)} aria-pressed={difficulty === d} className={`rounded-full px-5 py-2 text-sm ${difficulty === d ? "bg-white text-black" : "border border-neutral-700 text-neutral-300"}`}>{d}</button>
          ))}
        </div>
        <p className="mt-3 text-xs text-neutral-500">{diffInfo[difficulty]}</p>

        {type === "technical" && (
          <>
            <div className="mt-6 text-sm font-medium text-neutral-300">Topic</div>
            <div className="mt-3 flex flex-wrap gap-2">
              {topics.map((t) => (
                <button type="button" key={t} onClick={() => setTopic(t)} aria-pressed={topic === t} className={`rounded-full px-4 py-2 text-sm ${topic === t ? "bg-white text-black" : "border border-neutral-700 text-neutral-300"}`}>{t}</button>
              ))}
            </div>
            <p className="mt-3 text-xs text-neutral-500">Topics with a ready problem today: HashMap, Strings, Arrays, Two Pointers. If a topic has no problem at your exact difficulty yet, the room tells you clearly at the top and serves the closest one, scored at its real level. Trees and DP fall back the same way.</p>
          </>
        )}

        <button type="button" onClick={start} className="mt-8 w-full rounded-xl bg-white py-3 font-semibold text-black hover:bg-neutral-200">Start Interview</button>
        <p className="mt-3 text-center text-xs text-neutral-500">Works best in Chrome. Allow camera and mic when asked. No sign up needed.</p>
      </section>

      {history.length > 0 && (
        <section className="mt-10">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-lg font-semibold">Your progress</h2>
            {latestOverall !== null && (
              <div className="text-xs text-neutral-400">
                Latest overall: <span className="font-semibold text-neutral-100">{latestOverall}/10</span>
                {trendDelta !== null && (
                  <span className={trendDelta >= 0 ? "ml-2 text-green-400" : "ml-2 text-red-400"}>
                    {trendDelta >= 0 ? "+" : ""}{trendDelta} vs previous session
                  </span>
                )}
              </div>
            )}
          </div>
          {chronological.length > 1 && (
            <div className="mt-4 flex h-20 items-end gap-1.5 rounded-xl border border-neutral-800 p-4" aria-hidden="true">
              {chronological.slice(-14).map((h) => {
                const o = overallScore(h.scores);
                return <div key={h.id} title={`${o}/10`} className="min-w-2 flex-1 rounded-t bg-neutral-200" style={{ height: `${Math.max(8, o * 10)}%` }} />;
              })}
            </div>
          )}
          <div className="mt-4 space-y-3">
            {history.map((h) => (
              <div key={h.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-neutral-800 p-4 text-sm">
                <div className="min-w-0">
                  <div className="truncate font-medium">
                    {h.type === "technical" ? h.problemTitle || "Technical interview" : "Live AI Interview"}
                    {h.incomplete && <span className="ml-2 rounded-full border border-amber-700 px-2 py-0.5 text-[10px] font-medium text-amber-300">Incomplete</span>}
                  </div>
                  <div className="text-xs text-neutral-500">{`${new Date(h.date).toLocaleString()} · ${h.difficulty} · ${Math.round(h.timeSec / 60)} min${h.targetSec ? ` of ${Math.round(h.targetSec / 60)} target` : ""}`}</div>
                </div>
                <div className="text-xs text-neutral-400">
                  {h.type === "technical" && <span className="mr-3">Tests {h.testsPassed}/{h.totalTests}</span>}
                  {(h.hintsUsed ?? 0) > 0 && <span className="mr-3">Hints {h.hintsUsed}</span>}
                  <span className="mr-3">Overall <span className="font-semibold text-neutral-100">{overallScore(h.scores)}/10</span></span>
                  <span>Problem Solving {h.scores.problemSolving}/10</span>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-neutral-500">History is stored only in this browser. Open your latest feedback right after a session from the interview room.</p>
        </section>
      )}

      <footer className="mt-14 border-t border-neutral-900 pt-6 text-xs leading-5 text-neutral-600">
        InterviewAI - strict AI interview practice. Code runs via the Judge0 API. The interviewer uses Gemini when a key is configured, with a local engine as fallback, and a Gemini voice with a browser voice fallback. Built to prepare you for the real thing: specific feedback, weak areas, and a next problem every time.
        <span className="mt-2 block">Tip: the feedback page link works right after each session. <Link href="/interview/feedback" className="underline hover:text-neutral-400">Open latest feedback</Link></span>
      </footer>
    </main>
  );
}
