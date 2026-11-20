import { NextRequest, NextResponse } from "next/server";
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";
import { geminiAvailable } from "@/lib/gemini";

export const maxDuration = 30;

const EDGE_VOICE_BY_GEMINI: Record<string, string> = {
  Kore: "en-IN-NeerjaNeural",
  Orus: "en-IN-PrabhatNeural",
};
const GEMINI_VOICE_BY_EDGE: Record<string, string> = {
  "en-IN-NeerjaNeural": "Kore",
  "en-IN-PrabhatNeural": "Orus",
};
const DEFAULT_EDGE_VOICE = "en-IN-NeerjaNeural";

function resolveVoices(requested: string): { edge: string; gemini: string } {
  if (GEMINI_VOICE_BY_EDGE[requested]) return { edge: requested, gemini: GEMINI_VOICE_BY_EDGE[requested] };
  if (EDGE_VOICE_BY_GEMINI[requested]) return { edge: EDGE_VOICE_BY_GEMINI[requested], gemini: requested };
  if (ALLOWED_VOICES.has(requested)) return { edge: DEFAULT_EDGE_VOICE, gemini: requested };
  return { edge: DEFAULT_EDGE_VOICE, gemini: VOICE_NAME };
}

async function tryEdge(text: string, edgeVoice: string): Promise<Buffer | null> {
  const tts = new MsEdgeTTS();
  try {
    await tts.setMetadata(edgeVoice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
    const { audioStream } = tts.toStream(text);
    const chunks: Buffer[] = [];
    let total = 0;
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("edge-timeout")), 15000);
      audioStream.on("data", (chunk: Buffer) => {
        chunks.push(chunk);
        total += chunk.length;
      });
      audioStream.on("end", () => {
        clearTimeout(timer);
        resolve();
      });
      audioStream.on("error", (err: Error) => {
        clearTimeout(timer);
        reject(err);
      });
    });
    if (!total) return null;
    return Buffer.concat(chunks);
  } catch {
    return null;
  } finally {
    try {
      tts.close();
    } catch {}
  }
}

const TTS_MODELS = ["gemini-2.5-flash-preview-tts", "gemini-2.5-pro-preview-tts"];
const API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const VOICE_NAME = "Callirrhoe";
const ALLOWED_VOICES = new Set([
  "Kore",
  "Callirrhoe",
  "Charon",
  "Orus",
  "Iapetus",
  "Sadaltager",
  "Alnilam",
  "Zephyr",
  "Puck",
  "Fenrir",
  "Aoede",
  "Erinome",
]);
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

async function tryModel(
  model: string,
  key: string,
  text: string,
  voiceName: string
): Promise<{ wav: Buffer | null; status: number | null }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const res = await fetch(`${API_BASE}/${model}:generateContent`, {
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
            voiceConfig: { prebuiltVoiceConfig: { voiceName } },
          },
        },
      }),
      signal: controller.signal,
    });
    if (!res.ok) return { wav: null, status: res.status };
    const data = await res.json().catch(() => null);
    const candidate = data?.candidates?.[0];
    if (!candidate || candidate.finishReason === "MAX_TOKENS") return { wav: null, status: null };
    const parts = candidate?.content?.parts;
    if (!Array.isArray(parts)) return { wav: null, status: null };
    const inline = parts.find(
      (p: { inlineData?: { data?: string } }) => typeof p?.inlineData?.data === "string"
    )?.inlineData?.data;
    if (!inline) return { wav: null, status: null };
    const pcm = Buffer.from(inline, "base64");
    if (!pcm.length) return { wav: null, status: null };
    return { wav: Buffer.concat([wavHeader(pcm.length), pcm]), status: null };
  } catch {
    return { wav: null, status: null };
  } finally {
    clearTimeout(timer);
  }
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const text = cleanText(body?.text);
  if (!text) return fallback("empty");
  const requestedVoice = typeof body?.voice === "string" ? body.voice : "";
  const voices = resolveVoices(requestedVoice);

  const mp3 = await tryEdge(text, voices.edge);
  if (mp3) {
    return new NextResponse(new Uint8Array(mp3), {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
        "X-Voice-Engine": "edge",
      },
    });
  }

  const key = process.env.GEMINI_TTS_KEY || process.env.GEMINI_API_KEY;
  if (!key && !geminiAvailable()) return fallback("tts-failed");

  let lastStatus: number | null = null;
  for (let i = 0; i < TTS_MODELS.length; i++) {
    const result = await tryModel(TTS_MODELS[i], key as string, text, voices.gemini);
    lastStatus = result.status;
    if (result.wav) {
      return new NextResponse(new Uint8Array(result.wav), {
        status: 200,
        headers: {
          "Content-Type": "audio/wav",
          "Cache-Control": "no-store",
          "X-Voice-Engine": i === 0 ? "gemini" : "gemini-pro",
        },
      });
    }
  }
  return fallback(lastStatus ? `tts-failed-${lastStatus}` : "tts-failed");
}
