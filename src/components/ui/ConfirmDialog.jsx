import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  variant = "danger", // "danger" | "success" | "warning"
}) {
  const confirmButtonRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;
    const focusTimer = window.setTimeout(() => confirmButtonRef.current?.focus(), 50);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event) => {
      if (event.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      window.clearTimeout(focusTimer);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  const confirmColors =
    variant === "danger"
      ? "bg-error-container text-on-error-container hover:bg-error-container/80"
      : variant === "success"
      ? "bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/50 dark:text-green-300 dark:hover:bg-green-900/70"
      : variant === "warning"
      ? "bg-amber-400 text-primary hover:bg-amber-300 dark:bg-amber-500 dark:text-amber-950"
      : "bg-primary-container text-on-primary-container hover:bg-primary-container/80";

  const iconBg =
    variant === "danger"
      ? "bg-error-container text-error"
      : variant === "success"
      ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
      : variant === "warning"
      ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
      : "bg-primary-container text-primary";

  const iconName =
    variant === "danger" || variant === "warning" ? "warning" : variant === "success" ? "check_circle" : "help";

  return createPortal(
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center overflow-y-auto p-4"
      role="presentation"
    >
      <div
        className="absolute inset-0 bg-stone-900/30 backdrop-blur-sm"
        onClick={onCancel}
      ></div>
      <div
        className="relative my-auto max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl dark:bg-dark-surface sm:p-8"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-message"
      >
        <div className="flex items-start gap-4 mb-6">
          <div className={`p-3 rounded-full ${iconBg}`}>
            <span className="material-symbols-outlined text-2xl">{iconName}</span>
          </div>
          <div className="flex-1">
            <h3 id="confirm-dialog-title" className="font-epilogue text-lg font-semibold text-primary dark:text-white mb-2">
              {title}
            </h3>
            <p id="confirm-dialog-message" className="text-on-surface-variant dark:text-gray-300 font-worksans text-body-md">
              {message}
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-3">
          {variant !== "success" && (
            <button
              onClick={onCancel}
              className="px-5 py-2.5 rounded-full border border-outline-variant text-on-surface-variant dark:text-gray-300 font-space text-label-md hover:bg-stone-100 dark:hover:bg-white/10 transition-colors"
            >
              {cancelText}
            </button>
          )}
          <button
            ref={confirmButtonRef}
            onClick={onConfirm}
            className={`px-5 py-2.5 rounded-full font-space text-label-md transition-colors flex items-center gap-2 ${confirmColors}`}
          >
            <span className="material-symbols-outlined text-[18px]">
              {variant === "success" ? "check" : variant === "danger" ? "delete" : variant === "warning" ? "arrow_forward" : "check"}
            </span>
            {confirmText}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
