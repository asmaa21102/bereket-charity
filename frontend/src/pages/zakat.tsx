import { Container } from '@/components/layout';
import { Field, PageHeader } from '@/components/ui';
import { useI18n } from '@/i18n';
import { useCart } from '@/lib/cart';
import { money } from '@/lib/format';
import { useMeta } from '@/lib/meta';
import { AnimatePresence, motion } from 'framer-motion';
import { Calculator, CheckCircle2, Info } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const FIELDS = ['cash', 'bank', 'gold_grams', 'silver_grams', 'stocks', 'business', 'receivables', 'debts'] as const;
type Values = Record<(typeof FIELDS)[number], number>;

/** Zakat: 2.5 % of zakatable wealth held for a lunar year, if it reaches the nisab (85 g of gold). */
export default function Zakat() {
    const { t, lang } = useI18n();
    const meta = useMeta();
    const cart = useCart();
    const nav = useNavigate();
    const [v, setV] = useState<Values>({ cash: 0, bank: 0, gold_grams: 0, silver_grams: 0, stocks: 0, business: 0, receivables: 0, debts: 0 });
    const z = meta.zakat;
    const wealth = v.cash + v.bank + v.gold_grams * z.gold_price + v.silver_grams * z.silver_price + v.stocks + v.business + v.receivables - v.debts;
    const nisab = z.nisab_grams * z.gold_price;
    const due = wealth >= nisab ? Math.round(wealth * z.rate) : 0;

    return (
        <Container className="py-12">
            <PageHeader eyebrow={t('zakat.eyebrow')} title={t('zakat.title')} text={t('zakat.text')} />
            <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
                <div className="card grid gap-5 p-6 sm:grid-cols-2">
                    {FIELDS.map((f) => (
                        <Field key={f} label={t(`zakat.${f}` as never)} hint={f === 'gold_grams' ? t('zakat.price_hint', { price: money(z.gold_price, lang) }) : f === 'silver_grams' ? t('zakat.price_hint', { price: money(z.silver_price, lang) }) : f === 'debts' ? t('zakat.debts_hint') : undefined}>
                            <div className="relative">
                                <input type="number" min={0} inputMode="decimal" className="input pe-12" value={v[f] || ''} onChange={(e) => setV({ ...v, [f]: Math.max(0, Number(e.target.value)) })} placeholder="0" />
                                <span className="text-muted absolute inset-y-0 end-4 grid place-items-center text-xs font-semibold">{f.endsWith('grams') ? t('zakat.grams') : '₺'}</span>
                            </div>
                        </Field>
                    ))}
                    <p className="text-muted flex gap-2 text-xs leading-5 sm:col-span-2"><Info className="size-4 shrink-0" />{t('zakat.note')}</p>
                </div>
                <aside className="lg:sticky lg:top-24 lg:self-start">
                    <div className="bg-navy rounded-[var(--radius-card)] p-6 text-white shadow-[var(--shadow-lift)]">
                        <Calculator className="size-8 text-emerald-300" />
                        <div className="mt-4 space-y-2 text-sm text-white/80">
                            <div className="flex justify-between"><span>{t('zakat.total_wealth')}</span><span className="font-semibold text-white">{money(Math.max(0, wealth), lang)}</span></div>
                            <div className="flex justify-between"><span>{t('zakat.nisab')}</span><span className="font-semibold text-white">{money(nisab, lang)}</span></div>
                        </div>
                        <div className="mt-6 text-sm text-white/70">{t('zakat.due')}</div>
                        <AnimatePresence mode="wait">
                            <motion.div key={due} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="font-display text-4xl font-bold">{money(due, lang)}</motion.div>
                        </AnimatePresence>
                        <p className="mt-2 text-xs text-white/60">{wealth >= nisab ? t('zakat.above') : t('zakat.below')}</p>
                        <button
                            disabled={due < 10}
                            onClick={() => {
                                cart.add({ campaign_id: null, fund_type: 'zakat', amount: due, frequency: 'once', title: t('fund.zakat') });
                                nav('/checkout');
                            }}
                            className="btn btn-primary mt-6 w-full py-4"
                        >
                            <CheckCircle2 className="size-5" />
                            {t('zakat.pay')}
                        </button>
                    </div>
                </aside>
            </div>
        </Container>
    );
}
