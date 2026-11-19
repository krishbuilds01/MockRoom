import type { Difficulty, Problem } from "./problems";

export interface Msg {
  role: "ai" | "user" | "system";
  text: string;
  ts: number;
}

const generalBank: Record<string, string[]> = {
  Easy: [
    "Tell me about yourself and one project you are proud of.",
    "What is the difference between a list and a set in your main language, and when would you use each?",
    "Explain what happens when you type a URL in a browser, in simple steps.",
    "What is a REST API and what does GET vs POST mean?",
    "How do you debug a bug when your code prints the wrong answer?",
  ],
  Mid: [
    "Tell me about a hard bug you fixed. What was the root cause?",
    "How would you design a URL shortener at a high level?",
    "Explain hash maps: how do they work and when do they get slow?",
    "What happens if your API suddenly gets 10x traffic? Walk me through your fixes.",
    "Describe a time you disagreed with a teammate on a technical choice. How did it end?",
  ],
  Hard: [
    "Design a rate limiter for a public API. Cover storage, race conditions, and distributed servers.",
    "Your database queries are timing out under load. Give me your full diagnosis order and why.",
    "Explain consistency vs availability with a real system you would build each way.",
    "Tell me about the weakest technical decision you have made. What would you change now and why?",
    "How would you make a chat system handle 1 million concurrent users? Push on scaling and failure cases.",
  ],
};

export function generalQuestions(difficulty: string): string[] {
  return generalBank[difficulty] || generalBank.Mid;
}

export function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function isThinAnswer(text: string, difficulty: string): boolean {
  const min = difficulty === "Easy" ? 12 : 20;
  return wordCount(text) < min;
}

const acks = ["Right.", "Okay.", "Got it.", "Fair enough.", "Hmm, okay.", "Noted."];

export function pickAck(seed: number): string {
  return acks[Math.abs(seed) % acks.length];
}

export const INTERVIEWER_NAME = "Alex";

export function aOrAn(word: string): string {
  return /^[aeiou]/i.test(word.trim()) ? "an" : "a";
}

export function hasComplexityStatement(text: string): boolean {
  return /(o\([^)]+\)|quadratic|linear|constant time|constant space|logarithmic|exponential)/i.test(text);
}

export function techOpeningText(problem: Problem, difficulty: string, targetMin: number): string {
  return `Hi, I am ${INTERVIEWER_NAME}, and I will be your interviewer today. Here is how this session runs: I give you a coding problem, we talk it through before any code, you code while I watch and ask questions, then we dry run it, cover complexity, and finish with your questions for me. We have about ${targetMin} minutes, and this is ${aOrAn(difficulty)} ${difficulty} session, so I will be strict: vague answers get pushed back, and hints are recorded. Before we start, introduce yourself in a few lines: your background, and what you have been building lately.`;
}

export function generalOpeningText(difficulty: string, targetMin: number, count: number): string {
  return `Hi, I am ${INTERVIEWER_NAME}, and I will be your interviewer today. Here is how this runs: you introduce yourself, then I ask ${count} questions with follow-ups, and we finish with your questions for me. We have about ${targetMin} minutes. This is ${aOrAn(difficulty)} ${difficulty} session, so I will be direct: short, vague answers get pushed back, at every level. First, introduce yourself in a few lines: your background, and what you have been working on.`;
}

export function introReaction(intro: string, seed: number): string {
  const a = intro.toLowerCase();
  const ack = pickAck(seed + wordCount(intro));
  if (wordCount(intro) < 8) {
    return `${ack} That is a very short introduction. Give me a little more: where you study or work, your main stack, and one thing you built that you can talk about in depth.`;
  }
  if (a.includes("student") || a.includes("study") || a.includes("college") || a.includes("university")) {
    return `${ack} Good, a student background with real building experience is exactly what I want to hear about. I will judge the work, not the title.`;
  }
  if (a.includes("intern") || a.includes("work") || a.includes("job") || a.includes("engineer") || a.includes("developer")) {
    return `${ack} Good. I am less interested in the role title and more in what you personally built and decided, so expect me to dig there.`;
  }
  if (a.includes("project") || a.includes("built") || a.includes("building")) {
    return `${ack} Good, you led with what you built. That is the right instinct for an interview.`;
  }
  return `${ack} Good, I have the picture. Let us get into it.`;
}

