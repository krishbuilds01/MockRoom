import { NextRequest, NextResponse } from "next/server";
import { askGemini, geminiAvailable } from "@/lib/gemini";
import {
  analyzeApproach,
  answerCandidateQuestion,
  generalFollowUp,
} from "@/lib/interviewer";
import { problems, type Problem } from "@/lib/problems";

type Mode = "general" | "approach" | "codewatch" | "ask" | "complexity" | "feedback";

function trunc(value: unknown, max: number): string {
  return typeof value === "string" ? value.slice(0, max) : "";
}

function findProblem(title: string): Problem | undefined {
  if (!title) return undefined;
  return problems.find((p) => p.title.toLowerCase() === title.toLowerCase());
}

function transcriptText(raw: unknown): string {
  if (typeof raw === "string") return raw.slice(0, 1500);
  if (!Array.isArray(raw)) return "";
  return raw
    .slice(-6)
    .map((m) => {
      const role = m && typeof m === "object" && "role" in m ? String((m as { role: unknown }).role) : "user";
      const text = m && typeof m === "object" && "text" in m ? String((m as { text: unknown }).text) : "";
      return `${role === "ai" ? "Interviewer" : "Candidate"}: ${text.slice(0, 300)}`;
    })
    .join("\n")
    .slice(0, 1500);
}

function difficultyRule(difficulty: string): string {
  if (difficulty === "Easy") return "Difficulty is Easy: be supportive, encourage the candidate, and give a small hint if they are stuck.";
  if (difficulty === "Hard") return "Difficulty is Hard: be strict, push on time and space complexity and edge cases, and give almost no hints.";
  return "Difficulty is Mid: act like a normal interviewer, ask follow-ups, and give only a partial hint if they are stuck.";
}

function buildPrompt(mode: Mode, body: Record<string, unknown>): string {
  const difficulty = trunc(body.difficulty, 20) || "Mid";
  const topic = trunc(body.topic, 60);
  const problemTitle = trunc(body.problemTitle, 120);
  const problemStatement = trunc(body.problemStatement, 900);
  const code = trunc(body.code, 4000);
  const diffSummary = trunc(body.diffSummary, 600);
  const message = trunc(body.message, 1500);
  const transcript = transcriptText(body.transcript);
  const testsPassed = typeof body.testsPassed === "number" ? body.testsPassed : null;
  const testsTotal = typeof body.testsTotal === "number" ? body.testsTotal : null;

  const base = [
    "You are a real technical interviewer running a live one on one interview.",
    "Speak in short plain sentences. Ask only ONE question at a time. Keep your whole reply under 60 words.",
    "No markdown, no lists, no headings, no code blocks. Your reply will be spoken aloud by text to speech.",
    difficultyRule(difficulty),
    topic ? `Topic: ${topic}.` : "",
    problemTitle ? `Problem: ${problemTitle}.` : "",
    problemStatement ? `Problem statement (short): ${problemStatement}` : "",
    transcript ? `Recent conversation:\n${transcript}` : "",
  ];

  if (mode === "general") {
    base.push(`The candidate just answered an interview question. Their answer: "${message}"`);
    base.push("Reply with brief feedback on their answer plus ONE follow-up question that digs deeper into what they said. Do not start a new topic.");
  } else if (mode === "approach") {
    base.push(`Before coding, the candidate explained their approach: "${message}"`);
    base.push("Say briefly what is right or wrong about the approach, then ask ONE probing question about its complexity or an edge case. End by telling them they can start coding if the approach sounds workable.");
  } else if (mode === "codewatch") {
    if (code) base.push(`The candidate is coding right now. Current code:\n${code}`);
    if (diffSummary) base.push(`What just changed in the code: ${diffSummary}`);
    base.push("Ask ONE short counter question about what they just wrote or deleted, for example why they wrote that line, why they removed something, or why they chose that data structure. If the change is trivial and there is nothing worth asking, reply with exactly nothing (empty reply).");
  } else if (mode === "ask") {
    if (code) base.push(`The candidate's current code:\n${code}`);
    base.push(`The candidate is asking you something during the interview: "${message}"`);
    base.push("Answer directly and briefly for this problem. If they ask for a test case, give ONE concrete input and its expected output. If they ask for a hint, respect the difficulty rule above. If they ask about an edge case like empty input, answer for this problem.");
  } else if (mode === "complexity") {
    if (code) base.push(`The candidate's final code:\n${code}`);
    if (testsPassed !== null && testsTotal !== null) base.push(`Their code passed ${testsPassed} of ${testsTotal} test cases.`);
    if (message) {
      base.push(`The candidate just stated their complexity: "${message}"`);
      base.push("Say briefly whether that complexity is right or wrong for their code, give the correct time and space complexity in one short sentence, and close the interview politely.");
    } else {
      base.push("The candidate just submitted their solution. Ask them ONE question: what is the time and space complexity of their solution, and why.");
    }
  } else if (mode === "feedback") {
    if (code) base.push(`The candidate's final code:\n${code}`);
    if (testsPassed !== null && testsTotal !== null) base.push(`Result: passed ${testsPassed} of ${testsTotal} test cases.`);
    if (message) base.push(`Session notes: ${message}`);
    base.push("Give a short spoken closing summary of how the candidate did: one strength, one thing to improve, and an encouraging closing line. Keep it under 70 words.");
  }
  return base.filter(Boolean).join("\n");
}

