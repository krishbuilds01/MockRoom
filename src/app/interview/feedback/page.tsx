"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { getProblemById, langLabel, problems } from "@/lib/problems";
import { overallScore, type SessionRecord } from "@/lib/interviewer";
import { companyVerdict, phaseNotes, recommendNext, weakAreas } from "@/lib/feedback";
import { deleteRecording, loadRecording } from "@/lib/recording";
import { loadHistory } from "@/lib/analytics";
import { scoreBarClass } from "@/lib/scoreColor";
import Logo from "@/components/Logo";

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

function axisNote(rec: SessionRecord, axis: "problemSolving" | "coding" | "communication" | "complexity"): string | null {
  const hints = rec.hintsUsed ?? 0;
  if (axis === "problemSolving") {
    if (rec.type === "technical") return `${rec.testsPassed} of ${rec.totalTests} tests passed.`;
    const qa = rec.qaPairs ?? [];
    const answered = qa.filter((p) => p.answer).length;
    return qa.length ? `${answered} of ${qa.length} questions answered.` : `${rec.aiAnswered ?? 0} follow-ups answered.`;
  }
  if (axis === "coding") {
    if (rec.type === "technical") return `${rec.runs} code run${rec.runs === 1 ? "" : "s"}, ${hints} hint${hints === 1 ? "" : "s"} used.`;
    const thin = rec.thinAnswers ?? 0;
    return thin ? `${thin} answer${thin === 1 ? " was" : "s were"} marked thin.` : null;
  }
  if (axis === "communication") {
    if ((rec.aiAsked ?? 0) === 0) return null;
    return `${rec.aiAnswered ?? 0} of ${rec.aiAsked ?? 0} interviewer follow-ups answered.`;
  }
  if (rec.type === "technical") {
    return rec.complexityCorrect === true
      ? "Your stated complexity matched the expected answer."
      : rec.complexityCorrect === false
        ? "Your stated complexity did not match the expected answer."
        : "The complexity round was not completed.";
  }
  return null;
}

