import { CampaignArt } from '@/components/campaign';
import { Container } from '@/components/layout';
import { Empty, Field, PageHeader, cx } from '@/components/ui';
import { useI18n } from '@/i18n';
import { api, apiError, type FieldErrors } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { type Frequency, useCart } from '@/lib/cart';
import { money } from '@/lib/format';
import { useMeta } from '@/lib/meta';
import { AnimatePresence, motion } from 'framer-motion';
import { CreditCard, Gift, Info, LoaderCircle, Lock, ShieldCheck, ShoppingBag, Trash2 } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

type Method = 'card' | 'apple_pay' | 'google_pay';

const formatCard = (v: string) => v.replace(/\D/g, '').slice(0, 19).replace(/(\d{4})(?=\d)/g, '$1 ');
const formatExpiry = (v: string) => {
    const d = v.replace(/\D/g, '').slice(0, 4);
    return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
};
const brandOf = (n: string) => (n.startsWith('9792') ? 'Troy' : n.startsWith('4') ? 'Visa' : /^(5[1-5]|2[2-7])/.test(n) ? 'Mastercard' : /^3[47]/.test(n) ? 'Amex' : '');

export default function Checkout() {
    const { t, lang } = useI18n();
    const cart = useCart();
    const meta = useMeta();
    const { user } = useAuth();
    const nav = useNavigate();
    const [donor, setDonor] = useState({ name: '', email: '', anonymous: false });
    const [giftOn, setGiftOn] = useState(false);
    const [gift, setGift] = useState({ name: '', relation: 'parent', message: '' });
    const [method, setMethod] = useState<Method>('card');
    const [card, setCard] = useState({ number: '', expiry: '', cvc: '', holder: '' });
    const [errors, setErrors] = useState<FieldErrors>({});
    const [payError, setPayError] = useState('');
    const [busy, setBusy] = useState(false);

    if (cart.items.length === 0) {
        return (
            <Container className="py-16">
                <Empty icon={ShoppingBag} title={t('cart.empty')} text={t('cart.empty_p')} action={<Link to="/campaigns" className="btn btn-primary">{t('nav.campaigns')}</Link>} />
            </Container>
        );
    }

    const submit = async (e: FormEvent) => {
        e.preventDefault();
        setBusy(true);
        setErrors({});
        setPayError('');
        try {
            const { data } = await api.post('/checkout', {
                items: cart.items.map((i) => ({ campaign_id: i.campaign_id, fund_type: i.fund_type, amount: i.amount, frequency: i.frequency })),
                donor: user ? { anonymous: donor.anonymous } : donor,
                gift: giftOn ? gift : null,
                payment: method === 'card' ? { method, number: card.number, expiry: card.expiry, cvc: card.cvc } : { method },
            });
            cart.clear();
            sessionStorage.setItem('bk-last-order', JSON.stringify({ ...data, gift: giftOn ? gift.name : null }));
            nav(`/thank-you/${data.order_id}?token=${data.token}`);
        } catch (err) {
            const x = apiError(err);
            if (x.status === 402) setPayError(x.message);
            else {
                setErrors(x.fields);
                if (!Object.keys(x.fields).length) setPayError(x.message);
            }
        } finally {
            setBusy(false);
        }
    };

    const brand = brandOf(card.number.replace(/\s/g, ''));

    return (
        <Container className="py-12">
            <PageHeader eyebrow={t('checkout.eyebrow')} title={t('checkout.title')} />
            <form onSubmit={submit} className="grid gap-8 lg:grid-cols-[1fr_420px]">
                <div className="space-y-6">
                    {/* cart */}
                    <section className="card divide-line divide-y">
                        {cart.items.map((i) => (
                            <motion.div layout key={i.key} className="flex flex-wrap items-center gap-4 p-4">
                                <div className="size-14 shrink-0 overflow-hidden rounded-2xl"><CampaignArt category={i.category ?? 'food'} /></div>
                                <div className="min-w-40 flex-1">
                                    <div className="font-bold">{i.title ?? t(`fund.${i.fund_type}` as never)}</div>
                                    <div className="text-muted text-xs">{t(`fund.${i.fund_type}` as never)}</div>
                                </div>
                                <select value={i.frequency} onChange={(e) => cart.update(i.key, { frequency: e.target.value as Frequency })} className="input w-auto py-2" aria-label={t('donate.frequency')}>
                                    {(['once', 'monthly', 'weekly'] as Frequency[]).map((f) => <option key={f} value={f} disabled={f !== 'once' && !user}>{t(`freq.${f}` as never)}</option>)}
                                </select>
                                <div className="relative w-32">
                                    <input type="number" min={10} value={i.amount} onChange={(e) => cart.update(i.key, { amount: Math.max(0, Number(e.target.value)) })} className="input py-2 pe-8 font-bold" aria-label={t('donate.amount')} />
                                    <span className="text-muted absolute inset-y-0 end-3 grid place-items-center text-sm">₺</span>
                                </div>
                                <button type="button" onClick={() => cart.remove(i.key)} className="text-muted hover:text-rose rounded-xl p-2" aria-label={t('common.remove')}><Trash2 className="size-4" /></button>
                                {errors[`items.${cart.items.indexOf(i)}.fund_type`] && <p className="text-rose w-full text-xs">{errors[`items.${cart.items.indexOf(i)}.fund_type`]}</p>}
                            </motion.div>
                        ))}
                        <div className="flex items-center justify-between p-4">
                            <Link to="/campaigns" className="text-green text-sm font-semibold">+ {t('cart.add_more')}</Link>
                            <div className="text-lg font-bold">{money(cart.total, lang)}</div>
                        </div>
                    </section>

                    {/* donor */}
                    <section className="card space-y-4 p-6">
                        <h2 className="text-lg font-bold">{t('checkout.donor')}</h2>
                        {user ? (
                            <p className="text-ink-2 text-sm">{t('checkout.as', { name: user.name, email: user.email })}</p>
                        ) : (
                            <div className="grid gap-4 sm:grid-cols-2">
                                <Field label={t('auth.name')} error={errors['donor.name']} required><input className="input" value={donor.name} onChange={(e) => setDonor({ ...donor, name: e.target.value })} autoComplete="name" /></Field>
                                <Field label={t('auth.email')} error={errors['donor.email']} hint={t('checkout.email_hint')} required><input className="input" type="email" dir="ltr" value={donor.email} onChange={(e) => setDonor({ ...donor, email: e.target.value })} autoComplete="email" /></Field>
                                <p className="text-muted text-xs sm:col-span-2"><Link to="/login?next=/checkout" className="text-green font-semibold">{t('nav.login')}</Link> {t('checkout.login_benefit')}</p>
                            </div>
                        )}
                        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={donor.anonymous} onChange={(e) => setDonor({ ...donor, anonymous: e.target.checked })} className="accent-[var(--green)] size-4" />{t('checkout.anonymous')}</label>
                    </section>

                    {/* gift */}
                    <section className="card p-6">
                        <label className="flex cursor-pointer items-center gap-3">
                            <input type="checkbox" checked={giftOn} onChange={(e) => setGiftOn(e.target.checked)} className="accent-[var(--green)] size-5" />
                            <span className="bg-amber-soft text-amber grid size-10 place-items-center rounded-xl"><Gift className="size-5" /></span>
                            <span><span className="block font-bold">{t('gift.toggle')}</span><span className="text-muted text-sm">{t('gift.toggle_p')}</span></span>
                        </label>
                        <AnimatePresence>
                            {giftOn && (
                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                    <div className="grid gap-4 pt-5 sm:grid-cols-2">
                                        <Field label={t('gift.name')} error={errors['gift.name']} required><input className="input" value={gift.name} onChange={(e) => setGift({ ...gift, name: e.target.value })} /></Field>
                                        <Field label={t('gift.relation')}>
                                            <select className="input" value={gift.relation} onChange={(e) => setGift({ ...gift, relation: e.target.value })}>
                                                {['parent', 'friend', 'deceased', 'other'].map((r) => <option key={r} value={r}>{t(`gift.rel.${r}` as never)}</option>)}
                                            </select>
                                        </Field>
                                        <div className="sm:col-span-2"><Field label={t('gift.message')}><textarea className="input min-h-20" maxLength={300} value={gift.message} onChange={(e) => setGift({ ...gift, message: e.target.value })} /></Field></div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </section>
                </div>

                {/* payment */}
                <aside className="lg:sticky lg:top-24 lg:self-start">
                    <div className="card space-y-5 p-6 shadow-[var(--shadow-lift)]">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-bold">{t('checkout.payment')}</h2>
                            <span className="text-green flex items-center gap-1 text-xs font-semibold"><Lock className="size-3.5" />{t('checkout.secure')}</span>
                        </div>
                        {meta.demo && (
                            <div className="bg-amber-soft text-amber flex gap-2 rounded-2xl p-3 text-xs leading-5">
                                <Info className="mt-0.5 size-4 shrink-0" />
                                <span>{t('checkout.demo')} <code dir="ltr" className="font-mono font-bold">4242 4242 4242 4242</code> · {t('checkout.demo_decline')} <code dir="ltr" className="font-mono">4000 0000 0000 0002</code></span>
                            </div>
                        )}
                        <div className="grid grid-cols-3 gap-2">
                            {([['card', t('pay.card')], ['apple_pay', 'Apple Pay'], ['google_pay', 'Google Pay']] as [Method, string][]).map(([m, label]) => (
                                <button key={m} type="button" onClick={() => setMethod(m)} className={cx('rounded-2xl border px-2 py-3 text-xs font-bold transition', method === m ? 'border-green bg-green-soft text-green-2' : 'border-line')}>
                                    {m === 'card' && <CreditCard className="mx-auto mb-1 size-5" />}
                                    {label}
                                </button>
                            ))}
                        </div>
                        <AnimatePresence mode="wait">
                            {method === 'card' ? (
                                <motion.div key="card" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                                    <Field label={t('pay.number')} error={errors['payment.number']}>
                                        <div className="relative" dir="ltr">
                                            <input className="input pr-24 font-mono tracking-wider" dir="ltr" inputMode="numeric" autoComplete="cc-number" placeholder="0000 0000 0000 0000" value={card.number} onChange={(e) => setCard({ ...card, number: formatCard(e.target.value) })} />
                                            {brand && <span className="text-muted absolute inset-y-0 right-3 grid place-items-center text-xs font-bold">{brand}</span>}
                                        </div>
                                    </Field>
                                    <div className="grid grid-cols-2 gap-3">
                                        <Field label={t('pay.expiry')} error={errors['payment.expiry']}><input className="input font-mono" dir="ltr" inputMode="numeric" autoComplete="cc-exp" placeholder="MM/YY" value={card.expiry} onChange={(e) => setCard({ ...card, expiry: formatExpiry(e.target.value) })} /></Field>
                                        <Field label="CVC" error={errors['payment.cvc']}><input className="input font-mono" dir="ltr" inputMode="numeric" autoComplete="cc-csc" placeholder="123" maxLength={4} value={card.cvc} onChange={(e) => setCard({ ...card, cvc: e.target.value.replace(/\D/g, '') })} /></Field>
                                    </div>
                                </motion.div>
                            ) : (
                                <motion.p key="wallet" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-muted text-sm leading-6">{t('pay.wallet_note')}</motion.p>
                            )}
                        </AnimatePresence>
                        {payError && <div className="bg-rose-soft text-rose rounded-2xl p-3 text-sm">{payError}</div>}
                        <div className="border-line flex items-center justify-between border-t pt-4 text-lg font-bold"><span>{t('checkout.total')}</span><span>{money(cart.total, lang)}</span></div>
                        <button type="submit" disabled={busy || cart.total < 10} className={cx('btn w-full py-4 text-base', method === 'card' ? 'btn-primary' : 'bg-ink text-bg hover:opacity-90')}>
                            {busy ? <LoaderCircle className="size-5 animate-spin" /> : <ShieldCheck className="size-5" />}
                            {method === 'card' ? t('checkout.pay', { amount: money(cart.total, lang) }) : method === 'apple_pay' ? t('pay.with', { m: 'Apple Pay' }) : t('pay.with', { m: 'Google Pay' })}
                        </button>
                        <p className="text-muted text-center text-[11px] leading-5">{t('checkout.pci')}</p>
                    </div>
                </aside>
            </form>
        </Container>
    );
}
