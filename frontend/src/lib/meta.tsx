import { api } from '@/lib/api';
import { createContext, type ReactNode, useContext, useEffect, useState } from 'react';

export type Meta = {
    currency: string;
    fund_types: string[];
    categories: string[];
    aid_types: string[];
    doc_kinds: string[];
    skills: string[];
    presets: number[];
    zakat: { gold_price: number; silver_price: number; nisab_grams: number; rate: number };
    demo: boolean;
    admin_2fa: string;
};
const fallback: Meta = {
    currency: 'TRY',
    fund_types: ['zakat', 'sadaqah', 'jariyah', 'kaffarah', 'general'],
    categories: [],
    aid_types: ['medical', 'education', 'financial', 'rent'],
    doc_kinds: ['id', 'medical', 'income', 'other'],
    skills: [],
    presets: [100, 250, 500, 1000],
    zakat: { gold_price: 3100, silver_price: 38, nisab_grams: 85, rate: 0.025 },
    demo: true,
    admin_2fa: 'optional',
};
const MetaCtx = createContext<Meta>(fallback);

export function MetaProvider({ children }: { children: ReactNode }) {
    const [meta, setMeta] = useState<Meta>(fallback);
    useEffect(() => {
        api.get('/meta').then((r) => setMeta(r.data)).catch(() => {});
    }, []);
    return <MetaCtx.Provider value={meta}>{children}</MetaCtx.Provider>;
}
export const useMeta = () => useContext(MetaCtx);
