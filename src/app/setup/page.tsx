import TopNav from "@/components/TopNav";
import SetupForm from "@/components/SetupForm";

export default function SetupPage() {
  return (
    <div className="min-h-dvh bg-paper">
      <TopNav />
      <main className="mx-auto w-full max-w-[640px] px-5 pb-4">
        <header className="pt-6">
          <h1 className="text-[22px] font-medium leading-tight tracking-tight text-neutral-900">Set up your interview</h1>
          <p className="mt-1 text-sm leading-5 text-neutral-600">
            Pick a mode, an interviewer and a difficulty, then start. Just open it and practice.
          </p>
        </header>
        <div className="mt-4">
          <SetupForm />
        </div>
      </main>
    </div>
  );
}
