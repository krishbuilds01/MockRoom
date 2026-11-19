import { getProblemById, problems, progression, type Problem } from "./problems";
import { wordCount, type SessionRecord } from "./interviewer";

export interface NextStep {
  problemId: string;
  title: string;
  difficulty: string;
  topic: string;
  reason: string;
  href: string;
}

export interface PhaseNote {
  phase: string;
  did: string;
  weak: string;
  strong: string;
}

function hrefFor(p: Problem): string {
  const q = new URLSearchParams({ difficulty: p.difficulty, topic: p.topic, problem: p.id });
  return `/interview/technical?${q.toString()}`;
}

export function weakAreas(rec: SessionRecord, problem?: Problem): string[] {
  const out: string[] = [];
  const ratio = rec.totalTests > 0 ? rec.testsPassed / rec.totalTests : 0;
  if (rec.type === "technical") {
    if (rec.complexityCorrect === false) out.push("Complexity analysis: your stated time or space complexity did not match your solution.");
    if (rec.complexityCorrect == null) out.push("Complexity analysis: you never completed the complexity round.");
    if (ratio > 0 && ratio < 1) out.push("Edge cases and hidden tests: visible cases passed but hidden cases caught gaps. Test beyond the examples.");
    if (ratio === 0 && rec.totalTests > 0) out.push("Core problem solving: no case passed yet. Rebuild from the examples and trace by hand.");
    if ((rec.hintsUsed ?? 0) > 0) out.push(`Independence on ${problem ? problem.topic : "this topic"}: you needed ${rec.hintsUsed} hint${(rec.hintsUsed ?? 0) > 1 ? "s" : ""} to get unstuck.`);
    if (!rec.approachText || wordCount(rec.approachText) < 8) out.push("Problem decomposition: your approach explanation was too thin to plan the code from.");
    if ((rec.aiAsked ?? 0) - (rec.aiAnswered ?? 0) >= 2) out.push("Communication under pressure: several interviewer questions went unanswered.");
    if (rec.runs === 0) out.push("Testing habit: you never ran your code during the session.");
    if (rec.targetSec && rec.timeSec > rec.targetSec * 1.25 && ratio < 1) out.push("Speed: you went well over the target time without a full pass. Practice this pattern timed.");
  } else {
    if ((rec.thinAnswers ?? 0) > 0) out.push(`Answer depth: ${rec.thinAnswers} answer${(rec.thinAnswers ?? 0) > 1 ? "s were" : " was"} too thin. Use example, steps, reason, in that order.`);
    if (rec.scores.complexity <= 4) out.push("Technical depth: answers stayed at definition level. Add trade-offs, failure cases, and numbers.");
    if (rec.scores.communication <= 4) out.push("Communication: structure answers instead of streaming thoughts. Claim, example, trade-off, result.");
    if (rec.timeSec < 300) out.push("Stamina and completeness: very short session. Finish the full question set when you practice.");
  }
  return out.slice(0, 4);
}

export function recommendNext(rec: SessionRecord, problem?: Problem): NextStep[] {
  const out: NextStep[] = [];
  const ratio = rec.totalTests > 0 ? rec.testsPassed / rec.totalTests : 0;
  if (rec.type === "technical" && problem) {
    if (ratio < 1) {
      out.push({
        problemId: problem.id,
        title: problem.title,
        difficulty: problem.difficulty,
        topic: problem.topic,
        reason: "Retry this problem first. A problem you failed teaches more the second time, timed and without hints.",
        href: hrefFor(problem),
      });
      const easier = problems.find((p) => p.topic === problem.topic && p.id !== problem.id);
      if (easier) {
        out.push({
          problemId: easier.id,
          title: easier.title,
          difficulty: easier.difficulty,
          topic: easier.topic,
          reason: `Rebuild the ${problem.topic} pattern with ${easier.title}, then come back to ${problem.title}.`,
          href: hrefFor(easier),
        });
      }
    } else {
      const idx = progression.indexOf(problem.id);
      const nextIds = progression.slice(idx + 1, idx + 3);
      for (const id of nextIds) {
        const p = getProblemById(id);
        if (p) {
          out.push({
            problemId: p.id,
            title: p.title,
            difficulty: p.difficulty,
            topic: p.topic,
            reason: `You passed ${problem.title}. ${p.title} is the next step up in the sequence.`,
            href: hrefFor(p),
          });
        }
      }
      if (!out.length) {
        const other = problems.find((p) => p.difficulty === "Hard" && p.id !== problem.id);
        if (other) out.push({ problemId: other.id, title: other.title, difficulty: other.difficulty, topic: other.topic, reason: "You are at the top of the sequence. Stay sharp with another Hard problem.", href: hrefFor(other) });
      }
    }
    if ((rec.complexityCorrect ?? true) === false) {
      const drill = problems.find((p) => p.topic === "HashMap" && p.id !== problem.id) || problems[0];
      out.push({
        problemId: drill.id,
        title: drill.title,
        difficulty: drill.difficulty,
        topic: drill.topic,
        reason: "Complexity drill: solve this and state the time and space complexity out loud before you submit.",
        href: hrefFor(drill),
      });
    }
  } else {
    const start = problems.find((p) => p.difficulty === "Easy") || problems[0];
    const mid = problems.find((p) => p.difficulty === "Mid") || problems[2];
    out.push(
      { problemId: start.id, title: start.title, difficulty: start.difficulty, topic: start.topic, reason: "Move from talking to coding: start the technical track with an Easy problem and full approach explanation.", href: hrefFor(start) },
      { problemId: mid.id, title: mid.title, difficulty: mid.difficulty, topic: mid.topic, reason: "Then a Mid problem, where thin answers and missing complexity start costing real marks.", href: hrefFor(mid) }
    );
  }
  const seen = new Set<string>();
  return out.filter((s) => (seen.has(s.problemId + s.reason) ? false : (seen.add(s.problemId + s.reason), true))).slice(0, 3);
}

