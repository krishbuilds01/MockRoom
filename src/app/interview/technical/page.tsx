"use client";
import { Suspense, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import Camera from "@/components/Camera";
import { pickProblem, type Lang } from "@/lib/problems";
import { runCode, type RunOutput } from "@/lib/runner";
import {
  analyzeApproach,
  answerCandidateQuestion,
  codeWatchQuestion,
  computeScores,
  isCandidateQuestion,
  saveSession,
  speak,
  type Msg,
} from "@/lib/interviewer";
import { useVoice } from "@/lib/useVoice";

const Editor = dynamic(() => import("@monaco-editor/react"), { ssr: false, loading: () => <div className="flex h-full items-center justify-center text-sm text-neutral-500">Loading editor...</div> });

type Phase = "approach" | "coding" | "review" | "done";

function TechnicalRoom() {
  const params = useSearchParams();
  const difficulty = params.get("difficulty") || "Mid";
  const topic = params.get("topic") || "HashMap";
  const router = useRouter();
  const [problem] = useState(() => pickProblem(topic, difficulty));
  const [lang, setLang] = useState<Lang>("javascript");
  const [code, setCode] = useState(() => problem.starter.javascript);
  const [phase, setPhase] = useState<Phase>("approach");
  const [transcript, setTranscript] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [muted, setMuted] = useState(false);
  const [running, setRunning] = useState(false);
  const [runOut, setRunOut] = useState<RunOutput | null>(null);
  const [submitOut, setSubmitOut] = useState<RunOutput | null>(null);
  const [runError, setRunError] = useState("");
  const [runs, setRuns] = useState(0);
  const [answered, setAnswered] = useState(0);
  const [approachDone, setApproachDone] = useState(false);
  const [showAi, setShowAi] = useState(true);
  const [elapsed, setElapsed] = useState(0);
  const [startedAt] = useState(() => Date.now());

  const codeRef = useRef(code);
  const snapshotRef = useRef(code);
  const lastAiRef = useRef(0);
  const lastChangeRef = useRef(0);
  const phaseRef = useRef(phase);
  const mutedRef = useRef(muted);

  useEffect(() => {
    codeRef.current = code;
  }, [code]);
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);
  useEffect(() => {
    mutedRef.current = muted;
  }, [muted]);
  const startedRef = useRef(false);
  const voice = useVoice((text) => setInput(text));

  useEffect(() => {
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => clearInterval(t);
  }, [startedAt]);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    lastAiRef.current = Date.now();
    lastChangeRef.current = Date.now();
    const intro = `Welcome. Your problem is ${problem.title}, a ${problem.difficulty} ${problem.topic} problem. Before you write code, tell me: what is your approach? Speak it or type it in this panel.`;
    setTranscript([{ role: "ai", text: intro, ts: Date.now() }]);
    speak(intro, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      if (phaseRef.current !== "coding") return;
      const now = Date.now();
      if (now - lastAiRef.current < 25000) return;
      const current = codeRef.current;
      if (current !== snapshotRef.current) {
        const q = codeWatchQuestion(snapshotRef.current, current, problem);
        snapshotRef.current = current;
        if (q) {
          lastAiRef.current = now;
          setTranscript((prev) => [...prev, { role: "ai", text: q, ts: now }]);
          speak(q, mutedRef.current);
        }
      } else if (now - lastChangeRef.current > 45000) {
        lastAiRef.current = now;
        lastChangeRef.current = now;
        const q = "Quick check-in: talk me through what you are thinking right now. Where are you stuck, or what is the next step?";
        setTranscript((prev) => [...prev, { role: "ai", text: q, ts: now }]);
        speak(q, mutedRef.current);
      }
    }, 5000);
    return () => clearInterval(timer);
  }, [problem]);

  function switchLang(next: Lang) {
    setLang(next);
    const fresh = problem.starter[next];
    setCode(fresh);
    snapshotRef.current = fresh;
  }

  function onCodeChange(v: string | undefined) {
    const next = v ?? "";
    if (next !== codeRef.current) lastChangeRef.current = Date.now();
    setCode(next);
  }

  function aiSay(text: string) {
    setTranscript((prev) => [...prev, { role: "ai", text, ts: Date.now() }]);
    speak(text, muted);
    lastAiRef.current = Date.now();
  }

  function submitPanel(raw?: string) {
    const text = (raw ?? input).trim();
    if (!text) return;
    setInput("");
    setTranscript((prev) => [...prev, { role: "user", text, ts: Date.now() }]);

    if (phase === "approach") {
      const reply = analyzeApproach(problem, text, difficulty);
      setApproachDone(true);
      setPhase("coding");
      setTimeout(() => aiSay(reply), 350);
      return;
    }
    if (phase === "review") {
      setAnswered((n) => n + 1);
      const good = /o\(|log|n \^|n2|quadratic|linear/.test(text.toLowerCase());
      const reply = good
        ? `Noted. For reference: ${problem.complexity} Your session is complete. Click End Interview to see your full feedback.`
        : `Thanks. For reference, the expected answer is: ${problem.complexity} Click End Interview to see your full feedback.`;
      setPhase("done");
      setTimeout(() => aiSay(reply), 350);
      return;
    }
    const candidate = answerCandidateQuestion(problem, text, difficulty);
    if (candidate && isCandidateQuestion(text)) {
      setTimeout(() => aiSay(candidate), 350);
      return;
    }
    setAnswered((n) => n + 1);
    setTimeout(() => aiSay("Thanks, that reasoning is noted and will count in your communication score. Keep coding, and run your code when you are ready."), 350);
  }

  async function doRun(includeHidden: boolean) {
    setRunning(true);
    setRunError("");
    try {
      const out = await runCode(problem, codeRef.current, lang, includeHidden);
      setRuns((n) => n + 1);
      if (includeHidden) {
        setSubmitOut(out);
        setRunOut(out);
        if (phase === "coding") {
          setPhase("review");
          aiSay(`You submitted. Tests passed: ${out.passed} of ${out.total}. Final question before we close: what is the time and space complexity of your solution, and why?`);
        }
      } else {
        setRunOut(out);
      }
    } catch (e) {
      setRunError("Code runner failed: " + (e instanceof Error ? e.message : String(e)) + ". Check your internet connection - the Judge0 API needs internet.");
    } finally {
      setRunning(false);
    }
  }

  function endInterview() {
    const timeSec = Math.floor((Date.now() - startedAt) / 1000);
    const finalOut = submitOut || runOut;
    const total = submitOut ? problem.tests.length : finalOut?.total || problem.tests.filter((t) => !t.hidden).length;
    const passed = finalOut?.passed || 0;
    const signals = { testsPassed: passed, totalTests: total, runs, approachExplained: approachDone, aiQuestionsAnswered: answered, timeSec, isTechnical: true, transcriptCount: transcript.length };
    const scores = computeScores(signals);
    saveSession({
      id: String(Date.now()),
      type: "technical",
      difficulty,
      topic,
      problemTitle: problem.title,
      date: new Date().toISOString(),
      timeSec,
      testsPassed: passed,
      totalTests: total,
      runs,
      code,
      language: lang,
      transcript,
      scores,
    });
    if (typeof window !== "undefined") window.speechSynthesis?.cancel();
    router.push("/interview/feedback");
  }

  const visibleTests = problem.tests.filter((t) => !t.hidden).length;

  return (
    <main className="mx-auto min-h-screen w-full max-w-[1500px] px-3 py-4">
      <header className="flex flex-wrap items-center justify-between gap-3 px-1">
        <div>
          <div className="font-semibold">Technical Interview - {problem.title}</div>
          <div className="text-xs text-neutral-500">{difficulty} mode - Problem difficulty {problem.difficulty} - {problem.topic} - Phase: {phase} - {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, "0")}</div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setShowAi(!showAi)} className="rounded-lg border border-neutral-700 px-3 py-2 text-sm lg:hidden">{showAi ? "Hide AI panel" : "Show AI panel"}</button>
          <button onClick={() => setMuted(!muted)} className="rounded-lg border border-neutral-700 px-3 py-2 text-sm">{muted ? "Unmute AI" : "Mute AI"}</button>
          <button onClick={endInterview} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white">End Interview</button>
        </div>
      </header>

      <div className="mt-4 flex flex-col gap-4 lg:flex-row">
        <section className="w-full shrink-0 overflow-y-auto rounded-2xl border border-neutral-800 p-5 lg:w-[330px]">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold">{problem.title}</h1>
            <span className="rounded-full border border-neutral-700 px-2 py-0.5 text-[11px]">{problem.difficulty}</span>
            <span className="rounded-full border border-neutral-700 px-2 py-0.5 text-[11px]">{problem.topic}</span>
          </div>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-neutral-300">{problem.statement}</p>
          <h3 className="mt-5 text-sm font-semibold">Examples</h3>
          {problem.examples.map((ex, i) => (
            <div key={i} className="mt-2 rounded-lg bg-neutral-900 p-3 font-mono text-xs leading-5">
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
            <div className="flex gap-2">
              {(["javascript", "python"] as Lang[]).map((l) => (
                <button key={l} onClick={() => switchLang(l)} className={`rounded-md px-3 py-1.5 text-xs ${lang === l ? "bg-white text-black" : "border border-neutral-700"}`}>{l === "javascript" ? "JavaScript" : "Python"}</button>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={() => doRun(false)} disabled={running} className="rounded-lg border border-neutral-600 px-4 py-2 text-sm disabled:opacity-50">{running ? "Running..." : "Run Code"}</button>
              <button onClick={() => doRun(true)} disabled={running} className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">Submit</button>
            </div>
          </div>
          <div className="h-[420px] border border-neutral-800">
            <Editor height="100%" language={lang} value={code} onChange={onCodeChange} theme="vs-dark" options={{ minimap: { enabled: false }, fontSize: 14, scrollBeyondLastLine: false }} />
          </div>

          <div className="rounded-b-2xl border border-neutral-800 border-t-0 p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Test cases</h3>
              <span className="text-xs text-neutral-500">Run checks {visibleTests} visible cases. Submit checks all {problem.tests.length} cases including hidden.</span>
            </div>
            {runError && <p className="mt-3 text-sm text-red-400">{runError}</p>}
            {!runOut && !runError && <p className="mt-3 text-xs text-neutral-500">No runs yet. Write a solution and click Run Code.</p>}
            {runOut && (
              <div className="mt-3 space-y-2">
                <div className={`text-sm font-medium ${runOut.passed === runOut.total ? "text-green-400" : "text-amber-400"}`}>{runOut.passed} / {runOut.total} passed</div>
                {runOut.results.map((r) => (
                  <div key={r.index} className={`rounded-lg border p-3 font-mono text-xs leading-5 ${r.passed ? "border-green-900 bg-green-950/30" : "border-red-900 bg-red-950/30"}`}>
                    <div>{r.passed ? "PASS" : "FAIL"} - Case {r.index + 1}{r.hidden ? " (hidden)" : ""}</div>
                    <div className="text-neutral-400">Input args: {JSON.stringify(r.args)}</div>
                    <div className="text-neutral-400">Expected: {JSON.stringify(r.expected)}</div>
                    <div>Got: {JSON.stringify(r.got)}</div>
                    {r.error && <div className="text-red-300">Error: {r.error}</div>}
                  </div>
                ))}
                {runOut.stderr && <pre className="max-h-28 overflow-auto rounded-lg bg-neutral-900 p-3 text-xs text-red-300">{runOut.stderr}</pre>}
              </div>
            )}
          </div>
        </section>

        {showAi && (
          <aside className="flex w-full shrink-0 flex-col rounded-2xl border border-neutral-800 lg:w-[330px]">
            <div className="border-b border-neutral-800 px-4 py-3">
              <div className="text-sm font-semibold">AI Interviewer</div>
              <div className="text-[11px] text-neutral-500">
                {phase === "approach" && "Phase 1 - Approach: explain your plan first"}
                {phase === "coding" && "Phase 2 - Coding: I am watching your code and will ask counter questions"}
                {(phase === "review" || phase === "done") && "Phase 3 - Review: complexity and closing"}
              </div>
            </div>
            <div className="max-h-[430px] flex-1 space-y-3 overflow-y-auto p-4 lg:max-h-none">
              {transcript.map((m, i) => (
                <div key={i} className={`rounded-xl px-3 py-2.5 text-[13px] leading-5 ${m.role === "ai" ? "bg-neutral-900" : "ml-4 bg-white text-black"}`}>
                  <div className="mb-1 text-[10px] font-medium opacity-60">{m.role === "ai" ? "AI Interviewer" : "You"}</div>
                  {m.text}
                </div>
              ))}
            </div>
            <div className="border-t border-neutral-800 p-3">
              <p className="mb-2 text-[11px] leading-4 text-neutral-500">Try: &quot;give me a test case&quot;, &quot;hint&quot;, &quot;what about empty input?&quot; Voice works in Chrome.</p>
              {!voice.supported && <p className="mb-2 text-[11px] text-amber-400">Voice input not supported here. Type instead.</p>}
              <div className="flex gap-2">
                <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submitPanel()} placeholder={phase === "approach" ? "Explain your approach..." : "Answer, or ask the AI..."} className="min-w-0 flex-1 rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2.5 text-sm outline-none" />
                <button onClick={() => (voice.listening ? voice.stop() : voice.start())} disabled={!voice.supported} className="rounded-lg border border-neutral-700 px-3 text-xs disabled:opacity-40">{voice.listening ? "Stop" : "Mic"}</button>
                <button onClick={() => submitPanel()} className="rounded-lg bg-white px-4 text-sm font-semibold text-black">Send</button>
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
