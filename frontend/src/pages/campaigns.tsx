import { CATEGORY_STYLE, CampaignCard, type CampaignCardData } from '@/components/campaign';
import { Container } from '@/components/layout';
import { Empty, PageHeader, SkeletonCards, cx } from '@/components/ui';
import { useI18n } from '@/i18n';
import { api } from '@/lib/api';
import { useMeta } from '@/lib/meta';
import { Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

export default function Campaigns() {
    const { t, lang } = useI18n();
    const meta = useMeta();
    const [params, setParams] = useSearchParams();
    const category = params.get('category') ?? '';
    const status = params.get('status') ?? 'active';
    const [q, setQ] = useState(params.get('q') ?? '');
    const [list, setList] = useState<CampaignCardData[] | null>(null);

    useEffect(() => {
        setList(null);
        const id = setTimeout(() => {
            api.get('/campaigns', { params: { category, status, q } }).then((r) => setList(r.data.campaigns));
        }, 250);
        return () => clearTimeout(id);
    }, [category, status, q, lang]);

    const set = (k: string, v: string) => {
        const p = new URLSearchParams(params);
        if (v) p.set(k, v);
        else p.delete(k);
        setParams(p, { replace: true });
    };

    return (
        <Container className="py-12">
            <PageHeader eyebrow={t('campaigns.eyebrow')} title={t('campaigns.title')} text={t('campaigns.text')} />
            <div className="mb-8 flex flex-col gap-4">
                <div className="relative max-w-md">
                    <Search className="text-muted pointer-events-none absolute inset-y-0 start-4 my-auto size-4" />
                    <input className="input ps-11" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('campaigns.search')} />
                </div>
                <div className="flex flex-wrap gap-2">
                    <button onClick={() => set('category', '')} className={cx('chip', !category && 'chip-on')}>{t('common.all')}</button>
                    {meta.categories.map((c) => {
                        const Icon = CATEGORY_STYLE[c]?.icon;
                        return (
                            <button key={c} onClick={() => set('category', c)} className={cx('chip', category === c && 'chip-on')}>
                                {Icon && <Icon className="size-4" />}
                                {t(`cat.${c}` as never)}
                            </button>
                        );
                    })}
                </div>
                <div className="bg-surface-2 inline-flex w-fit gap-1 rounded-2xl p-1">
                    {['active', 'completed', 'all'].map((s) => (
                        <button key={s} onClick={() => set('status', s === 'active' ? '' : s)} className={cx('rounded-xl px-4 py-2 text-sm font-semibold', status === s ? 'bg-surface shadow' : 'text-muted')}>
                            {t(`campaigns.status_${s}` as never)}
                        </button>
                    ))}
                </div>
            </div>
            {!list ? <SkeletonCards n={6} /> : list.length === 0 ? (
                <Empty icon={Search} title={t('campaigns.none')} text={t('campaigns.none_p')} />
            ) : (
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{list.map((c, i) => <CampaignCard key={c.id} c={c} index={i} />)}</div>
            )}
        </Container>
    );
}
