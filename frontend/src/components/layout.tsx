import { cx } from '@/components/ui';
import { LANGS, useI18n } from '@/i18n';
import { api } from '@/lib/api';
import { isStaff, useAuth } from '@/lib/auth';
import { useCart } from '@/lib/cart';
import { money, timeAgo } from '@/lib/format';
import { useMeta } from '@/lib/meta';
import { useTheme } from '@/lib/theme';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, Calculator, ChevronDown, HandHeart, HeartHandshake, Languages, LayoutDashboard, LogOut, Menu, Moon, ShoppingBag, Sun, User, Wallet, X } from 'lucide-react';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate, useOutlet } from 'react-router-dom';

type Notice = { id: string; key: string; params: Record<string, string | number>; link: string | null; read: boolean; at: string };

/** Notification text in the reader's language. */
export function useNoticeText() {
    const { t, lang, has } = useI18n();
    return (n: Notice) => {
        const p: Record<string, string | number> = { ...n.params };
        if (typeof p.amount === 'number') p.amount = money(p.amount, lang);
        if (p.status && has(`aid.status.${p.status}`)) p.status = t(`aid.status.${p.status}` as never);
        if (p.status && has(`vol.status.${p.status}`) && n.key === 'volunteer_status') p.status = t(`vol.status.${p.status}` as never);
        if (p.badge && has(`badge.${p.badge}`)) p.badge = t(`badge.${p.badge}` as never);
        const k = has(`notif.${n.key}.title`) ? n.key : 'unknown';
        return { title: t(`notif.${k}.title` as never, p), body: t(`notif.${k}.body` as never, p), when: timeAgo(n.at, lang) };
    };
}

