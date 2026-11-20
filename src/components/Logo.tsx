import Link from "next/link";

export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" className="shrink-0">
      <rect width="32" height="32" rx="8" fill="#f2ede3" />
      <path d="M8.5 23 V9.5 L16 18 L23.5 9.5 V23" fill="none" stroke="#1f1b16" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5" aria-label="Mock Room home">
      <LogoMark />
      <span className="text-[17px] font-medium tracking-tight text-neutral-900">Mock Room</span>
    </Link>
  );
}