const readyPhrases = [
  "no question",
  "no clarifying",
  "no doubts",
  "nothing else",
  "i am ready",
  "i'm ready",
  "im ready",
  "ready to start",
  "let's start",
  "lets start",
  "let us start",
  "all clear",
  "that's clear",
  "thats clear",
  "it is clear",
  "no, thanks",
  "no thanks",
  "i have none",
  "none from my side",
];

export function isReadySignal(text: string): boolean {
  const t = text.toLowerCase().trim().replace(/\s+/g, " ");
  if (t === "no" || t === "none" || t === "nope" || t === "ready" || t === "no." || t === "none.") return true;
  return readyPhrases.some((p) => t.includes(p));
}

export function answerClarifying(problem: Problem, qRaw: string): string {
  const direct = answerCandidateQuestion(problem, qRaw, "Mid");
  if (direct) return direct;
  const q = qRaw.toLowerCase();
  if (q.includes("example")) {
    const ex = problem.examples[0];
    return ex
      ? `Use the first example: input ${ex.input} should give output ${ex.output}. The rest are in the problem panel.`
      : "The examples in the problem panel define the expected shape.";
  }
  if (q.includes("sorted") || q.includes("order")) {
    return `The statement says this: ${problem.statement.split(". ")[0]}. If the statement does not promise an order, do not assume one.`;
  }
  if (q.includes("constraint") || q.includes("range") || q.includes("how large") || q.includes("how big") || q.includes("size")) {
    return `The constraints are on the left. The binding ones here: ${problem.constraints.slice(0, 2).join("; ")}. Design for those, not for the examples.`;
  }
  if (q.includes("return")) {
    return `Return exactly what the statement asks for: ${problem.statement.split(". ").slice(0, 2).join(". ")}. Match the examples.`;
  }
  return `Fair question. What the statement guarantees is this: ${problem.constraints[0]}. Anything it does not promise, your solution has to handle or explicitly rule out. The examples on the left show the expected shape.`;
}

export function dryRunReaction(problem: Problem, text: string): string {
  const words = wordCount(text);
  const t = problem.tests[0];
  const expectedStr = JSON.stringify(t.expected);
  if (words < 15) {
    return `That is not a dry run, that is a summary. Do it again properly: take input ${JSON.stringify(t.args)}, name the value of each variable after every step, and stop at the return. The expected output is ${expectedStr}, so your trace has to land exactly there.`;
  }
  if (text.includes(expectedStr) || text.toLowerCase().includes("return") || text.toLowerCase().includes("returns")) {
    return `Okay, that trace holds together, and it lands on the expected output ${expectedStr}. That is what a dry run is supposed to prove.`;
  }
  return `You walked the steps, but you never landed on a final value. A dry run ends at the return: for this input the expected output is ${expectedStr}. If your trace does not reach it, your code has a bug.`;
}

export function candidateQuestionAnswer(qRaw: string): string {
  const q = qRaw.toLowerCase();
  if (q.includes("team") || q.includes("who would i work") || q.includes("report")) {
    return "You would join a small product team, five to seven engineers, with a tech lead you would report to. The team owns one product area end to end, from design reviews to on-call.";
  }
  if (q.includes("stack") || q.includes("technolog") || q.includes("tools")) {
    return "The core stack is TypeScript services with React on the front end, Postgres, and a lot of automated testing. We care more about how you reason than about which framework you used last.";
  }
  if (q.includes("next step") || q.includes("process") || q.includes("timeline") || q.includes("when will")) {
    return "After this round there is a hiring manager conversation, then an offer decision. You would hear back within about a week either way.";
  }
  if (q.includes("day") || q.includes("work look") || q.includes("responsibilit") || q.includes("role")) {
    return "A normal day is mostly building: design doc or ticket work in the morning, code reviews, and pairing when something is tricky. Standup is short. Meetings are kept light for engineers at your level.";
  }
  if (q.includes("growth") || q.includes("learn") || q.includes("mentor")) {
    return "You would get a mentor for your first months, regular code review feedback, and a growth plan reviewed twice a year. The expectation is steady independence by the end of the first year.";
  }
  if (q.includes("remote") || q.includes("hybrid") || q.includes("office") || q.includes("location")) {
    return "The team is hybrid, two to three days in the office for pairing and design sessions, the rest remote. Core hours overlap matters more than exact location.";
  }
  return "Good question. The short answer: this role sits in a product team that ships weekly, reviews carefully, and expects engineers to own their work end to end. The longer answer would come from the hiring manager round.";
}

