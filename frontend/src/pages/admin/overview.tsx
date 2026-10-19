import { CampaignArt } from '@/components/campaign';
import { Progress } from '@/components/ui';
import { useI18n } from '@/i18n';
import { api } from '@/lib/api';
import { date, money, num, timeAgo } from '@/lib/format';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Area, AreaChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AdminTitle, FUND_COLORS, Stat } from './shell';

type Overview = {
    kpis: Record<string, number>;
    series: { date: string; total: number; count: number }[];
    by_fund: { fund: string; total: number }[];
    by_method: { method: string; count: number }[];
    top_campaigns: { id: number; slug: string; title: string; category: string; cover: string | null; raised: number; goal: number; progress: number }[];
    activity: { action: string; user: string | null; subject: string | null; at: string }[];
};

export default function AdminOverview() {
    const { t, lang, has } = useI18n();
    const [d, setD] = useState<Overview | null>(null);
    useEffect(() => {
        api.get('/admin/overview').then((r) => setD(r.data));
    }, []);
    if (!d) return <div className="grid gap-4 sm:grid-cols-4">{Array.from({ length: 8 }, (_, i) => <div key={i} className="skeleton h-24 rounded-3xl" />)}</div>;
    const k = d.kpis;
    const action = (a: string) => (has(`audit.${a}`) ? t(`audit.${a}` as never) : a);
    return (
        <>
            <AdminTitle title={t('adm.nav.overview')} text={t('adm.overview_p')} />
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <Stat label={t('adm.k.raised')} value={money(k.raised, lang)} sub={t('adm.k.this_month', { amount: money(k.raised_month, lang) })} />
                <Stat label={t('adm.k.donations')} value={num(k.donations, lang)} sub={t('adm.k.donors', { n: num(k.donors, lang) })} tone="sky" />
                <Stat label={t('adm.k.recurring')} value={num(k.recurring, lang)} sub={t('adm.k.recurring_value', { amount: money(k.recurring_monthly_value, lang) })} tone="amber" />
                <Stat label={t('adm.k.spent')} value={money(k.spent, lang)} sub={t('adm.k.campaigns', { n: k.active_campaigns })} tone="rose" />
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
                <Link to="/admin/aid" className="card hover:border-green p-5 transition"><div className="text-muted text-xs">{t('adm.k.pending_requests')}</div><div className="text-amber mt-1 text-2xl font-bold">{k.pending_requests}</div></Link>
                <Link to="/admin/volunteers" className="card hover:border-green p-5 transition"><div className="text-muted text-xs">{t('adm.k.pending_volunteers')}</div><div className="text-sky mt-1 text-2xl font-bold">{k.pending_volunteers}</div></Link>
                <div className="card p-5"><div className="text-muted text-xs">{t('adm.k.users')}</div><div className="mt-1 text-2xl font-bold">{num(k.users, lang)}</div></div>
            </div>

            <div className="mt-6 grid gap-6 xl:grid-cols-3">
                <div className="card p-5 xl:col-span-2">
                    <h2 className="mb-4 font-bold">{t('adm.last30')}</h2>
                    <div className="h-64" dir="ltr">
                        <ResponsiveContainer>
                            <AreaChart data={d.series}>
                                <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#0f9d6b" stopOpacity={0.35} /><stop offset="1" stopColor="#0f9d6b" stopOpacity={0} /></linearGradient></defs>
                                <XAxis dataKey="date" tickFormatter={(v) => date(v, lang, { day: 'numeric', month: 'short' })} tick={{ fontSize: 11, fill: 'var(--muted)' }} axisLine={false} tickLine={false} minTickGap={24} />
                                <YAxis tick={{ fontSize: 11, fill: 'var(--muted)' }} axisLine={false} tickLine={false} width={60} tickFormatter={(v) => num(v, lang)} />
                                <Tooltip formatter={(v: number) => money(v, lang)} labelFormatter={(v) => date(v, lang)} contentStyle={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12 }} />
                                <Area type="monotone" dataKey="total" stroke="#0f9d6b" strokeWidth={2} fill="url(#g)" name={t('adm.k.raised')} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
                <div className="card p-5">
                    <h2 className="mb-4 font-bold">{t('adm.by_fund')}</h2>
                    <div className="h-44" dir="ltr">
                        <ResponsiveContainer>
                            <PieChart>
                                <Pie data={d.by_fund} dataKey="total" nameKey="fund" innerRadius={45} outerRadius={75} paddingAngle={2}>
                                    {d.by_fund.map((f) => <Cell key={f.fund} fill={FUND_COLORS[f.fund] ?? '#888'} />)}
                                </Pie>
                                <Tooltip formatter={(v: number, n: string) => [money(v, lang), t(`fund.${n}` as never)]} contentStyle={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12 }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <ul className="mt-3 space-y-1.5 text-sm">
                        {d.by_fund.map((f) => <li key={f.fund} className="flex items-center gap-2"><span className="size-2.5 rounded-full" style={{ background: FUND_COLORS[f.fund] }} /><span className="flex-1">{t(`fund.${f.fund}` as never)}</span><span className="font-semibold">{money(f.total, lang)}</span></li>)}
                    </ul>
                    <div className="border-line text-muted mt-4 border-t pt-3 text-xs">{d.by_method.map((m) => `${t(`pay.${m.method}` as never)}: ${num(m.count, lang)}`).join(' · ')}</div>
                </div>
            </div>

            <div className="mt-6 grid gap-6 xl:grid-cols-2">
                <div className="card p-5">
                    <h2 className="mb-4 font-bold">{t('adm.top')}</h2>
                    <div className="space-y-4">
                        {d.top_campaigns.map((c) => (
                            <div key={c.id} className="flex items-center gap-3">
                                <div className="size-11 shrink-0 overflow-hidden rounded-xl"><CampaignArt category={c.category} cover={c.cover} className="[&_svg]:size-6" /></div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex justify-between gap-2 text-sm"><span className="truncate font-semibold">{c.title}</span><span className="text-muted shrink-0">{c.progress}%</span></div>
                                    <Progress value={c.progress} className="mt-1.5 h-1.5" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="card p-5">
                    <h2 className="mb-4 font-bold">{t('adm.activity')}</h2>
                    <ul className="divide-line divide-y text-sm">
                        {d.activity.map((a, i) => <li key={i} className="flex gap-3 py-2"><span className="flex-1">{action(a.action)}<span className="text-muted"> · {a.user ?? t('adm.system')}</span></span><span className="text-muted shrink-0 text-xs">{timeAgo(a.at, lang)}</span></li>)}
                    </ul>
                </div>
            </div>
        </>
    );
}
