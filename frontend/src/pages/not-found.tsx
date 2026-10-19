import { Container } from '@/components/layout';
import { useI18n } from '@/i18n';
import { Compass } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function NotFound() {
    const { t } = useI18n();
    return (
        <Container className="py-24 text-center">
            <Compass className="text-green mx-auto size-14" />
            <h1 className="mt-4 text-3xl font-bold">{t('nf.title')}</h1>
            <p className="text-muted mt-2">{t('nf.text')}</p>
            <Link to="/" className="btn btn-primary mt-6">{t('nf.home')}</Link>
        </Container>
    );
}
