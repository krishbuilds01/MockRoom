"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { splitSentences, speakSentenceBrowser } from "./voice";

export type VoiceSource = "gemini" | "browser" | null;

export function useSpeaker() {
  const [voiceSource, setVoiceSource] = useState<VoiceSource>(null);
  const tokenRef = useRef(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);

  const stop = useCallback(() => {
    tokenRef.current += 1;
    if (audioRef.current) {
      try {
        audioRef.current.pause();
      } catch {}
      audioRef.current = null;
    }
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }
  }, []);

  useEffect(() => {
    return () => {
      tokenRef.current += 1;
      if (audioRef.current) {
        try {
          audioRef.current.pause();
        } catch {}
      }
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        try {
          window.speechSynthesis.cancel();
        } catch {}
      }
    };
  }, []);

  const playBlob = useCallback((blob: Blob, token: number): Promise<boolean> => {
    return new Promise((resolve) => {
      if (token !== tokenRef.current) {
        resolve(false);
        return;
      }
      const url = URL.createObjectURL(blob);
      urlRef.current = url;
      const audio = new Audio(url);
      audioRef.current = audio;
      let settled = false;
      const finish = (ok: boolean) => {
        if (settled) return;
        settled = true;
        if (urlRef.current === url) {
          URL.revokeObjectURL(url);
          urlRef.current = null;
        }
        resolve(ok && token === tokenRef.current);
      };
      audio.onended = () => finish(true);
      audio.onerror = () => finish(false);
      audio.play().catch(() => finish(false));
    });
  }, []);

  const speak = useCallback(
    async (text: string, muted: boolean) => {
      if (muted || !text.trim()) return;
      stop();
      const token = tokenRef.current;
      const sentences = splitSentences(text);
      let useGemini = true;
      for (const sentence of sentences) {
        if (token !== tokenRef.current) return;
        if (useGemini) {
          try {
            const res = await fetch("/api/tts", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ text: sentence }),
            });
            if (token !== tokenRef.current) return;
            if (res.ok && (res.headers.get("Content-Type") || "").includes("audio")) {
              const blob = await res.blob();
              const played = await playBlob(blob, token);
              if (played) {
                setVoiceSource("gemini");
                continue;
              }
              useGemini = false;
            } else {
              useGemini = false;
            }
          } catch {
            useGemini = false;
          }
        }
        if (token !== tokenRef.current) return;
        setVoiceSource("browser");
        await speakSentenceBrowser(sentence);
        if (token !== tokenRef.current) return;
        await new Promise((r) => setTimeout(r, 120));
      }
    },
    [playBlob, stop]
  );

  return { speak, stop, voiceSource };
}
