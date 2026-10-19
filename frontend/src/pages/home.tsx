import { BigNumber, CampaignArt, CampaignCard, type CampaignCardData } from '@/components/campaign';
import { DonatePanel } from '@/components/donate-panel';
import { Container } from '@/components/layout';
import { Modal, SkeletonCards } from '@/components/ui';
import { useI18n } from '@/i18n';
import { api } from '@/lib/api';
import { timeAgo } from '@/lib/format';
import { motion } from 'framer-motion';
import { ArrowLeft, Calculator, CheckCircle2, HandCoins, HeartHandshake, PackageCheck, ShieldCheck, ShoppingCart, Truck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

type Story = { id: number; stage: string; title: string; body: string | null; image: string | null; published_at: string; campaign: { slug: string; title: string } | null };
type HomeData = { stats: { raised: number; donors: number; campaigns: number; delivered: number }; urgent: CampaignCardData[]; campaigns: CampaignCardData[]; stories: Story[] };

export default function Home() {
    const { t, lang } = useI18n();
    const [data, setData] = useState<HomeData | null>(null);
    const [story, setStory] = useState<Story | null>(null);
    useEffect(() => {
        api.get('/home').then((r) => setData(r.data));
    }, [lang]);
    const categoryOf = (s: Story) => data?.campaigns.concat(data.urgent).find((c) => c.slug === s.campaign?.slug)?.category ?? 'food';

    return (
        <>
            {/* hero */}
            <section className="relative overflow-hidden">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_60%_at_85%_10%,var(--green-soft),transparent_70%),radial-gradient(50%_50%_at_0%_100%,var(--sky-soft),transparent_70%)]" />
                <Container className="relative grid items-center gap-10 py-14 lg:grid-cols-[1.1fr_0.9fr] lg:py-20">
                    <div>
                        <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-green bg-green-soft mb-5 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold">
                            <ShieldCheck className="size-4" />
                            {t('home.badge')}
                        </motion.p>
                        <motion.h1 initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="text-4xl leading-tight font-bold tracking-tight sm:text-6xl">
                            {t('home.title1')}
                            <br />
                            <span className="bg-gradient-to-l from-emerald-400 to-[var(--navy)] bg-clip-text text-transparent">{t('home.title2')}</span>
                        </motion.h1>
                        <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="text-ink-2 mt-5 max-w-xl text-lg leading-8">
                            {t('home.lead')}
                        </motion.p>
                        <div className="mt-8 flex flex-wrap gap-3">
                            <Link to="/campaigns" className="btn btn-navy px-6 py-3.5">
                                {t('home.see_campaigns')}
                                <ArrowLeft className="size-4 ltr:rotate-180" />
                            </Link>
                            <Link to="/zakat" className="btn btn-ghost px-6 py-3.5">
                                <Calculator className="size-4" />
                                {t('nav.zakat')}
                            </Link>
                        </div>
                    </div>
                    <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="card p-6 shadow-[var(--shadow-lift)]">
                        <h2 className="mb-1 flex items-center gap-2 text-xl font-bold">
                            <HandCoins className="text-green size-5" />
                            {t('home.quick_title')}
                        </h2>
                        <p className="text-muted mb-5 text-sm">{t('home.quick_sub')}</p>
                        <DonatePanel />
                    </motion.div>
                </Container>
            </section>

            {/* stories */}
            {data && data.stories.length > 0 && (
                <Container className="-mt-4 mb-6">
                    <div className="flex gap-4 overflow-x-auto pb-2">
                        {data.stories.map((s, i) => (
                            <motion.button key={s.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }} onClick={() => setStory(s)} className="flex w-20 shrink-0 flex-col items-center gap-2">
                                <span className="rounded-full bg-gradient-to-tr from-amber-400 via-emerald-400 to-sky-500 p-[3px]">
                                    <span className="bg-bg block size-[68px] overflow-hidden rounded-full p-[3px]">
                                        <span className="block size-full overflow-hidden rounded-full">
                                            <CampaignArt category={categoryOf(s)} cover={s.image} />
                                        </span>
                                    </span>
                                </span>
                                <span className="text-ink-2 line-clamp-2 text-center text-[11px] leading-4">{s.campaign?.title}</span>
                            </motion.button>
                        ))}
                    </div>
                </Container>
            )}
            <Modal open={!!story} onClose={() => setStory(null)} title={story?.campaign?.title ?? ''}>
                {story && (
                    <div>
                        <div className="aspect-video overflow-hidden rounded-2xl">
                            <CampaignArt category={categoryOf(story)} cover={story.image} big />
                        </div>
                        <p className="text-green mt-4 text-sm font-semibold">{t(`stage.${story.stage}` as never)} · {timeAgo(story.published_at, lang)}</p>
                        <h3 className="mt-1 text-lg font-bold">{story.title}</h3>
                        {story.body && <p className="text-ink-2 mt-2 leading-7">{story.body}</p>}
                        {story.campaign && <Link to={`/campaigns/${story.campaign.slug}`} className="btn btn-primary mt-5 w-full">{t('home.support_this')}</Link>}
                    </div>
                )}
            </Modal>

            {/* stats */}
            <Container>
                <div className="bg-navy grid gap-8 rounded-[2rem] px-8 py-10 text-white sm:grid-cols-2 lg:grid-cols-4">
                    <BigNumber value={data?.stats.raised ?? 0} label={t('home.stat_raised')} money />
                    <BigNumber value={data?.stats.donors ?? 0} label={t('home.stat_donors')} />
                    <BigNumber value={data?.stats.campaigns ?? 0} label={t('home.stat_campaigns')} />
                    <BigNumber value={data?.stats.delivered ?? 0} label={t('home.stat_delivered')} money />
                </div>
            </Container>

            {/* urgent + campaigns */}
            <Container className="mt-16">
                <div className="mb-6 flex items-end justify-between gap-4">
                    <div>
                        <p className="text-amber mb-1 text-sm font-semibold">{t('home.urgent_eyebrow')}</p>
                        <h2 className="text-3xl font-bold">{t('home.campaigns_title')}</h2>
                    </div>
                    <Link to="/campaigns" className="text-green text-sm font-semibold">{t('common.see_all')}</Link>
                </div>
                {!data ? <SkeletonCards n={6} /> : (
                    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                        {[...data.urgent, ...data.campaigns.filter((c) => !c.is_urgent)].slice(0, 6).map((c, i) => <CampaignCard key={c.id} c={c} index={i} />)}
                    </div>
                )}
            </Container>

            {/* how impact is tracked */}
            <Container className="mt-20">
                <h2 className="text-center text-3xl font-bold">{t('home.how_title')}</h2>
                <p className="text-muted mx-auto mt-2 max-w-xl text-center">{t('home.how_sub')}</p>
                <div className="mt-10 grid gap-5 md:grid-cols-4">
                    {[
                        { icon: HeartHandshake, k: 'received' },
                        { icon: ShoppingCart, k: 'purchased' },
                        { icon: Truck, k: 'delivered' },
                        { icon: PackageCheck, k: 'report' },
                    ].map((s, i) => (
                        <motion.div key={s.k} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }} className="card relative p-6">
                            <span className="text-surface-2 font-display absolute end-5 top-4 text-4xl font-bold">0{i + 1}</span>
                            <span className="bg-green-soft text-green mb-4 grid size-12 place-items-center rounded-2xl"><s.icon className="size-6" /></span>
                            <h3 className="font-bold">{t(`home.how_${s.k}` as never)}</h3>
                            <p className="text-muted mt-1 text-sm leading-6">{t(`home.how_${s.k}_p` as never)}</p>
                        </motion.div>
                    ))}
                </div>
            </Container>

            {/* zakat + volunteer */}
            <Container className="mt-20 grid gap-5 md:grid-cols-2">
                <Link to="/zakat" className="card group flex items-center gap-5 p-7 transition hover:-translate-y-1">
                    <span className="bg-amber-soft text-amber grid size-14 shrink-0 place-items-center rounded-2xl"><Calculator className="size-7" /></span>
                    <div>
                        <h3 className="text-lg font-bold">{t('home.zakat_title')}</h3>
                        <p className="text-muted text-sm leading-6">{t('home.zakat_p')}</p>
                    </div>
                </Link>
                <Link to="/volunteer" className="card group flex items-center gap-5 p-7 transition hover:-translate-y-1">
                    <span className="bg-sky-soft text-sky grid size-14 shrink-0 place-items-center rounded-2xl"><CheckCircle2 className="size-7" /></span>
                    <div>
                        <h3 className="text-lg font-bold">{t('home.vol_title')}</h3>
                        <p className="text-muted text-sm leading-6">{t('home.vol_p')}</p>
                    </div>
                </Link>
            </Container>
        </>
    );
}
