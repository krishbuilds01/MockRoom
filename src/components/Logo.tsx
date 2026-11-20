import Link from "next/link";

export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" className="shrink-0">
      <rect width="32" height="32" rx="8" fill="#1d1d1f" />
      <path d="M10 23 L16 9 L22 23" fill="none" stroke="#ffffff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="12.6" y1="18.2" x2="19.4" y2="18.2" stroke="#ffffff" strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  );
}

export default function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5" aria-label="Mock Room home">
      <LogoMark />
      <span className="font-display text-lg font-semibold tracking-tight">Mock Room</span>
    </Link>
  );
}