export function generalFollowUp(answer: string, difficulty: string, qIndex: number): string {
  const a = answer.toLowerCase();
  const ack = pickAck(qIndex * 7 + wordCount(answer));
  if (isThinAnswer(answer, difficulty)) {
    if (difficulty === "Easy") {
      return `${ack} That is too thin, even for Easy. Give me specifics: one concrete example, the exact steps, or a number. A small push: name the thing, then say why it works.`;
    }
    return `${ack} That is too vague, and I am not moving on yet. Give me a concrete example, exact steps, or numbers. No general statements.`;
  }
  if (a.includes("trade") || a.includes("because") || a.includes("so that")) {
    return difficulty === "Hard"
      ? `${ack} You gave a reason. Now defend it: what alternative did you reject, and what evidence would change your mind?`
      : `${ack} Fair reasoning. What would you do differently if you had to do it again, and why?`;
  }
  if (a.includes("example") || a.includes("project") || a.includes("built") || a.includes("work")) {
    return difficulty === "Hard"
      ? `${ack} Now the hard part: what was the trade-off in that choice, and what breaks first at ten times the scale? Be specific.`
      : `${ack} Good, a real example. Why did you pick that approach over the simpler option? What did it cost you?`;
  }
  if (difficulty === "Easy") return `${ack} Decent start, but I need one layer deeper: give me one real example and say exactly why it worked.`;
  if (difficulty === "Hard") return `${ack} You gave me the what, not the why. Justify it: name the alternative you rejected and the evidence behind the choice.`;
  return `${ack} That is surface level. Give me one concrete example and explain why you chose that approach over the alternatives.`;
}

export function generalSecondFollowUp(answer: string, difficulty: string): string {
  if (isThinAnswer(answer, difficulty)) {
    return "Still too thin. I am recording that this question was not answered in enough depth. One last chance on it: give me the example, the steps, and the reason, in that order.";
  }
  return difficulty === "Hard"
    ? "Better. Last probe on this one: what is the failure case of what you just described, and how would you detect it in production?"
    : "Better, that has substance now. One more probe: what is a case where what you described would fail or be the wrong choice?";
}

export function isBruteForceApproach(text: string): boolean {
  const a = text.toLowerCase();
  return a.includes("brute") || a.includes("nested loop") || a.includes("two loop") || a.includes("double loop") || a.includes("n squared") || a.includes("o(n^2)") || a.includes("o(n2)") || a.includes("check every pair") || a.includes("check all pairs");
}

