import Link from "next/link";
import { LogoMark } from "@/components/Logo";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col items-center justify-center px-5 text-center">
      <LogoMark size={40} />
      <h1 className="mt-5 font-display text-3xl font-semibold tracking-tight">Page not found</h1>
      <p className="mt-3 text-sm leading-6 text-stone-600">That page does not exist. Start a new interview from the home page.</p>
      <Link href="/" className="btn btn-primary mt-6">Back to home</Link>
    </main>
  );
}
