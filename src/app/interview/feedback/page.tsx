"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { getProblemById, langLabel, problems } from "@/lib/problems";
import { overallScore, type SessionRecord } from "@/lib/interviewer";
import { phaseNotes, recommendNext, weakAreas } from "@/lib/feedback";

function Score({ label, value }: { label: string; value: number }) {
  return (
    <div className="card card-pad">
      <div className="text-xs font-medium text-stone-600">{label}</div>
      <div className="tnum mt-1.5 font-display text-3xl font-semibold leading-none tracking-tight">
        {value}
        <span className="text-sm font-medium text-stone-600">/10</span>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-line">
        <div className={`h-full rounded-full ${value >= 7 ? "bg-emerald-600" : value >= 4 ? "bg-accent" : "bg-red-400"}`} style={{ width: `${value * 10}%` }} />
      </div>
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
  const [showTranscript, setShowTranscript] = useState(false);
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

  if (!loaded) return <div className="p-8 text-sm text-stone-600">Loading feedback...</div>;
  if (!rec) {
    return (
      <main className="mx-auto max-w-2xl px-5 py-16 text-center">
        <h1 className="text-2xl font-bold tracking-tight">No interview found</h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-stone-600">Finish an interview first and your feedback will appear here. If you just finished one in another tab, history on the home page still has your past sessions.</p>
        <Link href="/" className="btn btn-primary mt-6">Go home</Link>
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
    <main className="mx-auto flex min-h-dvh w-full max-w-4xl flex-col px-5 py-5">
      <nav className="flex shrink-0 items-center justify-between border-b border-line pb-3">
        <div className="flex items-center gap-2.5">
          <span className="avatar" style={{ width: "2rem", height: "2rem", fontSize: "0.8rem" }}>A</span>
          <span className="font-display text-lg font-semibold tracking-tight">InterviewAI</span>
        </div>
        <Link href="/" className="text-sm text-stone-600 hover:text-stone-900">Home</Link>
      </nav>

      <div className="mt-4 flex shrink-0 flex-wrap items-center gap-2.5">
        <h1 className="font-display text-4xl font-semibold tracking-tight">Interview Feedback</h1>
        <span className={`badge ${rec.difficulty === "Easy" ? "badge-easy" : rec.difficulty === "Hard" ? "badge-hard" : "badge-mid"}`}>{rec.difficulty}</span>
        {rec.incomplete && <span className="badge badge-mid">Incomplete session</span>}
      </div>
      <p className="mt-2 text-sm text-stone-600">
        {`${rec.type === "technical" ? rec.problemTitle || "Technical interview" : "Live AI Interview"} · ${new Date(rec.date).toLocaleString()}`}
      </p>
      {rec.incomplete && (
        <p className="mt-3 rounded-lg border border-amber-300 bg-amber-50 px-3.5 py-2.5 text-xs leading-5 text-amber-800" role="note">
          This session was left before it finished, so it was saved as incomplete. Scores reflect only what actually happened in the room.
        </p>
      )}
      <p className="mt-3 text-xs leading-5 text-stone-600">{diffNote}</p>
      <p className="mt-1 text-xs leading-5 text-stone-600">{timeNote}</p>

      <div className="card mt-4 flex shrink-0 flex-wrap items-center justify-between gap-4 p-5">
        <div>
          <div className="text-xs font-medium text-stone-600">Overall score</div>
          <div className="tnum mt-1 font-display text-5xl font-semibold leading-none tracking-tight">
            {overall}
            <span className="text-lg font-medium text-stone-600">/10</span>
          </div>
          <div className="mt-2 text-xs text-stone-600">Strict scale. A 10 is rare and has to be earned on every axis.</div>
        </div>
        {rec.type === "technical" && (
          <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
            <div className="text-stone-600">Tests passed</div>
            <div className="text-right font-semibold">{rec.testsPassed} / {rec.totalTests}</div>
            <div className="text-stone-600">Code runs</div>
            <div className="text-right font-semibold">{rec.runs}</div>
            <div className="text-stone-600">Language</div>
            <div className="text-right font-semibold">{langLabel(rec.language)}</div>
            <div className="text-stone-600">Hints used</div>
            <div className="text-right font-semibold">{rec.hintsUsed ?? 0}</div>
          </div>
        )}
      </div>

      <div className="mt-4 grid shrink-0 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Score label="Problem Solving" value={rec.scores.problemSolving} />
        <Score label={rec.type === "technical" ? "Coding" : "Technical Depth"} value={rec.scores.coding} />
        <Score label="Communication" value={rec.scores.communication} />
        <Score label="Complexity Analysis" value={rec.scores.complexity} />
      </div>

      <div className="mt-4 grid shrink-0 gap-4 md:grid-cols-2">
        <div className="card card-pad">
          <h2 className="text-sm font-semibold">Strengths</h2>
          {rec.scores.strengths.length ? <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-stone-700">{rec.scores.strengths.map((s) => <li key={s}>{s}</li>)}</ul> : <p className="mt-3 text-sm leading-6 text-stone-600">No clear strengths recorded this session. That is the honest read: rebuild from the phase notes below.</p>}
        </div>
        <div className="card card-pad">
          <h2 className="text-sm font-semibold">Improvements</h2>
          {rec.scores.improvements.length ? <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-stone-700">{rec.scores.improvements.map((s) => <li key={s}>{s}</li>)}</ul> : <p className="mt-3 text-sm leading-6 text-stone-600">Nothing major recorded. Try a harder difficulty next.</p>}
        </div>
      </div>

      <div className="mt-4 space-y-4">
      {notes.length > 0 && (
        <div className="card card-pad">
          <h2 className="text-sm font-semibold">What happened, phase by phase</h2>
          <div className="mt-4 space-y-5">
            {notes.map((n) => (
              <div key={n.phase} className={`border-l-2 pl-4 ${n.flag ? "border-amber-400" : "border-line2"}`}>
                <div className="text-sm font-semibold">{n.phase}</div>
                <p className="mt-1 break-words text-sm leading-6 text-stone-700">{n.did}</p>
                <p className={`mt-1 text-sm leading-6 ${n.flag ? "text-amber-800" : "text-stone-700"}`}>{n.flag ? "Watch out: " : "Note: "}{n.weak}</p>
                <p className="mt-1 text-sm leading-6 text-stone-600">Strong version: {n.strong}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {techProblem && (
        <div className="card card-pad">
          <h2 className="text-sm font-semibold">Model pointers for {techProblem.title} <span className="font-normal text-stone-600">(shown only after the interview)</span></h2>
          <p className="mt-3 text-sm leading-6 text-stone-700"><span className="text-stone-600">Intended pattern: </span>{techProblem.pattern}</p>
          <p className="mt-2 text-sm leading-6 text-stone-700"><span className="text-stone-600">Complexity: </span>{techProblem.complexity}</p>
          <div className="mt-4 grid shrink-0 gap-4 md:grid-cols-2">
            <div>
              <div className="text-sm font-medium">Key points</div>
              <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-6 text-stone-700">{techProblem.keyPoints.map((k) => <li key={k}>{k}</li>)}</ul>
            </div>
            <div>
              <div className="text-sm font-medium">Edge cases that matter</div>
              <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-6 text-stone-700">{techProblem.edgeCases.map((k) => <li key={k}>{k}</li>)}</ul>
            </div>
          </div>
        </div>
      )}

      <div className="card card-pad">
        <h2 className="text-sm font-semibold">Your weak areas</h2>
        {weak.length ? (
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-stone-700">{weak.map((w) => <li key={w}>{w}</li>)}</ul>
        ) : (
          <p className="mt-3 text-sm leading-6 text-stone-600">No weak area stood out in the recorded signals. Raise the difficulty and go again.</p>
        )}
        <h3 className="mt-6 text-sm font-semibold">Do these next</h3>
        <div className="mt-3 space-y-2">
          {next.map((n) => (
            <div key={n.problemId + n.reason} className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-line bg-panel2 px-4 py-3">
              <span className="text-sm font-semibold">{n.title}</span>
              <span className={`badge ${n.difficulty === "Easy" ? "badge-easy" : n.difficulty === "Hard" ? "badge-hard" : "badge-mid"}`}>{n.difficulty}</span>
              <span className="min-w-0 flex-1 text-sm leading-5 text-stone-600">{n.reason}</span>
              <Link href={n.href} className="btn btn-primary btn-sm">Start</Link>
            </div>
          ))}
        </div>
      </div>

      {rec.code && (
        <div className="card card-pad">
          <h2 className="text-sm font-semibold">Your final code</h2>
          <pre className="mt-3 max-h-80 overflow-auto rounded-lg border border-line bg-panel2 p-4 font-mono text-xs leading-5">{rec.code}</pre>
        </div>
      )}

      <div className="card card-pad">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Transcript</h2>
          <button type="button" onClick={() => setShowTranscript((v) => !v)} className="btn btn-ghost btn-sm" aria-expanded={showTranscript}>{showTranscript ? "Hide transcript" : "View transcript"}</button>
        </div>
        {showTranscript && (
        <div className="mt-4 max-h-96 space-y-2.5 overflow-y-auto">
          {rec.transcript.slice(-20).map((m, i) => (
            <div key={i} className={`max-w-[85%] break-words rounded-xl px-3.5 py-2.5 text-sm leading-6 ${m.role === "ai" ? "border border-line bg-panel2 text-stone-900" : "ml-auto bg-stone-900 text-stone-50"}`}>
              <div className="mb-0.5 text-xs font-semibold uppercase tracking-wide opacity-60">{m.role === "ai" ? "Alex" : "You"}</div>
              {m.text}
            </div>
          ))}
          {rec.transcript.length === 0 && <p className="text-sm text-stone-600">No transcript recorded.</p>}
        </div>
        )}
      </div>
      </div>

      <div className="mt-4 flex shrink-0 flex-wrap gap-3">
        <Link href="/" className="btn btn-accent">Practice again</Link>
        <Link href="/" className="btn btn-ghost">See your progress on home</Link>
      </div>
    </main>
  );
}
