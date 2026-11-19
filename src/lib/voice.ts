export function splitSentences(text: string): string[] {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return [];
  const raw = clean.match(/[^.!?]+[.!?]+["']?|[^.!?]+$/g) || [clean];
  const out: string[] = [];
  let buf = "";
  for (const part of raw) {
    const s = part.trim();
    if (!s) continue;
    if ((buf + " " + s).trim().length <= 220) {
      buf = (buf + " " + s).trim();
    } else {
      if (buf) out.push(buf);
      buf = s;
    }
  }
  if (buf) out.push(buf);
  return out;
}

export function pickBestVoice(): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;
  const en = voices.filter((v) => v.lang && v.lang.toLowerCase().startsWith("en"));
  const pool = en.length ? en : voices;
  const score = (v: SpeechSynthesisVoice): number => {
    const n = v.name.toLowerCase();
    let s = 0;
    if (n.includes("google us english")) s += 100;
    if (n.includes("natural")) s += 60;
    if (n.includes("neural")) s += 55;
    if (n.includes("online")) s += 40;
    if (n.includes("google")) s += 30;
    if (v.lang === "en-US") s += 20;
    if (v.lang === "en-GB") s += 10;
    if (v.default) s += 5;
    return s;
  };
  return [...pool].sort((a, b) => score(b) - score(a))[0] || null;
}

export function speakSentenceBrowser(text: string): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      resolve();
      return;
    }
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      resolve();
    };
    try {
      const u = new SpeechSynthesisUtterance(text);
      const voice = pickBestVoice();
      if (voice) u.voice = voice;
      u.rate = 0.98;
      u.pitch = 1.0;
      u.onend = finish;
      u.onerror = finish;
      window.speechSynthesis.speak(u);
      const guard = Math.min(20000, 2500 + text.length * 110);
      setTimeout(finish, guard);
    } catch {
      finish();
    }
  });
}
