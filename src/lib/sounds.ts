export const MIC_OPEN_NOTES = [620, 880];
export const MIC_OPEN_DURATION_MS = 140;
export const MIC_OPEN_PEAK_GAIN = 0.05;

let ctx: AudioContext | null = null;
let lastPlayedAt = 0;

export function playMicOpenSound(enabled: boolean): void {
  if (!enabled) return;
  if (typeof window === "undefined") return;
  const now = Date.now();
  if (now - lastPlayedAt < 400) return;
  lastPlayedAt = now;
  try {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    if (!ctx) ctx = new AC();
    if (ctx.state === "suspended") void ctx.resume();
    const t0 = ctx.currentTime;
    const total = MIC_OPEN_DURATION_MS / 1000;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(MIC_OPEN_PEAK_GAIN, t0 + 0.02);
    gain.gain.setValueAtTime(MIC_OPEN_PEAK_GAIN, t0 + total - 0.04);
    gain.gain.linearRampToValueAtTime(0, t0 + total);
    gain.connect(ctx.destination);
    const step = total / MIC_OPEN_NOTES.length;
    MIC_OPEN_NOTES.forEach((freq, i) => {
      const osc = ctx!.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, t0 + i * step);
      osc.connect(gain);
      osc.start(t0 + i * step);
      osc.stop(t0 + (i + 1) * step + 0.01);
    });
  } catch {}
}
