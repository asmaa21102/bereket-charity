import { type Lang } from '@/i18n';

const locales: Record<Lang, string> = { ar: 'ar-u-nu-latn', en: 'en-GB', tr: 'tr-TR' };

export const money = (n: number, lang: Lang, digits = 0) =>
    new Intl.NumberFormat(locales[lang], { style: 'currency', currency: 'TRY', currencyDisplay: 'narrowSymbol', maximumFractionDigits: digits, minimumFractionDigits: digits }).format(n);

export const num = (n: number, lang: Lang) => new Intl.NumberFormat(locales[lang]).format(n);

export const date = (d: string | Date, lang: Lang, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }) =>
    new Intl.DateTimeFormat(locales[lang], opts).format(new Date(d));

export const dateTime = (d: string, lang: Lang) => date(d, lang, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

export function timeAgo(d: string, lang: Lang) {
    const rtf = new Intl.RelativeTimeFormat(locales[lang], { numeric: 'auto' });
    const s = (new Date(d).getTime() - Date.now()) / 1000;
    const a = Math.abs(s);
    if (a < 3600) return rtf.format(Math.round(s / 60), 'minute');
    if (a < 86400) return rtf.format(Math.round(s / 3600), 'hour');
    if (a < 86400 * 30) return rtf.format(Math.round(s / 86400), 'day');
    return date(d, lang);
}
