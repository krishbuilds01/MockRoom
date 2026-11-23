"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { chunkForSpeech, speakSentenceBrowser } from "./voice";

export type VoiceSource = "gemini" | "edge" | "browser" | null;

const FIRST_CHUNK_DEADLINE_MS = 4000;
const LATER_CHUNK_GRACE_MS = 4500;
const CACHE_LIMIT = 60;
const SILENT_WAV =
  "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQAAAAA=";

type FetchResult = string | null;

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T | "timeout"> {
  if (ms <= 0) return Promise.race([p, Promise.resolve("timeout" as const)]);
  return Promise.race([
    p,
    new Promise<"timeout">((resolve) => setTimeout(() => resolve("timeout"), ms)),
  ]);
}

export type SpeakerCallbacks = {
  onStart?: () => void;
  onEnd?: () => void;
  onAboutToEnd?: () => void;
};

export function useSpeaker(callbacks?: SpeakerCallbacks, voiceName?: string, pitch?: number) {
  const [voiceSource, setVoiceSource] = useState<VoiceSource>(null);
  const [speaking, setSpeaking] = useState(false);
  const tokenRef = useRef(0);
  const cbRef = useRef(callbacks);
  useEffect(() => {
    cbRef.current = callbacks;
  });
  const speakingRef = useRef(false);
  const aboutToEndFiredRef = useRef(false);

  const fireAboutToEnd = useCallback(() => {
    if (aboutToEndFiredRef.current) return;
    aboutToEndFiredRef.current = true;
    cbRef.current?.onAboutToEnd?.();
  }, []);

  const beginSpeech = useCallback(() => {
    speakingRef.current = true;
    aboutToEndFiredRef.current = false;
    setSpeaking(true);
    cbRef.current?.onStart?.();
  }, []);

  const endSpeech = useCallback(() => {
    if (!speakingRef.current) return;
    speakingRef.current = false;
    setSpeaking(false);
    cbRef.current?.onEnd?.();
  }, []);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const engineByUrlRef = useRef<Map<string, string>>(new Map());
  const cacheRef = useRef<Map<string, string>>(new Map());
  const ttsFailuresRef = useRef(0);
  const ttsCooldownUntilRef = useRef(0);
  const unlockedRef = useRef(false);

  const getAudio = useCallback((): HTMLAudioElement | null => {
    if (typeof window === "undefined") return null;
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.preload = "auto";
    }
    return audioRef.current;
  }, []);

  const unlock = useCallback(() => {
    if (unlockedRef.current) return;
    unlockedRef.current = true;
    const audio = getAudio();
    if (audio) {
      try {
        audio.src = SILENT_WAV;
        const p = audio.play();
        if (p) {
          p.then(() => {
            audio.pause();
            audio.currentTime = 0;
          }).catch(() => {});
        }
      } catch {}
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      try {
        const u = new SpeechSynthesisUtterance("");
        u.volume = 0;
        window.speechSynthesis.speak(u);
      } catch {}
    }
  }, [getAudio]);

  const stop = useCallback(() => {
    tokenRef.current += 1;
    endSpeech();
    if (audioRef.current) {
      try {
        audioRef.current.pause();
      } catch {}
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }
  }, [endSpeech]);

  useEffect(() => {
    const cache = cacheRef.current;
    return () => {
      tokenRef.current += 1;
      if (audioRef.current) {
        try {
          audioRef.current.pause();
        } catch {}
        audioRef.current = null;
      }
      cache.forEach((url) => URL.revokeObjectURL(url));
      cache.clear();
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        try {
          window.speechSynthesis.cancel();
        } catch {}
      }
    };
  }, []);

  const cachePut = useCallback((text: string, url: string) => {
    const cache = cacheRef.current;
    if (cache.has(text)) {
      if (cache.get(text) !== url) URL.revokeObjectURL(url);
      return;
    }
    if (cache.size >= CACHE_LIMIT) {
      const oldest = cache.keys().next().value;
      if (oldest !== undefined) {
        const oldUrl = cache.get(oldest);
        if (oldUrl) URL.revokeObjectURL(oldUrl);
        cache.delete(oldest);
      }
    }
    cache.set(text, url);
  }, []);

  const fetchTts = useCallback(
    (text: string): Promise<FetchResult> => {
      const cached = cacheRef.current.get(text);
      if (cached) return Promise.resolve(cached);
      if (Date.now() < ttsCooldownUntilRef.current) return Promise.resolve(null);
      return (async () => {
        const noteFailure = () => {
          ttsFailuresRef.current += 1;
          if (ttsFailuresRef.current >= 3) {
            ttsCooldownUntilRef.current = Date.now() + 60000;
            ttsFailuresRef.current = 0;
          }
        };
        try {
          const res = await fetch("/api/tts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(voiceName ? { text, voice: voiceName } : { text }),
          });
          if (!res.ok || !(res.headers.get("Content-Type") || "").includes("audio")) {
            noteFailure();
            return null;
          }
          const blob = await res.blob();
          if (!blob.size) {
            noteFailure();
            return null;
          }
          ttsFailuresRef.current = 0;
          const url = URL.createObjectURL(blob);
          engineByUrlRef.current.set(url, res.headers.get("X-Voice-Engine") || "gemini");
          cachePut(text, url);
          return url;
        } catch {
          noteFailure();
          return null;
        }
      })();
    },
    [cachePut, voiceName]
  );

  const playUrl = useCallback(
    (url: string, token: number, onNearEnd?: () => void): Promise<boolean> => {
      return new Promise((resolve) => {
        const audio = getAudio();
        if (!audio || token !== tokenRef.current) {
          resolve(false);
          return;
        }
        let settled = false;
        let nearEndFired = false;
        const onTimeUpdate = () => {
          if (nearEndFired || !onNearEnd) return;
          if (audio.duration && audio.duration - audio.currentTime <= 0.8) {
            nearEndFired = true;
            onNearEnd();
          }
        };
        const finish = (ok: boolean) => {
          if (settled) return;
          settled = true;
          clearInterval(watchdog);
          audio.removeEventListener("timeupdate", onTimeUpdate);
          audio.onended = null;
          audio.onerror = null;
          resolve(ok && token === tokenRef.current);
        };
        let lastTime = -1;
        let lastProgressAt = Date.now();
        const watchdog = setInterval(() => {
          if (token !== tokenRef.current) {
            finish(false);
            return;
          }
          if (!audio.paused && !audio.ended) {
            if (audio.currentTime !== lastTime) {
              lastTime = audio.currentTime;
              lastProgressAt = Date.now();
            } else if (Date.now() - lastProgressAt > 5000) {
              finish(false);
            }
          }
        }, 250);
        audio.onended = () => finish(true);
        audio.onerror = () => finish(false);
        if (onNearEnd) audio.addEventListener("timeupdate", onTimeUpdate);
        try {
          audio.src = url;
          const p = audio.play();
          if (p) p.catch(() => finish(false));
        } catch {
          finish(false);
        }
      });
    },
    [getAudio]
  );

  const speak = useCallback(
    async (text: string, muted: boolean) => {
      if (muted || !text.trim()) return;
      stop();
      const token = tokenRef.current;
      const chunks = chunkForSpeech(text);
      if (!chunks.length) return;
      beginSpeech();
      const startedAt = Date.now();
      const pending: Promise<FetchResult>[] = chunks.map((c) => fetchTts(c));
      try {
        for (let i = 0; i < chunks.length; i++) {
          if (token !== tokenRef.current) return;
          let played = false;
          const budget =
            i === 0
              ? Math.max(0, FIRST_CHUNK_DEADLINE_MS - (Date.now() - startedAt))
              : LATER_CHUNK_GRACE_MS;
          const result = await withTimeout(pending[i], budget);
          if (token !== tokenRef.current) return;
          const isLast = i === chunks.length - 1;
          if (result !== "timeout" && result) {
            if (isLast) fireAboutToEnd();
            played = await playUrl(result, token, isLast ? fireAboutToEnd : undefined);
            if (token !== tokenRef.current) return;
            if (played) setVoiceSource(engineByUrlRef.current.get(result) === "edge" ? "edge" : "gemini");
          }
          if (!played) {
            setVoiceSource("browser");
            if (isLast) fireAboutToEnd();
            await speakSentenceBrowser(chunks[i], pitch);
            if (token !== tokenRef.current) return;
          }
          if (i < chunks.length - 1) {
            await new Promise((r) => setTimeout(r, 90));
            if (token !== tokenRef.current) return;
          }
        }
      } finally {
        if (token === tokenRef.current) endSpeech();
      }
    },
    [fetchTts, playUrl, stop, beginSpeech, endSpeech, fireAboutToEnd, pitch]
  );

  return { speak, stop, voiceSource, speaking, unlock };
}
