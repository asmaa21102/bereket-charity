import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from 'react';
import ar from './ar';
import en, { type Dict } from './en';
import tr from './tr';

export type Lang = 'ar' | 'en' | 'tr';
export type Key = keyof Dict;
export const LANGS: { code: Lang; label: string }[] = [
    { code: 'ar', label: 'العربية' },
    { code: 'en', label: 'English' },
    { code: 'tr', label: 'Türkçe' },
];
const DICTS: Record<Lang, Dict> = { ar, en, tr };

type Ctx = { lang: Lang; dir: 'rtl' | 'ltr'; t: (k: Key, p?: Record<string, string | number>) => string; setLang: (l: Lang) => void; has: (k: string) => k is Key };
const I18n = createContext<Ctx | null>(null);

const initial = (): Lang => {
    const fromUrl = new URLSearchParams(location.search).get('lang');
    if (fromUrl === 'ar' || fromUrl === 'en' || fromUrl === 'tr') return fromUrl;
    try {
        const s = localStorage.getItem('bk-lang');
        if (s === 'ar' || s === 'en' || s === 'tr') return s;
    } catch {
        /* storage blocked */
    }
    return 'ar';
};

export function I18nProvider({ children }: { children: ReactNode }) {
    const [lang, setLangState] = useState<Lang>(() => {
        const l = initial();
        document.documentElement.lang = l;
        document.documentElement.dir = l === 'ar' ? 'rtl' : 'ltr';
        return l;
    });
    const setLang = useCallback((l: Lang) => {
        try {
            localStorage.setItem('bk-lang', l);
        } catch {
            /* storage blocked */
        }
        document.documentElement.lang = l;
        document.documentElement.dir = l === 'ar' ? 'rtl' : 'ltr';
        setLangState(l);
    }, []);
    const value = useMemo<Ctx>(() => {
        const dict = DICTS[lang];
        return {
            lang,
            dir: lang === 'ar' ? 'rtl' : 'ltr',
            setLang,
            has: (k: string): k is Key => k in en,
            t: (k, p) => {
                let s: string = dict[k] ?? en[k] ?? k;
                if (p) s = s.replace(/\{(\w+)\}/g, (_, n) => String(p[n] ?? ''));
                return s;
            },
        };
    }, [lang, setLang]);
    return <I18n.Provider value={value}>{children}</I18n.Provider>;
}

export function useI18n() {
    const c = useContext(I18n);
    if (!c) throw new Error('I18nProvider missing');
    return c;
}
