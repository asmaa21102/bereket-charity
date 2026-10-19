import { Container } from '@/components/layout';
import { Field, PageHeader } from '@/components/ui';
import { LANGS, useI18n } from '@/i18n';
import { api, apiError, type FieldErrors } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';
import { KeyRound, LoaderCircle, ShieldCheck, ShieldOff, User } from 'lucide-react';
import { type FormEvent, useState } from 'react';

export default function AccountPage() {
    const { t, lang, setLang } = useI18n();
    const { user, setUser } = useAuth();
    const toast = useToast();
    const [p, setP] = useState({ name: user!.name, email: user!.email, phone: user!.phone ?? '', locale: user!.locale || lang });
    const [pw, setPw] = useState({ current_password: '', password: '', password_confirmation: '' });
    const [errors, setErrors] = useState<FieldErrors>({});
    const [setup, setSetup] = useState<{ secret: string; qr: string } | null>(null);
    const [code, setCode] = useState('');
    const [busy, setBusy] = useState('');

    const run = async (key: string, fn: () => Promise<void>) => {
        setBusy(key);
        setErrors({});
        try {
            await fn();
        } catch (err) {
            const x = apiError(err);
            setErrors(x.fields);
            if (!Object.keys(x.fields).length) toast(x.message, 'error');
        } finally {
            setBusy('');
        }
    };
    const saveProfile = (e: FormEvent) => (e.preventDefault(), run('p', async () => {
        const { data } = await api.patch('/account', p);
        setUser(data.user);
        if (p.locale !== lang) setLang(p.locale as never);
        toast(t('common.saved'));
    }));
    const savePw = (e: FormEvent) => (e.preventDefault(), run('pw', async () => {
        await api.put('/account/password', pw);
        setPw({ current_password: '', password: '', password_confirmation: '' });
        toast(t('account.pw_saved'));
    }));

    return (
        <Container className="max-w-4xl py-12">
            <PageHeader title={t('account.title')} />
            <div className="grid gap-6">
                <form onSubmit={saveProfile} className="card grid gap-4 p-6 sm:grid-cols-2">
                    <h2 className="flex items-center gap-2 text-lg font-bold sm:col-span-2"><User className="text-green size-5" />{t('account.profile')}</h2>
                    <Field label={t('auth.name')} error={errors.name}><input className="input" value={p.name} onChange={(e) => setP({ ...p, name: e.target.value })} /></Field>
                    <Field label={t('auth.email')} error={errors.email}><input className="input" dir="ltr" type="email" value={p.email} onChange={(e) => setP({ ...p, email: e.target.value })} /></Field>
                    <Field label={t('auth.phone')} error={errors.phone}><input className="input" dir="ltr" type="tel" value={p.phone} onChange={(e) => setP({ ...p, phone: e.target.value })} /></Field>
                    <Field label={t('account.language')}><select className="input" value={p.locale} onChange={(e) => setP({ ...p, locale: e.target.value })}>{LANGS.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}</select></Field>
                    <div className="sm:col-span-2"><button className="btn btn-primary" disabled={busy === 'p'}>{busy === 'p' && <LoaderCircle className="size-4 animate-spin" />}{t('common.save')}</button></div>
                </form>

                <form onSubmit={savePw} className="card grid gap-4 p-6 sm:grid-cols-3">
                    <h2 className="flex items-center gap-2 text-lg font-bold sm:col-span-3"><KeyRound className="text-green size-5" />{t('account.password')}</h2>
                    <Field label={t('account.current')} error={errors.current_password}><input className="input" type="password" autoComplete="current-password" value={pw.current_password} onChange={(e) => setPw({ ...pw, current_password: e.target.value })} /></Field>
                    <Field label={t('account.new')} error={errors.password}><input className="input" type="password" autoComplete="new-password" value={pw.password} onChange={(e) => setPw({ ...pw, password: e.target.value })} /></Field>
                    <Field label={t('auth.password_confirm')}><input className="input" type="password" autoComplete="new-password" value={pw.password_confirmation} onChange={(e) => setPw({ ...pw, password_confirmation: e.target.value })} /></Field>
                    <div className="sm:col-span-3"><button className="btn btn-ghost" disabled={busy === 'pw'}>{t('account.change_pw')}</button></div>
                </form>

                <section className="card p-6">
                    <h2 className="flex items-center gap-2 text-lg font-bold"><ShieldCheck className="text-green size-5" />{t('account.2fa')}</h2>
                    <p className="text-muted mt-1 text-sm leading-6">{t('account.2fa_p')}</p>
                    {user!.two_factor ? (
                        <div className="mt-4 flex flex-wrap items-center gap-3">
                            <span className="bg-green-soft text-green-2 rounded-xl px-3 py-2 text-sm font-semibold">{t('account.2fa_on')}</span>
                            <button className="btn btn-danger" onClick={() => {
                                const password = prompt(t('account.2fa_disable_pw'));
                                if (password) run('off', async () => { const { data } = await api.delete('/account/two-factor', { data: { password } }); setUser(data.user); toast(t('account.2fa_off')); });
                            }}><ShieldOff className="size-4" />{t('account.2fa_disable')}</button>
                        </div>
                    ) : setup ? (
                        <div className="mt-5 grid items-center gap-6 sm:grid-cols-[220px_1fr]">
                            <div className="rounded-2xl bg-white p-3" dangerouslySetInnerHTML={{ __html: setup.qr }} />
                            <div className="space-y-3">
                                <p className="text-sm">{t('account.2fa_scan')}</p>
                                <code dir="ltr" className="bg-surface-2 block rounded-xl p-2 font-mono text-xs break-all">{setup.secret}</code>
                                <Field label={t('auth.code')} error={errors.code}><input className="input w-40 text-center font-mono tracking-widest" dir="ltr" inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} /></Field>
                                <button className="btn btn-primary" disabled={code.length !== 6 || busy === 'c'} onClick={() => run('c', async () => { const { data } = await api.post('/account/two-factor', { code }); setUser(data.user); setSetup(null); toast(t('account.2fa_enabled')); })}>{t('auth.verify')}</button>
                            </div>
                        </div>
                    ) : (
                        <button className="btn btn-navy mt-4" onClick={() => run('s', async () => setSetup((await api.get('/account/two-factor')).data))}>{t('account.2fa_enable')}</button>
                    )}
                </section>
            </div>
        </Container>
    );
}
