"use client";
import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Camera from "@/components/Camera";
import { generalFollowUp, generalQuestions, saveSession, computeScores, speak, type Msg } from "@/lib/interviewer";
import { useVoice } from "@/lib/useVoice";

function GeneralRoom() {
  const params = useSearchParams();
  const difficulty = params.get("difficulty") || "Mid";
  const router = useRouter();
  const questions = generalQuestions(difficulty);
  const [transcript, setTranscript] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [qIndex, setQIndex] = useState(0);
  const [followed, setFollowed] = useState(false);
  const [muted, setMuted] = useState(false);
  const [startedAt] = useState(() => Date.now());
  const [elapsed, setElapsed] = useState(0);
  const startedRef = useRef(false);
  const voice = useVoice((text) => setInput(text));

  useEffect(() => {
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => clearInterval(t);
  }, [startedAt]);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    const intro = `Hi, I am your interviewer today. This is a ${difficulty} level interview, so expect ${difficulty === "Hard" ? "strict follow-ups and trade-off questions" : difficulty === "Easy" ? "friendly follow-ups and hints if you get stuck" : "real follow-up questions on your answers"}. We will do ${questions.length} questions. First question: ${questions[0]}`;
    setTranscript([{ role: "ai", text: intro, ts: Date.now() }]);
    speak(intro, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function push(role: Msg["role"], text: string) {
    setTranscript((prev) => [...prev, { role, text, ts: Date.now() }]);
  }

  function submitAnswer(raw?: string) {
    const answer = (raw ?? input).trim();
    if (!answer) return;
    setInput("");
    push("user", answer);
    if (!followed) {
      const fu = generalFollowUp(answer, difficulty, qIndex);
      setFollowed(true);
      setTimeout(() => {
        push("ai", fu);
        speak(fu, muted);
      }, 400);
      return;
    }
    const next = qIndex + 1;
    if (next >= questions.length) {
      const closing = "That was the last question. Thank you, I have enough to write your feedback now.";
      setTimeout(() => {
        push("ai", closing);
        speak(closing, muted);
      }, 400);
      setQIndex(next);
      return;
    }
    setQIndex(next);
    setFollowed(false);
    const q = `Question ${next + 1}: ${questions[next]}`;
    setTimeout(() => {
      push("ai", q);
      speak(q, muted);
    }, 400);
  }

  function endInterview() {
    const timeSec = Math.floor((Date.now() - startedAt) / 1000);
    const userCount = transcript.filter((m) => m.role === "user").length;
    const signals = { testsPassed: 0, totalTests: 0, runs: 0, approachExplained: userCount >= 2, aiQuestionsAnswered: userCount, timeSec, isTechnical: false, transcriptCount: transcript.length };
    const scores = computeScores(signals);
    saveSession({
      id: String(Date.now()),
      type: "general",
      difficulty,
      date: new Date().toISOString(),
      timeSec,
      testsPassed: 0,
      totalTests: 0,
      runs: 0,
      transcript,
      scores,
    });
    if (typeof window !== "undefined") window.speechSynthesis?.cancel();
    router.push("/interview/feedback");
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-4 py-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="font-semibold">Live AI Interview</div>
          <div className="text-xs text-neutral-500">{difficulty} level - Question {Math.min(qIndex + 1, questions.length)} of {questions.length} - {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, "0")}</div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setMuted(!muted)} className="rounded-lg border border-neutral-700 px-3 py-2 text-sm">{muted ? "Unmute AI voice" : "Mute AI voice"}</button>
          <button onClick={endInterview} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white">End Interview</button>
        </div>
      </header>

      <div className="mt-6 grid gap-5 lg:grid-cols-[320px_1fr]">
        <div className="space-y-4">
          <Camera />
          <div className="rounded-xl border border-neutral-800 p-4 text-xs leading-5 text-neutral-400">
            Speak your answer with the mic button, or type it. The AI gives one follow-up per question, then moves on.
            {qIndex >= questions.length && <div className="mt-2 text-neutral-200">Interview complete. Click End Interview to see your feedback.</div>}
          </div>
        </div>

        <section className="flex min-h-[540px] flex-col rounded-2xl border border-neutral-800">
          <div className="flex-1 space-y-3 overflow-y-auto p-5">
            {transcript.map((m, i) => (
              <div key={i} className={`max-w-[85%] rounded-xl px-4 py-3 text-sm leading-6 ${m.role === "ai" ? "bg-neutral-900 text-neutral-100" : "ml-auto bg-white text-black"}`}>
                <div className="mb-1 text-[11px] font-medium opacity-60">{m.role === "ai" ? "AI Interviewer" : "You"}</div>
                {m.text}
              </div>
            ))}
          </div>
          <div className="border-t border-neutral-800 p-4">
            {!voice.supported && <p className="mb-2 text-xs text-amber-400">Voice input is not supported in this browser. Type your answer instead. Chrome works best.</p>}
            <div className="flex gap-2">
              <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submitAnswer()} placeholder="Type your answer, or use the mic..." className="flex-1 rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-3 text-sm outline-none" />
              <button onClick={() => (voice.listening ? voice.stop() : voice.start())} disabled={!voice.supported} className="rounded-lg border border-neutral-700 px-4 text-sm disabled:opacity-40">{voice.listening ? "Listening... tap to stop" : "Mic"}</button>
              <button onClick={() => submitAnswer()} className="rounded-lg bg-white px-5 text-sm font-semibold text-black">Send</button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-neutral-400">Loading interview room...</div>}>
      <GeneralRoom />
    </Suspense>
  );
}
