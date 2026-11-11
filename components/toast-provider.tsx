"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { Check } from "lucide-react";

type Toast = { id: number; message: string };
const ToastContext = createContext<(message: string) => void>(() => {});

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const showToast = useCallback((message: string) => {
    const id = Date.now() + Math.random();
    setToasts((current) => [...current, { id, message }]);
    window.setTimeout(() => setToasts((current) => current.filter((toast) => toast.id !== id)), 2800);
  }, []);
  return <ToastContext.Provider value={showToast}>
    {children}
    <div className="toast-region" aria-live="polite" aria-atomic="false">
      {toasts.map((toast) => <div className="toast" key={toast.id}><Check size={15} />{toast.message}</div>)}
    </div>
  </ToastContext.Provider>;
}

export const useToast = () => useContext(ToastContext);
