export interface InterviewApiResponse {
  reply: string;
  engine: "gemini" | "local";
  llmAvailable: boolean;
}

export async function postInterview(body: Record<string, unknown>): Promise<InterviewApiResponse | null> {
  try {
    const res = await fetch("/api/interview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) return null;
    const data = await res.json().catch(() => null);
    if (!data || typeof data.reply !== "string") return null;
    return data as InterviewApiResponse;
  } catch {
    return null;
  }
}
