import { CampaignArt, type CampaignCardData } from '@/components/campaign';
import { DonatePanel } from '@/components/donate-panel';
import { Container } from '@/components/layout';
import { CountUp, Empty, Pill, Progress } from '@/components/ui';
import { useI18n } from '@/i18n';
import { api } from '@/lib/api';
import { date, money, num, timeAgo } from '@/lib/format';
import { motion } from 'framer-motion';
import { CheckCircle2, Clock, Flame, Heart, Package, Share2, ShoppingCart, Truck, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

type Detail = CampaignCardData & { story: string | null; impact_levels: { amount: number; text: string }[]; spent: number; ends_on: string | null };
type Update = { id: number; stage: string; title: string; body: string | null; image: string | null; published_at: string };
const STAGE_ICON: Record<string, typeof Truck> = { received: Heart, purchased: ShoppingCart, delivered: Truck, update: Package };

export default function CampaignPage() {
    const { slug } = useParams();
    const { t, lang } = useI18n();
    const [data, setData] = useState<{ campaign: Detail; updates: Update[]; recent_donors: { name: string | null; amount: number; at: string }[] } | null>(null);
    const [missing, setMissing] = useState(false);
    useEffect(() => {
        api.get(`/campaigns/${slug}`).then((r) => setData(r.data)).catch(() => setMissing(true));
    }, [slug, lang]);

    if (missing) return <Container className="py-20"><Empty title={t('campaign.missing')} action={<Link to="/campaigns" className="btn btn-primary">{t('nav.campaigns')}</Link>} /></Container>;
    if (!data) return <Container className="py-12"><div className="skeleton aspect-[21/9] rounded-[2rem]" /></Container>;
    const c = data.campaign;
    const remaining = Math.max(0, c.goal - c.raised);
    const share = () => {
        const url = location.href;
        if (navigator.share) navigator.share({ title: c.title, url }).catch(() => {});
        else window.open(`https://wa.me/?text=${encodeURIComponent(c.title + ' ' + url)}`, '_blank');
    };

    return (
        <Container className="py-10">
            <div className="grid gap-8 lg:grid-cols-[1fr_400px]">
                <div className="min-w-0">
                    <motion.div layoutId={`art-${c.slug}`} className="relative aspect-[16/9] overflow-hidden rounded-[2rem]">
                        <CampaignArt category={c.category} cover={c.cover} big />
                        <div className="absolute start-4 top-4 flex gap-2">
                            <Pill tone="muted">{t(`cat.${c.category}` as never)}</Pill>
                            {c.is_urgent && c.status === 'active' && <Pill tone="amber"><Flame className="size-3.5" />{t('campaign.urgent')}</Pill>}
                        </div>
                    </motion.div>
                    <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-bold sm:text-4xl">{c.title}</h1>
                            <p className="text-ink-2 mt-2 text-lg leading-8">{c.summary}</p>
                        </div>
                        <button onClick={share} className="btn btn-ghost"><Share2 className="size-4" />{t('campaign.share')}</button>
                    </div>

                    <div className="card mt-6 grid gap-6 p-6 sm:grid-cols-3">
                        <div><div className="text-muted text-xs">{t('campaign.raised')}</div><div className="font-display text-2xl font-bold"><CountUp value={c.raised} format={(n) => money(n, lang)} /></div></div>
                        <div><div className="text-muted text-xs">{t('campaign.remaining')}</div><div className="font-display text-2xl font-bold">{money(remaining, lang)}</div></div>
                        <div><div className="text-muted text-xs">{t('campaign.donors')}</div><div className="font-display flex items-center gap-2 text-2xl font-bold"><Users className="text-green size-5" />{num(c.donors, lang)}</div></div>
                        <div className="sm:col-span-3">
                            <Progress value={c.progress} />
                            <div className="text-muted mt-2 flex justify-between text-xs"><span>{c.progress}%</span><span>{t('campaign.of_goal', { goal: money(c.goal, lang) })}</span></div>
                        </div>
                        {c.spent > 0 && <div className="bg-green-soft text-green-2 rounded-2xl px-4 py-3 text-sm sm:col-span-3"><CheckCircle2 className="me-1.5 inline size-4" />{t('campaign.spent', { amount: money(c.spent, lang) })}</div>}
                    </div>

                    {c.story && (
                        <section className="mt-10">
                            <h2 className="mb-3 text-2xl font-bold">{t('campaign.story')}</h2>
                            <div className="text-ink-2 space-y-4 leading-8 whitespace-pre-line">{c.story}</div>
                        </section>
                    )}

                    <section className="mt-10">
                        <h2 className="mb-1 text-2xl font-bold">{t('campaign.timeline')}</h2>
                        <p className="text-muted mb-6 text-sm">{t('campaign.timeline_p')}</p>
                        {data.updates.length === 0 ? <p className="text-muted text-sm">{t('campaign.no_updates')}</p> : (
                            <ol className="border-line relative ms-4 border-s-2">
                                {data.updates.map((u, i) => {
                                    const Icon = STAGE_ICON[u.stage] ?? Package;
                                    return (
                                        <motion.li key={u.id} initial={{ opacity: 0, x: 12 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.06 }} className="relative mb-8 ps-8">
                                            <span className="bg-green absolute -start-[17px] top-0 grid size-8 place-items-center rounded-full text-white ring-4 ring-[var(--bg)]"><Icon className="size-4" /></span>
                                            <p className="text-green text-xs font-semibold">{t(`stage.${u.stage}` as never)} · {date(u.published_at, lang)}</p>
                                            <h3 className="mt-1 font-bold">{u.title}</h3>
                                            {u.body && <p className="text-ink-2 mt-1 text-sm leading-7">{u.body}</p>}
                                            {u.image && <img src={u.image} alt="" className="mt-3 max-h-72 rounded-2xl object-cover" />}
                                        </motion.li>
                                    );
                                })}
                            </ol>
                        )}
                    </section>

                    {data.recent_donors.length > 0 && (
                        <section className="mt-6">
                            <h2 className="mb-4 text-xl font-bold">{t('campaign.recent')}</h2>
                            <ul className="grid gap-2 sm:grid-cols-2">
                                {data.recent_donors.map((d, i) => (
                                    <li key={i} className="card flex items-center gap-3 px-4 py-3 text-sm">
                                        <span className="bg-green-soft text-green grid size-9 place-items-center rounded-xl"><Heart className="size-4" /></span>
                                        <span className="font-semibold">{d.name ?? t('campaign.anonymous')}</span>
                                        <span className="text-muted ms-auto text-end text-xs">{money(d.amount, lang)}<br /><Clock className="inline size-3" /> {timeAgo(d.at, lang)}</span>
                                    </li>
                                ))}
                            </ul>
                        </section>
                    )}
                </div>

                <aside className="lg:sticky lg:top-24 lg:self-start">
                    <div className="card p-6 shadow-[var(--shadow-lift)]">
                        {c.status === 'active' ? (
                            <>
                                <h2 className="mb-4 text-xl font-bold">{t('campaign.donate_title')}</h2>
                                <DonatePanel campaign={c} levels={c.impact_levels} defaultAmount={c.unit_price ?? undefined} />
                            </>
                        ) : (
                            <div className="py-6 text-center">
                                <CheckCircle2 className="text-green mx-auto size-12" />
                                <h2 className="mt-3 text-xl font-bold">{t('campaign.done_title')}</h2>
                                <p className="text-muted mt-1 text-sm">{t('campaign.done_p')}</p>
                                <Link to="/campaigns" className="btn btn-primary mt-5">{t('campaign.other')}</Link>
                            </div>
                        )}
                    </div>
                </aside>
            </div>
        </Container>
    );
}
