import { sanitizeAiText } from "./sanitize";

export interface InterviewApiResponse {
  reply: string;
  engine: "gemini" | "local";
  llmAvailable: boolean;
}

export async function postInterview(body: Record<string, unknown>): Promise<InterviewApiResponse | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 35000);
  try {
    const res = await fetch("/api/interview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const data = await res.json().catch(() => null);
    if (!data || typeof data.reply !== "string") return null;
    const out = data as InterviewApiResponse;
    out.reply = sanitizeAiText(out.reply);
    return out;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