function localReply(mode: Mode, body: Record<string, unknown>): string {
  const difficulty = trunc(body.difficulty, 20) || "Mid";
  const message = trunc(body.message, 1500);
  const problem = findProblem(trunc(body.problemTitle, 120));
  const qIndex = typeof body.qIndex === "number" ? body.qIndex : 0;
  const testsPassed = typeof body.testsPassed === "number" ? body.testsPassed : 0;
  const testsTotal = typeof body.testsTotal === "number" ? body.testsTotal : 0;

  if (mode === "general") {
    return generalFollowUp(message, difficulty, qIndex);
  }
  if (mode === "approach") {
    if (problem) return analyzeApproach(problem, message, difficulty);
    if (message.trim().length < 8) return "I need more than that. In 2-3 lines: what data structure, what is the main loop, and what do you return? Start coding once you have said that.";
    return "Okay, I follow the broad idea. Before coding, state your expected time complexity and one edge case you will handle. Start coding now. I will watch and ask questions as you go.";
  }
  if (mode === "codewatch") {
    const diff = trunc(body.diffSummary, 600);
    if (!diff) return "";
    const d = diff.toLowerCase();
    if (d.includes("deleted") || d.includes("removed")) return "I saw you removed some code just now. Why did you remove it - was it wrong, or are you replacing it with something better?";
    if (d.includes("loop") || d.includes("for") || d.includes("while")) return "You just added a loop. Why this loop, and what is the time complexity it adds?";
    if (d.includes("map") || d.includes("set") || d.includes("hash")) return "You brought in a hash structure here. Why a Map or Set at this point - what lookup are you speeding up?";
    if (d.includes("sort")) return "You are sorting here. What does sorting buy you, and what does it cost in time?";
    if (d.includes("return")) return "You added a return. Walk me through it with one of the example inputs - what should come out, and does your return give that?";
    return "";
  }
  if (mode === "ask") {
    if (problem) {
      const local = answerCandidateQuestion(problem, message, difficulty);
      if (local) return local;
    }
    if (message.toLowerCase().includes("test case")) return "Use one of the example inputs from the problem panel as your test case, trace it by hand, and check your code returns the expected output for it.";
    if (message.toLowerCase().includes("hint")) return difficulty === "Hard" ? "At Hard level I give minimal hints. Tell me where exactly you are stuck - the data structure, the loop, or an edge case?" : "Hint: restate the problem in your own words, pick the data structure that makes the repeated lookup or ordering cheap, and handle the smallest input first.";
    return "Good question. Think about what your code should do for the smallest valid input first, then for a normal case. If you are still unsure, tell me exactly where you are stuck.";
  }
  if (mode === "complexity") {
    if (!message) {
      return testsTotal > 0
        ? `You submitted. Tests passed: ${testsPassed} of ${testsTotal}. Final question before we close: what is the time and space complexity of your solution, and why?`
        : "Final question before we close: what is the time and space complexity of your solution, and why?";
    }
    const good = /o\(|log|linear|quadratic|constant/.test(message.toLowerCase());
    if (problem) {
      return good
        ? `Noted. For reference: ${problem.complexity} Your session is complete. Click End Interview to see your full feedback.`
        : `Thanks. For reference, the expected answer is: ${problem.complexity} Click End Interview to see your full feedback.`;
    }
    return "Noted, that complexity answer is recorded. Your session is complete. Click End Interview to see your full feedback.";
  }
  const ratio = testsTotal > 0 ? testsPassed / testsTotal : 0;
  if (testsTotal > 0 && ratio === 1) return "Good session. You passed all the test cases, which is the strongest signal here. Keep explaining your approach out loud like you did, and check your feedback page for the detailed scores.";
  if (testsTotal > 0 && ratio > 0) return `Decent effort. You passed ${testsPassed} of ${testsTotal} test cases. Next time, run the failing cases early and trace them by hand before submitting. Your detailed scores are on the feedback page.`;
  if (testsTotal > 0) return "Thanks for attempting it. No test cases passed this time, so next session start from the examples and build up slowly. Your detailed scores and improvement points are on the feedback page.";
  return "Thanks, that completes the session. Your detailed scores and feedback are ready on the feedback page.";
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const modes: Mode[] = ["general", "approach", "codewatch", "ask", "complexity", "feedback"];
  const mode: Mode = modes.includes(body.mode as Mode) ? (body.mode as Mode) : "general";
  const llmAvailable = geminiAvailable();

  if (llmAvailable) {
    const geminiReply = await askGemini(buildPrompt(mode, body));
    if (geminiReply !== null && (mode === "codewatch" || geminiReply.trim().length > 0)) {
      return NextResponse.json({ reply: geminiReply.trim(), engine: "gemini", llmAvailable });
    }
  }
  return NextResponse.json({ reply: localReply(mode, body), engine: "local", llmAvailable });
}
