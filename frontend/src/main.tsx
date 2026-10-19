import { Layout } from '@/components/layout';
import { I18nProvider } from '@/i18n';
import { AuthProvider, isStaff, useAuth } from '@/lib/auth';
import { CartProvider } from '@/lib/cart';
import { MetaProvider } from '@/lib/meta';
import { ToastProvider } from '@/lib/toast';
import { lazy, StrictMode, Suspense, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import './index.css';
import AccountPage from './pages/account/account';
import { AidDetail, AidList, AidNew } from './pages/account/aid';
import DonationPage from './pages/account/donation';
import VolunteerPage from './pages/account/volunteer';
import WalletPage from './pages/account/wallet';
import { Login, Register } from './pages/auth';
import CampaignPage from './pages/campaign';
import Campaigns from './pages/campaigns';
import Checkout from './pages/checkout';
import Home from './pages/home';
import NotFound from './pages/not-found';
import QuickDonate from './pages/quick-donate';
import ThankYou, { GiftPage, ReceiptPage } from './pages/thank-you';
import TrustPage from './pages/trust';
import Zakat from './pages/zakat';

// The administration (and its charts) loads only when a staff member opens it.
const AdminShell = lazy(() => import('./pages/admin/shell'));
const AdminOverview = lazy(() => import('./pages/admin/overview'));
const AdminAidList = lazy(() => import('./pages/admin/aid').then((m) => ({ default: m.AdminAidList })));
const AdminAidDetail = lazy(() => import('./pages/admin/aid').then((m) => ({ default: m.AdminAidDetail })));
const AdminCampaigns = lazy(() => import('./pages/admin/campaigns').then((m) => ({ default: m.AdminCampaigns })));
const AdminCampaignForm = lazy(() => import('./pages/admin/campaigns').then((m) => ({ default: m.AdminCampaignForm })));
const AdminDonations = lazy(() => import('./pages/admin/finance').then((m) => ({ default: m.AdminDonations })));
const AdminFinance = lazy(() => import('./pages/admin/finance').then((m) => ({ default: m.AdminFinance })));
const AdminVolunteers = lazy(() => import('./pages/admin/people').then((m) => ({ default: m.AdminVolunteers })));
const AdminUsers = lazy(() => import('./pages/admin/people').then((m) => ({ default: m.AdminUsers })));
const AdminAudit = lazy(() => import('./pages/admin/people').then((m) => ({ default: m.AdminAudit })));
const AdminSettings = lazy(() => import('./pages/admin/people').then((m) => ({ default: m.AdminSettings })));

const Wait = () => <div className="mx-auto max-w-7xl px-4 py-12"><div className="skeleton h-64 rounded-3xl" /></div>;

function RequireAuth({ children }: { children: ReactNode }) {
    const { user, ready } = useAuth();
    const loc = useLocation();
    if (!ready) return <Wait />;
    if (!user) return <Navigate to={`/login?next=${encodeURIComponent(loc.pathname + loc.search)}`} replace />;
    return children;
}

function RequireStaff({ children, admin }: { children: ReactNode; admin?: boolean }) {
    const { user, ready } = useAuth();
    const loc = useLocation();
    if (!ready) return <Wait />;
    if (!user) return <Navigate to={`/login?next=${encodeURIComponent(loc.pathname)}`} replace />;
    if (admin ? user.role !== 'admin' : !isStaff(user)) return <NotFound />;
    return children;
}

const auth = (el: ReactNode) => <RequireAuth>{el}</RequireAuth>;
const adminOnly = (el: ReactNode) => <RequireStaff admin>{el}</RequireStaff>;

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <I18nProvider>
            <MetaProvider>
                <AuthProvider>
                    <CartProvider>
                        <ToastProvider>
                            <BrowserRouter>
                                <Routes>
                                    <Route element={<Layout />}>
                                        <Route index element={<Home />} />
                                        <Route path="campaigns" element={<Campaigns />} />
                                        <Route path="campaigns/:slug" element={<CampaignPage />} />
                                        <Route path="donate" element={<QuickDonate />} />
                                        <Route path="checkout" element={<Checkout />} />
                                        <Route path="thank-you/:id" element={<ThankYou />} />
                                        <Route path="receipt/:id" element={<ReceiptPage />} />
                                        <Route path="gift/:token" element={<GiftPage />} />
                                        <Route path="zakat" element={<Zakat />} />
                                        <Route path="trust" element={<TrustPage />} />
                                        <Route path="login" element={<Login />} />
                                        <Route path="register" element={<Register />} />
                                        <Route path="volunteer" element={<VolunteerPage />} />
                                        <Route path="wallet" element={auth(<WalletPage />)} />
                                        <Route path="wallet/donations/:id" element={auth(<DonationPage />)} />
                                        <Route path="account" element={auth(<AccountPage />)} />
                                        <Route path="aid" element={auth(<AidList />)} />
                                        <Route path="aid/new" element={auth(<AidNew />)} />
                                        <Route path="aid/:id" element={auth(<AidDetail />)} />
                                        <Route path="admin" element={<RequireStaff><Suspense fallback={<Wait />}><AdminShell /></Suspense></RequireStaff>}>
                                            <Route index element={<AdminOverview />} />
                                            <Route path="aid" element={<AdminAidList />} />
                                            <Route path="aid/:id" element={<AdminAidDetail />} />
                                            <Route path="volunteers" element={<AdminVolunteers />} />
                                            <Route path="campaigns" element={adminOnly(<AdminCampaigns />)} />
                                            <Route path="campaigns/:id" element={adminOnly(<AdminCampaignForm />)} />
                                            <Route path="donations" element={adminOnly(<AdminDonations />)} />
                                            <Route path="finance" element={adminOnly(<AdminFinance />)} />
                                            <Route path="users" element={adminOnly(<AdminUsers />)} />
                                            <Route path="audit" element={adminOnly(<AdminAudit />)} />
                                            <Route path="settings" element={adminOnly(<AdminSettings />)} />
                                        </Route>
                                        <Route path="*" element={<NotFound />} />
                                    </Route>
                                </Routes>
                            </BrowserRouter>
                        </ToastProvider>
                    </CartProvider>
                </AuthProvider>
            </MetaProvider>
        </I18nProvider>
    </StrictMode>,
);
