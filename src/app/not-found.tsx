import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-2xl px-5 py-16 text-center">
      <h1 className="font-display text-3xl font-semibold tracking-tight">Page not found</h1>
      <p className="mt-3 text-sm text-stone-600">That page does not exist. Start a new interview from the home page.</p>
      <Link href="/" className="btn btn-primary mt-6">Go home</Link>
    </main>
  );
}
