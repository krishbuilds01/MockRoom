"use client";
import { useEffect, useRef, useState } from "react";

export default function Camera({
  small,
  audio,
  onStream,
  recording,
}: {
  small?: boolean;
  audio?: boolean;
  onStream?: (stream: MediaStream | null) => void;
  recording?: boolean;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const streamCbRef = useRef(onStream);
  useEffect(() => {
    streamCbRef.current = onStream;
  }, [onStream]);
  const [error, setError] = useState("");
  const [on, setOn] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let cancelled = false;
    async function start() {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error("unsupported");
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: !!audio });
        } catch {
          if (!audio) throw new Error("denied");
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        }
        if (cancelled) {
          stream?.getTracks().forEach((t) => t.stop());
          stream = null;
          return;
        }
        if (ref.current) {
          ref.current.srcObject = stream;
          setOn(true);
        }
        streamCbRef.current?.(stream);
      } catch {
        if (!cancelled) {
          setError("Camera is off or permission was denied. You can still continue the interview.");
          streamCbRef.current?.(null);
        }
      }
    }
    start();
    return () => {
      cancelled = true;
      stream?.getTracks().forEach((t) => t.stop());
      streamCbRef.current?.(null);
    };
  }, [audio, attempt]);

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-panel2">
      <video ref={ref} autoPlay playsInline muted className={`${on ? "" : "hidden"} ${small ? "h-36" : "h-52"} w-full -scale-x-100 bg-black object-cover`} />
      {!on && (
        <div className={`flex flex-col items-center justify-center gap-2 bg-panel2 p-4 text-center ${small ? "h-36" : "h-52"}`}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="text-neutral-500" aria-hidden="true">
            <path d="M10.5 5H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3.5" />
            <path d="M20 10.5 15 13V8l5 2.5Z" />
            <path d="m3 3 18 18" />
          </svg>
          <div className="text-sm font-semibold text-neutral-900">Camera is off</div>
          <p className="max-w-[30ch] text-xs leading-5 text-neutral-600">
            {error ? "You can continue without it, or turn it on for a more realistic session." : "Starting your camera. If a permission prompt appears, allow access."}
          </p>
          {error && (
            <button
              type="button"
              onClick={() => {
                setError("");
                setAttempt((a) => a + 1);
              }}
              className="btn btn-secondary btn-sm mt-1"
            >
              Turn on camera
            </button>
          )}
        </div>
      )}
      <div className="flex items-center gap-2 border-t border-line bg-panel px-3 py-2 text-xs text-neutral-600">
        {recording ? (
          <>
            <span className="dot dot-pulse bg-accent" />
            Recording
            <span className="text-neutral-600">For your self-review. Stored only in this browser.</span>
          </>
        ) : (
          <>
            <span className={`dot ${on ? "bg-[#16a34a]" : "bg-neutral-400"}`} />
            {on ? "Camera on" : "Camera off"}
            <span className="text-neutral-600">Preview only, nothing is recorded</span>
          </>
        )}
      </div>
    </div>
  );
}
