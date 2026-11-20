import Link from "next/link";
import Logo from "@/components/Logo";

const LINKS = [
  { href: "/problems", label: "Problems", key: "problems" },
  { href: "/progress", label: "Progress", key: "progress" },
  { href: "/system-design", label: "System design", key: "system-design" },
];

export default function TopNav({ active }: { active?: string }) {
  return (
    <header className="shrink-0 border-b border-line bg-ink">
      <div className="mx-auto flex h-20 w-full max-w-[1340px] items-center justify-between gap-4 px-5">
        <Logo />
        <nav className="hidden items-center gap-8 sm:flex" aria-label="Main">
          {LINKS.map((l) => {
            const isActive = active === l.key;
            return (
              <Link
                key={l.key}
                href={l.href}
                aria-current={isActive ? "page" : undefined}
                className={`relative py-2 text-sm ${isActive ? "font-semibold text-white" : "font-medium text-neutral-600 transition hover:text-white"}`}
              >
                {l.label}
                {isActive && <span className="absolute inset-x-0 -bottom-[21px] h-[2px] bg-accent" aria-hidden="true" />}
              </Link>
            );
          })}
        </nav>
        <Link href="/#setup" className="btn btn-primary btn-sm">
          Start interview
        </Link>
      </div>
    </header>
  );
}
