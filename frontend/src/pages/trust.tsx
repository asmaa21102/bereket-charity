import { Container } from '@/components/layout';
import { PageHeader } from '@/components/ui';
import { useI18n } from '@/i18n';
import { motion } from 'framer-motion';
import { CreditCard, FileLock2, KeyRound, ListChecks, Lock, ReceiptText, ShieldCheck, TriangleAlert } from 'lucide-react';
import { Link } from 'react-router-dom';

const ITEMS = [
    { k: 'ssl', icon: Lock },
    { k: 'pci', icon: CreditCard },
    { k: 'aes', icon: FileLock2 },
    { k: '2fa', icon: KeyRound },
    { k: 'audit', icon: ListChecks },
    { k: 'funds', icon: ReceiptText },
] as const;

export default function TrustPage() {
    const { t } = useI18n();
    return (
        <Container className="max-w-5xl py-12">
            <PageHeader eyebrow={t('trust.eyebrow')} title={t('trust.title')} text={t('trust.text')} />
            <div className="grid gap-4 sm:grid-cols-2">
                {ITEMS.map(({ k, icon: Icon }, i) => (
                    <motion.div key={k} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }} className="card p-6">
                        <span className="bg-green-soft text-green grid size-11 place-items-center rounded-2xl"><Icon className="size-5" /></span>
                        <h2 className="mt-4 font-bold">{t(`trust.${k}` as never)}</h2>
                        <p className="text-muted mt-1 text-sm leading-6">{t(`trust.${k}_p` as never)}</p>
                    </motion.div>
                ))}
            </div>
            <div className="bg-amber-soft text-amber mt-8 flex gap-3 rounded-3xl p-6 text-sm leading-6">
                <TriangleAlert className="size-5 shrink-0" />
                <div><div className="font-bold">{t('trust.demo_title')}</div><p>{t('trust.demo_p')}</p></div>
            </div>
            <div className="mt-8 flex flex-wrap gap-3"><Link to="/campaigns" className="btn btn-primary"><ShieldCheck className="size-4" />{t('home.see_campaigns')}</Link></div>
        </Container>
    );
}
