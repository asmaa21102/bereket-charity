import { CampaignArt } from '@/components/campaign';
import { Container } from '@/components/layout';
import { Pill } from '@/components/ui';
import { useI18n } from '@/i18n';
import { api } from '@/lib/api';
import { dateTime, money } from '@/lib/format';
import confetti from 'canvas-confetti';
import { motion } from 'framer-motion';
import { Award, Copy, Gift, Heart, MessageCircle, Printer, Receipt, Repeat, Share2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';

export type OrderData = {
    id: number;
    status: string;
    total: number;
    payment_method: string;
    payment_ref: string;
    created_at: string;
    donor: { name: string | null; email: string | null };
    donations: {
        id: number;
        receipt_no: string;
        amount: number;
        fund_type: string;
        card: string | null;
        campaign: { slug: string; title: string; cover: string | null; category: string } | null;
        gift: { name: string; relation: string; message: string | null; token: string } | null;
        units: number | null;
        unit_label: string | null;
        recurring: boolean;
    }[];
};

export function useOrder() {
    const { id } = useParams();
    const [params] = useSearchParams();
    const { lang } = useI18n();
    const [order, setOrder] = useState<OrderData | null>(null);
    const [failed, setFailed] = useState(false);
    useEffect(() => {
        api.get(`/orders/${id}`, { params: { token: params.get('token') } }).then((r) => setOrder(r.data.order)).catch(() => setFailed(true));
    }, [id, params, lang]);
    return { order, failed, token: params.get('token') };
}

export default function ThankYou() {
    const { t, lang } = useI18n();
    const { order, token } = useOrder();
    const [copied, setCopied] = useState(false);
    const last = JSON.parse(sessionStorage.getItem('bk-last-order') ?? '{}');

    useEffect(() => {
        if (!order || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        const colors = ['#10b981', '#fbbf24', '#38bdf8', '#0b2545'];
        confetti({ particleCount: 120, spread: 80, origin: { y: 0.35 }, colors });
        const id = setTimeout(() => confetti({ particleCount: 60, spread: 110, origin: { y: 0.4 }, colors }), 450);
        return () => clearTimeout(id);
    }, [order]);

    if (!order) return <Container className="py-24"><div className="skeleton mx-auto h-64 max-w-xl rounded-[2rem]" /></Container>;
    const first = order.donations[0];
    const shareText = first.campaign ? t('thanks.share_text', { title: first.campaign.title }) : t('thanks.share_text_general');
    const shareUrl = first.campaign ? `${location.origin}/campaigns/${first.campaign.slug}` : location.origin;
    const giftUrl = first.gift ? `${location.origin}/gift/${first.gift.token}` : null;

    return (
        <Container className="py-14">
            <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="card mx-auto max-w-2xl overflow-hidden text-center shadow-[var(--shadow-lift)]">
                <div className="bg-navy relative px-6 py-10 text-white">
                    <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.2 }} className="bg-green mx-auto grid size-20 place-items-center rounded-full shadow-xl">
                        <Heart className="size-10 fill-white" />
                    </motion.span>
                    <h1 className="mt-5 text-3xl font-bold">{t('thanks.title', { name: order.donor.name?.split(' ')[0] ?? '' })}</h1>
                    <p className="mt-2 text-white/80">{t('thanks.sub', { amount: money(order.total, lang) })}</p>
                </div>
                <div className="space-y-4 p-6 text-start">
                    {order.donations.map((d) => (
                        <div key={d.id} className="bg-surface-2 flex items-center gap-4 rounded-2xl p-4">
                            <div className="size-14 shrink-0 overflow-hidden rounded-xl"><CampaignArt category={d.campaign?.category ?? ""} cover={d.campaign?.cover} className="[&_svg]:size-7" /></div>
                            <div className="min-w-0 flex-1">
                                <div className="font-bold">{d.campaign?.title ?? t(`fund.${d.fund_type}` as never)}</div>
                                <div className="text-muted text-xs">{t('thanks.receipt')} <span dir="ltr" className="font-mono">{d.receipt_no}</span> · {t(`fund.${d.fund_type}` as never)}</div>
                                {d.units ? <div className="text-green-2 mt-1 text-sm font-semibold">{t('thanks.units', { n: d.units, unit: d.unit_label ?? '' })}</div> : null}
                            </div>
                            <div className="text-end font-bold">{money(d.amount, lang)}{d.recurring && <div><Pill tone="sky"><Repeat className="size-3" />{t('thanks.recurring')}</Pill></div>}</div>
                        </div>
                    ))}

                    {last.badges?.length > 0 && (
                        <div className="bg-amber-soft text-amber flex items-center gap-3 rounded-2xl p-4">
                            <Award className="size-6" />
                            <div className="text-sm font-semibold">{t('thanks.badges')} {last.badges.map((b: string) => t(`badge.${b}` as never)).join(' · ')}</div>
                        </div>
                    )}

                    {giftUrl && (
                        <div className="border-amber/40 rounded-2xl border border-dashed p-4">
                            <div className="flex items-center gap-2 font-bold"><Gift className="text-amber size-5" />{t('thanks.gift_ready', { name: first.gift!.name })}</div>
                            <div className="mt-3 flex flex-wrap gap-2">
                                <Link to={`/gift/${first.gift!.token}`} className="btn btn-ghost px-4 py-2">{t('thanks.gift_open')}</Link>
                                <a className="btn btn-primary px-4 py-2" target="_blank" rel="noreferrer" href={`https://wa.me/?text=${encodeURIComponent(t('gift.whatsapp', { name: first.gift!.name }) + ' ' + giftUrl)}`}><MessageCircle className="size-4" />WhatsApp</a>
                            </div>
                        </div>
                    )}

                    <div>
                        <p className="mb-2 text-sm font-bold"><Share2 className="me-1 inline size-4" />{t('thanks.share')}</p>
                        <div className="flex flex-wrap gap-2">
                            <a className="btn btn-primary px-4 py-2" target="_blank" rel="noreferrer" href={`https://wa.me/?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`}><MessageCircle className="size-4" />WhatsApp</a>
                            <a className="btn btn-ghost px-4 py-2" target="_blank" rel="noreferrer" href={`https://x.com/intent/post?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`}>X</a>
                            <button className="btn btn-ghost px-4 py-2" onClick={() => navigator.clipboard.writeText(shareUrl).then(() => setCopied(true))}><Copy className="size-4" />{copied ? t('common.copied') : t('common.copy')}</button>
                        </div>
                    </div>

                    <div className="border-line flex flex-wrap gap-2 border-t pt-4">
                        <Link to={`/receipt/${order.id}?token=${token ?? ''}`} className="btn btn-navy"><Receipt className="size-4" />{t('thanks.view_receipt')}</Link>
                        <Link to="/wallet" className="btn btn-ghost">{t('nav.wallet')}</Link>
                        <Link to="/campaigns" className="btn btn-ghost">{t('thanks.more')}</Link>
                    </div>
                    <p className="text-muted text-xs">{t('thanks.email_note', { email: order.donor.email ?? '' })} · {dateTime(order.created_at, lang)}</p>
                </div>
            </motion.div>
        </Container>
    );
}

