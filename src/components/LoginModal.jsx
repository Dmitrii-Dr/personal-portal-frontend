import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState({
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');

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
      newErrors.email = 'Email is required';
      isValid = false;
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Email must be valid';
      isValid = false;
    }

    if (!formData.password.trim()) {
      newErrors.password = 'Password is required';
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
          // Regular user - stay on landing page
          // The auth state change will update the UI
        }
      } else {
        throw new Error('No token received from server');
      }
    } catch (error) {
      console.error('Error logging in:', error);
      setSubmitError(error.message || 'Failed to login. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setFormData({ email: '', password: '' });
      setErrors({ email: '', password: '' });
      setSubmitError('');
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Login</DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ mb: 2 }}>
          Sign in to your account
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
            label="Email"
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
            label="Password"
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
                Logging in...
              </>
            ) : (
              'Login'
            )}
          </Button>

          <Box sx={{ textAlign: 'center' }}>
            <DialogContentText variant="body2">
              Don't have an account?{' '}
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
                Sign up
              </MuiLink>
            </DialogContentText>
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default LoginModal;

