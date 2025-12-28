import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { setToken } from '../utils/api';
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
  Checkbox,
  FormControlLabel,
  Typography,
} from '@mui/material';

const SignUpModal = ({ open, onClose, onSwitchToLogin }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    agreedPersonal: false,
    agreedPsy: false,
  });
  const [errors, setErrors] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    agreedPersonal: '',
    agreedPsy: '',
  });
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [success, setSuccess] = useState(false);

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

  const handleCheckboxChange = (e) => {
    const { name, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: checked,
    }));
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: '',
      }));
    }
  };



  const validateForm = () => {
    const newErrors = {
      email: '',
      password: '',
      confirmPassword: '',
      firstName: '',
      lastName: '',
      agreedPersonal: '',
      agreedPsy: '',
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
    } else if (formData.password.length < 6) {
      newErrors.password = t('auth.passwordMinLength');
      isValid = false;
    }

    if (!formData.confirmPassword.trim()) {
      newErrors.confirmPassword = t('auth.confirmPasswordRequired');
      isValid = false;
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = t('auth.passwordsDoNotMatch');
      isValid = false;
    }

    if (formData.firstName && formData.firstName.length > 100) {
      newErrors.firstName = t('auth.firstNameMaxLength');
      isValid = false;
    }

    if (formData.lastName && formData.lastName.length > 100) {
      newErrors.lastName = t('auth.lastNameMaxLength');
      isValid = false;
    }

    if (!formData.agreedPersonal) {
      newErrors.agreedPersonal = t('auth.agreePersonalRequired', 'You must agree to the processing of personal data');
      isValid = false;
    }

    if (!formData.agreedPsy) {
      newErrors.agreedPsy = t('auth.agreePsyRequired', 'You must agree to the informed voluntary consent');
      isValid = false;
    }





    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');
    setSuccess(false);

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/v1/auth/registry', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email.trim(),
          password: formData.password,
          firstName: formData.firstName.trim() || null,
          lastName: formData.lastName.trim() || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message ||
          `Sign up failed: ${response.status} ${response.statusText}`
        );
      }

      // Check if signup response includes a token
      const responseData = await response.json().catch(() => ({}));
      const signupToken = responseData.token || responseData.accessToken;

      // Save token if available
      if (signupToken) {
        setToken(signupToken);
        // Dispatch custom event to notify AppLayout of auth change
        window.dispatchEvent(new Event('auth-changed'));
      }

      // After successful signup, detect timezone and send user settings
      try {
        // Detect browser timezone
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const language = 'english';

        // Prepare settings request
        const settingsOptions = {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            timezone: timezone.substring(0, 50),
            language: language.substring(0, 10),
          }),
        };

        // Add token to headers if available from signup response
        if (signupToken) {
          settingsOptions.headers.Authorization = `Bearer ${signupToken}`;
        }

        // Send user settings request
        const settingsResponse = await fetch('/api/v1/user/setting', settingsOptions);

        if (!settingsResponse.ok) {
          console.warn('Failed to save user settings:', settingsResponse.status);
        }
      } catch (settingsError) {
        console.warn('Error saving user settings:', settingsError);
      }

      setSuccess(true);
      // Close modal after 2 seconds
      setTimeout(() => {
        onClose();
        // If token is available, user is logged in, redirect to booking
        if (signupToken) {
          navigate('/booking');
        } else if (onSwitchToLogin) {
          setTimeout(() => {
            onSwitchToLogin();
          }, 300);
        }
      }, 2000);
    } catch (error) {
      console.error('Error signing up:', error);
      setSubmitError(error.message || t('auth.signUpFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading && !success) {
      setFormData({
        email: '',
        password: '',
        confirmPassword: '',
        firstName: '',
        lastName: '',
      });
      setErrors({
        email: '',
        password: '',
        confirmPassword: '',
        firstName: '',
        lastName: '',
      });
      setSubmitError('');
      setSuccess(false);
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>{t('auth.signUpTitle')}</DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ mb: 2 }}>
          {t('auth.signUpDescription')}
        </DialogContentText>

        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {t('auth.accountCreatedSuccess')}
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
            disabled={loading || success}
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
            autoComplete="new-password"
            disabled={loading || success}
          />

          <TextField
            fullWidth
            id="confirmPassword"
            name="confirmPassword"
            label={t('auth.confirmPassword')}
            type="password"
            value={formData.confirmPassword}
            onChange={handleChange}
            error={!!errors.confirmPassword}
            helperText={errors.confirmPassword}
            margin="normal"
            required
            autoComplete="new-password"
            disabled={loading || success}
          />

          <TextField
            fullWidth
            id="firstName"
            name="firstName"
            label={t('auth.firstName')}
            type="text"
            value={formData.firstName}
            onChange={handleChange}
            error={!!errors.firstName}
            helperText={errors.firstName || t('common.optional')}
            margin="normal"
            autoComplete="given-name"
            disabled={loading || success}
            inputProps={{ maxLength: 100 }}
          />

          <TextField
            fullWidth
            id="lastName"
            name="lastName"
            label={t('auth.lastName')}
            type="text"
            value={formData.lastName}
            onChange={handleChange}
            error={!!errors.lastName}
            helperText={errors.lastName || t('common.optional')}
            margin="normal"
            autoComplete="family-name"
            disabled={loading || success}
            inputProps={{ maxLength: 100 }}
          />

          <Box sx={{ mt: 2 }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.agreedPersonal}
                  onChange={handleCheckboxChange}
                  name="agreedPersonal"
                  color="primary"
                  disabled={loading || success}
                />
              }
              label={
                <Typography variant="body2">
                  {t('auth.agreePersonalData', 'I agree to the')} <MuiLink component={Link} to="/agreement/personal" target="_blank">{t('auth.agreementPersonalData', 'Agreement on Personal Data Processing')}</MuiLink>
                </Typography>
              }
            />
            {errors.agreedPersonal && (
              <Typography variant="caption" color="error" display="block">
                {errors.agreedPersonal}
              </Typography>
            )}

            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.agreedPsy}
                  onChange={handleCheckboxChange}
                  name="agreedPsy"
                  color="primary"
                  disabled={loading || success}
                />
              }
              label={
                <Typography variant="body2">
                  {t('auth.agreeInformedConsent', 'I agree to the')} <MuiLink component={Link} to="/agreement/psy" target="_blank">{t('auth.informedConsent', 'Informed Voluntary Consent to Psychological Help')}</MuiLink>
                </Typography>
              }
            />
            {errors.agreedPsy && (
              <Typography variant="caption" color="error" display="block">
                {errors.agreedPsy}
              </Typography>
            )}
          </Box>

          <Button
            type="submit"
            fullWidth
            variant="contained"
            color="primary"
            sx={{ mt: 3, mb: 2 }}
            disabled={loading || success}
          >
            {loading ? (
              <>
                <CircularProgress size={20} sx={{ mr: 1 }} />
                {t('auth.creatingAccount')}
              </>
            ) : (
              t('auth.signUp')
            )}
          </Button>

          <Box sx={{ textAlign: 'center' }}>
            <DialogContentText variant="body2">
              {t('auth.alreadyHaveAccount')}{' '}
              <MuiLink
                component="button"
                type="button"
                onClick={() => {
                  handleClose();
                  if (onSwitchToLogin) {
                    onSwitchToLogin();
                  }
                }}
                sx={{ textDecoration: 'none', cursor: 'pointer' }}
              >
                {t('auth.signIn')}
              </MuiLink>
            </DialogContentText>
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default SignUpModal;

