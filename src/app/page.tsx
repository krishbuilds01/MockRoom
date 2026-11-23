"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { computeAnalytics, loadHistory } from "@/lib/analytics";
import { scoreBarClass } from "@/lib/scoreColor";
import { bankCompanies, countByFormat, problemBank, startHref } from "@/lib/problemBank";
import { overallScore, type SessionRecord } from "@/lib/interviewer";
import { CompanyCell, DifficultyPill } from "@/components/ProblemBank";
import TopNav from "@/components/TopNav";
import Footer from "@/components/Footer";

function sessionTitle(h: SessionRecord): string {
  return h.type === "technical" ? h.problemTitle || "Technical interview" : "Live AI Interview";
}

const FORMAT_CARDS = [
  { key: "coding", label: "Coding", line: "Arrays, strings, graphs and DP, practised in the coding room with your code watched live." },
  { key: "system-design", label: "System design", line: "The design questions real loops are built around. The rooms open soon; the question set is final." },
  { key: "general", label: "General", line: "Behavioural and fundamentals questions, answered out loud with follow-ups." },
] as const;

const FEATURED_TITLES = [
  "Two Sum",
  "Group Anagrams",
  "LRU Cache",
  "Design a Typeahead Suggestion Service",
  "Design a URL Shortener",
  "What happens when you type a URL into a browser?",
];

const PREVIEW_CODE = `function groupAnagrams(strs) {
  const map = new Map();
  for (const s of strs) {
    const key = s.split("").sort().join("");
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(s);
  }
  return [...map.values()];
}`;

const PREVIEW_LINES = [
  "Before you run anything, talk me through the approach.",
  "Why group by a sorted key? What does that cost on long strings?",
  "Good. Now the complexity, in terms of total characters.",
];

function SectionHeading({ children, sub }: { children: string; sub?: string }) {
  return (
    <div>
      <h2 className="text-2xl font-medium tracking-tight text-neutral-900">{children}</h2>
      {sub && <p className="mt-1 text-sm leading-6 text-neutral-600">{sub}</p>}
    </div>
  );
}

