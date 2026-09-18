import React, { createContext, useContext, useState, useCallback } from 'react';
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';

export type ToastType = 'error' | 'success' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
  durationMs: number;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType, durationMs?: number) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export const useToast = (): ToastContextValue => {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return {
      showToast: (msg) => console.warn('[Toast Fallback]', msg),
      removeToast: () => {},
    };
  }
  return ctx;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = 'error', durationMs: number = 5000) => {
      const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      setToasts((prev) => [...prev, { id, message, type, durationMs }]);

      if (durationMs > 0) {
        setTimeout(() => {
          removeToast(id);
        }, durationMs);
      }
    },
    [removeToast]
  );

  return (
    <ToastContext.Provider value={{ showToast, removeToast }}>
      {children}
      {/* Toast Notification Container */}
      <div className="fixed top-2.5 left-2.5 right-2.5 z-[9999] flex flex-col gap-1.5 pointer-events-none max-w-sm mx-auto font-sans">
        {toasts.map((toast) => {
          const typeStyles = {
            error: 'bg-zinc-950 border-red-500/30 text-zinc-100',
            success: 'bg-zinc-950 border-zinc-800 text-zinc-100',
            warning: 'bg-zinc-950 border-amber-500/30 text-zinc-100',
            info: 'bg-zinc-950 border-zinc-800 text-zinc-100',
          }[toast.type];

          const Icon = {
            error: AlertTriangle,
            success: CheckCircle2,
            warning: AlertTriangle,
            info: Info,
          }[toast.type];

          const iconColor = {
            error: 'text-red-400',
            success: 'text-zinc-200',
            warning: 'text-amber-400',
            info: 'text-zinc-400',
          }[toast.type];

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-start gap-2 p-2.5 rounded-lg border shadow-xl backdrop-blur-md transition-all duration-200 text-xs ${typeStyles}`}
            >
              <Icon className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${iconColor}`} />
              <div className="flex-1 font-medium leading-relaxed break-words text-[11px]">
                {toast.message}
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="p-0.5 rounded text-zinc-500 hover:text-zinc-200 transition-colors shrink-0"
                aria-label="Dismiss notification"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};
