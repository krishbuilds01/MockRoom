"use client";
import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Camera from "@/components/Camera";
import {
  computeScores,
  generalFollowUp,
  generalQuestions,
  generalSecondFollowUp,
  isThinAnswer,
  saveSession,
  wordCount,
  type Msg,
} from "@/lib/interviewer";
import { targetSecFor } from "@/lib/problems";
import { postInterview } from "@/lib/interviewApi";
import { useVoice } from "@/lib/useVoice";
import { useSpeaker } from "@/lib/useSpeaker";

function GeneralRoom() {
  const params = useSearchParams();
  const difficulty = params.get("difficulty") || "Mid";
  const router = useRouter();
  const questions = generalQuestions(difficulty);
  const targetSec = targetSecFor("general", difficulty);
  const [transcript, setTranscript] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [qIndex, setQIndex] = useState(0);
  const [stage, setStage] = useState(0);
  const [muted, setMuted] = useState(false);
  const [engine, setEngine] = useState<"gemini" | "local">("local");
  const [startedAt] = useState(() => Date.now());
  const [elapsed, setElapsed] = useState(0);
  const startedRef = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const statsRef = useRef({ answers: 0, words: 0, thin: 0, followUpsAsked: 0, followUpsAnswered: 0 });
  const transcriptRef = useRef<Msg[]>([]);
  const speaker = useSpeaker();
  const voice = useVoice((text) => setInput(text));

  useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);

  useEffect(() => {
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => clearInterval(t);
  }, [startedAt]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    const intro = `Hi, I'm your interviewer. This is a ${difficulty} level session, and I'll be direct with you: short, vague answers will get pushed back, at every level. We have ${questions.length} questions, target time is about ${Math.round(targetSec / 60)} minutes. First question: ${questions[0]}`;
    setTranscript([{ role: "ai", text: intro, ts: Date.now() }]);
    speaker.speak(intro, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function push(role: Msg["role"], text: string) {
    setTranscript((prev) => [...prev, { role, text, ts: Date.now() }]);
  }

  function sayLater(text: string) {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      push("ai", text);
      speaker.speak(text, muted);
    }, 400);
  }

  async function submitAnswer() {
    const answer = input.trim();
    if (!answer || qIndex >= questions.length) return;
    setInput("");
    push("user", answer);
    const words = wordCount(answer);
    statsRef.current.words += words;

    if (stage === 0) {
      statsRef.current.answers += 1;
      if (isThinAnswer(answer, difficulty)) statsRef.current.thin += 1;
      statsRef.current.followUpsAsked += 1;
      setStage(1);
      const api = await postInterview({
        mode: "general",
        difficulty,
        message: answer,
        qIndex,
        transcript: transcriptRef.current.slice(-6),
      });
      if (api && api.reply) {
        setEngine(api.engine);
        push("ai", api.reply);
        speaker.speak(api.reply, muted);
      } else {
        setEngine("local");
        const fu = generalFollowUp(answer, difficulty, qIndex);
        push("ai", fu);
        speaker.speak(fu, muted);
      }
      return;
    }

    statsRef.current.followUpsAnswered += 1;
    if (stage === 1 && isThinAnswer(answer, difficulty)) {
      statsRef.current.followUpsAsked += 1;
      setStage(2);
      const fu2 = generalSecondFollowUp(answer, difficulty);
      push("ai", fu2);
      speaker.speak(fu2, muted);
      return;
    }

    const next = qIndex + 1;
    if (next >= questions.length) {
      setQIndex(next);
      sayLater("That was the last question. I have what I need. End the interview and read your feedback carefully, it will be specific.");
      return;
    }
    setQIndex(next);
    setStage(0);
    sayLater(`Question ${next + 1}: ${questions[next]}`);
  }

  function endInterview() {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    speaker.stop();
    voice.stop();
    const timeSec = Math.floor((Date.now() - startedAt) / 1000);
    const st = statsRef.current;
    const finalTranscript = transcriptRef.current;
    const signals = {
      testsPassed: 0,
      totalTests: 0,
      runs: 0,
      approachExplained: false,
      aiQuestionsAnswered: st.followUpsAnswered,
      aiAsked: st.followUpsAsked,
      timeSec,
      isTechnical: false,
      transcriptCount: finalTranscript.length,
      userAnswers: st.answers,
      totalUserWords: st.words,
      thinAnswers: st.thin,
      questionsTotal: questions.length,
      hintsUsed: 0,
    };
    const scores = computeScores(signals);
    saveSession({
      id: String(Date.now()),
      type: "general",
      difficulty,
      date: new Date().toISOString(),
      timeSec,
      targetSec,
      testsPassed: 0,
      totalTests: 0,
      runs: 0,
      transcript: finalTranscript,
      scores,
      hintsUsed: 0,
      aiAsked: st.followUpsAsked,
      aiAnswered: st.followUpsAnswered,
      thinAnswers: st.thin,
    });
    router.push("/interview/feedback");
  }

  const voiceLabel = speaker.voiceSource === "gemini" ? "Gemini voice" : speaker.voiceSource === "browser" ? "browser voice" : "voice ready";

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-4 py-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/" className="text-xs text-neutral-500 hover:text-neutral-300">Back to home</Link>
          <div className="mt-1 font-semibold">Live AI Interview</div>
          <div className="text-xs text-neutral-500">
            {difficulty} level - Question {Math.min(qIndex + 1, questions.length)} of {questions.length} - {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, "0")} of about {Math.round(targetSec / 60)} min target - AI: {engine === "gemini" ? "Gemini" : "local mode"} - AI voice: {voiceLabel}
          </div>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => { setMuted(!muted); if (!muted) speaker.stop(); }} aria-label="Toggle AI voice" className="rounded-lg border border-neutral-700 px-3 py-2 text-sm">{muted ? "Unmute AI voice" : "Mute AI voice"}</button>
          <button type="button" onClick={endInterview} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white">End Interview</button>
        </div>
      </header>

      <div className="mt-6 grid gap-5 lg:grid-cols-[320px_1fr]">
        <div className="space-y-4">
          <Camera />
          <div className="rounded-xl border border-neutral-800 p-4 text-xs leading-5 text-neutral-400">
            Speak your answer with the mic button, or type it. Expect one follow-up per question, and a second one if your follow-up answer is still thin. Thin answers are scored down.
            {qIndex >= questions.length && <div className="mt-2 text-neutral-200">Interview complete. Click End Interview to see your feedback.</div>}
          </div>
        </div>

        <section className="flex min-h-[540px] flex-col rounded-2xl border border-neutral-800">
          <div className="flex-1 space-y-3 overflow-y-auto p-5" aria-live="polite">
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
              <label htmlFor="general-answer" className="sr-only">Your answer</label>
              <input id="general-answer" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submitAnswer()} placeholder="Type your answer, or use the mic..." className="min-w-0 flex-1 rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-3 text-sm outline-none" />
              <button type="button" onClick={() => (voice.listening ? voice.stop() : voice.start())} disabled={!voice.supported} aria-label="Toggle microphone input" className="rounded-lg border border-neutral-700 px-4 text-sm disabled:opacity-40">{voice.listening ? "Listening... tap to stop" : "Mic"}</button>
              <button type="button" onClick={submitAnswer} className="rounded-lg bg-white px-5 text-sm font-semibold text-black">Send</button>
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
