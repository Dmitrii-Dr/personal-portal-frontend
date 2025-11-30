import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
} from '@mui/material';

const SignUpModal = ({ open, onClose, onSwitchToLogin }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
  });
  const [errors, setErrors] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
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

  const validateForm = () => {
    const newErrors = {
      email: '',
      password: '',
      confirmPassword: '',
      firstName: '',
      lastName: '',
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
      newErrors.password = 'Password is required';
      isValid = false;
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
      isValid = false;
    }

    if (!formData.confirmPassword.trim()) {
      newErrors.confirmPassword = 'Please confirm your password';
      isValid = false;
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
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
      setSubmitError(error.message || 'Failed to create account. Please try again.');
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
      <DialogTitle>Sign Up</DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ mb: 2 }}>
          Create a new account to get started
        </DialogContentText>

        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Account created successfully!
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
            label="Password"
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
            label="Confirm Password"
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
            <DialogContentText variant="body2">
              Already have an account?{' '}
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
                Sign in
              </MuiLink>
            </DialogContentText>
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default SignUpModal;

