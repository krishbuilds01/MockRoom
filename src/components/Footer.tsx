export default function Footer() {
  return (
    <footer className="mt-8 shrink-0 border-t border-line py-4 text-xs leading-5 text-stone-600">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span>InterviewAI. Strict interview practice with Maya and Rohan.</span>
        <a
          href="https://github.com/krishbuilds01/ai-interview-platform"
          target="_blank"
          rel="noreferrer"
          className="font-medium text-stone-700 underline underline-offset-2 hover:text-stone-900"
        >
          GitHub
        </a>
      </div>
      <p className="mt-1 max-w-[65ch]">
        Your interviews and recordings stay in your browser. Nothing is uploaded, and there is no account to create.
      </p>
    </footer>
  );
}
