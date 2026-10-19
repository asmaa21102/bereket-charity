import { Container } from '@/components/layout';
import { Field, PageHeader, Pill, cx } from '@/components/ui';
import { useI18n } from '@/i18n';
import { api, apiError, type FieldErrors } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { date } from '@/lib/format';
import { useMeta } from '@/lib/meta';
import { useToast } from '@/lib/toast';
import { CalendarDays, CheckCircle2, HeartHandshake, MapPin } from 'lucide-react';
import { type FormEvent, useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

type Task = { id: number; title: string; description: string | null; location: string | null; date: string; status: string; campaign: { slug: string; title: string } | null };

export default function VolunteerPage() {
    const { t, lang } = useI18n();
    const { user } = useAuth();
    const meta = useMeta();
    const toast = useToast();
    const [data, setData] = useState<{ application: { skills: string[]; availability: string; city: string; status: string } | null; tasks: Task[] } | null>(null);
    const [f, setF] = useState({ skills: [] as string[], availability: 'weekends', city: '', motivation: '' });
    const [errors, setErrors] = useState<FieldErrors>({});
    const load = useCallback(() => api.get('/volunteer').then((r) => setData(r.data)), []);
    useEffect(() => {
        if (user) load();
    }, [user, load]);

    if (!user) {
        return (
            <Container className="py-16 text-center">
                <HeartHandshake className="text-green mx-auto size-14" />
                <h1 className="mt-4 text-3xl font-bold">{t('vol.title')}</h1>
                <p className="text-muted mx-auto mt-2 max-w-lg">{t('vol.text')}</p>
                <Link to="/login?next=/volunteer" className="btn btn-primary mt-6">{t('vol.login')}</Link>
            </Container>
        );
    }
    const apply = async (e: FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/volunteer', f);
            toast(t('vol.sent'));
            load();
        } catch (err) {
            setErrors(apiError(err).fields);
        }
    };
    const app = data?.application;

    return (
        <Container className="max-w-4xl py-12">
            <PageHeader eyebrow={t('vol.eyebrow')} title={t('vol.title')} text={t('vol.text')} />
            {app ? (
                <div className="card mb-8 flex flex-wrap items-center gap-3 p-5">
                    <span className="font-semibold">{t('vol.your_app')}</span>
                    <Pill tone={app.status === 'approved' ? 'green' : app.status === 'rejected' ? 'rose' : 'amber'}>{t(`vol.status.${app.status}` as never)}</Pill>
                    <span className="text-muted text-sm">{app.skills.map((s) => t(`skill.${s}` as never)).join(' · ')} · {app.city}</span>
                </div>
            ) : data && (
                <form onSubmit={apply} className="card mb-8 grid gap-5 p-6 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                        <span className="label">{t('vol.skills')}</span>
                        <div className="flex flex-wrap gap-2">{meta.skills.map((s) => <button type="button" key={s} onClick={() => setF({ ...f, skills: f.skills.includes(s) ? f.skills.filter((x) => x !== s) : [...f.skills, s] })} className={cx('chip', f.skills.includes(s) && 'chip-on')}>{t(`skill.${s}` as never)}</button>)}</div>
                        {errors.skills && <span className="text-rose mt-1 block text-xs">{errors.skills}</span>}
                    </div>
                    <Field label={t('vol.availability')}><select className="input" value={f.availability} onChange={(e) => setF({ ...f, availability: e.target.value })}>{['weekdays', 'weekends', 'evenings', 'flexible'].map((a) => <option key={a} value={a}>{t(`vol.av.${a}` as never)}</option>)}</select></Field>
                    <Field label={t('aid.f_city')} error={errors.city} required><input className="input" value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} /></Field>
                    <div className="sm:col-span-2"><Field label={t('vol.motivation')}><textarea className="input min-h-24" value={f.motivation} onChange={(e) => setF({ ...f, motivation: e.target.value })} /></Field></div>
                    <div><button className="btn btn-primary">{t('vol.apply')}</button></div>
                </form>
            )}
            <h2 className="mb-4 text-xl font-bold">{t('vol.tasks')}</h2>
            {data?.tasks.length === 0 && <p className="text-muted text-sm">{t('vol.no_tasks')}</p>}
            <div className="grid gap-3">
                {data?.tasks.map((x) => (
                    <div key={x.id} className="card flex flex-wrap items-center gap-4 p-5">
                        <div className="flex-1">
                            <div className="font-bold">{x.title}</div>
                            {x.description && <p className="text-muted text-sm">{x.description}</p>}
                            <div className="text-muted mt-1 flex flex-wrap gap-3 text-xs"><span><CalendarDays className="me-1 inline size-3.5" />{date(x.date, lang)}</span>{x.location && <span><MapPin className="me-1 inline size-3.5" />{x.location}</span>}{x.campaign && <Link to={`/campaigns/${x.campaign.slug}`} className="text-green">{x.campaign.title}</Link>}</div>
                        </div>
                        {x.status === 'done' ? <Pill tone="green"><CheckCircle2 className="size-3.5" />{t('vol.done')}</Pill> : <button onClick={async () => { await api.post(`/volunteer/tasks/${x.id}/done`); toast(t('vol.thanks')); load(); }} className="btn btn-primary px-4 py-2">{t('vol.mark_done')}</button>}
                    </div>
                ))}
            </div>
        </Container>
    );
}