export function ReceiptPage() {
    const { t, lang } = useI18n();
    const { order, failed } = useOrder();
    if (failed) return <Container className="py-20 text-center">{t('receipt.missing')}</Container>;
    if (!order) return <Container className="py-24"><div className="skeleton mx-auto h-96 max-w-2xl rounded-3xl" /></Container>;
    return (
        <Container className="py-10">
            <div className="no-print mx-auto mb-4 flex max-w-2xl justify-end">
                <button onClick={() => print()} className="btn btn-navy"><Printer className="size-4" />{t('receipt.print')}</button>
            </div>
            {order.donations.map((d) => (
                <article key={d.id} className="card mx-auto mb-6 max-w-2xl p-8 print:shadow-none" style={{ breakAfter: 'page' }}>
                    <header className="border-line flex items-start justify-between border-b pb-5">
                        <div className="flex items-center gap-3"><img src="/app/favicon.svg" alt="" className="size-12" /><div><div className="font-display text-xl font-bold">{t('brand.name')}</div><div className="text-muted text-xs">{t('receipt.org')}</div></div></div>
                        <div className="text-end"><div className="text-muted text-xs">{t('receipt.number')}</div><div dir="ltr" className="font-mono text-lg font-bold">{d.receipt_no}</div></div>
                    </header>
                    <h1 className="mt-6 text-2xl font-bold">{t('receipt.title')}</h1>
                    <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
                        <div><dt className="text-muted">{t('receipt.donor')}</dt><dd className="font-semibold">{order.donor.name}</dd></div>
                        <div><dt className="text-muted">{t('receipt.date')}</dt><dd className="font-semibold">{dateTime(order.created_at, lang)}</dd></div>
                        <div><dt className="text-muted">{t('receipt.purpose')}</dt><dd className="font-semibold">{d.campaign?.title ?? t('receipt.general')}</dd></div>
                        <div><dt className="text-muted">{t('receipt.fund')}</dt><dd className="font-semibold">{t(`fund.${d.fund_type}` as never)}</dd></div>
                        <div><dt className="text-muted">{t('receipt.method')}</dt><dd className="font-semibold">{d.card ?? order.payment_method}</dd></div>
                        <div><dt className="text-muted">{t('receipt.ref')}</dt><dd dir="ltr" className="font-mono text-xs">{order.payment_ref}</dd></div>
                        {d.gift && <div className="col-span-2"><dt className="text-muted">{t('receipt.gift')}</dt><dd className="font-semibold">{d.gift.name}</dd></div>}
                    </dl>
                    <div className="bg-surface-2 mt-6 flex items-center justify-between rounded-2xl p-5"><span className="font-semibold">{t('receipt.amount')}</span><span className="font-display text-3xl font-bold">{money(d.amount, lang, 2)}</span></div>
                    <p className="text-muted mt-6 text-xs leading-5">{t('receipt.legal')}</p>
                </article>
            ))}
        </Container>
    );
}

