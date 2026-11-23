"use client";
import { useEffect, useRef, useState } from "react";
import { companies } from "@/lib/companies";

export default function CompanySelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const selectedIdx = Math.max(0, companies.findIndex((c) => c.id === value));
  const selected = companies[selectedIdx];

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open ]);

  useEffect(() => {
    if (open) listRef.current?.querySelector<HTMLElement>(`[data-idx="${activeIdx}"]`)?.scrollIntoView({ block: "nearest" });
  }, [open, activeIdx]);

  function openList() {
    setActiveIdx(selectedIdx);
    setOpen(true);
  }

  function choose(idx: number) {
    const c = companies[idx];
    if (!c) return;
    onChange(c.id);
    setOpen(false);
    btnRef.current?.focus();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openList();
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(companies.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(0, i - 1));
    } else if (e.key === "Home") {
      e.preventDefault();
      setActiveIdx(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setActiveIdx(companies.length - 1);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      choose(activeIdx);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      btnRef.current?.focus();
    } else if (e.key === "Tab") {
      setOpen(false);
    }
  }

  return (
    <div ref={rootRef} className="relative" onKeyDown={onKeyDown}>
      <button
        ref={btnRef}
        type="button"
        className="select flex h-10 w-full items-center justify-between gap-2 text-left"
        style={{ backgroundImage: "none" }}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Company"
        onClick={() => (open ? setOpen(false) : openList())}
      >
        <span className="truncate">{selected?.name}</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a7a7af" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={`shrink-0 transition-transform ${open ? "rotate-180" : ""}`}>
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {open && (
        <ul
          ref={listRef}
          role="listbox"
          aria-label="Company"
          className="absolute inset-x-0 top-full z-30 mt-1.5 max-h-64 overflow-y-auto rounded-[10px] border border-line bg-panel p-1"
        >
          {companies.map((c, i) => (
            <li
              key={c.id}
              data-idx={i}
              role="option"
              aria-selected={c.id === value}
              className={`flex cursor-pointer items-center justify-between gap-2 rounded-md px-2.5 py-2 text-sm ${
                i === activeIdx ? "bg-panel2 text-neutral-900" : "text-neutral-700"
              } ${c.id === value ? "font-semibold text-neutral-900" : ""}`}
              onMouseEnter={() => setActiveIdx(i)}
              onClick={() => choose(i)}
            >
              <span className="truncate">{c.name}</span>
              {c.id === value && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0 text-accent">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
