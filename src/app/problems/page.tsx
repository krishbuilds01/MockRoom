import TopNav from "@/components/TopNav";
import ProblemBank from "@/components/ProblemBank";
import { problemBank, type BankFormat } from "@/lib/problemBank";

type FormatFilter = BankFormat | "all";

export default async function ProblemsPage({ searchParams }: { searchParams: Promise<{ format?: string }> }) {
  const sp = await searchParams;
  const initialFormat: FormatFilter =
    sp.format === "coding" || sp.format === "system-design" || sp.format === "general" ? sp.format : "all";

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-ink">
      <TopNav active="problems" />
      <main className="mx-auto flex min-h-0 w-full max-w-[1340px] flex-1 flex-col px-5 pb-5">
        <header className="shrink-0 pt-8">
          <h1 className="font-display text-4xl font-bold tracking-tight text-white">Interview problems</h1>
          <p className="tnum mt-2 text-sm text-neutral-600">
            {problemBank.length} problems · coding, system design and general rounds, with the companies that ask them.
          </p>
        </header>
        <ProblemBank initialFormat={initialFormat} />
      </main>
    </div>
  );
}
