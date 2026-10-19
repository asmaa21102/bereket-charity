import { Field, Modal, Pill, cx } from '@/components/ui';
import { useI18n } from '@/i18n';
import { api, apiError, type FieldErrors } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { date, dateTime, money } from '@/lib/format';
import { useToast } from '@/lib/toast';
import { Check, Plus, Search, ShieldCheck, X } from 'lucide-react';
import { type FormEvent, useCallback, useEffect, useState } from 'react';
import { AdminTitle, qs } from './shell';

type Vol = { id: number; user_id: number; name: string; email: string; phone: string | null; skills: string[]; availability: string; city: string; motivation: string | null; status: string; tasks_done: number };
type Task = { id: number; title: string; description: string | null; location: string | null; date: string; status: string; campaign: { slug: string; title: string } | null; assignee: { id: number; name: string } | null };

export function AdminVolunteers() {
    const { t, lang } = useI18n();
    const { user } = useAuth();
    const toast = useToast();
    const [d, setD] = useState<{ volunteers: Vol[]; tasks: Task[] } | null>(null);
    const [campaigns, setCampaigns] = useState<{ id: number; title: string }[]>([]);
    const [edit, setEdit] = useState<Partial<Task> & { campaign_id?: string; assigned_to?: string } | null>(null);
    const [errors, setErrors] = useState<FieldErrors>({});
    const load = useCallback(() => api.get('/admin/volunteers').then((r) => setD(r.data)), []);
    useEffect(() => {
        load();
        if (user?.role === 'admin') api.get('/admin/campaigns').then((r) => setCampaigns(r.data.campaigns));
    }, [load, user]);
    const review = async (v: Vol, status: string) => {
        await api.post(`/admin/volunteers/${v.id}`, { status });
        toast(t('common.saved'));
        load();
    };
    const saveTask = async (e: FormEvent) => {
        e.preventDefault();
        if (!edit) return;
        const body = { title: edit.title, description: edit.description, location: edit.location, task_date: edit.date, campaign_id: edit.campaign_id || null, assigned_to: edit.assigned_to || null };
        try {
            await (edit.id ? api.put(`/admin/tasks/${edit.id}`, body) : api.post('/admin/tasks', body));
            setEdit(null);
            toast(t('common.saved'));
            load();
        } catch (er) {
            setErrors(apiError(er).fields);
        }
    };
    const approved = d?.volunteers.filter((v) => v.status === 'approved') ?? [];
    const tone = (s: string) => (s === 'approved' || s === 'done' ? 'green' : s === 'rejected' ? 'rose' : s === 'assigned' ? 'sky' : 'amber') as 'green' | 'rose' | 'sky' | 'amber';

    return (
        <>
            <AdminTitle title={t('adm.nav.volunteers')} text={t('adm.v.p')} />
            <div className="grid gap-3 lg:grid-cols-2">
                {d?.volunteers.map((v) => (
                    <div key={v.id} className="card p-5 text-sm">
                        <div className="flex items-start gap-3">
                            <div className="flex-1"><div className="font-bold">{v.name}</div><div className="text-muted text-xs" dir="ltr">{v.email} {v.phone && `· ${v.phone}`}</div></div>
                            <Pill tone={tone(v.status)}>{t(`vol.status.${v.status}` as never)}</Pill>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-1.5">{v.skills.map((s) => <span key={s} className="bg-surface-2 rounded-full px-2 py-0.5 text-xs">{t(`skill.${s}` as never)}</span>)}</div>
                        <div className="text-muted mt-2 text-xs">{v.city} · {t(`vol.av.${v.availability}` as never)} · {t('adm.v.done', { n: v.tasks_done })}</div>
                        {v.motivation && <p className="text-ink-2 mt-2 line-clamp-3">{v.motivation}</p>}
                        {v.status === 'pending' && (
                            <div className="mt-3 flex gap-2">
                                <button onClick={() => review(v, 'approved')} className="btn btn-primary px-3 py-1.5 text-xs"><Check className="size-3.5" />{t('adm.approve')}</button>
                                <button onClick={() => review(v, 'rejected')} className="btn btn-danger px-3 py-1.5 text-xs"><X className="size-3.5" />{t('adm.reject')}</button>
                            </div>
                        )}
                    </div>
                ))}
            </div>
            <div className="mt-8 mb-3 flex items-center justify-between"><h2 className="text-lg font-bold">{t('vol.tasks')}</h2><button className="btn btn-primary" onClick={() => { setErrors({}); setEdit({ date: new Date().toISOString().slice(0, 10) }); }}><Plus className="size-4" />{t('adm.v.new_task')}</button></div>
            <div className="card divide-line divide-y">
                {d?.tasks.length === 0 && <p className="text-muted p-6 text-center text-sm">{t('adm.none')}</p>}
                {d?.tasks.map((x) => (
                    <button key={x.id} onClick={() => { setErrors({}); setEdit({ ...x, campaign_id: '', assigned_to: x.assignee ? String(x.assignee.id) : '' }); }} className="hover:bg-surface-2/60 flex w-full flex-wrap items-center gap-3 p-4 text-start text-sm">
                        <div className="flex-1"><div className="font-medium">{x.title}</div><div className="text-muted text-xs">{date(x.date, lang)}{x.location && ` · ${x.location}`}{x.campaign && ` · ${x.campaign.title}`}</div></div>
                        <span className="text-muted text-xs">{x.assignee?.name ?? t('adm.v.unassigned')}</span>
                        <Pill tone={tone(x.status)}>{t(`adm.v.task.${x.status}` as never)}</Pill>
                    </button>
                ))}
            </div>
            <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? t('adm.edit') : t('adm.v.new_task')}>
                {edit && (
                    <form onSubmit={saveTask} className="grid gap-4">
                        <Field label={t('adm.c.title')} error={errors.title} required><input className="input" value={edit.title ?? ''} onChange={(e) => setEdit({ ...edit, title: e.target.value })} /></Field>
                        <Field label={t('adm.u.body')}><textarea className="input min-h-20" value={edit.description ?? ''} onChange={(e) => setEdit({ ...edit, description: e.target.value })} /></Field>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <Field label={t('adm.v.location')}><input className="input" value={edit.location ?? ''} onChange={(e) => setEdit({ ...edit, location: e.target.value })} /></Field>
                            <Field label={t('adm.v.date')} error={errors.task_date} required><input className="input" type="date" value={edit.date ?? ''} onChange={(e) => setEdit({ ...edit, date: e.target.value })} /></Field>
                        </div>
                        {campaigns.length > 0 && <Field label={t('adm.f.campaign')}><select className="input" value={edit.campaign_id ?? ''} onChange={(e) => setEdit({ ...edit, campaign_id: e.target.value })}><option value="">—</option>{campaigns.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}</select></Field>}
                        <Field label={t('adm.v.assign')} error={errors.assigned_to}><select className="input" value={edit.assigned_to ?? ''} onChange={(e) => setEdit({ ...edit, assigned_to: e.target.value })}><option value="">{t('adm.v.unassigned')}</option>{approved.map((v) => <option key={v.user_id} value={v.user_id}>{v.name}</option>)}</select></Field>
                        <button className="btn btn-primary">{t('common.save')}</button>
                    </form>
                )}
            </Modal>
        </>
    );
}