export function GiftPage() {
    const { token } = useParams();
    const { t } = useI18n();
    const [gift, setGift] = useState<{ to: string; from: string | null; relation: string; message: string | null; campaign: { slug: string; title: string; cover: string | null } | null; fund_type: string; date: string } | null>(null);
    useEffect(() => {
        api.get(`/gifts/${token}`).then((r) => setGift(r.data.gift)).catch(() => {});
    }, [token]);
    if (!gift) return <Container className="py-24"><div className="skeleton mx-auto aspect-[4/5] max-w-md rounded-[2rem]" /></Container>;
    return (
        <Container className="py-14">
            <motion.div initial={{ rotateX: 20, opacity: 0, y: 30 }} animate={{ rotateX: 0, opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="mx-auto max-w-md overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#0b2545] via-[#13406b] to-[#047857] p-1 shadow-[var(--shadow-lift)]">
                <div className="rounded-[1.8rem] bg-[radial-gradient(circle_at_20%_0%,rgba(251,191,36,.35),transparent_60%)] p-8 text-center text-white">
                    <Gift className="mx-auto size-14 text-amber-300" />
                    <p className="mt-4 text-sm tracking-widest text-amber-200 uppercase">{t('gift.card_eyebrow')}</p>
                    <h1 className="mt-3 text-3xl font-bold">{t('gift.card_to', { name: gift.to })}</h1>
                    <p className="mt-4 leading-8 text-white/85">{gift.campaign ? t('gift.card_text', { campaign: gift.campaign.title }) : t('gift.card_text_general')}</p>
                    {gift.message && <blockquote className="mt-6 rounded-2xl bg-white/10 p-4 text-lg leading-8 italic">“{gift.message}”</blockquote>}
                    <p className="mt-6 text-sm text-white/70">{gift.from ? t('gift.card_from', { name: gift.from }) : t('gift.card_from_anon')} · {gift.date}</p>
                    {gift.campaign && <Link to={`/campaigns/${gift.campaign.slug}`} className="btn mt-6 bg-white text-[#0b2545] hover:bg-white/90">{t('gift.card_cta')}</Link>}
                </div>
            </motion.div>
        </Container>
    );
}
