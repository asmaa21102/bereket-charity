import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, CircleAlert } from 'lucide-react';
import { createContext, type ReactNode, useCallback, useContext, useState } from 'react';

type Toast = { id: number; text: string; kind: 'ok' | 'error' };
const ToastCtx = createContext<(text: string, kind?: 'ok' | 'error') => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);
    const push = useCallback((text: string, kind: 'ok' | 'error' = 'ok') => {
        const id = Date.now() + Math.random();
        setToasts((t) => [...t, { id, text, kind }]);
        setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3800);
    }, []);
    return (
        <ToastCtx.Provider value={push}>
            {children}
            <div className="pointer-events-none fixed inset-x-0 bottom-5 z-[100] flex flex-col items-center gap-2 px-4" role="status" aria-live="polite">
                <AnimatePresence>
                    {toasts.map((t) => (
                        <motion.div
                            key={t.id}
                            initial={{ opacity: 0, y: 16, scale: 0.96 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 8 }}
                            className="bg-surface border-line text-ink flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm shadow-[var(--shadow-lift)]"
                        >
                            {t.kind === 'ok' ? <CheckCircle2 className="text-green size-4" /> : <CircleAlert className="text-rose size-4" />}
                            {t.text}
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </ToastCtx.Provider>
    );
}
export const useToast = () => useContext(ToastCtx);
