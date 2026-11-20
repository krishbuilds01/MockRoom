"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { topics } from "@/lib/problems";
import { INTERVIEWERS, getInterviewer } from "@/lib/interviewers";
import { buildResumeQuestionsLocal, postResumeQuestions, RESUME_QUESTIONS_KEY, RESUME_STORAGE_KEY } from "@/lib/resume";
import { computeAnalytics, loadHistory } from "@/lib/analytics";
import { markFreshStart } from "@/lib/activeSession";
import { scoreBarClass } from "@/lib/scoreColor";
import { overallScore, type SessionRecord } from "@/lib/interviewer";
import Logo from "@/components/Logo";
import CompanySelect from "@/components/CompanySelect";
import Footer from "@/components/Footer";

function sessionTitle(h: SessionRecord): string {
  return h.type === "technical" ? h.problemTitle || "Technical interview" : "Live AI Interview";
}

export default function Home() {
  const router = useRouter();
  const [type, setType] = useState<"general" | "technical" | "resume">("technical");
  const [difficulty, setDifficulty] = useState("Mid");
  const [companyId, setCompanyId] = useState("any");
  const [topic, setTopic] = useState("HashMap");
  const [interviewerId, setInterviewerId] = useState("maya");
  const interviewer = getInterviewer(interviewerId);
  const [history, setHistory] = useState<SessionRecord[]>([]);
  const [resumeText, setResumeText] = useState("");
  const [resumeSaved, setResumeSaved] = useState(false);
  const [resumeBusy, setResumeBusy] = useState(false);
  const [resumeError, setResumeError] = useState("");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHistory(loadHistory());
    try {
      const saved = localStorage.getItem(RESUME_STORAGE_KEY);
      if (saved) {
        setResumeText(saved);
        setResumeSaved(true);
      }
    } catch {}
  }, []);

  useEffect(() => {
    const resetTransient = () => {
      setResumeBusy(false);
      setResumeError("");
    };
    resetTransient();
    const onVisibility = () => {
      if (document.visibilityState === "visible") resetTransient();
    };
    window.addEventListener("pageshow", resetTransient);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pageshow", resetTransient);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  function start() {
    if (type === "resume") {
      void startResume();
      return;
    }
    if (type === "technical") {
      const q = new URLSearchParams({ difficulty, topic, interviewer: interviewerId });
      if (companyId !== "any") q.set("company", companyId);
      markFreshStart("technical");
      router.push(`/interview/technical?${q}`);
    } else {
      const q = new URLSearchParams({ difficulty, interviewer: interviewerId });
      if (companyId !== "any") q.set("company", companyId);
      markFreshStart("general");
      router.push(`/interview/general?${q}`);
    }
  }

  async function startResume() {
    const text = resumeText.trim();
    if (text.length < 100) {
      setResumeError("That is too short to build questions from. Paste the parts about your projects and skills.");
      return;
    }
    setResumeError("");
    setResumeBusy(true);
    try {
      const result = (await postResumeQuestions(text, interviewerId)) || { questions: buildResumeQuestionsLocal(text), engine: "local" as const };
      try {
        sessionStorage.setItem(RESUME_QUESTIONS_KEY, JSON.stringify(result.questions));
        localStorage.setItem(RESUME_STORAGE_KEY, text);
      } catch {}
      const q = new URLSearchParams({ difficulty, resume: "1", interviewer: interviewerId });
      if (companyId !== "any") q.set("company", companyId);
      markFreshStart("general");
      router.push(`/interview/general?${q}`);
    } finally {
      setResumeBusy(false);
    }
  }

  function deleteSavedResume() {
    try {
      localStorage.removeItem(RESUME_STORAGE_KEY);
    } catch {}
    setResumeText("");
    setResumeSaved(false);
  }

  async function onResumeFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text().catch(() => "");
    if (text) {
      setResumeText(text);
      setResumeError("");
    } else {
      setResumeError("That file could not be read. Paste the text instead.");
    }
    e.target.value = "";
  }

  const analytics = history.length ? computeAnalytics(history) : null;
  const chronological = [...history].reverse();
  const latest = history[0] ?? null;
  const latestOverall = latest ? overallScore(latest.scores) : null;
  const previousOverall = history.length > 1 ? overallScore(history[1].scores) : null;
  const trendDelta = latestOverall !== null && previousOverall !== null ? Math.round((latestOverall - previousOverall) * 10) / 10 : null;

  const firstSteps = [
    "Choose a mode, an interviewer and a difficulty in the form, then start. There is no account and nothing to install.",
    `Voice room: an introduction, 5 questions with a follow-up on each, then your questions for ${interviewer.name}. Coding room: your approach is judged before you write code, and ${interviewer.name} watches the editor while you work.`,
    "Every session ends with scores out of 10 on problem solving, coding, communication and complexity, your weak areas, and the next problems to do.",
  ];

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[1120px] flex-col px-5">
      <nav className="flex h-16 shrink-0 items-center justify-between border-b border-line">
        <Logo />
        <div className="flex items-center gap-5 text-sm text-stone-600">
          <Link href="/progress" className="hover:text-stone-900">Progress</Link>
          <Link href="/interview/feedback" className="hover:text-stone-900">Latest feedback</Link>
        </div>
      </nav>

      <header className="pt-10">
        <h1 className="font-display text-display font-semibold text-stone-900">Get That Job</h1>
        <p className="mt-3 max-w-2xl text-[15px] leading-6 text-stone-600">
          One on one interview practice. Maya or Rohan runs your session: 5 questions with follow-ups in the voice room, or one
          coding problem watched line by line in the coding room. Thin answers get pushed back, hints are recorded, and every
          session ends with scores out of 10 on problem solving, coding, communication and complexity.
        </p>
      </header>

      <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="card card-pad" aria-label="Start an interview">
          <h2 className="text-sm font-semibold">Start an interview</h2>
          <div className="mt-4">
            <div>
              <div className="text-[13px] font-medium text-stone-700">Mode</div>
              <div className="mt-2 grid grid-cols-3 gap-2" role="group" aria-label="Interview mode">
                <button type="button" onClick={() => setType("technical")} aria-pressed={type === "technical"} className={type === "technical" ? "btn btn-primary btn-sm w-full" : "btn btn-ghost btn-sm w-full"}>Technical</button>
                <button type="button" onClick={() => setType("general")} aria-pressed={type === "general"} className={type === "general" ? "btn btn-primary btn-sm w-full" : "btn btn-ghost btn-sm w-full"}>Live voice</button>
                <button type="button" onClick={() => setType("resume")} aria-pressed={type === "resume"} className={type === "resume" ? "btn btn-primary btn-sm w-full" : "btn btn-ghost btn-sm w-full"}>My resume</button>
              </div>
            </div>
            <div className="mt-4 border-t border-line pt-4">
              <div className="text-[13px] font-medium text-stone-700">Interviewer</div>
              <div className="mt-2 grid grid-cols-2 gap-2" role="group" aria-label="Interviewer">
                {INTERVIEWERS.map((p) => (
                  <button
                    type="button"
                    key={p.id}
                    onClick={() => setInterviewerId(p.id)}
                    aria-pressed={interviewerId === p.id}
                    className={
                      interviewerId === p.id
                        ? "rounded-lg border border-emerald-600 bg-accent-soft px-3 py-2.5 text-left"
                        : "rounded-lg border border-line bg-white px-3 py-2.5 text-left transition hover:border-line2"
                    }
                  >
                    <span className="block text-sm font-semibold text-stone-900">{p.name}</span>
                    <span className="block text-xs text-stone-600">{p.gender} interviewer</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-4 border-t border-line pt-4">
              <div className="text-[13px] font-medium text-stone-700">Difficulty</div>
              <div className="mt-2 grid grid-cols-3 gap-2" role="group" aria-label="Difficulty">
                {["Easy", "Mid", "Hard"].map((d) => (
                  <button type="button" key={d} onClick={() => setDifficulty(d)} aria-pressed={difficulty === d} className={difficulty === d ? "btn btn-primary btn-sm w-full" : "btn btn-ghost btn-sm w-full"}>{d}</button>
                ))}
              </div>
            </div>
            <div className="mt-4 border-t border-line pt-4">
              <div id="company-label" className="text-[13px] font-medium text-stone-700">Company</div>
              <div className="mt-2" aria-labelledby="company-label">
                <CompanySelect value={companyId} onChange={setCompanyId} />
              </div>
            </div>
            {type === "technical" && (
              <div className="mt-4 border-t border-line pt-4">
                <div className="text-[13px] font-medium text-stone-700">Topic</div>
                <div className="mt-2 grid grid-cols-3 gap-2" role="group" aria-label="Topic">
                  {topics.map((t) => (
                    <button type="button" key={t} onClick={() => setTopic(t)} aria-pressed={topic === t} className={topic === t ? "btn btn-primary btn-sm w-full" : "btn btn-ghost btn-sm w-full"}>{t}</button>
                  ))}
                </div>
              </div>
            )}
            {type === "resume" && (
              <div className="mt-4 border-t border-line pt-4">
                <label htmlFor="resume-text" className="text-[13px] font-medium text-stone-700">Your resume</label>
                <textarea
                  id="resume-text"
                  value={resumeText}
                  onChange={(e) => setResumeText(e.target.value)}
                  rows={6}
                  placeholder="Paste your resume here: projects, skills, experience. Plain text works best."
                  className="input mt-2 resize-none leading-6"
                />
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <label className="btn btn-ghost btn-sm cursor-pointer">
                    Upload .txt or .md
                    <input type="file" accept=".txt,.md,text/plain,text/markdown" onChange={onResumeFile} className="sr-only" />
                  </label>
                  {resumeSaved && (
                    <button type="button" onClick={deleteSavedResume} className="btn btn-ghost btn-sm">Delete saved resume</button>
                  )}
                </div>
                {resumeError && <p className="mt-2 text-xs leading-5 text-red-600" role="alert">{resumeError}</p>}
              </div>
            )}
          </div>

          <button type="button" onClick={start} disabled={resumeBusy} className="btn btn-accent mt-5 h-[52px] w-full rounded-xl text-[15px] font-semibold">
            {type === "resume" ? (resumeBusy ? "Building your questions..." : "Start resume interview") : "Start interview"}
          </button>
          <p className="mt-4 border-t border-line pt-3 text-[13px] leading-5 text-stone-600">
            {type === "resume"
              ? "Your resume stays in this browser, stored only on this device. It is sent once, only to build your questions."
              : "Works best in Chrome. Allow camera and mic when asked. No account needed."}
          </p>
        </section>

        {analytics && latest ? (
          <section className="card card-pad" aria-label="Your practice record">
            <h2 className="text-sm font-semibold">Your practice record</h2>
            <dl className="mt-2 divide-y divide-line">
              <div className="flex items-baseline justify-between gap-3 py-2.5">
                <dt className="text-[13px] text-stone-600">Sessions</dt>
                <dd className="tnum text-sm font-semibold">{analytics.total}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-3 py-2.5">
                <dt className="text-[13px] text-stone-600">Average overall</dt>
                <dd className="tnum text-sm font-semibold">{analytics.averageOverall}/10</dd>
              </div>
              <div className="flex items-baseline justify-between gap-3 py-2.5">
                <dt className="text-[13px] text-stone-600">Practice streak</dt>
                <dd className="tnum text-sm font-semibold">{analytics.streakDays} day{analytics.streakDays === 1 ? "" : "s"}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-3 py-2.5">
                <dt className="text-[13px] text-stone-600">Weakest area</dt>
                <dd className="tnum text-right text-sm font-semibold">{analytics.weakest ? `${analytics.weakest.name} · ${analytics.weakest.average}/10` : "Not yet"}</dd>
              </div>
            </dl>
            <div className="border-t border-line pt-3">
              <div className="text-[13px] text-stone-600">Last session</div>
              <div className="mt-1 text-sm font-medium">{sessionTitle(latest)}</div>
              <div className="mt-0.5 text-[13px] text-stone-600">
                {`${new Date(latest.date).toLocaleDateString()} · Overall `}
                <span className="tnum font-semibold text-stone-900">{latestOverall}/10</span>
                {trendDelta !== null && (
                  <span className={trendDelta >= 0 ? "font-medium text-emerald-700" : "font-medium text-red-600"}>
                    {` · ${trendDelta >= 0 ? "+" : ""}${trendDelta} vs the one before`}
                  </span>
                )}
              </div>
              <Link href="/interview/feedback" className="mt-1.5 inline-block text-[13px] font-medium text-stone-900 underline underline-offset-2">Open the feedback</Link>
            </div>
            {chronological.length > 1 && (
              <div className="mt-4 border-t border-line pt-3">
                <div className="text-[13px] text-stone-600">Overall score per session, oldest to newest</div>
                <div className="mt-2 flex gap-2 border-b border-line2">
                  {chronological.slice(-10).map((h) => {
                    const o = overallScore(h.scores);
                    return (
                      <div key={h.id} className="flex flex-1 flex-col items-center gap-1.5" title={`${o}/10`}>
                        <span className="tnum text-xs font-semibold leading-none text-stone-700">{o}</span>
                        <div className="relative h-16 w-full rounded-t bg-panel2">
                          <div className={`absolute inset-x-0 bottom-0 rounded-t ${scoreBarClass(o)}`} style={{ height: `${o * 10}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-1.5 flex gap-2">
                  {chronological.slice(-10).map((h) => {
                    const d = new Date(h.date);
                    return (
                      <span key={h.id} className="flex-1 text-center text-xs leading-none text-stone-600">{`${d.getDate()}/${d.getMonth() + 1}`}</span>
                    );
                  })}
                </div>
              </div>
            )}
            <Link href="/progress" className="mt-4 block border-t border-line pt-3 text-[13px] font-medium text-stone-900 underline underline-offset-2">
              Progress page: trend, topics and this week&apos;s plan
            </Link>
          </section>
        ) : (
          <section className="card card-pad" aria-label="Your first session">
            <h2 className="text-sm font-semibold">No sessions yet</h2>
            <p className="mt-2 text-[13px] leading-5 text-stone-600">
              Your practice record appears here after your first session: scores, streak and weakest areas, computed from the
              sessions stored in this browser.
            </p>
            <ol className="mt-4 space-y-3.5">
              {firstSteps.map((step, i) => (
                <li key={step} className="flex items-baseline gap-3 text-[13px] leading-5 text-stone-600">
                  <span className="tnum flex h-5 w-5 shrink-0 translate-y-0.5 items-center justify-center rounded-full border border-line2 text-[11px] font-semibold text-stone-700">{i + 1}</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </section>
        )}
      </div>

      <Link href="/system-design" className="mt-6 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-y border-line py-4">
        <span className="text-sm">
          <span className="font-semibold">System design</span>{" "}
          <span className="text-stone-600">URL shortener, chat system, news feed, rate limiter, file storage.</span>
        </span>
        <span className="text-[13px] font-medium text-stone-600">Coming soon</span>
      </Link>

      {history.length > 0 && (
        <section className="mt-8">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-display text-h2 font-semibold">Session history</h2>
            <Link href="/progress" className="text-[13px] font-medium text-stone-900 underline underline-offset-2">Progress page</Link>
          </div>
          <div className="card mt-3 divide-y divide-line">
            {history.map((h) => (
              <div key={h.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 text-sm">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 truncate font-medium">
                    <span className="truncate">{sessionTitle(h)}</span>
                    <span className={`badge ${h.difficulty === "Easy" ? "badge-easy" : h.difficulty === "Hard" ? "badge-hard" : "badge-mid"}`}>{h.difficulty}</span>
                    {h.companyName && <span className="badge badge-accent">{h.companyName}</span>}
                    {h.resumeInterview && <span className="badge">Resume</span>}
                    {h.incomplete && <span className="badge badge-mid">Incomplete</span>}
                  </div>
                  <div className="mt-0.5 text-xs text-stone-600">{`${new Date(h.date).toLocaleString()} · ${Math.round(h.timeSec / 60)} min${h.targetSec ? ` of ${Math.round(h.targetSec / 60)} target` : ""}${h.interviewerName ? ` · Interviewer: ${h.interviewerName}` : ""}`}</div>
                </div>
                <div className="flex items-center gap-4 text-xs text-stone-600">
                  {h.type === "technical" && (
                    <span>Tests <span className="tnum font-semibold text-stone-900">{h.testsPassed}/{h.totalTests}</span></span>
                  )}
                  {(h.hintsUsed ?? 0) > 0 && <span>Hints <span className="tnum font-semibold text-stone-900">{h.hintsUsed}</span></span>}
                  <span>Problem Solving <span className="tnum font-semibold text-stone-900">{h.scores.problemSolving}/10</span></span>
                  <span>Overall <span className="tnum font-semibold text-stone-900">{overallScore(h.scores)}/10</span></span>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-stone-600">History is stored only in this browser.</p>
        </section>
      )}

      <Footer />
    </main>
  );
}
