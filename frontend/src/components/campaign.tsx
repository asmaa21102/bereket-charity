import { CountUp, Pill, Progress, cx } from '@/components/ui';
import { useI18n } from '@/i18n';
import { money, num } from '@/lib/format';
import { motion } from 'framer-motion';
import { BookOpen, Droplets, Flame, HeartHandshake, HeartPulse, Home, Siren, Snowflake, Users, Utensils, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';

export type CampaignCardData = {
    id: number;
    slug: string;
    category: string;
    title: string;
    summary: string;
    cover: string | null;
    goal: number;
    raised: number;
    donors: number;
    progress: number;
    unit_price: number | null;
    unit_label: string | null;
    fund_types: string[];
    is_urgent: boolean;
    status: string;
};

export const CATEGORY_STYLE: Record<string, { icon: typeof Utensils; from: string; to: string }> = {
    food: { icon: Utensils, from: '#f59e0b', to: '#b45309' },
    orphans: { icon: HeartHandshake, from: '#10b981', to: '#065f46' },
    water: { icon: Droplets, from: '#38bdf8', to: '#075985' },
    housing: { icon: Home, from: '#a78bfa', to: '#4c1d95' },
    health: { icon: HeartPulse, from: '#fb7185', to: '#9f1239' },
    education: { icon: BookOpen, from: '#60a5fa', to: '#1e3a8a' },
    winter: { icon: Snowflake, from: '#7dd3fc', to: '#0b2545' },
    emergency: { icon: Siren, from: '#f97316', to: '#7c2d12' },
};

/** Campaign cover: the uploaded photo, or an illustration for its category. */
export function CampaignArt({ category, cover, className, big }: { category: string; cover?: string | null; className?: string; big?: boolean }) {
    const s = CATEGORY_STYLE[category] ?? { icon: Zap, from: '#10b981', to: '#0b2545' };
    if (cover) return <img src={cover} alt="" className={cx('h-full w-full object-cover', className)} loading="lazy" />;
    const Icon = s.icon;
    return (
        <div className={cx('relative h-full w-full overflow-hidden', className)} style={{ background: `linear-gradient(135deg, ${s.from}, ${s.to})` }} aria-hidden>
            <div className="absolute -end-10 -top-10 size-48 rounded-full bg-white/15" />
            <div className="absolute -bottom-16 -start-8 size-56 rounded-full bg-black/10" />
            <div className="absolute end-[18%] bottom-[18%] size-16 rounded-full bg-white/10" />
            <div className="absolute inset-0 opacity-25" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,.55) 1px, transparent 0)', backgroundSize: '22px 22px' }} />
            <Icon className={cx('absolute inset-0 m-auto text-white drop-shadow-[0_10px_30px_rgba(0,0,0,.25)]', big ? 'size-28' : 'size-16')} strokeWidth={1.4} />
        </div>
    );
}

export function CampaignCard({ c, index = 0 }: { c: CampaignCardData; index?: number }) {
    const { t, lang } = useI18n();
    const done = c.status === 'completed';
    return (
        <motion.article
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.5, delay: Math.min(index, 6) * 0.06 }}
            whileHover={{ y: -6 }}
            className="card group overflow-hidden"
        >
            <Link to={`/campaigns/${c.slug}`} className="block">
                <div className="relative aspect-[16/10] overflow-hidden">
                    <div className="h-full transition duration-700 group-hover:scale-105">
                        <CampaignArt category={c.category} cover={c.cover} />
                    </div>
                    <div className="absolute inset-x-3 top-3 flex justify-between">
                        <Pill tone="muted">{t(`cat.${c.category}` as never)}</Pill>
                        {c.is_urgent && !done && (
                            <Pill tone="amber">
                                <Flame className="size-3.5" />
                                {t('campaign.urgent')}
                            </Pill>
                        )}
                        {done && <Pill tone="green">{t('campaign.completed')}</Pill>}
                    </div>
                </div>
                <div className="p-5">
                    <h3 className="text-lg leading-7 font-bold">{c.title}</h3>
                    <p className="text-muted mt-1 line-clamp-2 text-sm leading-6">{c.summary}</p>
                    <Progress value={c.progress} className="mt-4" tone={c.is_urgent && !done ? 'amber' : 'green'} />
                    <div className="mt-3 flex items-end justify-between gap-2 text-sm">
                        <div>
                            <div className="text-ink font-bold">{money(c.raised, lang)}</div>
                            <div className="text-muted text-xs">{t('campaign.of_goal', { goal: money(c.goal, lang) })}</div>
                        </div>
                        <div className="text-end">
                            <div className="text-green font-bold">{c.progress}%</div>
                            <div className="text-muted flex items-center gap-1 text-xs">
                                <Users className="size-3" />
                                {num(c.donors, lang)}
                            </div>
                        </div>
                    </div>
                </div>
            </Link>
        </motion.article>
    );
}

export function BigNumber({ value, label, money: isMoney }: { value: number; label: string; money?: boolean }) {
    const { lang } = useI18n();
    return (
        <div>
            <div className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
                <CountUp value={value} format={(n) => (isMoney ? money(n, lang) : num(n, lang))} />
            </div>
            <div className="mt-1 text-sm opacity-80">{label}</div>
        </div>
    );
}
