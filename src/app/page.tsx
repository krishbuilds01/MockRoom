"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { computeAnalytics, loadHistory } from "@/lib/analytics";
import { scoreBarClass } from "@/lib/scoreColor";
import { bankCompanies, countByFormat, problemBank, startHref } from "@/lib/problemBank";
import { overallScore, type SessionRecord } from "@/lib/interviewer";
import { CompanyCell, DifficultyPill } from "@/components/ProblemBank";
import { LogoMark } from "@/components/Logo";
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

function SectionLabel({ children }: { children: string }) {
  return <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">{children}</p>;
}

function SectionHeading({ children }: { children: string }) {
  return (
    <h2 className="font-display mt-3 text-[28px] font-semibold leading-[1.15] tracking-[-0.02em] text-white sm:text-[34px]">
      {children}
    </h2>
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
  const chartSessions = chronological.slice(-30);
  const chartOffset = chronological.length - chartSessions.length;
  const latest = history[0] ?? null;
  const latestOverall = latest ? overallScore(latest.scores) : null;
  const previousOverall = history.length > 1 ? overallScore(history[1].scores) : null;
  const trendDelta = latestOverall !== null && previousOverall !== null ? Math.round((latestOverall - previousOverall) * 10) / 10 : null;

  const featured = FEATURED_TITLES.map((t) => problemBank.find((p) => p.title === t)).filter((p) => p !== undefined);
  const companyCounts = bankCompanies();
  const heroCompanies = ["Google", "Amazon"]
    .map((name) => companyCounts.find((c) => c.name === name))
    .filter((c) => c !== undefined);

  const firstSteps = [
    "Head to the setup page, choose a mode, an interviewer and a difficulty, then start. There is no account and nothing to install.",
    "Voice room: an introduction, 5 questions with a follow-up on each, then your questions for the interviewer. Coding room: your approach is judged before you write code, and the interviewer watches the editor while you work.",
    "Every session ends with scores out of 10 on problem solving, coding, communication and complexity analysis, your weak areas, and the next problems to do.",
  ];

  return (
    <div className="min-h-dvh bg-ink">
      <TopNav />
      <main className="mx-auto w-full max-w-[1340px] px-5">
        <header className="relative pb-14 pt-16 text-center lg:pb-20 lg:pt-24">
          <div className="pointer-events-none absolute inset-0 hidden lg:block" aria-hidden="true">
            {heroCompanies[0] && (
              <span className="pointer-events-auto absolute left-0 top-24 flex -rotate-3 items-center gap-2 rounded-full border border-line bg-panel py-2 pl-2 pr-4 text-sm font-medium text-white">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-tile text-xs font-bold">G</span>
                Google
                <span className="tnum text-neutral-500">{heroCompanies[0].count} questions</span>
              </span>
            )}
            {heroCompanies[1] && (
              <span className="pointer-events-auto absolute right-0 top-40 flex rotate-2 items-center gap-2 rounded-full border border-line bg-panel py-2 pl-2 pr-4 text-sm font-medium text-white">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-tile text-xs font-bold">A</span>
                Amazon
                <span className="tnum text-neutral-500">{heroCompanies[1].count} questions</span>
              </span>
            )}
            <Link href="/problems?format=coding" className="pointer-events-auto absolute bottom-4 left-0 block w-[248px] -rotate-2 rounded-2xl border border-line bg-panel p-4 text-left transition hover:border-line2">
              <span className="block text-sm font-semibold text-white">Group Anagrams</span>
              <span className="mt-0.5 block text-xs text-neutral-600">Medium · Asked at Amazon, Google</span>
              <span className="mt-2 block text-[13px] font-semibold text-accent">Open question →</span>
            </Link>
            <Link href="/problems?format=system-design" className="pointer-events-auto absolute bottom-4 right-0 block w-[264px] rotate-2 rounded-2xl border border-line bg-panel p-4 text-left transition hover:border-line2">
              <span className="block text-sm font-semibold text-white">Design a Typeahead Service</span>
              <span className="mt-0.5 block text-xs text-neutral-600">System design · Asked at Pinterest, Slack</span>
              <span className="mt-2 block text-[13px] font-semibold text-accent">Open question →</span>
            </Link>
          </div>
          <div className="flex justify-center">
            <LogoMark size={44} />
          </div>
          <h1 className="font-display mx-auto mt-7 max-w-4xl text-[40px] font-bold leading-[1.02] tracking-[-0.03em] text-white sm:text-[76px]">
            Real interview questions.
            <span className="block italic text-accent">A strict interviewer.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-[15px] leading-6 text-neutral-600">
            Coding, system design and general rounds from the companies you are targeting, practised live with Maya or Rohan.
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <Link href="/problems" className="btn btn-primary h-12 px-6 text-[15px]">Browse problems</Link>
            <Link href="/setup" className="btn btn-secondary h-12 px-6 text-[15px]">Start an interview →</Link>
          </div>
        </header>

        <section className="border-t border-line pt-10 lg:pt-14" aria-label="Featured questions">
          <SectionLabel>Problem bank</SectionLabel>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <SectionHeading>Featured questions</SectionHeading>
            <Link href="/problems" className="text-sm font-semibold text-accent hover:underline">
              View all {problemBank.length} problems →
            </Link>
          </div>
          <div className="mt-6 overflow-hidden rounded-2xl border border-line bg-panel">
            <table className="w-full border-collapse text-sm">
              <tbody className="divide-y divide-line">
                {featured.map((p) => (
                  <tr key={p.title} className="transition hover:bg-panel2">
                    <td className="px-5 py-4">
                      <div className="font-semibold text-white">{p.title}</div>
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
                      <Link href={startHref(p)} className="text-sm font-semibold text-accent hover:underline">
                        Start →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-12 border-t border-line pt-10 lg:mt-24 lg:pt-14" aria-label="Workspace preview">
          <SectionLabel>Workspace</SectionLabel>
          <SectionHeading>The coding room</SectionHeading>
          <div className="mt-6 rounded-2xl border border-line bg-panel p-6" aria-hidden="true">
            <div className="grid gap-6 lg:grid-cols-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">Question</div>
                <div className="mt-3 text-lg font-semibold text-white">Group Anagrams</div>
                <p className="mt-2 text-sm leading-6 text-neutral-600">
                  Given an array of strings strs, group the anagrams together. You can return the answer in any order.
                </p>
                <div className="mt-3 rounded-xl bg-panel2 p-3 text-[13px] leading-6 text-neutral-700">
                  <div>Input: strs = [&quot;eat&quot;,&quot;tea&quot;,&quot;tan&quot;,&quot;ate&quot;,&quot;nat&quot;,&quot;bat&quot;]</div>
                  <div>Output: [[&quot;bat&quot;],[&quot;nat&quot;,&quot;tan&quot;],[&quot;ate&quot;,&quot;eat&quot;,&quot;tea&quot;]]</div>
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">Starter code · JavaScript</div>
                <pre className="mt-3 overflow-hidden rounded-xl border border-line bg-ink p-4 font-mono text-[13px] leading-6 text-neutral-700">{PREVIEW_CODE}</pre>
                <div className="mt-3 flex items-center gap-3">
                  <span className="btn btn-primary btn-sm">Run code</span>
                  <span className="text-[13px] text-neutral-600">No code has been run yet.</span>
                </div>
                <div className="mt-3 space-y-1.5 text-[13px] text-neutral-600">
                  {["Test 1", "Test 2", "Test 3"].map((t) => (
                    <div key={t} className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
                      {t} · Waiting
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">Interviewer</div>
                <div className="mt-3 space-y-4">
                  {PREVIEW_LINES.map((line) => (
                    <div key={line}>
                      <div className="text-[13px] font-semibold text-white">Maya</div>
                      <p className="mt-0.5 text-sm leading-6 text-neutral-600">{line}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-neutral-600">The prompt, starter code and test cases, side by side.</p>
            <Link href="/problems" className="text-sm font-semibold text-accent hover:underline">Open the problem bank →</Link>
          </div>
        </section>

        <section className="mt-12 border-t border-line pt-10 lg:mt-24 lg:pt-14" aria-label="Browse by format">
          <SectionLabel>Formats</SectionLabel>
          <SectionHeading>Browse by format</SectionHeading>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {FORMAT_CARDS.map((f) => (
              <Link key={f.key} href={`/problems?format=${f.key}`} className="block rounded-2xl border border-line bg-panel p-6 transition hover:border-line2">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-lg font-semibold text-white">{f.label}</span>
                  <span className="tnum font-display text-3xl font-semibold text-white">{countByFormat(f.key)}</span>
                </div>
                <p className="mt-2 text-sm leading-6 text-neutral-600">{f.line}</p>
                <span className="mt-3 block text-sm font-semibold text-accent">View problems →</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-12 border-t border-line pt-10 lg:mt-24 lg:pt-14" aria-label="Your practice record">
          <SectionLabel>Your record</SectionLabel>
          <SectionHeading>Your practice record</SectionHeading>
          {!historyLoaded ? (
            <div className="mt-6 rounded-2xl border border-line bg-panel p-6">
              <p className="text-[13px] leading-5 text-neutral-600">Loading your sessions...</p>
              <div className="mt-4 space-y-2.5" aria-hidden="true">
                <div className="h-3 w-2/3 rounded bg-panel2" />
                <div className="h-3 w-1/2 rounded bg-panel2" />
                <div className="h-3 w-3/5 rounded bg-panel2" />
                <div className="h-3 w-2/5 rounded bg-panel2" />
              </div>
            </div>
          ) : analytics && latest ? (
            <div className="mt-6 rounded-2xl border border-line bg-panel p-6">
              <dl className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <div>
                  <dt className="text-[13px] text-neutral-600">Sessions</dt>
                  <dd className="tnum mt-1 text-xl font-semibold text-white">{analytics.total}</dd>
                </div>
                <div>
                  <dt className="text-[13px] text-neutral-600">Average overall</dt>
                  <dd className="tnum mt-1 text-xl font-semibold text-white">{analytics.averageOverall}/10</dd>
                </div>
                <div>
                  <dt className="text-[13px] text-neutral-600">Practice streak</dt>
                  <dd className="tnum mt-1 text-xl font-semibold text-white">{analytics.streakDays} day{analytics.streakDays === 1 ? "" : "s"}</dd>
                </div>
                <div>
                  <dt className="text-[13px] text-neutral-600">Weakest area</dt>
                  <dd className="tnum mt-1 text-xl font-semibold text-white">{analytics.weakest ? `${analytics.weakest.name} · ${analytics.weakest.average}/10` : "Not yet"}</dd>
                </div>
              </dl>
              <div className="mt-4 grid gap-6 border-t border-line pt-4 lg:grid-cols-2">
                <div>
                  <div className="text-[13px] text-neutral-600">Last session</div>
                  <div className="mt-1 text-sm font-medium text-white">{sessionTitle(latest)}</div>
                  <div className="mt-0.5 text-[13px] text-neutral-600">
                    {`${new Date(latest.date).toLocaleDateString()} · Overall `}
                    <span className="tnum font-semibold text-white">{latestOverall}/10</span>
                    {trendDelta !== null && (
                      <span className={trendDelta >= 0 ? "font-medium text-accent" : "font-medium text-neutral-600"}>
                        {` · ${trendDelta >= 0 ? "+" : ""}${trendDelta} vs the one before`}
                      </span>
                    )}
                  </div>
                  <Link href="/interview/feedback" className="mt-1.5 inline-block text-[13px] font-semibold text-accent hover:underline">Open the feedback</Link>
                  <Link href="/progress" className="mt-4 block text-[13px] font-medium text-neutral-700 underline underline-offset-2 hover:text-white">
                    Progress page: trend, topics and this week&apos;s plan
                  </Link>
                </div>
                {chronological.length > 1 && (
                  <div>
                    <div className="text-[13px] text-neutral-600">
                      Overall score per session, numbered in the order you did them
                      {chartOffset > 0 && <> · Showing the most recent 30 of {chronological.length} sessions</>}
                    </div>
                    <div className="mt-2 flex gap-2 border-b border-line2">
                      {chartSessions.map((h) => {
                        const o = overallScore(h.scores);
                        return (
                          <div key={h.id} className="flex flex-1 flex-col items-center gap-1.5" title={`${o}/10`}>
                            <span className="tnum text-xs font-semibold leading-none text-neutral-700">{o}</span>
                            <div className="relative h-16 w-full rounded-t bg-panel2">
                              <div className={`absolute inset-x-0 bottom-0 rounded-t ${scoreBarClass(o)}`} style={{ height: `${o * 10}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-1.5 flex gap-2">
                      {chartSessions.map((h, i) => (
                        <span key={h.id} className="tnum flex-1 text-center text-xs leading-none text-neutral-600">{`#${chartOffset + i + 1}`}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="mt-6 rounded-2xl border border-line bg-panel p-6">
              <h3 className="text-lg font-semibold text-white">No sessions yet</h3>
              <p className="mt-2 max-w-2xl text-[13px] leading-5 text-neutral-600">
                Your practice record appears here after your first session: scores, streak and weakest areas, computed from the
                sessions stored in this browser.
              </p>
              <ol className="mt-4 space-y-3.5">
                {firstSteps.map((step, i) => (
                  <li key={step} className="flex items-baseline gap-3 text-[13px] leading-5 text-neutral-600">
                    <span className="tnum flex h-5 w-5 shrink-0 translate-y-0.5 items-center justify-center rounded-full border border-line2 text-[11px] font-semibold text-neutral-700">{i + 1}</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </section>

        {history.length > 0 && (
          <section className="mt-12 lg:mt-16">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-display text-lg font-semibold text-white">Session history</h2>
              <Link href="/progress" className="text-[13px] font-medium text-neutral-700 underline underline-offset-2 hover:text-white">Progress page</Link>
            </div>
            <div className="mt-4 divide-y divide-line rounded-2xl border border-line bg-panel">
              {history.map((h) => (
                <div key={h.id} className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 text-sm">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 truncate font-medium text-white">
                      <span className="truncate">{sessionTitle(h)}</span>
                      <span className={`badge ${h.difficulty === "Easy" ? "badge-easy" : h.difficulty === "Hard" ? "badge-hard" : "badge-mid"}`}>{h.difficulty}</span>
                      {h.companyName && <span className="badge badge-accent">{h.companyName}</span>}
                      {h.resumeInterview && <span className="badge">Resume</span>}
                      {h.incomplete && <span className="badge badge-mid">Incomplete</span>}
                    </div>
                    <div className="mt-0.5 text-xs text-neutral-600">{`${new Date(h.date).toLocaleString()} · ${Math.round(h.timeSec / 60)} min${h.targetSec ? ` of ${Math.round(h.targetSec / 60)} target` : ""}${h.interviewerName ? ` · Interviewer: ${h.interviewerName}` : ""}`}</div>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-neutral-600">
                    {h.type === "technical" && (
                      <span>Tests <span className="tnum font-semibold text-white">{h.testsPassed}/{h.totalTests}</span></span>
                    )}
                    {(h.hintsUsed ?? 0) > 0 && <span>Hints <span className="tnum font-semibold text-white">{h.hintsUsed}</span></span>}
                    <span>Problem Solving <span className="tnum font-semibold text-white">{h.scores.problemSolving}/10</span></span>
                    <span>Overall <span className="tnum font-semibold text-white">{overallScore(h.scores)}/10</span></span>
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
