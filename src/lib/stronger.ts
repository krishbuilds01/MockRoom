import { wordCount, type SessionRecord } from "./interviewer";
import { computeDelivery, type StarCheck } from "./delivery";
import { pushSession } from "./sync";

export interface StrongerAnswer {
  label: string;
  question: string;
  original: string;
  stronger: string;
}

export interface WeakPick {
  label: string;
  question: string;
  answer: string;
}

const MIN_WORDS = 5;

interface Candidate extends WeakPick {
  tier: number;
  missing: number;
  words: number;
}

function starMissing(star: StarCheck | null | undefined): number {
  if (!star) return 0;
  return [star.situation, star.task, star.action, star.result].filter((v) => !v).length;
}

function rank(cands: Candidate[]): WeakPick[] {
  return cands
    .sort((a, b) => a.tier - b.tier || b.missing - a.missing || a.words - b.words)
    .slice(0, 2)
    .map((c) => ({ label: c.label, question: c.question, answer: c.answer }));
}

function generalPicks(rec: SessionRecord): WeakPick[] {
  const answered = (rec.qaPairs ?? []).filter((p) => p.answer && p.answer.trim());
  if (!answered.length) return [];
  const delivery = rec.delivery ?? computeDelivery(rec);
  const cands: Candidate[] = [];
  answered.slice(0, 5).forEach((p, i) => {
    const answer = (p.answer as string).trim();
    const words = wordCount(answer);
    if (words < MIN_WORDS) return;
    const d = delivery?.answers[i];
    const missing = starMissing(d?.star);
    const tier = d?.flag === "thin" || words < 25 ? 0 : missing > 0 ? 1 : d?.flag === "rambling" || words > 220 ? 2 : 3;
    cands.push({
      label: p.target ? `Question ${i + 1} · ${p.target}` : `Question ${i + 1}`,
      question: p.question,
      answer,
      tier,
      missing,
      words,
    });
  });
  return rank(cands);
}

const TRANSCRIPT_SKIP = ["introduce yourself", "introduction", "questions for me", "that covers my questions", "end of the interview"];

function transcriptPicks(rec: SessionRecord): WeakPick[] {
  const msgs = rec.transcript || [];
  const cands: Candidate[] = [];
  let q = 0;
  for (let i = 0; i < msgs.length && q < 5; i++) {
    if (msgs[i].role !== "ai") continue;
    const text = msgs[i].text;
    const lower = text.toLowerCase();
    if (TRANSCRIPT_SKIP.some((s) => lower.includes(s))) continue;
    if (!text.includes("?")) continue;
    const next = msgs.slice(i + 1).find((m) => m.role === "user");
    if (!next) continue;
    const answer = next.text.trim();
    const words = wordCount(answer);
    if (words < MIN_WORDS) continue;
    q += 1;
    cands.push({
      label: `Question ${q}`,
      question: text,
      answer,
      tier: words < 25 ? 0 : words > 220 ? 2 : 3,
      missing: 0,
      words,
    });
  }
  return rank(cands);
}

function technicalPicks(rec: SessionRecord): WeakPick[] {
  const cands: Candidate[] = [];
  if (rec.approachText && wordCount(rec.approachText) >= MIN_WORDS) {
    const words = wordCount(rec.approachText);
    cands.push({
      label: "Your approach",
      question: rec.problemTitle ? `Explain your approach to ${rec.problemTitle} before coding.` : "Explain your approach before coding.",
      answer: rec.approachText.trim(),
      tier: words < 45 ? 0 : 3,
      missing: 0,
      words,
    });
  }
  if (rec.complexityAnswer && wordCount(rec.complexityAnswer) >= 3) {
    cands.push({
      label: "Your complexity answer",
      question: "What is the time and space complexity of your solution, and why?",
      answer: rec.complexityAnswer.trim(),
      tier: rec.complexityCorrect === true ? 3 : 1,
      missing: 0,
      words: wordCount(rec.complexityAnswer),
    });
  }
  return rank(cands);
}

export function pickWeakAnswers(rec: SessionRecord): WeakPick[] {
  if (rec.type === "technical") return technicalPicks(rec);
  const fromPairs = generalPicks(rec);
  return fromPairs.length ? fromPairs : transcriptPicks(rec);
}

const FILLER_PHRASES = ["you know", "sort of", "kind of"];
const FILLER_TOKENS = new Set(["um", "uh", "umm", "uhh", "actually", "basically", "literally"]);
const RESULT_RE =
  /\b(result|in the end|eventually|finally|improved|reduced|increased|saved|shipped|delivered|launched|it worked|that worked|we finished)\b|\b\d+(\.\d+)?\s*(%|percent|users|seconds|minutes|hours|days|times|x)\b/i;

function splitSentences(text: string): string[] {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return [];
  const raw = clean.match(/[^.!?]+[.!?]+["']?|[^.!?]+$/g) || [clean];
  return raw.map((s) => s.trim()).filter(Boolean);
}

function cleanSentence(s: string): string {
  let out = s;
  for (const phrase of FILLER_PHRASES) {
    out = out.replace(new RegExp(`\\b${phrase}\\b,?`, "gi"), " ");
  }
  out = out
    .split(/\s+/)
    .filter((tok) => !FILLER_TOKENS.has(tok.toLowerCase().replace(/[^a-z']/g, "")))
    .join(" ");
  out = out.replace(/\s+([,.!?])/g, "$1").replace(/\s+/g, " ").trim();
  out = out.replace(/^[a-z]/, (c) => c.toUpperCase());
  if (out && !/[.!?]$/.test(out)) out += ".";
  return out;
}

export function templateStronger(answer: string): string {
  const parts = splitSentences(answer).map(cleanSentence).filter(Boolean);
  if (!parts.length) return "";
  const resultIdx = parts.findIndex((s) => RESULT_RE.test(s));
  if (resultIdx > 0 && resultIdx < parts.length - 1) {
    const [r] = parts.splice(resultIdx, 1);
    parts.push(r);
  }
  return parts.join(" ");
}

export async function fetchStrongerRewrites(picks: WeakPick[]): Promise<string[] | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 35000);
  try {
    const res = await fetch("/api/interview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "rewrite",
        pairs: picks.map((p) => ({ question: p.question, answer: p.answer })),
      }),
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const data = await res.json().catch(() => null);
    if (!data || !Array.isArray(data.rewrites)) return null;
    return data.rewrites.map((r: unknown) => (typeof r === "string" ? r.replace(/\s+/g, " ").trim() : ""));
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export function storeStronger(rec: SessionRecord) {
  try {
    const raw = sessionStorage.getItem("interviewai-last");
    if (raw) {
      const parsed = JSON.parse(raw) as SessionRecord;
      if (parsed && parsed.id === rec.id) sessionStorage.setItem("interviewai-last", JSON.stringify(rec));
    }
  } catch {}
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem("interviewai-history") || "[]");
    if (Array.isArray(parsed)) {
      const idx = parsed.findIndex((r) => r && typeof r === "object" && (r as SessionRecord).id === rec.id);
      if (idx >= 0) {
        parsed[idx] = rec;
        localStorage.setItem("interviewai-history", JSON.stringify(parsed));
      }
    }
  } catch {}
  pushSession(rec);
}
