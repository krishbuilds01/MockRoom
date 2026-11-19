import Link from "next/link";
import Logo from "@/components/Logo";
import Footer from "@/components/Footer";

const topics = [
  { name: "URL shortener", note: "Short links, redirects, and what happens when one link goes viral." },
  { name: "Chat system", note: "Real-time messages, delivery guarantees, and history that loads instantly." },
  { name: "News feed", note: "Ranking, fan-out, and keeping feeds fresh without melting the database." },
  { name: "Rate limiter", note: "Protecting an API fairly, across many servers, without false blocks." },
  { name: "File storage", note: "Uploads, chunks, deduplication, and sharing links that stay safe." },
];

const rounds = [
  { title: "Requirements first", text: "Alex makes you pin down scale, users, and constraints before any boxes and arrows. Guessing the scale is where most candidates lose this round." },
  { title: "Design out loud", text: "You talk through the high-level design while Alex probes the weak joints: the hot key, the single point of failure, the table that outgrows its server." },
  { title: "Scored like the rest", text: "Feedback on the same four axes as every other room here, with the exact places your design would have broken." },
];

export default function SystemDesignPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col px-5">
      <nav className="flex h-16 shrink-0 items-center justify-between border-b border-line">
        <Logo />
        <div className="flex items-center gap-5 text-sm text-stone-600">
          <Link href="/" className="hover:text-stone-900">Home</Link>
          <Link href="/progress" className="hover:text-stone-900">Progress</Link>
        </div>
      </nav>

      <section className="grid items-start gap-6 pt-8 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <span className="badge badge-mid">Coming soon</span>
          <h1 className="mt-4 font-display text-display font-semibold">System design, interviewed properly.</h1>
          <p className="mt-4 max-w-[65ch] text-[15px] leading-7 text-stone-600">
            The third room is being built. It will run the way real design rounds run: you get a problem, you pin down the
            requirements, you design out loud, and Alex pushes on scale, storage, and failure cases until the design
            either holds or folds. No whiteboard theatre, no model answers handed over.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <button type="button" disabled className="btn btn-accent">Not open yet</button>
            <Link href="/" className="btn btn-ghost">Practice the live rooms meanwhile</Link>
          </div>
          <p className="mt-4 text-xs leading-5 text-stone-600">
            Coding and live interviews are open now and feed the same progress page. System design sessions will land in the same history when the room opens.
          </p>
          <div className="card card-pad mt-8">
            <h2 className="font-display text-h2 font-semibold">What you will practice</h2>
            <div className="mt-2 divide-y divide-line">
              {topics.map((t) => (
                <div key={t.name} className="flex flex-wrap items-baseline gap-x-3 py-2.5">
                  <span className="w-32 shrink-0 text-sm font-semibold">{t.name}</span>
                  <span className="min-w-0 flex-1 text-sm leading-6 text-stone-600">{t.note}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="card card-pad">
            <h2 className="font-display text-h2 font-semibold">How the round will run</h2>
            <div className="mt-3 space-y-4">
              {rounds.map((r) => (
                <div key={r.title}>
                  <div className="text-sm font-semibold">{r.title}</div>
                  <p className="mt-0.5 text-sm leading-6 text-stone-600">{r.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
      <div className="mt-auto">
        <Footer />
      </div>
    </main>
  );
}
