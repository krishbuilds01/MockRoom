"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { getProblemById, problems } from "@/lib/problems";
import { overallScore, type SessionRecord } from "@/lib/interviewer";
import { phaseNotes, recommendNext, weakAreas } from "@/lib/feedback";

function Score({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-neutral-800 p-4">
      <div className="text-xs text-neutral-400">{label}</div>
      <div className="mt-1 text-2xl font-bold">{value}<span className="text-sm text-neutral-500">/10</span></div>
      <div className="mt-2 h-2 rounded bg-neutral-800"><div className="h-2 rounded bg-white" style={{ width: `${value * 10}%` }} /></div>
    </div>
  );
}

function validRecord(raw: string | null): SessionRecord | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as SessionRecord;
    if (!parsed || typeof parsed !== "object" || !parsed.scores || typeof parsed.scores.problemSolving !== "number") return null;
    if (!Array.isArray(parsed.transcript)) parsed.transcript = [];
    if (!Array.isArray(parsed.scores.strengths)) parsed.scores.strengths = [];
    if (!Array.isArray(parsed.scores.improvements)) parsed.scores.improvements = [];
    return parsed;
  } catch {
    return null;
  }
}

export default function FeedbackPage() {
  const [rec, setRec] = useState<SessionRecord | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let raw: string | null = null;
    try {
      raw = sessionStorage.getItem("interviewai-last");
    } catch {}
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRec(validRecord(raw));
    setLoaded(true);
  }, []);

  if (!loaded) return <div className="p-8 text-sm text-neutral-400">Loading feedback...</div>;
  if (!rec) {
    return (
      <main className="mx-auto max-w-2xl px-5 py-16 text-center">
        <h1 className="text-2xl font-bold">No interview found</h1>
        <p className="mt-3 text-sm text-neutral-400">Finish an interview first and your feedback will appear here. If you just finished one in another tab, history on the home page still has your past sessions.</p>
        <Link href="/" className="mt-6 inline-block rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-black">Go home</Link>
      </main>
    );
  }

  const techProblem =
    rec.type === "technical"
      ? (getProblemById(rec.problemId) ?? problems.find((p) => p.title === rec.problemTitle))
      : undefined;
  const notes = phaseNotes(rec, techProblem);
  const weak = weakAreas(rec, techProblem);
  const next = recommendNext(rec, techProblem);
  const overall = overallScore(rec.scores);
  const target = rec.targetSec;
  const timeNote = target
    ? rec.timeSec <= target
      ? `You finished in ${Math.floor(rec.timeSec / 60)} min ${rec.timeSec % 60} sec, inside the ${Math.round(target / 60)} min target for this level.`
      : `You took ${Math.floor(rec.timeSec / 60)} min ${rec.timeSec % 60} sec against a ${Math.round(target / 60)} min target. Overruns cost marks in real interviews, where the clock is shared with other questions.`
    : `Session length: ${Math.floor(rec.timeSec / 60)} min ${rec.timeSec % 60} sec.`;

  const diffNote =
    rec.difficulty === "Hard"
      ? "Hard mode: no hints, brute force approaches rejected, and scoring expects optimisation plus trade-off reasoning."
      : rec.difficulty === "Easy"
        ? "Easy mode: one small hint is allowed, but thin answers are still pushed back and scored down."
        : "Mid mode: strict real interview expectations. Hints only when asked, and they are recorded.";

  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl px-5 py-10">
      <Link href="/" className="text-xs text-neutral-500 hover:text-neutral-300">Back to home</Link>
      <h1 className="mt-2 text-3xl font-bold">Interview Feedback</h1>
      <p className="mt-2 text-sm text-neutral-400">
        {`${rec.type === "technical" ? rec.problemTitle || "Technical interview" : "Live AI Interview"} · ${rec.difficulty} · ${new Date(rec.date).toLocaleString()}`}
      </p>
      {rec.incomplete && (
        <p className="mt-2 rounded-lg border border-amber-800 bg-amber-950/30 px-3 py-2 text-xs leading-5 text-amber-200">
          This session was left before it finished, so it was saved as incomplete. Scores reflect only what actually happened in the room.
        </p>
      )}
      <p className="mt-1 text-xs text-neutral-500">{diffNote}</p>
      <p className="mt-1 text-xs text-neutral-500">{timeNote}</p>

      <div className="mt-6 rounded-xl border border-neutral-800 p-5">
        <div className="text-xs text-neutral-400">Overall score (strict scale - a 10 is rare and has to be earned on every axis)</div>
        <div className="mt-1 text-4xl font-bold">{overall}<span className="text-base text-neutral-500">/10</span></div>
        {rec.type === "technical" && (
          <div className="mt-2 text-sm text-neutral-400">
            Tests passed: <span className="font-semibold text-neutral-200">{rec.testsPassed} / {rec.totalTests}</span>
            <span className="ml-4">Code runs: {rec.runs}</span>
            <span className="ml-4">Language: {rec.language || "javascript"}</span>
            <span className="ml-4">Hints used: {rec.hintsUsed ?? 0}</span>
          </div>
        )}
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Score label="Problem Solving" value={rec.scores.problemSolving} />
        <Score label={rec.type === "technical" ? "Coding" : "Technical Depth"} value={rec.scores.coding} />
        <Score label="Communication" value={rec.scores.communication} />
        <Score label="Complexity Analysis" value={rec.scores.complexity} />
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-neutral-800 p-5">
          <h2 className="font-semibold">Strengths</h2>
          {rec.scores.strengths.length ? <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-neutral-300">{rec.scores.strengths.map((s) => <li key={s}>{s}</li>)}</ul> : <p className="mt-3 text-sm text-neutral-400">No clear strengths recorded this session. That is the honest read: rebuild from the phase notes below.</p>}
        </div>
        <div className="rounded-xl border border-neutral-800 p-5">
          <h2 className="font-semibold">Improvements</h2>
          {rec.scores.improvements.length ? <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-neutral-300">{rec.scores.improvements.map((s) => <li key={s}>{s}</li>)}</ul> : <p className="mt-3 text-sm text-neutral-400">Nothing major recorded. Try a harder difficulty next.</p>}
        </div>
      </div>

      {notes.length > 0 && (
        <div className="mt-6 rounded-xl border border-neutral-800 p-5">
          <h2 className="font-semibold">What happened, phase by phase</h2>
          <div className="mt-4 space-y-5">
            {notes.map((n) => (
              <div key={n.phase} className="border-l-2 border-neutral-800 pl-4">
                <div className="text-sm font-semibold">{n.phase}</div>
                <p className="mt-1 break-words text-sm leading-6 text-neutral-300">{n.did}</p>
                <p className={`mt-1 text-sm leading-6 ${n.flag ? "text-amber-200/90" : "text-neutral-300"}`}>{n.flag ? "Watch out: " : "Note: "}{n.weak}</p>
                <p className="mt-1 text-sm leading-6 text-neutral-400">Strong version: {n.strong}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {techProblem && (
        <div className="mt-6 rounded-xl border border-neutral-800 p-5">
          <h2 className="font-semibold">Model pointers for {techProblem.title} (shown only after the interview)</h2>
          <p className="mt-3 text-sm leading-6 text-neutral-300"><span className="text-neutral-500">Intended pattern: </span>{techProblem.pattern}</p>
          <p className="mt-2 text-sm leading-6 text-neutral-300"><span className="text-neutral-500">Complexity: </span>{techProblem.complexity}</p>
          <div className="mt-3 grid gap-4 md:grid-cols-2">
            <div>
              <div className="text-sm font-medium">Key points</div>
              <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-6 text-neutral-300">{techProblem.keyPoints.map((k) => <li key={k}>{k}</li>)}</ul>
            </div>
            <div>
              <div className="text-sm font-medium">Edge cases that matter</div>
              <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-6 text-neutral-300">{techProblem.edgeCases.map((k) => <li key={k}>{k}</li>)}</ul>
            </div>
          </div>
        </div>
      )}

      <div className="mt-6 rounded-xl border border-neutral-800 p-5">
        <h2 className="font-semibold">Your weak areas</h2>
        {weak.length ? (
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-neutral-300">{weak.map((w) => <li key={w}>{w}</li>)}</ul>
        ) : (
          <p className="mt-3 text-sm text-neutral-400">No weak area stood out in the recorded signals. Raise the difficulty and go again.</p>
        )}
        <h3 className="mt-5 font-semibold">Do these next</h3>
        <div className="mt-3 space-y-3">
          {next.map((n) => (
            <Link key={n.problemId + n.reason} href={n.href} className="block rounded-lg border border-neutral-800 p-4 hover:border-neutral-600">
              <div className="text-sm font-medium">{n.title} <span className="ml-2 rounded-full border border-neutral-700 px-2 py-0.5 text-[11px] text-neutral-400">{n.difficulty} - {n.topic}</span></div>
              <p className="mt-1 text-sm leading-6 text-neutral-400">{n.reason}</p>
              <span className="mt-2 inline-block text-xs font-medium text-white">Start this interview</span>
            </Link>
          ))}
        </div>
      </div>

      {rec.code && (
        <div className="mt-6 rounded-xl border border-neutral-800 p-5">
          <h2 className="font-semibold">Your final code</h2>
          <pre className="mt-3 max-h-80 overflow-auto rounded-lg bg-neutral-900 p-4 font-mono text-xs leading-5">{rec.code}</pre>
        </div>
      )}

      <div className="mt-6 rounded-xl border border-neutral-800 p-5">
        <h2 className="font-semibold">Transcript</h2>
        <div className="mt-3 max-h-80 space-y-2 overflow-y-auto">
          {rec.transcript.slice(-20).map((m, i) => (
            <div key={i} className="break-words text-sm leading-6 text-neutral-300"><span className="font-medium text-neutral-500">{m.role === "ai" ? "AI: " : "You: "}</span>{m.text}</div>
          ))}
          {rec.transcript.length === 0 && <p className="text-sm text-neutral-400">No transcript recorded.</p>}
        </div>
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/" className="rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-black">Practice again</Link>
        <Link href="/" className="rounded-lg border border-neutral-700 px-5 py-2.5 text-sm">See your progress on home</Link>
      </div>
    </main>
  );
}
