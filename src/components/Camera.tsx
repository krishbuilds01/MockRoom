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
  }, [audio]);

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-black">
      {error ? (
        <div className="flex h-36 items-center justify-center bg-panel2 p-4 text-center text-xs leading-5 text-stone-600">{error}</div>
      ) : (
        <video ref={ref} autoPlay playsInline muted className={`${small ? "h-36" : "h-52"} w-full -scale-x-100 object-cover`} />
      )}
      <div className="flex items-center gap-2 border-t border-line bg-panel px-3 py-2 text-xs text-stone-600">
        {recording ? (
          <>
            <span className="dot dot-pulse bg-red-500" />
            Recording
            <span className="text-stone-600">For your self-review. Stored only in this browser.</span>
          </>
        ) : (
          <>
            <span className={`dot ${on ? "dot-pulse bg-emerald-600" : "bg-red-500"}`} />
            {on ? "Camera on" : "Camera off"}
            <span className="text-stone-600">Preview only, nothing is recorded</span>
          </>
        )}
      </div>
    </div>
  );
}
