import { loadHistory } from "./analytics";
import type { SessionRecord } from "./interviewer";

const HISTORY_KEY = "interviewai-history";
const HISTORY_CAP = 20;

export function pushSession(rec: SessionRecord) {
  try {
    void fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(rec),
      keepalive: true,
    }).catch(() => {});
  } catch {}
}

export async function mergeServerHistory(): Promise<SessionRecord[] | null> {
  let server: unknown;
  try {
    const res = await fetch("/api/sessions");
    if (!res.ok) return null;
    server = await res.json();
  } catch {
    return null;
  }
  if (!Array.isArray(server)) return null;

  const local = loadHistory();
  const byId = new Map<string, SessionRecord>();
  for (const rec of local) byId.set(rec.id, rec);
  const serverIds = new Set<string>();
  for (const raw of server) {
    if (!raw || typeof raw !== "object") continue;
    const rec = raw as SessionRecord;
    if (typeof rec.id !== "string" || typeof rec.date !== "string" || !rec.scores) continue;
    serverIds.add(rec.id);
    byId.set(rec.id, rec);
  }
  for (const rec of local) {
    if (!serverIds.has(rec.id)) pushSession(rec);
  }

  const merged = [...byId.values()]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, HISTORY_CAP);
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(merged));
  } catch {}
  return merged;
}
