import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Box, Typography, Container, Paper, CircularProgress, Alert } from '@mui/material';

const AgreementPage = () => {
    const { slug } = useParams();
    const { t } = useTranslation();
    const [agreement, setAgreement] = useState(null);
    const [loading, setLoading] = useState(true);
    const [hasLoadError, setHasLoadError] = useState(false);

    useEffect(() => {
        let isMounted = true;
        const controller = new AbortController();

        const fetchAgreement = async () => {
            if (!slug) {
                if (!isMounted) return;
                setHasLoadError(true);
                setLoading(false);
                return;
            }

            try {
                if (!isMounted) return;
                setLoading(true);
                setHasLoadError(false);
                setAgreement(null);

                const response = await fetch(`/api/v1/public/agreements/slug/${slug}`, {
                    signal: controller.signal,
                });

                if (!response.ok) {
                    throw new Error('Failed to load agreement');
                }

                const data = await response.json();
                if (!isMounted) return;
                setAgreement(data);
            } catch (err) {
                if (err.name === 'AbortError' || err.name === 'CanceledError' || err.code === 'ERR_CANCELED') {
                    return;
                }
                console.error('Error fetching agreement:', err);
                if (!isMounted) return;
                setHasLoadError(true);
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        fetchAgreement();

        return () => {
            isMounted = false;
            controller.abort();
        };
    }, [slug]);

    if (loading) {
        return (
            <Container maxWidth="md" sx={{ py: 4, display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column', gap: 2 }}>
                <CircularProgress />
                <Typography variant="body2" color="text.secondary">
                    {t('agreementPage.loading')}
                </Typography>
            </Container>
        );
    }

    if (hasLoadError || !agreement) {
        return (
            <Container maxWidth="md" sx={{ py: 4 }}>
                <Alert severity="warning">{t('agreementPage.noSuchDocument')}</Alert>
            </Container>
        );
    }

    return (
        <Container maxWidth="md" sx={{ py: 4 }}>
            <Paper sx={{ p: 4 }}>
                <Typography variant="h4" component="h1" gutterBottom>
                    {agreement.name}
                </Typography>
                <Box sx={{ mt: 2 }}>
                    <Typography
                        component="div"
                        sx={{ whiteSpace: 'pre-wrap' }}
                        dangerouslySetInnerHTML={{ __html: agreement.content }}
                    />
                </Box>
            </Paper>
        </Container>
    );
};

export default AgreementPage;
