const DB_NAME = "interviewai-recordings";
const STORE_NAME = "recordings";
export const MAX_RECORDING_BYTES = 500 * 1024 * 1024;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveRecording(id: string, blob: Blob): Promise<boolean> {
  if (!blob || blob.size === 0 || blob.size > MAX_RECORDING_BYTES) return false;
  try {
    const db = await openDb();
    return await new Promise<boolean>((resolve) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).put(blob, id);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
  } catch {
    return false;
  }
}

export async function loadRecording(id: string): Promise<Blob | null> {
  try {
    const db = await openDb();
    return await new Promise<Blob | null>((resolve) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const req = tx.objectStore(STORE_NAME).get(id);
      req.onsuccess = () => resolve(req.result instanceof Blob ? req.result : null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function deleteRecording(id: string): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {}
}

export function recorderSupported(): boolean {
  return typeof window !== "undefined" && typeof MediaRecorder !== "undefined";
}

export class SessionRecorder {
  private recorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];

  get active(): boolean {
    return !!this.recorder && this.recorder.state !== "inactive";
  }

  start(stream: MediaStream): boolean {
    if (!recorderSupported() || this.active) return false;
    try {
      const mime = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"].find((m) =>
        MediaRecorder.isTypeSupported(m)
      );
      this.chunks = [];
      this.recorder = new MediaRecorder(stream, {
        ...(mime ? { mimeType: mime } : {}),
        videoBitsPerSecond: 800_000,
        audioBitsPerSecond: 64_000,
      });
      this.recorder.ondataavailable = (e) => {
        if (e.data && e.data.size) this.chunks.push(e.data);
      };
      this.recorder.start(1000);
      return true;
    } catch {
      this.recorder = null;
      return false;
    }
  }

  stop(): Promise<Blob | null> {
    const rec = this.recorder;
    if (!rec) return Promise.resolve(null);
    this.recorder = null;
    return new Promise((resolve) => {
      rec.onstop = () =>
        resolve(this.chunks.length ? new Blob(this.chunks, { type: rec.mimeType || "video/webm" }) : null);
      try {
        rec.stop();
      } catch {
        resolve(null);
      }
    });
  }
}
