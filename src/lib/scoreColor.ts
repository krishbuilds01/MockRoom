export function scoreBarClass(score: number): string {
  if (score >= 7) return "bg-accent";
  if (score >= 4) return "bg-amber-600";
  return "bg-red-600";
}
