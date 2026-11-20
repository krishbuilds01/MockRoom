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

  if (!loaded) return <div className="p-8 text-sm text-stone-600">Loading feedback...</div>;
  if (!rec) {
    return (
      <main className="mx-auto max-w-2xl px-5 py-16 text-center">
        <h1 className="font-display text-3xl font-semibold tracking-tight">No interview found</h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-stone-600">Finish an interview and the feedback lands here. Past sessions are listed under Session history on the home page.</p>
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
    <main className="mx-auto flex min-h-dvh w-full max-w-4xl flex-col px-5 py-5">
      <nav className="flex h-16 shrink-0 items-center justify-between border-b border-line">
        <Logo />
        <Link href="/" className="text-sm text-stone-600 hover:text-stone-900">Home</Link>
      </nav>

      <div className="mt-4 flex shrink-0 flex-wrap items-center gap-2.5">
        <h1 className="font-display text-4xl font-semibold tracking-tight">Interview feedback</h1>
        <span className={`badge ${rec.difficulty === "Easy" ? "badge-easy" : rec.difficulty === "Hard" ? "badge-hard" : "badge-mid"}`}>{rec.difficulty}</span>
        {rec.companyName && <span className="badge badge-accent">{rec.companyName}</span>}
        {rec.resumeInterview && <span className="badge">Resume interview</span>}
        {rec.incomplete && <span className="badge badge-mid">Incomplete session</span>}
      </div>
      <p className="mt-2 text-sm text-stone-600">
        {`${rec.type === "technical" ? rec.problemTitle || "Technical interview" : "Live AI Interview"} · ${new Date(rec.date).toLocaleString()}${rec.interviewerName ? ` · Interviewer: ${rec.interviewerName}` : ""}`}
      </p>
      {rec.incomplete && (
        <p className="mt-3 rounded-lg border border-amber-300 bg-amber-50 px-3.5 py-2.5 text-xs leading-5 text-amber-800" role="note">
          This session was left before it finished, so it was saved as incomplete. Scores reflect only what actually happened in the room.
        </p>
      )}
      <p className="mt-3 text-xs leading-5 text-stone-600">{diffNote}</p>
      <p className="mt-1 text-xs leading-5 text-stone-600">{timeNote}</p>
      {verdict && (
        <div className="mt-4 border-t border-line pt-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-stone-600">Against the company bar</div>
          <p className="mt-1.5 text-sm leading-6 text-stone-700">{verdict}</p>
        </div>
      )}

      <div className="card card-pad mt-4">
        <div className="divide-y divide-line">
          <section className="py-5 first:pt-0 last:pb-0">
            <div className="flex flex-wrap items-start gap-x-10 gap-y-4">
              <div>
                <div className="text-xs font-medium text-stone-600">Overall score</div>
                <div className="tnum mt-1 font-display text-5xl font-semibold leading-none tracking-tight">
                  {overall}
                  <span className="text-lg font-medium text-stone-600">/10</span>
                </div>
                <div className="mt-2 max-w-[26ch] text-xs leading-5 text-stone-600">Strict scale. A 10 is rare and has to be earned on every axis.</div>
              </div>
              {rec.type === "technical" ? (
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
              ) : (
                <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                  <div className="text-stone-600">Questions answered</div>
                  <div className="text-right font-semibold">{qa.length ? `${answeredQ} / ${qa.length}` : `${rec.aiAnswered ?? 0}`}</div>
                  <div className="text-stone-600">Follow-ups answered</div>
                  <div className="text-right font-semibold">{rec.aiAnswered ?? 0} / {rec.aiAsked ?? 0}</div>
                  <div className="text-stone-600">Thin answers</div>
                  <div className="text-right font-semibold">{rec.thinAnswers ?? 0}</div>
                  <div className="text-stone-600">Asked a question at the end</div>
                  <div className="text-right font-semibold">{rec.askedQuestionAtEnd ? "Yes" : "No"}</div>
                </div>
              )}
            </div>
          </section>

          <section className="py-5 first:pt-0 last:pb-0">
            <h2 className="text-sm font-semibold">Scores</h2>
            <div className="mt-1 divide-y divide-line">
              {axes.map((a) => (
                <div key={a.label} className="py-3 last:pb-0">
                  <div className="flex items-center gap-3">
                    <span className="w-36 shrink-0 text-sm font-medium sm:w-44">{a.label}</span>
                    <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-line">
                      <div className={`h-full rounded-full ${scoreBarClass(a.value)}`} style={{ width: `${a.value * 10}%` }} />
                    </div>
                    <span className="tnum w-12 shrink-0 text-right text-sm font-semibold">{a.value}/10</span>
                  </div>
                  {a.note && <p className="mt-1 text-[13px] leading-5 text-stone-600 sm:pl-[188px]">{a.note}</p>}
                </div>
              ))}
            </div>
          </section>

          <section className="py-5 first:pt-0 last:pb-0">
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <h2 className="text-sm font-semibold">Strengths</h2>
                {rec.scores.strengths.length ? (
                  <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-stone-700">{rec.scores.strengths.map((s) => <li key={s}>{s}</li>)}</ul>
                ) : (
                  <p className="mt-3 text-sm leading-6 text-stone-600">{notes.length ? "No clear strengths recorded this session. The phase notes below show where the marks went." : "No clear strengths recorded this session."}</p>
                )}
              </div>
              <div className="md:border-l md:border-line md:pl-6">
                <h2 className="text-sm font-semibold">Improvements</h2>
                {rec.scores.improvements.length ? (
                  <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-stone-700">{rec.scores.improvements.map((s) => <li key={s}>{s}</li>)}</ul>
                ) : (
                  <p className="mt-3 text-sm leading-6 text-stone-600">Nothing major recorded. Try a harder difficulty next.</p>
                )}
              </div>
            </div>
          </section>

          {notes.length > 0 && (
            <section className="py-5 first:pt-0 last:pb-0">
              <h2 className="text-sm font-semibold">What happened, phase by phase</h2>
              <div className="mt-1 divide-y divide-line">
                {notes.map((n) => (
                  <div key={n.phase} className="py-4 last:pb-0">
                    <div className="text-sm font-semibold">{n.phase}</div>
                    <p className="mt-1 break-words text-sm leading-6 text-stone-700">{n.did}</p>
                    <p className={`mt-1 text-sm leading-6 ${n.flag ? "text-amber-800" : "text-stone-700"}`}>{n.weak}</p>
                    <p className="mt-1 text-sm leading-6 text-stone-600">Strong version: {n.strong}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {techProblem && (
            <section className="py-5 first:pt-0 last:pb-0">
              <h2 className="text-sm font-semibold">Model pointers for {techProblem.title}</h2>
              <p className="mt-1 text-[13px] text-stone-600">Shown only after the interview ends.</p>
              <dl className="mt-3 space-y-2 text-sm leading-6">
                <div className="flex gap-3">
                  <dt className="w-36 shrink-0 text-stone-600">Intended pattern</dt>
                  <dd className="min-w-0 text-stone-700">{techProblem.pattern}</dd>
                </div>
                <div className="flex gap-3">
                  <dt className="w-36 shrink-0 text-stone-600">Complexity</dt>
                  <dd className="min-w-0 text-stone-700">{techProblem.complexity}</dd>
                </div>
              </dl>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div>
                  <div className="text-sm font-medium">Key points</div>
                  <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-6 text-stone-700">{techProblem.keyPoints.map((k) => <li key={k}>{k}</li>)}</ul>
                </div>
                <div>
                  <div className="text-sm font-medium">Edge cases that matter</div>
                  <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-6 text-stone-700">{techProblem.edgeCases.map((k) => <li key={k}>{k}</li>)}</ul>
                </div>
              </div>
            </section>
          )}

          <section className="py-5 first:pt-0 last:pb-0">
            <h2 className="text-sm font-semibold">Your weak areas</h2>
            {weak.length ? (
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-stone-700">{weak.map((w) => <li key={w}>{w}</li>)}</ul>
            ) : (
              <p className="mt-3 text-sm leading-6 text-stone-600">No weak area stood out in the recorded signals. Raise the difficulty and go again.</p>
            )}
            <h3 className="mt-6 text-sm font-semibold">Do these next</h3>
            <div className="mt-1 divide-y divide-line">
              {next.map((n) => (
                <div key={n.problemId + n.reason} className="flex flex-wrap items-center gap-x-3 gap-y-2 py-3 last:pb-0">
                  <span className="text-sm font-semibold">{n.title}</span>
                  <span className={`badge ${n.difficulty === "Easy" ? "badge-easy" : n.difficulty === "Hard" ? "badge-hard" : "badge-mid"}`}>{n.difficulty}</span>
                  <span className="min-w-0 flex-1 text-sm leading-5 text-stone-600">{n.reason}</span>
                  <Link href={n.href} className="btn btn-primary btn-sm">Start</Link>
                </div>
              ))}
            </div>
          </section>

          {recUrl && (
            <section className="py-5 first:pt-0 last:pb-0">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-semibold">Your session recording</h2>
                <div className="flex gap-2">
                  <a href={recUrl} download={`mock-room-session-${rec.id}.webm`} className="btn btn-ghost btn-sm">Download</a>
                  <button type="button" onClick={removeRecording} className="btn btn-ghost btn-sm">Delete</button>
                </div>
              </div>
              <video controls src={recUrl} className="mt-3 w-full rounded-lg border border-line bg-black" />
              <p className="mt-2 text-xs leading-5 text-stone-600">Stored only in this browser. Nothing was uploaded.</p>
            </section>
          )}

          {rec.code && (
            <section className="py-5 first:pt-0 last:pb-0">
              <h2 className="text-sm font-semibold">Your final code</h2>
              <pre className="mt-3 max-h-80 overflow-auto rounded-lg border border-line bg-panel2 p-4 font-mono text-xs leading-5">{rec.code}</pre>
            </section>
          )}

          {rec.transcript.length > 0 && (
            <section className="py-5 first:pt-0 last:pb-0">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold">Transcript</h2>
                <button type="button" onClick={() => setShowTranscript((v) => !v)} className="btn btn-ghost btn-sm" aria-expanded={showTranscript}>{showTranscript ? "Hide transcript" : "View transcript"}</button>
              </div>
              {showTranscript && (
                <div className="mt-2 max-h-96 divide-y divide-line overflow-y-auto">
                  {rec.transcript.slice(-20).map((m, i) => (
                    <div key={i} className="py-2.5">
                      <div className="text-xs font-semibold">{m.role === "ai" ? rec.interviewerName || "Interviewer" : "You"}</div>
                      <p className="mt-0.5 break-words whitespace-pre-wrap text-sm leading-6 text-stone-700">{m.text}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}
        </div>
      </div>

      <div className="mt-4 flex shrink-0 gap-3">
        <Link href="/" className="btn btn-accent flex-1">Practice again</Link>
        <Link href="/progress" className="btn btn-ghost flex-1">View progress</Link>
      </div>
    </main>
  );
}
