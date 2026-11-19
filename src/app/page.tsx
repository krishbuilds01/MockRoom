"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { topics } from "@/lib/problems";
import { companies, getCompany } from "@/lib/companies";
import { buildResumeQuestionsLocal, postResumeQuestions, RESUME_QUESTIONS_KEY, RESUME_STORAGE_KEY } from "@/lib/resume";
import { loadHistory } from "@/lib/analytics";
import { overallScore, type SessionRecord } from "@/lib/interviewer";

const diffInfo: Record<string, string> = {
  Easy: "Foundations, strict about specifics, one small hint allowed, target about 20 min",
  Mid: "Real interview level, deep follow-ups, hints only when asked and recorded, target about 30 min",
  Hard: "Very strict interviewer, no hints, brute force gets sent back, pushes on trade-offs and optimisation, target about 45 min",
};

const features = [
  {
    title: "Live voice interview",
    text: "Alex, your interviewer, speaks with a natural Gemini voice and listens while you answer. A Gemini Live conversation mode is there too, marked experimental.",
  },
  {
    title: "Code watching AI",
    text: "In the technical room the interviewer reads your code as you write it, including deletions, and stops you to explain the lines it picks.",
  },
  {
    title: "Strict, honest feedback",
    text: "Thin answers get pushed back in the room. After it, you get scores, phase by phase notes, weak areas and the exact problems to do next.",
  },
];


