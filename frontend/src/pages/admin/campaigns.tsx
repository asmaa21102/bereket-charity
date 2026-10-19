import { CampaignArt } from '@/components/campaign';
import { Field, Pill, Progress, cx } from '@/components/ui';
import { LANGS, type Lang, useI18n } from '@/i18n';
import { api, apiError, type FieldErrors } from '@/lib/api';
import { date, money } from '@/lib/format';
import { useMeta } from '@/lib/meta';
import { useToast } from '@/lib/toast';
import { ImagePlus, LoaderCircle, Pencil, Plus, Send, Trash2 } from 'lucide-react';
import { type FormEvent, useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AdminTitle } from './shell';

type Row = { id: number; slug: string; title: string; category: string; cover: string | null; goal: number; raised: number; donors: number; progress: number; status: string; is_urgent: boolean; updates_count: number };
type Tr = Partial<Record<Lang, string>>;
type Level = { amount: number | string; text: Tr };
type Form = {
    slug: string; category: string; title: Tr; summary: Tr; story: Tr; unit_label: Tr; goal_amount: string; unit_price: string;
    fund_types: string[]; impact_levels: Level[]; is_urgent: boolean; status: string; ends_on: string;
};
type Update = { id: number; stage: string; title: string; body: string | null; image: string | null; published_at: string };

const statusTone = (s: string) => (s === 'active' ? 'green' : s === 'completed' ? 'sky' : s === 'draft' ? 'amber' : 'muted') as 'green' | 'sky' | 'amber' | 'muted';

/** Appends nested objects/arrays as Laravel-style keys (title[ar], impact_levels[0][amount]). */
function toFormData(fd: FormData, value: unknown, key = '') {
    if (value === null || value === undefined || value === '') return;
    if (typeof value === 'boolean') fd.append(key, value ? '1' : '0');
    else if (value instanceof File) fd.append(key, value);
    else if (Array.isArray(value)) value.forEach((v, i) => toFormData(fd, v, `${key}[${i}]`));
    else if (typeof value === 'object') Object.entries(value as object).forEach(([k, v]) => toFormData(fd, v, key ? `${key}[${k}]` : k));
    else fd.append(key, String(value));
}

export function AdminCampaigns() {
    const { t, lang } = useI18n();
    const [rows, setRows] = useState<Row[] | null>(null);
    useEffect(() => {
        api.get('/admin/campaigns').then((r) => setRows(r.data.campaigns));
    }, []);
    return (
        <>
            <AdminTitle title={t('adm.nav.campaigns')} text={t('adm.campaigns_p')}>
                <Link to="/admin/campaigns/new" className="btn btn-primary"><Plus className="size-4" />{t('adm.c.new')}</Link>
            </AdminTitle>
            <div className="grid gap-3">
                {!rows && <div className="skeleton h-40 rounded-3xl" />}
                {rows?.map((c) => (
                    <div key={c.id} className="card flex flex-wrap items-center gap-4 p-4">
                        <div className="size-14 shrink-0 overflow-hidden rounded-2xl"><CampaignArt category={c.category} cover={c.cover} className="[&_svg]:size-7" /></div>
                        <div className="min-w-48 flex-1">
                            <div className="flex flex-wrap items-center gap-2"><span className="font-bold">{c.title}</span><Pill tone={statusTone(c.status)}>{t(`adm.c.status.${c.status}` as never)}</Pill>{c.is_urgent && <Pill tone="rose">{t('campaign.urgent')}</Pill>}</div>
                            <div className="text-muted mt-1 text-xs">{money(c.raised, lang)} / {money(c.goal, lang)} · {t('adm.c.donors', { n: c.donors })} · {t('adm.c.updates', { n: c.updates_count })}</div>
                            <Progress value={c.progress} className="mt-2 h-1.5 max-w-sm" />
                        </div>
                        <Link to={`/campaigns/${c.slug}`} className="btn btn-ghost px-3 py-2 text-xs">{t('adm.view')}</Link>
                        <Link to={`/admin/campaigns/${c.id}`} className="btn btn-navy px-3 py-2 text-xs"><Pencil className="size-3.5" />{t('adm.edit')}</Link>
                    </div>
                ))}
            </div>
        </>
    );
}

