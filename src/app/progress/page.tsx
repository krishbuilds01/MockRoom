"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { computeAnalytics, loadHistory, type Analytics } from "@/lib/analytics";
import { scoreBarClass } from "@/lib/scoreColor";
import Logo from "@/components/Logo";
import Footer from "@/components/Footer";

function StatCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="card card-pad">
      <div className="text-xs font-medium text-stone-600">{label}</div>
      <div className="tnum mt-1 font-display text-3xl font-semibold leading-none tracking-tight">{value}</div>
      <div className="mt-1.5 text-xs leading-5 text-stone-600">{sub}</div>
    </div>
  );
}

function TrendChart({ analytics }: { analytics: Analytics }) {
  const pts = analytics.trend.slice(-14);
  const W = 640;
  const H = 220;
  const padL = 36;
  const padR = 16;
  const padT = 38;
  const padB = 32;
  const iw = W - padL - padR;
  const ih = H - padT - padB;
  const x = (i: number) => padL + (pts.length === 1 ? iw / 2 : (i / (pts.length - 1)) * iw);
  const y = (v: number) => padT + ih - (v / 11) * ih;
  const line = pts.map((p, i) => `${x(i)},${y(p.overall)}`).join(" ");
  return (
    <div className="card card-pad">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-h2 font-semibold">Score trend</h2>
        <span className="text-xs text-stone-600">Overall score per session, oldest to newest</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-4 w-full" role="img" aria-label="Overall score trend over time">
        {[0, 5, 10].map((g) => (
          <g key={g}>
            <line x1={padL} x2={W - padR} y1={y(g)} y2={y(g)} stroke="#e7e2d9" strokeWidth="1" />
            <text x={padL - 8} y={y(g) + 4} textAnchor="end" fontSize="12" fill="#57534e">{g}</text>
          </g>
        ))}
        {pts.length > 1 && <polyline points={line} fill="none" stroke="#15803d" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />}
        {pts.map((p, i) => (
          <g key={p.date + i}>
            <circle cx={x(i)} cy={y(p.overall)} r="4.5" fill="#15803d" stroke="#ffffff" strokeWidth="2" />
            <text x={x(i)} y={y(p.overall) - 10} textAnchor="middle" fontSize="12" fontWeight="600" fill="#1c1917" style={{ fontVariantNumeric: "tabular-nums" }}>
              {p.overall}
            </text>
            {(pts.length <= 8 || i === 0 || i === pts.length - 1 || i % 3 === 0) && (
              <text x={x(i)} y={H - 8} textAnchor="middle" fontSize="12" fill="#57534e">
                {p.label}
              </text>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}

function AverageRow({ name, average, count }: { name: string; average: number; count: number }) {
  return (
    <div className="flex items-center gap-3 py-2">
      <span className="w-40 shrink-0 truncate text-sm text-stone-700">{name}</span>
      <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-line">
        <div className={`h-full rounded-full ${scoreBarClass(average)}`} style={{ width: `${average * 10}%` }} />
      </div>
      <span className="tnum w-14 shrink-0 text-right text-sm font-semibold">{average}/10</span>
      <span className="w-16 shrink-0 text-right text-xs text-stone-600">{count} session{count === 1 ? "" : "s"}</span>
    </div>
  );
}

export default function ProgressPage() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAnalytics(computeAnalytics(loadHistory(), new Date()));
  }, []);

  const enough = (analytics?.total ?? 0) >= 3;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col px-5">
      <nav className="flex h-16 shrink-0 items-center justify-between border-b border-line">
        <Logo />
        <div className="flex items-center gap-5 text-sm text-stone-600">
          <Link href="/" className="hover:text-stone-900">Home</Link>
          <Link href="/interview/feedback" className="hover:text-stone-900">Latest feedback</Link>
        </div>
      </nav>

      <div className="flex shrink-0 flex-wrap items-end justify-between gap-2 pt-6">
        <div>
          <h1 className="font-display text-4xl font-semibold tracking-tight">Your progress</h1>
          <p className="mt-1 text-sm text-stone-600">Computed from the interviews stored in this browser. Nothing here is estimated.</p>
        </div>
      </div>

      {!analytics ? (
        <p className="pt-8 text-sm text-stone-600">Loading your history...</p>
      ) : analytics.total === 0 ? (
        <div className="card card-hero card-pad mt-6 max-w-xl">
          <h2 className="font-display text-h2 font-semibold">No interviews yet</h2>
          <p className="mt-2 text-sm leading-6 text-stone-600">
            Finish one interview and this page starts tracking your scores, your streak, and the topics that need work.
          </p>
          <Link href="/" className="btn btn-accent mt-4">Start your first interview</Link>
        </div>
      ) : (
        <>
          <div className="mt-6 grid shrink-0 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Interviews finished" value={String(analytics.total)} sub={`${analytics.technicalCount} technical, ${analytics.generalCount} live or resume`} />
            <StatCard label="Average overall" value={`${analytics.averageOverall}/10`} sub="Across every session on this device" />
            <StatCard label="Practice streak" value={`${analytics.streakDays} day${analytics.streakDays === 1 ? "" : "s"}`} sub={analytics.streakDays > 0 ? "Consecutive days with at least one session" : "Do a session today to start a streak"} />
            <StatCard
              label="Strongest area"
              value={analytics.strongest ? `${analytics.strongest.average}/10` : "Not yet"}
              sub={analytics.strongest ? analytics.strongest.name : "Finish a session first"}
            />
          </div>

          {!enough && (
            <div className="card card-pad mt-4 shrink-0 border-amber-300 bg-amber-50" role="note">
              <p className="text-sm leading-6 text-amber-800">
                Finish {3 - analytics.total} more interview{analytics.total === 2 ? "" : "s"} to unlock trends. Averages from one or two sessions swing too much to mean anything, so this page waits for real data.
              </p>
            </div>
          )}

          <div className="mt-4 grid min-h-0 flex-1 gap-4 pb-6 lg:grid-cols-2 lg:overflow-hidden">
            <div className="min-h-0 space-y-4 lg:overflow-y-auto lg:pr-1">
              {enough && <TrendChart analytics={analytics} />}
              <div className="card card-pad">
                <h2 className="font-display text-h2 font-semibold">This week</h2>
                <p className="mt-1 text-xs leading-5 text-stone-600">Three sessions aimed at your weakest areas, picked from your own scores.</p>
                <div className="mt-3 space-y-2">
                  {analytics.plan.map((item) => (
                    <div key={item.title} className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-line bg-panel2 px-4 py-3">
                      <span className="text-sm font-semibold">{item.title}</span>
                      <span className="min-w-0 flex-1 text-sm leading-5 text-stone-600">{item.reason}</span>
                      <Link href={item.href} className="btn btn-primary btn-sm">Start</Link>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="min-h-0 space-y-4 lg:overflow-y-auto lg:pr-1">
              <div className="card card-pad">
                <h2 className="font-display text-h2 font-semibold">By scoring axis</h2>
                <div className="mt-2 divide-y divide-line">
                  {analytics.axisAverages.map((a) => (
                    <AverageRow key={a.name} name={a.name} average={a.average} count={a.count} />
                  ))}
                </div>
              </div>
              <div className="card card-pad">
                <h2 className="font-display text-h2 font-semibold">By topic</h2>
                {analytics.topicAverages.length ? (
                  <div className="mt-2 divide-y divide-line">
                    {analytics.topicAverages.map((a) => (
                      <AverageRow key={a.name} name={a.name} average={a.average} count={a.count} />
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-sm leading-6 text-stone-600">No technical sessions yet, so there are no topic scores. Topic averages appear after your first coding interview.</p>
                )}
                {analytics.weakest && (
                  <p className="mt-3 text-sm leading-6 text-stone-600">
                    Weakest right now: <span className="font-semibold text-stone-900">{analytics.weakest.name}</span> at{" "}
                    <span className="tnum font-semibold text-stone-900">{analytics.weakest.average}/10</span>. That is where the plan on the left points.
                  </p>
                )}
              </div>
            </div>
          </div>
        </>
      )}
      <div className="mt-auto">
        <Footer />
      </div>
    </main>
  );
}
