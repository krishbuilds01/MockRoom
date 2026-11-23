"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { topics } from "@/lib/problems";
import { INTERVIEWERS } from "@/lib/interviewers";
import { buildResumeQuestionsLocal, postResumeQuestions, RESUME_QUESTIONS_KEY, RESUME_STORAGE_KEY } from "@/lib/resume";
import { markFreshStart } from "@/lib/activeSession";
import CompanySelect from "@/components/CompanySelect";

const labelCls = "text-[13px] font-medium text-neutral-600";
const segBtn =
  "flex h-11 w-full items-center justify-center rounded-[10px] border px-3 text-sm transition focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2";
const segOn = `${segBtn} border-accent bg-accent font-medium text-[#131315] hover:bg-accent-strong`;
const segOff = `${segBtn} border-line bg-panel2 text-neutral-700 hover:border-line2 hover:text-neutral-900`;
const pickerBtn =
  "min-h-11 rounded-[10px] border px-3.5 py-2.5 text-left transition focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2";

export default function SetupForm() {
  const router = useRouter();
  const [type, setType] = useState<"general" | "technical" | "resume">("technical");
  const [difficulty, setDifficulty] = useState("Mid");
  const [companyId, setCompanyId] = useState("any");
  const [topic, setTopic] = useState("HashMap");
  const [interviewerId, setInterviewerId] = useState("maya");
  const [resumeText, setResumeText] = useState("");
  const [resumeSaved, setResumeSaved] = useState(false);
  const [resumeBusy, setResumeBusy] = useState(false);
  const [resumeError, setResumeError] = useState("");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(RESUME_STORAGE_KEY);
      if (saved) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
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

  return (
    <div className="card p-6 sm:p-7">
      <div>
        <div className={labelCls}>Format</div>
        <div className="mt-2 grid grid-cols-3 gap-2" role="group" aria-label="Interview format">
          <button type="button" onClick={() => setType("technical")} aria-pressed={type === "technical"} className={type === "technical" ? segOn : segOff}>Technical</button>
          <button type="button" onClick={() => setType("general")} aria-pressed={type === "general"} className={type === "general" ? segOn : segOff}>Live voice</button>
          <button type="button" onClick={() => setType("resume")} aria-pressed={type === "resume"} className={type === "resume" ? segOn : segOff}>My resume</button>
        </div>
      </div>
      <div className="mt-6">
        <div className={labelCls}>Interviewer</div>
        <div className="mt-2 grid grid-cols-2 gap-2" role="group" aria-label="Interviewer">
          {INTERVIEWERS.map((p) => (
            <button
              type="button"
              key={p.id}
              onClick={() => setInterviewerId(p.id)}
              aria-pressed={interviewerId === p.id}
              className={
                interviewerId === p.id
                  ? `${pickerBtn} border-accent bg-accent-soft`
                  : `${pickerBtn} border-line bg-panel2 hover:border-line2`
              }
            >
              <span className="block text-sm font-medium text-neutral-900">{p.name}</span>
              <span className="block text-xs text-neutral-500">{p.gender} interviewer</span>
            </button>
          ))}
        </div>
      </div>
      <div className="mt-6">
        <div className={labelCls}>Difficulty</div>
        <div className="mt-2 grid grid-cols-3 gap-2" role="group" aria-label="Difficulty">
          {["Easy", "Mid", "Hard"].map((d) => (
            <button type="button" key={d} onClick={() => setDifficulty(d)} aria-pressed={difficulty === d} className={difficulty === d ? segOn : segOff}>{d}</button>
          ))}
        </div>
      </div>
      <div className="mt-6">
        <div id="company-label" className={labelCls}>Company</div>
        <div className="mt-2" aria-labelledby="company-label">
          <CompanySelect value={companyId} onChange={setCompanyId} />
        </div>
      </div>
      {type === "technical" && (
        <div className="mt-6">
          <div className={labelCls}>Topic</div>
          <div className="mt-2 grid grid-cols-3 gap-2" role="group" aria-label="Topic">
            {topics.map((t) => (
              <button type="button" key={t} onClick={() => setTopic(t)} aria-pressed={topic === t} className={topic === t ? segOn : segOff}>{t}</button>
            ))}
          </div>
        </div>
      )}
      {type === "resume" && (
        <div className="mt-6">
          <label htmlFor="resume-text" className={labelCls}>Your resume</label>
          <textarea
            id="resume-text"
            value={resumeText}
            onChange={(e) => setResumeText(e.target.value)}
            rows={6}
            placeholder="Paste your resume here: projects, skills, experience. Plain text works best."
            className="input mt-2 resize-y leading-6"
          />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <label className="btn btn-ghost cursor-pointer">
              Upload .txt or .md
              <input type="file" accept=".txt,.md,text/plain,text/markdown" onChange={onResumeFile} className="sr-only" />
            </label>
            {resumeSaved && (
              <button type="button" onClick={deleteSavedResume} className="btn btn-ghost">Delete saved resume</button>
            )}
          </div>
          {resumeError && <p className="mt-2 text-xs leading-5 text-red-600" role="alert">{resumeError}</p>}
        </div>
      )}

      <button type="button" onClick={start} disabled={resumeBusy} className="btn btn-primary mt-8 h-12 w-full text-[15px]">
        {type === "resume" ? (resumeBusy ? "Building your questions..." : "Start resume interview") : "Start interview"}
      </button>
      <p className="mt-3 text-[13px] leading-5 text-neutral-500">
        {type === "resume"
          ? "Your resume stays in this browser, stored only on this device. It is sent once, only to build your questions."
          : "Works best in Chrome. Allow camera and mic when asked."}
      </p>
    </div>
  );
}
