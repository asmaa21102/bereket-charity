import { Container } from '@/components/layout';
import { Field } from '@/components/ui';
import { useI18n } from '@/i18n';
import { api, apiError, type FieldErrors } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useMeta } from '@/lib/meta';
import { motion } from 'framer-motion';
import { HeartHandshake, KeyRound, LoaderCircle, ShieldCheck } from 'lucide-react';
import { type FormEvent, type ReactNode, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

function Shell({ title, sub, children }: { title: string; sub: string; children: ReactNode }) {
    const { t } = useI18n();
    return (
        <Container className="grid min-h-[75vh] place-items-center py-12">
            <div className="grid w-full max-w-4xl overflow-hidden rounded-[2rem] shadow-[var(--shadow-lift)] md:grid-cols-2">
                <div className="bg-navy relative hidden overflow-hidden p-10 text-white md:block">
                    <div className="absolute -end-20 -top-20 size-72 rounded-full bg-emerald-400/20 blur-2xl" />
                    <HeartHandshake className="size-12 text-emerald-300" />
                    <h2 className="mt-6 text-3xl leading-tight font-bold">{t('auth.side_title')}</h2>
                    <ul className="mt-6 space-y-3 text-sm text-white/80">
                        {(['auth.side1', 'auth.side2', 'auth.side3'] as const).map((k) => <li key={k} className="flex gap-2"><ShieldCheck className="size-4 shrink-0 text-emerald-300" />{t(k)}</li>)}
                    </ul>
                </div>
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="bg-surface p-8 sm:p-10">
                    <h1 className="text-2xl font-bold">{title}</h1>
                    <p className="text-muted mt-1 mb-6 text-sm">{sub}</p>
                    {children}
                </motion.div>
            </div>
        </Container>
    );
}

export function Login() {
    const { t } = useI18n();
    const meta = useMeta();
    const { setUser } = useAuth();
    const nav = useNavigate();
    const [params] = useSearchParams();
    const next = params.get('next')?.startsWith('/') ? params.get('next')! : '/wallet';
    const [form, setForm] = useState({ email: '', password: '', remember: true });
    const [code, setCode] = useState('');
    const [step, setStep] = useState<'password' | 'code'>('password');
    const [errors, setErrors] = useState<FieldErrors>({});
    const [busy, setBusy] = useState(false);

    const submit = async (e: FormEvent) => {
        e.preventDefault();
        setBusy(true);
        setErrors({});
        try {
            const { data } = step === 'password' ? await api.post('/auth/login', form) : await api.post('/auth/two-factor', { code });
            if (data.two_factor) return setStep('code');
            setUser(data.user);
            nav(next, { replace: true });
        } catch (err) {
            setErrors(apiError(err).fields);
        } finally {
            setBusy(false);
        }
    };
    const demo = (email: string, password: string) => setForm({ ...form, email, password });

    return (
        <Shell title={step === 'code' ? t('auth.code_title') : t('auth.login_title')} sub={step === 'code' ? t('auth.code_sub') : t('auth.login_sub')}>
            <form onSubmit={submit} className="space-y-4">
                {step === 'password' ? (
                    <>
                        <Field label={t('auth.email')} error={errors.email}><input className="input" type="email" dir="ltr" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></Field>
                        <Field label={t('auth.password')} error={errors.password}><input className="input" type="password" autoComplete="current-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required /></Field>
                        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.remember} onChange={(e) => setForm({ ...form, remember: e.target.checked })} className="accent-[var(--green)] size-4" />{t('auth.remember')}</label>
                    </>
                ) : (
                    <Field label={t('auth.code')} error={errors.code}>
                        <input className="input text-center font-mono text-2xl tracking-[0.5em]" dir="ltr" inputMode="numeric" autoComplete="one-time-code" maxLength={6} autoFocus value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} />
                    </Field>
                )}
                <button className="btn btn-primary w-full py-3.5" disabled={busy}>{busy ? <LoaderCircle className="size-5 animate-spin" /> : <KeyRound className="size-5" />}{step === 'code' ? t('auth.verify') : t('nav.login')}</button>
            </form>
            {step === 'password' && (
                <>
                    <p className="text-muted mt-5 text-center text-sm">{t('auth.no_account')} <Link to={`/register?next=${encodeURIComponent(next)}`} className="text-green font-semibold">{t('auth.register')}</Link></p>
                    {meta.demo && (
                        <div className="bg-surface-2 mt-6 rounded-2xl p-4 text-xs">
                            <p className="mb-2 font-semibold">{t('auth.demo')}</p>
                            <div className="flex flex-wrap gap-2">
                                {[['donor@bereket.test', 'Donor12345', t('auth.demo_donor')], ['aid@bereket.test', 'Aid12345', t('auth.demo_aid')], ['volunteer@bereket.test', 'Volunteer12345', t('auth.demo_vol')], ['staff@bereket.test', 'Staff12345', t('auth.demo_staff')], ['admin@bereket.test', 'Admin12345', t('auth.demo_admin')]].map(([e, p, l]) => (
                                    <button key={e} type="button" onClick={() => demo(e, p)} className="chip text-xs">{l}</button>
                                ))}
                            </div>
                        </div>
                    )}
                </>
            )}
        </Shell>
    );
}

export function Register() {
    const { t } = useI18n();
    const { setUser } = useAuth();
    const nav = useNavigate();
    const [params] = useSearchParams();
    const next = params.get('next')?.startsWith('/') ? params.get('next')! : '/wallet';
    const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', password_confirmation: '' });
    const [errors, setErrors] = useState<FieldErrors>({});
    const [busy, setBusy] = useState(false);
    const submit = async (e: FormEvent) => {
        e.preventDefault();
        setBusy(true);
        try {
            const { data } = await api.post('/auth/register', form);
            setUser(data.user);
            nav(next, { replace: true });
        } catch (err) {
            setErrors(apiError(err).fields);
        } finally {
            setBusy(false);
        }
    };
    const f = (k: keyof typeof form, label: string, type = 'text', ac = '', dir?: string) => (
        <Field label={label} error={errors[k]} required={k !== 'phone'}>
            <input className="input" type={type} autoComplete={ac} dir={dir} value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
        </Field>
    );
    return (
        <Shell title={t('auth.register_title')} sub={t('auth.register_sub')}>
            <form onSubmit={submit} className="space-y-4">
                {f('name', t('auth.name'), 'text', 'name')}
                {f('email', t('auth.email'), 'email', 'email', 'ltr')}
                {f('phone', t('auth.phone'), 'tel', 'tel', 'ltr')}
                <div className="grid gap-4 sm:grid-cols-2">
                    {f('password', t('auth.password'), 'password', 'new-password')}
                    {f('password_confirmation', t('auth.password_confirm'), 'password', 'new-password')}
                </div>
                <p className="text-muted text-xs">{t('auth.password_rule')}</p>
                <button className="btn btn-primary w-full py-3.5" disabled={busy}>{busy && <LoaderCircle className="size-5 animate-spin" />}{t('auth.register')}</button>
            </form>
            <p className="text-muted mt-5 text-center text-sm">{t('auth.have_account')} <Link to="/login" className="text-green font-semibold">{t('nav.login')}</Link></p>
        </Shell>
    );
}
