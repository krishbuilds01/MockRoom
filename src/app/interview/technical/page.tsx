"use client";
import { Suspense, useEffect, useReducer, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import CameraPopup from "@/components/CameraPopup";
import LeaveModal from "@/components/LeaveModal";
import ConfirmModal from "@/components/ConfirmModal";
import SpeakingWave from "@/components/SpeakingWave";
import { useMicOpenSound } from "@/lib/useMicOpenSound";
import { recorderSupported, saveRecording, SessionRecorder } from "@/lib/recording";
import { getProblemById, LANGS, pickProblem, targetSecFor, type Lang, type Problem } from "@/lib/problems";
import {
  clearActiveSession,
  configFingerprint,
  consumeFreshStart,
  markActiveIncompleteSaved,
  planMount,
  readActiveSession,
  writeActiveSession,
  type StoredActiveSession,
} from "@/lib/activeSession";
import { runCode, type RunOutput } from "@/lib/runner";
import {
  aOrAn,
  analyzeApproach,
  answerCandidateQuestion,
  answerClarifying,
  candidateQuestionAnswer,
  checkComplexity,
  codeWatchProgressQuestion,
  complexityConfirmation,
  computeScores,
  diffLines,
  dryRunReaction,
  firstSentence,
  hasComplexityStatement,
  introReaction,
  isBruteForceApproach,
  isCandidateQuestion,
  isHintRequest,
  isReadySignal,
  isThinAnswer,
  nextCodeWatchQuestion,
  pickAck,
  saveSession,
  shouldAutosavePartial,
  summarizeDiff,
  techOpeningText,
  wordCount,
  type Msg,
  type SessionRecord,
} from "@/lib/interviewer";
import { postInterview, type InterviewApiResponse } from "@/lib/interviewApi";
import { companyTechnicalContext, getCompany } from "@/lib/companies";
import { getInterviewer } from "@/lib/interviewers";
import { sanitizeAiText } from "@/lib/sanitize";
import { useVoice } from "@/lib/useVoice";
import { useSpeaker } from "@/lib/useSpeaker";
import { initialMicGate, micControlState, micGateReducer } from "@/lib/voiceGate";

const Editor = dynamic(() => import("@monaco-editor/react"), { ssr: false, loading: () => <div className="flex h-full items-center justify-center text-sm text-neutral-600">Loading editor...</div> });

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

function TechnicalRoom() {
  const params = useSearchParams();
  const difficulty = params.get("difficulty") || "Mid";
  const company = getCompany(params.get("company"));
  const interviewer = getInterviewer(params.get("interviewer"));
  const topic = params.get("topic") || "HashMap";
  const router = useRouter();
  function computeProblem(): Problem {
    return getProblemById(params.get("problem")) || pickProblem(topic, difficulty);
  }
  const [problem, setProblem] = useState<Problem>(computeProblem);
  const targetSec = targetSecFor("technical", difficulty, problem);
  const [lang, setLang] = useState<Lang>("javascript");
  const [codeByLang, setCodeByLang] = useState<Record<Lang, string>>(() => ({
    javascript: problem.starter.javascript,
    python: problem.starter.python,
    java: problem.starter.java,
  }));
  const code = codeByLang[lang];
  const [phase, setPhase] = useState<Phase>("opening");
  const [transcript, setTranscript] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [muted, setMuted] = useState(false);
  const [running, setRunning] = useState(false);
  const [runOut, setRunOut] = useState<RunOutput | null>(null);
  const [lastKind, setLastKind] = useState<"run" | "submit" | null>(null);
  const [runError, setRunError] = useState("");
  const [showAi, setShowAi] = useState(true);
  const [engine, setEngine] = useState<"gemini" | "local" | null>(null);
  const [waiting, setWaiting] = useState(false);
  const [editorReady, setEditorReady] = useState(false);
  const [editorFailed, setEditorFailed] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [sessionId, setSessionId] = useState(() => String(Date.now()));
  const sessionIdRef = useRef(sessionId);
  const [recorder] = useState(() => new SessionRecorder());
  const [canRecord] = useState(recorderSupported);
  const [recordOn, setRecordOn] = useState(false);
  const [hasStream, setHasStream] = useState(false);
  useEffect(() => {
    if (editorReady) return;
    const t = setTimeout(() => setEditorFailed(true), 12000);
    return () => clearTimeout(t);
  }, [editorReady]);
  const streamRef = useRef<MediaStream | null>(null);
  const pendingBlobRef = useRef<Blob | null>(null);
  const [startedAt, setStartedAt] = useState(() => Date.now());
  const startedFpRef = useRef<string | null>(null);
  const deadRef = useRef(false);
  const deadAtRef = useRef(0);
  const deadUrlRef = useRef("");
  const urlProblem = computeProblem();
  const fingerprint = configFingerprint({
    room: "technical",
    difficulty,
    topic,
    company: company.id,
    problemId: urlProblem.id,
    interviewer: interviewer.id,
  });
  const sessionConfigRef = useRef({
    difficulty,
    topic,
    companyId: company.id,
    companyName: company.id !== "any" ? company.name : undefined,
    targetSec: targetSecFor("technical", difficulty, urlProblem),
    interviewerId: interviewer.id,
    interviewerName: interviewer.name,
  });

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
  const endedRef = useRef(false);
  const transcriptBoxRef = useRef<HTMLDivElement>(null);
  const startedRef = useRef(false);
  const mountedRef = useRef(true);
  const pendingRef = useRef(false);
  const seqRef = useRef(0);
  const pendingQRef = useRef(false);
  const askedQuestionsRef = useRef<Set<string>>(new Set());
  const [gate, dispatchGate] = useReducer(micGateReducer, initialMicGate);
  const gateRef = useRef(false);
  useEffect(() => {
    gateRef.current = gate.gated;
  }, [gate]);
  const speaker = useSpeaker(
    {
      onStart: () => dispatchGate({ type: "speech-start" }),
      onEnd: () => dispatchGate({ type: "speech-end" }),
      onAboutToEnd: () => dispatchGate({ type: "speech-about-to-end" }),
    },
    interviewer.voice,
    interviewer.pitch
  );
  const voice = useVoice((text) => setInput(text), gateRef);
  useEffect(() => {
    voice.applyGate(gate.gated);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gate.gated]);

  function onMicClick() {
    if (speaker.speaking || gateRef.current) {
      speaker.stop();
      gateRef.current = false;
      dispatchGate({ type: "interrupt" });
      dispatchGate({ type: "user-mic", on: true });
      voice.start();
      return;
    }
    if (voice.listening || voice.userOn) {
      voice.stop();
      dispatchGate({ type: "user-mic", on: false });
    } else {
      dispatchGate({ type: "user-mic", on: true });
      voice.start();
    }
  }

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
    const nearBottom = window.innerHeight + window.scrollY > document.documentElement.scrollHeight - 480;
    if (nearBottom) requestAnimationFrame(() => { transcriptBoxRef.current?.scrollIntoView({ block: "end" }); });
  }, [transcript, waiting]);
  useEffect(() => {
    mutedRef.current = muted;
  }, [muted]);
  useMicOpenSound(gate, mutedRef);

  useEffect(() => {
    mountedRef.current = true;
    deadRef.current = false;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => clearInterval(t);
  }, [startedAt]);

  useEffect(() => {
    const h = () => speaker.unlock();
    window.addEventListener("pointerdown", h, { once: true });
    window.addEventListener("keydown", h, { once: true });
    return () => {
      window.removeEventListener("pointerdown", h);
      window.removeEventListener("keydown", h);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function commitAi(text: string, question = false) {
    if (!mountedRef.current) return;
    const clean = sanitizeAiText(text);
    if (!clean) return;
    if (question && !pendingQRef.current) {
      statsRef.current.asked += 1;
      pendingQRef.current = true;
    }
    lastAiRef.current = Date.now();
    setTranscript((prev) => [...prev, { role: "ai", text: clean, ts: Date.now() }]);
    speaker.speak(clean, mutedRef.current);
  }

  function noteAnswer() {
    if (pendingQRef.current) {
      statsRef.current.answered += 1;
      pendingQRef.current = false;
    }
  }

  async function askEngine(body: Record<string, unknown>): Promise<InterviewApiResponse | null> {
    if (pendingRef.current) return null;
    pendingRef.current = true;
    setWaiting(true);
    const seq = ++seqRef.current;
    try {
      const api = await postInterview({ ...body, companyContext: companyTechnicalContext(company), interviewer: interviewer.id });
      if (!mountedRef.current || seq !== seqRef.current) return null;
      return api;
    } finally {
      if (seq === seqRef.current) {
        pendingRef.current = false;
        if (mountedRef.current) setWaiting(false);
      }
    }
  }

  function startSession(prob: Problem) {
    if (startedRef.current) return;
    startedRef.current = true;
    startedFpRef.current = fingerprint;
    sessionConfigRef.current = {
      difficulty,
      topic,
      companyId: company.id,
      companyName: company.id !== "any" ? company.name : undefined,
      targetSec: targetSecFor("technical", difficulty, prob),
      interviewerId: interviewer.id,
      interviewerName: interviewer.name,
    };
    writeActiveSession("technical", {
      fingerprint,
      sessionId: sessionIdRef.current,
      hasContent: false,
      incompleteSaved: false,
    });
    lastAiRef.current = Date.now();
    lastChangeRef.current = Date.now();
    lastProgressRef.current = Date.now();
    const openingBase = techOpeningText(prob, difficulty, Math.round(sessionConfigRef.current.targetSec / 60), interviewer.name);
    commitAi(company.openingLine ? openingBase.replace("Before we start, introduce yourself", `${company.openingLine} Before we start, introduce yourself`) : openingBase, true);
  }

  function resetSessionState(prob: Problem) {
    speaker.stop();
    voice.stop();
    if (recorder.active) void recorder.stop();
    pendingBlobRef.current = null;
    setRecordOn(false);
    setProblem(prob);
    setLang("javascript");
    langRef.current = "javascript";
    const starters = { javascript: prob.starter.javascript, python: prob.starter.python, java: prob.starter.java };
    setCodeByLang(starters);
    codeRef.current = prob.starter.javascript;
    snapshotRef.current = prob.starter.javascript;
    setPhase("opening");
    phaseRef.current = "opening";
    setTranscript([]);
    transcriptRef.current = [];
    setInput("");
    setRunOut(null);
    runOutRef.current = null;
    submitOutRef.current = null;
    setLastKind(null);
    setRunError("");
    setEngine(null);
    setWaiting(false);
    setRunning(false);
    const nid = String(Date.now());
    sessionIdRef.current = nid;
    setSessionId(nid);
    setStartedAt(Date.now());
    setElapsed(0);
    runsRef.current = 0;
    statsRef.current = {
      asked: 0,
      answered: 0,
      hints: 0,
      approachAttempts: 0,
      introPushes: 0,
      clarifyingCount: 0,
      dryRunPushes: 0,
      dryRunDone: false,
      askedEnd: false,
    };
    introRef.current = "";
    approachRef.current = "";
    complexityRef.current = { answer: "", correct: null };
    statedComplexityRef.current = null;
    lastAiRef.current = Date.now();
    lastChangeRef.current = Date.now();
    lastProgressRef.current = Date.now();
    savedRef.current = false;
    endedRef.current = false;
    pendingRef.current = false;
    seqRef.current += 1;
    pendingQRef.current = false;
    askedQuestionsRef.current = new Set();
    startedRef.current = false;
    startedFpRef.current = null;
  }

  useEffect(() => {
    if (deadRef.current) {
      const revived = consumeFreshStart("technical", deadAtRef.current) || window.location.search !== deadUrlRef.current;
      if (!revived) return;
      deadRef.current = false;
    }
    if (startedRef.current && startedFpRef.current === fingerprint) return;
    const prob = computeProblem();
    if (startedRef.current && startedFpRef.current !== fingerprint) {
      const current: StoredActiveSession = {
        fingerprint: startedFpRef.current as string,
        sessionId: sessionIdRef.current,
        hasContent: transcriptRef.current.length > 0 || codeChangedNow(),
        incompleteSaved: savedRef.current,
      };
      if (planMount(current, fingerprint).action === "save-stale-and-start" && !endedRef.current) {
        savePartial();
      }
      resetSessionState(prob);
    } else if (!startedRef.current) {
      const stored = readActiveSession("technical");
      if (stored && stored.sessionId !== sessionIdRef.current && planMount(stored, fingerprint).action !== "restore") {
        clearActiveSession("technical");
      }
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (problem.id !== prob.id) resetSessionState(prob);
    }
    startSession(prob);
  });

  useEffect(() => {
    if (!startedRef.current) return;
    writeActiveSession("technical", {
      fingerprint,
      sessionId: sessionIdRef.current,
      hasContent: transcript.length > 0,
      incompleteSaved: savedRef.current,
    });
  }, [transcript, fingerprint]);

  useEffect(() => {
    const timer = setInterval(() => {
      void (async () => {
        if (!mountedRef.current) return;
        if (phaseRef.current !== "coding") return;
        const current = codeRef.current;
        const now = Date.now();
        if (current !== snapshotRef.current) {
          if (pendingRef.current || pendingQRef.current) return;
          if (now - lastAiRef.current < 45000) return;
          const prevSnapshot = snapshotRef.current;
          snapshotRef.current = current;
          const localQ = nextCodeWatchQuestion(prevSnapshot, current, problem, askedQuestionsRef.current);
          if (localQ) {
            commitAi(localQ, true);
            return;
          }
          const { added, removed } = diffLines(prevSnapshot, current);
          const charDelta = [...added, ...removed].reduce((sum, l) => sum + l.trim().length, 0);
          if (charDelta < 12) return;
          const api = await askEngine({
            mode: "codewatch",
            difficulty,
            topic,
            problemTitle: problem.title,
            problemStatement: problem.statement,
            code: current,
            diffSummary: summarizeDiff(prevSnapshot, current),
          });
          if (!mountedRef.current || !api) return;
          setEngine(api.engine);
          if (api.reply) {
            const key = api.reply.toLowerCase();
            if (!askedQuestionsRef.current.has(key)) {
              askedQuestionsRef.current.add(key);
              commitAi(api.reply, true);
            }
          }
          return;
        }
        if (now - lastAiRef.current >= 45000 && now - lastProgressRef.current > 90000) {
          const pq = codeWatchProgressQuestion(current, runsRef.current, problem);
          if (pq) {
            const key = pq.toLowerCase();
            if (!askedQuestionsRef.current.has(key)) {
              askedQuestionsRef.current.add(key);
              lastProgressRef.current = now;
              commitAi(pq, true);
            }
            return;
          }
        }
        if (now - lastChangeRef.current > 45000 && now - lastAiRef.current >= 45000) {
          const q = "Quick check-in, and I want a real answer: what are you thinking right now? Where exactly are you stuck, or what is the next step and why?";
          const key = q.toLowerCase();
          if (!askedQuestionsRef.current.has(key)) {
            askedQuestionsRef.current.add(key);
            lastChangeRef.current = now;
            commitAi(q, true);
          }
        }
      })();
    }, 4000);
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
      commitAi(local + " You are still in the approach phase. Answer that first.", true);
      return;
    }
    approachRef.current = text;
    if (hasComplexityStatement(text)) {
      statedComplexityRef.current = { answer: text, correct: checkComplexity(problem, text).correct };
    }
    setPhase("coding");
    phaseRef.current = "coding";
    const api = await askEngine({
      mode: "approach",
      difficulty,
      topic,
      problemTitle: problem.title,
      problemStatement: problem.statement,
      message: text,
      transcript: transcriptRef.current.slice(-6),
    });
    if (!mountedRef.current) return;
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
    commitAi(reply);
  }

  async function submitPanel(preset?: string) {
    const text = (preset ?? input).trim();
    if (!text || pendingRef.current) return;
    if (!preset) setInput("");
    setTranscript((prev) => [...prev, { role: "user", text, ts: Date.now() }]);

    if (phase === "opening") {
      noteAnswer();
      if (wordCount(text) < 8 && statsRef.current.introPushes < 1) {
        statsRef.current.introPushes += 1;
        commitAi(introReaction(text, 1) + " Take another go at the introduction.", true);
        return;
      }
      introRef.current = text;
      const api = await askEngine({
        mode: "intro",
        difficulty,
        topic,
        problemTitle: problem.title,
        message: text,
        transcript: transcriptRef.current.slice(-6),
      });
      if (!mountedRef.current) return;
      let reaction: string;
      if (api && api.reply) {
        setEngine(api.engine);
        reaction = api.reply;
      } else {
        setEngine("local");
        reaction = wordCount(text) < 8 ? "Right, let us get into it." : introReaction(text, 2);
      }
      setPhase("clarifying");
      commitAi(
        `${reaction} Now your problem: ${problem.title}. ${firstSentence(problem.statement)} The full statement, examples and constraints are on the left, so take a minute to read them properly. Before any approach talk: any clarifying questions? Ask now, or say you are ready.`
      );
      return;
    }

    if (phase === "clarifying") {
      if (isReadySignal(text)) {
        setPhase("approach");
        commitAi("Good. Then walk me through your approach before any code: the data structure, the main pass, and what you return. I will judge it before you start.", true);
        return;
      }
      if (!isCandidateQuestion(text) && wordCount(text) >= 12) {
        setPhase("approach");
        await handleApproach(text);
        return;
      }
      statsRef.current.clarifyingCount += 1;
      const api = await askEngine({
        mode: "clarifying",
        difficulty,
        topic,
        problemTitle: problem.title,
        problemStatement: problem.statement,
        problemData,
        message: text,
        transcript: transcriptRef.current.slice(-6),
      });
      if (!mountedRef.current) return;
      let ans: string;
      if (api && api.reply) {
        setEngine(api.engine);
        ans = api.reply;
      } else {
        setEngine("local");
        ans = answerClarifying(problem, text);
      }
      commitAi(ans + " Anything else you want to pin down, or are you ready to talk through your approach?");
      return;
    }

    if (phase === "approach") {
      noteAnswer();
      await handleApproach(text);
      return;
    }

    if (phase === "dryrun") {
      noteAnswer();
      const thin = wordCount(text) < 15;
      if (thin && statsRef.current.dryRunPushes < 1) {
        statsRef.current.dryRunPushes += 1;
        setEngine("local");
        commitAi(dryRunReaction(problem, text), true);
        return;
      }
      statsRef.current.dryRunDone = true;
      const api = await askEngine({
        mode: "dryrun",
        difficulty,
        topic,
        problemTitle: problem.title,
        problemStatement: problem.statement,
        code: codeRef.current,
        message: text,
        testsPassed: submitOutRef.current?.passed,
        testsTotal: submitOutRef.current?.total,
      });
      if (!mountedRef.current) return;
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
        commitAi(`${reaction} ${complexityConfirmation(problem, stated.correct)} We have a couple of minutes left. Do you have any questions for me, about the role or the team?`, true);
        return;
      }
      setPhase("review");
      commitAi(`${reaction} Now the final scored question: what is the exact time and space complexity of your solution, and why?`, true);
      return;
    }

    if (phase === "review") {
      noteAnswer();
      const check = checkComplexity(problem, text);
      complexityRef.current = { answer: text, correct: check.correct };
      setEngine("local");
      const reaction = check.correct
        ? `Right, that is correct, and it is recorded. For the record: ${problem.complexity}`
        : `That is not right, and it is recorded. ${problem.complexity}`;
      setPhase("candidate");
      commitAi(`${reaction} We have a couple of minutes left. Do you have any questions for me, about the role or the team?`, true);
      return;
    }

    if (phase === "candidate") {
      noteAnswer();
      if (isReadySignal(text)) {
        setPhase("done");
        commitAi("Understood. Thank you for your time, that wraps us up. Click End Interview to see your feedback: it covers your approach, your code, your weak areas, and the problems to do next.");
        return;
      }
      statsRef.current.askedEnd = true;
      const api = await askEngine({
        mode: "candidate-question",
        difficulty,
        topic,
        problemTitle: problem.title,
        message: text,
        transcript: transcriptRef.current.slice(-6),
      });
      if (!mountedRef.current) return;
      let ans: string;
      if (api && api.reply) {
        setEngine(api.engine);
        ans = api.reply;
      } else {
        setEngine("local");
        ans = candidateQuestionAnswer(text);
      }
      setPhase("done");
      commitAi(`${ans} That is a good place to wrap up. Thank you for your time. Click End Interview to see your feedback.`);
      return;
    }

    if (phase === "done") {
      commitAi("We are done here. Click End Interview and read the feedback, it names your weak areas and your next problems.");
      return;
    }

    if (isCandidateQuestion(text)) {
      const hintAsked = isHintRequest(text) || text.toLowerCase().includes("stuck");
      if (hintAsked && difficulty !== "Hard") statsRef.current.hints += 1;
      const api = await askEngine({
        mode: "ask",
        difficulty,
        topic,
        problemTitle: problem.title,
        problemStatement: problem.statement,
        code: codeRef.current,
        message: text,
        transcript: transcriptRef.current.slice(-6),
      });
      if (!mountedRef.current) return;
      if (api && api.reply) {
        setEngine(api.engine);
        commitAi(api.reply);
        return;
      }
      setEngine("local");
      const candidate = answerCandidateQuestion(problem, text, difficulty);
      if (candidate) {
        commitAi(candidate);
        return;
      }
    }
    noteAnswer();
    if (!statedComplexityRef.current && hasComplexityStatement(text)) {
      statedComplexityRef.current = { answer: text, correct: checkComplexity(problem, text).correct };
    }
    const ack = `${pickAck(statsRef.current.answered * 3 + text.length)} ${ackLines[statsRef.current.answered % ackLines.length]}`;
    commitAi(ack);
  }

  async function doRun(includeHidden: boolean) {
    if (running) return;
    if (phase === "opening" || phase === "clarifying" || phase === "approach") {
      commitAi("Not yet. No code runs before we finish the current step and I hear an approach. Data structure, main pass, return value. Then you code.", phase === "approach");
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
        submitOutRef.current = out;
        setRunOut(out);
        runOutRef.current = out;
        setLastKind("submit");
        setPhase("dryrun");
        phaseRef.current = "dryrun";
        const t = problem.tests[0];
        const overTarget = Math.floor((Date.now() - startedAt) / 1000) > targetSec;
        commitAi(
          `Submitted. Tests passed: ${out.passed} of ${out.total}. Before complexity, I want a dry run.${overTarget ? " We are past the target time, so keep it tight." : ""} Take this input: ${JSON.stringify(t.args)}. Talk me through your code on it out loud, value by value, until the return. The expected output is ${JSON.stringify(t.expected)}, so your trace has to land exactly there.`,
          true
        );
      } else {
        setRunOut(out);
        runOutRef.current = out;
        setLastKind("run");
      }
    } catch {
      setRunError("Could not reach the code runner. Check your connection and try again.");
    } finally {
      setRunning(false);
    }
  }

  function codeChangedNow(): boolean {
    return codeRef.current.trim() !== problem.starter[langRef.current].trim();
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
      id: sessionIdRef.current,
      type: "technical",
      difficulty: sessionConfigRef.current.difficulty,
      interviewerId: sessionConfigRef.current.interviewerId,
      interviewerName: sessionConfigRef.current.interviewerName,
      companyId: sessionConfigRef.current.companyId,
      companyName: sessionConfigRef.current.companyName,
      topic: sessionConfigRef.current.topic,
      problemTitle: problem.title,
      problemId: problem.id,
      date: new Date().toISOString(),
      timeSec,
      targetSec: sessionConfigRef.current.targetSec,
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

  function onCameraStream(s: MediaStream | null) {
    streamRef.current = s;
    setHasStream(!!s);
  }

  function toggleRecord() {
    if (recordOn) {
      void recorder.stop().then((b) => {
        if (b) pendingBlobRef.current = b;
      });
      setRecordOn(false);
      return;
    }
    if (streamRef.current && recorder.start(streamRef.current)) setRecordOn(true);
  }

  async function finalizeRecording() {
    let blob = pendingBlobRef.current;
    if (recorder.active) blob = (await recorder.stop()) || blob;
    pendingBlobRef.current = null;
    if (blob) await saveRecording(sessionIdRef.current, blob);
  }

  function savePartial() {
    if (savedRef.current || endedRef.current) return;
    const elapsedSec = Math.floor((Date.now() - startedAt) / 1000);
    if (!shouldAutosavePartial({ elapsedSec, codeChanged: codeChangedNow(), hasAnyMessage: transcriptRef.current.length > 0 })) return;
    savedRef.current = true;
    void finalizeRecording();
    try {
      saveSession(buildRecord(true));
      markActiveIncompleteSaved("technical", sessionIdRef.current);
    } catch {}
  }
  const savePartialRef = useRef(savePartial);
  useEffect(() => {
    savePartialRef.current = savePartial;
  });

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (savedRef.current || endedRef.current) return;
      savePartialRef.current();
      e.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      savePartialRef.current();
    };
  }, []);

  const [leaveOpen, setLeaveOpen] = useState(false);
  const [endOpen, setEndOpen] = useState(false);
  function onBackHome(e: React.MouseEvent) {
    if (savedRef.current || endedRef.current) return;
    e.preventDefault();
    setLeaveOpen(true);
  }
  function leaveAndSave() {
    setLeaveOpen(false);
    savePartial();
    clearActiveSession("technical");
    deadRef.current = true;
    deadAtRef.current = Date.now();
    deadUrlRef.current = window.location.search;
    resetSessionState(problem);
    router.push("/");
  }

  async function endInterview() {
    speaker.stop();
    voice.stop();
    endedRef.current = true;
    savedRef.current = true;
    await finalizeRecording();
    saveSession(buildRecord(false));
    clearActiveSession("technical");
    deadRef.current = true;
    deadAtRef.current = Date.now();
    deadUrlRef.current = window.location.search;
    resetSessionState(problem);
    router.push("/interview/feedback");
  }

  const micState = micControlState({ speaking: speaker.speaking, gated: voice.gated, listening: voice.listening, supported: voice.supported });
  const visibleTests = problem.tests.filter((t) => !t.hidden).length;
  const voiceLabel: string | null =
    speaker.voiceSource === "edge"
      ? "Edge voice"
      : speaker.voiceSource === "gemini"
        ? "Gemini voice"
        : speaker.voiceSource === "browser"
          ? "browser voice"
          : transcript.length === 0
            ? "connecting"
            : null;
  const engineLabel: string | null =
    engine === "gemini" ? "Gemini" : engine === "local" ? "local mode" : transcript.length === 0 ? "connecting" : null;
  const fallbackNotice =
    problem.difficulty !== difficulty || problem.topic !== topic
      ? `No ${difficulty} problem for ${topic} is ready yet, so your problem is ${problem.title}, ${aOrAn(problem.difficulty)} ${problem.difficulty} ${problem.topic} problem. It is set and scored at that level.`
      : "";
  const phaseIdx = PHASE_INDEX[phase];
  const inputPlaceholder: Record<Phase, string> = {
    opening: "Your introduction",
    clarifying: "Ask a clarifying question",
    approach: "Data structure, main pass, return value",
    coding: `Answer, or ask ${interviewer.name}`,
    dryrun: "Trace your code here",
    review: "Time and space complexity",
    candidate: `Ask ${interviewer.name}, or say none`,
    done: "Interview complete",
  };

  return (
    <main className="mx-auto min-h-dvh w-full max-w-[1440px] px-4 py-5 sm:px-6">
      <header className="shrink-0 px-1">
        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
          <div className="min-w-0">
            <Link href="/" onClick={onBackHome} className="text-xs text-neutral-600 hover:text-neutral-800">Back to home</Link>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span className="text-[15px] font-medium">Technical Interview</span>
              <span className="badge">{problem.title}</span>
              <span className={`badge ${problem.difficulty === "Easy" ? "badge-easy" : problem.difficulty === "Hard" ? "badge-hard" : "badge-mid"}`}>{problem.difficulty}</span>
              {company.id !== "any" && <span className="badge badge-accent">{company.name}</span>}
              <span className="badge">{interviewer.name}</span>
              <span className="badge badge-accent">{PHASE_LABELS[phase]}</span>
            </div>
            <div className="tnum mt-1 font-mono text-xs text-neutral-500">
              {`${difficulty} mode · ${problem.topic} · ${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, "0")} of about ${Math.round(targetSec / 60)} min target${engineLabel ? ` · AI: ${engineLabel}` : ""}${voiceLabel ? ` · Voice: ${voiceLabel}` : ""}`}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="lg:hidden"><button type="button" onClick={() => setShowAi(!showAi)} className="btn btn-ghost btn-sm">{showAi ? "Hide AI panel" : "Show AI panel"}</button></span>
            <button type="button" onClick={() => { const next = !muted; setMuted(next); if (next) speaker.stop(); }} aria-label="Toggle AI voice" className="btn btn-ghost btn-sm">{muted ? "Unmute AI" : "Mute AI"}</button>
            <button type="button" onClick={() => setEndOpen(true)} className="btn btn-ghost btn-sm">End interview</button>
          </div>
        </div>
        <div className="mt-2.5" aria-label="Interview progress">
          <div className="hidden gap-1 xl:flex">
            {PHASE_STEPS.map((s, i) => (
              <div key={s} className="min-w-0 flex-1">
                <div className={`h-1 rounded-full ${i < phaseIdx ? "bg-accent/60" : i === phaseIdx ? "bg-accent" : "bg-line"}`} />
                <div className={`mt-1 truncate text-xs ${i === phaseIdx ? "font-semibold text-neutral-900" : "text-neutral-600"}`}>{s}</div>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2.5 xl:hidden">
            <div className="flex gap-1">
              {PHASE_STEPS.map((s, i) => (
                <span key={s} className={`h-1.5 w-4 rounded-full ${i < phaseIdx ? "bg-accent/60" : i === phaseIdx ? "bg-accent" : "bg-line"}`} />
              ))}
            </div>
            <span className="text-xs text-neutral-600">
              Step {phaseIdx + 1} of {PHASE_STEPS.length} · <span className="font-semibold text-neutral-900">{PHASE_STEPS[phaseIdx]}</span>
            </span>
          </div>
        </div>
      </header>

      {fallbackNotice && (
        <div className="mx-1 mt-2 shrink-0 rounded-lg border border-line2 bg-panel2 px-3 py-2 text-xs leading-5 text-neutral-700" role="note">
          {fallbackNotice}
        </div>
      )}

      <div className="mt-4 flex flex-col items-start gap-4 lg:flex-row">
        <section className="card w-full p-4 lg:w-[330px] lg:shrink-0">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-base font-medium">{problem.title}</h1>
              <span className={`badge ${problem.difficulty === "Easy" ? "badge-easy" : problem.difficulty === "Hard" ? "badge-hard" : "badge-mid"}`}>{problem.difficulty}</span>
              <span className="badge">{problem.topic}</span>
            </div>
            <p className="mt-2.5 whitespace-pre-wrap text-[13px] leading-5 text-neutral-700">{problem.statement}</p>
            <h3 className="mt-4 text-[13px] font-semibold">Examples</h3>
            {problem.examples.map((ex, i) => (
              <div key={i} className="mt-2 break-words rounded-lg border border-line bg-panel2 p-2.5 font-mono text-xs leading-5">
                <div>Input: {ex.input}</div>
                <div>Output: {ex.output}</div>
                {ex.explanation && <div className="text-neutral-600">{ex.explanation}</div>}
              </div>
            ))}
            <h3 className="mt-4 text-[13px] font-semibold">Constraints</h3>
            <ul className="mt-1.5 list-disc pl-5 text-xs leading-5 text-neutral-600">
              {problem.constraints.map((c) => <li key={c}>{c}</li>)}
            </ul>
            {canRecord && (
              <div className="mt-4 flex items-center justify-between gap-3 border-t border-line pt-4">
                <div className="min-w-0">
                  <div className="text-xs font-semibold">Record my session</div>
                  <p className="mt-0.5 text-xs leading-4 text-neutral-600">{recordOn ? "Recording. Watch it back on the feedback page." : hasStream ? "Self-review video, stored only in this browser." : "Turn on your camera first, then you can record."}</p>
                </div>
                <button type="button" onClick={toggleRecord} disabled={!hasStream && !recordOn} aria-pressed={recordOn} className={`btn btn-sm shrink-0 ${recordOn ? "btn-secondary" : "btn-ghost"}`}>
                  {recordOn ? (
                    <>
                      <span className="dot dot-pulse bg-accent" />
                      Recording
                    </>
                  ) : (
                    "Record"
                  )}
                </button>
              </div>
            )}
          </div>
        </section>

        <section className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-line bg-panel shadow-[0_1px_2px_rgba(0,0,0,0.3)]">
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-line bg-panel px-4 py-2.5">
            <div className="flex gap-2" role="group" aria-label="Language">
              {LANGS.map((l) => (
                <button type="button" key={l.id} onClick={() => switchLang(l.id)} disabled={phaseIdx >= 4} title={phaseIdx >= 4 ? "Language is locked after you submit" : undefined} className={`btn btn-sm ${lang === l.id ? "btn-primary" : "btn-ghost"}`}>{l.label}</button>
              ))}
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => doRun(false)} disabled={running || phase !== "coding"} className="btn btn-secondary btn-sm">{running ? "Running..." : "Run Code"}</button>
              <button type="button" onClick={() => doRun(true)} disabled={running || phase !== "coding"} className="btn btn-success btn-sm">Submit</button>
            </div>
            {phase !== "coding" && (
              <div className="w-full text-xs text-neutral-600">
                {phaseIdx < 3
                  ? "Run and Submit unlock once your approach is accepted and the coding phase starts."
                  : `Already submitted. Run and Submit are closed, finish the remaining steps with ${interviewer.name} on the right.`}
              </div>
            )}
          </div>
          <div className="bg-panel p-3">
            <div className="relative h-[380px] overflow-hidden rounded-[10px] border border-line bg-[#1b1813] sm:h-[440px] lg:h-[520px]">
              {editorFailed ? (
                <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
                  <p className="text-sm font-medium text-[#ede8de]">The code editor could not load</p>
                  <p className="max-w-sm text-[13px] leading-5 text-neutral-400">
                    The editor loads from a CDN, so a blocked or slow connection can stop it. Check your connection and try again.
                  </p>
                  <button type="button" onClick={() => window.location.reload()} className="btn btn-secondary btn-sm">
                    Retry
                  </button>
                </div>
              ) : (
              <Editor
                height="100%"
                language={lang}
                value={code}
                onChange={onCodeChange}
                onMount={() => setEditorReady(true)}
                theme="interviewai-dark"
                beforeMount={(monaco) => {
                  monaco.editor.defineTheme("interviewai-dark", {
                    base: "vs-dark",
                    inherit: true,
                    rules: [],
                    colors: {
                      "editor.background": "#1b1813",
                      "editor.lineHighlightBackground": "#26221b",
                      "editorGutter.background": "#1b1813",
                    },
                  });
                }}
                options={{ minimap: { enabled: false }, fontSize: 14, scrollBeyondLastLine: false, wordWrap: "on" }}
              />
              )}
            </div>
          </div>

          <div className="shrink-0 border-t border-line bg-panel p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold">Test cases {lastKind === "submit" ? "(last submit)" : lastKind === "run" ? "(last run)" : ""}</h3>
              <span className="text-xs text-neutral-600">Run checks {visibleTests} visible cases. Submit checks all {problem.tests.length} cases including hidden, then starts the dry run.</span>
            </div>
            {runError && (
              <div className="mt-2 flex items-start justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">
                <span>{runError}</span>
                <button type="button" onClick={() => setRunError("")} aria-label="Dismiss error" className="shrink-0 text-red-700">x</button>
              </div>
            )}
            {!runOut && !runError && <p className="mt-2 text-xs text-neutral-600">No runs yet. We start with your introduction and clarifying questions, then your approach, then code.</p>}
            {runOut && (
              <div className="mt-2">
                <div className={`text-[13px] font-semibold ${runOut.passed === runOut.total ? "text-accent" : "text-neutral-700"}`}>{runOut.passed} / {runOut.total} passed</div>
                <div className="mt-1.5">
                  {runOut.results.map((r) => (
                    <div key={r.index} className="flex items-center gap-2 border-t border-line py-1.5 font-mono text-xs first:border-t-0">
                      <span className={`chip shrink-0 ${r.passed ? "chip-pass" : "chip-fail"}`}>{r.passed ? "PASS" : "FAIL"}</span>
                      <span className="shrink-0 text-neutral-700">Case {r.index + 1}{r.hidden ? " (hidden)" : ""}</span>
                      <span className="min-w-0 flex-1 truncate text-neutral-600" title={`Input args: ${JSON.stringify(r.args)} · Expected: ${JSON.stringify(r.expected)} · Got: ${JSON.stringify(r.got)}`}>
                        args {JSON.stringify(r.args)} · got {JSON.stringify(r.got)} · expected {JSON.stringify(r.expected)}
                      </span>
                      {r.error && <span className="max-w-[30%] truncate text-red-700" title={r.error}>Error: {r.error}</span>}
                    </div>
                  ))}
                </div>
                {runOut.stderr && <pre className="mt-2 whitespace-pre-wrap rounded-lg bg-panel2 p-3 text-xs text-red-700">{runOut.stderr}</pre>}
              </div>
            )}
          </div>
        </section>

        {showAi && (
          <aside className="card flex w-full flex-col lg:w-[340px] lg:shrink-0">
            <div className="shrink-0 border-b border-line px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="avatar">{interviewer.name.charAt(0)}</span>
                <div className="min-w-0">
                  <div className="text-sm font-semibold leading-5">{interviewer.name}</div>
                  <div className="text-xs leading-4 text-neutral-600">Interviewer{engineLabel ? ` · AI: ${engineLabel}` : ""}{voiceLabel ? ` · Voice: ${voiceLabel}` : ""}</div>
                </div>
                {speaker.speaking && (
                  <span className="ml-auto text-xs font-medium text-accent">
                    <SpeakingWave speaking label="Speaking" />
                  </span>
                )}
              </div>
            </div>
            <div className="p-4" aria-live="polite">
              <div className="divide-y divide-line">
                {transcript.map((m, i) => (
                  <div key={i} className="py-2.5">
                    <div className="text-xs font-semibold">{m.role === "ai" ? interviewer.name : "You"}</div>
                    <p className={`mt-0.5 break-words whitespace-pre-wrap text-[13px] leading-5 ${m.role === "ai" ? "text-neutral-900" : "text-neutral-700"}`}>{m.text}</p>
                  </div>
                ))}
              </div>
              {waiting && (
                <div className="flex items-center gap-1.5 pt-2.5 text-xs text-neutral-600" role="status">
                  <span className="dot dot-pulse bg-neutral-400" />
                  {interviewer.name} is thinking...
                </div>
              )}
              {transcript.length === 0 && (
                <p className="pt-2.5 text-[13px] leading-5 text-neutral-600">Connecting to your interviewer. {interviewer.name} will introduce {interviewer.reflexivePronoun} in a moment.</p>
              )}
              <div ref={transcriptBoxRef} />
            </div>
            <div className="shrink-0 border-t border-line p-3">
              {(phase === "coding" || phase === "clarifying") && (
                <p className="mb-2 text-xs leading-4 text-neutral-600">Try: &quot;give me a test case&quot;, &quot;hint&quot; (recorded on Mid and Hard), &quot;what about empty input?&quot; Voice input works in Chrome.</p>
              )}
              {!voice.supported && <p className="mb-2 text-xs text-neutral-600">Voice input not supported here. Type instead.</p>}
              {voice.error && !speaker.speaking && <p className="mb-2 text-xs text-red-600" role="alert">{voice.error}</p>}
              {micState === "paused" ? (
                <p className="mb-2 flex items-center gap-1.5 text-xs text-neutral-600" role="status">
                  <span className="dot bg-neutral-400" />
                  Mic paused while {interviewer.name} speaks
                </p>
              ) : micState === "listening" ? (
                <p className="mb-2 flex items-center gap-1.5 text-xs text-accent" role="status">
                  <span className="dot dot-pulse bg-accent" />
                  Listening, speak now
                </p>
              ) : null}
              <div className="flex gap-2">
                <label htmlFor="tech-panel-input" className="sr-only">Message to the interviewer</label>
                <input id="tech-panel-input" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submitPanel()} placeholder={inputPlaceholder[phase]} className="input min-w-0 flex-1" />
                {micState === "paused" ? (
                  <button type="button" onClick={onMicClick} aria-label={`Interrupt ${interviewer.name} and turn your mic on`} className="btn btn-ghost btn-sm">
                    <span className="dot bg-neutral-400" />
                    Mic paused
                  </button>
                ) : (
                  <button type="button" onClick={onMicClick} disabled={!voice.supported} aria-label="Toggle microphone input" className={`btn btn-sm ${voice.listening ? "border-line2 bg-accent-soft text-accent" : "btn-ghost"}`}>{voice.listening ? "Listening..." : "Mic"}</button>
                )}
                <button type="button" onClick={() => submitPanel()} disabled={waiting} className="btn btn-primary btn-sm">Send</button>
              </div>
            </div>
          </aside>
        )}
      </div>
      <CameraPopup audio onStream={onCameraStream} recording={recordOn} />
      <LeaveModal open={leaveOpen} onStay={() => setLeaveOpen(false)} onLeave={leaveAndSave} />
      <ConfirmModal
        open={endOpen}
        title="End this interview?"
        body="Your feedback is generated from everything so far: your approach, your code, your test results, and the hints you used."
        confirmLabel="End interview"
        cancelLabel="Keep going"
        onConfirm={() => {
          setEndOpen(false);
          void endInterview();
        }}
        onCancel={() => setEndOpen(false)}
      />
    </main>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-neutral-600">Loading interview room...</div>}>
      <TechnicalRoom />
    </Suspense>
  );
}