function Dropdown({ button, children, align = 'end' }: { button: (open: boolean) => ReactNode; children: (close: () => void) => ReactNode; align?: 'start' | 'end' }) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const out = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
        addEventListener('mousedown', out);
        return () => removeEventListener('mousedown', out);
    }, []);
    return (
        <div className="relative" ref={ref}>
            <div onClick={() => setOpen((o) => !o)}>{button(open)}</div>
            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: -6, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -6 }}
                        className={cx('card absolute top-full z-50 mt-2 min-w-56 overflow-hidden p-1.5', align === 'end' ? 'end-0' : 'start-0')}
                    >
                        {children(() => setOpen(false))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

const iconBtn = 'relative grid size-10 place-items-center rounded-2xl text-ink-2 transition hover:bg-surface-2 hover:text-ink';
const menuItem = 'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-ink-2 transition hover:bg-surface-2 hover:text-ink';

function Header() {
    const { t, lang, setLang } = useI18n();
    const { user, logout, setUser } = useAuth();
    const cart = useCart();
    const { dark, toggle } = useTheme();
    const nav = useNavigate();
    const [mobile, setMobile] = useState(false);
    const [notices, setNotices] = useState<Notice[] | null>(null);
    const noticeText = useNoticeText();
    const loc = useLocation();
    useEffect(() => setMobile(false), [loc.pathname]);

    const links = [
        { to: '/campaigns', label: t('nav.campaigns') },
        { to: '/donate', label: t('nav.quick') },
        { to: '/zakat', label: t('nav.zakat') },
        { to: '/volunteer', label: t('nav.volunteer') },
        { to: '/aid', label: t('nav.aid') },
    ];
    const loadNotices = async () => {
        const { data } = await api.get('/notifications');
        setNotices(data.notifications);
        if (data.unread && user) {
            await api.post('/notifications/read');
            setUser({ ...user, unread: 0 });
        }
    };

    return (
        <header className="bg-bg/80 border-line sticky top-0 z-40 border-b backdrop-blur-xl no-print">
            <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
                <Link to="/" className="flex items-center gap-2.5">
                    <img src="/app/favicon.svg" alt="" className="size-9" />
                    <span className="leading-tight">
                        <span className="font-display block text-lg font-bold">{t('brand.name')}</span>
                        <span className="text-muted block text-[11px]">{t('brand.tagline')}</span>
                    </span>
                </Link>
                <nav className="ms-4 hidden items-center gap-1 lg:flex">
                    {links.map((l) => (
                        <NavLink key={l.to} to={l.to} className={({ isActive }) => cx('rounded-xl px-3 py-2 text-sm font-medium transition', isActive ? 'bg-green-soft text-green-2' : 'text-ink-2 hover:bg-surface-2')}>
                            {l.label}
                        </NavLink>
                    ))}
                </nav>
                <div className="ms-auto flex items-center gap-1">
                    <Dropdown button={() => <button className={iconBtn} aria-label={t('nav.language')}><Languages className="size-5" /></button>}>
                        {(close) =>
                            LANGS.map((l) => (
                                <button key={l.code} onClick={() => (setLang(l.code), close())} className={cx(menuItem, l.code === lang && 'bg-green-soft text-green-2')} lang={l.code}>
                                    {l.label}
                                </button>
                            ))
                        }
                    </Dropdown>
                    <button className={iconBtn} onClick={toggle} aria-label={t('nav.theme')} title={t('nav.theme')}>
                        {dark ? <Sun className="size-5" /> : <Moon className="size-5" />}
                    </button>
                    <Link to="/checkout" className={iconBtn} aria-label={t('nav.cart')}>
                        <ShoppingBag className="size-5" />
                        <AnimatePresence>
                            {cart.items.length > 0 && (
                                <motion.span key={cart.items.length} initial={{ scale: 0 }} animate={{ scale: 1 }} className="bg-green absolute -end-0.5 -top-0.5 grid min-w-5 place-items-center rounded-full px-1 text-[11px] font-bold text-white">
                                    {cart.items.length}
                                </motion.span>
                            )}
                        </AnimatePresence>
                    </Link>
                    {user ? (
                        <>
                            <Dropdown button={() => (
                                <button className={iconBtn} aria-label={t('nav.notifications')} onClick={loadNotices}>
                                    <Bell className="size-5" />
                                    {user.unread > 0 && <span className="bg-rose absolute end-1.5 top-1.5 size-2.5 rounded-full ring-2 ring-[var(--bg)]" />}
                                </button>
                            )}>
                                {() => (
                                    <div className="w-80">
                                        <div className="px-3 py-2 text-sm font-bold">{t('nav.notifications')}</div>
                                        {!notices && <div className="skeleton m-2 h-16 rounded-xl" />}
                                        {notices?.length === 0 && <p className="text-muted px-3 py-6 text-center text-sm">{t('notif.none')}</p>}
                                        <div className="max-h-96 overflow-y-auto">
                                            {notices?.map((n) => {
                                                const x = noticeText(n);
                                                return (
                                                    <Link key={n.id} to={n.link ?? '#'} className={cx(menuItem, 'flex-col items-start gap-0.5', !n.read && 'bg-green-soft/40')}>
                                                        <span className="text-ink font-semibold">{x.title}</span>
                                                        <span className="text-muted text-xs">{x.body}</span>
                                                        <span className="text-muted text-[11px]">{x.when}</span>
                                                    </Link>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </Dropdown>
                            <Dropdown button={() => (
                                <button className="hover:bg-surface-2 flex items-center gap-2 rounded-2xl p-1 pe-2 transition">
                                    <span className="bg-navy grid size-8 place-items-center rounded-xl text-sm font-bold text-white">{user.name[0]}</span>
                                    <ChevronDown className="text-muted hidden size-4 sm:block" />
                                </button>
                            )}>
                                {(close) => (
                                    <>
                                        <div className="px-3 py-2">
                                            <div className="text-sm font-bold">{user.name}</div>
                                            <div className="text-muted text-xs">{user.email}</div>
                                        </div>
                                        <Link to="/wallet" onClick={close} className={menuItem}><Wallet className="size-4" />{t('nav.wallet')}</Link>
                                        <Link to="/aid" onClick={close} className={menuItem}><HandHeart className="size-4" />{t('nav.my_requests')}</Link>
                                        <Link to="/volunteer" onClick={close} className={menuItem}><HeartHandshake className="size-4" />{t('nav.volunteer')}</Link>
                                        <Link to="/account" onClick={close} className={menuItem}><User className="size-4" />{t('nav.account')}</Link>
                                        {isStaff(user) && <Link to="/admin" onClick={close} className={menuItem}><LayoutDashboard className="size-4" />{t('nav.admin')}</Link>}
                                        <button onClick={async () => (close(), await logout(), nav('/'))} className={cx(menuItem, 'text-rose')}><LogOut className="size-4" />{t('nav.logout')}</button>
                                    </>
                                )}
                            </Dropdown>
                        </>
                    ) : (
                        <Link to="/login" className="btn btn-navy ms-1 hidden px-4 py-2 sm:inline-flex">{t('nav.login')}</Link>
                    )}
                    <button className={cx(iconBtn, 'lg:hidden')} onClick={() => setMobile((m) => !m)} aria-label={t('nav.menu')}>
                        {mobile ? <X className="size-5" /> : <Menu className="size-5" />}
                    </button>
                </div>
            </div>
            <AnimatePresence>
                {mobile && (
                    <motion.nav initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="border-line overflow-hidden border-t lg:hidden">
                        <div className="flex flex-col gap-1 p-3">
                            {links.map((l) => (
                                <NavLink key={l.to} to={l.to} className={({ isActive }) => cx('rounded-xl px-3 py-3 font-medium', isActive ? 'bg-green-soft text-green-2' : 'text-ink-2')}>{l.label}</NavLink>
                            ))}
                            {!user && <Link to="/login" className="btn btn-navy mt-2">{t('nav.login')}</Link>}
                        </div>
                    </motion.nav>
                )}
            </AnimatePresence>
        </header>
    );
}

function Footer() {
    const { t } = useI18n();
    const meta = useMeta();
    return (
        <footer className="bg-navy mt-24 text-white no-print">
            <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-4">
                <div className="md:col-span-2">
                    <div className="flex items-center gap-2.5">
                        <img src="/app/favicon.svg" alt="" className="size-9" />
                        <span className="font-display text-xl font-bold">{t('brand.name')}</span>
                    </div>
                    <p className="mt-4 max-w-md text-sm leading-7 text-white/70">{t('footer.about')}</p>
                    {meta.demo && <p className="mt-4 inline-block rounded-xl bg-white/10 px-3 py-2 text-xs text-amber-200">{t('footer.demo')}</p>}
                </div>
                <div>
                    <h4 className="mb-3 text-sm font-bold text-white/60">{t('footer.give')}</h4>
                    <ul className="space-y-2 text-sm">
                        <li><Link to="/campaigns" className="text-white/80 hover:text-white">{t('nav.campaigns')}</Link></li>
                        <li><Link to="/donate" className="text-white/80 hover:text-white">{t('nav.quick')}</Link></li>
                        <li><Link to="/zakat" className="flex items-center gap-1.5 text-white/80 hover:text-white"><Calculator className="size-3.5" />{t('nav.zakat')}</Link></li>
                    </ul>
                </div>
                <div>
                    <h4 className="mb-3 text-sm font-bold text-white/60">{t('footer.help')}</h4>
                    <ul className="space-y-2 text-sm">
                        <li><Link to="/aid" className="text-white/80 hover:text-white">{t('nav.aid')}</Link></li>
                        <li><Link to="/volunteer" className="text-white/80 hover:text-white">{t('nav.volunteer')}</Link></li>
                        <li><Link to="/trust" className="text-white/80 hover:text-white">{t('nav.trust')}</Link></li>
                    </ul>
                </div>
            </div>
            <div className="border-t border-white/10 py-5 text-center text-xs text-white/50">© {new Date().getFullYear()} {t('brand.name')} · {t('footer.by')}</div>
        </footer>
    );
}

export function Layout() {
    const loc = useLocation();
    // Freeze the page element so the page that is fading out keeps showing itself, not the next page.
    const outlet = useOutlet();
    useEffect(() => window.scrollTo({ top: 0 }), [loc.pathname]);
    return (
        <div className="flex min-h-screen flex-col">
            <Header />
            <AnimatePresence mode="wait">
                <motion.main key={loc.pathname} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.25 }} className="flex-1">
                    {outlet}
                </motion.main>
            </AnimatePresence>
            <Footer />
        </div>
    );
}

export const Container = ({ children, className }: { children: ReactNode; className?: string }) => <div className={cx('mx-auto max-w-7xl px-4 sm:px-6', className)}>{children}</div>;
