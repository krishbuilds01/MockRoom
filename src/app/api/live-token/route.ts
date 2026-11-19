import { NextResponse } from "next/server";

export const maxDuration = 30;

export const LIVE_MODEL =
  process.env.GEMINI_LIVE_MODEL || "gemini-2.5-flash-native-audio-preview-12-2025";
export const LIVE_VOICE = "Callirrhoe";

type TokenBody = {
  systemInstruction?: string;
};

async function mintToken(
  key: string,
  version: string,
  systemInstruction: string,
  withConstraints: boolean,
): Promise<{ name: string } | null> {
  const now = Date.now();
  const body: Record<string, unknown> = {
    uses: 1,
    expireTime: new Date(now + 30 * 60 * 1000).toISOString(),
    newSessionExpireTime: new Date(now + 60 * 1000).toISOString(),
  };
  if (withConstraints) {
    body.liveConnectConstraints = {
      bidiGenerateContentSetup: {
        model: `models/${LIVE_MODEL}`,
        generationConfig: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: LIVE_VOICE },
            },
          },
        },
        systemInstruction: { parts: [{ text: systemInstruction }] },
        inputAudioTranscription: {},
        outputAudioTranscription: {},
      },
    };
  }
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/${version}/auth_tokens?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { name?: string };
    if (!data.name || !data.name.startsWith("auth_tokens/")) return null;
    return { name: data.name };
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    return NextResponse.json(
      { fallback: true, reason: "no-key" },
      { status: 501 },
    );
  }
  let body: TokenBody = {};
  try {
    body = (await req.json()) as TokenBody;
  } catch {
    body = {};
  }
  const systemInstruction = (body.systemInstruction || "").slice(0, 6000);

  const attempts: Array<[string, boolean]> = [
    ["v1beta", true],
    ["v1beta", false],
    ["v1alpha", true],
    ["v1alpha", false],
  ];
  for (const [version, constrained] of attempts) {
    const token = await mintToken(key, version, systemInstruction, constrained);
    if (token) {
      return NextResponse.json({
        token: token.name,
        model: LIVE_MODEL,
        voice: LIVE_VOICE,
        apiVersion: version,
        constrained,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      });
    }
  }
  return NextResponse.json(
    { fallback: true, reason: "mint-failed" },
    { status: 502 },
  );
}
