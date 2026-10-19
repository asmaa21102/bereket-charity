import { api } from '@/lib/api';
import { createContext, type ReactNode, useCallback, useContext, useEffect, useState } from 'react';

export type User = {
    id: number;
    name: string;
    email: string;
    phone: string | null;
    role: 'user' | 'volunteer' | 'staff' | 'admin';
    locale: string;
    two_factor: boolean;
    is_volunteer: boolean;
    unread: number;
    created_at: string;
};

type Ctx = { user: User | null; ready: boolean; setUser: (u: User | null) => void; refresh: () => Promise<void>; logout: () => Promise<void> };
const Auth = createContext<Ctx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [ready, setReady] = useState(false);
    const refresh = useCallback(async () => {
        try {
            const { data } = await api.get('/auth/me');
            setUser(data.user);
        } catch {
            setUser(null);
        } finally {
            setReady(true);
        }
    }, []);
    const logout = useCallback(async () => {
        await api.post('/auth/logout').catch(() => {});
        setUser(null);
    }, []);
    useEffect(() => {
        refresh();
    }, [refresh]);
    return <Auth.Provider value={{ user, ready, setUser, refresh, logout }}>{children}</Auth.Provider>;
}

export function useAuth() {
    const c = useContext(Auth);
    if (!c) throw new Error('AuthProvider missing');
    return c;
}

export const isStaff = (u: User | null) => !!u && (u.role === 'staff' || u.role === 'admin');
