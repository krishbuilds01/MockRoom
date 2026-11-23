import type { Msg } from "./interviewer";

export interface StarCheck {
  situation: boolean;
  task: boolean;
  action: boolean;
  result: boolean;
}

export interface AnswerDelivery {
  label: string;
  words: number;
  flag: "thin" | "rambling" | null;
  star: StarCheck | null;
}

export interface DeliverySummary {
  totalWords: number;
  fillerCount: number;
  fillerPer100: number;
  fillerVerdict: string;
  avgAnswerWords: number;
  thinCount: number;
  ramblingCount: number;
  answers: AnswerDelivery[];
  starOverall: StarCheck | null;
}

export interface DeliveryInput {
  type: "general" | "technical";
  transcript: Msg[];
  qaPairs?: { question: string; answer?: string; target?: string }[];
}

const THIN_WORDS = 25;
const RAMBLING_WORDS = 220;

const FILLER_PHRASES = ["you know", "sort of", "kind of"];
const FILLER_WORDS = new Set(["actually", "basically", "literally"]);
const LIKE_SKIP_BEFORE = new Set(["i", "you", "we", "they", "he", "she", "it", "would", "looks", "look", "feels", "feel", "sounds", "sound", "seems", "seem"]);
const LIKE_SKIP_AFTER = new Set(["a", "an", "the"]);

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function countFillers(text: string): number {
  let rest = ` ${text.toLowerCase().replace(/[^a-z0-9'\s]/g, " ")} `;
  let count = 0;
  for (const phrase of FILLER_PHRASES) {
    const hits = rest.match(new RegExp(`\\b${phrase}\\b`, "g"));
    if (hits) {
      count += hits.length;
      rest = rest.replace(new RegExp(`\\b${phrase}\\b`, "g"), " ");
    }
  }
  const tokens = rest.split(/\s+/).filter(Boolean);
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (/^u+m+$/.test(t) || /^u+h+$/.test(t) || FILLER_WORDS.has(t)) {
      count += 1;
    } else if (t === "like") {
      const before = tokens[i - 1];
      const after = tokens[i + 1];
      if (before && LIKE_SKIP_BEFORE.has(before)) continue;
      if (after && LIKE_SKIP_AFTER.has(after)) continue;
      count += 1;
    }
  }
  return count;
}

function fillerVerdict(per100: number, count: number): string {
  if (count === 0) return "No filler words at all. Clean, confident delivery.";
  if (per100 < 2) return "Barely noticeable. This level will not distract an interviewer.";
  if (per100 < 5) return "Noticeable in places. When you need a second to think, pause silently instead of filling the gap.";
  return "Heavy filler use. It makes solid answers sound unsure. Pause instead of saying um or like, and slow the first sentence of each answer down.";
}

const STAR_PATTERNS: { key: keyof StarCheck; re: RegExp }[] = [
  {
    key: "situation",
    re: /\b(situation|at the time|back then|we had|we were|there was|there were|my team|our team|when i was|when i worked|when i joined|during my|in my project|in my internship|at my internship|in my previous|at my previous|at my last|the problem was|the issue was)\b/,
  },
  {
    key: "task",
    re: /\b(my task|i was responsible|responsible for|i had to|i needed to|my job was|my role was|my goal was|the goal was|i was asked to|i was assigned|assigned me|we had to|we needed to)\b/,
  },
  {
    key: "action",
    re: /\b(i|we) (built|wrote|implemented|created|designed|fixed|decided|led|used|added|changed|debugged|refactored|tested|proposed|suggested|started|chose|introduced|split|moved|discussed|convinced|presented|analysed|analyzed)\b|\b(so i|then i|first i)\b/,
  },
  {
    key: "result",
    re: /\b(result|in the end|eventually|finally|improved|reduced|increased|saved|faster|shipped|delivered|launched|succeeded|outcome|it worked|that worked|we finished)\b|\b\d+(\.\d+)?\s*(%|percent|users|seconds|minutes|hours|days|times)\b|\b\d+x\b/,
  },
];

function starCheck(text: string): StarCheck {
  const lower = text.toLowerCase();
  const out: StarCheck = { situation: false, task: false, action: false, result: false };
  for (const { key, re } of STAR_PATTERNS) out[key] = re.test(lower);
  return out;
}

const BEHAVIOURAL_QUESTION =
  /tell me about|about yourself|a time when|describe a|an example|example of|experience|situation|challenge|difficult|proud|disagree|conflict|mistake|fail|learn|worked on|project|team/i;

export function computeDelivery(input: DeliveryInput): DeliverySummary | null {
  const userTexts = (input.transcript || [])
    .filter((m) => m.role === "user")
    .map((m) => m.text)
    .filter((t) => t && t.trim());
  const allText = userTexts.join("\n");
  const totalWords = countWords(allText);
  if (totalWords === 0) return null;

  const fillerCount = countFillers(allText);
  const fillerPer100 = Math.round((fillerCount / totalWords) * 1000) / 10;

  const summary: DeliverySummary = {
    totalWords,
    fillerCount,
    fillerPer100,
    fillerVerdict: fillerVerdict(fillerPer100, fillerCount),
    avgAnswerWords: 0,
    thinCount: 0,
    ramblingCount: 0,
    answers: [],
    starOverall: null,
  };

  if (input.type === "technical") {
    const chatAnswers = userTexts.filter((t) => countWords(t) >= 3);
    summary.avgAnswerWords = chatAnswers.length
      ? Math.round(chatAnswers.reduce((sum, t) => sum + countWords(t), 0) / chatAnswers.length)
      : 0;
    return summary;
  }

  const pairs = (input.qaPairs || []).filter((p) => p.answer && p.answer.trim());
  if (pairs.length) {
    summary.answers = pairs.slice(0, 5).map((pair, i) => {
      const words = countWords(pair.answer as string);
      return {
        label: pair.target ? `Question ${i + 1} · ${pair.target}` : `Question ${i + 1}`,
        words,
        flag: words < THIN_WORDS ? "thin" : words > RAMBLING_WORDS ? "rambling" : null,
        star: BEHAVIOURAL_QUESTION.test(pair.question) ? starCheck(pair.answer as string) : null,
      };
    });
    summary.avgAnswerWords = Math.round(pairs.reduce((sum, p) => sum + countWords(p.answer as string), 0) / pairs.length);
  } else {
    summary.avgAnswerWords = userTexts.length
      ? Math.round(userTexts.reduce((sum, t) => sum + countWords(t), 0) / userTexts.length)
      : 0;
    const askedBehavioural = (input.transcript || []).some((m) => m.role === "ai" && BEHAVIOURAL_QUESTION.test(m.text));
    if (askedBehavioural) summary.starOverall = starCheck(allText);
  }
  summary.thinCount = summary.answers.filter((a) => a.flag === "thin").length;
  summary.ramblingCount = summary.answers.filter((a) => a.flag === "rambling").length;
  return summary;
}
