"use client";
import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Camera from "@/components/Camera";
import {
  candidateQuestionAnswer,
  computeScores,
  generalFollowUp,
  generalOpeningText,
  generalQuestions,
  generalSecondFollowUp,
  introReaction,
  isReadySignal,
  isThinAnswer,
  saveSession,
  wordCount,
  type Msg,
  type SessionRecord,
} from "@/lib/interviewer";
import { targetSecFor } from "@/lib/problems";
import { postInterview } from "@/lib/interviewApi";
import { useVoice } from "@/lib/useVoice";
import { useSpeaker } from "@/lib/useSpeaker";
import { useLiveSession } from "@/lib/liveSession";
import { INTERVIEWER_NAME } from "@/lib/interviewer";

type Phase = "intro" | "main" | "candidate" | "done";

const PHASE_STEPS = ["Opening", "Questions", "Your questions", "Done"];
const PHASE_INDEX: Record<Phase, number> = { intro: 0, main: 1, candidate: 2, done: 3 };
const PHASE_LABELS: Record<Phase, string> = {
  intro: "Opening",
  main: "Questions",
  candidate: "Your questions",
  done: "Done",
};

function isBehavioural(q: string): boolean {
  return /(time you|describe a time|disagreed|weakest|a hard bug)/i.test(q);
}

function generalLiveSystemInstruction(
  difficulty: string,
  targetMinutes: number,
  questionCount: number,
): string {
  return [
    `You are ${INTERVIEWER_NAME}, a senior software engineer conducting a live interview. You speak with a natural, warm, professional voice, at a relaxed conversational pace.`,
    `This is a ${difficulty} level interview of about ${targetMinutes} minutes with ${questionCount} main questions, each with strict follow-ups.`,
    "You are being directed by an interviewer engine. Messages that start with [Director] are instructions for exactly what to say or do next: follow them immediately and precisely, keep every fact and question they contain, and do not add extra questions of your own.",
    "When the candidate speaks, listen. Do not answer at length on your own: a [Director] instruction follows shortly and tells you what to say. A very brief acknowledgement (two or three words) is fine while you wait.",
    "Be strict and professional, like a real interviewer at a top company. Never mention scores, marks or feedback during the interview. Speak in short turns, one question at a time.",
  ].join("\n");
}

const STAR_SUFFIX = " Structure it like a story: the situation, your task, what you did, and the result.";

