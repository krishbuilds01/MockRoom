"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import type { SessionRecord } from "@/lib/interviewer";

function Score({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-neutral-800 p-4">
      <div className="text-xs text-neutral-400">{label}</div>
      <div className="mt-1 text-2xl font-bold">{value}<span className="text-sm text-neutral-500">/10</span></div>
      <div className="mt-2 h-2 rounded bg-neutral-800"><div className="h-2 rounded bg-white" style={{ width: `${value * 10}%` }} /></div>
    </div>
  );
}

export default function FeedbackPage() {
  const [rec, setRec] = useState<SessionRecord | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("interviewai-last");
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (raw) setRec(JSON.parse(raw));
    } catch {}
    setLoaded(true);
  }, []);

  if (!loaded) return <div className="p-8 text-sm text-neutral-400">Loading feedback...</div>;
  if (!rec) {
    return (
      <main className="mx-auto max-w-2xl px-5 py-16 text-center">
        <h1 className="text-2xl font-bold">No interview found</h1>
        <p className="mt-3 text-sm text-neutral-400">Finish an interview first and your feedback will appear here.</p>
        <Link href="/" className="mt-6 inline-block rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-black">Go home</Link>
      </main>
    );
  }

  const diffNote =
    rec.difficulty === "Hard"
      ? "Hard mode: scoring expects optimisation, trade-off reasoning and minimal hints."
      : rec.difficulty === "Easy"
        ? "Easy mode: hints were available and follow-ups were relaxed."
        : "Mid mode: standard interview expectations, partial hints only.";

  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl px-5 py-10">
      <h1 className="text-3xl font-bold">Interview Feedback</h1>
      <p className="mt-2 text-sm text-neutral-400">
        {rec.type === "technical" ? rec.problemTitle : "Live AI Interview"} - {rec.difficulty} - {new Date(rec.date).toLocaleString()} - {Math.floor(rec.timeSec / 60)} min {rec.timeSec % 60} sec
      </p>
      <p className="mt-1 text-xs text-neutral-500">{diffNote}</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Score label="Problem Solving" value={rec.scores.problemSolving} />
        <Score label="Coding" value={rec.scores.coding} />
        <Score label="Communication" value={rec.scores.communication} />
        <Score label="Complexity Analysis" value={rec.scores.complexity} />
      </div>

      {rec.type === "technical" && (
        <div className="mt-6 rounded-xl border border-neutral-800 p-5 text-sm">
          Tests passed: <span className="font-semibold">{rec.testsPassed} / {rec.totalTests}</span>
          <span className="ml-4 text-neutral-400">Code runs: {rec.runs}</span>
          <span className="ml-4 text-neutral-400">Language: {rec.language}</span>
        </div>
      )}

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-neutral-800 p-5">
          <h2 className="font-semibold">Strengths</h2>
          {rec.scores.strengths.length ? <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-neutral-300">{rec.scores.strengths.map((s) => <li key={s}>{s}</li>)}</ul> : <p className="mt-3 text-sm text-neutral-400">No clear strengths recorded this session.</p>}
        </div>
        <div className="rounded-xl border border-neutral-800 p-5">
          <h2 className="font-semibold">Improvements</h2>
          {rec.scores.improvements.length ? <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-neutral-300">{rec.scores.improvements.map((s) => <li key={s}>{s}</li>)}</ul> : <p className="mt-3 text-sm text-neutral-400">Nothing major. Try a harder difficulty next.</p>}
        </div>
      </div>

      {rec.code && (
        <div className="mt-6 rounded-xl border border-neutral-800 p-5">
          <h2 className="font-semibold">Your final code</h2>
          <pre className="mt-3 max-h-80 overflow-auto rounded-lg bg-neutral-900 p-4 font-mono text-xs leading-5">{rec.code}</pre>
        </div>
      )}

      <div className="mt-6 rounded-xl border border-neutral-800 p-5">
        <h2 className="font-semibold">Transcript summary</h2>
        <div className="mt-3 max-h-80 space-y-2 overflow-y-auto">
          {rec.transcript.slice(-14).map((m, i) => (
            <div key={i} className="text-sm leading-6 text-neutral-300"><span className="font-medium text-neutral-500">{m.role === "ai" ? "AI: " : "You: "}</span>{m.text}</div>
          ))}
          {rec.transcript.length === 0 && <p className="text-sm text-neutral-400">No transcript recorded.</p>}
        </div>
      </div>

      <div className="mt-8 flex gap-3">
        <Link href="/" className="rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-black">Practice again</Link>
        <Link href="/" className="rounded-lg border border-neutral-700 px-5 py-2.5 text-sm">View history on home</Link>
      </div>
    </main>
  );
}
