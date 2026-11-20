"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { topics } from "@/lib/problems";
import { INTERVIEWERS } from "@/lib/interviewers";
import { buildResumeQuestionsLocal, postResumeQuestions, RESUME_QUESTIONS_KEY, RESUME_STORAGE_KEY } from "@/lib/resume";
import { markFreshStart } from "@/lib/activeSession";
import CompanySelect from "@/components/CompanySelect";

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
    <div className="card card-pad">
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
              <span className="block text-sm font-medium text-neutral-900">{p.name}</span>
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
            className="input mt-2 resize-y leading-6"
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

      <button type="button" onClick={start} disabled={resumeBusy} className="btn btn-primary mt-5 h-12 w-full text-[15px]">
        {type === "resume" ? (resumeBusy ? "Building your questions..." : "Start resume interview") : "Start interview"}
      </button>
      <p className="mt-4 border-t border-line pt-3 text-[13px] leading-5 text-neutral-600">
        {type === "resume"
          ? "Your resume stays in this browser, stored only on this device. It is sent once, only to build your questions."
          : "Works best in Chrome. Allow camera and mic when asked. No account needed."}
      </p>
    </div>
  );
}
