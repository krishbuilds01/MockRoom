"use client";
import { useEffect, useRef } from "react";

export default function LeaveModal({
  open,
  onStay,
  onLeave,
}: {
  open: boolean;
  onStay: () => void;
  onLeave: () => void;
}) {
  const stayBtnRef = useRef<HTMLButtonElement>(null);
  const stayRef = useRef(onStay);

  useEffect(() => {
    stayRef.current = onStay;
  }, [onStay]);

  useEffect(() => {
    if (!open) return;
    stayBtnRef.current?.focus();
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") stayRef.current();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open ]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1f1b16]/60 p-4" onClick={onStay}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="leave-dialog-title"
        className="card card-hero card-pad w-full max-w-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="leave-dialog-title" className="font-display text-h2 font-semibold">
          Leave this interview?
        </h2>
        <p className="mt-2 text-sm leading-6 text-neutral-600">
          Your progress so far will be saved to your history as an incomplete session.
        </p>
        <div className="mt-6 flex gap-2">
          <button ref={stayBtnRef} type="button" onClick={onStay} className="btn btn-primary flex-1">
            Stay
          </button>
          <button type="button" onClick={onLeave} className="btn btn-ghost flex-1">
            Leave and save
          </button>
        </div>
      </div>
    </div>
  );
}
