import { Field, Modal, Pill, cx } from '@/components/ui';
import { useI18n } from '@/i18n';
import { api, apiError, type FieldErrors } from '@/lib/api';
import { date, dateTime, money } from '@/lib/format';
import { useMeta } from '@/lib/meta';
import { useToast } from '@/lib/toast';
import { FileLock2, Lock } from 'lucide-react';
import { type FormEvent, useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { type AidRequest, AidStatusTrack, aidTone } from '../account/aid';
import { AdminTitle } from './shell';

type Row = { id: number; reference: string; type: string; title: string; status: string; amount_requested: number; approved_amount: number | null; city: string; family_size: number; applicant: string | null; created_at: string; documents: number };

export function AdminAidList() {
    const { t, lang } = useI18n();
    const meta = useMeta();
    const [status, setStatus] = useState('');
    const [type, setType] = useState('');
    const [rows, setRows] = useState<Row[] | null>(null);
    useEffect(() => {
        api.get('/admin/aid-requests', { params: { status: status || undefined, type: type || undefined } }).then((r) => setRows(r.data.requests));
    }, [status, type]);
    return (
        <>
            <AdminTitle title={t('adm.nav.aid')} text={t('adm.a.p')} />
            <div className="mb-4 flex flex-wrap items-center gap-2">
                {['', 'submitted', 'under_review', 'approved', 'disbursed', 'rejected'].map((s) => <button key={s} onClick={() => setStatus(s)} className={cx('chip', status === s && 'chip-on')}>{s ? t(`aid.status.${s}` as never) : t('common.all')}</button>)}
                <select className="input ms-auto w-auto py-2" value={type} onChange={(e) => setType(e.target.value)}><option value="">{t('adm.a.all_types')}</option>{meta.aid_types.map((x) => <option key={x} value={x}>{t(`aid.type.${x}` as never)}</option>)}</select>
            </div>
            <div className="grid gap-3">
                {!rows && <div className="skeleton h-40 rounded-3xl" />}
                {rows?.length === 0 && <p className="card text-muted p-8 text-center text-sm">{t('adm.none')}</p>}
                {rows?.map((r) => (
                    <Link key={r.id} to={`/admin/aid/${r.id}`} className="card hover:border-green flex flex-wrap items-center gap-4 p-4 transition">
                        <div className="min-w-48 flex-1">
                            <div className="font-bold">{r.title}</div>
                            <div className="text-muted text-xs"><span dir="ltr" className="font-mono">{r.reference}</span> · {r.applicant} · {t(`aid.type.${r.type}` as never)} · {r.city} · {t('aid.family', { n: r.family_size })} · {date(r.created_at, lang)}</div>
                        </div>
                        <span className="text-muted inline-flex items-center gap-1 text-xs"><FileLock2 className="size-3.5" />{r.documents}</span>
                        <span className="font-semibold">{money(r.approved_amount ?? r.amount_requested, lang)}</span>
                        <Pill tone={aidTone(r.status)}>{t(`aid.status.${r.status}` as never)}</Pill>
                    </Link>
                ))}
            </div>
        </>
    );
}

type Full = AidRequest & { applicant: { name: string; email: string; previous: number }; reviewer: string | null; next: string[] };

export function AdminAidDetail() {
    const { id } = useParams();
    const { t, lang } = useI18n();
    const meta = useMeta();
    const toast = useToast();
    const [r, setR] = useState<Full | null>(null);
    const [action, setAction] = useState<string | null>(null);
    const [f, setF] = useState({ note: '', approved_amount: '', fund_type: 'zakat' });
    const [errors, setErrors] = useState<FieldErrors>({});
    const load = useCallback(() => api.get(`/admin/aid-requests/${id}`).then((x) => setR(x.data.request)), [id]);
    useEffect(() => {
        load();
    }, [load]);
    if (!r) return <div className="skeleton h-96 rounded-3xl" />;
    const open = (s: string) => {
        setErrors({});
        setF({ note: '', approved_amount: String(r.amount_requested), fund_type: r.fund_type ?? 'zakat' });
        setAction(s);
    };
    const submit = async (e: FormEvent) => {
        e.preventDefault();
        try {
            await api.post(`/admin/aid-requests/${id}/status`, { status: action, note: f.note || null, ...(action === 'approved' ? { approved_amount: f.approved_amount, fund_type: f.fund_type } : {}) });
            setAction(null);
            toast(t('common.saved'));
            load();
        } catch (er) {
            const x = apiError(er);
            setErrors(x.fields);
            if (!Object.keys(x.fields).length) toast(x.message, 'error');
        }
    };
    const btn = (s: string) => (s === 'rejected' ? 'btn-danger' : s === 'approved' || s === 'disbursed' ? 'btn-primary' : 'btn-ghost');
    return (
        <>
            <AdminTitle title={r.title} text={r.reference}><Link to="/admin/aid" className="btn btn-ghost">{t('adm.back')}</Link></AdminTitle>
            <div className="grid gap-6 xl:grid-cols-3">
                <div className="space-y-6 xl:col-span-2">
                    <AidStatusTrack r={r} />
                    <div className="card space-y-4 p-6 text-sm">
                        <div className="flex flex-wrap gap-2"><Pill tone={aidTone(r.status)}>{t(`aid.status.${r.status}` as never)}</Pill><Pill>{t(`aid.type.${r.type}` as never)}</Pill>{r.fund_type && <Pill tone="sky">{t(`fund.${r.fund_type}` as never)}</Pill>}</div>
                        <p dir="auto" className="leading-7 whitespace-pre-line">{r.description}</p>
                        <dl className="grid gap-3 sm:grid-cols-3">
                            <div><dt className="text-muted text-xs">{t('aid.f_amount')}</dt><dd className="font-semibold">{money(r.amount_requested, lang)}</dd></div>
                            <div><dt className="text-muted text-xs">{t('adm.a.approved')}</dt><dd className="font-semibold">{r.approved_amount ? money(r.approved_amount, lang) : '—'}</dd></div>
                            <div><dt className="text-muted text-xs">{t('aid.f_family')}</dt><dd className="font-semibold">{r.family_size}</dd></div>
                        </dl>
                        <div className="border-line border-t pt-4">
                            <div className="mb-2 flex items-center gap-1.5 font-semibold"><Lock className="text-green size-4" />{t('aid.documents')}</div>
                            <div className="grid gap-2 sm:grid-cols-2">
                                {r.documents.map((d) => <a key={d.id} href={`/api/aid-documents/${d.id}`} target="_blank" rel="noreferrer" className="border-line hover:border-green flex items-center gap-2 rounded-xl border p-3 transition"><FileLock2 className="text-green size-4" /><span className="flex-1 truncate">{d.name}</span><span className="text-muted text-xs">{t(`aid.doc.${d.kind}` as never)} · {Math.ceil(d.size / 1024)} KB</span></a>)}
                            </div>
                            <p className="text-muted mt-2 text-xs">{t('adm.a.docs_note')}</p>
                        </div>
                    </div>
                    <div className="card p-6">
                        <h2 className="mb-3 font-bold">{t('adm.a.history')}</h2>
                        <ol className="border-line space-y-3 border-s-2 ps-4 text-sm">
                            {r.events.map((e, i) => <li key={i}><div className="font-semibold">{t(`aid.status.${e.to}` as never)} <span className="text-muted text-xs font-normal">· {dateTime(e.at, lang)}{e.by && ` · ${e.by}`}</span></div>{e.note && <p className="text-muted">{e.note}</p>}</li>)}
                        </ol>
                    </div>
                </div>
                <aside className="space-y-4">
                    <div className="card p-5 text-sm">
                        <h2 className="mb-2 font-bold">{t('adm.a.applicant')}</h2>
                        <div className="font-medium">{r.applicant.name}</div>
                        <div className="text-muted" dir="ltr">{r.applicant.email}</div>
                        <div className="text-muted" dir="ltr">{r.phone}</div>
                        <div className="text-muted mt-1">{r.city}</div>
                        <div className="text-muted mt-2 text-xs">{t('adm.a.previous', { n: r.applicant.previous })}</div>
                        {r.reviewer && <div className="text-muted mt-1 text-xs">{t('adm.a.reviewer', { name: r.reviewer })}</div>}
                    </div>
                    {r.next.length > 0 && (
                        <div className="card space-y-2 p-5">
                            <h2 className="mb-1 font-bold">{t('adm.a.decide')}</h2>
                            {r.next.map((s) => <button key={s} onClick={() => open(s)} className={cx('btn w-full', btn(s))}>{t(`adm.a.to.${s}` as never)}</button>)}
                        </div>
                    )}
                </aside>
            </div>
            <Modal open={!!action} onClose={() => setAction(null)} title={action ? t(`adm.a.to.${action}` as never) : ''}>
                <form onSubmit={submit} className="grid gap-4">
                    {action === 'approved' && (
                        <>
                            <Field label={t('adm.a.approved')} error={errors.approved_amount} required><input className="input" type="number" min={1} value={f.approved_amount} onChange={(e) => setF({ ...f, approved_amount: e.target.value })} /></Field>
                            <Field label={t('adm.a.from_fund')} error={errors.fund_type} required><select className="input" value={f.fund_type} onChange={(e) => setF({ ...f, fund_type: e.target.value })}>{meta.fund_types.map((x) => <option key={x} value={x}>{t(`fund.${x}` as never)}</option>)}</select></Field>
                        </>
                    )}
                    {action === 'disbursed' && <p className="bg-green-soft text-green-2 rounded-xl p-3 text-sm">{t('adm.a.disburse_p', { amount: money(r.approved_amount ?? 0, lang), fund: t(`fund.${r.fund_type ?? 'general'}` as never) })}</p>}
                    <Field label={t('adm.a.note')} hint={t('adm.a.note_hint')} error={errors.note} required={action === 'rejected'}><textarea className="input min-h-24" value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} /></Field>
                    <button className={cx('btn', btn(action ?? ''))}>{t('adm.confirm')}</button>
                </form>
            </Modal>
        </>
    );
}
