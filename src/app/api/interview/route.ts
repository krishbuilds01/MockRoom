import { NextRequest, NextResponse } from "next/server";
import { generalFollowUp } from "@/lib/interviewer";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const message: string = body.message || "";
  const difficulty: string = body.difficulty || "Mid";
  const qIndex: number = body.qIndex || 0;
  const hasKey = !!(process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY);
  // No key: local engine only. With a key a real LLM call can be added here.
  const reply = generalFollowUp(message, difficulty, qIndex);
  return NextResponse.json({ reply, llmAvailable: hasKey, engine: "local" });
}
