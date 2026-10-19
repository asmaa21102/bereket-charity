import { useI18n } from '@/i18n';
import clsx from 'clsx';
import { AnimatePresence, motion, useInView, useMotionValue, useSpring } from 'framer-motion';
import { Inbox, X } from 'lucide-react';
import { type ReactNode, useEffect, useRef, useState } from 'react';

export const cx = clsx;

export function Field({ label, error, hint, children, required }: { label: string; error?: string; hint?: string; children: ReactNode; required?: boolean }) {
    return (
        <div>
            <span className="label">
                {label}
                {required && <span className="text-green ms-1">*</span>}
            </span>
            {children}
            {error ? <span className="text-rose mt-1 block text-xs">{error}</span> : hint ? <span className="text-muted mt-1 block text-xs">{hint}</span> : null}
        </div>
    );
}

/** Progress bar that fills in when it scrolls into view. */
export function Progress({ value, className, tone = 'green' }: { value: number; className?: string; tone?: 'green' | 'amber' }) {
    const ref = useRef<HTMLDivElement>(null);
    const inView = useInView(ref, { once: true });
    return (
        <div ref={ref} className={cx('bg-surface-2 h-2.5 overflow-hidden rounded-full', className)} role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}>
            <motion.div
                initial={{ width: 0 }}
                animate={{ width: inView ? `${Math.min(100, value)}%` : 0 }}
                transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
                className={cx('h-full rounded-full', tone === 'green' ? 'bg-gradient-to-l from-emerald-400 to-[var(--green)]' : 'bg-gradient-to-l from-amber-300 to-[var(--amber)]')}
            />
        </div>
    );
}

/** A number that counts up when it appears. */
export function CountUp({ value, format }: { value: number; format: (n: number) => string }) {
    const ref = useRef<HTMLSpanElement>(null);
    const inView = useInView(ref, { once: true });
    const mv = useMotionValue(0);
    const spring = useSpring(mv, { duration: 1400, bounce: 0 });
    const [shown, setShown] = useState(0);
    useEffect(() => {
        if (inView) mv.set(value);
    }, [inView, value, mv]);
    useEffect(() => spring.on('change', (v) => setShown(v)), [spring]);
    return <span ref={ref}>{format(Math.round(shown))}</span>;
}

export function Empty({ icon: Icon = Inbox, title, text, action }: { icon?: typeof Inbox; title: string; text?: string; action?: ReactNode }) {
    return (
        <div className="card flex flex-col items-center gap-3 px-6 py-14 text-center">
            <span className="bg-green-soft text-green grid size-14 place-items-center rounded-2xl">
                <Icon className="size-6" />
            </span>
            <h3 className="text-lg font-bold">{title}</h3>
            {text && <p className="text-muted max-w-md text-sm leading-6">{text}</p>}
            {action}
        </div>
    );
}

export function SkeletonCards({ n = 3 }: { n?: number }) {
    return (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: n }, (_, i) => (
                <div key={i} className="card overflow-hidden">
                    <div className="skeleton aspect-[16/10]" />
                    <div className="space-y-3 p-5">
                        <div className="skeleton h-4 w-3/4 rounded-lg" />
                        <div className="skeleton h-3 w-full rounded-lg" />
                        <div className="skeleton h-2.5 w-full rounded-full" />
                    </div>
                </div>
            ))}
        </div>
    );
}

export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
    const { t } = useI18n();
    useEffect(() => {
        if (!open) return;
        const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
        addEventListener('keydown', k);
        return () => removeEventListener('keydown', k);
    }, [open, onClose]);
    return (
        <AnimatePresence>
            {open && (
                <motion.div className="fixed inset-0 z-[90] grid place-items-center bg-black/50 p-4 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
                    <motion.div
                        role="dialog"
                        aria-modal="true"
                        aria-label={title}
                        initial={{ y: 24, scale: 0.97, opacity: 0 }}
                        animate={{ y: 0, scale: 1, opacity: 1 }}
                        exit={{ y: 12, opacity: 0 }}
                        className={cx('card max-h-[90vh] w-full overflow-y-auto p-6', wide ? 'max-w-3xl' : 'max-w-lg')}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="mb-4 flex items-start justify-between gap-4">
                            <h2 className="text-xl font-bold">{title}</h2>
                            <button onClick={onClose} aria-label={t('common.close')} className="text-muted hover:text-ink rounded-xl p-1">
                                <X className="size-5" />
                            </button>
                        </div>
                        {children}
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

export function Pill({ children, tone = 'muted' }: { children: ReactNode; tone?: 'green' | 'amber' | 'rose' | 'sky' | 'muted' | 'navy' }) {
    const tones = {
        green: 'bg-green-soft text-green-2',
        amber: 'bg-amber-soft text-amber',
        rose: 'bg-rose-soft text-rose',
        sky: 'bg-sky-soft text-sky',
        navy: 'bg-navy text-white',
        muted: 'bg-surface-2 text-ink-2',
    };
    return <span className={cx('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold', tones[tone])}>{children}</span>;
}

export function PageHeader({ eyebrow, title, text, children }: { eyebrow?: string; title: string; text?: string; children?: ReactNode }) {
    return (
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
                {eyebrow && <p className="text-green mb-2 text-sm font-semibold">{eyebrow}</p>}
                <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
                {text && <p className="text-muted mt-2 max-w-2xl leading-7">{text}</p>}
            </div>
            {children}
        </div>
    );
}
