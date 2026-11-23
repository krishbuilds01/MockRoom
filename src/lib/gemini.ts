const PRIMARY_MODEL = "gemini-2.5-flash";
const FALLBACK_MODEL = "gemini-2.0-flash";
const API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

export function geminiAvailable(): boolean {
  return !!process.env.GEMINI_API_KEY;
}

async function callModel(model: string, key: string, prompt: string, timeoutMs: number): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${API_BASE}/${model}:generateContent`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": key,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 800,
          thinkingConfig: { thinkingBudget: 0 },
        },
      }),
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const data = await res.json().catch(() => null);
    const candidate = data?.candidates?.[0];
    if (!candidate) return null;
    if (candidate.finishReason === "MAX_TOKENS") return null;
    const parts = candidate?.content?.parts;
    if (!Array.isArray(parts)) return null;
    const text = parts
      .map((p: { text?: string }) => (typeof p?.text === "string" ? p.text : ""))
      .join("")
      .trim();
    return text || null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function askGemini(prompt: string): Promise<string | null> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  const first = await callModel(PRIMARY_MODEL, key, prompt, 8000);
  if (first !== null) return first;
  return callModel(FALLBACK_MODEL, key, prompt, 6000);
}
