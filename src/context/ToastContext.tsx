import {
  createContext, useContext, useState, useCallback, type ReactNode,
} from 'react';
import type { Toast, ToastType } from '@/types';
import { generateId } from '@/utils/helpers';

// ─── Context ──────────────────────────────────────────────────────────────────

type ShowToast = (message: string, type?: ToastType) => void;
const ToastContext = createContext<ShowToast | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const show: ShowToast = useCallback((message, type = 'info') => {
    const id = generateId('toast');
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3800);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const ICONS: Record<ToastType, string> = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };

  return (
    <ToastContext.Provider value={show}>
      {children}

      <div className="toast-container">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.type}`} role="alert" aria-live="polite">
            <span style={{ fontSize: '1.25rem', flexShrink: 0 }}>{ICONS[t.type]}</span>
            <span style={{ fontSize: '.875rem', fontWeight: 500, flex: 1 }}>{t.message}</span>
            <button
              className="btn btn-ghost btn-icon-sm"
              aria-label="Dismiss"
              onClick={() => dismiss(t.id)}
              style={{ marginLeft: 'auto', color: '#64748b' }}
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useToast(): ShowToast {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be inside <ToastProvider>');
  return ctx;
}
