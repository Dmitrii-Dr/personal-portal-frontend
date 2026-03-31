import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Typography,
  TextField,
  Button,
  Card,
  CardContent,
  Alert,
  CircularProgress,
  Link as MuiLink,
} from '@mui/material';
import { getPasswordComplexityErrorMessage } from '../utils/passwordValidation';

const ResetPasswordPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [formData, setFormData] = useState({
    email: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({
    email: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setSubmitError(t('auth.resetPasswordInvalidToken'));
    }
  }, [token, t]);

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
      newPassword: '',
      confirmPassword: '',
    };
    let isValid = true;

    if (!formData.email.trim()) {
      newErrors.email = t('auth.emailRequired');
      isValid = false;
    } else if (!validateEmail(formData.email)) {
      newErrors.email = t('auth.emailInvalid');
      isValid = false;
    }

    if (!formData.newPassword.trim()) {
      newErrors.newPassword = t('auth.passwordRequired');
      isValid = false;
    } else {
      const passwordError = getPasswordComplexityErrorMessage(t, formData.newPassword);
      if (passwordError) {
        newErrors.newPassword = passwordError;
        isValid = false;
      }
    }

    if (!formData.confirmPassword.trim()) {
      newErrors.confirmPassword = t('auth.confirmPasswordRequired');
      isValid = false;
    } else if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = t('auth.passwordsDoNotMatch');
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');
    setSuccess(false);

    if (!token) {
      setSubmitError(t('auth.resetPasswordInvalidToken'));
      return;
    }

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/v1/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: token,
          email: formData.email.trim(),
          newPassword: formData.newPassword,
        }),
      });

      if (response.status === 200) {
        setSuccess(true);
        // Redirect to login page after 3 seconds
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message ||
          t('auth.resetPasswordFailedWithStatus', {
            status: response.status,
            statusText: response.statusText,
          })
        );
      }
    } catch (error) {
      console.error('Error resetting password:', error);
      setSubmitError(error.message || t('auth.resetPasswordFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '60vh',
      }}
    >
      <Card sx={{ maxWidth: 500, width: '100%', mx: { xs: 2, sm: 0 }, boxShadow: { xs: 0, sm: 1 } }}>
        <CardContent sx={{ p: { xs: 2, sm: 4 } }}>
          <Typography variant="h4" component="h1" gutterBottom align="center">
            {t('auth.resetPasswordTitle')}
          </Typography>
          <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 3 }}>
            {t('auth.resetPasswordDescription')}
          </Typography>

          {success && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {t('auth.resetPasswordSuccess')}
            </Alert>
          )}

          {submitError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {submitError}
            </Alert>
          )}

          {!token && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              {t('auth.resetPasswordNoTokenInUrl')}
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
              disabled={loading || success || !token}
            />

            <TextField
              fullWidth
              id="newPassword"
              name="newPassword"
              label={t('auth.newPasswordField')}
              type="password"
              value={formData.newPassword}
              onChange={handleChange}
              error={!!errors.newPassword}
              helperText={
                errors.newPassword || (
                  <Typography
                    component="span"
                    variant="caption"
                    color="text.secondary"
                    sx={{ fontSize: '0.7rem', lineHeight: 1.35, display: 'block' }}
                  >
                    {t('auth.passwordRequirementsHint')}
                  </Typography>
                )
              }
              margin="normal"
              required
              autoComplete="new-password"
              disabled={loading || success || !token}
            />

            <TextField
              fullWidth
              id="confirmPassword"
              name="confirmPassword"
              label={t('auth.confirmNewPassword')}
              type="password"
              value={formData.confirmPassword}
              onChange={handleChange}
              error={!!errors.confirmPassword}
              helperText={errors.confirmPassword}
              margin="normal"
              required
              autoComplete="new-password"
              disabled={loading || success || !token}
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              color="primary"
              sx={{ mt: 3, mb: 2 }}
              disabled={loading || success || !token}
            >
              {loading ? (
                <>
                  <CircularProgress size={20} sx={{ mr: 1 }} />
                  {t('auth.resetPasswordSubmitting')}
                </>
              ) : (
                t('auth.resetPasswordSubmit')
              )}
            </Button>

            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="body2">
                {t('auth.resetPasswordRememberQuestion')}{' '}
                <MuiLink component={Link} to="/login">
                  {t('auth.signIn')}
                </MuiLink>
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default ResetPasswordPage;

