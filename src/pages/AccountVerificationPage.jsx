import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { fetchWithAuth } from '../utils/api';
import { getApiErrorMessage } from '../utils/apiErrors';
import {
    Box,
    Typography,
    TextField,
    Button,
    Card,
    CardContent,
    Alert,
    CircularProgress,
    Snackbar,
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
    const [resendCooldown, setResendCooldown] = useState(0);
    const [resendLoading, setResendLoading] = useState(false);
    const [resendSuccess, setResendSuccess] = useState(false);
    const checkedRef = useRef(false);
    const cooldownRef = useRef(null);

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

    const startCooldown = () => {
        setResendCooldown(60);
        clearInterval(cooldownRef.current);
        cooldownRef.current = setInterval(() => {
            setResendCooldown((prev) => {
                if (prev <= 1) {
                    clearInterval(cooldownRef.current);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    const handleResend = async () => {
        setResendLoading(true);
        setResendSuccess(false);
        setSubmitError('');
        try {
            const res = await fetchWithAuth('/api/v1/user/account/activation/code', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });
            if (res.ok) {
                setResendSuccess(true);
                startCooldown();
            } else {
                const errData = await res.json().catch(() => ({}));
                setSubmitError(getApiErrorMessage(errData.code, errData.message || t('auth.verificationFailed')));
            }
        } catch {
            setSubmitError(t('auth.verificationFailed'));
        } finally {
            setResendLoading(false);
        }
    };

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

                // Dispatch a dedicated event so AppLayout can optimistically flip
                // isVerified to true in its cached userProfile — auth-changed is
                // blocked on /verify-account by the loadUserProfile guard.
                window.dispatchEvent(new Event('account-verified'));

                setSuccess(true);
                setTimeout(() => {
                    navigate(returnTo, { replace: true });
                }, 1500);
                return;
            }

            const errorData = await response.json().catch(() => ({}));
            // Localize using the PEC-* code from the response body
            const localizedMsg = getApiErrorMessage(
                errorData.code,
                errorData.message || t('auth.verificationFailed')
            );
            throw new Error(localizedMsg);
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
        <>
            <Box
                sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    minHeight: '60vh',
                }}
            >
                <Card sx={{ maxWidth: 600, width: '100%' }}>
                    <CardContent sx={{ p: 4 }}>
                        <Typography variant="h5" component="h1" gutterBottom align="center" sx={{ fontWeight: 600 }}>
                            {t('auth.verifyAccount')}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 3 }}>
                            {t('auth.verifyAccountDescription')}{email ? ` ${email}` : ''}
                        </Typography>

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

                            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 0.5, mb: 1 }}>
                                <Button
                                    size="small"
                                    variant="text"
                                    color="secondary"
                                    sx={{ fontSize: '0.75rem', textTransform: 'none', p: '2px 6px', minWidth: 0 }}
                                    disabled={resendCooldown > 0 || resendLoading || success}
                                    onClick={handleResend}
                                >
                                    {resendLoading ? (
                                        <>
                                            <CircularProgress size={12} sx={{ mr: 0.5 }} />
                                            {t('auth.sending')}
                                        </>
                                    ) : resendCooldown > 0 ? (
                                        t('auth.resendCodeIn', { seconds: resendCooldown })
                                    ) : (
                                        t('auth.resendCode')
                                    )}
                                </Button>
                            </Box>

                            <Button
                                type="submit"
                                fullWidth
                                variant="contained"
                                color="primary"
                                sx={{ mt: 1, mb: 2, textTransform: 'none' }}
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

            {/* Resend success toast — top-right, same pattern as BookingPage */}
            <Snackbar
                open={resendSuccess}
                autoHideDuration={5000}
                onClose={() => setResendSuccess(false)}
                anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
                sx={{ mt: { xs: 8, sm: 9, md: 10 }, zIndex: 99999, position: 'fixed' }}
            >
                <Alert onClose={() => setResendSuccess(false)} severity="success" sx={{ width: '100%' }}>
                    {t('auth.codeSentAgain')}
                </Alert>
            </Snackbar>
        </>
    );
};

export default AccountVerificationPage;
