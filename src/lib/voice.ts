export function splitSentences(text: string): string[] {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return [];
  const raw = clean.match(/[^.!?]+[.!?]+["']?|[^.!?]+$/g) || [clean];
  return raw.map((s) => s.trim()).filter(Boolean);
}

const SHORT_FRAGMENT = 40;
const MAX_CHUNK = 280;

export function chunkForSpeech(text: string): string[] {
  const sentences = splitSentences(text);
  if (!sentences.length) return [];
  const merged: string[] = [];
  let carry = "";
  for (let i = 0; i < sentences.length; i++) {
    const s = (carry ? carry + " " : "") + sentences[i];
    carry = "";
    if (s.length < SHORT_FRAGMENT && i < sentences.length - 1) {
      carry = s;
      continue;
    }
    merged.push(s);
  }
  if (carry) {
    if (merged.length) merged[merged.length - 1] = merged[merged.length - 1] + " " + carry;
    else merged.push(carry);
  }
  const chunks: string[] = [];
  let buf = "";
  for (const s of merged) {
    if (buf && (buf + " " + s).length > MAX_CHUNK) {
      chunks.push(buf);
      buf = s;
    } else {
      buf = buf ? buf + " " + s : s;
    }
  }
  if (buf) chunks.push(buf);
  return chunks;
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
