import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { cn } from '../utils/cn';

type ToastKind = 'success' | 'error' | 'info';

interface ToastEntry {
  id: number;
  kind: ToastKind;
  message: string;
}

interface ToastContextValue {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export const useToast = (): ToastContextValue => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
};

const DEFAULT_DURATION = 5000;

const ToastItem: React.FC<{ entry: ToastEntry; onClose: () => void }> = ({ entry, onClose }) => {
  useEffect(() => {
    const id = setTimeout(onClose, DEFAULT_DURATION);
    return () => clearTimeout(id);
  }, [onClose]);

  const role = entry.kind === 'error' ? 'alert' : 'status';

  return (
    <div
      role={role}
      aria-live={entry.kind === 'error' ? 'assertive' : 'polite'}
      className={cn(
        'pointer-events-auto rounded-lg shadow-lg border px-3 py-2 flex items-start gap-2 text-sm',
        entry.kind === 'success' && 'bg-sem-success/15 border-sem-success/40 text-sem-success',
        entry.kind === 'error' && 'bg-sem-danger/15 border-sem-danger/40 text-sem-danger',
        entry.kind === 'info' && 'bg-bg-elevated border-border-default text-text-primary',
      )}
    >
      <span className="flex-1 break-words">{entry.message}</span>
      <button
        type="button"
        onClick={onClose}
        aria-label="Fermer"
        className="text-text-muted hover:text-text-primary inline-flex items-center justify-center px-1"
      >
        <X size={16} aria-hidden />
      </button>
    </div>
  );
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastEntry[]>([]);

  const remove = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback((kind: ToastKind, message: string) => {
    setToasts((prev) => [...prev, { id: Date.now() + Math.random(), kind, message }]);
  }, []);

  const value: ToastContextValue = {
    success: (m) => push('success', m),
    error: (m) => push('error', m),
    info: (m) => push('info', m),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm pointer-events-none"
        aria-live="polite"
      >
        {toasts.map((t) => (
          <ToastItem key={t.id} entry={t} onClose={() => remove(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
};