export default function Home() {
  const router = useRouter();
  const [type, setType] = useState<"general" | "technical" | "resume">("technical");
  const [difficulty, setDifficulty] = useState("Mid");
  const [companyId, setCompanyId] = useState("any");
  const [topic, setTopic] = useState("HashMap");
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

  function start() {
    if (type === "resume") {
      void startResume();
      return;
    }
    if (type === "technical") {
      const q = new URLSearchParams({ difficulty, topic });
      if (companyId !== "any") q.set("company", companyId);
      router.push(`/interview/technical?${q}`);
    } else {
      const q = new URLSearchParams({ difficulty });
      if (companyId !== "any") q.set("company", companyId);
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
    const result = (await postResumeQuestions(text)) || { questions: buildResumeQuestionsLocal(text), engine: "local" as const };
    try {
      sessionStorage.setItem(RESUME_QUESTIONS_KEY, JSON.stringify(result.questions));
      localStorage.setItem(RESUME_STORAGE_KEY, text);
    } catch {}
    const q = new URLSearchParams({ difficulty, resume: "1" });
    if (companyId !== "any") q.set("company", companyId);
    router.push(`/interview/general?${q}`);
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
  const company = getCompany(companyId);

  const chronological = [...history].reverse();
  const latestOverall = history.length ? overallScore(history[0].scores) : null;
  const previousOverall = history.length > 1 ? overallScore(history[1].scores) : null;
  const trendDelta = latestOverall !== null && previousOverall !== null ? Math.round((latestOverall - previousOverall) * 10) / 10 : null;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col px-5">
      <nav className="flex h-16 shrink-0 items-center justify-between border-b border-line">
        <div className="flex items-center gap-2.5">
          <span className="avatar" style={{ width: "2rem", height: "2rem", fontSize: "0.8rem" }}>A</span>
          <span className="font-display text-lg font-semibold tracking-tight">InterviewAI</span>
        </div>
        <div className="flex items-center gap-5 text-sm text-stone-600">
          <a href="#progress" className="hidden hover:text-stone-900 sm:block">Your progress</a>
          <Link href="/progress" className="hover:text-stone-900">Progress</Link>
          <Link href="/interview/feedback" className="hover:text-stone-900">Latest feedback</Link>
        </div>
      </nav>

      <section className="grid shrink-0 items-start gap-6 pt-6 lg:grid-cols-[1.1fr_1fr] lg:pt-8">
        <div>
          <span className="badge badge-live">
            <span className="dot dot-pulse bg-emerald-600" />
            Live voice interview practice
          </span>
          <h1 className="mt-4 font-display text-display font-semibold">
            Practice a real interview.
            <br />
            <span className="text-stone-600">With an AI that pushes back.</span>
          </h1>
          <p className="mt-4 max-w-xl text-[15px] leading-6 text-stone-600">
            One on one with Alex, a strict AI interviewer who talks and listens like a person, watches your code as you write it,
            challenges vague answers, and records every hint. Every session ends with feedback that teaches: phase by phase notes,
            your weak areas, and the exact problems to do next.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {features.map((f) => (
              <div key={f.title} className="card card-pad">
                <div className="text-sm font-semibold">{f.title}</div>
                <p className="mt-1.5 text-[13px] leading-5 text-stone-600">{f.text}</p>
              </div>
            ))}
          </div>
        </div>

        <section className="card card-hero card-pad" aria-label="Start an interview">
          <div className="text-sm font-semibold">Start an interview</div>
          <div className="mt-4 grid gap-3">
            <button type="button" onClick={() => setType("technical")} aria-pressed={type === "technical"} className={`rounded-xl border p-3.5 text-left transition ${type === "technical" ? "border-accent bg-accent-soft" : "border-line bg-panel2 hover:border-line2"}`}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">Technical / Coding</span>
                <span className="badge">Monaco editor</span>
              </div>
              <p className="mt-1.5 text-[13px] leading-5 text-stone-600">LeetCode style room. Run and submit against real tests while Alex watches your code live.</p>
            </button>
            <button type="button" onClick={() => setType("general")} aria-pressed={type === "general"} className={`rounded-xl border p-3.5 text-left transition ${type === "general" ? "border-accent bg-accent-soft" : "border-line bg-panel2 hover:border-line2"}`}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">Live AI Interview</span>
                <span className="badge">Voice first</span>
              </div>
              <p className="mt-1.5 text-[13px] leading-5 text-stone-600">Behavioural and conceptual questions, spoken answers, strict follow-ups when answers are thin.</p>
            </button>
            <button type="button" onClick={() => setType("resume")} aria-pressed={type === "resume"} className={`rounded-xl border p-3.5 text-left transition ${type === "resume" ? "border-accent bg-accent-soft" : "border-line bg-panel2 hover:border-line2"}`}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">Interview on my resume</span>
                <span className="badge">Your projects</span>
              </div>
              <p className="mt-1.5 text-[13px] leading-5 text-stone-600">Paste your resume and Alex interviews you on it: your projects, your listed skills, and the choices you wrote down.</p>
            </button>
          </div>

          {type === "resume" && (
            <div className="mt-4">
              <label htmlFor="resume-text" className="text-[13px] font-medium text-stone-700">Your resume text</label>
              <textarea
                id="resume-text"
                value={resumeText}
                onChange={(e) => setResumeText(e.target.value)}
                rows={6}
                placeholder="Paste your resume here: projects, skills, experience. Plain text works best."
                className="input mt-2.5 resize-none leading-6"
              />
              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                <label className="btn btn-ghost btn-sm cursor-pointer">
                  Upload .txt or .md
                  <input type="file" accept=".txt,.md,text/plain,text/markdown" onChange={onResumeFile} className="sr-only" />
                </label>
                {resumeSaved && (
                  <button type="button" onClick={deleteSavedResume} className="btn btn-ghost btn-sm">Delete saved resume</button>
                )}
              </div>
              {resumeError && <p className="mt-2.5 text-xs leading-5 text-red-600" role="alert">{resumeError}</p>}
              <p className="mt-2.5 text-xs leading-5 text-stone-600">
                Your resume stays in this browser. It is sent once, only to generate your questions, and it is stored only on this device. Delete it any time.
              </p>
            </div>
          )}

          <div className="mt-5 text-[13px] font-medium text-stone-700">Difficulty</div>
          <div className="mt-2.5 flex flex-wrap gap-2" role="group" aria-label="Difficulty">
            {["Easy", "Mid", "Hard"].map((d) => (
              <button type="button" key={d} onClick={() => setDifficulty(d)} aria-pressed={difficulty === d} className={difficulty === d ? "btn btn-primary btn-sm" : "btn btn-ghost btn-sm"}>{d}</button>
            ))}
          </div>
          <p className="mt-2.5 text-xs leading-5 text-stone-600">{diffInfo[difficulty]}</p>

          <div className="mt-5 text-[13px] font-medium text-stone-700">Company</div>
          <select value={companyId} onChange={(e) => setCompanyId(e.target.value)} className="select mt-2.5 w-full" aria-label="Company">
            {companies.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <p className="mt-2.5 text-xs leading-5 text-stone-600">
            {company.id === "any" ? "A standard loop. Pick a company and Alex runs the session in that company's style, with its questions and its bar." : company.style}
          </p>

          {type === "technical" && (
            <>
              <div className="mt-5 text-[13px] font-medium text-stone-700">Topic</div>
              <div className="mt-2.5 flex flex-wrap gap-2" role="group" aria-label="Topic">
                {topics.map((t) => (
                  <button type="button" key={t} onClick={() => setTopic(t)} aria-pressed={topic === t} className={topic === t ? "btn btn-primary btn-sm" : "btn btn-ghost btn-sm"}>{t}</button>
                ))}
              </div>
              <p className="mt-2.5 text-xs leading-5 text-stone-600">If a topic has no problem at your difficulty yet, the room serves the closest one and says so.</p>
            </>
          )}

          <button type="button" onClick={start} disabled={resumeBusy} className="btn btn-accent mt-5 w-full py-3 text-[15px] font-semibold">
            {type === "resume" ? (resumeBusy ? "Building your questions..." : "Start resume interview") : "Start Interview"}
          </button>
          <p className="mt-3 text-center text-xs text-stone-600">Works best in Chrome. Allow camera and mic when asked. No sign up needed.</p>
        </section>
      </section>

      <p className="mt-5 shrink-0 text-[13px] leading-5 text-stone-600">How it works: set up in ten seconds, interview with Alex (introduction, questions, coding, your questions), then get scored feedback with a practice plan.</p>

      {history.length > 0 && (
        <section id="progress" className="mt-8">
          <div className="flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:items-baseline sm:justify-between sm:gap-2">
            <h2 className="font-display text-h2 font-semibold">Your progress</h2>
            {latestOverall !== null && (
              <div className="text-xs text-stone-600">
                {`Latest overall: `}
                <span className="font-semibold text-stone-900">{latestOverall}/10</span>
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
              <div className="flex h-28 items-end gap-1.5 border-b border-line pb-0">
                {chronological.slice(-14).map((h) => {
                  const o = overallScore(h.scores);
                  const d = new Date(h.date);
                  return (
                    <div key={h.id} className="flex h-full min-w-2 flex-1 flex-col items-center justify-end gap-1" title={`${o}/10 on ${d.toLocaleDateString()}`}>
                      <span className="text-xs font-semibold leading-none text-stone-700">{o}</span>
                      <div className="w-full rounded-t bg-accent/80" style={{ height: `${Math.max(6, o * 8)}%` }} />
                      <span className="text-xs leading-none text-stone-600">{`${d.getDate()}/${d.getMonth() + 1}`}</span>
                    </div>
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
                  <div className="mt-0.5 text-xs text-stone-600">{`${new Date(h.date).toLocaleString()} · ${Math.round(h.timeSec / 60)} min${h.targetSec ? ` of ${Math.round(h.targetSec / 60)} target` : ""}`}</div>
                </div>
                <div className="flex items-center gap-4 text-xs text-stone-600">
                  {h.type === "technical" && (
                    <span>Tests <span className="font-semibold text-stone-900">{h.testsPassed}/{h.totalTests}</span></span>
                  )}
                  {(h.hintsUsed ?? 0) > 0 && <span>Hints <span className="font-semibold text-stone-900">{h.hintsUsed}</span></span>}
                  <span>Problem Solving <span className="font-semibold text-stone-900">{h.scores.problemSolving}/10</span></span>
                  <span>Overall <span className="font-semibold text-stone-900">{overallScore(h.scores)}/10</span></span>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-2 shrink-0 text-xs text-stone-600">Bars show overall score per session, oldest to newest. History is stored only in this browser.</p>
        </section>
      )}

      <footer className="mt-8 shrink-0 border-t border-line py-4 text-xs leading-5 text-stone-600">
        InterviewAI, strict AI interview practice. Code runs via the Judge0 API. Interviews are led by the interview engine (Gemini, with a local engine as fallback) and spoken with a Gemini voice; Gemini Live conversation is an optional experimental mode in the Live AI Interview room.
      </footer>
    </main>
  );
}
