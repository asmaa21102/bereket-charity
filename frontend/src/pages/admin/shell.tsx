import { Container } from '@/components/layout';
import { cx } from '@/components/ui';
import { useI18n } from '@/i18n';
import { useAuth } from '@/lib/auth';
import { useMeta } from '@/lib/meta';
import { BarChart3, ClipboardList, Coins, HandHeart, LayoutDashboard, Megaphone, Settings, ShieldAlert, Users, UsersRound } from 'lucide-react';
import { Suspense } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';

/** Admin area: a side menu (staff see requests and volunteers, admins see everything). */
export default function AdminShell() {
    const { t } = useI18n();
    const { user } = useAuth();
    const meta = useMeta();
    const admin = user?.role === 'admin';
    const items = [
        { to: '/admin', end: true, icon: LayoutDashboard, label: t('adm.nav.overview'), staff: true },
        { to: '/admin/campaigns', icon: Megaphone, label: t('adm.nav.campaigns') },
        { to: '/admin/donations', icon: Coins, label: t('adm.nav.donations') },
        { to: '/admin/finance', icon: BarChart3, label: t('adm.nav.finance') },
        { to: '/admin/aid', icon: HandHeart, label: t('adm.nav.aid'), staff: true },
        { to: '/admin/volunteers', icon: UsersRound, label: t('adm.nav.volunteers'), staff: true },
        { to: '/admin/users', icon: Users, label: t('adm.nav.users') },
        { to: '/admin/audit', icon: ClipboardList, label: t('adm.nav.audit') },
        { to: '/admin/settings', icon: Settings, label: t('adm.nav.settings') },
    ].filter((i) => admin || i.staff);

    return (
        <Container className="py-8">
            <div className="grid gap-6 lg:grid-cols-[230px_1fr]">
                <aside className="lg:sticky lg:top-24 lg:self-start">
                    <div className="text-muted mb-3 px-3 text-xs font-semibold tracking-wide uppercase">{t('adm.title')}</div>
                    <nav className="flex gap-1 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible">
                        {items.map((i) => (
                            <NavLink key={i.to} to={i.to} end={i.end} className={({ isActive }) => cx('flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition', isActive ? 'bg-green text-white' : 'text-ink-2 hover:bg-surface-2')}>
                                <i.icon className="size-4" />
                                {i.label}
                            </NavLink>
                        ))}
                    </nav>
                </aside>
                <div className="min-w-0">
                    {!user?.two_factor && (
                        <div className="bg-amber-soft text-amber mb-6 flex flex-wrap items-center gap-3 rounded-2xl p-4 text-sm">
                            <ShieldAlert className="size-5 shrink-0" />
                            <span className="flex-1">{meta.admin_2fa === 'required' ? t('adm.2fa_required') : t('adm.2fa_warning')}</span>
                            <Link to="/account" className="btn btn-ghost px-3 py-1.5">{t('account.2fa_enable')}</Link>
                        </div>
                    )}
                    <Suspense fallback={<div className="skeleton h-64 rounded-3xl" />}>
                        <Outlet />
                    </Suspense>
                </div>
            </div>
        </Container>
    );
}

export function AdminTitle({ title, text, children }: { title: string; text?: string; children?: React.ReactNode }) {
    return (
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div>
                <h1 className="text-2xl font-bold">{title}</h1>
                {text && <p className="text-muted mt-1 text-sm">{text}</p>}
            </div>
            {children}
        </div>
    );
}

export function Stat({ label, value, sub, tone = 'green' }: { label: string; value: string; sub?: string; tone?: 'green' | 'amber' | 'sky' | 'rose' }) {
    const tones = { green: 'text-green', amber: 'text-amber', sky: 'text-sky', rose: 'text-rose' };
    return (
        <div className="card p-5">
            <div className="text-muted text-xs font-medium">{label}</div>
            <div className={cx('mt-1 text-2xl font-bold', tones[tone])}>{value}</div>
            {sub && <div className="text-muted mt-1 text-xs">{sub}</div>}
        </div>
    );
}

/** Builds a query string from non-empty values. */
export const qs = (o: Record<string, string | number | undefined | null>) => new URLSearchParams(Object.entries(o).filter(([, v]) => v !== '' && v != null).map(([k, v]) => [k, String(v)])).toString();

export const FUND_COLORS: Record<string, string> = { zakat: '#0f9d6b', sadaqah: '#f59e0b', jariyah: '#38bdf8', kaffarah: '#a78bfa', general: '#64748b' };
