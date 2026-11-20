"use client";
import { useEffect, useRef } from "react";

export default function ConfirmModal({
  open,
  title,
  body,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const cancelBtnRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef(onCancel);

  useEffect(() => {
    cancelRef.current = onCancel;
  }, [onCancel]);

  useEffect(() => {
    if (!open) return;
    cancelBtnRef.current?.focus();
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") cancelRef.current();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open ]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/40 p-4" onClick={onCancel}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        className="card card-hero card-pad w-full max-w-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="confirm-dialog-title" className="font-display text-h2 font-semibold">
          {title}
        </h2>
        <p className="mt-2 text-sm leading-6 text-neutral-600">{body}</p>
        <div className="mt-6 flex gap-2">
          <button ref={cancelBtnRef} type="button" onClick={onCancel} className="btn btn-ghost flex-1">
            {cancelLabel}
          </button>
          <button type="button" onClick={onConfirm} className="btn btn-danger flex-1">
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
