import Link from "next/link";

export default function Footer() {
  return (
    <footer className="mt-8 shrink-0 border-t border-line py-5 text-xs leading-5 text-neutral-600">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-sm font-semibold text-white">Mock Room</span>
        <nav className="flex items-center gap-5 text-[13px]" aria-label="Footer">
          <Link href="/problems" className="hover:text-white">Problems</Link>
          <Link href="/progress" className="hover:text-white">Progress</Link>
          <Link href="/system-design" className="hover:text-white">System design</Link>
        </nav>
      </div>
      <p className="mt-2">Built by Krishna. Free to use.</p>
    </footer>
  );
}
