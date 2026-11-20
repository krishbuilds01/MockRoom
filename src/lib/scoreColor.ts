export function scoreBarClass(score: number): string {
  if (score >= 7) return "bg-neutral-900";
  if (score >= 4) return "bg-neutral-400";
  return "bg-red-600";
}