export function phaseNotes(rec: SessionRecord, problem?: Problem): PhaseNote[] {
  const notes: PhaseNote[] = [];
  if (rec.type === "technical" && problem) {
    const approachWords = rec.approachText ? wordCount(rec.approachText) : 0;
    notes.push({
      phase: "Approach",
      did: rec.approachText ? `You said: "${rec.approachText.slice(0, 220)}"` : "No approach was recorded.",
      weak: !rec.approachText
        ? "You coded without a stated plan. Interviewers cannot score what they cannot hear."
        : approachWords < 8
          ? "Too thin. A judgeable approach names the data structure, the pass, and the return value."
          : "Check it against the intended pattern below: if your plan differs, you should be able to say why.",
      strong: `A strong approach here sounds like: "${problem.pattern}" Then state ${problem.complexity.replace("Expected: ", "").toLowerCase()} up front.`,
    });
    const ratio = rec.totalTests > 0 ? `${rec.testsPassed} of ${rec.totalTests}` : "no";
    notes.push({
      phase: "Coding and testing",
      did: `You ran your code ${rec.runs} time${rec.runs === 1 ? "" : "s"} and passed ${ratio} tests.${(rec.hintsUsed ?? 0) > 0 ? ` You used ${rec.hintsUsed} hint${(rec.hintsUsed ?? 0) > 1 ? "s" : ""}.` : ""}`,
      weak:
        rec.testsPassed < rec.totalTests
          ? "Passing the examples is not passing the problem. The edge cases below are where the hidden tests live."
          : rec.runs === 0
            ? "You passed without running, which will not survive a harder problem. Run as you go."
            : "Solid testing habit. Keep tracing one failing style case by hand whenever a run surprises you.",
      strong: `Key points for ${problem.title}: ${problem.keyPoints[0]} ${problem.keyPoints[1] || ""}`.trim(),
    });
    notes.push({
      phase: "Complexity and communication",
      did: rec.complexityAnswer
        ? `You answered: "${rec.complexityAnswer.slice(0, 160)}". Interviewer questions answered: ${rec.aiAnswered ?? 0} of ${rec.aiAsked ?? 0}.`
        : `You never answered the complexity question. Interviewer questions answered: ${rec.aiAnswered ?? 0} of ${rec.aiAsked ?? 0}.`,
      weak:
        rec.complexityCorrect === false
          ? "Your complexity did not match the solution. This is one of the most common reasons strong coders lose marks."
          : rec.complexityCorrect == null
            ? "Skipping the complexity round leaves free marks on the table."
            : "Complexity was right. Next level: justify it from the code structure, not from memory of the problem.",
      strong: `Expected: ${problem.complexity}`,
    });
    return notes;
  }
  const pairs: PhaseNote[] = [];
  const msgs = rec.transcript || [];
  let q = 0;
  for (let i = 0; i < msgs.length; i++) {
    if (msgs[i].role === "ai") {
      const nextUser = msgs.slice(i + 1).find((m) => m.role === "user");
      const isQuestionLike = msgs[i].text.includes("?") || q === 0;
      if (!isQuestionLike) continue;
      q += 1;
      if (q > 5) break;
      const words = nextUser ? wordCount(nextUser.text) : 0;
      pairs.push({
        phase: `Question ${q}`,
        did: nextUser ? `You answered in ${words} words: "${nextUser.text.slice(0, 180)}"` : "No answer recorded for this question.",
        weak: !nextUser
          ? "Unanswered questions end the conversation on that topic. Always attempt a structured partial answer."
          : words < 20
            ? "Too thin. This answer would not survive a follow-up in a real interview."
            : words < 45
              ? "Some substance, but it needs a trade-off or a failure case to sound senior."
              : "Good depth. This is the length and specificity interviewers reward.",
        strong: "A strong answer here covers: a direct claim, one concrete example, the trade-off you accepted, and the result or number that proves it.",
      });
    }
  }
  return pairs.length ? pairs : notes;
}
