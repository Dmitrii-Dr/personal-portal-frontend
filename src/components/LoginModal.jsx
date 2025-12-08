import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { setToken, getRolesFromToken } from '../utils/api';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Box,
  Link as MuiLink,
} from '@mui/material';

const LoginModal = ({ open, onClose, onSwitchToSignUp }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [errors, setErrors] = useState({
    email: '',
    password: '',
  });
  const [forgotPasswordError, setForgotPasswordError] = useState('');
  const [loading, setLoading] = useState(false);
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [forgotPasswordSuccess, setForgotPasswordSuccess] = useState(false);

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: '',
      }));
    }
    setSubmitError('');
  };

  const validateForm = () => {
    const newErrors = {
      email: '',
      password: '',
    };
    let isValid = true;

    if (!formData.email.trim()) {
      newErrors.email = t('auth.emailRequired');
      isValid = false;
    } else if (!validateEmail(formData.email)) {
      newErrors.email = t('auth.emailInvalid');
      isValid = false;
    }

    if (!formData.password.trim()) {
      newErrors.password = t('auth.passwordRequired');
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email.trim(),
          password: formData.password,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message ||
            `Login failed: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();

      // Save token to sessionStorage
      if (data.token) {
        setToken(data.token);
        // Dispatch custom event to notify AppLayout of auth change
        window.dispatchEvent(new Event('auth-changed'));

        // Check if user has admin role
        const responseRoles = data.roles || [];
        const tokenRoles = getRolesFromToken(data.token);
        const allRoles = [...new Set([...responseRoles, ...tokenRoles])];
        const isAdmin = allRoles.includes('ROLE_ADMIN') || allRoles.includes('ADMIN_ROLE');

        // Close modal
        onClose();

        if (isAdmin) {
          // Admin user - redirect to admin dashboard
          navigate('/admin/dashboard');
        } else {
          // Regular user - redirect to booking page
          navigate('/booking');
        }
      } else {
        throw new Error('No token received from server');
      }
    } catch (error) {
      console.error('Error logging in:', error);
      setSubmitError(error.message || t('auth.loginFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading && !forgotPasswordLoading) {
      setFormData({ email: '', password: '' });
      setErrors({ email: '', password: '' });
      setSubmitError('');
      setShowForgotPassword(false);
      setForgotPasswordEmail('');
      setForgotPasswordError('');
      setForgotPasswordSuccess(false);
      onClose();
    }
  };

  const handleForgotPasswordSubmit = async (e) => {
    e.preventDefault();
    setForgotPasswordError('');
    setForgotPasswordSuccess(false);

    if (!forgotPasswordEmail.trim()) {
      setForgotPasswordError(t('auth.emailRequired'));
      return;
    }

    if (!validateEmail(forgotPasswordEmail)) {
      setForgotPasswordError(t('auth.emailInvalid'));
      return;
    }

    setForgotPasswordLoading(true);

    try {
      const response = await fetch('/api/v1/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: forgotPasswordEmail.trim(),
        }),
      });

      if (response.status === 200) {
        setForgotPasswordSuccess(true);
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message ||
            `Failed to send password reset email: ${response.status} ${response.statusText}`
        );
      }
    } catch (error) {
      console.error('Error sending password reset email:', error);
      setForgotPasswordError(error.message || t('auth.loginFailed'));
    } finally {
      setForgotPasswordLoading(false);
    }
  };

  const handleBackToLogin = () => {
    setShowForgotPassword(false);
    setForgotPasswordEmail('');
    setForgotPasswordError('');
    setForgotPasswordSuccess(false);
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>{showForgotPassword ? t('auth.forgotPasswordTitle') : t('auth.login')}</DialogTitle>
      <DialogContent>
        {showForgotPassword ? (
          <>
            <DialogContentText sx={{ mb: 2 }}>
              {t('auth.forgotPasswordDescription')}
            </DialogContentText>

            {forgotPasswordSuccess && (
              <Alert severity="success" sx={{ mb: 2 }}>
                {t('auth.passwordResetSent')}
              </Alert>
            )}

            {forgotPasswordError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {forgotPasswordError}
              </Alert>
            )}

            <Box component="form" onSubmit={handleForgotPasswordSubmit} noValidate>
              <TextField
                fullWidth
                id="forgot-password-email"
                name="forgot-password-email"
                label={t('auth.email')}
                type="email"
                value={forgotPasswordEmail}
                onChange={(e) => {
                  setForgotPasswordEmail(e.target.value);
                  setForgotPasswordError('');
                }}
                error={!!forgotPasswordError && !forgotPasswordSuccess}
                helperText={forgotPasswordError && !forgotPasswordSuccess ? forgotPasswordError : ''}
                margin="normal"
                required
                autoComplete="email"
                disabled={forgotPasswordLoading || forgotPasswordSuccess}
              />

              <Button
                type="submit"
                fullWidth
                variant="contained"
                color="primary"
                sx={{ mt: 3, mb: 2 }}
                disabled={forgotPasswordLoading || forgotPasswordSuccess}
              >
                {forgotPasswordLoading ? (
                  <>
                    <CircularProgress size={20} sx={{ mr: 1 }} />
                    {t('auth.sending')}
                  </>
                ) : (
                  t('auth.sendResetLink')
                )}
              </Button>

              <Box sx={{ textAlign: 'center' }}>
                <MuiLink
                  component="button"
                  type="button"
                  onClick={handleBackToLogin}
                  sx={{ textDecoration: 'none', cursor: 'pointer' }}
                >
                  {t('auth.backToLogin')}
                </MuiLink>
              </Box>
            </Box>
          </>
        ) : (
          <>
            <DialogContentText sx={{ mb: 2 }}>
              {t('auth.signIn')}
            </DialogContentText>

            {submitError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {submitError}
              </Alert>
            )}

            <Box component="form" onSubmit={handleSubmit} noValidate>
              <TextField
                fullWidth
                id="email"
                name="email"
                label={t('auth.email')}
                type="email"
                value={formData.email}
                onChange={handleChange}
                error={!!errors.email}
                helperText={errors.email}
                margin="normal"
                required
                autoComplete="email"
                disabled={loading}
              />

              <TextField
                fullWidth
                id="password"
                name="password"
                label={t('auth.password')}
                type="password"
                value={formData.password}
                onChange={handleChange}
                error={!!errors.password}
                helperText={errors.password}
                margin="normal"
                required
                autoComplete="current-password"
                disabled={loading}
              />

              <Box sx={{ textAlign: 'right', mt: 1 }}>
                <MuiLink
                  component="button"
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  sx={{ textDecoration: 'none', cursor: 'pointer', fontSize: '0.875rem' }}
                >
                  {t('auth.forgotPassword')}
                </MuiLink>
              </Box>

              <Button
                type="submit"
                fullWidth
                variant="contained"
                color="primary"
                sx={{ mt: 3, mb: 2 }}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <CircularProgress size={20} sx={{ mr: 1 }} />
                    {t('auth.loggingIn')}
                  </>
                ) : (
                  t('auth.login')
                )}
              </Button>

              <Box sx={{ textAlign: 'center' }}>
                <DialogContentText variant="body2">
                  {t('auth.dontHaveAccount')}{' '}
                  <MuiLink
                    component="button"
                    type="button"
                    onClick={() => {
                      handleClose();
                      if (onSwitchToSignUp) {
                        onSwitchToSignUp();
                      }
                    }}
                    sx={{ textDecoration: 'none', cursor: 'pointer' }}
                  >
                    {t('auth.signUp')}
                  </MuiLink>
                </DialogContentText>
              </Box>
            </Box>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default LoginModal;

