import { getProblemById, problems } from "./problems";
import { overallScore, type SessionRecord } from "./interviewer";

export function loadHistory(): SessionRecord[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem("interviewai-history") || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (h): h is SessionRecord =>
        !!h &&
        typeof h === "object" &&
        typeof (h as SessionRecord).date === "string" &&
        !!(h as SessionRecord).scores &&
        typeof (h as SessionRecord).scores.problemSolving === "number" &&
        typeof (h as SessionRecord).scores.coding === "number"
    );
  } catch {
    return [];
  }
}

export interface TrendPoint {
  date: string;
  label: string;
  overall: number;
  type: string;
}

export interface NamedAverage {
  name: string;
  average: number;
  count: number;
}

export interface PlanItem {
  title: string;
  reason: string;
  href: string;
}

export interface Analytics {
  total: number;
  averageOverall: number;
  technicalCount: number;
  generalCount: number;
  trend: TrendPoint[];
  topicAverages: NamedAverage[];
  axisAverages: NamedAverage[];
  strongest: NamedAverage | null;
  weakest: NamedAverage | null;
  streakDays: number;
  plan: PlanItem[];
}

const AXES: { key: "problemSolving" | "coding" | "communication" | "complexity"; label: string }[] = [
  { key: "problemSolving", label: "Problem Solving" },
  { key: "coding", label: "Coding" },
  { key: "communication", label: "Communication" },
  { key: "complexity", label: "Complexity Analysis" },
];

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function computeStreak(history: SessionRecord[], now: Date = new Date()): number {
  const days = new Set(history.map((h) => dayKey(new Date(h.date))));
  if (!days.size) return 0;
  const cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (!days.has(dayKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
    if (!days.has(dayKey(cursor))) return 0;
  }
  let streak = 0;
  while (days.has(dayKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function techHref(topic: string, difficulty: string): string {
  const p = problems.find((x) => x.topic === topic && x.difficulty === difficulty) || problems.find((x) => x.topic === topic) || getProblemById("two-sum");
  if (!p) return "/interview/technical?difficulty=Mid&topic=HashMap";
  const q = new URLSearchParams({ difficulty: p.difficulty, topic: p.topic, problem: p.id });
  return `/interview/technical?${q.toString()}`;
}

export function computeAnalytics(history: SessionRecord[], now: Date = new Date()): Analytics {
  const total = history.length;
  const chronological = [...history].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const trend: TrendPoint[] = chronological.map((h) => {
    const d = new Date(h.date);
    return {
      date: h.date,
      label: `${d.getDate()}/${d.getMonth() + 1}`,
      overall: overallScore(h.scores),
      type: h.type,
    };
  });
  const averageOverall = total ? round1(trend.reduce((s, p) => s + p.overall, 0) / total) : 0;

  const topicMap = new Map<string, { sum: number; count: number }>();
  for (const h of history) {
    if (h.type !== "technical" || !h.topic) continue;
    const cur = topicMap.get(h.topic) || { sum: 0, count: 0 };
    cur.sum += overallScore(h.scores);
    cur.count += 1;
    topicMap.set(h.topic, cur);
  }
  const topicAverages: NamedAverage[] = [...topicMap.entries()]
    .map(([name, v]) => ({ name, average: round1(v.sum / v.count), count: v.count }))
    .sort((a, b) => b.average - a.average);

  const axisAverages: NamedAverage[] = AXES.map(({ key, label }) => ({
    name: label,
    average: total ? round1(history.reduce((s, h) => s + h.scores[key], 0) / total) : 0,
    count: total,
  }));

  const pool: NamedAverage[] = [
    ...axisAverages.filter((a) => a.count > 0),
    ...topicAverages.map((t) => ({ ...t, name: `${t.name} (topic)` })),
  ];
  const strongest = pool.length ? pool.reduce((a, b) => (b.average > a.average ? b : a)) : null;
  const weakest = pool.length ? pool.reduce((a, b) => (b.average < a.average ? b : a)) : null;

  const plan: PlanItem[] = [];
  const weakTopics = [...topicAverages].sort((a, b) => a.average - b.average);
  for (const t of weakTopics.slice(0, 2)) {
    const difficulty = t.average < 5 ? "Easy" : "Mid";
    plan.push({
      title: `${t.name} session at ${difficulty}`,
      reason: `${t.name} is your weakest topic at ${t.average}/10 across ${t.count} session${t.count === 1 ? "" : "s"}. One focused ${difficulty} round is worth more than another strong topic.`,
      href: techHref(t.name, difficulty),
    });
  }
  const weakAxis = [...axisAverages].sort((a, b) => a.average - b.average)[0];
  if (weakAxis && plan.length < 3) {
    if (weakAxis.name === "Communication" || weakAxis.name === "Complexity Analysis") {
      plan.push({
        title: "Live AI Interview at Mid",
        reason: `${weakAxis.name} is your lowest scoring axis at ${weakAxis.average}/10. Spoken answers with follow-ups are the fastest way to move it.`,
        href: "/interview/general?difficulty=Mid",
      });
    } else {
      const topicName = weakTopics[0]?.name || "HashMap";
      const difficulty = plan.some((p) => p.href === techHref(topicName, "Mid")) ? "Hard" : "Mid";
      plan.push({
        title: `Technical session at ${difficulty}`,
        reason: `${weakAxis.name} is your lowest scoring axis at ${weakAxis.average}/10. A full ${difficulty} coding round trains it directly.`,
        href: techHref(topicName, difficulty),
      });
    }
  }
  if (plan.length && plan.length < 3) {
    if (!plan.some((p) => p.href.startsWith("/interview/general"))) {
      plan.push({
        title: "Live AI Interview at Mid",
        reason: "A spoken round tests follow-ups and communication in a way coding alone never does.",
        href: "/interview/general?difficulty=Mid",
      });
    }
    if (plan.length < 3) {
      const strong = [...topicAverages].sort((a, b) => b.average - a.average)[0];
      plan.push({
        title: "Technical session at Hard",
        reason: strong
          ? `${strong.name} is your strongest topic at ${strong.average}/10. A Hard round there shows whether it holds under pressure.`
          : "A Hard technical round shows where your current level actually ends.",
        href: techHref(strong?.name || "Arrays", "Hard"),
      });
    }
  }
  if (!plan.length) {
    plan.push(
      { title: "Technical session at Easy", reason: "Start the data. One finished session is enough to begin a history.", href: techHref("HashMap", "Easy") },
      { title: "Live AI Interview at Mid", reason: "A spoken round shows how you handle follow-ups, which coding alone never tests.", href: "/interview/general?difficulty=Mid" },
      { title: "Technical session at Mid", reason: "Once Easy feels routine, Mid is where real interview pressure starts.", href: techHref("Arrays", "Mid") }
    );
  }

  return {
    total,
    averageOverall,
    technicalCount: history.filter((h) => h.type === "technical").length,
    generalCount: history.filter((h) => h.type === "general").length,
    trend,
    topicAverages,
    axisAverages,
    strongest,
    weakest,
    streakDays: computeStreak(history, now),
    plan: plan.slice(0, 3),
  };
}
