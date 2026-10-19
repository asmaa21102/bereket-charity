import { CampaignArt } from '@/components/campaign';
import { Container } from '@/components/layout';
import { GoodTree } from '@/components/tree';
import { Empty, PageHeader, Pill, cx } from '@/components/ui';
import { useI18n } from '@/i18n';
import { api } from '@/lib/api';
import { date, money } from '@/lib/format';
import { useToast } from '@/lib/toast';
import { motion } from 'framer-motion';
import { Award, CalendarClock, Gift, Lock, Pause, Play, Receipt, Repeat, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

type Donation = { id: number; receipt_no: string; amount: number; fund_type: string; paid_at: string; card: string | null; campaign: { slug: string; title: string; cover: string | null; category: string } | null; gift: { name: string; token: string } | null; recurring: boolean };
type Plan = { id: number; amount: number; fund_type: string; frequency: string; status: string; next_charge_on: string; charges: number; card: string | null; campaign: { slug: string; title: string } | null };
type Wallet = { total: number; count: number; campaigns: number; by_fund: Record<string, number>; tree: number; badges: { badge: string; created_at: string }[]; all_badges: string[]; donations: Donation[]; recurring: Plan[] };

export default function WalletPage() {
    const { t, lang } = useI18n();
    const toast = useToast();
    const [w, setW] = useState<Wallet | null>(null);
    const load = useCallback(() => api.get('/wallet').then((r) => setW(r.data)), []);
    useEffect(() => {
        load();
    }, [load, lang]);
    const plan = async (p: Plan, status: string) => {
        if (status === 'cancelled' && !confirm(t('wallet.cancel_confirm'))) return;
        await api.patch(`/recurring/${p.id}`, { status });
        toast(t('common.saved'));
        load();
    };
    if (!w) return <Container className="py-12"><div className="skeleton h-72 rounded-[2rem]" /></Container>;
    const have = new Set(w.badges.map((b) => b.badge));

    return (
        <Container className="py-12">
            <PageHeader eyebrow={t('wallet.eyebrow')} title={t('wallet.title')} />
            <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
                <div className="card p-6 text-center">
                    <div className="mx-auto aspect-square max-w-60"><GoodTree stage={w.tree} /></div>
                    <h2 className="mt-2 text-lg font-bold">{t(`tree.${w.tree}` as never)}</h2>
                    <p className="text-muted text-sm">{t('tree.sub')}</p>
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                    {[[t('wallet.total'), money(w.total, lang)], [t('wallet.count'), String(w.count)], [t('wallet.campaigns'), String(w.campaigns)]].map(([l, v]) => (
                        <div key={l} className="card p-5"><div className="text-muted text-sm">{l}</div><div className="font-display mt-1 text-3xl font-bold">{v}</div></div>
                    ))}
                    <div className="card p-5 sm:col-span-3">
                        <h3 className="mb-3 font-bold">{t('wallet.by_fund')}</h3>
                        <div className="flex flex-wrap gap-2">
                            {Object.entries(w.by_fund).map(([f, v]) => <Pill key={f} tone="green">{t(`fund.${f}` as never)} · {money(Number(v), lang)}</Pill>)}
                        </div>
                        <h3 className="mt-5 mb-3 flex items-center gap-2 font-bold"><Award className="text-amber size-5" />{t('wallet.badges')}</h3>
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                            {w.all_badges.map((b, i) => (
                                <motion.div key={b} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.04 }} className={cx('rounded-2xl border p-3 text-center', have.has(b) ? 'border-amber/50 bg-amber-soft' : 'border-line opacity-55')}>
                                    <div className="text-2xl">{have.has(b) ? t(`badge.${b}.icon` as never) : <Lock className="text-muted mx-auto size-6" />}</div>
                                    <div className="mt-1 text-xs font-bold">{t(`badge.${b}` as never)}</div>
                                    <div className="text-muted mt-0.5 text-[11px] leading-4">{t(`badge.${b}.how` as never)}</div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <h2 className="mt-12 mb-4 flex items-center gap-2 text-2xl font-bold"><Repeat className="text-green size-6" />{t('wallet.recurring')}</h2>
            {w.recurring.length === 0 ? <p className="text-muted text-sm">{t('wallet.no_recurring')}</p> : (
                <div className="grid gap-3 md:grid-cols-2">
                    {w.recurring.map((p) => (
                        <div key={p.id} className="card flex flex-wrap items-center gap-4 p-5">
                            <div className="flex-1">
                                <div className="font-bold">{money(p.amount, lang)} · {t(`freq.${p.frequency}` as never)}</div>
                                <div className="text-muted text-sm">{p.campaign?.title ?? t(`fund.${p.fund_type}` as never)} · {p.card}</div>
                                <div className="text-muted mt-1 flex items-center gap-1 text-xs"><CalendarClock className="size-3.5" />{p.status === 'active' ? t('wallet.next', { date: date(p.next_charge_on, lang) }) : t('wallet.paused')} · {t('wallet.charges', { n: p.charges })}</div>
                            </div>
                            <div className="flex gap-2">
                                {p.status === 'active' ? <button onClick={() => plan(p, 'paused')} className="btn btn-ghost px-3 py-2"><Pause className="size-4" />{t('wallet.pause')}</button> : <button onClick={() => plan(p, 'active')} className="btn btn-ghost px-3 py-2"><Play className="size-4" />{t('wallet.resume')}</button>}
                                <button onClick={() => plan(p, 'cancelled')} className="btn btn-danger px-3 py-2" aria-label={t('wallet.cancel')}><X className="size-4" /></button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <h2 className="mt-12 mb-4 flex items-center gap-2 text-2xl font-bold"><Receipt className="text-green size-6" />{t('wallet.history')}</h2>
            {w.donations.length === 0 ? <Empty title={t('wallet.empty')} action={<Link to="/campaigns" className="btn btn-primary">{t('nav.campaigns')}</Link>} /> : (
                <div className="card divide-line divide-y">
                    {w.donations.map((d) => (
                        <Link key={d.id} to={`/wallet/donations/${d.id}`} className="hover:bg-surface-2 flex items-center gap-4 p-4 transition">
                            <div className="size-12 shrink-0 overflow-hidden rounded-xl"><CampaignArt category={d.campaign?.category ?? ""} cover={d.campaign?.cover} className="[&_svg]:size-6" /></div>
                            <div className="min-w-0 flex-1">
                                <div className="truncate font-semibold">{d.campaign?.title ?? t(`fund.${d.fund_type}` as never)}</div>
                                <div className="text-muted text-xs"><span dir="ltr" className="font-mono">{d.receipt_no}</span> · {date(d.paid_at, lang)}</div>
                            </div>
                            <div className="flex items-center gap-2">
                                {d.gift && <Pill tone="amber"><Gift className="size-3" />{d.gift.name}</Pill>}
                                {d.recurring && <Pill tone="sky"><Repeat className="size-3" /></Pill>}
                                <span className="font-bold">{money(d.amount, lang)}</span>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </Container>
    );
}
