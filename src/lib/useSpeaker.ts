"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { chunkForSpeech, speakSentenceBrowser } from "./voice";

export type VoiceSource = "gemini" | "edge" | "browser" | null;

type EngineId = "edge" | "gemini";
type Pin = EngineId | "browser" | null;

const FIRST_CHUNK_DEADLINE_MS = 4000;
const LATER_CHUNK_GRACE_MS = 4500;
const EXTENDED_WAIT_MS = 6000;
const CACHE_LIMIT = 60;
const SILENT_WAV =
  "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQAAAAA=";

type FetchResult = { url: string; engine: EngineId } | null;

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T | "timeout"> {
  if (ms <= 0) return Promise.race([p, Promise.resolve("timeout" as const)]);
  return Promise.race([
    p,
    new Promise<"timeout">((resolve) => setTimeout(() => resolve("timeout"), ms)),
  ]);
}

async function awaitFetch(p: Promise<FetchResult>, firstMs: number): Promise<FetchResult> {
  const first = await withTimeout(p, firstMs);
  if (first !== "timeout") return first;
  const second = await withTimeout(p, EXTENDED_WAIT_MS);
  return second === "timeout" ? null : second;
}

function pauseAfterChunk(text: string): number {
  const t = text.trimEnd();
  if (/[.!?]["'”’)]?$/.test(t)) return 380;
  if (/[,;:]["'”’)]?$/.test(t)) return 230;
  return 280;
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
  const cacheRef = useRef<Map<string, { url: string; engine: EngineId }>>(new Map());
  const pinRef = useRef<Pin>(null);
  const readPin = useCallback((): Pin => pinRef.current, []);
  const switchUsedRef = useRef(false);
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
      cache.forEach((entry) => URL.revokeObjectURL(entry.url));
      cache.clear();
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        try {
          window.speechSynthesis.cancel();
        } catch {}
      }
    };
  }, []);

  const cachePut = useCallback((text: string, url: string, engine: EngineId) => {
    const cache = cacheRef.current;
    if (cache.has(text)) {
      const existing = cache.get(text);
      if (existing && existing.url !== url) URL.revokeObjectURL(url);
      return;
    }
    if (cache.size >= CACHE_LIMIT) {
      const oldest = cache.keys().next().value;
      if (oldest !== undefined) {
        const old = cache.get(oldest);
        if (old) URL.revokeObjectURL(old.url);
        cache.delete(oldest);
      }
    }
    cache.set(text, { url, engine });
  }, []);

  const purgeCacheExcept = useCallback((engine: EngineId) => {
    const cache = cacheRef.current;
    cache.forEach((entry, key) => {
      if (entry.engine !== engine) {
        URL.revokeObjectURL(entry.url);
        cache.delete(key);
      }
    });
  }, []);

  const fetchTts = useCallback(
    (text: string, engineWanted?: EngineId): Promise<FetchResult> => {
      const pin = pinRef.current;
      if (pin === "browser") return Promise.resolve(null);
      const wanted = engineWanted ?? (pin === "edge" || pin === "gemini" ? pin : undefined);
      const cached = cacheRef.current.get(text);
      if (cached) {
        if (!wanted || cached.engine === wanted) return Promise.resolve({ url: cached.url, engine: cached.engine });
        URL.revokeObjectURL(cached.url);
        cacheRef.current.delete(text);
      }
      return (async () => {
        try {
          const res = await fetch("/api/tts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              text,
              ...(voiceName ? { voice: voiceName } : {}),
              ...(wanted ? { engine: wanted } : {}),
            }),
          });
          if (!res.ok || !(res.headers.get("Content-Type") || "").includes("audio")) return null;
          const blob = await res.blob();
          if (!blob.size) return null;
          const header = res.headers.get("X-Voice-Engine") || "";
          const engine: EngineId = header === "edge" ? "edge" : "gemini";
          if (wanted && engine !== wanted) return null;
          const url = URL.createObjectURL(blob);
          cachePut(text, url, engine);
          if (!pinRef.current && !engineWanted) {
            pinRef.current = engine;
            setVoiceSource(engine);
            purgeCacheExcept(engine);
          }
          return { url, engine };
        } catch {
          return null;
        }
      })();
    },
    [cachePut, purgeCacheExcept, voiceName]
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
      try {
        const speakBrowserFrom = async (start: number) => {
          setVoiceSource("browser");
          for (let j = start; j < chunks.length; j++) {
            if (token !== tokenRef.current) return;
            if (j === chunks.length - 1) fireAboutToEnd();
            await speakSentenceBrowser(chunks[j], pitch);
            if (token !== tokenRef.current) return;
            if (j < chunks.length - 1) await new Promise((r) => setTimeout(r, pauseAfterChunk(chunks[j])));
          }
        };

        if (pinRef.current === "browser") {
          await speakBrowserFrom(0);
          return;
        }

        const pending: (Promise<FetchResult> | undefined)[] = new Array(chunks.length);
        pending[0] = fetchTts(chunks[0]);
        let restFired = false;
        const fireRest = () => {
          if (restFired) return;
          restFired = true;
          const pinAtFire = readPin();
          if (pinAtFire === "browser") return;
          for (let i = 1; i < chunks.length; i++) pending[i] = fetchTts(chunks[i]);
        };

        for (let i = 0; i < chunks.length; i++) {
          if (token !== tokenRef.current) return;
          const pinLoop = readPin();
          if (pinLoop === "browser") {
            await speakBrowserFrom(i);
            return;
          }
          if (!pending[i]) pending[i] = fetchTts(chunks[i]);
          const budget = i === 0 ? FIRST_CHUNK_DEADLINE_MS : LATER_CHUNK_GRACE_MS;
          let result = await awaitFetch(pending[i] as Promise<FetchResult>, budget);
          if (token !== tokenRef.current) return;

          const pinNow = readPin();
          if (result && (pinNow === "edge" || pinNow === "gemini") && result.engine !== pinNow) {
            result = await awaitFetch(fetchTts(chunks[i]), LATER_CHUNK_GRACE_MS);
            if (token !== tokenRef.current) return;
            const pinAfter = readPin();
            if (result && (pinAfter === "edge" || pinAfter === "gemini") && result.engine !== pinAfter) result = null;
          }

          if (!result) {
            const pin = readPin();
            if ((pin === "edge" || pin === "gemini") && !switchUsedRef.current) {
              const other: EngineId = pin === "edge" ? "gemini" : "edge";
              const switched = await awaitFetch(fetchTts(chunks[i], other), LATER_CHUNK_GRACE_MS);
              if (token !== tokenRef.current) return;
              if (switched) {
                switchUsedRef.current = true;
                pinRef.current = other;
                setVoiceSource(other);
                purgeCacheExcept(other);
                result = switched;
              }
            }
            if (!result) {
              pinRef.current = "browser";
              await speakBrowserFrom(i);
              return;
            }
          }

          const isLast = i === chunks.length - 1;
          setVoiceSource(result.engine);
          fireRest();
          const played = await playUrl(result.url, token, isLast ? fireAboutToEnd : undefined);
          if (token !== tokenRef.current) return;
          if (!played) {
            try {
              getAudio()?.pause();
            } catch {}
            pinRef.current = "browser";
            await speakBrowserFrom(i);
            return;
          }
          if (i < chunks.length - 1) {
            await new Promise((r) => setTimeout(r, pauseAfterChunk(chunks[i])));
            if (token !== tokenRef.current) return;
          }
        }
      } finally {
        if (token === tokenRef.current) endSpeech();
      }
    },
    [fetchTts, playUrl, stop, beginSpeech, endSpeech, fireAboutToEnd, pitch, purgeCacheExcept, getAudio, readPin]
  );

  const prefetch = useCallback(
    (text: string) => {
      if (!text.trim()) return;
      if (pinRef.current === "browser") return;
      for (const c of chunkForSpeech(text)) void fetchTts(c);
    },
    [fetchTts]
  );

  return { speak, stop, voiceSource, speaking, unlock, prefetch };
}
