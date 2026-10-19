import { DonatePanel } from '@/components/donate-panel';
import { Container } from '@/components/layout';
import { PageHeader, cx } from '@/components/ui';
import { useI18n } from '@/i18n';
import { type FundType } from '@/lib/cart';
import { HandCoins, Landmark, Leaf, Scale, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';

const FUNDS: { k: FundType; icon: typeof Leaf }[] = [
    { k: 'sadaqah', icon: HandCoins },
    { k: 'zakat', icon: Landmark },
    { k: 'jariyah', icon: Leaf },
    { k: 'kaffarah', icon: Scale },
    { k: 'general', icon: Sparkles },
];

export default function QuickDonate() {
    const { t } = useI18n();
    const [params] = useSearchParams();
    const [fund, setFund] = useState<FundType>((params.get('fund') as FundType) || 'sadaqah');
    const amount = Number(params.get('amount')) || undefined;
    return (
        <Container className="py-12">
            <PageHeader eyebrow={t('quick.eyebrow')} title={t('quick.title')} text={t('quick.text')} />
            <div className="grid gap-8 lg:grid-cols-[1fr_420px]">
                <div className="grid content-start gap-3 sm:grid-cols-2">
                    {FUNDS.map((f) => (
                        <button key={f.k} onClick={() => setFund(f.k)} className={cx('card flex items-start gap-4 p-5 text-start transition hover:-translate-y-0.5', fund === f.k && 'ring-green ring-2')}>
                            <span className={cx('grid size-12 shrink-0 place-items-center rounded-2xl', fund === f.k ? 'bg-green text-white' : 'bg-green-soft text-green')}><f.icon className="size-6" /></span>
                            <span>
                                <span className="block font-bold">{t(`fund.${f.k}` as never)}</span>
                                <span className="text-muted mt-1 block text-sm leading-6">{t(`fund.${f.k}.hint` as never)}</span>
                            </span>
                        </button>
                    ))}
                </div>
                <div className="card p-6 shadow-[var(--shadow-lift)]">
                    <h2 className="mb-4 text-xl font-bold">{t(`fund.${fund}` as never)}</h2>
                    <DonatePanel key={fund} defaultFund={fund} defaultAmount={amount} lockFund />
                </div>
            </div>
        </Container>
    );
}
