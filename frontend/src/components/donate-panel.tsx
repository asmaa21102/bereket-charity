import { cx } from '@/components/ui';
import { useI18n } from '@/i18n';
import { useAuth } from '@/lib/auth';
import { type FundType, type Frequency, useCart } from '@/lib/cart';
import { money } from '@/lib/format';
import { useMeta } from '@/lib/meta';
import { useToast } from '@/lib/toast';
import { AnimatePresence, motion } from 'framer-motion';
import { HeartHandshake, Repeat, ShoppingBag, Sparkles } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

type Level = { amount: number; text: string };
type Props = {
    campaign?: { id: number; slug: string; title: string; category: string; fund_types: string[]; unit_price: number | null; unit_label: string | null } | null;
    levels?: Level[];
    defaultFund?: FundType;
    defaultAmount?: number;
    lockFund?: boolean;
};

/** Amount, fund type and frequency → straight to checkout or into the cart. 3 taps max. */
export function DonatePanel({ campaign, levels = [], defaultFund, defaultAmount, lockFund }: Props) {
    const { t, lang } = useI18n();
    const meta = useMeta();
    const cart = useCart();
    const toast = useToast();
    const nav = useNavigate();
    const { user } = useAuth();
    const funds = (campaign?.fund_types ?? meta.fund_types) as FundType[];
    const [fund, setFund] = useState<FundType>(defaultFund && funds.includes(defaultFund) ? defaultFund : funds[0]);
    const [amount, setAmount] = useState<number>(defaultAmount ?? meta.presets[1] ?? 250);
    const [freq, setFreq] = useState<Frequency>('once');
    const max = Math.max(5000, ...levels.map((l) => l.amount * 1.5));

    // What this amount does: the highest impact level it reaches, or a unit count.
    const impact = useMemo(() => {
        const reached = [...levels].reverse().find((l) => amount >= l.amount);
        if (reached) return reached.text;
        if (campaign?.unit_price && amount >= campaign.unit_price) return t('donate.units', { n: Math.floor(amount / campaign.unit_price), unit: campaign.unit_label ?? '' });
        return null;
    }, [amount, levels, campaign, t]);

    const item = () => ({ campaign_id: campaign?.id ?? null, slug: campaign?.slug, title: campaign?.title, category: campaign?.category, fund_type: fund, amount, frequency: freq });
    const valid = amount >= 10;

    return (
        <div className="space-y-5">
            {!lockFund && funds.length > 1 && (
                <div>
                    <span className="label">{t('donate.fund')}</span>
                    <div className="flex flex-wrap gap-2">
                        {funds.map((f) => (
                            <button key={f} type="button" onClick={() => setFund(f)} className={cx('chip', fund === f && 'chip-on')} title={t(`fund.${f}.hint` as never)}>
                                {t(`fund.${f}` as never)}
                            </button>
                        ))}
                    </div>
                    <p className="text-muted mt-2 text-xs leading-5">{t(`fund.${fund}.hint` as never)}</p>
                </div>
            )}

            <div>
                <span className="label">{t('donate.amount')}</span>
                <div className="grid grid-cols-4 gap-2">
                    {meta.presets.map((p) => (
                        <motion.button
                            key={p}
                            type="button"
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setAmount(p)}
                            className={cx('rounded-2xl border py-3 text-sm font-bold transition', amount === p ? 'border-green bg-green text-white' : 'border-line hover:border-green')}
                        >
                            {money(p, lang)}
                        </motion.button>
                    ))}
                </div>
                <div className="mt-4">
                    <input
                        type="range"
                        min={10}
                        max={max}
                        step={10}
                        value={Math.min(amount, max)}
                        onChange={(e) => setAmount(Number(e.target.value))}
                        className="w-full accent-[var(--green)]"
                        aria-label={t('donate.amount')}
                    />
                    <div className="relative mt-2">
                        <input
                            type="number"
                            min={10}
                            inputMode="numeric"
                            value={amount || ''}
                            onChange={(e) => setAmount(Math.max(0, Math.round(Number(e.target.value))))}
                            className="input pe-14 text-lg font-bold"
                            aria-label={t('donate.custom')}
                        />
                        <span className="text-muted pointer-events-none absolute inset-y-0 end-4 grid place-items-center text-sm font-semibold">₺</span>
                    </div>
                </div>
                <AnimatePresence mode="wait">
                    {impact && (
                        <motion.div
                            key={impact}
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -6 }}
                            className="bg-green-soft text-green-2 mt-3 flex items-start gap-2 rounded-2xl px-4 py-3 text-sm font-medium"
                        >
                            <Sparkles className="mt-0.5 size-4 shrink-0" />
                            {impact}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <div>
                <span className="label">{t('donate.frequency')}</span>
                <div className="bg-surface-2 grid grid-cols-3 gap-1 rounded-2xl p-1">
                    {(['once', 'monthly', 'weekly'] as Frequency[]).map((f) => (
                        <button key={f} type="button" onClick={() => setFreq(f)} className={cx('rounded-xl py-2 text-sm font-semibold transition', freq === f ? 'bg-surface text-ink shadow' : 'text-muted')}>
                            {t(`freq.${f}` as never)}
                        </button>
                    ))}
                </div>
                {freq !== 'once' && (
                    <p className="text-muted mt-2 flex items-center gap-1.5 text-xs">
                        <Repeat className="size-3.5" />
                        {user ? t('donate.recurring_note') : t('donate.recurring_login')}
                    </p>
                )}
            </div>

            <div className="grid grid-cols-[1fr_auto] gap-2">
                <button
                    type="button"
                    disabled={!valid}
                    onClick={() => {
                        cart.add(item());
                        nav('/checkout');
                    }}
                    className="btn btn-primary py-4 text-base"
                >
                    <HeartHandshake className="size-5" />
                    {t('donate.now', { amount: money(amount || 0, lang) })}
                </button>
                <button
                    type="button"
                    disabled={!valid}
                    onClick={() => {
                        cart.add(item());
                        toast(t('cart.added'));
                    }}
                    className="btn btn-ghost px-4"
                    aria-label={t('cart.add')}
                    title={t('cart.add')}
                >
                    <ShoppingBag className="size-5" />
                </button>
            </div>
        </div>
    );
}
