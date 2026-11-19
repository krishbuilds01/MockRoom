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

export function generalFollowUp(answer: string, difficulty: string, qIndex: number): string {
  const a = answer.toLowerCase();
  const short = answer.trim().split(/\s+/).length < 12;
  if (short && difficulty !== "Hard") return "Can you add a bit more detail? Give me one concrete example from your own work.";
  if (short && difficulty === "Hard") return "That is too short for this level. I need specifics, numbers, and trade-offs. Please expand.";
  if (a.includes("example") || a.includes("project") || a.includes("built")) {
    return difficulty === "Hard"
      ? "Good. Now the hard part: what was the trade-off in that choice, and what would break first at 10x scale?"
      : "Nice example. Why did you pick that approach over the simpler option?";
  }
  if (a.includes("trade") || a.includes("because") || a.includes("so that")) {
    return "Fair reasoning. What would you do differently if you had to do it again?";
  }
  if (difficulty === "Easy") return "Good start. Here is a small hint to go deeper: think of one real example and say why it worked.";
  if (difficulty === "Hard") return "You gave the what, not the why. Justify it: what alternative did you reject and on what evidence?";
  return `Follow-up on question ${qIndex + 1}: can you give a concrete example and explain why you chose that approach?`;
}

export function analyzeApproach(problem: Problem, answer: string, difficulty: string): string {
  const a = answer.toLowerCase();
  const parts: string[] = [];
  if (a.includes("hash") || a.includes("map") || a.includes("dict") || a.includes("set")) {
    parts.push(`A hash based approach fits ${problem.title} well.`);
    parts.push("What will you store as the key, and what as the value?");
  } else if (a.includes("brute") || a.includes("nested") || a.includes("two loop") || a.includes("double loop")) {
    if (difficulty === "Hard") parts.push("Brute force will not pass at this level. Before you code, find the faster approach first.");
    else if (difficulty === "Mid") parts.push("Brute force works but is slow. Can you cut one of those loops with extra space?");
    else parts.push("Brute force is a fine starting point. Code it, and we will look at speeding it up after.");
  } else if (a.includes("sort")) {
    parts.push("Sorting first is a solid plan here. What does sorting cost you, and what does it make easier after?");
  } else if (a.includes("stack")) {
    parts.push("A stack fits the last-in first-out structure of this problem. What do you push, and when do you pop?");
  } else if (a.includes("two pointer") || a.includes("pointer") || a.includes("sliding") || a.includes("window")) {
    parts.push("That is the intended direction for this problem. When exactly do you move each pointer?");
  } else if (answer.trim().length < 8) {
    parts.push("I need more than that. In 2-3 lines: what data structure, what is the main loop, and what do you return?");
  } else {
    parts.push("Okay, I follow the broad idea. Before coding, state your expected time complexity and one edge case you will handle.");
  }
  parts.push("Start coding now. I will watch and ask questions as you go.");
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

export function codeWatchQuestion(prev: string, curr: string, problem: Problem): string | null {
  const { added, removed } = diffLines(prev, curr);
  if (!added.length && !removed.length) return null;
  if (removed.length >= 1 && removed[0].length > 3) {
    return `I saw you removed this: "${removed[0].slice(0, 60)}" - why did you remove it? Was it wrong, or are you replacing it with something better?`;
  }
  const joined = added.join("\n");
  if (/\b(for|while)\b/.test(joined)) return "You just added a loop. Why this loop, and what is the time complexity it adds?";
  if (/new Map|new Set|\{\}|\bdict\b|\bset\(/.test(joined)) return "You brought in a hash structure here. Why a Map or Set at this point - what lookup are you speeding up?";
  if (/\.sort\(|sorted\(/.test(joined)) return "You are sorting here. What does sorting buy you, and what does it cost in time?";
  if (/\breturn\b/.test(joined)) {
    const t = problem.tests[0];
    return `You added a return. Walk me through it for this case: input ${JSON.stringify(t.args)} - what should come out, and does your return give that?`;
  }
  if (/\.push\(|append\(/.test(joined)) return "You are building up a result there. At what point is that result complete and ready to return?";
  if (added.length >= 3) return "You wrote a block of code quickly. Explain the plan for those lines in one or two sentences before you continue.";
  return null;
}

export function answerCandidateQuestion(problem: Problem, qRaw: string, difficulty: string): string | null {
  const q = qRaw.toLowerCase();
  if (q.includes("test case") || q.includes("example case") || q.includes("give me a case")) {
    return `Here is an extra test case for ${problem.title}: ${problem.extraTest.note} Expected output: ${JSON.stringify(problem.extraTest.expected)}. Try it with Run after you code.`;
  }
  if (q.includes("hint")) {
    return "Hint: " + (problem.hints[difficulty as Difficulty] || problem.hints.Mid);
  }
  if (q.includes("empty") || q.includes("null") || q.includes("edge")) {
    return problem.emptyInputNote;
  }
  if (q.includes("complexity") || q.includes("big o")) {
    return problem.complexity + " I will ask you to state yours at the end, so keep it in mind while coding.";
  }
  if (q.includes("can i use") || q.includes("allowed")) {
    return "Yes, you can, but you need to justify the extra space or time it costs. In a real interview that justification is what gets scored.";
  }
  if (q.includes("stuck") || q.includes("help")) {
    return difficulty === "Hard"
      ? "I will not give the solution at Hard level. Tell me where exactly you are stuck - the data structure, the loop, or an edge case?"
      : "No problem. Hint: " + (problem.hints[difficulty as Difficulty] || problem.hints.Mid);
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

export interface ScoreSignals {
  testsPassed: number;
  totalTests: number;
  runs: number;
  approachExplained: boolean;
  aiQuestionsAnswered: number;
  timeSec: number;
  isTechnical: boolean;
  transcriptCount: number;
}

export function computeScores(s: ScoreSignals) {
  const ratio = s.totalTests > 0 ? s.testsPassed / s.totalTests : 0;
  const coding = s.isTechnical ? Math.round(2 + ratio * 8) : 6;
  const problemSolving = s.isTechnical
    ? Math.min(10, Math.round(2 + ratio * 6 + (s.approachExplained ? 2 : 0)))
    : Math.min(10, 4 + Math.min(4, Math.floor(s.transcriptCount / 2)));
  const communication = Math.min(10, 3 + (s.approachExplained ? 3 : 0) + Math.min(3, s.aiQuestionsAnswered));
  const complexity = s.isTechnical
    ? Math.min(10, Math.round(3 + ratio * 4 + (s.aiQuestionsAnswered >= 2 ? 3 : s.aiQuestionsAnswered)))
    : 6;
  const strengths: string[] = [];
  const improvements: string[] = [];
  if (ratio === 1 && s.isTechnical) strengths.push("All test cases passed, including hidden cases.");
  if (ratio > 0 && ratio < 1) improvements.push(`Only ${s.testsPassed} of ${s.totalTests} tests passed. Debug failing cases with Run before submitting.`);
  if (s.isTechnical && ratio === 0) improvements.push("No tests passed yet. Start from the examples and trace them by hand.");
  if (s.approachExplained) strengths.push("You explained your approach before or during coding.");
  else improvements.push("Explain your approach out loud before coding. Interviewers score this heavily.");
  if (s.aiQuestionsAnswered >= 2) strengths.push("You answered the interviewer follow-up questions.");
  else improvements.push("Answer the AI counter-questions as they come. Silence reads as guessing in a real interview.");
  if (s.runs === 0 && s.isTechnical) improvements.push("You never ran your code. Run early and often.");
  if (s.runs >= 2) strengths.push("You tested your code with multiple runs.");
  if (s.timeSec > 0 && s.timeSec < 60) improvements.push("The session was very short. Spend more time checking edge cases.");
  return {
    problemSolving: Math.max(1, Math.min(10, problemSolving)),
    coding: Math.max(1, Math.min(10, coding)),
    communication: Math.max(1, Math.min(10, communication)),
    complexity: Math.max(1, Math.min(10, complexity)),
    strengths,
    improvements,
  };
}

export interface SessionRecord {
  id: string;
  type: "general" | "technical";
  difficulty: string;
  topic?: string;
  problemTitle?: string;
  date: string;
  timeSec: number;
  testsPassed: number;
  totalTests: number;
  runs: number;
  code?: string;
  language?: string;
  transcript: Msg[];
  scores: ReturnType<typeof computeScores>;
}

export function saveSession(rec: SessionRecord) {
  try {
    sessionStorage.setItem("interviewai-last", JSON.stringify(rec));
    const key = "interviewai-history";
    const old = JSON.parse(localStorage.getItem(key) || "[]");
    localStorage.setItem(key, JSON.stringify([rec, ...old].slice(0, 20)));
  } catch {}
}

export function speak(text: string, muted: boolean) {
  if (muted || typeof window === "undefined" || !("speechSynthesis" in window)) return;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1.02;
    window.speechSynthesis.speak(u);
  } catch {}
}