export function analyzeApproach(problem: Problem, answer: string, difficulty: string): string {
  const a = answer.toLowerCase();
  const parts: string[] = [];
  if (isBruteForceApproach(answer)) {
    if (difficulty === "Hard") parts.push(`Brute force is not acceptable at Hard level for ${problem.title}. I am not letting you code that. Find the faster approach first, then state it.`);
    else if (difficulty === "Mid") parts.push("Brute force will be scored down at Mid level. Before you code, tell me how you cut one of those loops, even if it costs extra space.");
    else parts.push("Brute force is a start, but state its exact complexity and one concrete idea to improve it. I will ask about that improvement after you code.");
  } else if (a.includes("hash") || a.includes("map") || a.includes("dict") || a.includes("set")) {
    parts.push(`A hash based approach fits ${problem.title}.`);
    parts.push("Be precise: what exactly is the key, what is the value, and when do you check before you store?");
  } else if (a.includes("sort")) {
    parts.push("Sorting first can work here. State the cost of the sort and what it makes simpler afterwards. If you cannot state the cost, that is a gap.");
  } else if (a.includes("stack")) {
    parts.push("A stack fits the last in, first out structure here. What do you push, when do you pop, and what do you do when a closer meets an empty stack?");
  } else if (a.includes("two pointer") || a.includes("pointer") || a.includes("sliding") || a.includes("window")) {
    parts.push("That is the intended direction. Now be exact: when does each pointer move, and what invariant does the window hold at all times?");
  } else if (wordCount(answer) < 8) {
    parts.push("That is not an approach, that is a guess. I need three things: the data structure, the main loop or pass, and what you return. State them.");
  } else {
    parts.push("I follow the broad idea, but it is not precise yet. State your expected time and space complexity and one edge case you will handle, before you touch the code.");
  }
  if (hasComplexityStatement(answer)) {
    const stated = checkComplexity(problem, answer);
    parts.push(
      stated.correct
        ? "You also stated a complexity, and it matches the intended solution. I have recorded it, and I will hold you to it against your final code."
        : "You also stated a complexity. I have recorded it exactly as stated, and I will check it against your final code at the end."
    );
  }
  if (!(difficulty === "Hard" && isBruteForceApproach(answer))) {
    parts.push("Start coding. I will watch, and I will stop you to explain lines I pick.");
  }
  return parts.join(" ");
}

export interface DiffInfo {
  added: string[];
  removed: string[];
}

export function diffLines(prev: string, curr: string): DiffInfo {
  const prevSet = new Map<string, number>();
  prev.split("\n").forEach((l) => prevSet.set(l, (prevSet.get(l) || 0) + 1));
  const currLines = curr.split("\n");
  const added: string[] = [];
  const counts = new Map(prevSet);
  currLines.forEach((l) => {
    const c = counts.get(l) || 0;
    if (c > 0) counts.set(l, c - 1);
    else if (l.trim()) added.push(l.trim());
  });
  const removed: string[] = [];
  const currSet = new Map<string, number>();
  currLines.forEach((l) => currSet.set(l, (currSet.get(l) || 0) + 1));
  prev.split("\n").forEach((l) => {
    const c = currSet.get(l) || 0;
    if (c > 0) currSet.set(l, c - 1);
    else if (l.trim()) removed.push(l.trim());
  });
  return { added, removed };
}

