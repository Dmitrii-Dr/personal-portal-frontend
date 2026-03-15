import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, Paper, Snackbar } from '@mui/material';
import { useTranslation } from 'react-i18next';

const COOKIE_CONSENT_KEY = 'cookieConsentAccepted';

const CookieNotification = () => {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);

    useEffect(() => {
        // Check if user has already accepted cookies in this session
        const hasAccepted = sessionStorage.getItem(COOKIE_CONSENT_KEY);
        if (!hasAccepted) {
            setOpen(true);
        }
    }, []);

    const handleAccept = () => {
        // Store acceptance in session storage
        sessionStorage.setItem(COOKIE_CONSENT_KEY, 'true');
        setOpen(false);
    };

    return (
        <Snackbar
            open={open}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            sx={{
                left: { xs: 0, sm: '50%' },
                right: { xs: 0, sm: 'auto' },
                transform: { xs: 'none', sm: 'translateX(-50%)' },
                maxWidth: '100%',
                width: '100%',
                '& .MuiSnackbarContent-root': {
                    padding: 0,
                },
            }}
        >
            <Paper
                elevation={6}
                sx={{
                    width: { xs: '100%', sm: '75%' },
                    maxWidth: '100%',
                    boxSizing: 'border-box',
                    px: 3,
                    py: 2,
                    display: 'flex',
                    flexDirection: { xs: 'column', sm: 'row' },
                    alignItems: { xs: 'stretch', sm: 'center' },
                    gap: 2,
                }}
            >
                <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" color="text.primary">
                        {t('cookieNotification.message')}
                    </Typography>
                </Box>
                <Button
                    variant="contained"
                    color="primary"
                    onClick={handleAccept}
                    sx={{
                        textTransform: 'none',
                        whiteSpace: 'nowrap',
                        minWidth: 'auto',
                    }}
                >
                    {t('common.ok')}
                </Button>
            </Paper>
        </Snackbar>
    );
};

export default CookieNotification;