export default function FeedbackPage() {
  const [rec, setRec] = useState<SessionRecord | null>(null);
  const [showTranscript, setShowTranscript] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [recUrl, setRecUrl] = useState<string | null>(null);

  useEffect(() => {
    let raw: string | null = null;
    try {
      raw = sessionStorage.getItem("interviewai-last");
    } catch {}
    let record = validRecord(raw);
    if (!record) {
      const history = loadHistory();
      if (history.length) record = validRecord(JSON.stringify(history[0]));
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRec(record);
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!rec) return;
    let alive = true;
    loadRecording(rec.id).then((blob) => {
      if (alive && blob) setRecUrl(URL.createObjectURL(blob));
    });
    return () => {
      alive = false;
    };
  }, [rec]);

  useEffect(() => {
    return () => {
      if (recUrl) URL.revokeObjectURL(recUrl);
    };
  }, [recUrl]);

  async function removeRecording() {
    if (rec) await deleteRecording(rec.id);
    setRecUrl(null);
  }

  if (!loaded)
    return (
      <main className="flex h-dvh items-center justify-center px-5">
        <p className="text-sm text-neutral-600">Loading feedback...</p>
      </main>
    );
  if (!rec) {
    return (
      <main className="mx-auto flex h-dvh w-full max-w-2xl flex-col items-center justify-center overflow-hidden px-5 text-center">
        <h1 className="text-3xl font-semibold tracking-tight">No interview found</h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-neutral-600">Finish an interview and the feedback lands here. Past sessions are listed under Session history on the home page.</p>
        <Link href="/" className="btn btn-primary mt-6">Go home</Link>
      </main>
    );
  }

  const techProblem =
    rec.type === "technical"
      ? (getProblemById(rec.problemId) ?? problems.find((p) => p.title === rec.problemTitle))
      : undefined;
  const verdict = companyVerdict(rec);
  const notes = phaseNotes(rec, techProblem);
  const weak = weakAreas(rec, techProblem);
  const next = recommendNext(rec, techProblem);
  const overall = overallScore(rec.scores);
  const target = rec.targetSec;
  const duration = `${Math.floor(rec.timeSec / 60)} min ${rec.timeSec % 60} sec`;
  const timeNote = rec.incomplete
    ? `Session ended early, after ${duration}.`
    : target
      ? rec.timeSec <= target
        ? `You finished in ${duration}, inside the ${Math.round(target / 60)} min target for this level.`
        : `You took ${duration} against a ${Math.round(target / 60)} min target. Overruns cost marks in real interviews, where the clock is shared with other questions.`
      : `Session length: ${duration}.`;

  const diffNote =
    rec.difficulty === "Hard"
      ? "Hard mode: no hints, brute force approaches rejected, and scoring expects optimisation plus trade-off reasoning."
      : rec.difficulty === "Easy"
        ? "Easy mode: one small hint is allowed, but thin answers are still pushed back and scored down."
        : "Mid mode: strict real interview expectations. Hints only when asked, and they are recorded.";

  const axes = [
    { label: "Problem Solving", value: rec.scores.problemSolving, note: axisNote(rec, "problemSolving") },
    { label: "Coding", value: rec.scores.coding, note: axisNote(rec, "coding") },
    { label: "Communication", value: rec.scores.communication, note: axisNote(rec, "communication") },
    { label: "Complexity Analysis", value: rec.scores.complexity, note: axisNote(rec, "complexity") },
  ];

  const qa = rec.qaPairs ?? [];
  const answeredQ = qa.filter((p) => p.answer).length;

  return (
    <main className="mx-auto flex h-dvh w-full max-w-6xl flex-col overflow-hidden px-5 py-4">
      <nav className="flex h-12 shrink-0 items-center justify-between border-b border-line">
        <Logo />
        <Link href="/" className="text-sm text-neutral-600 hover:text-neutral-900">Home</Link>
      </nav>

      <div className="mt-3 flex shrink-0 flex-wrap items-center gap-2.5">
        <h1 className="text-2xl font-semibold tracking-tight">Interview feedback</h1>
        <span className={`badge ${rec.difficulty === "Easy" ? "badge-easy" : rec.difficulty === "Hard" ? "badge-hard" : "badge-mid"}`}>{rec.difficulty}</span>
        {rec.companyName && <span className="badge badge-accent">{rec.companyName}</span>}
        {rec.resumeInterview && <span className="badge">Resume interview</span>}
        {rec.incomplete && <span className="badge badge-mid">Incomplete session</span>}
      </div>
      <p className="mt-1 shrink-0 text-[13px] text-neutral-600">
        {`${rec.type === "technical" ? rec.problemTitle || "Technical interview" : "Live AI Interview"} · ${new Date(rec.date).toLocaleString()}${rec.interviewerName ? ` · Interviewer: ${rec.interviewerName}` : ""}`}
      </p>
      {rec.incomplete && (
        <p className="mt-2 shrink-0 rounded-lg border border-line2 bg-panel2 px-3 py-2 text-xs leading-5 text-neutral-700" role="note">
          This session was left before it finished, so it was saved as incomplete. Scores reflect only what actually happened in the room.
        </p>
      )}
      <p className="mt-2 shrink-0 text-xs leading-5 text-neutral-600">{diffNote}</p>
      <p className="shrink-0 text-xs leading-5 text-neutral-600">{timeNote}</p>
      {verdict && (
        <p className="mt-2 shrink-0 text-[13px] leading-5 text-neutral-700">
          <span className="font-semibold text-neutral-900">Against the company bar: </span>
          {verdict}
        </p>
      )}

      <div className="mt-3 grid min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)] gap-4 lg:grid-cols-[380px_minmax(0,1fr)] lg:grid-rows-1">
        <section className="card card-pad self-start" aria-label="Scorecard">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xs font-medium text-neutral-600">Overall score</div>
              <div className="tnum mt-1 text-4xl font-semibold leading-none tracking-tight">
                {overall}
                <span className="text-base font-medium text-neutral-600">/10</span>
              </div>
            </div>
            {rec.type === "technical" ? (
              <dl className="grid grid-cols-2 gap-x-5 gap-y-1.5 text-[13px]">
                <dt className="text-neutral-600">Tests passed</dt>
                <dd className="text-right font-semibold">{rec.testsPassed} / {rec.totalTests}</dd>
                <dt className="text-neutral-600">Code runs</dt>
                <dd className="text-right font-semibold">{rec.runs}</dd>
                <dt className="text-neutral-600">Language</dt>
                <dd className="text-right font-semibold">{langLabel(rec.language)}</dd>
                <dt className="text-neutral-600">Hints used</dt>
                <dd className="text-right font-semibold">{rec.hintsUsed ?? 0}</dd>
              </dl>
            ) : (
              <dl className="grid grid-cols-2 gap-x-5 gap-y-1.5 text-[13px]">
                <dt className="text-neutral-600">Questions answered</dt>
                <dd className="text-right font-semibold">{qa.length ? `${answeredQ} / ${qa.length}` : `${rec.aiAnswered ?? 0}`}</dd>
                <dt className="text-neutral-600">Follow-ups answered</dt>
                <dd className="text-right font-semibold">{rec.aiAnswered ?? 0} / {rec.aiAsked ?? 0}</dd>
                <dt className="text-neutral-600">Thin answers</dt>
                <dd className="text-right font-semibold">{rec.thinAnswers ?? 0}</dd>
                <dt className="text-neutral-600">Asked a question at the end</dt>
                <dd className="text-right font-semibold">{rec.askedQuestionAtEnd ? "Yes" : "No"}</dd>
              </dl>
            )}
          </div>
          <p className="mt-2 text-xs leading-5 text-neutral-600">Strict scale. A 10 is rare and has to be earned on every axis.</p>
          <div className="mt-3 border-t border-line pt-3">
            <h2 className="text-sm font-semibold">Scores</h2>
            <div className="mt-1 divide-y divide-line">
              {axes.map((a) => (
                <div key={a.label} className="py-2.5 last:pb-0">
                  <div className="flex items-center gap-3">
                    <span className="w-32 shrink-0 text-[13px] font-medium">{a.label}</span>
                    <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-line">
                      <div className={`h-full rounded-full ${scoreBarClass(a.value)}`} style={{ width: `${a.value * 10}%` }} />
                    </div>
                    <span className="tnum w-12 shrink-0 text-right text-sm font-semibold">{a.value}/10</span>
                  </div>
                  {a.note && <p className="mt-1 text-xs leading-5 text-neutral-600 sm:pl-[140px]">{a.note}</p>}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="card min-h-0 overflow-y-auto" aria-label="Feedback detail">
          <div className="divide-y divide-line px-5 py-4">
            <section className="pb-4">
              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <h2 className="text-sm font-semibold">Strengths</h2>
                  {rec.scores.strengths.length ? (
                    <ul className="mt-2 list-disc space-y-1.5 pl-5 text-[13px] leading-5 text-neutral-700">{rec.scores.strengths.map((s) => <li key={s}>{s}</li>)}</ul>
                  ) : (
                    <p className="mt-2 text-[13px] leading-5 text-neutral-600">{notes.length ? "No clear strengths recorded this session. The phase notes below show where the marks went." : "No clear strengths recorded this session."}</p>
                  )}
                </div>
                <div className="md:border-l md:border-line md:pl-5">
                  <h2 className="text-sm font-semibold">Improvements</h2>
                  {rec.scores.improvements.length ? (
                    <ul className="mt-2 list-disc space-y-1.5 pl-5 text-[13px] leading-5 text-neutral-700">{rec.scores.improvements.map((s) => <li key={s}>{s}</li>)}</ul>
                  ) : (
                    <p className="mt-2 text-[13px] leading-5 text-neutral-600">Nothing major recorded. Try a harder difficulty next.</p>
                  )}
                </div>
              </div>
            </section>

            {notes.length > 0 && (
              <section className="py-4">
                <h2 className="text-sm font-semibold">What happened, phase by phase</h2>
                <div className="mt-1 divide-y divide-line">
                  {notes.map((n) => (
                    <div key={n.phase} className="py-3 last:pb-0">
                      <div className="text-sm font-semibold">{n.phase}</div>
                      <p className="mt-1 break-words text-[13px] leading-5 text-neutral-700">{n.did}</p>
                      <p className={`mt-1 text-[13px] leading-5 ${n.flag ? "text-red-700" : "text-neutral-700"}`}>{n.weak}</p>
                      <p className="mt-1 text-[13px] leading-5 text-neutral-600">Strong version: {n.strong}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {techProblem && (
              <section className="py-4">
                <h2 className="text-sm font-semibold">Model pointers for {techProblem.title}</h2>
                <p className="mt-1 text-xs text-neutral-600">Shown only after the interview ends.</p>
                <dl className="mt-2 space-y-1.5 text-[13px] leading-5">
                  <div className="flex gap-3">
                    <dt className="w-32 shrink-0 text-neutral-600">Intended pattern</dt>
                    <dd className="min-w-0 text-neutral-700">{techProblem.pattern}</dd>
                  </div>
                  <div className="flex gap-3">
                    <dt className="w-32 shrink-0 text-neutral-600">Complexity</dt>
                    <dd className="min-w-0 text-neutral-700">{techProblem.complexity}</dd>
                  </div>
                </dl>
                <div className="mt-3 grid gap-4 md:grid-cols-2">
                  <div>
                    <div className="text-[13px] font-medium">Key points</div>
                    <ul className="mt-1.5 list-disc space-y-1 pl-5 text-[13px] leading-5 text-neutral-700">{techProblem.keyPoints.map((k) => <li key={k}>{k}</li>)}</ul>
                  </div>
                  <div>
                    <div className="text-[13px] font-medium">Edge cases that matter</div>
                    <ul className="mt-1.5 list-disc space-y-1 pl-5 text-[13px] leading-5 text-neutral-700">{techProblem.edgeCases.map((k) => <li key={k}>{k}</li>)}</ul>
                  </div>
                </div>
              </section>
            )}

            <section className="py-4">
              <h2 className="text-sm font-semibold">Your weak areas</h2>
              {weak.length ? (
                <ul className="mt-2 list-disc space-y-1.5 pl-5 text-[13px] leading-5 text-neutral-700">{weak.map((w) => <li key={w}>{w}</li>)}</ul>
              ) : (
                <p className="mt-2 text-[13px] leading-5 text-neutral-600">No weak area stood out in the recorded signals. Raise the difficulty and go again.</p>
              )}
              <h3 className="mt-4 text-sm font-semibold">Do these next</h3>
              <div className="mt-1 divide-y divide-line">
                {next.map((n) => (
                  <div key={n.problemId + n.reason} className="flex flex-wrap items-center gap-x-3 gap-y-2 py-2.5 last:pb-0">
                    <span className="text-sm font-semibold">{n.title}</span>
                    <span className={`badge ${n.difficulty === "Easy" ? "badge-easy" : n.difficulty === "Hard" ? "badge-hard" : "badge-mid"}`}>{n.difficulty}</span>
                    <span className="min-w-0 flex-1 text-[13px] leading-5 text-neutral-600">{n.reason}</span>
                    <Link href={n.href} className="btn btn-primary btn-sm">Start</Link>
                  </div>
                ))}
              </div>
            </section>

            {rec.code && (
              <section className="py-4">
                <h2 className="text-sm font-semibold">Your final code</h2>
                <pre className="mt-2 max-h-64 overflow-auto rounded-lg border border-line bg-panel2 p-3 font-mono text-xs leading-5">{rec.code}</pre>
              </section>
            )}

            {rec.transcript.length > 0 && (
              <section className="pt-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold">Transcript</h2>
                  <button type="button" onClick={() => setShowTranscript((v) => !v)} className="btn btn-ghost btn-sm" aria-expanded={showTranscript}>{showTranscript ? "Hide transcript" : "View transcript"}</button>
                </div>
                {showTranscript && (
                  <div className="mt-2 max-h-80 divide-y divide-line overflow-y-auto">
                    {rec.transcript.slice(-20).map((m, i) => (
                      <div key={i} className="py-2.5">
                        <div className="text-xs font-semibold">{m.role === "ai" ? rec.interviewerName || "Interviewer" : "You"}</div>
                        <p className="mt-0.5 break-words whitespace-pre-wrap text-[13px] leading-5 text-neutral-700">{m.text}</p>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}
          </div>
        </section>
      </div>

      <footer className="mt-3 flex shrink-0 flex-wrap items-center gap-3 border-t border-line pt-3">
        {recUrl && (
          <div className="flex flex-wrap items-center gap-3">
            <video controls src={recUrl} className="h-16 w-auto max-w-[260px] rounded-md border border-line bg-black" />
            <div className="flex gap-2">
              <a href={recUrl} download={`mock-room-session-${rec.id}.webm`} className="btn btn-ghost btn-sm">Download recording</a>
              <button type="button" onClick={removeRecording} className="btn btn-ghost btn-sm">Delete</button>
            </div>
            <span className="text-xs text-neutral-600">Stored only in this browser. Nothing was uploaded.</span>
          </div>
        )}
        <div className="ml-auto flex gap-3">
          <Link href="/progress" className="btn btn-ghost">View progress</Link>
          <Link href="/" className="btn btn-primary">Practice again</Link>
        </div>
      </footer>
    </main>
  );
}