function GeneralRoom() {
  const params = useSearchParams();
  const difficulty = params.get("difficulty") || "Mid";
  const router = useRouter();
  const questions = generalQuestions(difficulty);
  const targetSec = targetSecFor("general", difficulty);
  const [transcript, setTranscript] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [phase, setPhase] = useState<Phase>("intro");
  const [qIndex, setQIndex] = useState(0);
  const [stage, setStage] = useState(0);
  const [muted, setMuted] = useState(false);
  const [engine, setEngine] = useState<"gemini" | "local" | null>(null);
  const [startedAt] = useState(() => Date.now());
  const [elapsed, setElapsed] = useState(0);
  const startedRef = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const statsRef = useRef({ answers: 0, words: 0, thin: 0, followUpsAsked: 0, followUpsAnswered: 0, introPushes: 0, askedEnd: false });
  const introRef = useRef("");
  const transcriptRef = useRef<Msg[]>([]);
  const mountedRef = useRef(true);
  const savedRef = useRef(false);
  const transcriptBoxRef = useRef<HTMLDivElement>(null);
  const mutedRef = useRef(muted);
  const speaker = useSpeaker();
  const voice = useVoice((text) => setInput(text));
  const [liveDisabled, setLiveDisabled] = useState(false);
  const [liveSpeaking, setLiveSpeaking] = useState(false);
  const live = useLiveSession({
    onAiTurn: (t) => aiTurnRef.current(t),
    onUserTurn: (t) => submitRef.current?.(t),
    onSpeaking: (s) => setLiveSpeaking(s),
  });
  const liveActiveRef = useRef(false);
  const liveDisabledRef = useRef(false);
  const submitRef = useRef<((text: string) => void) | null>(null);
  const aiTurnRef = useRef<(text: string) => void>(() => {});
  useEffect(() => {
    liveActiveRef.current = live.status === "live";
  }, [live.status]);
  useEffect(() => {
    aiTurnRef.current = (text: string) => {
      if (!mountedRef.current) return;
      setTranscript((prev) => [...prev, { role: "ai", text, ts: Date.now() }]);
    };
  });

  useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);
  useEffect(() => {
    mutedRef.current = muted;
  }, [muted]);
  useEffect(() => {
    const el = transcriptBoxRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [transcript]);

  useEffect(() => {
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => clearInterval(t);
  }, [startedAt]);

  useEffect(() => {
    const h = () => {
      speaker.unlock();
      live.unlock();
    };
    window.addEventListener("pointerdown", h, { once: true });
    window.addEventListener("keydown", h, { once: true });
    return () => {
      window.removeEventListener("pointerdown", h);
      window.removeEventListener("keydown", h);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    let cancelled = false;
    (async () => {
      if (!liveDisabledRef.current) {
        const ok = await live.connect(
          generalLiveSystemInstruction(difficulty, Math.round(targetSec / 60), questions.length),
        );
        if (cancelled) return;
        if (ok) {
          live.sendText(
            `[Director] The candidate just joined. Introduce yourself as Alex, explain in two short sentences how this interview runs (${questions.length} questions with follow-ups, about ${Math.round(targetSec / 60)} minutes, then their questions at the end), and ask the candidate to introduce themselves in a few lines.`,
          );
          return;
        }
      }
      if (cancelled) return;
      const intro = generalOpeningText(difficulty, Math.round(targetSec / 60), questions.length);
      setTranscript([{ role: "ai", text: intro, ts: Date.now() }]);
      speaker.speak(intro, false);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function push(role: Msg["role"], text: string) {
    if (!mountedRef.current) return;
    setTranscript((prev) => [...prev, { role, text, ts: Date.now() }]);
  }

  function sayNow(text: string) {
    if (liveActiveRef.current) {
      live.sendText(
        `[Director] Say this to the candidate now, in your own natural words, keeping every fact, number and question in it, and do not add new questions: ${text}`,
      );
      return;
    }
    push("ai", text);
    speaker.speak(text, mutedRef.current);
  }

  function sayLater(text: string) {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      if (!mountedRef.current) return;
      sayNow(text);
    }, 400);
  }

  function questionText(idx: number): string {
    const halfway = idx === Math.floor(questions.length / 2);
    const prefix = halfway ? "We are about halfway through. " : "";
    const star = isBehavioural(questions[idx]) ? STAR_SUFFIX : "";
    return `${prefix}Question ${idx + 1}: ${questions[idx]}${star}`;
  }

  async function submitAnswer(preset?: string) {
    const answer = (preset ?? input).trim();
    if (!answer) return;
    if (!preset) setInput("");
    if (liveActiveRef.current && !preset) {
      live.sendText(`[The candidate typed this message]: ${answer}`);
    }
    push("user", answer);
    statsRef.current.words += wordCount(answer);

    if (phase === "done") {
      sayNow("That is the end of the interview. Click End Interview and read your feedback carefully, it is specific about what to fix.");
      return;
    }

    if (phase === "intro") {
      if (wordCount(answer) < 8 && statsRef.current.introPushes < 1) {
        statsRef.current.introPushes += 1;
        sayNow(introReaction(answer, 1) + " Take another go at the introduction.");
        return;
      }
      introRef.current = answer;
      const api = await postInterview({
        mode: "intro",
        difficulty,
        message: answer,
        transcript: transcriptRef.current.slice(-6),
      });
      if (!mountedRef.current) return;
      let reaction: string;
      if (api && api.reply) {
        setEngine(api.engine);
        reaction = api.reply;
      } else {
        setEngine("local");
        reaction = wordCount(answer) < 8 ? "Right, let us get into it." : introReaction(answer, 2);
      }
      setPhase("main");
      sayNow(`${reaction} Let us start. ${questionText(0)}`);
      return;
    }

    if (phase === "candidate") {
      if (isReadySignal(answer)) {
        setPhase("done");
        sayNow("Understood. Thank you for your time, that wraps us up. Click End Interview to see your feedback: it goes question by question and names exactly what to work on.");
        return;
      }
      statsRef.current.askedEnd = true;
      const api = await postInterview({
        mode: "candidate-question",
        difficulty,
        message: answer,
        transcript: transcriptRef.current.slice(-6),
      });
      if (!mountedRef.current) return;
      let ans: string;
      if (api && api.reply) {
        setEngine(api.engine);
        ans = api.reply;
      } else {
        setEngine("local");
        ans = candidateQuestionAnswer(answer);
      }
      setPhase("done");
      sayNow(`${ans} That is a good place to wrap up. Thank you for your time. Click End Interview to see your feedback.`);
      return;
    }

    if (qIndex >= questions.length) return;

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
      if (!mountedRef.current) return;
      if (api && api.reply) {
        setEngine(api.engine);
        sayNow(api.reply);
      } else {
        setEngine("local");
        sayNow(generalFollowUp(answer, difficulty, qIndex));
      }
      return;
    }

    statsRef.current.followUpsAnswered += 1;
    if (stage === 1 && isThinAnswer(answer, difficulty)) {
      statsRef.current.followUpsAsked += 1;
      setStage(2);
      const fu2 = generalSecondFollowUp(answer, difficulty);
      sayNow(isBehavioural(questions[qIndex]) ? fu2 + " And use the STAR structure this time: situation, task, action, result." : fu2);
      return;
    }

    const next = qIndex + 1;
    if (next >= questions.length) {
      setQIndex(next);
      setPhase("candidate");
      sayLater("That covers my questions. We have a couple of minutes left. Do you have any questions for me, about the role or the team?");
      return;
    }
    setQIndex(next);
    setStage(0);
    sayLater(questionText(next));
  }

  useEffect(() => {
    submitRef.current = (t: string) => {
      void submitAnswer(t);
    };
  });

  function buildRecord(incomplete: boolean): SessionRecord {
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
    return {
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
      introGiven: !!introRef.current,
      askedQuestionAtEnd: st.askedEnd,
      incomplete,
    };
  }

  function hasActivity(): boolean {
    return transcriptRef.current.some((m) => m.role === "user");
  }

  function savePartial() {
    if (savedRef.current || !hasActivity()) return;
    savedRef.current = true;
    try {
      saveSession(buildRecord(true));
    } catch {}
  }
  const savePartialRef = useRef(savePartial);
  useEffect(() => {
    savePartialRef.current = savePartial;
  });

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (savedRef.current || !hasActivity()) return;
      savePartialRef.current();
      e.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      savePartialRef.current();
    };
  }, []);

  function onBackHome(e: React.MouseEvent) {
    if (savedRef.current || !hasActivity()) return;
    if (!window.confirm("Leave the interview? Your answers so far will be saved to your history as an incomplete session.")) {
      e.preventDefault();
      return;
    }
    savePartial();
  }

  function endInterview() {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    speaker.stop();
    voice.stop();
    live.close();
    savedRef.current = true;
    saveSession(buildRecord(false));
    router.push("/interview/feedback");
  }

  async function retryLive() {
    liveDisabledRef.current = false;
    setLiveDisabled(false);
    const ok = await live.connect(
      generalLiveSystemInstruction(difficulty, Math.round(targetSec / 60), questions.length),
    );
    if (ok) {
      live.sendText(
        `[Director] We reconnected mid-interview after a drop. Current phase: ${PHASE_LABELS[phase]}. Continue naturally from this phase in one or two short sentences.`,
      );
    }
  }

  function useTextMode() {
    liveDisabledRef.current = true;
    setLiveDisabled(true);
    live.close();
  }

  const voiceLabel =
    live.status === "live"
      ? "Gemini Live"
      : live.status === "connecting"
        ? "connecting"
        : speaker.voiceSource === "gemini"
          ? "Gemini voice"
          : speaker.voiceSource === "browser"
            ? "browser voice"
            : "connecting";
  const engineLabel =
    live.status === "live"
      ? "Gemini Live"
      : engine === "gemini"
        ? "Gemini"
        : engine === "local"
          ? "local mode"
          : "connecting";
  const phaseIdx = PHASE_INDEX[phase];
  const statusLine =
    phase === "main"
      ? `${difficulty} level · Question ${Math.min(qIndex + 1, questions.length)} of ${questions.length}`
      : `${difficulty} level · ${PHASE_LABELS[phase]}`;
  const inputPlaceholder: Record<Phase, string> = {
    intro: "Introduce yourself...",
    main: "Type your answer, or use the mic...",
    candidate: "Ask Alex a question, or say none...",
    done: "Interview complete",
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/" onClick={onBackHome} className="text-xs text-zinc-500 hover:text-zinc-200">Back to home</Link>
          <div className="mt-1.5 flex flex-wrap items-center gap-2.5">
            <span className="text-[15px] font-semibold tracking-tight">Live AI Interview</span>
            <span className={`badge ${difficulty === "Easy" ? "badge-easy" : difficulty === "Hard" ? "badge-hard" : "badge-mid"}`}>{difficulty}</span>
            <span className="badge badge-accent">{PHASE_LABELS[phase]}</span>
            {live.status === "live" && (
              <span className="badge badge-live">
                <span className="dot dot-pulse bg-emerald-400" />
                Gemini Live
              </span>
            )}
          </div>
          <div className="mt-1 text-xs text-zinc-500">
            {`${statusLine} · ${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, "0")} of about ${Math.round(targetSec / 60)} min target · AI: ${engineLabel} · Voice: ${voiceLabel}`}
          </div>
          {(speaker.speaking || liveSpeaking) && (
            <div className="mt-1.5 flex items-center gap-1.5 text-[11px] font-medium text-emerald-400" role="status">
              <span className="dot dot-pulse bg-emerald-400" />
              Interviewer is speaking
            </div>
          )}
          <div className="mt-3 flex max-w-md gap-1" aria-label="Interview progress">
            {PHASE_STEPS.map((s, i) => (
              <div key={s} className="min-w-0 flex-1">
                <div className={`h-1 rounded-full ${i < phaseIdx ? "bg-accent/60" : i === phaseIdx ? "bg-accent" : "bg-line"}`} />
                <div className={`mt-1.5 truncate text-[10px] ${i === phaseIdx ? "font-semibold text-zinc-100" : "text-zinc-500"}`}>{s}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => { const next = !muted; setMuted(next); live.setMuted(next); if (next) speaker.stop(); }} aria-label="Toggle AI voice" className="btn btn-ghost btn-sm">{muted ? "Unmute AI voice" : "Mute AI voice"}</button>
          {(live.status === "live" || live.status === "connecting") && (
            <button type="button" onClick={useTextMode} className="btn btn-ghost btn-sm">Use text mode</button>
          )}
          {live.status === "fallback" && !liveDisabled && (
            <button type="button" onClick={retryLive} className="btn btn-ghost btn-sm">Retry live voice</button>
          )}
          <button type="button" onClick={endInterview} className="btn btn-danger btn-sm">End Interview</button>
        </div>
      </header>

      <div className="mt-6 grid flex-1 gap-5 lg:grid-cols-[320px_1fr]">
        <div className="space-y-4">
          <div>
            <Camera />
          </div>
          <div className="card p-4 text-xs leading-5 text-zinc-400">
            Speak your answer with the mic, or type it. After the opening and your introduction, expect one follow-up per question, and a second one if your follow-up answer is still thin. Thin answers are scored down. The interview ends with your questions for Alex.
            {phase === "done" && <div className="mt-2 font-medium text-zinc-100">Interview complete. Click End Interview to see your feedback.</div>}
          </div>
        </div>

        <section className="card flex min-h-[480px] flex-col overflow-hidden lg:min-h-0">
          <div className="panel-head">
            <div className="flex items-center gap-3">
              <span className="avatar">A</span>
              <div>
                <div className="text-sm font-semibold leading-5">Alex</div>
                <div className="text-[11px] leading-4 text-zinc-500">Your interviewer</div>
              </div>
            </div>
            {live.status === "connecting" && <span className="badge">Connecting live voice</span>}
            {live.status === "fallback" && <span className="badge badge-mid">Voice fallback active</span>}
          </div>
          <div ref={transcriptBoxRef} className="flex-1 space-y-3 overflow-y-auto p-5" aria-live="polite">
            {transcript.map((m, i) => (
              <div key={i} className={`max-w-[85%] break-words rounded-xl px-4 py-3 text-sm leading-6 ${m.role === "ai" ? "border border-line bg-panel2 text-zinc-100" : "ml-auto bg-zinc-100 text-zinc-900"}`}>
                <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide opacity-60">{m.role === "ai" ? "Alex" : "You"}</div>
                {m.text}
              </div>
            ))}
            {transcript.length === 0 && (
              <p className="text-sm leading-6 text-zinc-500">Connecting to your interviewer. Alex will introduce himself in a moment.</p>
            )}
          </div>
          <div className="border-t border-line p-4">
            {!voice.supported && live.status !== "live" && <p className="mb-2 text-xs text-amber-400">Voice input is not supported in this browser. Type your answer instead. Chrome works best.</p>}
            {voice.error && live.status !== "live" && <p className="mb-2 text-xs text-amber-400" role="alert">{voice.error}</p>}
            {voice.listening && (
              <p className="mb-2 flex items-center gap-1.5 text-xs text-red-400" role="status">
                <span className="dot dot-pulse bg-red-500" />
                Listening, speak now
              </p>
            )}
            <div className="flex gap-2">
              <label htmlFor="general-answer" className="sr-only">Your answer</label>
              <input id="general-answer" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submitAnswer()} placeholder={inputPlaceholder[phase]} className="input min-w-0 flex-1" />
              {live.status === "live" ? (
                <span className="flex items-center gap-1.5 rounded-lg border border-emerald-800 bg-emerald-950/40 px-4 text-sm text-emerald-300" role="status">
                  <span className="dot dot-pulse bg-emerald-400" />
                  Live mic on
                </span>
              ) : (
                <button type="button" onClick={() => (voice.listening ? voice.stop() : voice.start())} disabled={!voice.supported} aria-label="Toggle microphone input" className={`btn btn-sm ${voice.listening ? "border-red-500 bg-red-950/50 text-red-300" : "btn-ghost"}`}>{voice.listening ? "Listening..." : "Mic"}</button>
              )}
              <button type="button" onClick={() => submitAnswer()} className="btn btn-primary btn-sm">Send</button>
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
