import TopNav from "@/components/TopNav";
import SetupForm from "@/components/SetupForm";
import Footer from "@/components/Footer";

export default function SetupPage() {
  return (
    <div className="min-h-dvh bg-paper">
      <TopNav />
      <main className="mx-auto w-full max-w-7xl px-5 pb-5 sm:px-8">
        <header className="pt-8">
          <h1 className="text-[32px] font-medium leading-tight tracking-tight text-neutral-900">Set up your interview</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-600">
            Pick a mode, an interviewer and a difficulty, then start. There is no account and nothing to install.
          </p>
        </header>
        <div className="mt-6 max-w-[820px]">
          <SetupForm />
        </div>
        <Footer />
      </main>
    </div>
  );
}
