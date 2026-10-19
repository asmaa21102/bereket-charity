import { Container } from '@/components/layout';
import { Empty, Field, PageHeader, Pill, cx } from '@/components/ui';
import { useI18n } from '@/i18n';
import { api, apiError, type FieldErrors } from '@/lib/api';
import { date, dateTime, money } from '@/lib/format';
import { useMeta } from '@/lib/meta';
import { motion } from 'framer-motion';
import { CheckCircle2, Circle, FileLock2, HandHeart, LoaderCircle, Plus, Trash2, Upload } from 'lucide-react';
import { type FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

export type AidRequest = {
    id: number; reference: string; type: string; title: string; description: string; amount_requested: number; approved_amount: number | null; fund_type: string | null;
    family_size: number; city: string; phone: string | null; status: string; decision_note: string | null; created_at: string;
    documents: { id: number; kind: string; name: string; size: number }[];
    events: { to: string; at: string; note: string | null; by?: string | null }[];
};
export const AID_FLOW = ['submitted', 'under_review', 'approved', 'disbursed'];
export const aidTone = (s: string) => (s === 'rejected' ? 'rose' : s === 'disbursed' || s === 'approved' ? 'green' : s === 'under_review' ? 'sky' : 'amber') as 'rose' | 'green' | 'sky' | 'amber';

export function AidList() {
    const { t, lang } = useI18n();
    const [list, setList] = useState<AidRequest[] | null>(null);
    useEffect(() => {
        api.get('/aid-requests').then((r) => setList(r.data.requests));
    }, []);
    return (
        <Container className="py-12">
            <PageHeader eyebrow={t('aid.eyebrow')} title={t('aid.title')} text={t('aid.text')}>
                <Link to="/aid/new" className="btn btn-primary"><Plus className="size-4" />{t('aid.new')}</Link>
            </PageHeader>
            {!list ? <div className="skeleton h-40 rounded-3xl" /> : list.length === 0 ? (
                <Empty icon={HandHeart} title={t('aid.none')} text={t('aid.none_p')} action={<Link to="/aid/new" className="btn btn-primary">{t('aid.new')}</Link>} />
            ) : (
                <div className="grid gap-3">
                    {list.map((r) => (
                        <Link key={r.id} to={`/aid/${r.id}`} className="card hover:border-green flex flex-wrap items-center gap-4 p-5 transition">
                            <div className="flex-1"><div className="font-bold">{r.title}</div><div className="text-muted text-sm"><span dir="ltr" className="font-mono">{r.reference}</span> · {t(`aid.type.${r.type}` as never)} · {date(r.created_at, lang)}</div></div>
                            <span className="font-semibold">{money(r.amount_requested, lang)}</span>
                            <Pill tone={aidTone(r.status)}>{t(`aid.status.${r.status}` as never)}</Pill>
                        </Link>
                    ))}
                </div>
            )}
        </Container>
    );
}

export function AidStatusTrack({ r }: { r: AidRequest }) {
    const { t, lang } = useI18n();
    const rejected = r.status === 'rejected';
    const reached = AID_FLOW.indexOf(r.status);
    return (
        <div className="grid gap-3 sm:grid-cols-4">
            {AID_FLOW.map((s, i) => {
                const ev = r.events.find((e) => e.to === s);
                const on = !rejected && i <= reached;
                return (
                    <div key={s} className={cx('rounded-2xl border p-4', on ? 'border-green bg-green-soft' : 'border-line')}>
                        {on ? <CheckCircle2 className="text-green size-5" /> : <Circle className="text-muted size-5" />}
                        <div className="mt-2 text-sm font-bold">{t(`aid.status.${s}` as never)}</div>
                        {ev && <div className="text-muted text-xs">{dateTime(ev.at, lang)}</div>}
                    </div>
                );
            })}
        </div>
    );
}

export function AidDetail() {
    const { id } = useParams();
    const { t, lang } = useI18n();
    const [r, setR] = useState<AidRequest | null>(null);
    useEffect(() => {
        api.get(`/aid-requests/${id}`).then((x) => setR(x.data.request));
    }, [id]);
    if (!r) return <Container className="py-12"><div className="skeleton h-64 rounded-3xl" /></Container>;
    return (
        <Container className="max-w-4xl py-12">
            <PageHeader eyebrow={r.reference} title={r.title}><Pill tone={aidTone(r.status)}>{t(`aid.status.${r.status}` as never)}</Pill></PageHeader>
            {r.status === 'rejected' ? <div className="bg-rose-soft text-rose mb-6 rounded-2xl p-4 text-sm">{t('aid.rejected_p')}{r.decision_note && <div className="mt-1 font-semibold">{r.decision_note}</div>}</div> : <AidStatusTrack r={r} />}
            {r.approved_amount && <div className="bg-green-soft text-green-2 mt-6 rounded-2xl p-4 font-semibold">{t('aid.approved_amount', { amount: money(r.approved_amount, lang) })}{r.decision_note && <div className="mt-1 text-sm font-normal">{r.decision_note}</div>}</div>}
            <div className="card mt-6 space-y-3 p-6 text-sm">
                <p dir="auto" className="leading-7 whitespace-pre-line">{r.description}</p>
                <div className="text-muted flex flex-wrap gap-4"><span>{t(`aid.type.${r.type}` as never)}</span><span>{money(r.amount_requested, lang)}</span><span>{t('aid.family', { n: r.family_size })}</span><span>{r.city}</span></div>
                <div className="border-line border-t pt-3">
                    <div className="mb-2 font-semibold">{t('aid.documents')}</div>
                    {r.documents.map((d) => <a key={d.id} href={`/api/aid-documents/${d.id}`} target="_blank" rel="noreferrer" className="text-green me-4 inline-flex items-center gap-1"><FileLock2 className="size-4" />{d.name}</a>)}
                </div>
            </div>
        </Container>
    );
}

export function AidNew() {
    const { t } = useI18n();
    const meta = useMeta();
    const nav = useNavigate();
    const [f, setF] = useState({ type: 'medical', title: '', description: '', amount_requested: '', family_size: '1', city: '', phone: '', consent: false });
    const [docs, setDocs] = useState<{ file: File; kind: string }[]>([]);
    const [errors, setErrors] = useState<FieldErrors>({});
    const [busy, setBusy] = useState(false);
    const submit = async (e: FormEvent) => {
        e.preventDefault();
        setBusy(true);
        const fd = new FormData();
        Object.entries(f).forEach(([k, v]) => fd.append(k, k === 'consent' ? (v ? '1' : '0') : String(v)));
        docs.forEach((d, i) => {
            fd.append(`documents[${i}][file]`, d.file);
            fd.append(`documents[${i}][kind]`, d.kind);
        });
        try {
            const { data } = await api.post('/aid-requests', fd);
            nav(`/aid/${data.request.id}`, { replace: true });
        } catch (err) {
            setErrors(apiError(err).fields);
        } finally {
            setBusy(false);
        }
    };
    const docError = Object.entries(errors).find(([k]) => k.startsWith('documents'))?.[1];
    return (
        <Container className="max-w-3xl py-12">
            <PageHeader eyebrow={t('aid.eyebrow')} title={t('aid.new')} text={t('aid.new_text')} />
            <form onSubmit={submit} className="card grid gap-5 p-6 sm:grid-cols-2">
                <div className="sm:col-span-2">
                    <span className="label">{t('aid.kind')}</span>
                    <div className="flex flex-wrap gap-2">{meta.aid_types.map((x) => <button type="button" key={x} onClick={() => setF({ ...f, type: x })} className={cx('chip', f.type === x && 'chip-on')}>{t(`aid.type.${x}` as never)}</button>)}</div>
                </div>
                <div className="sm:col-span-2"><Field label={t('aid.f_title')} error={errors.title} required><input className="input" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field></div>
                <div className="sm:col-span-2"><Field label={t('aid.f_description')} error={errors.description} hint={t('aid.f_description_hint')} required><textarea className="input min-h-32" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field></div>
                <Field label={t('aid.f_amount')} error={errors.amount_requested} required><input className="input" type="number" min={100} value={f.amount_requested} onChange={(e) => setF({ ...f, amount_requested: e.target.value })} /></Field>
                <Field label={t('aid.f_family')} error={errors.family_size} required><input className="input" type="number" min={1} max={30} value={f.family_size} onChange={(e) => setF({ ...f, family_size: e.target.value })} /></Field>
                <Field label={t('aid.f_city')} error={errors.city} required><input className="input" value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} /></Field>
                <Field label={t('auth.phone')} error={errors.phone} required><input className="input" dir="ltr" type="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
                <div className="sm:col-span-2">
                    <span className="label">{t('aid.documents')} <span className="text-green">*</span></span>
                    <label className="border-line hover:border-green flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed p-6 text-center transition">
                        <Upload className="text-green size-7" />
                        <span className="text-sm font-semibold">{t('aid.upload')}</span>
                        <span className="text-muted text-xs">{t('aid.upload_hint')}</span>
                        <input type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.webp" className="sr-only" onChange={(e) => setDocs([...docs, ...[...(e.target.files ?? [])].map((file) => ({ file, kind: 'id' }))].slice(0, 6))} />
                    </label>
                    {docs.map((d, i) => (
                        <motion.div key={i} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="bg-surface-2 mt-2 flex items-center gap-3 rounded-xl p-2 text-sm">
                            <FileLock2 className="text-green size-4" /><span className="flex-1 truncate">{d.file.name}</span>
                            <select className="input w-auto py-1.5 text-xs" value={d.kind} onChange={(e) => setDocs(docs.map((x, j) => (j === i ? { ...x, kind: e.target.value } : x)))}>{meta.doc_kinds.map((k) => <option key={k} value={k}>{t(`aid.doc.${k}` as never)}</option>)}</select>
                            <button type="button" onClick={() => setDocs(docs.filter((_, j) => j !== i))} className="text-muted hover:text-rose p-1"><Trash2 className="size-4" /></button>
                        </motion.div>
                    ))}
                    {docError && <span className="text-rose mt-1 block text-xs">{docError}</span>}
                    <p className="text-muted mt-2 flex items-center gap-1.5 text-xs"><FileLock2 className="size-3.5" />{t('aid.encrypted')}</p>
                </div>
                <label className="flex items-start gap-2 text-sm sm:col-span-2"><input type="checkbox" checked={f.consent} onChange={(e) => setF({ ...f, consent: e.target.checked })} className="accent-[var(--green)] mt-1 size-4" /><span>{t('aid.consent')}{errors.consent && <span className="text-rose block text-xs">{errors.consent}</span>}</span></label>
                <div className="sm:col-span-2"><button className="btn btn-primary" disabled={busy}>{busy && <LoaderCircle className="size-4 animate-spin" />}{t('aid.submit')}</button></div>
            </form>
        </Container>
    );
}
