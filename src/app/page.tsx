"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { topics } from "@/lib/problems";
import type { SessionRecord } from "@/lib/interviewer";

const diffInfo: Record<string, string> = {
  Easy: "Basic questions, direct hints, relaxed follow-ups, suggested 20 min",
  Mid: "Real interview level, deeper follow-ups, partial hints, suggested 30 min",
  Hard: "Strict interviewer, minimal hints, pushes on trade-offs and optimisation, suggested 45 min",
};

export default function Home() {
  const router = useRouter();
  const [type, setType] = useState<"general" | "technical">("technical");
  const [difficulty, setDifficulty] = useState("Mid");
  const [topic, setTopic] = useState("HashMap");
  const [history, setHistory] = useState<SessionRecord[]>([]);

  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHistory(JSON.parse(localStorage.getItem("interviewai-history") || "[]"));
    } catch {}
  }, []);

  function start() {
    const q = new URLSearchParams({ difficulty, topic });
    router.push(type === "technical" ? `/interview/technical?${q}` : `/interview/general?${q}`);
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-5 py-10">
      <header className="flex items-center justify-between">
        <div className="text-lg font-semibold tracking-tight">InterviewAI</div>
        <div className="text-xs text-neutral-400">AI Interview Practice Platform</div>
      </header>

      <section className="mt-12">
        <h1 className="text-4xl font-bold leading-tight">Practice a real interview.<br />With an AI that watches, listens and pushes back.</h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-neutral-400">
          One on one live interview with camera and voice, or a technical coding interview with a LeetCode style editor.
          The AI asks for your approach, watches your code as you write it, asks why you added or removed lines, and gives you a scored report at the end.
        </p>
      </section>

      <section className="mt-10 grid gap-4 md:grid-cols-2">
        <button onClick={() => setType("general")} className={`rounded-2xl border p-5 text-left ${type === "general" ? "border-white bg-neutral-900" : "border-neutral-800 bg-neutral-950 hover:border-neutral-600"}`}>
          <div className="font-semibold">Live AI Interview</div>
          <p className="mt-2 text-sm leading-6 text-neutral-400">General, behavioural and conceptual questions. Speak your answers, the AI follows up like a real interviewer.</p>
        </button>
        <button onClick={() => setType("technical")} className={`rounded-2xl border p-5 text-left ${type === "technical" ? "border-white bg-neutral-900" : "border-neutral-800 bg-neutral-950 hover:border-neutral-600"}`}>
          <div className="font-semibold">Technical / Coding Interview</div>
          <p className="mt-2 text-sm leading-6 text-neutral-400">Live coding environment, run code against test cases, camera on. The AI watches your code and asks counter questions while you write.</p>
        </button>
      </section>

      <section className="mt-8 rounded-2xl border border-neutral-800 p-5">
        <div className="text-sm font-medium text-neutral-300">Difficulty</div>
        <div className="mt-3 flex flex-wrap gap-2">
          {["Easy", "Mid", "Hard"].map((d) => (
            <button key={d} onClick={() => setDifficulty(d)} className={`rounded-full px-5 py-2 text-sm ${difficulty === d ? "bg-white text-black" : "border border-neutral-700 text-neutral-300"}`}>{d}</button>
          ))}
        </div>
        <p className="mt-3 text-xs text-neutral-500">{diffInfo[difficulty]}</p>

        {type === "technical" && (
          <>
            <div className="mt-6 text-sm font-medium text-neutral-300">Topic</div>
            <div className="mt-3 flex flex-wrap gap-2">
              {topics.map((t) => (
                <button key={t} onClick={() => setTopic(t)} className={`rounded-full px-4 py-2 text-sm ${topic === t ? "bg-white text-black" : "border border-neutral-700 text-neutral-300"}`}>{t}</button>
              ))}
            </div>
            <p className="mt-3 text-xs text-neutral-500">Topics with a ready problem today: HashMap, Strings, Arrays, Two Pointers. Trees and DP fall back to the closest available problem.</p>
          </>
        )}

        <button onClick={start} className="mt-8 w-full rounded-xl bg-white py-3 font-semibold text-black hover:bg-neutral-200">Start Interview</button>
        <p className="mt-3 text-center text-xs text-neutral-500">Works best in Chrome. Allow camera and mic when asked. No sign up and no API key needed for the MVP.</p>
      </section>

      {history.length > 0 && (
        <section className="mt-10">
          <h2 className="text-lg font-semibold">Past interviews</h2>
          <div className="mt-4 space-y-3">
            {history.map((h) => (
              <div key={h.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-neutral-800 p-4 text-sm">
                <div>
                  <div className="font-medium">{h.type === "technical" ? h.problemTitle || "Technical interview" : "Live AI Interview"}</div>
                  <div className="text-xs text-neutral-500">{new Date(h.date).toLocaleString()} - {h.difficulty} - {Math.round(h.timeSec / 60)} min</div>
                </div>
                <div className="text-xs text-neutral-400">
                  {h.type === "technical" && <span className="mr-3">Tests {h.testsPassed}/{h.totalTests}</span>}
                  <span>Problem Solving {h.scores.problemSolving}/10</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <footer className="mt-14 border-t border-neutral-900 pt-6 text-xs text-neutral-600">
        InterviewAI - local MVP. Code runs via the Judge0 API. The interviewer runs on a local engine, with an optional AI key for smarter replies.
      </footer>
    </main>
  );
}
