import { motion } from 'framer-motion';

/** The tree of good: grows from a seed (0) to a tree full of fruit (5) as the donor gives. */
export function GoodTree({ stage }: { stage: number }) {
    const leaves = [
        [100, 70, 34], [70, 95, 28], [130, 95, 28], [55, 125, 24], [145, 125, 24], [100, 105, 30], [85, 60, 22], [118, 58, 22],
    ].slice(0, Math.max(0, stage * 2 - 1));
    const fruits = stage >= 4 ? [[80, 92], [122, 86], [100, 118], [62, 120], [140, 118]].slice(0, stage === 5 ? 5 : 3) : [];
    const trunk = [0, 40, 70, 95, 110, 120][stage];
    return (
        <svg viewBox="0 0 200 200" className="h-full w-full" role="img" aria-hidden>
            <ellipse cx="100" cy="186" rx="70" ry="10" fill="var(--green-soft)" />
            <path d="M40 186h120" stroke="var(--line)" strokeWidth="2" />
            {stage === 0 ? (
                <motion.circle cx="100" cy="180" r="7" fill="#a16207" initial={{ scale: 0 }} animate={{ scale: 1 }} />
            ) : (
                <motion.path d={`M100 186 C100 ${186 - trunk * 0.5} 98 ${186 - trunk * 0.8} 100 ${186 - trunk}`} stroke="#8b5a2b" strokeWidth={4 + stage * 1.6} strokeLinecap="round" fill="none" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1 }} />
            )}
            {leaves.map(([x, y, r], i) => (
                <motion.circle key={i} cx={x} cy={y + (5 - stage) * 14} r={r} fill={i % 2 ? '#34d399' : '#10b981'} opacity={0.92} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.5 + i * 0.08, type: 'spring' }} style={{ transformOrigin: `${x}px ${y + (5 - stage) * 14}px` }} />
            ))}
            {fruits.map(([x, y], i) => (
                <motion.circle key={i} cx={x} cy={y + (5 - stage) * 14} r="6" fill="#fbbf24" stroke="#d97706" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 1.2 + i * 0.1 }} />
            ))}
        </svg>
    );
}
