import type { Msg } from "./interviewer";
import type { ResumeQuestion } from "./resume";
import type { Lang } from "./problems";
import type { RunOutput } from "./runner";

export interface GeneralResumeState {
  v: 1;
  room: "general";
  fingerprint: string;
  sessionId: string;
  savedAt: number;
  startedAt: number;
  phase: "intro" | "main" | "candidate" | "done";
  qIndex: number;
  stage: number;
  transcript: Msg[];
  qset: ResumeQuestion[];
  stats: {
    answers: number;
    words: number;
    thin: number;
    followUpsAsked: number;
    followUpsAnswered: number;
    introPushes: number;
    askedEnd: boolean;
  };
  intro: string;
  qa: { question: string; answer?: string; target?: string }[];
  engine: "gemini" | "local" | null;
}

export interface TechnicalResumeState {
  v: 1;
  room: "technical";
  fingerprint: string;
  sessionId: string;
  savedAt: number;
  startedAt: number;
  problemId: string;
  phase: "opening" | "clarifying" | "approach" | "coding" | "dryrun" | "review" | "candidate" | "done";
  transcript: Msg[];
  lang: Lang;
  codeByLang: Record<Lang, string>;
  stats: {
    asked: number;
    answered: number;
    hints: number;
    approachAttempts: number;
    introPushes: number;
    clarifyingCount: number;
    dryRunPushes: number;
    dryRunDone: boolean;
    askedEnd: boolean;
  };
  intro: string;
  approach: string;
  complexity: { answer: string; correct: boolean | null };
  statedComplexity: { answer: string; correct: boolean } | null;
  runs: number;
  runOut: RunOutput | null;
  submitOut: RunOutput | null;
  lastKind: "run" | "submit" | null;
  pendingQ: boolean;
  askedQuestions: string[];
  engine: "gemini" | "local" | null;
}

type AnyResumeState = GeneralResumeState | TechnicalResumeState;

const MAX_AGE_MS = 24 * 60 * 60 * 1000;
const key = (room: "general" | "technical") => `interviewai-resume-${room}`;

function isMsgArray(value: unknown): value is Msg[] {
  return (
    Array.isArray(value) &&
    value.every(
      (m) =>
        !!m &&
        typeof m === "object" &&
        typeof (m as Msg).text === "string" &&
        ((m as Msg).role === "ai" || (m as Msg).role === "user" || (m as Msg).role === "system")
    )
  );
}

function isRunOutput(value: unknown): value is RunOutput | null {
  if (value === null) return true;
  if (!value || typeof value !== "object") return false;
  const o = value as RunOutput;
  return typeof o.passed === "number" && typeof o.total === "number" && Array.isArray(o.results);
}

function readState(room: "general" | "technical"): AnyResumeState | null {
  try {
    const raw = localStorage.getItem(key(room));
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const s = parsed as Partial<AnyResumeState>;
    if (s.v !== 1 || s.room !== room) return null;
    if (typeof s.fingerprint !== "string" || typeof s.sessionId !== "string") return null;
    if (typeof s.savedAt !== "number" || typeof s.startedAt !== "number") return null;
    if (Date.now() - s.savedAt > MAX_AGE_MS) return null;
    if (!isMsgArray(s.transcript) || s.transcript.length === 0) return null;
    return s as AnyResumeState;
  } catch {
    return null;
  }
}

export function loadGeneralResume(fingerprint: string): GeneralResumeState | null {
  const s = readState("general");
  if (!s || s.room !== "general") return null;
  if (s.fingerprint !== fingerprint) {
    clearResumeState("general");
    return null;
  }
  if (!["intro", "main", "candidate", "done"].includes(s.phase)) return null;
  if (typeof s.qIndex !== "number" || typeof s.stage !== "number") return null;
  if (!Array.isArray(s.qset) || !s.qset.length) return null;
  if (!s.stats || typeof s.stats !== "object" || !Array.isArray(s.qa)) return null;
  return s;
}

export function loadTechnicalResume(fingerprint: string, problemId: string): TechnicalResumeState | null {
  const s = readState("technical");
  if (!s || s.room !== "technical") return null;
  if (s.fingerprint !== fingerprint || s.problemId !== problemId) {
    clearResumeState("technical");
    return null;
  }
  if (!["opening", "clarifying", "approach", "coding", "dryrun", "review", "candidate", "done"].includes(s.phase)) return null;
  if (!s.codeByLang || typeof s.codeByLang !== "object" || typeof s.codeByLang.javascript !== "string") return null;
  if (!s.stats || typeof s.stats !== "object") return null;
  if (!isRunOutput(s.runOut) || !isRunOutput(s.submitOut)) return null;
  return s;
}

export function saveResumeState(state: AnyResumeState) {
  try {
    localStorage.setItem(key(state.room), JSON.stringify(state));
  } catch {}
}

export function clearResumeState(room: "general" | "technical") {
  try {
    localStorage.removeItem(key(room));
  } catch {}
}
