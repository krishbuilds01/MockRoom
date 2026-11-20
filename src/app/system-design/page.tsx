import { Suspense } from "react";
import TopNav from "@/components/TopNav";
import ProblemBank from "@/components/ProblemBank";
import { countByFormat } from "@/lib/problemBank";

async function FocusBank({ searchParams }: { searchParams: Promise<{ focus?: string }> }) {
  const sp = await searchParams;
  return <ProblemBank fixedFormat="system-design" focusSlug={sp.focus} showShortcuts={false} />;
}

export default function SystemDesignPage({ searchParams }: { searchParams: Promise<{ focus?: string }> }) {
  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-ink">
      <TopNav active="system-design" />
      <main className="mx-auto flex min-h-0 w-full max-w-[1340px] flex-1 flex-col px-5 pb-5">
        <header className="shrink-0 pt-8">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-display text-4xl font-bold tracking-tight text-white">System design</h1>
            <span className="badge badge-mid">Coming soon</span>
          </div>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-600">
            Rooms open soon. The questions below are the real set they will use: {countByFormat("system-design")} design problems
            with the companies that ask them. When a room opens, you pin down requirements and scale first, then design out loud
            while Maya or Rohan pushes on storage, hot keys and failure cases, scored on the same four axes as the other rooms.
          </p>
        </header>
        <div className="mt-2 flex min-h-0 flex-1 flex-col">
          <Suspense fallback={<p className="pt-6 text-sm text-neutral-600">Loading problems...</p>}>
            <FocusBank searchParams={searchParams} />
          </Suspense>
        </div>
      </main>
    </div>
  );
}
