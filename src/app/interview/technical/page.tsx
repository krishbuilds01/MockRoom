"use client";
import { Suspense, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Camera from "@/components/Camera";
import { getProblemById, pickProblem, targetSecFor, type Lang } from "@/lib/problems";
import { runCode, type RunOutput } from "@/lib/runner";
import {
  analyzeApproach,
  answerCandidateQuestion,
  checkComplexity,
  codeWatchProgressQuestion,
  codeWatchQuestion,
  computeScores,
  isBruteForceApproach,
  isCandidateQuestion,
  isHintRequest,
  isThinAnswer,
  pickAck,
  saveSession,
  summarizeDiff,
  type Msg,
} from "@/lib/interviewer";
import { postInterview } from "@/lib/interviewApi";
import { useVoice } from "@/lib/useVoice";
import { useSpeaker } from "@/lib/useSpeaker";

const Editor = dynamic(() => import("@monaco-editor/react"), { ssr: false, loading: () => <div className="flex h-full items-center justify-center text-sm text-neutral-500">Loading editor...</div> });

type Phase = "approach" | "coding" | "review" | "done";

const ackLines = [
  "Back to the code, and run it when you are ready.",
  "That is clear enough. Continue.",
  "I have that recorded. Now show me it works.",
  "Keep going. I am watching the code, not just the chat.",
];

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
  const [phase, setPhase] = useState<Phase>("approach");
  const [transcript, setTranscript] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [muted, setMuted] = useState(false);
  const [running, setRunning] = useState(false);
  const [runOut, setRunOut] = useState<RunOutput | null>(null);
  const [submitOut, setSubmitOut] = useState<RunOutput | null>(null);
  const [lastKind, setLastKind] = useState<"run" | "submit" | null>(null);
  const [runError, setRunError] = useState("");
  const [showAi, setShowAi] = useState(true);
  const [engine, setEngine] = useState<"gemini" | "local">("local");
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
  const statsRef = useRef({ asked: 0, answered: 0, hints: 0, approachAttempts: 0 });
  const approachRef = useRef("");
  const complexityRef = useRef<{ answer: string; correct: boolean | null }>({ answer: "", correct: null });
  const startedRef = useRef(false);
  const speaker = useSpeaker();
  const voice = useVoice((text) => setInput(text));

  useEffect(() => {
    codeRef.current = codeByLang[langRef.current];
  }, [codeByLang]);
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);
  useEffect(() => {
    mutedRef.current = muted;
  }, [muted]);

  useEffect(() => {
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => clearInterval(t);
  }, [startedAt]);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    lastAiRef.current = Date.now();
    lastChangeRef.current = Date.now();
    lastProgressRef.current = Date.now();
    const intro = `Let's begin. Your problem is ${problem.title}, a ${problem.difficulty} ${problem.topic} problem, and this is a ${difficulty} session, so I will be strict: vague answers get pushed back, and hints are recorded. Before any code: what is your approach? Data structure, main pass, and what you return. Speak it or type it here.`;
    setTranscript([{ role: "ai", text: intro, ts: Date.now() }]);
    speaker.speak(intro, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function aiSay(text: string, countsAsQuestion = false) {
    setTranscript((prev) => [...prev, { role: "ai", text, ts: Date.now() }]);
    speaker.speak(text, mutedRef.current);
    lastAiRef.current = Date.now();
    if (countsAsQuestion) statsRef.current.asked += 1;
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
    langRef.current = next;
    setLang(next);
    snapshotRef.current = codeByLang[next];
  }

  function onCodeChange(v: string | undefined) {
    const next = v ?? "";
    if (next !== codeRef.current) lastChangeRef.current = Date.now();
    codeRef.current = next;
    setCodeByLang((prev) => ({ ...prev, [langRef.current]: next }));
  }

  async function submitPanel() {
    const text = input.trim();
    if (!text) return;
    setInput("");
    setTranscript((prev) => [...prev, { role: "user", text, ts: Date.now() }]);

    if (phase === "approach") {
      statsRef.current.approachAttempts += 1;
      const thin = isThinAnswer(text, "Hard") && text.trim().split(/\s+/).length < 8;
      const bruteBlocked = difficulty === "Hard" && isBruteForceApproach(text);
      if ((thin || bruteBlocked) && statsRef.current.approachAttempts < 2) {
        const local = analyzeApproach(problem, text, difficulty);
        setEngine("local");
        aiSay(local + " You are still in the approach phase. Answer that first.", true);
        return;
      }
      approachRef.current = text;
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
      if (api && api.reply) {
        setEngine(api.engine);
        aiSay(api.reply, true);
      } else {
        setEngine("local");
        aiSay(analyzeApproach(problem, text, difficulty), true);
      }
      return;
    }
    if (phase === "review") {
      statsRef.current.answered += 1;
      const check = checkComplexity(problem, text);
      complexityRef.current = { answer: text, correct: check.correct };
      setPhase("done");
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
      if (api && api.reply) {
        setEngine(api.engine);
        aiSay(api.reply);
      } else {
        setEngine("local");
        aiSay(
          check.correct
            ? `Right, that is correct, and it is recorded. For the record: ${problem.complexity} Click End Interview to see your feedback, including what to practice next.`
            : `That is not right, and it is recorded. ${problem.complexity} Click End Interview to see your feedback, including what to practice next.`
        );
      }
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
    const ack = `${pickAck(statsRef.current.answered * 3 + text.length)} ${ackLines[statsRef.current.answered % ackLines.length]}`;
    setTimeout(() => aiSay(ack), 350);
  }

  async function doRun(includeHidden: boolean) {
    if (running) return;
    if (phase === "approach") {
      aiSay("Not yet. No code runs before I hear an approach. Data structure, main pass, return value. Then you code.", true);
      return;
    }
    if (phase === "review" || phase === "done") {
      if (includeHidden) {
        setRunError("You have already submitted. Answer the complexity question, or end the interview for feedback.");
        return;
      }
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
        setRunOut(out);
        setLastKind("submit");
        if (phase === "coding") {
          setPhase("review");
          const api = await postInterview({
            mode: "complexity",
            difficulty,
            topic,
            problemTitle: problem.title,
            problemStatement: problem.statement,
            code: current,
            testsPassed: out.passed,
            testsTotal: out.total,
          });
          if (api && api.reply) {
            setEngine(api.engine);
            aiSay(api.reply, true);
          } else {
            setEngine("local");
            aiSay(`Submitted. Tests passed: ${out.passed} of ${out.total}. Final scored question: what is the exact time and space complexity of your solution, and why?`, true);
          }
        }
      } else {
        setRunOut(out);
        setLastKind("run");
      }
    } catch (e) {
      setRunError("Code runner failed: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setRunning(false);
    }
  }

  function endInterview() {
    speaker.stop();
    voice.stop();
    const timeSec = Math.floor((Date.now() - startedAt) / 1000);
    const finalOut = submitOut || runOut;
    const total = finalOut ? finalOut.total : problem.tests.length;
    const passed = finalOut?.passed || 0;
    const st = statsRef.current;
    const signals = {
      testsPassed: passed,
      totalTests: total,
      runs: runsRef.current,
      approachExplained: !!approachRef.current,
      thinApproach: approachRef.current ? isThinAnswer(approachRef.current, "Hard") && approachRef.current.trim().split(/\s+/).length < 8 : false,
      aiQuestionsAnswered: st.answered,
      aiAsked: st.asked,
      hintsUsed: st.hints,
      complexityCorrect: complexityRef.current.correct,
      timeSec,
      isTechnical: true,
      transcriptCount: transcript.length,
    };
    const scores = computeScores(signals);
    saveSession({
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
      transcript,
      scores,
      hintsUsed: st.hints,
      aiAsked: st.asked,
      aiAnswered: st.answered,
      approachText: approachRef.current || undefined,
      complexityAnswer: complexityRef.current.answer || undefined,
      complexityCorrect: complexityRef.current.correct,
    });
    router.push("/interview/feedback");
  }

  const visibleTests = problem.tests.filter((t) => !t.hidden).length;
  const voiceLabel = speaker.voiceSource === "gemini" ? "Gemini voice" : speaker.voiceSource === "browser" ? "browser voice" : "voice ready";

  return (
    <main className="mx-auto min-h-screen w-full max-w-[1500px] px-3 py-4">
      <header className="flex flex-wrap items-center justify-between gap-3 px-1">
        <div>
          <Link href="/" className="text-xs text-neutral-500 hover:text-neutral-300">Back to home</Link>
          <div className="mt-1 font-semibold">Technical Interview - {problem.title}</div>
          <div className="text-xs text-neutral-500">
            {difficulty} mode - Problem difficulty {problem.difficulty} - {problem.topic} - Phase: {phase} - {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, "0")} of about {Math.round(targetSec / 60)} min target - AI voice: {voiceLabel}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setShowAi(!showAi)} className="rounded-lg border border-neutral-700 px-3 py-2 text-sm lg:hidden">{showAi ? "Hide AI panel" : "Show AI panel"}</button>
          <button type="button" onClick={() => { setMuted(!muted); if (!muted) speaker.stop(); }} aria-label="Toggle AI voice" className="rounded-lg border border-neutral-700 px-3 py-2 text-sm">{muted ? "Unmute AI" : "Mute AI"}</button>
          <button type="button" onClick={endInterview} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white">End Interview</button>
        </div>
      </header>

      <div className="mt-4 flex flex-col gap-4 lg:flex-row">
        <section className="w-full shrink-0 overflow-y-auto rounded-2xl border border-neutral-800 p-5 lg:sticky lg:top-4 lg:max-h-[calc(100vh-120px)] lg:w-[330px]">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-lg font-semibold">{problem.title}</h1>
            <span className="rounded-full border border-neutral-700 px-2 py-0.5 text-[11px]">{problem.difficulty}</span>
            <span className="rounded-full border border-neutral-700 px-2 py-0.5 text-[11px]">{problem.topic}</span>
          </div>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-neutral-300">{problem.statement}</p>
          <h3 className="mt-5 text-sm font-semibold">Examples</h3>
          {problem.examples.map((ex, i) => (
            <div key={i} className="mt-2 break-words rounded-lg bg-neutral-900 p-3 font-mono text-xs leading-5">
              <div>Input: {ex.input}</div>
              <div>Output: {ex.output}</div>
              {ex.explanation && <div className="text-neutral-400">{ex.explanation}</div>}
            </div>
          ))}
          <h3 className="mt-5 text-sm font-semibold">Constraints</h3>
          <ul className="mt-2 list-disc pl-5 text-xs leading-5 text-neutral-400">
            {problem.constraints.map((c) => <li key={c}>{c}</li>)}
          </ul>
          <div className="mt-5">
            <Camera small />
          </div>
        </section>

        <section className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-t-2xl border border-neutral-800 border-b-0 px-4 py-2">
            <div className="flex gap-2" role="group" aria-label="Language">
              {(["javascript", "python"] as Lang[]).map((l) => (
                <button type="button" key={l} onClick={() => switchLang(l)} className={`rounded-md px-3 py-1.5 text-xs ${lang === l ? "bg-white text-black" : "border border-neutral-700"}`}>{l === "javascript" ? "JavaScript" : "Python"}</button>
              ))}
            </div>
            <span className="hidden text-[11px] text-neutral-500 xl:block">Switching language keeps the code you wrote in each language.</span>
            <div className="flex gap-2">
              <button type="button" onClick={() => doRun(false)} disabled={running} className="rounded-lg border border-neutral-600 px-4 py-2 text-sm disabled:opacity-50">{running ? "Running..." : "Run Code"}</button>
              <button type="button" onClick={() => doRun(true)} disabled={running} className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">Submit</button>
            </div>
          </div>
          <div className="h-[380px] border border-neutral-800 sm:h-[420px]">
            <Editor height="100%" language={lang} value={code} onChange={onCodeChange} theme="vs-dark" options={{ minimap: { enabled: false }, fontSize: 14, scrollBeyondLastLine: false, wordWrap: "on" }} />
          </div>

          <div className="rounded-b-2xl border border-neutral-800 border-t-0 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold">Test cases {lastKind === "submit" ? "(last submit)" : lastKind === "run" ? "(last run)" : ""}</h3>
              <span className="text-xs text-neutral-500">Run checks {visibleTests} visible cases. Submit checks all {problem.tests.length} cases including hidden.</span>
            </div>
            {runError && (
              <div className="mt-3 flex items-start justify-between gap-3 rounded-lg border border-red-900 bg-red-950/30 p-3 text-sm text-red-300" role="alert">
                <span>{runError}</span>
                <button type="button" onClick={() => setRunError("")} aria-label="Dismiss error" className="shrink-0 text-red-200">x</button>
              </div>
            )}
            {!runOut && !runError && <p className="mt-3 text-xs text-neutral-500">No runs yet. Explain your approach first, write a solution, then click Run Code.</p>}
            {runOut && (
              <div className="mt-3 space-y-2">
                <div className={`text-sm font-medium ${runOut.passed === runOut.total ? "text-green-400" : "text-amber-400"}`}>{runOut.passed} / {runOut.total} passed</div>
                {runOut.results.map((r) => (
                  <div key={r.index} className={`break-words rounded-lg border p-3 font-mono text-xs leading-5 ${r.passed ? "border-green-900 bg-green-950/30" : "border-red-900 bg-red-950/30"}`}>
                    <div>{r.passed ? "PASS" : "FAIL"} - Case {r.index + 1}{r.hidden ? " (hidden)" : ""}</div>
                    <div className="text-neutral-400">Input args: {JSON.stringify(r.args)}</div>
                    <div className="text-neutral-400">Expected: {JSON.stringify(r.expected)}</div>
                    <div>Got: {JSON.stringify(r.got)}</div>
                    {r.error && <div className="text-red-300">Error: {r.error}</div>}
                  </div>
                ))}
                {runOut.stderr && <pre className="max-h-28 overflow-auto whitespace-pre-wrap rounded-lg bg-neutral-900 p-3 text-xs text-red-300">{runOut.stderr}</pre>}
              </div>
            )}
          </div>
        </section>

        {showAi && (
          <aside className="flex w-full shrink-0 flex-col rounded-2xl border border-neutral-800 lg:sticky lg:top-4 lg:max-h-[calc(100vh-120px)] lg:w-[330px]">
            <div className="border-b border-neutral-800 px-4 py-3">
              <div className="text-sm font-semibold">AI Interviewer</div>
              <div className="text-[11px] text-neutral-500">AI: {engine === "gemini" ? "Gemini" : "local mode"} - Voice: {voiceLabel}</div>
              <div className="text-[11px] text-neutral-500">
                {phase === "approach" && "Phase 1 - Approach: explain your plan first, in detail"}
                {phase === "coding" && "Phase 2 - Coding: I am watching your code and will stop you with counter questions"}
                {(phase === "review" || phase === "done") && "Phase 3 - Review: complexity and closing"}
              </div>
            </div>
            <div className="max-h-[320px] flex-1 space-y-3 overflow-y-auto p-4 sm:max-h-[430px] lg:max-h-none" aria-live="polite">
              {transcript.map((m, i) => (
                <div key={i} className={`break-words rounded-xl px-3 py-2.5 text-[13px] leading-5 ${m.role === "ai" ? "bg-neutral-900" : "ml-4 bg-white text-black"}`}>
                  <div className="mb-1 text-[10px] font-medium opacity-60">{m.role === "ai" ? "AI Interviewer" : "You"}</div>
                  {m.text}
                </div>
              ))}
            </div>
            <div className="border-t border-neutral-800 p-3">
              <p className="mb-2 text-[11px] leading-4 text-neutral-500">Try: &quot;give me a test case&quot;, &quot;hint&quot; (recorded on Mid and Hard), &quot;what about empty input?&quot; Voice input works in Chrome.</p>
              {!voice.supported && <p className="mb-2 text-[11px] text-amber-400">Voice input not supported here. Type instead.</p>}
              <div className="flex gap-2">
                <label htmlFor="tech-panel-input" className="sr-only">Message to the interviewer</label>
                <input id="tech-panel-input" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submitPanel()} placeholder={phase === "approach" ? "Explain your approach..." : "Answer, or ask the AI..."} className="min-w-0 flex-1 rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2.5 text-sm outline-none" />
                <button type="button" onClick={() => (voice.listening ? voice.stop() : voice.start())} disabled={!voice.supported} aria-label="Toggle microphone input" className="rounded-lg border border-neutral-700 px-3 text-xs disabled:opacity-40">{voice.listening ? "Stop" : "Mic"}</button>
                <button type="button" onClick={submitPanel} className="rounded-lg bg-white px-4 text-sm font-semibold text-black">Send</button>
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
