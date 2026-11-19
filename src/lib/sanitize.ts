const INSTRUCTION_PHRASES = [
  "introduce yourself as",
  "say this to the candidate",
  "do not add new questions",
  "do not add extra questions",
  "do not add any questions",
  "follow them immediately",
  "follow it immediately",
  "director instruction",
  "messages that start with",
  "keep every fact",
  "in your own natural words",
  "then ask:",
  "first question: say",
  "explain in two short sentences",
  "present the problem in one or two sentences",
  "continue naturally from this phase",
  "we reconnected mid-interview",
  "the candidate just joined",
  "current phase:",
];

function looksLikeInstruction(text: string): boolean {
  const l = text.toLowerCase();
  return INSTRUCTION_PHRASES.some((p) => l.includes(p));
}

export function sanitizeAiText(raw: string): string {
  if (!raw) return "";
  let t = raw.replace(/\s+/g, " ").trim();
  if (!t) return "";
  const hasMarker = /\[director|\[the candidate typed/i.test(t);
  if (!hasMarker) return t;

  const say = t.match(/say this[^:]{0,220}:\s*/i);
  if (say && say.index !== undefined) {
    const content = t.slice(say.index + say[0].length).trim();
    if (content && !looksLikeInstruction(content)) return sanitizeAiText(content);
    return "";
  }

  t = t.replace(/\[(director|the candidate typed)[^\]]*\]\s*:?\s*/gi, "").trim();
  if (!t) return "";
  if (looksLikeInstruction(t)) return "";
  if (/\[director|\[the candidate typed/i.test(t)) return "";
  return t;
}
