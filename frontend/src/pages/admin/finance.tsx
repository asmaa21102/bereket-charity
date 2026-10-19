import { Field, Modal, Pill, cx } from '@/components/ui';
import { useI18n } from '@/i18n';
import { api, apiError, type FieldErrors } from '@/lib/api';
import { date, dateTime, money, num } from '@/lib/format';
import { useMeta } from '@/lib/meta';
import { useToast } from '@/lib/toast';
import { Download, Gift, Plus, Repeat, Search } from 'lucide-react';
import { type FormEvent, useCallback, useEffect, useState } from 'react';
import { Bar, BarChart, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AdminTitle, FUND_COLORS, Stat, qs } from './shell';

const yearStart = () => `${new Date().getFullYear()}-01-01`;
const today = () => new Date().toISOString().slice(0, 10);

type Donation = { id: number; receipt_no: string | null; amount: number; fund_type: string; status: string; payment_method: string; card: string | null; paid_at: string | null; created_at: string; campaign: { slug: string; title: string } | null; gift: { name: string } | null; recurring: boolean; donor_name: string | null; donor_email: string | null; anonymous: boolean };

export function AdminDonations() {
    const { t, lang } = useI18n();
    const meta = useMeta();
    const [filters, setFilters] = useState({ from: yearStart(), to: today(), status: '', fund: '', q: '' });
    const [page, setPage] = useState(1);
    const [d, setD] = useState<{ data: Donation[]; total: number; pages: number; sum: number } | null>(null);
    useEffect(() => {
        const h = setTimeout(() => api.get(`/admin/donations?${qs({ ...filters, page })}`).then((r) => setD(r.data)), 250);
        return () => clearTimeout(h);
    }, [filters, page]);
    const set = (k: keyof typeof filters, v: string) => (setFilters({ ...filters, [k]: v }), setPage(1));
    const tone = (s: string) => (s === 'paid' ? 'green' : s === 'failed' ? 'rose' : 'amber') as 'green' | 'rose' | 'amber';
    return (
        <>
            <AdminTitle title={t('adm.nav.donations')} text={d ? t('adm.d.summary', { n: num(d.total, lang), amount: money(d.sum, lang) }) : undefined}>
                <a href={`/api/admin/donations/export?${qs(filters)}`} className="btn btn-ghost"><Download className="size-4" />{t('adm.export')}</a>
            </AdminTitle>
            <div className="card mb-4 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5">
                <label className="relative lg:col-span-2"><Search className="text-muted pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2" /><input className="input ps-9" placeholder={t('adm.d.search')} value={filters.q} onChange={(e) => set('q', e.target.value)} /></label>
                <select className="input" value={filters.fund} onChange={(e) => set('fund', e.target.value)}><option value="">{t('adm.all_funds')}</option>{meta.fund_types.map((f) => <option key={f} value={f}>{t(`fund.${f}` as never)}</option>)}</select>
                <select className="input" value={filters.status} onChange={(e) => set('status', e.target.value)}><option value="">{t('adm.all_status')}</option>{['paid', 'failed', 'pending', 'refunded'].map((s) => <option key={s} value={s}>{t(`adm.d.status.${s}` as never)}</option>)}</select>
                <div className="flex gap-2"><input type="date" className="input px-2" value={filters.from} onChange={(e) => set('from', e.target.value)} /><input type="date" className="input px-2" value={filters.to} onChange={(e) => set('to', e.target.value)} /></div>
            </div>
            <div className="card overflow-x-auto">
                <table className="w-full min-w-[760px] text-sm">
                    <thead className="text-muted border-line border-b text-xs"><tr>{['receipt', 'donor', 'campaign', 'fund', 'amount', 'method', 'date'].map((h) => <th key={h} className="px-4 py-3 text-start font-medium">{t(`adm.d.col.${h}` as never)}</th>)}</tr></thead>
                    <tbody className="divide-line divide-y">
                        {d?.data.map((x) => (
                            <tr key={x.id} className="hover:bg-surface-2/60">
                                <td className="px-4 py-3"><span dir="ltr" className="font-mono text-xs">{x.receipt_no ?? '—'}</span><div className="mt-1"><Pill tone={tone(x.status)}>{t(`adm.d.status.${x.status}` as never)}</Pill></div></td>
                                <td className="px-4 py-3"><div className="font-medium">{x.donor_name ?? t('adm.d.guest')}{x.anonymous && <span className="text-muted text-xs"> ({t('campaign.anonymous')})</span>}</div><div className="text-muted text-xs" dir="ltr">{x.donor_email}</div></td>
                                <td className="px-4 py-3">{x.campaign?.title ?? <span className="text-muted">{t('receipt.general')}</span>}<div className="flex gap-2 text-xs">{x.gift && <span className="text-amber inline-flex items-center gap-1"><Gift className="size-3" />{x.gift.name}</span>}{x.recurring && <span className="text-sky inline-flex items-center gap-1"><Repeat className="size-3" />{t('freq.monthly')}</span>}</div></td>
                                <td className="px-4 py-3"><span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full" style={{ background: FUND_COLORS[x.fund_type] }} />{t(`fund.${x.fund_type}` as never)}</span></td>
                                <td className="px-4 py-3 font-semibold">{money(x.amount, lang)}</td>
                                <td className="text-muted px-4 py-3 text-xs">{t(`pay.${x.payment_method}` as never)}{x.card && <div dir="ltr">{x.card}</div>}</td>
                                <td className="text-muted px-4 py-3 text-xs">{dateTime(x.paid_at ?? x.created_at, lang)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {d && d.data.length === 0 && <p className="text-muted p-8 text-center text-sm">{t('adm.none')}</p>}
            </div>
            {d && d.pages > 1 && (
                <div className="mt-4 flex items-center justify-center gap-3 text-sm">
                    <button className="btn btn-ghost px-3 py-1.5" disabled={page <= 1} onClick={() => setPage(page - 1)}>{t('adm.prev')}</button>
                    <span>{t('adm.page', { page, pages: d.pages })}</span>
                    <button className="btn btn-ghost px-3 py-1.5" disabled={page >= d.pages} onClick={() => setPage(page + 1)}>{t('adm.next')}</button>
                </div>
            )}
        </>
    );
}

type Report = { from: string; to: string; income: number; spent: number; balance: number; funds: { fund: string; income: number; count: number; spent: number; balance: number }[]; monthly: { month: string; income: number; spent: number }[] };
type Disb = { id: number; fund_type: string; amount: number; description: string; paid_on: string; campaign: string | null; aid_request_id: number | null };

export function AdminFinance() {
    const { t, lang } = useI18n();
    const meta = useMeta();
    const toast = useToast();
    const [range, setRange] = useState({ from: yearStart(), to: today() });
    const [r, setR] = useState<Report | null>(null);
    const [disb, setDisb] = useState<Disb[]>([]);
    const [campaigns, setCampaigns] = useState<{ id: number; title: string }[]>([]);
    const [open, setOpen] = useState(false);
    const [f, setF] = useState({ fund_type: 'general', campaign_id: '', amount: '', description: '', paid_on: today() });
    const [errors, setErrors] = useState<FieldErrors>({});
    const load = useCallback(() => {
        api.get(`/admin/reports/financial?${qs(range)}`).then((x) => setR(x.data));
        api.get(`/admin/disbursements?${qs(range)}`).then((x) => setDisb(x.data.data));
    }, [range]);
    useEffect(() => {
        load();
    }, [load]);
    useEffect(() => {
        api.get('/admin/campaigns').then((x) => setCampaigns(x.data.campaigns));
    }, []);
    const save = async (e: FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/admin/disbursements', { ...f, campaign_id: f.campaign_id || null });
            setOpen(false);
            setF({ fund_type: 'general', campaign_id: '', amount: '', description: '', paid_on: today() });
            toast(t('common.saved'));
            load();
        } catch (er) {
            setErrors(apiError(er).fields);
        }
    };
    const tip = { contentStyle: { background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12 } };
    return (
        <>
            <AdminTitle title={t('adm.nav.finance')} text={t('adm.f.p')}>
                <div className="flex flex-wrap gap-2">
                    <input type="date" className="input w-auto px-2" value={range.from} onChange={(e) => setRange({ ...range, from: e.target.value })} />
                    <input type="date" className="input w-auto px-2" value={range.to} onChange={(e) => setRange({ ...range, to: e.target.value })} />
                    <a href={`/api/admin/reports/financial/export?${qs(range)}`} className="btn btn-ghost"><Download className="size-4" />{t('adm.export')}</a>
                </div>
            </AdminTitle>
            {r && (
                <>
                    <div className="grid gap-4 sm:grid-cols-3">
                        <Stat label={t('adm.f.income')} value={money(r.income, lang)} />
                        <Stat label={t('adm.f.spent')} value={money(r.spent, lang)} tone="rose" />
                        <Stat label={t('adm.f.balance')} value={money(r.balance, lang)} tone="sky" />
                    </div>
                    <div className="mt-6 grid gap-6 xl:grid-cols-5">
                        <div className="card overflow-x-auto xl:col-span-3">
                            <table className="w-full text-sm">
                                <thead className="text-muted border-line border-b text-xs"><tr><th className="px-4 py-3 text-start font-medium">{t('donate.fund')}</th><th className="px-4 py-3 text-start font-medium">{t('adm.f.count')}</th><th className="px-4 py-3 text-start font-medium">{t('adm.f.income')}</th><th className="px-4 py-3 text-start font-medium">{t('adm.f.spent')}</th><th className="px-4 py-3 text-start font-medium">{t('adm.f.balance')}</th></tr></thead>
                                <tbody className="divide-line divide-y">
                                    {r.funds.map((x) => <tr key={x.fund}><td className="px-4 py-3"><span className="inline-flex items-center gap-2"><span className="size-2.5 rounded-full" style={{ background: FUND_COLORS[x.fund] }} />{t(`fund.${x.fund}` as never)}</span></td><td className="px-4 py-3">{num(x.count, lang)}</td><td className="px-4 py-3">{money(x.income, lang)}</td><td className="px-4 py-3">{money(x.spent, lang)}</td><td className={cx('px-4 py-3 font-semibold', x.balance < 0 && 'text-rose')}>{money(x.balance, lang)}</td></tr>)}
                                </tbody>
                            </table>
                            <p className="text-muted border-line border-t p-4 text-xs">{t('adm.f.restricted')}</p>
                        </div>
                        <div className="card p-5 xl:col-span-2">
                            <h2 className="mb-3 font-bold">{t('adm.f.monthly')}</h2>
                            <div className="h-64" dir="ltr">
                                <ResponsiveContainer>
                                    <BarChart data={r.monthly}>
                                        <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--muted)' }} axisLine={false} tickLine={false} />
                                        <YAxis tick={{ fontSize: 11, fill: 'var(--muted)' }} axisLine={false} tickLine={false} width={55} tickFormatter={(v) => num(v, lang)} />
                                        <Tooltip formatter={(v: number) => money(v, lang)} {...tip} />
                                        <Legend wrapperStyle={{ fontSize: 12 }} />
                                        <Bar dataKey="income" name={t('adm.f.income')} fill="#0f9d6b" radius={[6, 6, 0, 0]} />
                                        <Bar dataKey="spent" name={t('adm.f.spent')} fill="#f59e0b" radius={[6, 6, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                </>
            )}
            <div className="mt-8 mb-3 flex items-center justify-between"><h2 className="text-lg font-bold">{t('adm.f.disbursements')}</h2><button className="btn btn-primary" onClick={() => setOpen(true)}><Plus className="size-4" />{t('adm.f.add')}</button></div>
            <div className="card divide-line divide-y">
                {disb.length === 0 && <p className="text-muted p-6 text-center text-sm">{t('adm.none')}</p>}
                {disb.map((x) => (
                    <div key={x.id} className="flex flex-wrap items-center gap-3 p-4 text-sm">
                        <span className="size-2.5 rounded-full" style={{ background: FUND_COLORS[x.fund_type] }} />
                        <div className="flex-1"><div className="font-medium">{x.description}</div><div className="text-muted text-xs">{t(`fund.${x.fund_type}` as never)}{x.campaign && ` · ${x.campaign}`}{x.aid_request_id && ` · ${t('adm.f.aid_link')}`}</div></div>
                        <span className="font-semibold">{money(x.amount, lang)}</span>
                        <span className="text-muted text-xs">{date(x.paid_on, lang)}</span>
                    </div>
                ))}
            </div>
            <Modal open={open} onClose={() => setOpen(false)} title={t('adm.f.add')}>
                <form onSubmit={save} className="grid gap-4">
                    <Field label={t('donate.fund')}><select className="input" value={f.fund_type} onChange={(e) => setF({ ...f, fund_type: e.target.value })}>{meta.fund_types.map((x) => <option key={x} value={x}>{t(`fund.${x}` as never)}</option>)}</select></Field>
                    <Field label={t('adm.f.campaign')}><select className="input" value={f.campaign_id} onChange={(e) => setF({ ...f, campaign_id: e.target.value })}><option value="">—</option>{campaigns.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}</select></Field>
                    <Field label={t('adm.amount')} error={errors.amount} required><input className="input" type="number" min={1} value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} /></Field>
                    <Field label={t('adm.f.description')} error={errors.description} required><input className="input" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
                    <Field label={t('adm.f.paid_on')} error={errors.paid_on} required><input className="input" type="date" value={f.paid_on} max={today()} onChange={(e) => setF({ ...f, paid_on: e.target.value })} /></Field>
                    <button className="btn btn-primary">{t('common.save')}</button>
                </form>
            </Modal>
        </>
    );
}
