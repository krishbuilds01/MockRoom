import TopNav from "@/components/TopNav";
import ProblemBank from "@/components/ProblemBank";
import Footer from "@/components/Footer";
import { countByFormat } from "@/lib/problemBank";

export default function SystemDesignPage() {
  return (
    <div className="min-h-dvh bg-paper">
      <TopNav active="system-design" />
      <main className="mx-auto w-full max-w-7xl px-5 pb-5 sm:px-8">
        <header className="pt-8">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-[32px] font-medium leading-tight tracking-tight text-neutral-900">System design</h1>
            <span className="badge badge-mid">Coming soon</span>
          </div>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-600">
            Rooms open soon. The questions below are the real set they will use: {countByFormat("system-design")} design problems
            with the companies that ask them. When a room opens, you pin down requirements and scale first, then design out loud
            while Maya or Rohan pushes on storage, hot keys and failure cases, scored on the same four axes as the other rooms.
          </p>
        </header>
        <div className="mt-2">
          <ProblemBank fixedFormat="system-design" focusFromUrl showShortcuts={false} />
        </div>
        <Footer />
      </main>
    </div>
  );
}
