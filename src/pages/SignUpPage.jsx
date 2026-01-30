import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { fetchWithAuth, setToken } from '../utils/api';
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
  Checkbox,
  FormControlLabel,
} from '@mui/material';

const SignUpPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
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
      newErrors.email = 'Email is required';
      isValid = false;
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Email must be valid';
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
      newErrors.firstName = 'First name must be at most 100 characters';
      isValid = false;
    }

    if (formData.lastName && formData.lastName.length > 100) {
      newErrors.lastName = 'Last name must be at most 100 characters';
      isValid = false;
    }

    if (!formData.agreedPersonal) {
      newErrors.agreedPersonal = 'You must agree to the processing of personal data';
      isValid = false;
    }

    if (!formData.agreedPsy) {
      newErrors.agreedPsy = 'You must agree to the informed voluntary consent';
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
        let timezoneId = 16; // Default timezone ID

        // Check if there's a pending booking with a selected timezone
        const pendingBookingStr = sessionStorage.getItem('pending_booking');
        if (pendingBookingStr) {
          try {
            const pendingBooking = JSON.parse(pendingBookingStr);
            if (pendingBooking.timezoneId) {
              timezoneId = pendingBooking.timezoneId;
            }
          } catch (e) {
            console.warn('Failed to parse pending booking:', e);
          }
        }

        const language = 'ru';

        // Prepare settings request
        const settingsOptions = {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            timezoneId: timezoneId,
            language: language.substring(0, 10), // Ensure max 10 characters
          }),
        };

        // Add token to headers if available from signup response
        if (signupToken) {
          settingsOptions.headers.Authorization = `Bearer ${signupToken}`;
        }

        // Send user settings request
        const settingsResponse = await fetch('/api/v1/user/setting', settingsOptions);

        if (!settingsResponse.ok) {
          // Log error but don't fail signup if settings fail
          console.warn('Failed to save user settings:', settingsResponse.status);
        }
      } catch (settingsError) {
        // Log error but don't fail signup if settings fail
        console.warn('Error saving user settings:', settingsError);
      }

      setSuccess(true);
      // Get return path from location state
      const returnTo = location.state?.returnTo || '/booking';
      // Redirect to login page (or returnTo if token is available) after 2 seconds
      setTimeout(() => {
        if (signupToken) {
          // If token is available, redirect to returnTo
          navigate(returnTo);
        } else {
          // Otherwise redirect to login with returnTo state
          navigate('/login', { state: { returnTo } });
        }
      }, 2000);
    } catch (error) {
      console.error('Error signing up:', error);
      setSubmitError(error.message || 'Failed to create account. Please try again.');
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
      <Card sx={{ maxWidth: 500, width: '100%' }}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom align="center">
            Sign Up
          </Typography>
          <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 3 }}>
            Create a new account to get started
          </Typography>

          {success && (
            <Alert severity="success" sx={{ mb: 2 }}>
              Account created successfully! Redirecting to login...
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
              label="Email"
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
              label="First Name"
              type="text"
              value={formData.firstName}
              onChange={handleChange}
              error={!!errors.firstName}
              helperText={errors.firstName || 'Optional'}
              margin="normal"
              autoComplete="given-name"
              disabled={loading || success}
              inputProps={{ maxLength: 100 }}
            />

            <TextField
              fullWidth
              id="lastName"
              name="lastName"
              label="Last Name"
              type="text"
              value={formData.lastName}
              onChange={handleChange}
              error={!!errors.lastName}
              helperText={errors.lastName || 'Optional'}
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
                    I agree to the <MuiLink component={Link} to="/agreement/personal" target="_blank">Agreement on Personal Data Processing</MuiLink>
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
                    I agree to the <MuiLink component={Link} to="/agreement/psy" target="_blank">Informed Voluntary Consent to Psychological Help</MuiLink>
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
                  Creating Account...
                </>
              ) : (
                'Sign Up'
              )}
            </Button>

            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="body2">
                Already have an account?{' '}
                <MuiLink component={Link} to="/login">
                  Sign in
                </MuiLink>
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default SignUpPage;