const empty: Form = { slug: '', category: 'food', title: {}, summary: {}, story: {}, unit_label: {}, goal_amount: '', unit_price: '', fund_types: ['sadaqah', 'general'], impact_levels: [], is_urgent: false, status: 'active', ends_on: '' };

export function AdminCampaignForm() {
    const { id } = useParams();
    const isNew = !id || id === 'new';
    const { t, lang } = useI18n();
    const meta = useMeta();
    const toast = useToast();
    const nav = useNavigate();
    const [f, setF] = useState<Form | null>(isNew ? empty : null);
    const [tab, setTab] = useState<Lang>('ar');
    const [cover, setCover] = useState<{ file: File | null; url: string | null }>({ file: null, url: null });
    const [updates, setUpdates] = useState<Update[]>([]);
    const [errors, setErrors] = useState<FieldErrors>({});
    const [busy, setBusy] = useState(false);

    const load = useCallback(async () => {
        if (isNew) return;
        const { data } = await api.get(`/admin/campaigns/${id}`);
        const c = data.campaign;
        setF({
            slug: c.slug, category: c.category, title: c.title ?? {}, summary: c.summary ?? {}, story: c.story ?? {}, unit_label: c.unit_label ?? {},
            goal_amount: String(Number(c.goal_amount)), unit_price: c.unit_price ? String(Number(c.unit_price)) : '', fund_types: c.fund_types ?? [],
            impact_levels: c.impact_levels ?? [], is_urgent: !!c.is_urgent, status: c.status, ends_on: c.ends_on ? String(c.ends_on).slice(0, 10) : '',
        });
        setCover({ file: null, url: c.cover });
        setUpdates(data.campaign.updates);
    }, [id, isNew]);
    useEffect(() => {
        load();
    }, [load]);
    if (!f) return <div className="skeleton h-96 rounded-3xl" />;

    const setTr = (field: 'title' | 'summary' | 'story' | 'unit_label', v: string) => setF({ ...f, [field]: { ...f[field], [tab]: v } });
    const err = (k: string) => errors[`${k}.${tab}`] ?? errors[k];
    const tabHasError = (l: Lang) => Object.keys(errors).some((k) => k.endsWith(`.${l}`));

    const save = async (e: FormEvent) => {
        e.preventDefault();
        setBusy(true);
        setErrors({});
        const fd = new FormData();
        toFormData(fd, { ...f, slug: f.slug || null, unit_price: f.unit_price || null, ends_on: f.ends_on || null, impact_levels: f.impact_levels.filter((l) => l.amount) });
        if (!f.impact_levels.length) fd.append('impact_levels', '');
        if (cover.file) fd.append('cover', cover.file);
        try {
            const { data } = await api.post(isNew ? '/admin/campaigns' : `/admin/campaigns/${id}`, fd);
            toast(t('common.saved'));
            if (isNew) nav(`/admin/campaigns/${data.id}`, { replace: true });
            else load();
        } catch (er) {
            const x = apiError(er);
            setErrors(x.fields);
            toast(x.message, 'error');
            const bad = LANGS.find((l) => Object.keys(x.fields).some((k) => k.endsWith(`.${l.code}`)));
            if (bad) setTab(bad.code);
        } finally {
            setBusy(false);
        }
    };
    const remove = async () => {
        if (!confirm(t('adm.c.delete_confirm'))) return;
        try {
            await api.delete(`/admin/campaigns/${id}`);
            nav('/admin/campaigns');
        } catch (er) {
            toast(t('adm.c.delete_blocked'), 'error');
            void er;
        }
    };

    return (
        <>
            <AdminTitle title={isNew ? t('adm.c.new') : f.title.ar || t('adm.edit')}>
                <Link to="/admin/campaigns" className="btn btn-ghost">{t('adm.back')}</Link>
            </AdminTitle>
            <form onSubmit={save} className="grid gap-6">
                <section className="card p-6">
                    <div className="mb-5 flex gap-1 rounded-2xl bg-[var(--surface-2)] p-1">
                        {LANGS.map((l) => (
                            <button type="button" key={l.code} onClick={() => setTab(l.code)} className={cx('relative flex-1 rounded-xl px-3 py-2 text-sm font-semibold transition', tab === l.code ? 'bg-surface shadow-sm' : 'text-muted')}>
                                {l.label}{l.code === 'ar' && <span className="text-green ms-1">*</span>}
                                {tabHasError(l.code) && <span className="bg-rose absolute top-1.5 end-2 size-2 rounded-full" />}
                            </button>
                        ))}
                    </div>
                    <div className="grid gap-4" dir={tab === 'ar' ? 'rtl' : 'ltr'}>
                        <Field label={t('adm.c.title')} error={err('title')} required={tab === 'ar'}><input className="input" value={f.title[tab] ?? ''} onChange={(e) => setTr('title', e.target.value)} /></Field>
                        <Field label={t('adm.c.summary')} error={err('summary')} required={tab === 'ar'}><textarea className="input min-h-20" value={f.summary[tab] ?? ''} onChange={(e) => setTr('summary', e.target.value)} /></Field>
                        <Field label={t('adm.c.story')} error={err('story')}><textarea className="input min-h-40" value={f.story[tab] ?? ''} onChange={(e) => setTr('story', e.target.value)} /></Field>
                        <Field label={t('adm.c.unit_label')} hint={t('adm.c.unit_label_hint')} error={err('unit_label')}><input className="input" value={f.unit_label[tab] ?? ''} onChange={(e) => setTr('unit_label', e.target.value)} /></Field>
                    </div>
                    {tab !== 'ar' && <p className="text-muted mt-3 text-xs">{t('adm.c.fallback')}</p>}
                </section>

                <section className="card grid gap-4 p-6 sm:grid-cols-3">
                    <Field label={t('adm.c.category')}><select className="input" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>{meta.categories.map((c) => <option key={c} value={c}>{t(`cat.${c}` as never)}</option>)}</select></Field>
                    <Field label={t('adm.c.goal')} error={errors.goal_amount} required><input className="input" type="number" min={100} value={f.goal_amount} onChange={(e) => setF({ ...f, goal_amount: e.target.value })} /></Field>
                    <Field label={t('adm.c.unit_price')} hint={t('adm.c.unit_price_hint')} error={errors.unit_price}><input className="input" type="number" min={1} value={f.unit_price} onChange={(e) => setF({ ...f, unit_price: e.target.value })} /></Field>
                    <Field label={t('adm.c.status_label')}><select className="input" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}>{['draft', 'active', 'completed', 'closed'].map((s) => <option key={s} value={s}>{t(`adm.c.status.${s}` as never)}</option>)}</select></Field>
                    <Field label={t('adm.c.ends_on')} error={errors.ends_on}><input className="input" type="date" value={f.ends_on} onChange={(e) => setF({ ...f, ends_on: e.target.value })} /></Field>
                    <Field label={t('adm.c.slug')} hint={t('adm.c.slug_hint')} error={errors.slug}><input className="input" dir="ltr" value={f.slug} onChange={(e) => setF({ ...f, slug: e.target.value })} /></Field>
                    <div className="sm:col-span-3">
                        <span className="label">{t('adm.c.funds')}</span>
                        <div className="flex flex-wrap gap-2">{meta.fund_types.map((x) => <button type="button" key={x} onClick={() => setF({ ...f, fund_types: f.fund_types.includes(x) ? f.fund_types.filter((y) => y !== x) : [...f.fund_types, x] })} className={cx('chip', f.fund_types.includes(x) && 'chip-on')}>{t(`fund.${x}` as never)}</button>)}</div>
                        {errors.fund_types && <span className="text-rose mt-1 block text-xs">{errors.fund_types}</span>}
                    </div>
                    <label className="flex items-center gap-2 text-sm font-medium sm:col-span-3"><input type="checkbox" className="accent-[var(--green)] size-4" checked={f.is_urgent} onChange={(e) => setF({ ...f, is_urgent: e.target.checked })} />{t('adm.c.urgent')}</label>
                </section>

                <section className="card p-6">
                    <div className="mb-3 flex items-center justify-between"><h2 className="font-bold">{t('adm.c.levels')}</h2><button type="button" className="btn btn-ghost px-3 py-1.5 text-xs" disabled={f.impact_levels.length >= 6} onClick={() => setF({ ...f, impact_levels: [...f.impact_levels, { amount: '', text: {} }] })}><Plus className="size-3.5" />{t('adm.add')}</button></div>
                    <p className="text-muted mb-4 text-xs">{t('adm.c.levels_p')}</p>
                    <div className="space-y-3">
                        {f.impact_levels.map((l, i) => (
                            <div key={i} className="grid items-start gap-2 sm:grid-cols-[110px_1fr_1fr_1fr_auto]">
                                <input className="input" type="number" placeholder={t('adm.amount')} value={l.amount} onChange={(e) => setF({ ...f, impact_levels: f.impact_levels.map((x, j) => (j === i ? { ...x, amount: e.target.value } : x)) })} />
                                {LANGS.map((g) => <input key={g.code} className="input" dir={g.code === 'ar' ? 'rtl' : 'ltr'} placeholder={g.label} value={l.text[g.code] ?? ''} onChange={(e) => setF({ ...f, impact_levels: f.impact_levels.map((x, j) => (j === i ? { ...x, text: { ...x.text, [g.code]: e.target.value } } : x)) })} />)}
                                <button type="button" onClick={() => setF({ ...f, impact_levels: f.impact_levels.filter((_, j) => j !== i) })} className="text-muted hover:text-rose p-2.5"><Trash2 className="size-4" /></button>
                                {(errors[`impact_levels.${i}.amount`] || errors[`impact_levels.${i}.text.ar`]) && <span className="text-rose text-xs sm:col-span-5">{errors[`impact_levels.${i}.amount`] ?? errors[`impact_levels.${i}.text.ar`]}</span>}
                            </div>
                        ))}
                    </div>
                </section>

                <section className="card p-6">
                    <h2 className="mb-3 font-bold">{t('adm.c.cover')}</h2>
                    <div className="flex flex-wrap items-center gap-5">
                        <div className="aspect-[16/10] w-56 overflow-hidden rounded-2xl"><CampaignArt category={f.category} cover={cover.file ? URL.createObjectURL(cover.file) : cover.url} /></div>
                        <label className="btn btn-ghost cursor-pointer"><ImagePlus className="size-4" />{t('adm.c.upload')}<input type="file" accept="image/*" className="sr-only" onChange={(e) => setCover({ ...cover, file: e.target.files?.[0] ?? null })} /></label>
                        {errors.cover && <span className="text-rose text-xs">{errors.cover}</span>}
                    </div>
                    <p className="text-muted mt-3 text-xs">{t('adm.c.cover_p')}</p>
                </section>

                <div className="flex flex-wrap gap-3">
                    <button className="btn btn-primary" disabled={busy}>{busy && <LoaderCircle className="size-4 animate-spin" />}{t('common.save')}</button>
                    {!isNew && <button type="button" onClick={remove} className="btn btn-danger"><Trash2 className="size-4" />{t('common.remove')}</button>}
                </div>
            </form>

            {!isNew && <UpdatesPanel campaignId={Number(id)} updates={updates} reload={load} lang={lang} />}
        </>
    );
}

