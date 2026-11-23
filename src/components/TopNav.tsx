import Link from "next/link";
import AuthButton from "@/components/AuthButton";
import Logo from "@/components/Logo";

const LINKS = [
  { href: "/problems", label: "Problems", key: "problems" },
  { href: "/progress", label: "Progress", key: "progress" },
  { href: "/system-design", label: "System design", key: "system-design" },
];

export default function TopNav({ active }: { active?: string }) {
  return (
    <header className="border-b border-line bg-paper">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-5 sm:px-8">
        <Logo />
        <nav className="hidden items-center gap-8 self-stretch sm:flex" aria-label="Main">
          {LINKS.map((l) => {
            const isActive = active === l.key;
            return (
              <Link
                key={l.key}
                href={l.href}
                aria-current={isActive ? "page" : undefined}
                className={`relative flex items-center text-sm transition-colors ${isActive ? "font-medium text-neutral-900" : "text-neutral-600 hover:text-neutral-900"}`}
              >
                {l.label}
                {isActive && <span className="absolute inset-x-0 bottom-0 h-[2px] bg-accent" aria-hidden="true" />}
              </Link>
            );
          })}
        </nav>
        <span className="flex items-center gap-3">
          <AuthButton />
          <Link href="/setup" className="btn btn-primary btn-sm">
            Start interview
          </Link>
        </span>
      </div>
      <nav className="mx-auto flex w-full max-w-7xl items-center gap-6 px-5 pb-3 sm:hidden" aria-label="Main mobile">
        {LINKS.map((l) => (
          <Link
            key={l.key}
            href={l.href}
            aria-current={active === l.key ? "page" : undefined}
            className={`text-sm ${active === l.key ? "font-medium text-neutral-900" : "text-neutral-600"}`}
          >
            {l.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
