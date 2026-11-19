import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-2xl px-5 py-16 text-center">
      <h1 className="text-2xl font-bold">Page not found</h1>
      <p className="mt-3 text-sm text-neutral-400">That page does not exist. Start a new interview from the home page.</p>
      <Link href="/" className="mt-6 inline-block rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-black">Go home</Link>
    </main>
  );
}
