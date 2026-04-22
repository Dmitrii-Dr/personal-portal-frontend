import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Box, Typography, CircularProgress, Alert } from '@mui/material';
import BlogDocumentViewer from '../components/blog-editor/BlogDocumentViewer';

const isJsonContent = (content) => {
    if (!content || typeof content !== 'string') return false;
    return content.trimStart().startsWith('{');
};

function renderAgreementBody(content) {
    if (isJsonContent(content)) {
        try {
            JSON.parse(content);
            return <BlogDocumentViewer content={content} />;
        } catch {
            return (
                <Alert severity="warning">
                    Unable to render agreement content (invalid format).
                </Alert>
            );
        }
    }
    return (
        <Typography
            component="div"
            sx={{
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                overflowWrap: 'anywhere',
            }}
            dangerouslySetInnerHTML={{ __html: content }}
        />
    );
}

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
            <Box sx={{ py: { xs: 1, sm: 2 }, display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column', gap: 2, minHeight: '35vh' }}>
                <CircularProgress />
                <Typography variant="body2" color="text.secondary">
                    {t('agreementPage.loading')}
                </Typography>
            </Box>
        );
    }

    if (hasLoadError || !agreement) {
        return (
            <Box sx={{ py: { xs: 1, sm: 2 }, maxWidth: 800, mx: 'auto' }}>
                <Alert severity="warning">{t('agreementPage.noSuchDocument')}</Alert>
            </Box>
        );
    }

    return (
        <Box sx={{ py: { xs: 1, sm: 2 }, maxWidth: 800, mx: 'auto' }}>
            <Typography variant="h4" component="h1" gutterBottom sx={{ mb: 2 }}>
                {agreement.name}
            </Typography>
            <Box
                sx={{
                    '& img': {
                        maxWidth: '100%',
                        height: 'auto',
                    },
                    '& table': {
                        display: 'block',
                        width: '100%',
                        overflowX: 'auto',
                    },
                    '& pre': {
                        overflow: 'auto',
                    },
                }}
            >
                {renderAgreementBody(agreement.content)}
            </Box>
        </Box>
    );
};

export default AgreementPage;
