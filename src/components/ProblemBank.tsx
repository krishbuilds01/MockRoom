"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  bankCompanies,
  bankTopics,
  problemBank,
  slugify,
  startHref,
  type BankDifficulty,
  type BankFormat,
  type BankProblem,
  type BankStage,
} from "@/lib/problemBank";

type FormatFilter = BankFormat | "all";

const FORMAT_TABS: { key: FormatFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "coding", label: "Coding" },
  { key: "system-design", label: "System design" },
  { key: "general", label: "General" },
];

const DIFF_CLASS: Record<BankDifficulty, string> = {
  Easy: "diff-easy",
  Medium: "diff-medium",
  Hard: "diff-hard",
};

const STAGE_CLASS: Record<BankStage, string> = {
  "Phone Screen": "stage-phone",
  Onsite: "stage-onsite",
  OA: "stage-oa",
};

export function DifficultyPill({ difficulty }: { difficulty: BankDifficulty }) {
  return (
    <span className={`pill ${DIFF_CLASS[difficulty]}`}>
      <span className="pill-dot" aria-hidden="true" />
      {difficulty}
    </span>
  );
}

export function CompanyCell({ companies }: { companies: string[] }) {
  const shown = companies.slice(0, 2);
  const extra = companies.length - shown.length;
  return (
    <span className="flex items-center gap-2.5">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-tile text-xs font-medium text-neutral-900" aria-hidden="true">
        {companies[0]?.charAt(0)}
      </span>
      <span className="min-w-0">
        <span className="text-neutral-700">{shown.join(", ")}</span>
        {extra > 0 && <span className="tnum text-neutral-500"> +{extra}</span>}
      </span>
    </span>
  );
}

