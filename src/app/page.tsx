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
import { countByFormat } from "@/lib/problemBank";
import { overallScore, type SessionRecord } from "@/lib/interviewer";
import { LogoMark } from "@/components/Logo";
import TopNav from "@/components/TopNav";
import CompanySelect from "@/components/CompanySelect";
import Footer from "@/components/Footer";

function sessionTitle(h: SessionRecord): string {
  return h.type === "technical" ? h.problemTitle || "Technical interview" : "Live AI Interview";
}

const FORMAT_CARDS = [
  { key: "coding", label: "Coding", line: "Arrays, strings, graphs and DP, practised in the coding room with your code watched live." },
  { key: "system-design", label: "System design", line: "The design questions real loops are built around. The rooms open soon; the question set is final." },
  { key: "general", label: "General", line: "Behavioural and fundamentals questions, answered out loud with follow-ups." },
] as const;

export default function Home() {
  const router = useRouter();
  const [type, setType] = useState<"general" | "technical" | "resume">("technical");
  const [difficulty, setDifficulty] = useState("Mid");
  const [companyId, setCompanyId] = useState("any");
  const [topic, setTopic] = useState("HashMap");
  const [interviewerId, setInterviewerId] = useState("maya");
  const interviewer = getInterviewer(interviewerId);
  const [history, setHistory] = useState<SessionRecord[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [resumeText, setResumeText] = useState("");
  const [resumeSaved, setResumeSaved] = useState(false);
  const [resumeBusy, setResumeBusy] = useState(false);
  const [resumeError, setResumeError] = useState("");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHistory(loadHistory());
    setHistoryLoaded(true);
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
  const chartSessions = chronological.slice(-30);
  const chartOffset = chronological.length - chartSessions.length;
  const latest = history[0] ?? null;
  const latestOverall = latest ? overallScore(latest.scores) : null;
  const previousOverall = history.length > 1 ? overallScore(history[1].scores) : null;
  const trendDelta = latestOverall !== null && previousOverall !== null ? Math.round((latestOverall - previousOverall) * 10) / 10 : null;

  const firstSteps = [
    "Choose a mode, an interviewer and a difficulty in the form, then start. There is no account and nothing to install.",
    `Voice room: an introduction, 5 questions with a follow-up on each, then your questions for ${interviewer.name}. Coding room: your approach is judged before you write code, and ${interviewer.name} watches the editor while you work.`,
    "Every session ends with scores out of 10 on problem solving, coding, communication and complexity analysis, your weak areas, and the next problems to do.",
  ];

  return (
    <div className="min-h-dvh bg-ink">
      <TopNav />
      <main className="mx-auto w-full max-w-[1120px] px-5">
        <header className="relative px-1 pb-16 pt-14 text-center xl:pb-36">
          <div className="pointer-events-none absolute inset-0 hidden xl:block" aria-hidden="true">
            <span className="pointer-events-auto absolute left-[3%] top-8 flex h-12 w-12 -rotate-6 items-center justify-center rounded-xl border border-line bg-tile text-base font-bold text-white">G</span>
            <span className="pointer-events-auto absolute right-[4%] top-20 flex h-12 w-12 rotate-6 items-center justify-center rounded-xl border border-line bg-tile text-base font-bold text-white">A</span>
            <span className="pointer-events-auto absolute bottom-32 right-[9%] flex h-12 w-12 -rotate-3 items-center justify-center rounded-xl border border-line bg-tile text-base font-bold text-white">M</span>
          </div>
          <div className="flex justify-center">
            <LogoMark size={44} />
          </div>
          <h1 className="font-display mx-auto mt-6 max-w-3xl text-[42px] font-bold leading-[1.05] tracking-tight text-white sm:text-[64px]">
            Real questions. A strict
            <span className="block italic text-accent">interviewer. No mercy.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-[15px] leading-6 text-neutral-600">
            Coding, system design and general rounds from the companies you are targeting, practised live with Maya or Rohan.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/problems" className="btn btn-primary h-12 px-6 text-[15px]">Browse problems</Link>
            <a href="#setup" className="btn btn-secondary h-12 px-6 text-[15px]">Start an interview →</a>
          </div>
          <div className="pointer-events-none absolute inset-x-0 bottom-2 hidden xl:block" aria-hidden="true">
            <Link href="/problems?format=coding" className="pointer-events-auto absolute bottom-0 left-0 block w-[248px] -rotate-3 rounded-xl border border-line bg-panel p-3.5 text-left transition hover:border-line2">
              <span className="block text-sm font-semibold text-white">Group Anagrams</span>
              <span className="mt-0.5 block text-xs text-neutral-600">Medium · Asked at Amazon, Google</span>
              <span className="mt-2 block text-[13px] font-semibold text-accent">Open question →</span>
            </Link>
            <Link href="/problems?format=system-design" className="pointer-events-auto absolute bottom-0 right-0 block w-[264px] rotate-2 rounded-xl border border-line bg-panel p-3.5 text-left transition hover:border-line2">
              <span className="block text-sm font-semibold text-white">Design a Typeahead Service</span>
              <span className="mt-0.5 block text-xs text-neutral-600">System design · Asked at Pinterest, Slack</span>
              <span className="mt-2 block text-[13px] font-semibold text-accent">Open question →</span>
            </Link>
          </div>
        </header>

        <section id="setup" className="scroll-mt-6" aria-label="Set up your interview">
          <h2 className="font-display text-h2 font-semibold text-white">Set up your interview</h2>
          <div className="card card-pad mt-3">
            <div>
              <div className="text-[13px] font-medium text-neutral-700">Mode</div>
              <div className="mt-2 grid grid-cols-3 gap-2" role="group" aria-label="Interview mode">
                <button type="button" onClick={() => setType("technical")} aria-pressed={type === "technical"} className={type === "technical" ? "btn btn-primary btn-sm w-full" : "btn btn-ghost btn-sm w-full"}>Technical</button>
                <button type="button" onClick={() => setType("general")} aria-pressed={type === "general"} className={type === "general" ? "btn btn-primary btn-sm w-full" : "btn btn-ghost btn-sm w-full"}>Live voice</button>
                <button type="button" onClick={() => setType("resume")} aria-pressed={type === "resume"} className={type === "resume" ? "btn btn-primary btn-sm w-full" : "btn btn-ghost btn-sm w-full"}>My resume</button>
              </div>
            </div>
            <div className="mt-4 border-t border-line pt-4">
              <div className="text-[13px] font-medium text-neutral-700">Interviewer</div>
              <div className="mt-2 grid grid-cols-2 gap-2" role="group" aria-label="Interviewer">
                {INTERVIEWERS.map((p) => (
                  <button
                    type="button"
                    key={p.id}
                    onClick={() => setInterviewerId(p.id)}
                    aria-pressed={interviewerId === p.id}
                    className={
                      interviewerId === p.id
                        ? "rounded-lg border border-accent bg-accent-soft px-3 py-2.5 text-left"
                        : "rounded-lg border border-line bg-panel px-3 py-2.5 text-left transition hover:border-line2"
                    }
                  >
                    <span className="block text-sm font-semibold text-white">{p.name}</span>
                    <span className="block text-xs text-neutral-600">{p.gender} interviewer</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-4 border-t border-line pt-4">
              <div className="text-[13px] font-medium text-neutral-700">Difficulty</div>
              <div className="mt-2 grid grid-cols-3 gap-2" role="group" aria-label="Difficulty">
                {["Easy", "Mid", "Hard"].map((d) => (
                  <button type="button" key={d} onClick={() => setDifficulty(d)} aria-pressed={difficulty === d} className={difficulty === d ? "btn btn-primary btn-sm w-full" : "btn btn-ghost btn-sm w-full"}>{d}</button>
                ))}
              </div>
            </div>
            <div className="mt-4 border-t border-line pt-4">
              <div id="company-label" className="text-[13px] font-medium text-neutral-700">Company</div>
              <div className="mt-2" aria-labelledby="company-label">
                <CompanySelect value={companyId} onChange={setCompanyId} />
              </div>
            </div>
            {type === "technical" && (
              <div className="mt-4 border-t border-line pt-4">
                <div className="text-[13px] font-medium text-neutral-700">Topic</div>
                <div className="mt-2 grid grid-cols-3 gap-2" role="group" aria-label="Topic">
                  {topics.map((t) => (
                    <button type="button" key={t} onClick={() => setTopic(t)} aria-pressed={topic === t} className={topic === t ? "btn btn-primary btn-sm w-full" : "btn btn-ghost btn-sm w-full"}>{t}</button>
                  ))}
                </div>
              </div>
            )}
            {type === "resume" && (
              <div className="mt-4 border-t border-line pt-4">
                <label htmlFor="resume-text" className="text-[13px] font-medium text-neutral-700">Your resume</label>
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

            <button type="button" onClick={start} disabled={resumeBusy} className="btn btn-accent mt-5 h-[52px] w-full text-[15px] font-semibold">
              {type === "resume" ? (resumeBusy ? "Building your questions..." : "Start resume interview") : "Start interview"}
            </button>
            <p className="mt-4 border-t border-line pt-3 text-[13px] leading-5 text-neutral-600">
              {type === "resume"
                ? "Your resume stays in this browser, stored only on this device. It is sent once, only to build your questions."
                : "Works best in Chrome. Allow camera and mic when asked. No account needed."}
            </p>
          </div>
        </section>

        <section className="mt-10" aria-label="Browse by format">
          <h2 className="font-display text-h2 font-semibold text-white">Browse by format</h2>
          <div className="mt-3 grid gap-4 sm:grid-cols-3">
            {FORMAT_CARDS.map((f) => (
              <Link key={f.key} href={`/problems?format=${f.key}`} className="card card-pad block transition hover:border-line2">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-sm font-semibold text-white">{f.label}</span>
                  <span className="tnum font-display text-3xl font-semibold text-white">{countByFormat(f.key)}</span>
                </div>
                <p className="mt-2 text-sm leading-6 text-neutral-600">{f.line}</p>
                <span className="mt-3 block text-sm font-semibold text-accent">View problems →</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-10" aria-label="Your practice record">
          <h2 className="font-display text-h2 font-semibold text-white">Your practice record</h2>
          {!historyLoaded ? (
            <div className="card card-pad mt-3">
              <p className="text-[13px] leading-5 text-neutral-600">Loading your sessions...</p>
              <div className="mt-4 space-y-2.5" aria-hidden="true">
                <div className="h-3 w-2/3 rounded bg-panel2" />
                <div className="h-3 w-1/2 rounded bg-panel2" />
                <div className="h-3 w-3/5 rounded bg-panel2" />
                <div className="h-3 w-2/5 rounded bg-panel2" />
              </div>
            </div>
          ) : analytics && latest ? (
            <div className="card card-pad mt-3">
              <dl className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <div>
                  <dt className="text-[13px] text-neutral-600">Sessions</dt>
                  <dd className="tnum mt-1 text-xl font-semibold text-white">{analytics.total}</dd>
                </div>
                <div>
                  <dt className="text-[13px] text-neutral-600">Average overall</dt>
                  <dd className="tnum mt-1 text-xl font-semibold text-white">{analytics.averageOverall}/10</dd>
                </div>
                <div>
                  <dt className="text-[13px] text-neutral-600">Practice streak</dt>
                  <dd className="tnum mt-1 text-xl font-semibold text-white">{analytics.streakDays} day{analytics.streakDays === 1 ? "" : "s"}</dd>
                </div>
                <div>
                  <dt className="text-[13px] text-neutral-600">Weakest area</dt>
                  <dd className="tnum mt-1 text-xl font-semibold text-white">{analytics.weakest ? `${analytics.weakest.name} · ${analytics.weakest.average}/10` : "Not yet"}</dd>
                </div>
              </dl>
              <div className="mt-4 grid gap-6 border-t border-line pt-4 lg:grid-cols-2">
                <div>
                  <div className="text-[13px] text-neutral-600">Last session</div>
                  <div className="mt-1 text-sm font-medium text-white">{sessionTitle(latest)}</div>
                  <div className="mt-0.5 text-[13px] text-neutral-600">
                    {`${new Date(latest.date).toLocaleDateString()} · Overall `}
                    <span className="tnum font-semibold text-white">{latestOverall}/10</span>
                    {trendDelta !== null && (
                      <span className={trendDelta >= 0 ? "font-medium text-accent" : "font-medium text-neutral-600"}>
                        {` · ${trendDelta >= 0 ? "+" : ""}${trendDelta} vs the one before`}
                      </span>
                    )}
                  </div>
                  <Link href="/interview/feedback" className="mt-1.5 inline-block text-[13px] font-semibold text-accent hover:underline">Open the feedback</Link>
                  <Link href="/progress" className="mt-4 block text-[13px] font-medium text-neutral-700 underline underline-offset-2 hover:text-white">
                    Progress page: trend, topics and this week&apos;s plan
                  </Link>
                </div>
                {chronological.length > 1 && (
                  <div>
                    <div className="text-[13px] text-neutral-600">
                      Overall score per session, numbered in the order you did them
                      {chartOffset > 0 && <> · Showing the most recent 30 of {chronological.length} sessions</>}
                    </div>
                    <div className="mt-2 flex gap-2 border-b border-line2">
                      {chartSessions.map((h) => {
                        const o = overallScore(h.scores);
                        return (
                          <div key={h.id} className="flex flex-1 flex-col items-center gap-1.5" title={`${o}/10`}>
                            <span className="tnum text-xs font-semibold leading-none text-neutral-700">{o}</span>
                            <div className="relative h-16 w-full rounded-t bg-panel2">
                              <div className={`absolute inset-x-0 bottom-0 rounded-t ${scoreBarClass(o)}`} style={{ height: `${o * 10}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-1.5 flex gap-2">
                      {chartSessions.map((h, i) => (
                        <span key={h.id} className="tnum flex-1 text-center text-xs leading-none text-neutral-600">{`#${chartOffset + i + 1}`}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="card card-pad mt-3">
              <h3 className="text-sm font-semibold text-white">No sessions yet</h3>
              <p className="mt-2 max-w-2xl text-[13px] leading-5 text-neutral-600">
                Your practice record appears here after your first session: scores, streak and weakest areas, computed from the
                sessions stored in this browser.
              </p>
              <ol className="mt-4 space-y-3.5">
                {firstSteps.map((step, i) => (
                  <li key={step} className="flex items-baseline gap-3 text-[13px] leading-5 text-neutral-600">
                    <span className="tnum flex h-5 w-5 shrink-0 translate-y-0.5 items-center justify-center rounded-full border border-line2 text-[11px] font-semibold text-neutral-700">{i + 1}</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </section>

        {history.length > 0 && (
          <section className="mt-10">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-display text-h2 font-semibold text-white">Session history</h2>
              <Link href="/progress" className="text-[13px] font-medium text-neutral-700 underline underline-offset-2 hover:text-white">Progress page</Link>
            </div>
            <div className="card mt-3 divide-y divide-line">
              {history.map((h) => (
                <div key={h.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 text-sm">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 truncate font-medium text-white">
                      <span className="truncate">{sessionTitle(h)}</span>
                      <span className={`badge ${h.difficulty === "Easy" ? "badge-easy" : h.difficulty === "Hard" ? "badge-hard" : "badge-mid"}`}>{h.difficulty}</span>
                      {h.companyName && <span className="badge badge-accent">{h.companyName}</span>}
                      {h.resumeInterview && <span className="badge">Resume</span>}
                      {h.incomplete && <span className="badge badge-mid">Incomplete</span>}
                    </div>
                    <div className="mt-0.5 text-xs text-neutral-600">{`${new Date(h.date).toLocaleString()} · ${Math.round(h.timeSec / 60)} min${h.targetSec ? ` of ${Math.round(h.targetSec / 60)} target` : ""}${h.interviewerName ? ` · Interviewer: ${h.interviewerName}` : ""}`}</div>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-neutral-600">
                    {h.type === "technical" && (
                      <span>Tests <span className="tnum font-semibold text-white">{h.testsPassed}/{h.totalTests}</span></span>
                    )}
                    {(h.hintsUsed ?? 0) > 0 && <span>Hints <span className="tnum font-semibold text-white">{h.hintsUsed}</span></span>}
                    <span>Problem Solving <span className="tnum font-semibold text-white">{h.scores.problemSolving}/10</span></span>
                    <span>Overall <span className="tnum font-semibold text-white">{overallScore(h.scores)}/10</span></span>
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs text-neutral-600">History is stored only in this browser.</p>
          </section>
        )}

        <Footer />
      </main>
    </div>
  );
}
