export interface SessionConfig {
  room: "general" | "technical";
  difficulty: string;
  topic?: string;
  company?: string;
  resume?: boolean;
  problemId?: string;
}

export interface StoredActiveSession {
  fingerprint: string;
  sessionId: string;
  hasContent: boolean;
  incompleteSaved: boolean;
}

export type MountPlan =
  | { action: "start" }
  | { action: "restore" }
  | { action: "save-stale-and-start" }
  | { action: "start-no-save" };

export function configFingerprint(cfg: SessionConfig): string {
  return [
    cfg.room,
    cfg.difficulty,
    cfg.topic || "",
    cfg.company || "any",
    cfg.resume ? "resume" : "standard",
    cfg.problemId || "",
  ].join("|");
}

export function planMount(stored: StoredActiveSession | null, currentFingerprint: string): MountPlan {
  if (!stored) return { action: "start" };
  if (stored.fingerprint === currentFingerprint) return { action: "restore" };
  if (stored.hasContent && !stored.incompleteSaved) return { action: "save-stale-and-start" };
  return { action: "start-no-save" };
}

const activeKey = (room: SessionConfig["room"]) => `interviewai-active-${room}`;
const freshKey = (room: SessionConfig["room"]) => `interviewai-fresh-${room}`;

function storage(): Storage | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export function readActiveSession(room: SessionConfig["room"]): StoredActiveSession | null {
  const s = storage();
  if (!s) return null;
  try {
    const raw = s.getItem(activeKey(room));
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const m = parsed as Partial<StoredActiveSession>;
    if (typeof m.fingerprint !== "string" || typeof m.sessionId !== "string") return null;
    return {
      fingerprint: m.fingerprint,
      sessionId: m.sessionId,
      hasContent: !!m.hasContent,
      incompleteSaved: !!m.incompleteSaved,
    };
  } catch {
    return null;
  }
}

export function writeActiveSession(room: SessionConfig["room"], meta: StoredActiveSession) {
  const s = storage();
  if (!s) return;
  try {
    s.setItem(activeKey(room), JSON.stringify(meta));
  } catch {}
}

export function clearActiveSession(room: SessionConfig["room"]) {
  const s = storage();
  if (!s) return;
  try {
    s.removeItem(activeKey(room));
  } catch {}
}

export function markActiveIncompleteSaved(room: SessionConfig["room"], sessionId: string) {
  const stored = readActiveSession(room);
  if (!stored || stored.sessionId !== sessionId) return;
  writeActiveSession(room, { ...stored, incompleteSaved: true });
}

export function markFreshStart(room: SessionConfig["room"]) {
  const s = storage();
  if (!s) return;
  try {
    s.setItem(freshKey(room), String(Date.now()));
  } catch {}
}

export function consumeFreshStart(room: SessionConfig["room"], sinceMs: number): boolean {
  const s = storage();
  if (!s) return false;
  try {
    const raw = s.getItem(freshKey(room));
    if (!raw) return false;
    const ts = Number(raw);
    if (!Number.isFinite(ts) || ts < sinceMs) return false;
    s.removeItem(freshKey(room));
    return true;
  } catch {
    return false;
  }
}
