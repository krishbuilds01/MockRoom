"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type LiveStatus = "idle" | "connecting" | "live" | "fallback" | "off";

export type LiveCallbacks = {
  onAiTurn: (text: string) => void;
  onUserTurn: (text: string) => void;
  onSpeaking: (speaking: boolean) => void;
  onStatus?: (status: LiveStatus) => void;
};

type TokenResponse = {
  token: string;
  model: string;
  voice: string;
  apiVersion: string;
};

function base64FromBytes(bytes: Uint8Array): string {
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

function bytesFromBase64(b64: string): Uint8Array {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

export class LiveSession {
  private ws: WebSocket | null = null;
  private playCtx: AudioContext | null = null;
  private micCtx: AudioContext | null = null;
  private micStream: MediaStream | null = null;
  private micNode: ScriptProcessorNode | null = null;
  private sources = new Set<AudioBufferSourceNode>();
  private nextPlayTime = 0;
  private aiBuffer = "";
  private userBuffer = "";
  private mutedFlag = false;
  private closedByUser = false;
  private setupTimer: ReturnType<typeof setTimeout> | null = null;
  status: LiveStatus = "idle";

  constructor(private cb: LiveCallbacks) {}

  private setStatus(s: LiveStatus) {
    this.status = s;
    this.cb.onStatus?.(s);
  }

  async connect(systemInstruction: string): Promise<boolean> {
    this.closedByUser = false;
    this.setStatus("connecting");
    let tokenInfo: TokenResponse;
    try {
      const res = await fetch("/api/live-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ systemInstruction }),
      });
      if (!res.ok) throw new Error("token");
      tokenInfo = (await res.json()) as TokenResponse;
      if (!tokenInfo.token) throw new Error("token");
    } catch {
      this.setStatus("fallback");
      return false;
    }

    const url = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.${tokenInfo.apiVersion}.GenerativeService.BidiGenerateContentConstrained?access_token=${encodeURIComponent(tokenInfo.token)}`;

    const ok = await new Promise<boolean>((resolve) => {
      let settled = false;
      const done = (v: boolean) => {
        if (settled) return;
        settled = true;
        if (this.setupTimer) clearTimeout(this.setupTimer);
        resolve(v);
      };
      this.setupTimer = setTimeout(() => done(false), 12000);
      try {
        this.ws = new WebSocket(url);
      } catch {
        done(false);
        return;
      }
      this.ws.onopen = () => {
        this.sendRaw({
          setup: {
            model: `models/${tokenInfo.model}`,
            generationConfig: {
              responseModalities: ["AUDIO"],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: tokenInfo.voice },
                },
              },
            },
            systemInstruction: { parts: [{ text: systemInstruction }] },
            inputAudioTranscription: {},
            outputAudioTranscription: {},
          },
        });
      };
      this.ws.onmessage = (ev) => {
        this.handleMessage(ev.data, () => done(true));
      };
      this.ws.onerror = () => done(false);
      this.ws.onclose = () => {
        if (!settled) done(false);
        if (!this.closedByUser && this.status === "live") {
          this.setStatus("fallback");
          this.stopAudio();
        }
      };
    });

    if (!ok) {
      this.setStatus("fallback");
      try {
        this.ws?.close();
      } catch {}
      this.ws = null;
      return false;
    }
    this.setStatus("live");
    await this.startMic();
    return true;
  }

  private sendRaw(obj: unknown) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(obj));
    }
  }

  sendText(text: string) {
    this.sendRaw({
      clientContent: {
        turns: [{ role: "user", parts: [{ text }] }],
        turnComplete: true,
      },
    });
  }

  private async handleMessage(data: unknown, onSetup: () => void) {
    let msg: Record<string, unknown>;
    try {
      const text =
        typeof data === "string"
          ? data
          : data instanceof Blob
            ? await data.text()
            : "";
      if (!text) return;
      msg = JSON.parse(text) as Record<string, unknown>;
    } catch {
      return;
    }
    if (msg.setupComplete) {
      onSetup();
      return;
    }
    const sc = msg.serverContent as Record<string, unknown> | undefined;
    if (!sc) return;
    if (sc.interrupted) this.flushPlayout();
    const inT = sc.inputTranscription as
      | { text?: string; finished?: boolean }
      | undefined;
    if (inT?.text) {
      this.userBuffer += inT.text;
      if (inT.finished) {
        const t = this.userBuffer.trim();
        this.userBuffer = "";
        if (t) this.cb.onUserTurn(t);
      }
    }
    const outT = sc.outputTranscription as
      | { text?: string; finished?: boolean }
      | undefined;
    if (outT?.text) this.aiBuffer += outT.text;
    const modelTurn = sc.modelTurn as
      | { parts?: Array<{ inlineData?: { data?: string } }> }
      | undefined;
    if (modelTurn?.parts) {
      for (const part of modelTurn.parts) {
        if (part.inlineData?.data) this.enqueueAudio(part.inlineData.data);
      }
    }
    if (sc.turnComplete) {
      const t = this.aiBuffer.trim();
      this.aiBuffer = "";
      if (t) this.cb.onAiTurn(t);
    }
  }

  private ensurePlayCtx(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.playCtx) {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!AC) return null;
      this.playCtx = new AC({ sampleRate: 24000 });
    }
    if (this.playCtx.state === "suspended") {
      this.playCtx.resume().catch(() => {});
    }
    return this.playCtx;
  }

  unlock() {
    this.ensurePlayCtx();
  }

  setMuted(m: boolean) {
    this.mutedFlag = m;
    if (m) this.flushPlayout();
  }

  private enqueueAudio(b64: string) {
    if (this.mutedFlag) return;
    const ctx = this.ensurePlayCtx();
    if (!ctx) return;
    const bytes = bytesFromBase64(b64);
    const samples = new Int16Array(
      bytes.buffer,
      bytes.byteOffset,
      Math.floor(bytes.byteLength / 2),
    );
    if (samples.length === 0) return;
    const buffer = ctx.createBuffer(1, samples.length, 24000);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < samples.length; i++) data[i] = samples[i] / 32768;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(ctx.destination);
    const start = Math.max(this.nextPlayTime, ctx.currentTime + 0.02);
    src.start(start);
    this.nextPlayTime = start + buffer.duration;
    this.sources.add(src);
    this.cb.onSpeaking(true);
    src.onended = () => {
      this.sources.delete(src);
      if (this.sources.size === 0) this.cb.onSpeaking(false);
    };
  }

  private flushPlayout() {
    for (const src of this.sources) {
      try {
        src.stop();
      } catch {}
    }
    this.sources.clear();
    if (this.playCtx) this.nextPlayTime = this.playCtx.currentTime;
    this.cb.onSpeaking(false);
  }

  private async startMic() {
    try {
      if (!navigator.mediaDevices?.getUserMedia) return;
      this.micStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!AC) return;
      this.micCtx = new AC();
      const source = this.micCtx.createMediaStreamSource(this.micStream);
      this.micNode = this.micCtx.createScriptProcessor(4096, 1, 1);
      const inRate = this.micCtx.sampleRate;
      const ratio = inRate / 16000;
      this.micNode.onaudioprocess = (e) => {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
        const input = e.inputBuffer.getChannelData(0);
        const outLen = Math.floor(input.length / ratio);
        const pcm = new Int16Array(outLen);
        for (let i = 0; i < outLen; i++) {
          const v = Math.max(-1, Math.min(1, input[Math.floor(i * ratio)]));
          pcm[i] = v < 0 ? v * 32768 : v * 32767;
        }
        const bytes = new Uint8Array(pcm.buffer);
        this.sendRaw({
          realtimeInput: {
            audio: {
              data: base64FromBytes(bytes),
              mimeType: "audio/pcm;rate=16000",
            },
          },
        });
      };
      source.connect(this.micNode);
      this.micNode.connect(this.micCtx.destination);
    } catch {}
  }

  private stopAudio() {
    if (this.micNode) {
      try {
        this.micNode.disconnect();
      } catch {}
      this.micNode = null;
    }
    if (this.micStream) {
      this.micStream.getTracks().forEach((t) => t.stop());
      this.micStream = null;
    }
    if (this.micCtx) {
      this.micCtx.close().catch(() => {});
      this.micCtx = null;
    }
    this.flushPlayout();
  }

  close() {
    this.closedByUser = true;
    this.stopAudio();
    if (this.playCtx) {
      this.playCtx.close().catch(() => {});
      this.playCtx = null;
    }
    if (this.ws) {
      try {
        this.ws.close();
      } catch {}
      this.ws = null;
    }
    this.setStatus("off");
  }
}

export function useLiveSession(cb: LiveCallbacks) {
  const [status, setStatusState] = useState<LiveStatus>("idle");
  const sessionRef = useRef<LiveSession | null>(null);
  const cbRef = useRef(cb);
  useEffect(() => {
    cbRef.current = cb;
  });

  const connect = useCallback(async (systemInstruction: string) => {
    if (!sessionRef.current) {
      sessionRef.current = new LiveSession({
        onAiTurn: (t) => cbRef.current.onAiTurn(t),
        onUserTurn: (t) => cbRef.current.onUserTurn(t),
        onSpeaking: (s) => cbRef.current.onSpeaking(s),
        onStatus: (s) => setStatusState(s),
      });
    }
    const session = sessionRef.current;
    setStatusState("connecting");
    const ok = await session.connect(systemInstruction);
    setStatusState(ok ? "live" : "fallback");
    return ok;
  }, []);

  const sendText = useCallback((text: string) => {
    sessionRef.current?.sendText(text);
  }, []);

  const unlock = useCallback(() => {
    sessionRef.current?.unlock();
  }, []);

  const setMuted = useCallback((m: boolean) => {
    sessionRef.current?.setMuted(m);
  }, []);

  const close = useCallback(() => {
    sessionRef.current?.close();
    sessionRef.current = null;
    setStatusState("off");
  }, []);

  useEffect(() => {
    return () => {
      sessionRef.current?.close();
      sessionRef.current = null;
    };
  }, []);

  return { status, connect, sendText, unlock, setMuted, close, sessionRef };
}
