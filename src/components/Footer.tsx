import Link from "next/link";

export default function Footer() {
  return (
    <footer className="mt-12 border-t border-line py-6 text-xs leading-5 text-neutral-600">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-sm font-medium text-neutral-900">Mock Room</span>
        <nav className="flex items-center gap-5 text-[13px]" aria-label="Footer">
          <Link href="/problems" className="transition-colors hover:text-neutral-900">Problems</Link>
          <Link href="/progress" className="transition-colors hover:text-neutral-900">Progress</Link>
          <Link href="/system-design" className="transition-colors hover:text-neutral-900">System design</Link>
        </nav>
      </div>
      <p className="mt-2">Built by Krishna. Free to use, just open it and practice.</p>
    </footer>
  );
}