function UpdatesPanel({ campaignId, updates, reload, lang }: { campaignId: number; updates: Update[]; reload: () => void; lang: Lang }) {
    const { t } = useI18n();
    const toast = useToast();
    const [u, setU] = useState({ stage: 'update', title: {} as Tr, body: {} as Tr, image: null as File | null });
    const [errors, setErrors] = useState<FieldErrors>({});
    const [busy, setBusy] = useState(false);
    const post = async (e: FormEvent) => {
        e.preventDefault();
        setBusy(true);
        const fd = new FormData();
        toFormData(fd, { stage: u.stage, title: u.title, body: u.body });
        if (u.image) fd.append('image', u.image);
        try {
            const { data } = await api.post(`/admin/campaigns/${campaignId}/updates`, fd);
            toast(t('adm.u.posted', { n: data.notified }));
            setU({ stage: 'update', title: {}, body: {}, image: null });
            setErrors({});
            reload();
        } catch (er) {
            setErrors(apiError(er).fields);
        } finally {
            setBusy(false);
        }
    };
    return (
        <section className="card mt-8 p-6">
            <h2 className="font-bold">{t('adm.u.title')}</h2>
            <p className="text-muted mt-1 mb-4 text-sm">{t('adm.u.p')}</p>
            <form onSubmit={post} className="bg-surface-2 grid gap-3 rounded-2xl p-4">
                <div className="flex flex-wrap gap-2">{['received', 'purchased', 'delivered', 'update'].map((s) => <button type="button" key={s} onClick={() => setU({ ...u, stage: s })} className={cx('chip', u.stage === s && 'chip-on')}>{t(`stage.${s}` as never)}</button>)}</div>
                <div className="grid gap-2 sm:grid-cols-3">{LANGS.map((g) => <input key={g.code} dir={g.code === 'ar' ? 'rtl' : 'ltr'} className="input" placeholder={`${t('adm.c.title')} · ${g.label}`} value={u.title[g.code] ?? ''} onChange={(e) => setU({ ...u, title: { ...u.title, [g.code]: e.target.value } })} />)}</div>
                {errors['title.ar'] && <span className="text-rose text-xs">{errors['title.ar']}</span>}
                <div className="grid gap-2 sm:grid-cols-3">{LANGS.map((g) => <textarea key={g.code} dir={g.code === 'ar' ? 'rtl' : 'ltr'} className="input min-h-20" placeholder={`${t('adm.u.body')} · ${g.label}`} value={u.body[g.code] ?? ''} onChange={(e) => setU({ ...u, body: { ...u.body, [g.code]: e.target.value } })} />)}</div>
                <div className="flex flex-wrap items-center gap-3">
                    <label className="btn btn-ghost cursor-pointer px-3 py-2 text-xs"><ImagePlus className="size-4" />{u.image ? u.image.name : t('adm.u.image')}<input type="file" accept="image/*" className="sr-only" onChange={(e) => setU({ ...u, image: e.target.files?.[0] ?? null })} /></label>
                    <button className="btn btn-primary px-4 py-2" disabled={busy}><Send className="size-4" />{t('adm.u.post')}</button>
                </div>
            </form>
            <ul className="mt-5 space-y-3">
                {updates.map((x) => (
                    <li key={x.id} className="border-line flex items-start gap-3 rounded-2xl border p-3">
                        {x.image && <img src={x.image} alt="" className="size-14 rounded-xl object-cover" />}
                        <div className="flex-1"><div className="flex flex-wrap items-center gap-2"><Pill tone="green">{t(`stage.${x.stage}` as never)}</Pill><span className="font-semibold">{x.title}</span></div>{x.body && <p className="text-muted mt-1 text-sm">{x.body}</p>}<div className="text-muted mt-1 text-xs">{date(x.published_at, lang)}</div></div>
                        <button onClick={async () => { if (confirm(t('adm.u.delete_confirm'))) { await api.delete(`/admin/campaign-updates/${x.id}`); reload(); } }} className="text-muted hover:text-rose p-1"><Trash2 className="size-4" /></button>
                    </li>
                ))}
            </ul>
        </section>
    );
}