export function summarizeDiff(prev: string, curr: string): string {
  const { added, removed } = diffLines(prev, curr);
  const parts: string[] = [];
  if (removed.length) parts.push(`deleted ${removed.length} line(s), first deleted line: ${removed[0].slice(0, 80)}`);
  if (added.length) {
    const joined = added.join("\n");
    if (/\b(for|while)\b/.test(joined)) parts.push("added a loop");
    if (/new Map|new Set|\{\}|\bdict\b|\bset\(/.test(joined)) parts.push("added a Map or Set or hash structure");
    if (/\.sort\(|sorted\(/.test(joined)) parts.push("added a sort call");
    if (/\breturn\b/.test(joined)) parts.push("added a return statement");
    if (/\.push\(|append\(/.test(joined)) parts.push("added code that appends to a result");
    parts.push(`added ${added.length} line(s), first added line: ${added[0].slice(0, 80)}`);
  }
  return parts.join("; ");
}

function lineSimilarity(a: string, b: string): number {
  const grams = (t: string) => {
    const s = t.replace(/\s+/g, " ").trim().toLowerCase();
    const set = new Set<string>();
    for (let i = 0; i < s.length - 1; i++) set.add(s.slice(i, i + 2));
    return set;
  };
  const ga = grams(a);
  const gb = grams(b);
  if (!ga.size || !gb.size) return 0;
  let shared = 0;
  ga.forEach((g) => {
    if (gb.has(g)) shared++;
  });
  return shared / Math.max(ga.size, gb.size);
}

export function codeWatchQuestion(prev: string, curr: string, problem: Problem): string | null {
  const { added, removed } = diffLines(prev, curr);
  if (!added.length && !removed.length) return null;
  const pureRemovals = removed.filter((r) => !added.some((a) => lineSimilarity(a, r) >= 0.5));
  if (pureRemovals.length >= 1 && pureRemovals[0].length > 3) {
    return `Stop there. You removed this: "${pureRemovals[0].slice(0, 60)}". Why? Was it wrong, and what replaces it?`;
  }
  const joined = added.join("\n");
  if (/\b(for|while)\b/.test(joined)) return "You just added a loop. Justify it: what does it iterate over, and what total complexity does that give you now?";
  if (/new Map|new Set|\{\}|\bdict\b|\bset\(/.test(joined)) return "You brought in a hash structure. Exactly what is stored in it, and which lookup does it make O(1)?";
  if (/\.sort\(|sorted\(/.test(joined)) return "You are sorting. State the cost of that sort and what it buys you. If you cannot, that is a problem.";
  if (/\breturn\b/.test(joined)) {
    const t = problem.tests[0];
    return `You added a return. Trace it for this input: ${JSON.stringify(t.args)}. Walk me through the values, step by step, until that return fires.`;
  }
  if (/\.push\(|append\(/.test(joined)) return "You are building a result there. At what exact point is it complete, and what guarantees nothing is missing?";
  if (added.length >= 3) return "You wrote a block of code without explaining any of it. Explain the plan for those lines now, before you write more.";
  return null;
}

export function truncateWords(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  const base = lastSpace > max * 0.5 ? cut.slice(0, lastSpace) : cut;
  return base.trimEnd() + "...";
}

export function complexityPhrase(problem: Problem): string {
  return problem.complexity.replace(/^Expected:\s*/, "").split(". ")[0].trim();
}

export function complexityConfirmation(problem: Problem, correct: boolean): string {
  const phrase = complexityPhrase(problem);
  return correct
    ? `You already gave the complexity: ${phrase}. That is correct, and it is recorded, so I am not asking twice.`
    : `You already gave the complexity, and it was not right. The correct answer is: ${phrase}. That is recorded.`;
}

export function shouldAutosavePartial(input: {
  elapsedSec: number;
  codeChanged: boolean;
  hasAnyMessage: boolean;
}): boolean {
  return input.elapsedSec > 20 || input.codeChanged || input.hasAnyMessage;
}

function normalizeCode(code: string): string {
  return code
    .split("\n")
    .map((l) => l.trimEnd())
    .join("\n")
    .replace(/\n+$/, "");
}

export function nextCodeWatchQuestion(
  prev: string,
  curr: string,
  problem: Problem,
  asked: Set<string>
): string | null {
  const p = normalizeCode(prev);
  const c = normalizeCode(curr);
  if (p === c) return null;
  let pre = 0;
  while (pre < p.length && pre < c.length && p[pre] === c[pre]) pre++;
  let suf = 0;
  while (suf < p.length - pre && suf < c.length - pre && p[p.length - 1 - suf] === c[c.length - 1 - suf]) suf++;
  const charDelta = p.length - pre - suf + (c.length - pre - suf);
  if (charDelta < 12) return null;
  const q = codeWatchQuestion(p, c, problem);
  if (!q) return null;
  const key = q.toLowerCase();
  if (asked.has(key)) return null;
  asked.add(key);
  return q;
}

export function codeWatchProgressQuestion(code: string, runs: number, problem: Problem): string | null {
  const lines = code.split("\n").filter((l) => l.trim() && !l.trim().startsWith("//")).length;
  const starterLines = problem.starter.javascript.split("\n").filter((l) => l.trim()).length;
  if (lines > starterLines + 14 && runs === 0) {
    return "You have written a lot of code and run none of it. In a real interview that reads as guessing. Run it now and tell me what you expect to see.";
  }
  if (lines > 45) {
    return `This solution is getting long for ${problem.title}. Long code usually means a missed simplification. What is the shortest version of your idea?`;
  }
  return null;
}

export function isHintRequest(text: string): boolean {
  const t = text.toLowerCase();
  return t.includes("hint") || t.includes("stuck") || t.includes("help me") || t.trim() === "help";
}

export function isTestCaseRequest(text: string): boolean {
  const t = text.toLowerCase();
  return t.includes("test case") || t.includes("example case") || t.includes("give me a case");
}

export function answerCandidateQuestion(problem: Problem, qRaw: string, difficulty: string): string | null {
  const q = qRaw.toLowerCase();
  if (isTestCaseRequest(qRaw)) {
    return `One extra test case for ${problem.title}: ${problem.extraTest.note} Expected output: ${JSON.stringify(problem.extraTest.expected)}. Run it before you submit.`;
  }
  if (q.includes("hint")) {
    if (difficulty === "Hard") return "No hints at Hard level. Tell me exactly where you are stuck: the data structure, the loop, or an edge case. That answer itself is scored.";
    const note = difficulty === "Mid" ? "This hint is recorded and will lower your score slightly. " : "";
    return note + "Hint: " + problem.hints[difficulty as Difficulty];
  }
  if (q.includes("empty") || q.includes("null") || q.includes("edge")) {
    return problem.emptyInputNote;
  }
  if (q.includes("complexity") || q.includes("big o")) {
    return "I am not handing you the complexity, that is part of what is scored. Tell me your current estimate and I will react to it.";
  }
  if (q.includes("can i use") || q.includes("allowed")) {
    return "You can, but only if you can justify the extra space or time it costs. That justification is exactly what gets scored, so make it now.";
  }
  if (q.includes("stuck") || q.includes("help")) {
    return difficulty === "Hard"
      ? "No walkthrough at Hard level. Tell me exactly where you are stuck: the data structure, the loop, or an edge case."
      : "Being stuck is fine, being vague is not. Tell me exactly where: the data structure, the loop, or an edge case. Then I will give you one nudge, and it will be recorded as a hint.";
  }
  return null;
}

export function isCandidateQuestion(text: string): boolean {
  const t = text.toLowerCase().trim();
  return (
    t.includes("?") ||
    t.startsWith("give") ||
    t.startsWith("hint") ||
    t.startsWith("what about") ||
    t.startsWith("can i") ||
    t.includes("test case") ||
    t.includes("i am stuck") ||
    t.includes("help")
  );
}

function normComplexityToken(raw: string): string | null {
  const s = raw.toLowerCase().replace(/\s+/g, "");
  if (s.includes("nlogn") || s.includes("n*logn")) return "nlogn";
  if (s.includes("2^n") || s.includes("exponential")) return "2^n";
  if (s.includes("n^2") || s.includes("n2") || s.includes("quadratic")) return "n^2";
  if (s.includes("n*k") || s.includes("nklogk")) return "nklogk";
  if (s.includes("logn") || s.includes("logarithmic")) return "logn";
  if (s.includes("o(n)") || s.includes("linear") || s === "n") return "n";
  if (s.includes("o(1)") || s.includes("constant")) return "1";
  if (s.includes("min(n")) return "n";
  return null;
}

export function expectedComplexity(problem: Problem): { time: string | null; space: string | null } {
  const firstSentence = problem.complexity.split(". ")[0];
  const matches = [...firstSentence.matchAll(/O\(([^)]+)\)/g)].map((m) => normComplexityToken(m[1]));
  const time = matches[0] ?? null;
  let space = matches.length > 1 ? matches[matches.length - 1] : null;
  if (problem.id === "group-anagrams") space = null;
  return { time, space };
}

export function checkComplexity(problem: Problem, answer: string): { correct: boolean; timeCorrect: boolean; note: string } {
  const expected = expectedComplexity(problem);
  const tokens: string[] = [];
  const re = /(o\([^)]+\)|quadratic|linear|constant|logarithmic|exponential)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(answer.toLowerCase())) !== null) {
    const tok = normComplexityToken(m[1]);
    if (tok && tokens[tokens.length - 1] !== tok) tokens.push(tok);
  }
  const timeCorrect = expected.time !== null && tokens.length > 0 && tokens[0] === expected.time;
  let spaceCorrect = true;
  if (expected.space !== null) {
    if (tokens.length > 1) spaceCorrect = tokens[1] === expected.space;
    else spaceCorrect = expected.space === expected.time;
  }
  const correct = timeCorrect && spaceCorrect;
  const note = correct
    ? `Complexity stated correctly. ${problem.complexity}`
    : `Complexity was ${timeCorrect ? "partly right" : "wrong or missing"}. ${problem.complexity}`;
  return { correct, timeCorrect, note };
}

export interface ScoreSignals {
  testsPassed: number;
  totalTests: number;
  runs: number;
  approachExplained: boolean;
  aiQuestionsAnswered: number;
  timeSec: number;
  isTechnical: boolean;
  transcriptCount: number;
  hintsUsed?: number;
  aiAsked?: number;
  complexityCorrect?: boolean | null;
  complexityAttempted?: boolean;
  thinApproach?: boolean;
  userAnswers?: number;
  totalUserWords?: number;
  thinAnswers?: number;
  questionsTotal?: number;
}

function clampScore(n: number): number {
  return Math.max(1, Math.min(10, Math.round(n)));
}

export function computeScores(s: ScoreSignals) {
  const hints = s.hintsUsed ?? 0;
  const asked = s.aiAsked ?? s.aiQuestionsAnswered;
  const unanswered = Math.max(0, asked - s.aiQuestionsAnswered);
  const strengths: string[] = [];
  const improvements: string[] = [];
  let problemSolving: number;
  let coding: number;
  let communication: number;
  let complexity: number;

  if (s.isTechnical) {
    const ratio = s.totalTests > 0 ? s.testsPassed / s.totalTests : 0;
    coding = ratio * 7 + (s.runs > 0 ? 1 : 0) + (s.runs >= 3 ? 0.5 : 0) - Math.min(2, hints * 0.75);
    if (s.complexityCorrect === true) coding += ratio === 1 ? 1.5 : 0.5;
    if (ratio < 1) coding = Math.min(coding, 7.5);
    if (ratio === 1 && s.complexityCorrect === false) coding = Math.min(coding, 8);
    problemSolving =
      ratio * 5 +
      (s.approachExplained ? (s.thinApproach ? 0.5 : 2) : 0) +
      Math.min(1, s.aiQuestionsAnswered * 0.5) +
      (s.complexityCorrect === true ? 1 : 0) -
      Math.min(1.5, hints * 0.5);
    if (ratio === 1 && s.complexityCorrect === true && hints === 0 && s.aiQuestionsAnswered >= 3) problemSolving += 1;
    if (ratio === 0) problemSolving = Math.min(problemSolving, 4);
    else if (ratio < 0.5) problemSolving = Math.min(problemSolving, 6);
    communication =
      2.5 +
      (s.approachExplained ? (s.thinApproach ? 1 : 3) : 0) +
      Math.min(3.5, s.aiQuestionsAnswered * 0.9) -
      Math.min(2, unanswered * 0.5);
    complexity =
      s.complexityCorrect === true
        ? 7 + ratio * 3 - Math.min(1, hints * 0.5)
        : s.complexityCorrect === false
          ? 3
          : s.complexityAttempted === false
            ? 0
            : 3.5 + ratio * 1.5;

    if (ratio === 1) strengths.push("All test cases passed, including the hidden cases. That is the baseline, not the whole score.");
    if (ratio > 0 && ratio < 1) improvements.push(`Only ${s.testsPassed} of ${s.totalTests} tests passed. The failing cases are listed in your session; debug those exact inputs.`);
    if (ratio === 0) improvements.push("No tests passed. Passing tests is necessary before anything else in your performance counts.");
    if (s.complexityCorrect === true) strengths.push("You stated the time and space complexity correctly.");
    if (s.complexityCorrect === false) improvements.push("Your complexity answer was wrong or missing. Complexity is a scored part of the interview, not an afterthought.");
    if (s.complexityCorrect == null && s.isTechnical) improvements.push("You never completed the complexity round. Always close with time and space complexity.");
  } else {
    const answers = s.userAnswers ?? s.aiQuestionsAnswered;
    const total = s.questionsTotal ?? 5;
    const words = s.totalUserWords ?? 0;
    const thin = s.thinAnswers ?? 0;
    const answeredRatio = total > 0 ? Math.min(1, answers / total) : 0;
    const followAsked = s.aiAsked ?? 0;
    const followRatio = followAsked > 0 ? Math.min(1, s.aiQuestionsAnswered / followAsked) : 0;
    problemSolving = 1 + answeredRatio * 5 + followRatio * 2 + Math.min(1.5, words / 120) - Math.min(2, thin * 0.6);
    coding = 1 + answeredRatio * 2 + Math.min(4, words / 60) - Math.min(2, thin * 0.5);
    coding = Math.min(coding, 8);
    communication = 1 + answeredRatio * 2 + followRatio * 1.5 + Math.min(3.5, words / 45) - Math.min(2.5, thin * 0.7);
    complexity = 1 + answeredRatio * 3 + Math.min(3, words / 80) - Math.min(2, thin * 0.6);
    complexity = Math.min(complexity, 7.5);
    if (thin === 0 && answers >= total) strengths.push("You answered every question with real depth, not one line answers.");
    if (thin > 0) improvements.push(`${thin} of your answers were too thin. Interviewers read short, vague answers as not knowing the topic.`);
    if (answers < total) improvements.push(`You ended early with ${answers} of ${total} questions answered. Finishing the set matters.`);
  }

  if (s.approachExplained && !s.thinApproach && s.isTechnical) strengths.push("You explained your approach before coding, in enough detail to be judged.");
  if (s.isTechnical && !s.approachExplained) improvements.push("You never explained an approach. Interviewers score the approach separately from the code.");
  if (s.isTechnical && s.thinApproach) improvements.push("Your approach explanation was too thin to judge. State the data structure, the pass, and the return value.");
  if (s.aiQuestionsAnswered >= 2) strengths.push("You engaged with the interviewer follow-up questions instead of ignoring them.");
  if (unanswered >= 2) improvements.push(`You left ${unanswered} interviewer questions unanswered. Silence reads as guessing in a real interview.`);
  if (hints > 0) improvements.push(`You used ${hints} hint${hints > 1 ? "s" : ""}. Hints are recorded and pull scores down; on Mid and Hard, try to earn the idea yourself first.`);
  if (s.isTechnical && s.runs === 0) improvements.push("You never ran your code. Run early and often; untested code is a red flag.");
  if (s.isTechnical && s.runs >= 2) strengths.push("You tested your code with multiple runs.");
  if (s.timeSec > 0 && s.timeSec < 60) improvements.push("The session was under a minute of real work. That is not enough time to demonstrate anything.");

  return {
    problemSolving: clampScore(problemSolving),
    coding: clampScore(coding),
    communication: clampScore(communication),
    complexity: clampScore(complexity),
    strengths,
    improvements,
  };
}

export function overallScore(scores: ReturnType<typeof computeScores>): number {
  const avg = (scores.problemSolving + scores.coding + scores.communication + scores.complexity) / 4;
  return Math.round(avg * 10) / 10;
}

export interface SessionRecord {
  id: string;
  type: "general" | "technical";
  difficulty: string;
  topic?: string;
  problemTitle?: string;
  problemId?: string;
  date: string;
  timeSec: number;
  targetSec?: number;
  testsPassed: number;
  totalTests: number;
  runs: number;
  code?: string;
  language?: string;
  transcript: Msg[];
  scores: ReturnType<typeof computeScores>;
  hintsUsed?: number;
  aiAsked?: number;
  aiAnswered?: number;
  approachText?: string;
  complexityAnswer?: string;
  complexityCorrect?: boolean | null;
  thinAnswers?: number;
  introGiven?: boolean;
  askedClarifying?: boolean;
  dryRunDone?: boolean;
  askedQuestionAtEnd?: boolean;
  incomplete?: boolean;
  codeChanged?: boolean;
  qaPairs?: { question: string; answer?: string }[];
}

export function saveSession(rec: SessionRecord) {
  try {
    sessionStorage.setItem("interviewai-last", JSON.stringify(rec));
    const key = "interviewai-history";
    let old: unknown = [];
    try {
      old = JSON.parse(localStorage.getItem(key) || "[]");
    } catch {
      old = [];
    }
    const arr = Array.isArray(old) ? old : [];
    localStorage.setItem(key, JSON.stringify([rec, ...arr].slice(0, 20)));
  } catch {}
}
