import { NextRequest, NextResponse } from "next/server";
import { askGemini, geminiAvailable } from "@/lib/gemini";
import { buildResumeQuestionsLocal, type ResumeQuestion } from "@/lib/resume";
import { getInterviewer } from "@/lib/interviewers";

export const maxDuration = 30;

function buildPrompt(text: string, interviewerName: string): string {
  return [
    `You are ${interviewerName}, a strict senior interviewer. Read the candidate's resume below and write interview questions that test whether the resume is real and understood by its owner.`,
    "Return ONLY a JSON array, no markdown, no code fences, no commentary. Each item is an object with two string fields: \"question\" and \"target\" (the project name or skill the question tests).",
    "Write 6 to 8 questions. Mix, in this order of priority:",
    "1. Project deep dives: name the actual project from the resume and ask why a specific technology or design choice was made there, and what breaks at ten times the scale.",
    "2. Skills verification: for skills the resume lists, ask a question that someone who only copied the skill name could not answer.",
    "3. Experience probing: if the resume shows an internship or job, ask what the candidate personally shipped and owned.",
    "4. Honest gaps: ask about the weakest or least defensible part of the strongest project.",
    "Questions must reference real names and technologies from THIS resume, never generic placeholders. Keep each question under 45 words. Sound like a person, plain sentences.",
    "Resume:",
    text.slice(0, 6000),
  ].join("\n");
}

function parseQuestions(raw: string): ResumeQuestion[] | null {
  const start = raw.indexOf("[");
  const end = raw.lastIndexOf("]");
  if (start < 0 || end <= start) return null;
  try {
    const parsed: unknown = JSON.parse(raw.slice(start, end + 1));
    if (!Array.isArray(parsed)) return null;
    const out = parsed
      .filter((q): q is ResumeQuestion => !!q && typeof q === "object" && typeof (q as ResumeQuestion).question === "string" && (q as ResumeQuestion).question.trim().length > 10)
      .map((q) => ({ question: q.question.trim().slice(0, 400), target: typeof q.target === "string" && q.target.trim() ? q.target.trim().slice(0, 80) : "Resume" }))
      .slice(0, 8);
    return out.length >= 3 ? out : null;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const parsed = (await req.json().catch(() => null)) as unknown;
  const body: Record<string, unknown> =
    parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : {};
  const text = typeof body.text === "string" ? body.text : "";
  if (text.trim().length < 100) {
    return NextResponse.json({ error: "Paste at least a few lines of your resume so there is something real to ask about." }, { status: 400 });
  }
  if (geminiAvailable()) {
    const reply = await askGemini(buildPrompt(text, getInterviewer(body.interviewer).name));
    if (reply) {
      const questions = parseQuestions(reply);
      if (questions) return NextResponse.json({ questions, engine: "gemini" });
    }
  }
  return NextResponse.json({ questions: buildResumeQuestionsLocal(text), engine: "local" });
}
