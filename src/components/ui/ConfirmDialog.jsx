import { useEffect, useState } from "react";

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  variant = "danger", // "danger" | "success"
}) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShow(true);
    } else {
      setShow(false);
    }
  }, [isOpen]);

  if (!isOpen && !show) return null;

  const handleCancel = () => {
    setShow(false);
    setTimeout(onCancel, 200);
  };

  const handleConfirm = () => {
    setShow(false);
    setTimeout(onConfirm, 200);
  };

  const confirmColors =
    variant === "danger"
      ? "bg-error-container text-on-error-container hover:bg-error-container/80"
      : variant === "success"
      ? "bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/50 dark:text-green-300 dark:hover:bg-green-900/70"
      : "bg-primary-container text-on-primary-container hover:bg-primary-container/80";

  const iconBg =
    variant === "danger"
      ? "bg-error-container text-error"
      : variant === "success"
      ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
      : "bg-primary-container text-primary";

  const iconName =
    variant === "danger" ? "warning" : variant === "success" ? "check_circle" : "help";

  return (
    <div
      className={`fixed inset-0 z-50 flex items-start pt-[20vh] justify-center transition-all duration-200 ${
        show ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
    >
      <div
        className="absolute inset-0 bg-stone-900/30 backdrop-blur-sm"
        onClick={handleCancel}
      ></div>
      <div
        className={`relative bg-white dark:bg-dark-surface rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl transition-all duration-200 ${
          show ? "scale-100 opacity-100" : "scale-95 opacity-0"
        }`}
      >
        <div className="flex items-start gap-4 mb-6">
          <div className={`p-3 rounded-full ${iconBg}`}>
            <span className="material-symbols-outlined text-2xl">{iconName}</span>
          </div>
          <div className="flex-1">
            <h3 className="font-epilogue text-lg font-semibold text-primary dark:text-white mb-2">
              {title}
            </h3>
            <p className="text-on-surface-variant dark:text-gray-300 font-worksans text-body-md">
              {message}
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-3">
          {variant !== "success" && (
            <button
              onClick={handleCancel}
              className="px-5 py-2.5 rounded-full border border-outline-variant text-on-surface-variant dark:text-gray-300 font-space text-label-md hover:bg-stone-100 dark:hover:bg-white/10 transition-colors"
            >
              {cancelText}
            </button>
          )}
          <button
            onClick={handleConfirm}
            className={`px-5 py-2.5 rounded-full font-space text-label-md transition-colors flex items-center gap-2 ${confirmColors}`}
          >
            <span className="material-symbols-outlined text-[18px]">
              {variant === "success" ? "check" : variant === "danger" ? "delete" : "check"}
            </span>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}