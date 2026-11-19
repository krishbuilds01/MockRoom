"use client";
import { Suspense, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Camera from "@/components/Camera";
import { getProblemById, pickProblem, targetSecFor, type Lang } from "@/lib/problems";
import { runCode, type RunOutput } from "@/lib/runner";
import {
  aOrAn,
  analyzeApproach,
  answerCandidateQuestion,
  answerClarifying,
  candidateQuestionAnswer,
  checkComplexity,
  codeWatchProgressQuestion,
  codeWatchQuestion,
  computeScores,
  dryRunReaction,
  hasComplexityStatement,
  INTERVIEWER_NAME,
  introReaction,
  isBruteForceApproach,
  isCandidateQuestion,
  isHintRequest,
  isReadySignal,
  isThinAnswer,
  pickAck,
  saveSession,
  summarizeDiff,
  techOpeningText,
  wordCount,
  type Msg,
  type SessionRecord,
} from "@/lib/interviewer";
import { postInterview } from "@/lib/interviewApi";
import { useVoice } from "@/lib/useVoice";
import { useLiveSession } from "@/lib/liveSession";
import { useSpeaker } from "@/lib/useSpeaker";

const Editor = dynamic(() => import("@monaco-editor/react"), { ssr: false, loading: () => <div className="flex h-full items-center justify-center text-sm text-neutral-500">Loading editor...</div> });

type Phase = "opening" | "clarifying" | "approach" | "coding" | "dryrun" | "review" | "candidate" | "done";

const PHASE_STEPS = ["Opening", "Clarifying", "Approach", "Coding", "Dry run", "Complexity", "Your questions", "Done"];
const PHASE_INDEX: Record<Phase, number> = {
  opening: 0,
  clarifying: 1,
  approach: 2,
  coding: 3,
  dryrun: 4,
  review: 5,
  candidate: 6,
  done: 7,
};
const PHASE_LABELS: Record<Phase, string> = {
  opening: "Opening",
  clarifying: "Clarifying questions",
  approach: "Approach",
  coding: "Coding",
  dryrun: "Dry run",
  review: "Complexity",
  candidate: "Your questions",
  done: "Done",
};

const ackLines = [
  "Back to the code, and run it when you are ready.",
  "That is clear enough. Continue.",
  "I have that recorded. Now show me it works.",
  "Keep going. I am watching the code, not just the chat.",
];

function liveSystemInstruction(
  problem: ReturnType<typeof pickProblem>,
  difficulty: string,
  targetMinutes: number,
): string {
  return [
    `You are ${INTERVIEWER_NAME}, a senior software engineer conducting a live technical interview. You speak with a natural, warm, professional voice, at a relaxed conversational pace.`,
    `This is a ${difficulty} level interview of about ${targetMinutes} minutes. The problem is "${problem.title}": ${problem.statement}`,
    `Examples: ${problem.examples.map((e) => `input ${e.input} gives output ${e.output}`).join("; ")}. Constraints: ${problem.constraints.join("; ")}.`,
    "You are being directed by an interviewer engine. Messages that start with [Director] are instructions for exactly what to say or do next: follow them immediately and precisely, keep every fact and question they contain, and do not add extra questions of your own.",
    "When the candidate speaks, listen. Do not answer their questions or react at length on your own: a [Director] instruction follows shortly and tells you what to say. A very brief acknowledgement (two or three words) is fine while you wait.",
    "Be strict and professional, like a real interviewer at a top company. Never write code for the candidate, never give away the solution, never mention scores, marks or feedback during the interview. Speak in short turns, one question at a time.",
  ].join("\n");
}

function TechnicalRoom() {
  const params = useSearchParams();
  const difficulty = params.get("difficulty") || "Mid";
  const topic = params.get("topic") || "HashMap";
  const router = useRouter();
  const [problem] = useState(() => getProblemById(params.get("problem")) || pickProblem(topic, difficulty));
  const targetSec = targetSecFor("technical", difficulty, problem);
  const [lang, setLang] = useState<Lang>("javascript");
  const [codeByLang, setCodeByLang] = useState<Record<Lang, string>>(() => ({
    javascript: problem.starter.javascript,
    python: problem.starter.python,
  }));
  const code = codeByLang[lang];
  const [phase, setPhase] = useState<Phase>("opening");
  const [transcript, setTranscript] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [muted, setMuted] = useState(false);
  const [running, setRunning] = useState(false);
  const [runOut, setRunOut] = useState<RunOutput | null>(null);
  const [submitOut, setSubmitOut] = useState<RunOutput | null>(null);
  const [lastKind, setLastKind] = useState<"run" | "submit" | null>(null);
  const [runError, setRunError] = useState("");
  const [showAi, setShowAi] = useState(true);
  const [engine, setEngine] = useState<"gemini" | "local" | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [startedAt] = useState(() => Date.now());

  const codeRef = useRef(code);
  const langRef = useRef(lang);
  const snapshotRef = useRef(code);
  const lastAiRef = useRef(0);
  const lastChangeRef = useRef(0);
  const lastProgressRef = useRef(0);
  const phaseRef = useRef(phase);
  const mutedRef = useRef(muted);
  const runsRef = useRef(0);
  const statsRef = useRef({
    asked: 0,
    answered: 0,
    hints: 0,
    approachAttempts: 0,
    introPushes: 0,
    clarifyingCount: 0,
    dryRunPushes: 0,
    dryRunDone: false,
    askedEnd: false,
  });
  const introRef = useRef("");
  const approachRef = useRef("");
  const complexityRef = useRef<{ answer: string; correct: boolean | null }>({ answer: "", correct: null });
  const statedComplexityRef = useRef<{ answer: string; correct: boolean } | null>(null);
  const transcriptRef = useRef<Msg[]>([]);
  const submitOutRef = useRef<RunOutput | null>(null);
  const runOutRef = useRef<RunOutput | null>(null);
  const savedRef = useRef(false);
  const transcriptBoxRef = useRef<HTMLDivElement>(null);
  const startedRef = useRef(false);
  const mountedRef = useRef(true);
  const ackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
      lastAiRef.current = Date.now();
    };
  });

  const problemData = [
    "Examples: " + problem.examples.map((e) => `input ${e.input} -> output ${e.output}`).join("; "),
    "Constraints: " + problem.constraints.join("; "),
    "Edge case notes: " + problem.edgeCases.join("; "),
    "Empty input note: " + problem.emptyInputNote,
  ].join("\n");

  useEffect(() => {
    codeRef.current = codeByLang[langRef.current];
  }, [codeByLang]);
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);
  useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);
  useEffect(() => {
    const el = transcriptBoxRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [transcript]);
  useEffect(() => {
    mutedRef.current = muted;
  }, [muted]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (ackTimeoutRef.current) clearTimeout(ackTimeoutRef.current);
    };
  }, []);

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
    if (startedRef.current) return;
    startedRef.current = true;
    lastAiRef.current = Date.now();
    lastChangeRef.current = Date.now();
    lastProgressRef.current = Date.now();
    let cancelled = false;
    (async () => {
      if (!liveDisabledRef.current) {
        const ok = await live.connect(
          liveSystemInstruction(problem, difficulty, Math.round(targetSec / 60)),
        );
        if (cancelled) return;
        if (ok) {
          live.sendText(
            `[Director] The candidate just joined. Introduce yourself as Alex, explain in two short sentences how this interview runs (a problem, discussion first, then coding, then a short review, about ${Math.round(targetSec / 60)} minutes), present the problem in one or two sentences, and ask the candidate to introduce themselves in a few lines.`,
          );
          return;
        }
      }
      if (cancelled) return;
      const intro = techOpeningText(problem, difficulty, Math.round(targetSec / 60));
      setTranscript([{ role: "ai", text: intro, ts: Date.now() }]);
      speaker.speak(intro, false);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function aiSay(text: string, countsAsQuestion = false) {
    if (!mountedRef.current) return;
    lastAiRef.current = Date.now();
    if (countsAsQuestion) statsRef.current.asked += 1;
    if (liveActiveRef.current) {
      live.sendText(
        `[Director] Say this to the candidate now, in your own natural words, keeping every fact, number and question in it, and do not add new questions: ${text}`,
      );
      return;
    }
    setTranscript((prev) => [...prev, { role: "ai", text, ts: Date.now() }]);
    speaker.speak(text, mutedRef.current);
  }

  useEffect(() => {
    const timer = setInterval(async () => {
      if (phaseRef.current !== "coding") return;
      const now = Date.now();
      const current = codeRef.current;
      if (current !== snapshotRef.current) {
        const prevSnapshot = snapshotRef.current;
        snapshotRef.current = current;
        if (now - lastAiRef.current < 25000) return;
        const localQ = codeWatchQuestion(prevSnapshot, current, problem);
        if (localQ) {
          lastAiRef.current = now;
          const api = await postInterview({
            mode: "codewatch",
            difficulty,
            topic,
            problemTitle: problem.title,
            problemStatement: problem.statement,
            code: current,
            diffSummary: summarizeDiff(prevSnapshot, current),
          });
          if (!mountedRef.current) return;
          let q = localQ;
          if (api) {
            setEngine(api.engine);
            if (api.reply) q = api.reply;
          }
          aiSay(q, true);
        }
        return;
      }
      if (now - lastAiRef.current >= 25000 && now - lastProgressRef.current > 90000) {
        const pq = codeWatchProgressQuestion(current, runsRef.current, problem);
        if (pq) {
          lastProgressRef.current = now;
          aiSay(pq, true);
          return;
        }
      }
      if (now - lastChangeRef.current > 45000 && now - lastAiRef.current >= 25000) {
        lastChangeRef.current = now;
        aiSay("Quick check-in, and I want a real answer: what are you thinking right now? Where exactly are you stuck, or what is the next step and why?", true);
      }
    }, 5000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [problem, difficulty, topic]);

  function switchLang(next: Lang) {
    if (next === lang) return;
    if (phaseRef.current === "dryrun" || phaseRef.current === "review" || phaseRef.current === "candidate" || phaseRef.current === "done") return;
    langRef.current = next;
    setLang(next);
    snapshotRef.current = codeByLang[next];
    setRunOut(null);
    runOutRef.current = null;
    setSubmitOut(null);
    submitOutRef.current = null;
    setLastKind(null);
    setRunError("");
  }

  function onCodeChange(v: string | undefined) {
    const next = v ?? "";
    if (next !== codeRef.current) lastChangeRef.current = Date.now();
    codeRef.current = next;
    setCodeByLang((prev) => ({ ...prev, [langRef.current]: next }));
  }

  async function handleApproach(text: string) {
    statsRef.current.approachAttempts += 1;
    const thin = isThinAnswer(text, "Hard") && wordCount(text) < 8;
    const bruteBlocked = difficulty === "Hard" && isBruteForceApproach(text);
    if ((thin || bruteBlocked) && statsRef.current.approachAttempts < 2) {
      const local = analyzeApproach(problem, text, difficulty);
      setEngine("local");
      aiSay(local + " You are still in the approach phase. Answer that first.", true);
      return;
    }
    approachRef.current = text;
    if (hasComplexityStatement(text)) {
      statedComplexityRef.current = { answer: text, correct: checkComplexity(problem, text).correct };
    }
    setPhase("coding");
    const api = await postInterview({
      mode: "approach",
      difficulty,
      topic,
      problemTitle: problem.title,
      problemStatement: problem.statement,
      message: text,
      transcript: transcript.slice(-6),
    });
    let reply: string;
    if (api && api.reply) {
      setEngine(api.engine);
      reply = api.reply;
    } else {
      setEngine("local");
      reply = analyzeApproach(problem, text, difficulty);
    }
    const elapsedSec = Math.floor((Date.now() - startedAt) / 1000);
    if (elapsedSec > targetSec / 2) reply += " One clock note: we are past halfway on the target time, so keep the coding tight.";
    aiSay(reply, true);
  }

  async function submitPanel(preset?: string) {
    const text = (preset ?? input).trim();
    if (!text) return;
    if (!preset) setInput("");
    if (liveActiveRef.current && !preset) {
      live.sendText(`[The candidate typed this message]: ${text}`);
    }
    setTranscript((prev) => [...prev, { role: "user", text, ts: Date.now() }]);

    if (phase === "opening") {
      if (wordCount(text) < 8 && statsRef.current.introPushes < 1) {
        statsRef.current.introPushes += 1;
        aiSay(introReaction(text, 1) + " Take another go at the introduction.", true);
        return;
      }
      introRef.current = text;
      const api = await postInterview({
        mode: "intro",
        difficulty,
        topic,
        problemTitle: problem.title,
        message: text,
        transcript: transcript.slice(-6),
      });
      let reaction: string;
      if (api && api.reply) {
        setEngine(api.engine);
        reaction = api.reply;
      } else {
        setEngine("local");
        reaction = wordCount(text) < 8 ? "Right, let us get into it." : introReaction(text, 2);
      }
      setPhase("clarifying");
      aiSay(
        `${reaction} Now your problem: ${problem.title}. ${problem.statement.split(". ")[0]}. The full statement, examples and constraints are on the left, so take a minute to read them properly. Before any approach talk: any clarifying questions? Ask now, or say you are ready.`,
        true
      );
      return;
    }

    if (phase === "clarifying") {
      if (isReadySignal(text)) {
        setPhase("approach");
        aiSay("Good. Then walk me through your approach before any code: the data structure, the main pass, and what you return. I will judge it before you start.", true);
        return;
      }
      if (!isCandidateQuestion(text) && wordCount(text) >= 12) {
        setPhase("approach");
        await handleApproach(text);
        return;
      }
      statsRef.current.clarifyingCount += 1;
      const api = await postInterview({
        mode: "clarifying",
        difficulty,
        topic,
        problemTitle: problem.title,
        problemStatement: problem.statement,
        problemData,
        message: text,
        transcript: transcript.slice(-6),
      });
      let ans: string;
      if (api && api.reply) {
        setEngine(api.engine);
        ans = api.reply;
      } else {
        setEngine("local");
        ans = answerClarifying(problem, text);
      }
      aiSay(ans + " Anything else you want to pin down, or are you ready to talk through your approach?");
      return;
    }

    if (phase === "approach") {
      await handleApproach(text);
      return;
    }

    if (phase === "dryrun") {
      const thin = wordCount(text) < 15;
      if (thin && statsRef.current.dryRunPushes < 1) {
        statsRef.current.dryRunPushes += 1;
        setEngine("local");
        aiSay(dryRunReaction(problem, text), true);
        return;
      }
      statsRef.current.answered += 1;
      statsRef.current.dryRunDone = true;
      const api = await postInterview({
        mode: "dryrun",
        difficulty,
        topic,
        problemTitle: problem.title,
        problemStatement: problem.statement,
        code: codeRef.current,
        message: text,
        testsPassed: submitOut?.passed,
        testsTotal: submitOut?.total,
      });
      let reaction: string;
      if (api && api.reply) {
        setEngine(api.engine);
        reaction = api.reply;
      } else {
        setEngine("local");
        reaction = dryRunReaction(problem, text);
      }
      const stated = statedComplexityRef.current;
      if (stated) {
        complexityRef.current = { answer: stated.answer, correct: stated.correct };
        setPhase("candidate");
        const confirm = stated.correct
          ? `On complexity: you already stated it earlier and it is right, so I am not asking twice. For the record: ${problem.complexity}`
          : `On complexity: you already stated it earlier and it was not right, so it is recorded as wrong. ${problem.complexity}`;
        aiSay(`${reaction} ${confirm} We have a couple of minutes left. Do you have any questions for me, about the role or the team?`, true);
        return;
      }
      setPhase("review");
      aiSay(`${reaction} Now the final scored question: what is the exact time and space complexity of your solution, and why?`, true);
      return;
    }

    if (phase === "review") {
      statsRef.current.answered += 1;
      const check = checkComplexity(problem, text);
      complexityRef.current = { answer: text, correct: check.correct };
      const api = await postInterview({
        mode: "complexity",
        difficulty,
        topic,
        problemTitle: problem.title,
        problemStatement: problem.statement,
        code: codeRef.current,
        message: text,
        testsPassed: submitOut?.passed,
        testsTotal: submitOut?.total,
      });
      let reaction: string;
      if (api && api.reply) {
        setEngine(api.engine);
        reaction = api.reply;
      } else {
        setEngine("local");
        reaction = check.correct
          ? `Right, that is correct, and it is recorded. For the record: ${problem.complexity}`
          : `That is not right, and it is recorded. ${problem.complexity}`;
      }
      setPhase("candidate");
      aiSay(`${reaction} We have a couple of minutes left. Do you have any questions for me, about the role or the team?`, true);
      return;
    }

    if (phase === "candidate") {
      if (isReadySignal(text)) {
        setPhase("done");
        aiSay("Understood. Thank you for your time, that wraps us up. Click End Interview to see your feedback: it covers your approach, your code, your weak areas, and the problems to do next.");
        return;
      }
      statsRef.current.askedEnd = true;
      const api = await postInterview({
        mode: "candidate-question",
        difficulty,
        topic,
        problemTitle: problem.title,
        message: text,
        transcript: transcript.slice(-6),
      });
      let ans: string;
      if (api && api.reply) {
        setEngine(api.engine);
        ans = api.reply;
      } else {
        setEngine("local");
        ans = candidateQuestionAnswer(text);
      }
      setPhase("done");
      aiSay(`${ans} That is a good place to wrap up. Thank you for your time. Click End Interview to see your feedback.`);
      return;
    }

    if (phase === "done") {
      aiSay("We are done here. Click End Interview and read the feedback, it names your weak areas and your next problems.");
      return;
    }

    if (isCandidateQuestion(text)) {
      const hintAsked = isHintRequest(text) || text.toLowerCase().includes("stuck");
      const api = await postInterview({
        mode: "ask",
        difficulty,
        topic,
        problemTitle: problem.title,
        problemStatement: problem.statement,
        code: codeRef.current,
        message: text,
        transcript: transcript.slice(-6),
      });
      if (hintAsked && difficulty !== "Hard") statsRef.current.hints += 1;
      if (api && api.reply) {
        setEngine(api.engine);
        aiSay(api.reply);
        return;
      }
      setEngine("local");
      const candidate = answerCandidateQuestion(problem, text, difficulty);
      if (candidate) {
        aiSay(candidate);
        return;
      }
    }
    statsRef.current.answered += 1;
    if (!statedComplexityRef.current && hasComplexityStatement(text)) {
      statedComplexityRef.current = { answer: text, correct: checkComplexity(problem, text).correct };
    }
    const ack = `${pickAck(statsRef.current.answered * 3 + text.length)} ${ackLines[statsRef.current.answered % ackLines.length]}`;
    if (ackTimeoutRef.current) clearTimeout(ackTimeoutRef.current);
    ackTimeoutRef.current = setTimeout(() => aiSay(ack), 350);
  }

  useEffect(() => {
    submitRef.current = (t: string) => {
      void submitPanel(t);
    };
  });

  async function doRun(includeHidden: boolean) {
    if (running) return;
    if (phase === "opening" || phase === "clarifying" || phase === "approach") {
      aiSay("Not yet. No code runs before we finish the current step and I hear an approach. Data structure, main pass, return value. Then you code.", phase === "approach");
      return;
    }
    if (phase !== "coding") {
      setRunError(
        includeHidden
          ? "You have already submitted. Finish the current step, or end the interview for feedback."
          : "Your code is already submitted. Running again will not change the submission."
      );
      return;
    }
    const current = codeRef.current;
    if (current.trim() === problem.starter[lang].trim()) {
      setRunError("That is still the untouched starter code. Write a real solution first, then run it.");
      return;
    }
    setRunning(true);
    setRunError("");
    try {
      const out = await runCode(problem, current, lang, includeHidden);
      runsRef.current += 1;
      if (includeHidden) {
        setSubmitOut(out);
        submitOutRef.current = out;
        setRunOut(out);
        runOutRef.current = out;
        setLastKind("submit");
        setPhase("dryrun");
        const t = problem.tests[0];
        const overTarget = Math.floor((Date.now() - startedAt) / 1000) > targetSec;
        aiSay(
          `Submitted. Tests passed: ${out.passed} of ${out.total}. Before complexity, I want a dry run.${overTarget ? " We are past the target time, so keep it tight." : ""} Take this input: ${JSON.stringify(t.args)}. Talk me through your code on it out loud, value by value, until the return. The expected output is ${JSON.stringify(t.expected)}, so your trace has to land exactly there.`,
          true
        );
      } else {
        setRunOut(out);
        runOutRef.current = out;
        setLastKind("run");
      }
    } catch (e) {
      setRunError("Code runner failed: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setRunning(false);
    }
  }

  function codeChangedNow(): boolean {
    return codeRef.current.trim() !== problem.starter[langRef.current].trim();
  }

  function hasActivity(): boolean {
    return transcriptRef.current.some((m) => m.role === "user") || codeChangedNow();
  }

  function buildRecord(incomplete: boolean): SessionRecord {
    const timeSec = Math.floor((Date.now() - startedAt) / 1000);
    const finalOut = submitOutRef.current || runOutRef.current;
    const total = finalOut ? finalOut.total : problem.tests.length;
    const passed = finalOut?.passed || 0;
    const st = statsRef.current;
    const finalTranscript = transcriptRef.current;
    const signals = {
      testsPassed: passed,
      totalTests: total,
      runs: runsRef.current,
      approachExplained: !!approachRef.current,
      thinApproach: approachRef.current ? isThinAnswer(approachRef.current, "Hard") && wordCount(approachRef.current) < 8 : false,
      aiQuestionsAnswered: st.answered,
      aiAsked: st.asked,
      hintsUsed: st.hints,
      complexityCorrect: complexityRef.current.correct,
      complexityAttempted: !!complexityRef.current.answer,
      timeSec,
      isTechnical: true,
      transcriptCount: finalTranscript.length,
    };
    const scores = computeScores(signals);
    return {
      id: String(Date.now()),
      type: "technical",
      difficulty,
      topic,
      problemTitle: problem.title,
      problemId: problem.id,
      date: new Date().toISOString(),
      timeSec,
      targetSec,
      testsPassed: passed,
      totalTests: total,
      runs: runsRef.current,
      code: codeRef.current,
      language: langRef.current,
      transcript: finalTranscript,
      scores,
      hintsUsed: st.hints,
      aiAsked: st.asked,
      aiAnswered: st.answered,
      approachText: approachRef.current || undefined,
      complexityAnswer: complexityRef.current.answer || undefined,
      complexityCorrect: complexityRef.current.correct,
      introGiven: !!introRef.current,
      askedClarifying: st.clarifyingCount > 0,
      dryRunDone: st.dryRunDone,
      askedQuestionAtEnd: st.askedEnd,
      incomplete,
      codeChanged: codeChangedNow(),
    };
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onBackHome(e: React.MouseEvent) {
    if (savedRef.current || !hasActivity()) return;
    if (!window.confirm("Leave the interview? Your work so far will be saved to your history as an incomplete session.")) {
      e.preventDefault();
      return;
    }
    savePartial();
  }

  function endInterview() {
    if (ackTimeoutRef.current) clearTimeout(ackTimeoutRef.current);
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
      liveSystemInstruction(problem, difficulty, Math.round(targetSec / 60)),
    );
    if (ok) {
      live.sendText(
        `[Director] We reconnected mid-interview after a drop. Current phase: ${PHASE_LABELS[phaseRef.current]}. Problem: ${problem.title}. Continue naturally from this phase in one or two short sentences.`,
      );
    }
  }

  function useTextMode() {
    liveDisabledRef.current = true;
    setLiveDisabled(true);
    live.close();
  }

  const visibleTests = problem.tests.filter((t) => !t.hidden).length;
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
  const fallbackNotice =
    problem.difficulty !== difficulty || problem.topic !== topic
      ? `No ${difficulty} problem for ${topic} is ready yet, so your problem is ${problem.title}, ${aOrAn(problem.difficulty)} ${problem.difficulty} ${problem.topic} problem. It is set and scored at that level.`
      : "";
  const phaseIdx = PHASE_INDEX[phase];
  const inputPlaceholder: Record<Phase, string> = {
    opening: "Introduce yourself...",
    clarifying: "Ask a clarifying question, or say you are ready...",
    approach: "Explain your approach...",
    coding: "Answer, or ask the AI...",
    dryrun: "Dry run your code out loud, step by step...",
    review: "State your time and space complexity...",
    candidate: "Ask Alex a question, or say none...",
    done: "Interview complete",
  };

  return (
    <main className="mx-auto min-h-screen w-full max-w-[1500px] px-3 py-4">
      <header className="flex flex-wrap items-center justify-between gap-3 px-1">
        <div>
          <Link href="/" onClick={onBackHome} className="text-xs text-zinc-500 hover:text-zinc-200">Back to home</Link>
          <div className="mt-1.5 flex flex-wrap items-center gap-2.5">
            <span className="text-[15px] font-semibold tracking-tight">Technical Interview</span>
            <span className="badge">{problem.title}</span>
            <span className={`badge ${problem.difficulty === "Easy" ? "badge-easy" : problem.difficulty === "Hard" ? "badge-hard" : "badge-mid"}`}>{problem.difficulty}</span>
            <span className="badge badge-accent">{PHASE_LABELS[phase]}</span>
            {live.status === "live" && (
              <span className="badge badge-live">
                <span className="dot dot-pulse bg-emerald-400" />
                Gemini Live
              </span>
            )}
          </div>
          <div className="mt-1 text-xs text-zinc-500">
            {`${difficulty} mode · ${problem.topic} · ${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, "0")} of about ${Math.round(targetSec / 60)} min target · AI: ${engineLabel} · Voice: ${voiceLabel}`}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setShowAi(!showAi)} className="btn btn-ghost btn-sm lg:hidden">{showAi ? "Hide AI panel" : "Show AI panel"}</button>
          <button type="button" onClick={() => { const next = !muted; setMuted(next); live.setMuted(next); if (next) speaker.stop(); }} aria-label="Toggle AI voice" className="btn btn-ghost btn-sm">{muted ? "Unmute AI" : "Mute AI"}</button>
          {(live.status === "live" || live.status === "connecting") && (
            <button type="button" onClick={useTextMode} className="btn btn-ghost btn-sm">Use text mode</button>
          )}
          {live.status === "fallback" && !liveDisabled && (
            <button type="button" onClick={retryLive} className="btn btn-ghost btn-sm">Retry live voice</button>
          )}
          <button type="button" onClick={endInterview} className="btn btn-danger btn-sm">End Interview</button>
        </div>
      </header>

      {fallbackNotice && (
        <div className="mx-1 mt-3 rounded-lg border border-amber-800 bg-amber-950/30 px-3 py-2 text-xs leading-5 text-amber-200" role="note">
          {fallbackNotice}
        </div>
      )}

      <div className="mt-4 flex flex-col gap-4 lg:flex-row">
        <section className="card w-full shrink-0 overflow-y-auto p-5 lg:sticky lg:top-4 lg:max-h-[calc(100vh-120px)] lg:w-[330px]">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-lg font-semibold tracking-tight">{problem.title}</h1>
            <span className={`badge ${problem.difficulty === "Easy" ? "badge-easy" : problem.difficulty === "Hard" ? "badge-hard" : "badge-mid"}`}>{problem.difficulty}</span>
            <span className="badge">{problem.topic}</span>
          </div>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-zinc-300">{problem.statement}</p>
          <h3 className="mt-5 text-sm font-semibold">Examples</h3>
          {problem.examples.map((ex, i) => (
            <div key={i} className="mt-2 break-words rounded-lg border border-line bg-panel2 p-3 font-mono text-xs leading-5">
              <div>Input: {ex.input}</div>
              <div>Output: {ex.output}</div>
              {ex.explanation && <div className="text-zinc-400">{ex.explanation}</div>}
            </div>
          ))}
          <h3 className="mt-5 text-sm font-semibold">Constraints</h3>
          <ul className="mt-2 list-disc pl-5 text-xs leading-5 text-zinc-400">
            {problem.constraints.map((c) => <li key={c}>{c}</li>)}
          </ul>
          <div className="mt-5">
            <Camera small />
          </div>
        </section>

        <section className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-t-2xl border border-line border-b-0 bg-panel px-4 py-2.5">
            <div className="flex gap-2" role="group" aria-label="Language">
              {(["javascript", "python"] as Lang[]).map((l) => (
                <button type="button" key={l} onClick={() => switchLang(l)} disabled={phaseIdx >= 4} title={phaseIdx >= 4 ? "Language is locked after you submit" : undefined} className={`btn btn-sm ${lang === l ? "btn-primary" : "btn-ghost"} disabled:opacity-40`}>{l === "javascript" ? "JavaScript" : "Python"}</button>
              ))}
            </div>
            <span className="hidden text-[11px] text-zinc-500 xl:block">Switching language keeps the code you wrote in each language, and clears the last run results.</span>
            <div className="flex gap-2">
              <button type="button" onClick={() => doRun(false)} disabled={running || phase !== "coding"} className="btn btn-secondary btn-sm">{running ? "Running..." : "Run Code"}</button>
              <button type="button" onClick={() => doRun(true)} disabled={running || phase !== "coding"} className="btn btn-success btn-sm">Submit</button>
            </div>
            {phase !== "coding" && (
              <div className="w-full text-[11px] text-zinc-500">
                {phaseIdx < 3
                  ? "Run and Submit unlock once your approach is accepted and the coding phase starts."
                  : "Already submitted. Run and Submit are closed, finish the remaining steps with Alex on the right."}
              </div>
            )}
          </div>
          <div className="h-[380px] border border-line sm:h-[420px]">
            <Editor height="100%" language={lang} value={code} onChange={onCodeChange} theme="vs-dark" options={{ minimap: { enabled: false }, fontSize: 14, scrollBeyondLastLine: false, wordWrap: "on" }} />
          </div>

          <div className="rounded-b-2xl border border-line border-t-0 bg-panel p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold">Test cases {lastKind === "submit" ? "(last submit)" : lastKind === "run" ? "(last run)" : ""}</h3>
              <span className="text-xs text-zinc-500">Run checks {visibleTests} visible cases. Submit checks all {problem.tests.length} cases including hidden, then starts the dry run.</span>
            </div>
            {runError && (
              <div className="mt-3 flex items-start justify-between gap-3 rounded-lg border border-red-900/70 bg-red-950/30 p-3 text-sm text-red-300" role="alert">
                <span>{runError}</span>
                <button type="button" onClick={() => setRunError("")} aria-label="Dismiss error" className="shrink-0 text-red-200">x</button>
              </div>
            )}
            {!runOut && !runError && <p className="mt-3 text-xs text-zinc-500">No runs yet. We start with your introduction and clarifying questions, then your approach, then code.</p>}
            {runOut && (
              <div className="mt-3 space-y-2">
                <div className={`text-sm font-semibold ${runOut.passed === runOut.total ? "text-emerald-400" : "text-amber-400"}`}>{runOut.passed} / {runOut.total} passed</div>
                {runOut.results.map((r) => (
                  <div key={r.index} className="break-words rounded-lg border border-line bg-panel2 p-3 font-mono text-xs leading-5">
                    <div className="flex items-center gap-2">
                      <span className={`chip ${r.passed ? "chip-pass" : "chip-fail"}`}>{r.passed ? "PASS" : "FAIL"}</span>
                      <span className="text-zinc-300">Case {r.index + 1}{r.hidden ? " (hidden)" : ""}</span>
                    </div>
                    <div className="mt-1.5 text-zinc-400">Input args: {JSON.stringify(r.args)}</div>
                    <div className="text-zinc-400">Expected: {JSON.stringify(r.expected)}</div>
                    <div>Got: {JSON.stringify(r.got)}</div>
                    {r.error && <div className="text-red-300">Error: {r.error}</div>}
                  </div>
                ))}
                {runOut.stderr && <pre className="max-h-28 overflow-auto whitespace-pre-wrap rounded-lg bg-panel2 p-3 text-xs text-red-300">{runOut.stderr}</pre>}
              </div>
            )}
          </div>
        </section>

        {showAi && (
          <aside className="card flex w-full shrink-0 flex-col overflow-hidden lg:sticky lg:top-4 lg:max-h-[calc(100vh-120px)] lg:w-[340px]">
            <div className="border-b border-line px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="avatar">A</span>
                <div className="min-w-0">
                  <div className="text-sm font-semibold leading-5">Alex</div>
                  <div className="text-[11px] leading-4 text-zinc-500">Interviewer · AI: {engineLabel} · Voice: {voiceLabel}</div>
                </div>
                {(speaker.speaking || liveSpeaking) && (
                  <span className="ml-auto flex items-center gap-1.5 text-[11px] font-medium text-emerald-400" role="status">
                    <span className="dot dot-pulse bg-emerald-400" />
                    Speaking
                  </span>
                )}
              </div>
              <div className="mt-3 flex gap-1" aria-label="Interview progress">
                {PHASE_STEPS.map((s, i) => (
                  <div key={s} className="min-w-0 flex-1">
                    <div className={`h-1 rounded-full ${i < phaseIdx ? "bg-accent/60" : i === phaseIdx ? "bg-accent" : "bg-line"}`} />
                    <div className={`mt-1.5 truncate text-[10px] ${i === phaseIdx ? "font-semibold text-zinc-100" : "text-zinc-500"}`}>{s}</div>
                  </div>
                ))}
              </div>
            </div>
            <div ref={transcriptBoxRef} className="max-h-[320px] flex-1 space-y-3 overflow-y-auto p-4 sm:max-h-[430px] lg:max-h-none" aria-live="polite">
              {transcript.map((m, i) => (
                <div key={i} className={`break-words rounded-xl px-3 py-2.5 text-[13px] leading-5 ${m.role === "ai" ? "border border-line bg-panel2 text-zinc-100" : "ml-4 bg-zinc-100 text-zinc-900"}`}>
                  <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide opacity-60">{m.role === "ai" ? "Alex" : "You"}</div>
                  {m.text}
                </div>
              ))}
              {transcript.length === 0 && (
                <p className="text-[13px] leading-5 text-zinc-500">Connecting to your interviewer. Alex will introduce himself in a moment.</p>
              )}
            </div>
            <div className="border-t border-line p-3">
              {(phase === "coding" || phase === "clarifying") && (
                <p className="mb-2 text-[11px] leading-4 text-zinc-500">Try: &quot;give me a test case&quot;, &quot;hint&quot; (recorded on Mid and Hard), &quot;what about empty input?&quot; Voice input works in Chrome.</p>
              )}
              {!voice.supported && live.status !== "live" && <p className="mb-2 text-[11px] text-amber-400">Voice input not supported here. Type instead.</p>}
              {voice.error && live.status !== "live" && <p className="mb-2 text-[11px] text-amber-400" role="alert">{voice.error}</p>}
              {voice.listening && (
                <p className="mb-2 flex items-center gap-1.5 text-[11px] text-red-400" role="status">
                  <span className="dot dot-pulse bg-red-500" />
                  Listening, speak now
                </p>
              )}
              <div className="flex gap-2">
                <label htmlFor="tech-panel-input" className="sr-only">Message to the interviewer</label>
                <input id="tech-panel-input" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submitPanel()} placeholder={inputPlaceholder[phase]} className="input min-w-0 flex-1" />
                {live.status === "live" ? (
                  <span className="flex items-center gap-1.5 rounded-lg border border-emerald-800 bg-emerald-950/40 px-3 text-xs text-emerald-300" role="status">
                    <span className="dot dot-pulse bg-emerald-400" />
                    Live mic on
                  </span>
                ) : (
                  <button type="button" onClick={() => (voice.listening ? voice.stop() : voice.start())} disabled={!voice.supported} aria-label="Toggle microphone input" className={`btn btn-sm ${voice.listening ? "border-red-500 bg-red-950/50 text-red-300" : "btn-ghost"}`}>{voice.listening ? "Listening..." : "Mic"}</button>
                )}
                <button type="button" onClick={() => submitPanel()} className="btn btn-primary btn-sm">Send</button>
              </div>
            </div>
          </aside>
        )}
      </div>
    </main>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-neutral-400">Loading interview room...</div>}>
      <TechnicalRoom />
    </Suspense>
  );
}
