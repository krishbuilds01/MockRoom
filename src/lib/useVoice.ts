"use client";
import { useEffect, useRef, useState } from "react";

type Rec = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((e: unknown) => void) | null;
  onerror: ((e: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type ResultEvent = {
  resultIndex: number;
  results: ArrayLike<{ isFinal?: boolean; 0?: { transcript?: string } }>;
};

export interface VoiceOptions {
  handsFree?: boolean;
  onFinal?: (text: string) => void;
  onHandsFreeError?: () => void;
}

const SILENCE_MS = 1800;
const MAX_EMPTY_ENDS = 8;

function errorMessage(code: string | undefined): string {
  switch (code) {
    case "not-allowed":
    case "service-not-allowed":
      return "Mic permission was denied. Allow microphone access in your browser settings, or type your answer instead.";
    case "audio-capture":
      return "No microphone was found. Connect a mic, or type your answer instead.";
    case "no-speech":
      return "I did not hear anything. Tap Mic and speak right away, or type your answer.";
    case "network":
      return "Voice input needs an internet connection in Chrome. Check the connection, or type your answer.";
    case "aborted":
      return "";
    default:
      return "Voice input hit a problem. Type your answer instead, it counts exactly the same.";
  }
}

export function useVoice(onText: (text: string) => void, gateRef?: { current: boolean }, options?: VoiceOptions) {
  const [listening, setListening] = useState(false);
  const [userOn, setUserOn] = useState(false);
  const [gated, setGated] = useState(false);
  const [error, setError] = useState("");
  const [turnActive, setTurnActive] = useState(false);
  const [supported] = useState(() => {
    if (typeof window === "undefined") return false;
    return !!((window as unknown as Record<string, unknown>).SpeechRecognition || (window as unknown as Record<string, unknown>).webkitSpeechRecognition);
  });
  const recRef = useRef<Rec | null>(null);
  const optsRef = useRef(options);
  useEffect(() => {
    optsRef.current = options;
  });
  const turnRef = useRef(false);
  const recogActiveRef = useRef(false);
  const finalTextRef = useRef("");
  const emptyEndsRef = useRef(0);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
      try {
        recRef.current?.stop();
      } catch {}
      recRef.current = null;
    };
  }, []);

  function clearTimers() {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
  }

  function createRecognition(): Rec | null {
    const w = window as unknown as Record<string, unknown>;
    const Ctor = (w.SpeechRecognition || w.webkitSpeechRecognition) as (new () => Rec) | undefined;
    if (!Ctor) return null;
    try {
      recRef.current?.stop();
    } catch {}
    const rec = new Ctor();
    rec.lang = "en-US";
    recRef.current = rec;
    return rec;
  }

  function beginRecognition() {
    const rec = createRecognition();
    if (!rec) {
      setError("Voice input is not supported in this browser. Type your answer instead.");
      return;
    }
    setError("");
    rec.interimResults = false;
    rec.continuous = false;
    rec.onresult = (e) => {
      if (gateRef?.current) return;
      const ev = e as { results: ArrayLike<ArrayLike<{ transcript: string }>> };
      const text = ev.results[0]?.[0]?.transcript;
      if (text) onText(text);
    };
    rec.onerror = (e) => {
      setListening(false);
      const msg = errorMessage(e?.error);
      if (msg) setError(msg);
    };
    rec.onend = () => setListening(false);
    setListening(true);
    try {
      rec.start();
    } catch {
      setListening(false);
      setError("Voice input could not start. Type your answer instead.");
    }
  }

  function armSilenceTimer() {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    silenceTimerRef.current = setTimeout(() => {
      silenceTimerRef.current = null;
      if (!turnRef.current) return;
      if (!finalTextRef.current.trim()) {
        armSilenceTimer();
        return;
      }
      finishTurn();
    }, SILENCE_MS);
  }

  function finishTurn() {
    if (!turnRef.current) return;
    turnRef.current = false;
    setTurnActive(false);
    clearTimers();
    try {
      recRef.current?.stop();
    } catch {}
    recogActiveRef.current = false;
    setListening(false);
    const text = finalTextRef.current.trim();
    finalTextRef.current = "";
    if (text) optsRef.current?.onFinal?.(text);
  }

  function failHandsFree(code: string | undefined) {
    turnRef.current = false;
    setTurnActive(false);
    clearTimers();
    recogActiveRef.current = false;
    setListening(false);
    const msg = errorMessage(code);
    if (msg) setError(msg);
    optsRef.current?.onHandsFreeError?.();
  }

  function startHandsFreeRecognition() {
    if (!turnRef.current || recogActiveRef.current) return;
    if (gateRef?.current) return;
    const rec = createRecognition();
    if (!rec) {
      failHandsFree(undefined);
      return;
    }
    rec.interimResults = true;
    rec.continuous = true;
    rec.onresult = (e) => {
      if (gateRef?.current) return;
      if (!turnRef.current) return;
      const ev = e as ResultEvent;
      let interim = "";
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const r = ev.results[i];
        const t = r?.[0]?.transcript || "";
        if (!t) continue;
        if (r.isFinal) {
          finalTextRef.current = (finalTextRef.current ? finalTextRef.current + " " : "") + t.trim();
          emptyEndsRef.current = 0;
        } else {
          interim = t;
        }
      }
      const display = (finalTextRef.current + (interim ? " " + interim.trim() : "")).trim();
      if (display) onText(display);
      armSilenceTimer();
    };
    rec.onerror = (e) => {
      recogActiveRef.current = false;
      setListening(false);
      if (!turnRef.current) return;
      const code = e?.error;
      if (code === "aborted" || code === "no-speech") return;
      failHandsFree(code);
    };
    rec.onend = () => {
      recogActiveRef.current = false;
      setListening(false);
      if (!turnRef.current) return;
      if (gateRef?.current) return;
      if (finalTextRef.current.trim()) {
        finishTurn();
        return;
      }
      emptyEndsRef.current += 1;
      if (emptyEndsRef.current > MAX_EMPTY_ENDS) {
        turnRef.current = false;
        setTurnActive(false);
        clearTimers();
        return;
      }
      if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
      restartTimerRef.current = setTimeout(() => {
        restartTimerRef.current = null;
        startHandsFreeRecognition();
      }, 350);
    };
    recogActiveRef.current = true;
    setListening(true);
    try {
      rec.start();
    } catch {
      recogActiveRef.current = false;
      setListening(false);
      failHandsFree(undefined);
    }
  }

  function beginTurn() {
    if (!supported) {
      optsRef.current?.onHandsFreeError?.();
      return;
    }
    if (turnRef.current && recogActiveRef.current) return;
    turnRef.current = true;
    setTurnActive(true);
    finalTextRef.current = "";
    emptyEndsRef.current = 0;
    setError("");
    startHandsFreeRecognition();
  }

  function endTurn() {
    turnRef.current = false;
    setTurnActive(false);
    clearTimers();
    finalTextRef.current = "";
    try {
      recRef.current?.stop();
    } catch {}
    recogActiveRef.current = false;
    setListening(false);
  }

  function start() {
    if (optsRef.current?.handsFree) {
      beginTurn();
      return;
    }
    setUserOn(true);
    if (gateRef?.current) {
      setGated(true);
      return;
    }
    beginRecognition();
  }

  function stop() {
    setUserOn(false);
    setGated(false);
    endTurn();
    try {
      recRef.current?.stop();
    } catch {}
    setListening(false);
  }

  function applyGate(g: boolean) {
    if (g) {
      setGated((prev) => {
        if (!prev) {
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = null;
          }
          try {
            recRef.current?.stop();
          } catch {}
          recogActiveRef.current = false;
          setListening(false);
        }
        return true;
      });
      return;
    }
    setGated((prev) => {
      if (prev && !optsRef.current?.handsFree) {
        setUserOn((on) => {
          if (on) beginRecognition();
          return on;
        });
      }
      return false;
    });
  }

  return { listening, supported, error, start, stop, userOn, gated, applyGate, beginTurn, endTurn, turnActive };
}
