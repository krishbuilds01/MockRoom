"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Camera from "./Camera";

export default function CameraPopup({
  audio,
  onStream,
  recording,
}: {
  audio?: boolean;
  onStream?: (stream: MediaStream | null) => void;
  recording?: boolean;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const dragRef = useRef<{ dx: number; dy: number } | null>(null);

  const clamp = useCallback((x: number, y: number) => {
    const el = boxRef.current;
    const w = el?.offsetWidth ?? 240;
    const h = el?.offsetHeight ?? 180;
    return {
      x: Math.min(Math.max(8, x), Math.max(8, window.innerWidth - w - 8)),
      y: Math.min(Math.max(8, y), Math.max(8, window.innerHeight - h - 8)),
    };
  }, []);

  useEffect(() => {
    if (!pos) return;
    const onResize = () => setPos((p) => (p ? clamp(p.x, p.y) : p));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [pos, clamp]);

  function onPointerDown(e: React.PointerEvent) {
    if ((e.target as HTMLElement).closest("button")) return;
    const el = boxRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    dragRef.current = { dx: e.clientX - rect.left, dy: e.clientY - rect.top };
    setPos({ x: rect.left, y: rect.top });
    const move = (ev: PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;
      setPos(clamp(ev.clientX - d.dx, ev.clientY - d.dy));
    };
    const up = () => {
      dragRef.current = null;
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  return (
    <div
      ref={boxRef}
      onPointerDown={onPointerDown}
      role="region"
      aria-label="Camera preview. Drag to move it."
      title="Drag to move"
      className="fixed z-40 w-[240px] cursor-move touch-none select-none"
      style={pos ? { left: pos.x, top: pos.y } : { right: 16, bottom: 16 }}
    >
      <Camera small audio={audio} onStream={onStream} recording={recording} />
    </div>
  );
}