export default function ProblemBank({
  fixedFormat,
  initialFormat = "all",
  focusSlug,
  showShortcuts = true,
}: {
  fixedFormat?: BankFormat;
  initialFormat?: FormatFilter;
  focusSlug?: string;
  showShortcuts?: boolean;
}) {
  const [format, setFormat] = useState<FormatFilter>(fixedFormat ?? initialFormat);
  const [query, setQuery] = useState("");
  const [company, setCompany] = useState("All");
  const [difficulty, setDifficulty] = useState("All");
  const [topic, setTopic] = useState("All");
  const focusRef = useRef<HTMLTableRowElement | null>(null);

  const companies = useMemo(() => bankCompanies(), []);
  const topics = useMemo(() => bankTopics(fixedFormat ?? format), [fixedFormat, format]);

  const counts = useMemo(() => {
    const map = new Map<FormatFilter, number>();
    map.set("all", problemBank.length);
    for (const f of ["coding", "system-design", "general"] as BankFormat[]) {
      map.set(f, problemBank.filter((p) => p.format === f).length);
    }
    return map;
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return problemBank.filter((p) => {
      if (format !== "all" && p.format !== format) return false;
      if (company !== "All" && !p.companies.includes(company)) return false;
      if (format !== "system-design" && difficulty !== "All" && p.difficulty !== difficulty) return false;
      if (topic !== "All" && !p.topics.includes(topic)) return false;
      if (q && !p.title.toLowerCase().includes(q) && !p.companies.some((c) => c.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [format, query, company, difficulty, topic]);

  useEffect(() => {
    if (focusSlug && focusRef.current) {
      focusRef.current.scrollIntoView({ block: "center" });
    }
  }, [focusSlug, filtered]);

  function chooseFormat(f: FormatFilter) {
    setFormat(f);
    setTopic("All");
    if (f === "system-design") setDifficulty("All");
  }

  function resetFilters() {
    setQuery("");
    setCompany("All");
    setDifficulty("All");
    setTopic("All");
    if (!fixedFormat) setFormat("all");
  }

  const comingSoon = fixedFormat === "system-design";

  return (
    <div>
      {!fixedFormat && (
        <div className="mt-6 flex flex-wrap gap-x-7 gap-y-1 border-b border-line" role="tablist" aria-label="Problem format">
          {FORMAT_TABS.map((t) => {
            const isActive = format === t.key;
            return (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => chooseFormat(t.key)}
                className={`relative pb-3 text-[15px] transition-colors ${isActive ? "font-medium text-neutral-900" : "text-neutral-600 hover:text-neutral-900"}`}
              >
                {t.label} <span className="tnum font-mono text-[13px] text-neutral-500">{counts.get(t.key)}</span>
                {isActive && <span className="absolute inset-x-0 bottom-0 h-[2px] bg-accent" aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search problems or company"
          aria-label="Search problems or company"
          className="input min-w-[220px] flex-1"
        />
        <select value={company} onChange={(e) => setCompany(e.target.value)} className="select" aria-label="Filter by company">
          <option value="All">All companies</option>
          {companies.map((c) => (
            <option key={c.name} value={c.name}>{c.name}</option>
          ))}
        </select>
        {format !== "system-design" && (
          <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className="select" aria-label="Filter by difficulty">
            <option value="All">All difficulties</option>
            <option value="Easy">Easy</option>
            <option value="Medium">Medium</option>
            <option value="Hard">Hard</option>
          </select>
        )}
        <select value={topic} onChange={(e) => setTopic(e.target.value)} className="select" aria-label="Filter by topic">
          <option value="All">All topics</option>
          {topics.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      {showShortcuts && !fixedFormat && (
        <div className="mt-3 flex flex-wrap gap-2" aria-label="Company shortcuts">
          {companies.map((c) => {
            const isActive = company === c.name;
            return (
              <button
                key={c.name}
                type="button"
                aria-pressed={isActive}
                onClick={() => setCompany(isActive ? "All" : c.name)}
                className={`flex items-center gap-2 rounded-lg border py-1.5 pl-1.5 pr-3 text-[13px] font-medium transition-colors ${
                  isActive ? "border-accent bg-accent-soft text-accent" : "border-line bg-panel2 text-neutral-700 hover:border-line2"
                }`}
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-tile text-[11px] font-medium text-neutral-900" aria-hidden="true">
                  {c.name.charAt(0)}
                </span>
                {c.name}
                <span className="tnum font-mono text-neutral-500">{c.count}</span>
              </button>
            );
          })}
        </div>
      )}

      <p className="tnum mt-4 text-[13px] text-neutral-600" role="status">
        {filtered.length} matching problem{filtered.length === 1 ? "" : "s"}
      </p>

      <div className="card mt-2 overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-line text-left">
              <th scope="col" className="bg-panel px-4 py-3 text-xs font-medium text-neutral-500">Problem</th>
              <th scope="col" className="hidden bg-panel px-4 py-3 text-xs font-medium text-neutral-500 sm:table-cell">Company</th>
              <th scope="col" className="hidden bg-panel px-4 py-3 text-xs font-medium text-neutral-500 lg:table-cell">Stage</th>
              <th scope="col" className="hidden bg-panel px-4 py-3 text-xs font-medium text-neutral-500 md:table-cell">Topics</th>
              <th scope="col" className="bg-panel px-4 py-3 text-right text-xs font-medium text-neutral-500"><span className="sr-only">Action</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {filtered.map((p: BankProblem) => {
              const slug = slugify(p.title);
              const isFocus = focusSlug === slug;
              return (
                <tr key={slug} ref={isFocus ? focusRef : undefined} className={isFocus ? "bg-accent-soft" : "transition hover:bg-panel2"}>
                  <td className="px-4 py-3.5">
                    <div className="font-medium text-neutral-900">{p.title}</div>
                    {p.difficulty && (
                      <div className="mt-1.5">
                        <DifficultyPill difficulty={p.difficulty} />
                      </div>
                    )}
                  </td>
                  <td className="hidden px-4 py-3.5 sm:table-cell">
                    <CompanyCell companies={p.companies} />
                  </td>
                  <td className="hidden px-4 py-3.5 lg:table-cell">
                    <span className="flex flex-wrap gap-1.5">
                      {p.stage.map((s) => (
                        <span key={s} className={`pill ${STAGE_CLASS[s]}`}>{s}</span>
                      ))}
                    </span>
                  </td>
                  <td className="hidden px-4 py-3.5 md:table-cell">
                    <span className="flex flex-wrap items-center gap-1.5">
                      <span className="rounded-md border border-line bg-panel2 px-1.5 py-0.5 text-xs text-neutral-700">{p.topics[0]}</span>
                      {p.topics.length > 1 && <span className="tnum rounded-md border border-line bg-panel2 px-1.5 py-0.5 text-xs text-neutral-500">+{p.topics.length - 1}</span>}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    {comingSoon ? (
                      <span className="badge">Coming soon</span>
                    ) : (
                      <Link href={startHref(p)} className="text-sm font-medium text-accent hover:underline">
                        Start →
                      </Link>
                    )}
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center">
                  <p className="text-sm text-neutral-600">No problems match those filters.</p>
                  <button type="button" onClick={resetFilters} className="btn btn-secondary btn-sm mt-3">Clear filters</button>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
