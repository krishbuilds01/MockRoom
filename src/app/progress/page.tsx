"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { computeAnalytics, loadHistory, type Analytics } from "@/lib/analytics";
import { scoreBarClass } from "@/lib/scoreColor";
import TopNav from "@/components/TopNav";
import Footer from "@/components/Footer";

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="min-w-[130px]">
      <div className="text-xs font-medium text-neutral-600">{label}</div>
      <div className="tnum mt-1 text-2xl font-medium leading-none tracking-tight">{value}</div>
      <div className="mt-1.5 text-xs leading-5 text-neutral-600">{sub}</div>
    </div>
  );
}

function TrendChart({ analytics }: { analytics: Analytics }) {
  const pts = analytics.trend;
  const W = 640;
  const H = 112;
  const padL = 48;
  const padR = 20;
  const padT = 26;
  const padB = 24;
  const iw = W - padL - padR;
  const ih = H - padT - padB;
  const x = (i: number) => padL + (pts.length === 1 ? iw / 2 : (i / (pts.length - 1)) * iw);
  const labelX = (i: number) => Math.min(Math.max(x(i), padL + 6), W - padR - 6);
  const y = (v: number) => padT + ih - (v / 11) * ih;
  const line = pts.map((p, i) => `${x(i)},${y(p.overall)}`).join(" ");
  const labelStep = Math.max(1, Math.ceil(pts.length / 7));
  const fmtDay = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });
  const firstDay = pts.length ? fmtDay(pts[0].date) : "";
  const lastDay = pts.length ? fmtDay(pts[pts.length - 1].date) : "";
  const range = firstDay === lastDay ? firstDay : `${firstDay} to ${lastDay}`;
  return (
    <div>
      <div>
        <h2 className="text-h2 font-medium">Score trend</h2>
        <p className="mt-0.5 text-xs leading-5 text-neutral-600">Overall score per session, numbered in the order you did them{range ? ` · ${range}` : ""}</p>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 w-full" role="img" aria-label="Overall score trend over time">
        {[0, 5, 10].map((g) => (
          <g key={g}>
            <line x1={padL} x2={W - padR} y1={y(g)} y2={y(g)} stroke="#e8e2d6" strokeWidth="1" />
            <text x={padL - 8} y={y(g) + 4} textAnchor="end" fontSize="12" fill="#756c5e">{g}</text>
          </g>
        ))}
        {pts.length > 1 && <polyline points={line} fill="none" stroke="#b3400a" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />}
        {pts.map((p, i) => (
          <g key={p.date + i}>
            <circle cx={x(i)} cy={y(p.overall)} r="4.5" fill="#b3400a" stroke="#fdfbf7" strokeWidth="2" />
            <text x={labelX(i)} y={y(p.overall) - 10} textAnchor="middle" fontSize="12" fontWeight="600" fill="#1f1b16" style={{ fontVariantNumeric: "tabular-nums" }}>
              {p.overall}
            </text>
            {(i % labelStep === 0 || i === pts.length - 1) && (
              <text x={labelX(i)} y={H - 8} textAnchor="middle" fontSize="12" fill="#756c5e">
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
    <div className="flex items-center gap-3 py-2.5">
      <span className="w-40 shrink-0 truncate text-sm text-neutral-700">{name}</span>
      <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-line">
        <div className={`h-full rounded-full ${scoreBarClass(average)}`} style={{ width: `${average * 10}%` }} />
      </div>
      <span className="tnum w-14 shrink-0 text-right text-sm font-semibold">{average}/10</span>
      <span className="w-24 shrink-0 whitespace-nowrap text-right text-xs text-neutral-600">{count} session{count === 1 ? "" : "s"}</span>
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
    <div className="min-h-dvh bg-paper">
      <TopNav active="progress" />
      <main className="mx-auto w-full max-w-7xl px-5 pb-5 sm:px-8">

      <div className="flex flex-wrap items-end justify-between gap-2 pt-8">
        <div>
          <h1 className="text-[32px] font-medium leading-tight tracking-tight">Your progress</h1>
          <p className="mt-1 text-sm text-neutral-600">Computed from the interviews stored in this browser. Nothing here is estimated.</p>
        </div>
      </div>

      {!analytics ? (
        <p className="pt-8 text-sm text-neutral-600">Loading your history...</p>
      ) : analytics.total === 0 ? (
        <div className="card card-pad mt-4 max-w-xl">
          <h2 className="text-h2 font-medium">No interviews yet</h2>
          <p className="mt-2 text-sm leading-6 text-neutral-600">
            Finish one interview and your scores, streak and topic averages appear here, computed from the sessions stored in
            this browser.
          </p>
          <Link href="/setup" className="btn btn-primary mt-4">Start your first interview</Link>
        </div>
      ) : (
        <>
          <div className="card card-pad mt-6">
            <div className="flex flex-wrap gap-x-10 gap-y-4">
              <Stat label="Interviews finished" value={String(analytics.total)} sub={`${analytics.technicalCount} technical, ${analytics.generalCount} live or resume`} />
              <Stat label="Average overall" value={`${analytics.averageOverall}/10`} sub="Across every session on this device" />
              <Stat label="Practice streak" value={`${analytics.streakDays} day${analytics.streakDays === 1 ? "" : "s"}`} sub={analytics.streakDays > 0 ? "Consecutive days with at least one session" : "Do a session today to start a streak"} />
              <Stat
                label="Strongest area"
                value={analytics.strongest ? `${analytics.strongest.average}/10` : "Not yet"}
                sub={analytics.strongest ? analytics.strongest.name : "Finish a session first"}
              />
            </div>
          </div>

          {!enough && (
            <div className="mt-4 rounded-lg border border-line2 bg-panel2 px-4 py-3" role="note">
              <p className="text-sm leading-6 text-neutral-700">
                You have {analytics.total} session{analytics.total === 1 ? "" : "s"} so far. Trends appear at 3 sessions, because
                averages from one or two swing too much to mean anything.
              </p>
            </div>
          )}

          <div className="mt-4 grid items-start gap-4 lg:grid-cols-2">
            <div className="card card-pad">
              {enough && <TrendChart analytics={analytics} />}
              <div className={enough ? "mt-3 border-t border-line pt-3" : ""}>
                <h2 className="text-h2 font-medium">This week</h2>
                <p className="mt-1 text-xs leading-4 text-neutral-600">Three sessions aimed at your weakest areas, picked from your own scores.</p>
                <ol className="mt-2 space-y-2.5">
                  {analytics.plan.map((item, i) => (
                    <li key={item.title} className="flex items-center gap-3">
                      <span className="tnum w-5 shrink-0 self-start pt-0.5 text-sm font-semibold text-neutral-500">{i + 1}</span>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold">{item.title}</div>
                        <p className="mt-0.5 text-sm leading-5 text-neutral-600">{item.reason}</p>
                      </div>
                      <Link href={item.href} className="btn btn-primary btn-sm shrink-0">Start</Link>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
            <div className="card card-pad">
              <h2 className="text-h2 font-medium">By scoring axis</h2>
              <div className="mt-1 divide-y divide-line">
                {analytics.axisAverages.map((a) => (
                  <AverageRow key={a.name} name={a.name} average={a.average} count={a.count} />
                ))}
              </div>
              <div className="mt-5 border-t border-line pt-5">
                <h2 className="text-h2 font-medium">By topic</h2>
                {analytics.topicAverages.length ? (
                  <div className="mt-1 divide-y divide-line">
                    {analytics.topicAverages.map((a) => (
                      <AverageRow key={a.name} name={a.name} average={a.average} count={a.count} />
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-sm leading-6 text-neutral-600">No technical sessions yet, so there are no topic scores. Topic averages appear after your first coding interview.</p>
                )}
                {analytics.weakest && (
                  <p className="mt-3 border-t border-line pt-3 text-sm leading-6 text-neutral-600">
                    Weakest right now: <span className="font-semibold text-neutral-900">{analytics.weakest.name}</span> at{" "}
                    <span className="tnum font-semibold text-neutral-900">{analytics.weakest.average}/10</span>.
                  </p>
                )}
              </div>
            </div>
          </div>
        </>
      )}
      <Footer />
      </main>
    </div>
  );
}
