import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Box, Typography, Container, Paper, CircularProgress, Alert } from '@mui/material';

const AgreementPage = () => {
    const { slug } = useParams();
    const [agreement, setAgreement] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchAgreement = async () => {
            if (!slug) {
                setError('Agreement not found');
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                setError('');

                const response = await fetch(`/api/v1/public/agreements/slug/${slug}`);

                if (!response.ok) {
                    if (response.status === 404) {
                        throw new Error('Agreement not found');
                    }
                    throw new Error(`Failed to load agreement: ${response.status}`);
                }

                const data = await response.json();
                setAgreement(data);
            } catch (err) {
                console.error('Error fetching agreement:', err);
                setError(err.message || 'Failed to load agreement');
            } finally {
                setLoading(false);
            }
        };

        fetchAgreement();
    }, [slug]);

    if (loading) {
        return (
            <Container maxWidth="md" sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
                <CircularProgress />
            </Container>
        );
    }

    if (error) {
        return (
            <Container maxWidth="md" sx={{ py: 4 }}>
                <Alert severity="error">{error}</Alert>
            </Container>
        );
    }

    if (!agreement) {
        return (
            <Container maxWidth="md" sx={{ py: 4 }}>
                <Alert severity="warning">Agreement not found</Alert>
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
