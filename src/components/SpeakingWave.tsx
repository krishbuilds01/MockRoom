export default function SpeakingWave({ speaking, label }: { speaking: boolean; label?: string }) {
  if (!speaking && !label) return null;
  return (
    <span className="inline-flex items-center gap-2" role="status" aria-label={speaking ? "Interviewer is speaking" : label}>
      <span className={`wave ${speaking ? "wave-on" : ""}`} aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
        <span />
      </span>
      {label && <span>{label}</span>}
    </span>
  );
}
