"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { X } from "@/components/ui/icons";

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
};

/** Dialog bawaan browser (<dialog>): Esc menutup, fokus terkunci di dalamnya. */
export function Modal({ open, onClose, title, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose(); // klik area gelap
      }}
      aria-label={title}
      className="m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-[2rem] bg-white p-0 text-on-surface shadow-2xl backdrop:bg-inverted/50"
    >
      {open && (
        <div className="p-6 sm:p-8">
          <div className="flex items-start justify-between gap-4">
            <h2 className="text-2xl font-semibold">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup"
              className="grid size-9 place-items-center rounded-full text-on-surface-muted transition-colors hover:bg-surface-variant"
            >
              <X className="size-5" />
            </button>
          </div>
          <div className="mt-6">{children}</div>
        </div>
      )}
    </dialog>
  );
}