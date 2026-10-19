import { Container } from '@/components/layout';
import { Pill } from '@/components/ui';
import { useI18n } from '@/i18n';
import { api } from '@/lib/api';
import { date, dateTime, money } from '@/lib/format';
import { motion } from 'framer-motion';
import { ArrowRight, CheckCircle2, Heart, Package, Receipt, ShoppingCart, Truck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

type Step = { stage: string; at: string; title: string | null; body?: string | null; image: string | null };
const ICON: Record<string, typeof Heart> = { received: Heart, purchased: ShoppingCart, delivered: Truck, update: Package };

export default function DonationPage() {
    const { id } = useParams();
    const { t, lang } = useI18n();
    const [d, setD] = useState<{ receipt_no: string; amount: number; fund_type: string; paid_at: string; card: string | null; order_id: number | null; units: number | null; unit_label: string | null; campaign: { slug: string; title: string } | null; gift: { name: string; token: string } | null; timeline: Step[] } | null>(null);
    useEffect(() => {
        api.get(`/donations/${id}`).then((r) => setD(r.data.donation));
    }, [id, lang]);
    if (!d) return <Container className="py-12"><div className="skeleton h-80 rounded-3xl" /></Container>;
    const delivered = d.timeline.some((s) => s.stage === 'delivered');
    return (
        <Container className="max-w-3xl py-12">
            <Link to="/wallet" className="text-muted text-sm"><ArrowRight className="me-1 inline size-4 ltr:rotate-180" />{t('nav.wallet')}</Link>
            <div className="card mt-4 p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold">{d.campaign?.title ?? t(`fund.${d.fund_type}` as never)}</h1>
                        <p className="text-muted mt-1 text-sm"><span dir="ltr" className="font-mono">{d.receipt_no}</span> · {dateTime(d.paid_at, lang)} · {d.card}</p>
                    </div>
                    <div className="font-display text-3xl font-bold">{money(d.amount, lang)}</div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                    <Pill tone="green">{t(`fund.${d.fund_type}` as never)}</Pill>
                    {d.units ? <Pill tone="sky">{t('thanks.units', { n: d.units, unit: d.unit_label ?? '' })}</Pill> : null}
                    {d.gift && <Pill tone="amber">{t('receipt.gift')}: {d.gift.name}</Pill>}
                </div>
                {d.order_id && <Link to={`/receipt/${d.order_id}`} className="btn btn-ghost mt-5"><Receipt className="size-4" />{t('thanks.view_receipt')}</Link>}
            </div>

            <h2 className="mt-10 mb-1 text-xl font-bold">{t('donation.where')}</h2>
            <p className="text-muted mb-6 text-sm">{delivered ? t('donation.where_done') : t('donation.where_wip')}</p>
            <ol className="border-line relative ms-4 border-s-2">
                {d.timeline.map((s, i) => {
                    const Icon = ICON[s.stage] ?? Package;
                    return (
                        <motion.li key={i} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.12 }} className="relative mb-8 ps-8">
                            <span className="bg-green absolute -start-[17px] top-0 grid size-8 place-items-center rounded-full text-white ring-4 ring-[var(--bg)]"><Icon className="size-4" /></span>
                            <p className="text-green text-xs font-semibold">{t(`stage.${s.stage}` as never)} · {date(s.at, lang)}</p>
                            <p className="mt-1 font-semibold">{s.title ?? t('donation.received')}</p>
                            {s.body && <p className="text-ink-2 mt-1 text-sm leading-7">{s.body}</p>}
                            {s.image && <img src={s.image} alt="" className="mt-3 max-h-64 rounded-2xl" />}
                        </motion.li>
                    );
                })}
                {!delivered && (
                    <li className="relative ps-8 opacity-50">
                        <span className="border-line bg-surface absolute -start-[17px] top-0 grid size-8 place-items-center rounded-full border-2"><CheckCircle2 className="text-muted size-4" /></span>
                        <p className="text-muted text-sm">{t('donation.next')}</p>
                    </li>
                )}
            </ol>
        </Container>
    );
}