export default function Home() {
  const [history, setHistory] = useState<SessionRecord[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHistory(loadHistory());
    setHistoryLoaded(true);
  }, []);

  const analytics = history.length ? computeAnalytics(history) : null;
  const chronological = [...history].reverse();
  const chartSessions = chronological.slice(-20);
  const chartOffset = chronological.length - chartSessions.length;
  const chartLabelStep = Math.max(1, Math.ceil(chartSessions.length / 8));
  const chartLabelShown = (i: number) => i % chartLabelStep === 0 || i === chartSessions.length - 1;
  const latest = history[0] ?? null;
  const latestOverall = latest ? overallScore(latest.scores) : null;
  const previousOverall = history.length > 1 ? overallScore(history[1].scores) : null;
  const trendDelta = latestOverall !== null && previousOverall !== null ? Math.round((latestOverall - previousOverall) * 10) / 10 : null;

  const featured = FEATURED_TITLES.map((t) => problemBank.find((p) => p.title === t)).filter((p) => p !== undefined);
  const companyCount = bankCompanies().length;

  const firstSteps = [
    "Head to the setup page, choose a mode, an interviewer and a difficulty, then start. Just open it and practice.",
    "Voice room: an introduction, 5 questions with a follow-up on each, then your questions for the interviewer. Coding room: your approach is judged before you write code, and the interviewer watches the editor while you work.",
    "Every session ends with scores out of 10 on problem solving, coding, communication and complexity analysis, your weak areas, and the next problems to do.",
  ];

  return (
    <div className="min-h-dvh bg-paper">
      <TopNav />
      <main className="mx-auto w-full max-w-7xl px-5 sm:px-8">
        <header className="grid items-center gap-10 pb-16 pt-12 lg:grid-cols-2 lg:gap-16 lg:pb-24 lg:pt-20">
          <div>
            <h1 className="max-w-xl text-[40px] font-medium leading-[1.05] tracking-[-0.03em] text-neutral-900 sm:text-[64px]">
              Practice the interview before it counts
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-neutral-600">
              Mock Room runs live voice and coding interviews with Maya or Rohan, using real questions from the companies
              you are targeting. Every session is scored out of 10, with feedback that names what to fix.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/setup" className="btn btn-primary h-12 px-6 text-[15px]">Start an interview</Link>
              <Link href="/problems" className="btn btn-secondary h-12 px-6 text-[15px]">Browse problems</Link>
            </div>
            <p className="tnum mt-6 font-mono text-[13px] text-neutral-500">
              {problemBank.length} problems · {companyCount} companies · free to use
            </p>
          </div>

          <div className="card overflow-hidden shadow-[0_8px_24px_rgba(0,0,0,0.4)]" aria-label="Preview of the coding room">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-4">
              <span className="text-sm font-medium text-neutral-900">Technical interview</span>
              <span className="font-mono text-xs text-neutral-500">Group Anagrams · Medium</span>
            </div>
            <div className="px-5 py-4">
              <p className="text-sm leading-6 text-neutral-700">
                Given an array of strings strs, group the anagrams together. You can return the answer in any order.
              </p>
              <pre className="mt-4 overflow-x-auto rounded-lg bg-[#12100d] p-4 font-mono text-[13px] leading-6 text-[#ede8de]">{PREVIEW_CODE}</pre>
              <div className="mt-4 space-y-3 border-t border-line pt-4">
                {PREVIEW_LINES.map((line) => (
                  <div key={line} className="flex gap-3">
                    <span className="avatar h-7 w-7 text-xs">M</span>
                    <div className="min-w-0">
                      <span className="text-[13px] font-medium text-neutral-900">Maya</span>
                      <p className="text-sm leading-6 text-neutral-600">{line}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </header>

        <section className="border-t border-line pt-12" aria-label="Featured questions">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <SectionHeading>Featured questions</SectionHeading>
            <Link href="/problems" className="text-sm font-medium text-accent hover:underline">
              View all {problemBank.length} problems
            </Link>
          </div>
          <div className="card mt-6 overflow-x-auto">
            <table className="w-full border-collapse text-sm sm:min-w-[560px]">
              <tbody className="divide-y divide-line">
                {featured.map((p) => (
                  <tr key={p.title} className="transition-colors hover:bg-panel2">
                    <td className="px-5 py-4">
                      <div className="font-medium text-neutral-900">{p.title}</div>
                      {p.difficulty && (
                        <div className="mt-1.5">
                          <DifficultyPill difficulty={p.difficulty} />
                        </div>
                      )}
                    </td>
                    <td className="hidden px-5 py-4 sm:table-cell">
                      <CompanyCell companies={p.companies} />
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Link href={startHref(p)} className="text-sm font-medium text-accent hover:underline">
                        Start
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-16 border-t border-line pt-12" aria-label="Browse by format">
          <SectionHeading>Browse by format</SectionHeading>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {FORMAT_CARDS.map((f) => (
              <Link key={f.key} href={`/problems?format=${f.key}`} className="card block p-5 transition-colors hover:border-line2">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-base font-medium text-neutral-900">{f.label}</span>
                  <span className="tnum font-mono text-sm text-neutral-500">{countByFormat(f.key)} problems</span>
                </div>
                <p className="mt-2 text-sm leading-6 text-neutral-600">{f.line}</p>
                <span className="mt-3 block text-sm font-medium text-accent">View problems</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-16 border-t border-line pt-12" aria-label="Your practice record">
          <SectionHeading>Your practice record</SectionHeading>
          {!historyLoaded ? (
            <div className="card mt-6 p-5">
              <p className="text-[13px] leading-5 text-neutral-600">Loading your sessions...</p>
              <div className="mt-4 space-y-2.5" aria-hidden="true">
                <div className="h-3 w-2/3 rounded bg-panel2" />
                <div className="h-3 w-1/2 rounded bg-panel2" />
                <div className="h-3 w-3/5 rounded bg-panel2" />
              </div>
            </div>
          ) : analytics && latest ? (
            <div className="card mt-6 p-5 sm:p-6">
              <dl className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <div>
                  <dt className="text-[13px] text-neutral-600">Sessions</dt>
                  <dd className="tnum mt-1 text-xl font-medium text-neutral-900">{analytics.total}</dd>
                </div>
                <div>
                  <dt className="text-[13px] text-neutral-600">Average overall</dt>
                  <dd className="tnum mt-1 text-xl font-medium text-neutral-900">{analytics.averageOverall}/10</dd>
                </div>
                <div>
                  <dt className="text-[13px] text-neutral-600">Practice streak</dt>
                  <dd className="tnum mt-1 text-xl font-medium text-neutral-900">{analytics.streakDays} day{analytics.streakDays === 1 ? "" : "s"}</dd>
                </div>
                <div>
                  <dt className="text-[13px] text-neutral-600">Weakest area</dt>
                  <dd className="tnum mt-1 text-xl font-medium text-neutral-900">{analytics.weakest ? `${analytics.weakest.name} · ${analytics.weakest.average}/10` : "Not yet"}</dd>
                </div>
              </dl>
              <div className="mt-5 grid gap-6 border-t border-line pt-5 lg:grid-cols-2">
                <div>
                  <div className="text-[13px] text-neutral-600">Last session</div>
                  <div className="mt-1 text-sm font-medium text-neutral-900">{sessionTitle(latest)}</div>
                  <div className="mt-0.5 text-[13px] text-neutral-600">
                    {`${new Date(latest.date).toLocaleDateString()} · Overall `}
                    <span className="tnum font-medium text-neutral-900">{latestOverall}/10</span>
                    {trendDelta !== null && (
                      <span className={trendDelta >= 0 ? "font-medium text-[#6fd598]" : "font-medium text-neutral-600"}>
                        {` · ${trendDelta >= 0 ? "+" : ""}${trendDelta} vs the one before`}
                      </span>
                    )}
                  </div>
                  <Link href="/interview/feedback" className="mt-2 inline-block text-[13px] font-medium text-accent hover:underline">Open the feedback</Link>
                  <Link href="/progress" className="mt-3 block text-[13px] text-neutral-600 underline underline-offset-2 transition-colors hover:text-neutral-900">
                    Progress page: trend, topics and this week&apos;s plan
                  </Link>
                </div>
                {chronological.length > 1 && (
                  <div>
                    <div className="text-[13px] text-neutral-600">
                      Overall score per session, numbered in the order you did them
                      {chartOffset > 0 && <> · Showing the most recent 20 of {chronological.length} sessions</>}
                    </div>
                    <div className="mt-2 flex gap-2 border-b border-line2">
                      {chartSessions.map((h, i) => {
                        const o = overallScore(h.scores);
                        return (
                          <div key={h.id} className="flex min-w-0 flex-1 flex-col items-center gap-1.5" title={`${o}/10`}>
                            <span className={`tnum text-xs font-medium leading-none text-neutral-700 ${chartLabelShown(i) ? "" : "invisible"}`}>{o}</span>
                            <div className="relative h-16 w-full rounded-t bg-panel2">
                              <div className={`absolute inset-x-0 bottom-0 rounded-t ${scoreBarClass(o)}`} style={{ height: `${o * 10}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-1.5 flex gap-2">
                      {chartSessions.map((h, i) => (
                        <span key={h.id} className={`tnum flex-1 text-center font-mono text-xs leading-none text-neutral-500 ${chartLabelShown(i) ? "" : "invisible"}`}>{`#${chartOffset + i + 1}`}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="card mt-6 p-5 sm:p-6">
              <h3 className="text-base font-medium text-neutral-900">No sessions yet</h3>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-600">
                Your practice record appears here after your first session: scores, streak and weakest areas, computed from the
                sessions stored in this browser.
              </p>
              <ol className="mt-4 space-y-3">
                {firstSteps.map((step, i) => (
                  <li key={step} className="flex items-baseline gap-3 text-sm leading-6 text-neutral-600">
                    <span className="tnum shrink-0 font-mono text-[13px] font-medium text-accent">{i + 1}</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
              <Link href="/setup" className="btn btn-primary mt-5">Start your first interview</Link>
            </div>
          )}
        </section>

        {history.length > 0 && (
          <section className="mt-16">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-xl font-medium tracking-tight text-neutral-900">Session history</h2>
              <Link href="/progress" className="text-[13px] text-neutral-600 underline underline-offset-2 transition-colors hover:text-neutral-900">Progress page</Link>
            </div>
            <div className="card mt-4 divide-y divide-line">
              {history.map((h) => (
                <div key={h.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 text-sm">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 font-medium text-neutral-900">
                      <span>{sessionTitle(h)}</span>
                      <span className={`badge ${h.difficulty === "Easy" ? "badge-easy" : h.difficulty === "Hard" ? "badge-hard" : "badge-mid"}`}>{h.difficulty}</span>
                      {h.companyName && <span className="badge badge-accent">{h.companyName}</span>}
                      {h.resumeInterview && <span className="badge">Resume</span>}
                      {h.incomplete && <span className="badge badge-mid">Incomplete</span>}
                    </div>
                    <div className="tnum mt-0.5 font-mono text-xs text-neutral-500">{`${new Date(h.date).toLocaleString()} · ${Math.round(h.timeSec / 60)} min${h.targetSec ? ` of ${Math.round(h.targetSec / 60)} target` : ""}${h.interviewerName ? ` · Interviewer: ${h.interviewerName}` : ""}`}</div>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-xs text-neutral-600">
                    {h.type === "technical" && (
                      <span>Tests <span className="tnum font-medium text-neutral-900">{h.testsPassed}/{h.totalTests}</span></span>
                    )}
                    {(h.hintsUsed ?? 0) > 0 && <span>Hints <span className="tnum font-medium text-neutral-900">{h.hintsUsed}</span></span>}
                    <span>Problem Solving <span className="tnum font-medium text-neutral-900">{h.scores.problemSolving}/10</span></span>
                    <span>Overall <span className="tnum font-medium text-neutral-900">{overallScore(h.scores)}/10</span></span>
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs text-neutral-600">History is stored only in this browser.</p>
          </section>
        )}

        <Footer />
      </main>
    </div>
  );
}
