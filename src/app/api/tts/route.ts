import { NextRequest, NextResponse } from "next/server";
import { geminiAvailable } from "@/lib/gemini";

export const maxDuration = 30;

const TTS_MODEL = "gemini-2.5-flash-preview-tts";
const API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const VOICE_NAME = "Callirrhoe";
const SAMPLE_RATE = 24000;
const STYLE_PREFIX =
  "Speak in a natural, warm, professional interviewer tone, at a relaxed conversational pace, with natural pauses and varied intonation, like a real person talking, not reading: ";

function cleanText(raw: unknown): string {
  if (typeof raw !== "string") return "";
  return raw
    .replace(/[*_#`>[\]()]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 600);
}

function wavHeader(dataLength: number): Buffer {
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + dataLength, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(SAMPLE_RATE, 24);
  header.writeUInt32LE(SAMPLE_RATE * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(dataLength, 40);
  return header;
}

function fallback(reason: string) {
  return NextResponse.json({ fallback: true, reason }, { status: 501 });
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const text = cleanText(body?.text);
  if (!text) return fallback("empty");
  if (!geminiAvailable()) return fallback("no-key");
  const key = process.env.GEMINI_API_KEY as string;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const res = await fetch(`${API_BASE}/${TTS_MODEL}:generateContent`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": key,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: STYLE_PREFIX + text }] }],
        generationConfig: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: VOICE_NAME } },
          },
        },
      }),
      signal: controller.signal,
    });
    if (!res.ok) return fallback("tts-failed");
    const data = await res.json().catch(() => null);
    const candidate = data?.candidates?.[0];
    if (!candidate || candidate.finishReason === "MAX_TOKENS") return fallback("tts-failed");
    const parts = candidate?.content?.parts;
    if (!Array.isArray(parts)) return fallback("tts-failed");
    const inline = parts.find(
      (p: { inlineData?: { data?: string } }) => typeof p?.inlineData?.data === "string"
    )?.inlineData?.data;
    if (!inline) return fallback("tts-failed");
    const pcm = Buffer.from(inline, "base64");
    if (!pcm.length) return fallback("tts-failed");
    const wav = Buffer.concat([wavHeader(pcm.length), pcm]);
    return new NextResponse(new Uint8Array(wav), {
      status: 200,
      headers: {
        "Content-Type": "audio/wav",
        "Cache-Control": "no-store",
        "X-Voice-Engine": "gemini",
      },
    });
  } catch {
    return fallback("tts-failed");
  } finally {
    clearTimeout(timer);
  }
}
