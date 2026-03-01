import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { fetchWithAuth } from '../utils/api';
import {
    Box,
    Typography,
    TextField,
    Button,
    Card,
    CardContent,
    Alert,
    CircularProgress,
} from '@mui/material';

const AccountVerificationPage = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();

    const returnTo = location.state?.returnTo || '/booking';

    const [email, setEmail] = useState(location.state?.email || '');
    const [code, setCode] = useState('');
    const [codeError, setCodeError] = useState('');
    const [submitError, setSubmitError] = useState('');
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);
    const [checking, setChecking] = useState(true);
    const checkedRef = useRef(false);

    // On mount: fetch /user/profile to:
    // 1. Get the email (available even for unverified accounts)
    // 2. Check isVerified — if true, forward to returnTo immediately.
    useEffect(() => {
        if (checkedRef.current) return;
        checkedRef.current = true;

        fetchWithAuth('/api/v1/user/profile')
            .then(async (res) => {
                if (res.ok) {
                    const profile = await res.json();
                    // Always grab email from profile — it's the authoritative source
                    if (profile?.email) setEmail(profile.email);
                    if (profile?.isVerified === true) {
                        navigate(returnTo, { replace: true });
                        return;
                    }
                }
                setChecking(false);
            })
            .catch(() => setChecking(false));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleCodeChange = (e) => {
        const value = e.target.value.replace(/\D/g, '').slice(0, 6);
        setCode(value);
        if (codeError) setCodeError('');
        if (submitError) setSubmitError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitError('');

        if (!/^\d{6}$/.test(code)) {
            setCodeError(t('auth.verificationCodeInvalid'));
            return;
        }

        setLoading(true);

        try {
            const response = await fetchWithAuth('/api/v1/user/account/activation/verification', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, code }),
            });

            if (response.ok) {
                // Send user settings now that the account is activated
                try {
                    let timezoneId = 16; // Default: Moscow

                    const pendingBookingStr = sessionStorage.getItem('pending_booking');
                    if (pendingBookingStr) {
                        try {
                            const pendingBooking = JSON.parse(pendingBookingStr);
                            if (pendingBooking.timezoneId) timezoneId = pendingBooking.timezoneId;
                        } catch (_) { }
                    }

                    await fetchWithAuth('/api/v1/user/setting', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ timezoneId, language: 'ru' }),
                    });
                } catch (_) {
                    // Best-effort — don't block navigation on settings failure
                }

                setSuccess(true);
                setTimeout(() => {
                    navigate(returnTo, { replace: true });
                }, 1500);
                return;
            }

            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || t('auth.verificationFailed'));
        } catch (err) {
            setSubmitError(err.message || t('auth.verificationFailed'));
        } finally {
            setLoading(false);
        }
    };
    if (checking) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box
            sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '60vh',
            }}
        >
            <Card sx={{ maxWidth: 500, width: '100%' }}>
                <CardContent sx={{ p: 4 }}>
                    <Typography variant="h4" component="h1" gutterBottom align="center">
                        {t('auth.verifyAccount')}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 1 }}>
                        {t('auth.verifyAccountDescription')}
                    </Typography>
                    <Typography variant="body2" align="center" sx={{ mb: 3, fontWeight: 500 }}>
                        {email}
                    </Typography>

                    {success && (
                        <Alert severity="success" sx={{ mb: 2 }}>
                            {t('auth.accountVerified')}
                        </Alert>
                    )}

                    {submitError && (
                        <Alert severity="error" sx={{ mb: 2 }}>
                            {submitError}
                        </Alert>
                    )}

                    <Box component="form" onSubmit={handleSubmit} noValidate>
                        <TextField
                            fullWidth
                            id="verification-code"
                            name="code"
                            label={t('auth.verificationCode')}
                            type="text"
                            inputMode="numeric"
                            value={code}
                            onChange={handleCodeChange}
                            error={!!codeError}
                            helperText={codeError}
                            margin="normal"
                            required
                            autoComplete="one-time-code"
                            disabled={loading || success}
                            inputProps={{ maxLength: 6 }}
                            placeholder="000000"
                            autoFocus
                        />

                        <Button
                            type="submit"
                            fullWidth
                            variant="contained"
                            color="primary"
                            sx={{ mt: 3, mb: 2 }}
                            disabled={loading || success || code.length !== 6}
                        >
                            {loading ? (
                                <>
                                    <CircularProgress size={20} sx={{ mr: 1 }} />
                                    {t('auth.verifying')}
                                </>
                            ) : (
                                t('auth.verifyAndContinue')
                            )}
                        </Button>
                    </Box>
                </CardContent>
            </Card>
        </Box>
    );
};

export default AccountVerificationPage;
