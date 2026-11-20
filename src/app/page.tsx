"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { topics } from "@/lib/problems";
import { INTERVIEWERS, getInterviewer } from "@/lib/interviewers";
import { buildResumeQuestionsLocal, postResumeQuestions, RESUME_QUESTIONS_KEY, RESUME_STORAGE_KEY } from "@/lib/resume";
import { loadHistory } from "@/lib/analytics";
import { markFreshStart } from "@/lib/activeSession";
import { scoreBarClass } from "@/lib/scoreColor";
import { overallScore, type SessionRecord } from "@/lib/interviewer";
import Logo from "@/components/Logo";
import CompanySelect from "@/components/CompanySelect";
import Footer from "@/components/Footer";

function FeatureIcon({ name }: { name: string }) {
  const common = {
    width: 20,
    height: 20,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  if (name === "mic")
    return (
      <svg {...common}>
        <path d="M12 3a3 3 0 0 1 3 3v5a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3Z" />
        <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
      </svg>
    );
  if (name === "code")
    return (
      <svg {...common}>
        <path d="m8 8-4 4 4 4M16 8l4 4-4 4" />
      </svg>
    );
  return (
    <svg {...common}>
      <path d="M5 20v-6M11 20V6M17 20v-9M3 20h18" />
    </svg>
  );
}

export default function Home() {
  const router = useRouter();
  const [type, setType] = useState<"general" | "technical" | "resume">("technical");
  const [difficulty, setDifficulty] = useState("Mid");
  const [companyId, setCompanyId] = useState("any");
  const [topic, setTopic] = useState("HashMap");
  const [interviewerId, setInterviewerId] = useState("maya");
  const interviewer = getInterviewer(interviewerId);
  const features = [
    {
      icon: "mic",
      title: "Live voice interview",
      text: `${interviewer.name} speaks and listens like a person, and pushes back when an answer is thin.`,
    },
    {
      icon: "code",
      title: `${interviewer.name} watches your code`,
      text: `In the coding room ${interviewer.name} reads your code as you write it, deletions included, and asks about the lines that matter.`,
    },
    {
      icon: "chart",
      title: "Feedback that teaches",
      text: "Scores, phase by phase notes, your weak areas, and the exact problems to practise next.",
    },
  ];
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
      setResumeError("Paste a little more of your resume. A few lines about your projects and skills is enough to build real questions from.");
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
  const chronological = [...history].reverse();
  const latestOverall = history.length ? overallScore(history[0].scores) : null;
  const previousOverall = history.length > 1 ? overallScore(history[1].scores) : null;
  const trendDelta = latestOverall !== null && previousOverall !== null ? Math.round((latestOverall - previousOverall) * 10) / 10 : null;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[1120px] flex-col px-5">
      <nav className="flex h-16 shrink-0 items-center justify-between border-b border-line">
        <Logo />
        <div className="flex items-center gap-5 text-sm text-stone-600">
          <Link href="/progress" className="hover:text-stone-900">Progress</Link>
          <Link href="/interview/feedback" className="hover:text-stone-900">Latest feedback</Link>
        </div>
      </nav>

      <section className="grid gap-8 pt-8 lg:grid-cols-[640px_400px] lg:justify-between">
        <div className="flex h-full flex-col">
          <div>
            <span className="badge badge-live">
              <span className="dot dot-pulse bg-emerald-600" />
              Live voice interview practice
            </span>
            <h1 className="mt-4 font-display text-display font-semibold text-stone-900">
              Practice a real interview.
              <br />
              With an AI that pushes back.
            </h1>
            <p className="mt-4 max-w-xl text-[15px] leading-6 text-stone-600">
              One on one with {interviewer.name}, a strict AI interviewer who talks and listens like a person, watches your code as you write it,
              challenges vague answers, and records every hint. Every session ends with feedback that teaches: phase by phase notes,
              your weak areas, and the exact problems to do next.
            </p>
          </div>
          <ol className="mt-8 space-y-3.5">
            {[
              "Set up in ten seconds: mode, difficulty, company and topic.",
              `Interview with ${interviewer.name}: introduction, questions, live coding, then your questions for ${interviewer.objectPronoun}.`,
              "Get scored feedback with phase by phase notes and a plan for what to fix next.",
            ].map((step, i) => (
              <li key={step} className="flex items-baseline gap-3 text-sm leading-6 text-stone-600">
                <span className="tnum flex h-5 w-5 shrink-0 translate-y-0.5 items-center justify-center rounded-full border border-line2 text-[11px] font-semibold text-stone-700">{i + 1}</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
          <div className="mt-auto pt-8">
            <p className="border-t border-line pt-4 text-sm text-stone-600">
              {history.length > 0 && latestOverall !== null ? (
                <>
                  Latest session <span className="tnum font-semibold text-stone-900">{latestOverall}/10</span>
                  {` · ${history.length} session${history.length === 1 ? "" : "s"} on this device · `}
                  <Link href="/progress" className="font-medium text-stone-900 underline underline-offset-2">See your progress</Link>
                </>
              ) : (
                "Scored on problem solving, coding, communication and complexity, with a plan for what to fix next."
              )}
            </p>
          </div>
        </div>

        <div>
          <section className="card card-hero card-pad" aria-label="Start an interview">
            <div className="text-sm font-semibold">Start an interview</div>
            <div className="mt-4 space-y-4">
              <div>
                <div className="text-[13px] font-medium text-stone-700">Mode</div>
                <div className="mt-2 grid grid-cols-3 gap-2" role="group" aria-label="Interview mode">
                  <button type="button" onClick={() => setType("technical")} aria-pressed={type === "technical"} className={type === "technical" ? "btn btn-primary btn-sm w-full" : "btn btn-ghost btn-sm w-full"}>Technical</button>
                  <button type="button" onClick={() => setType("general")} aria-pressed={type === "general"} className={type === "general" ? "btn btn-primary btn-sm w-full" : "btn btn-ghost btn-sm w-full"}>Live voice</button>
                  <button type="button" onClick={() => setType("resume")} aria-pressed={type === "resume"} className={type === "resume" ? "btn btn-primary btn-sm w-full" : "btn btn-ghost btn-sm w-full"}>My resume</button>
                </div>
              </div>
              <div>
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
              <div>
                <div className="text-[13px] font-medium text-stone-700">Difficulty</div>
                <div className="mt-2 grid grid-cols-3 gap-2" role="group" aria-label="Difficulty">
                  {["Easy", "Mid", "Hard"].map((d) => (
                    <button type="button" key={d} onClick={() => setDifficulty(d)} aria-pressed={difficulty === d} className={difficulty === d ? "btn btn-primary btn-sm w-full" : "btn btn-ghost btn-sm w-full"}>{d}</button>
                  ))}
                </div>
              </div>
              <div>
                <div id="company-label" className="text-[13px] font-medium text-stone-700">Company</div>
                <div aria-labelledby="company-label">
                  <CompanySelect value={companyId} onChange={setCompanyId} />
                </div>
              </div>
              {type === "technical" && (
                <div>
                  <div className="text-[13px] font-medium text-stone-700">Topic</div>
                  <div className="mt-2 grid grid-cols-3 gap-2" role="group" aria-label="Topic">
                    {topics.map((t) => (
                      <button type="button" key={t} onClick={() => setTopic(t)} aria-pressed={topic === t} className={topic === t ? "btn btn-primary btn-sm w-full" : "btn btn-ghost btn-sm w-full"}>{t}</button>
                    ))}
                  </div>
                </div>
              )}
              {type === "resume" && (
                <div>
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

            <button type="button" onClick={start} disabled={resumeBusy} className="btn btn-accent mt-4 h-[52px] w-full rounded-xl text-[15px] font-semibold">
              {type === "resume" ? (resumeBusy ? "Building your questions..." : "Start resume interview") : "Start interview"}
            </button>
            <p className="mt-4 border-t border-line pt-3 text-[13px] leading-5 text-stone-600">
              {type === "resume"
                ? "Your resume stays in this browser, stored only on this device. It is sent once, only to generate your questions."
                : "Works best in Chrome. Allow camera and mic when asked. No account needed."}
            </p>
          </section>

          <Link href="/system-design" className="card card-pad mt-4 flex items-center justify-between gap-3 transition hover:border-line2">
            <span>
              <span className="block text-sm font-semibold">System design</span>
              <span className="mt-0.5 block text-[13px] text-stone-600">URL shortener, chat system, news feed. See what the room will cover.</span>
            </span>
            <span className="badge badge-mid shrink-0">Coming soon</span>
          </Link>
        </div>
      </section>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {features.map((f) => (
          <div key={f.title} className="card card-pad">
            <span className="text-accent"><FeatureIcon name={f.icon} /></span>
            <div className="mt-3 text-sm font-semibold">{f.title}</div>
            <p className="mt-1.5 text-[13px] leading-5 text-stone-600">{f.text}</p>
          </div>
        ))}
      </div>

      {history.length > 0 && (
        <section id="progress" className="mt-8">
          <div className="flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:items-baseline sm:justify-between sm:gap-2">
            <h2 className="font-display text-h2 font-semibold">Your progress</h2>
            {latestOverall !== null && (
              <div className="text-xs text-stone-600">
                {`Latest overall: `}
                <span className="tnum font-semibold text-stone-900">{latestOverall}/10</span>
                {trendDelta !== null && (
                  <span className={trendDelta >= 0 ? "ml-2 font-medium text-emerald-700" : "ml-2 font-medium text-red-600"}>
                    {`${trendDelta >= 0 ? "+" : ""}${trendDelta} vs previous session`}
                  </span>
                )}
              </div>
            )}
          </div>
          <p className="mt-1.5 text-xs text-stone-600">
            After a session, your feedback is ready here: <Link href="/interview/feedback" className="text-stone-700 underline underline-offset-2 hover:text-stone-900">open latest feedback</Link>
          </p>
          {chronological.length > 1 && (
            <div className="card mt-3 p-4">
              <div className="flex gap-2 border-b border-line2">
                {chronological.slice(-14).map((h) => {
                  const o = overallScore(h.scores);
                  return (
                    <div key={h.id} className="flex flex-1 flex-col items-center gap-2" title={`${o}/10`}>
                      <span className="tnum text-xs font-semibold leading-none text-stone-700">{o}</span>
                      <div className="relative h-24 w-full rounded-t bg-panel2">
                        <div className={`absolute inset-x-0 bottom-0 rounded-t ${scoreBarClass(o)}`} style={{ height: `${o * 10}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-2 flex gap-2">
                {chronological.slice(-14).map((h) => {
                  const d = new Date(h.date);
                  return (
                    <span key={h.id} className="flex-1 text-center text-xs leading-none text-stone-600">{`${d.getDate()}/${d.getMonth() + 1}`}</span>
                  );
                })}
              </div>
            </div>
          )}
          <div className="card mt-3 divide-y divide-line">
            {history.map((h) => (
              <div key={h.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 text-sm">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 truncate font-medium">
                    <span className="truncate">{h.type === "technical" ? h.problemTitle || "Technical interview" : "Live AI Interview"}</span>
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
          <p className="mt-2 text-xs text-stone-600">Bars show overall score per session out of 10, oldest to newest. History is stored only in this browser.</p>
        </section>
      )}

      <Footer />
    </main>
  );
}
