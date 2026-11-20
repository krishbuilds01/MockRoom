import { Suspense } from "react";
import TopNav from "@/components/TopNav";
import ProblemBank from "@/components/ProblemBank";
import Footer from "@/components/Footer";
import { problemBank, type BankFormat } from "@/lib/problemBank";

type FormatFilter = BankFormat | "all";

async function BankSection({ searchParams }: { searchParams: Promise<{ format?: string }> }) {
  const sp = await searchParams;
  const initialFormat: FormatFilter =
    sp.format === "coding" || sp.format === "system-design" || sp.format === "general" ? sp.format : "all";
  return <ProblemBank initialFormat={initialFormat} />;
}

export default function ProblemsPage({ searchParams }: { searchParams: Promise<{ format?: string }> }) {
  return (
    <div className="min-h-dvh bg-ink">
      <TopNav active="problems" />
      <main className="mx-auto w-full max-w-[1340px] px-5 pb-5">
        <header className="pt-8">
          <h1 className="font-display text-4xl font-bold tracking-tight text-white">Interview problems</h1>
          <p className="tnum mt-2 text-sm text-neutral-600">
            {problemBank.length} problems · coding, system design and general rounds, with the companies that ask them.
          </p>
        </header>
        <Suspense fallback={<p className="pt-6 text-sm text-neutral-600">Loading problems...</p>}>
          <BankSection searchParams={searchParams} />
        </Suspense>
        <Footer />
      </main>
    </div>
  );
}