type UserRow = { id: number; name: string; email: string; phone: string | null; role: string; suspended: boolean; two_factor: boolean; donations: number; given: number; aid_requests: number; created_at: string };

export function AdminUsers() {
    const { t, lang } = useI18n();
    const { user: me } = useAuth();
    const toast = useToast();
    const [q, setQ] = useState('');
    const [role, setRole] = useState('');
    const [rows, setRows] = useState<UserRow[] | null>(null);
    const load = useCallback(() => api.get(`/admin/users?${qs({ q, role })}`).then((r) => setRows(r.data.users)), [q, role]);
    useEffect(() => {
        const h = setTimeout(load, 250);
        return () => clearTimeout(h);
    }, [load]);
    const patch = async (u: UserRow, body: object) => {
        try {
            await api.patch(`/admin/users/${u.id}`, body);
            toast(t('common.saved'));
            load();
        } catch (er) {
            toast(apiError(er).message, 'error');
        }
    };
    return (
        <>
            <AdminTitle title={t('adm.nav.users')} />
            <div className="mb-4 flex flex-wrap gap-2">
                <label className="relative min-w-60 flex-1"><Search className="text-muted pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2" /><input className="input ps-9" placeholder={t('adm.users_search')} value={q} onChange={(e) => setQ(e.target.value)} /></label>
                <select className="input w-auto" value={role} onChange={(e) => setRole(e.target.value)}><option value="">{t('adm.all_roles')}</option>{['user', 'volunteer', 'staff', 'admin'].map((r) => <option key={r} value={r}>{t(`role.${r}` as never)}</option>)}</select>
            </div>
            <div className="card overflow-x-auto">
                <table className="w-full min-w-[760px] text-sm">
                    <thead className="text-muted border-line border-b text-xs"><tr>{['user', 'role', 'given', 'aid', 'joined', ''].map((h) => <th key={h} className="px-4 py-3 text-start font-medium">{h && t(`adm.us.${h}` as never)}</th>)}</tr></thead>
                    <tbody className="divide-line divide-y">
                        {rows?.map((u) => (
                            <tr key={u.id} className={cx(u.suspended && 'opacity-60')}>
                                <td className="px-4 py-3"><div className="flex items-center gap-1.5 font-medium">{u.name}{u.two_factor && <ShieldCheck className="text-green size-3.5" aria-label="2FA" />}</div><div className="text-muted text-xs" dir="ltr">{u.email}</div></td>
                                <td className="px-4 py-3"><select className="input w-auto py-1.5 text-xs" value={u.role} disabled={u.id === me?.id} onChange={(e) => patch(u, { role: e.target.value })}>{['user', 'volunteer', 'staff', 'admin'].map((r) => <option key={r} value={r}>{t(`role.${r}` as never)}</option>)}</select></td>
                                <td className="px-4 py-3">{money(u.given, lang)}<div className="text-muted text-xs">{t('adm.us.count', { n: u.donations })}</div></td>
                                <td className="px-4 py-3">{u.aid_requests}</td>
                                <td className="text-muted px-4 py-3 text-xs">{date(u.created_at, lang)}</td>
                                <td className="px-4 py-3 text-end">{u.id !== me?.id && <button onClick={() => patch(u, { is_suspended: !u.suspended })} className={cx('btn px-3 py-1.5 text-xs', u.suspended ? 'btn-ghost' : 'btn-danger')}>{u.suspended ? t('adm.us.restore') : t('adm.us.suspend')}</button>}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </>
    );
}

type Log = { id: number; action: string; user: string | null; subject: string | null; details: Record<string, unknown> | null; ip: string | null; at: string };

export function AdminAudit() {
    const { t, lang, has } = useI18n();
    const [action, setAction] = useState('');
    const [page, setPage] = useState(1);
    const [d, setD] = useState<{ data: Log[]; pages: number } | null>(null);
    useEffect(() => {
        api.get(`/admin/audit?${qs({ action, page })}`).then((r) => setD(r.data));
    }, [action, page]);
    return (
        <>
            <AdminTitle title={t('adm.nav.audit')} text={t('adm.audit_p')} />
            <div className="mb-4 flex flex-wrap gap-2">{['', 'donation', 'payment', 'aid', 'campaign', 'finance', 'user', 'volunteer', 'task', 'recurring', 'settings'].map((a) => <button key={a} onClick={() => { setAction(a); setPage(1); }} className={cx('chip', action === a && 'chip-on')}>{a ? t(`adm.au.${a}` as never) : t('common.all')}</button>)}</div>
            <div className="card divide-line divide-y text-sm">
                {d?.data.map((l) => (
                    <details key={l.id} className="group p-4">
                        <summary className="flex cursor-pointer list-none flex-wrap items-center gap-3">
                            <span className="flex-1 font-medium">{has(`audit.${l.action}`) ? t(`audit.${l.action}` as never) : l.action}<span className="text-muted font-normal"> · {l.user ?? t('adm.system')}{l.subject && ` · ${l.subject}`}</span></span>
                            <span className="text-muted font-mono text-xs" dir="ltr">{l.ip}</span>
                            <span className="text-muted text-xs">{dateTime(l.at, lang)}</span>
                        </summary>
                        {l.details && <pre dir="ltr" className="bg-surface-2 mt-3 overflow-x-auto rounded-xl p-3 text-xs">{JSON.stringify(l.details, null, 2)}</pre>}
                    </details>
                ))}
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

export function AdminSettings() {
    const { t } = useI18n();
    const toast = useToast();
    const [f, setF] = useState<{ gold_price_per_gram: string; silver_price_per_gram: string } | null>(null);
    const [errors, setErrors] = useState<FieldErrors>({});
    useEffect(() => {
        api.get('/admin/settings').then((r) => setF({ gold_price_per_gram: String(r.data.gold_price_per_gram), silver_price_per_gram: String(r.data.silver_price_per_gram) }));
    }, []);
    if (!f) return <div className="skeleton h-48 rounded-3xl" />;
    return (
        <>
            <AdminTitle title={t('adm.nav.settings')} />
            <form className="card grid max-w-xl gap-4 p-6" onSubmit={async (e) => { e.preventDefault(); try { await api.put('/admin/settings', f); setErrors({}); toast(t('common.saved')); } catch (er) { setErrors(apiError(er).fields); } }}>
                <h2 className="font-bold">{t('adm.s.zakat')}</h2>
                <p className="text-muted text-sm">{t('adm.s.zakat_p')}</p>
                <Field label={t('adm.s.gold')} error={errors.gold_price_per_gram}><input className="input" type="number" step="0.01" value={f.gold_price_per_gram} onChange={(e) => setF({ ...f, gold_price_per_gram: e.target.value })} /></Field>
                <Field label={t('adm.s.silver')} error={errors.silver_price_per_gram}><input className="input" type="number" step="0.01" value={f.silver_price_per_gram} onChange={(e) => setF({ ...f, silver_price_per_gram: e.target.value })} /></Field>
                <button className="btn btn-primary justify-self-start">{t('common.save')}</button>
            </form>
        </>
    );
}
