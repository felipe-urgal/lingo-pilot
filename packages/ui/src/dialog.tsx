"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { IconButton } from "./button.js";

export type DialogProps = {
  actions?: ReactNode;
  children: ReactNode;
  description?: string;
  isOpen: boolean;
  onClose: () => void;
  title: string;
  variant?: "dialog" | "sheet";
};

function syncDialog(dialog: HTMLDialogElement, isOpen: boolean) {
  if (isOpen && !dialog.open) dialog.showModal();
  if (!isOpen && dialog.open) dialog.close();
}

export function Dialog({
  actions,
  children,
  description,
  isOpen,
  onClose,
  title,
  variant = "dialog",
}: DialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog) syncDialog(dialog, isOpen);
  }, [isOpen]);

  return (
    <dialog
      aria-describedby={description ? descriptionId : undefined}
      aria-labelledby={titleId}
      className={["lp-dialog", `lp-dialog--${variant}`].join(" ")}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      ref={dialogRef}
    >
      <div className="lp-dialog__header">
        <div>
          <h2 id={titleId}>{title}</h2>
          {description ? <p id={descriptionId}>{description}</p> : null}
        </div>
        <IconButton aria-label="Fechar" onClick={onClose}>
          <span aria-hidden="true">×</span>
        </IconButton>
      </div>
      <div className="lp-dialog__content">{children}</div>
      {actions ? <div className="lp-dialog__actions">{actions}</div> : null}
    </dialog>
  );
}

export type SheetProps = Omit<DialogProps, "variant">;

export function Sheet(props: SheetProps) {
  return <Dialog {...props} variant="sheet" />;
}
