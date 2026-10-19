import { createContext, type ReactNode, useContext, useEffect, useState } from 'react';

// The donation cart: several campaigns (or general funds) paid in one checkout.
export type FundType = 'zakat' | 'sadaqah' | 'jariyah' | 'kaffarah' | 'general';
export type Frequency = 'once' | 'weekly' | 'monthly';
export type CartItem = {
    key: string;
    campaign_id: number | null;
    slug?: string;
    title?: string;
    category?: string;
    fund_type: FundType;
    amount: number;
    frequency: Frequency;
};

type Ctx = {
    items: CartItem[];
    add: (i: Omit<CartItem, 'key'>) => void;
    update: (key: string, patch: Partial<CartItem>) => void;
    remove: (key: string) => void;
    clear: () => void;
    total: number;
};
const Cart = createContext<Ctx | null>(null);

const read = (): CartItem[] => {
    try {
        const v = JSON.parse(localStorage.getItem('bk-cart') ?? '[]');
        return Array.isArray(v) ? v : [];
    } catch {
        return [];
    }
};

export function CartProvider({ children }: { children: ReactNode }) {
    const [items, setItems] = useState<CartItem[]>(read);
    useEffect(() => {
        try {
            localStorage.setItem('bk-cart', JSON.stringify(items));
        } catch {
            /* storage blocked: cart lasts for this visit */
        }
    }, [items]);
    const value: Ctx = {
        items,
        total: items.reduce((s, i) => s + i.amount, 0),
        add: (i) =>
            setItems((prev) => {
                // same campaign + fund + frequency → add up the amount
                const same = prev.find((p) => p.campaign_id === i.campaign_id && p.fund_type === i.fund_type && p.frequency === i.frequency);
                if (same) return prev.map((p) => (p === same ? { ...p, amount: p.amount + i.amount } : p));
                return [...prev, { ...i, key: Math.random().toString(36).slice(2) }];
            }),
        update: (key, patch) => setItems((prev) => prev.map((p) => (p.key === key ? { ...p, ...patch } : p))),
        remove: (key) => setItems((prev) => prev.filter((p) => p.key !== key)),
        clear: () => setItems([]),
    };
    return <Cart.Provider value={value}>{children}</Cart.Provider>;
}

export function useCart() {
    const c = useContext(Cart);
    if (!c) throw new Error('CartProvider missing');
    return c;
}
