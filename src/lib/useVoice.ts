"use client";
import { useEffect, useRef, useState } from "react";

type Rec = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((e: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

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

export function useVoice(onText: (text: string) => void) {
  const [listening, setListening] = useState(false);
  const [error, setError] = useState("");
  const [supported] = useState(() => {
    if (typeof window === "undefined") return false;
    return !!((window as unknown as Record<string, unknown>).SpeechRecognition || (window as unknown as Record<string, unknown>).webkitSpeechRecognition);
  });
  const recRef = useRef<Rec | null>(null);

  useEffect(() => {
    return () => {
      try {
        recRef.current?.stop();
      } catch {}
      recRef.current = null;
    };
  }, []);

  function start() {
    const w = window as unknown as Record<string, unknown>;
    const Ctor = (w.SpeechRecognition || w.webkitSpeechRecognition) as (new () => Rec) | undefined;
    if (!Ctor) {
      setError("Voice input is not supported in this browser. Type your answer instead.");
      return;
    }
    setError("");
    try {
      recRef.current?.stop();
    } catch {}
    const rec = new Ctor();
    rec.lang = "en-US";
    rec.interimResults = false;
    rec.continuous = false;
    rec.onresult = (e) => {
      const text = e.results[0][0].transcript;
      if (text) onText(text);
    };
    rec.onerror = (e) => {
      setListening(false);
      const msg = errorMessage(e?.error);
      if (msg) setError(msg);
    };
    rec.onend = () => setListening(false);
    recRef.current = rec;
    setListening(true);
    try {
      rec.start();
    } catch {
      setListening(false);
      setError("Voice input could not start. Type your answer instead.");
    }
  }

  function stop() {
    try {
      recRef.current?.stop();
    } catch {}
    setListening(false);
  }

  return { listening, supported, error, start, stop };
}
