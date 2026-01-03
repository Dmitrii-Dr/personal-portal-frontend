import React, { useState, useEffect } from 'react';
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
  IconButton,
  Tooltip,
} from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

const SignUpModal = ({ open, onClose, onSwitchToLogin }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [agreements, setAgreements] = useState({});
  const [agreementsLoading, setAgreementsLoading] = useState(false);
  const [agreementsError, setAgreementsError] = useState('');
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phoneNumber: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({
    firstName: '',
    lastName: '',
    phoneNumber: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [success, setSuccess] = useState(false);

  // Fetch agreements when modal opens
  useEffect(() => {
    const fetchAgreements = async () => {
      if (!open) return;

      try {
        setAgreementsLoading(true);
        setAgreementsError('');

        const response = await fetch('/api/v1/public/agreements/dictionary');

        if (!response.ok) {
          throw new Error('Failed to load agreements');
        }

        const data = await response.json();
        // data is now a List<AgreementDictionaryItem> with { id: UUID, name: string, slug: string }
        setAgreements(data);

        // Initialize form data with agreement checkboxes
        const agreementFields = {};
        data.forEach(agreement => {
          agreementFields[`agreed_${agreement.id}`] = false;
        });
        setFormData(prev => ({ ...prev, ...agreementFields }));

        // Initialize errors for agreement fields
        const agreementErrors = {};
        data.forEach(agreement => {
          agreementErrors[`agreed_${agreement.id}`] = '';
        });
        setErrors(prev => ({ ...prev, ...agreementErrors }));
      } catch (err) {
        console.error('Error fetching agreements:', err);
        setAgreementsError(err.message || 'Failed to load agreements');
      } finally {
        setAgreementsLoading(false);
      }
    };

    fetchAgreements();
  }, [open]);

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhoneNumber = (phoneNumber) => {
    // International format: starts with + followed by digits only
    const phoneRegex = /^\+?[0-9]+$/;
    return phoneRegex.test(phoneNumber) && phoneNumber.replace(/[^0-9]/g, '').length >= 10;
  };

  // Check if all mandatory fields are filled
  const isFormValid = () => {
    const hasFirstName = formData.firstName.trim().length > 0;
    const hasLastName = formData.lastName.trim().length > 0;
    const hasPhoneNumber = formData.phoneNumber.trim().length > 0;
    const hasEmail = formData.email.trim().length > 0;
    const hasPassword = formData.password.trim().length > 0;
    const hasConfirmPassword = formData.confirmPassword.trim().length > 0;

    // Check if all agreements are checked
    const allAgreementsChecked = Array.isArray(agreements) && agreements.every(agreement => {
      const fieldName = `agreed_${agreement.id}`;
      return formData[fieldName] === true;
    });

    return hasFirstName && hasLastName && hasPhoneNumber && hasEmail &&
      hasPassword && hasConfirmPassword && allAgreementsChecked;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    // For phone number, allow only digits and + symbol
    if (name === 'phoneNumber') {
      const sanitizedValue = value.replace(/[^0-9+]/g, '');
      setFormData((prev) => ({
        ...prev,
        [name]: sanitizedValue,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }

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
      firstName: '',
      lastName: '',
      phoneNumber: '',
      email: '',
      password: '',
      confirmPassword: '',
    };
    let isValid = true;

    // Validate firstName (required)
    if (!formData.firstName.trim()) {
      newErrors.firstName = t('auth.firstNameRequired');
      isValid = false;
    } else if (formData.firstName.length > 100) {
      newErrors.firstName = t('auth.firstNameMaxLength');
      isValid = false;
    }

    // Validate lastName (required)
    if (!formData.lastName.trim()) {
      newErrors.lastName = t('auth.lastNameRequired');
      isValid = false;
    } else if (formData.lastName.length > 100) {
      newErrors.lastName = t('auth.lastNameMaxLength');
      isValid = false;
    }

    // Validate phoneNumber (required)
    if (!formData.phoneNumber.trim()) {
      newErrors.phoneNumber = t('auth.phoneNumberRequired');
      isValid = false;
    } else if (!validatePhoneNumber(formData.phoneNumber)) {
      newErrors.phoneNumber = t('auth.phoneNumberInvalid');
      isValid = false;
    }

    // Validate email
    if (!formData.email.trim()) {
      newErrors.email = t('auth.emailRequired');
      isValid = false;
    } else if (!validateEmail(formData.email)) {
      newErrors.email = t('auth.emailInvalid');
      isValid = false;
    }

    // Validate password
    if (!formData.password.trim()) {
      newErrors.password = t('auth.passwordRequired');
      isValid = false;
    } else if (formData.password.length < 6) {
      newErrors.password = t('auth.passwordMinLength');
      isValid = false;
    }

    // Validate confirmPassword
    if (!formData.confirmPassword.trim()) {
      newErrors.confirmPassword = t('auth.confirmPasswordRequired');
      isValid = false;
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = t('auth.passwordsDoNotMatch');
      isValid = false;
    }

    // Validate dynamic agreements
    if (Array.isArray(agreements)) {
      agreements.forEach(agreement => {
        const fieldName = `agreed_${agreement.id}`;
        if (!formData[fieldName]) {
          newErrors[fieldName] = t('auth.agreementRequired', `You must agree to ${agreement.name}`);
          isValid = false;
        }
      });
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
      // Build signedAgreements map: Map<UUID, Boolean>
      const signedAgreements = {};
      if (Array.isArray(agreements)) {
        agreements.forEach(agreement => {
          const fieldName = `agreed_${agreement.id}`;
          signedAgreements[agreement.id] = formData[fieldName] || false;
        });
      }

      const response = await fetch('/api/v1/auth/registry', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          phoneNumber: formData.phoneNumber.trim(),
          email: formData.email.trim(),
          password: formData.password,
          signedAgreements: signedAgreements,
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
        // Hardcoded timezone and language for all signups
        const timezone = 'Europe/Moscow';
        const language = 'ru';

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
        // Reset form data before closing to prevent autocomplete issues
        const resetData = {
          firstName: '',
          lastName: '',
          phoneNumber: '',
          email: '',
          password: '',
          confirmPassword: '',
        };

        // Reset agreement fields
        if (Array.isArray(agreements)) {
          agreements.forEach(agreement => {
            resetData[`agreed_${agreement.id}`] = false;
          });
        }

        setFormData(resetData);
        setErrors({
          firstName: '',
          lastName: '',
          phoneNumber: '',
          email: '',
          password: '',
          confirmPassword: '',
        });
        setSubmitError('');
        setSuccess(false);

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
      // Reset basic form data
      const resetData = {
        firstName: '',
        lastName: '',
        phoneNumber: '',
        email: '',
        password: '',
        confirmPassword: '',
      };

      // Reset agreement fields
      if (Array.isArray(agreements)) {
        agreements.forEach(agreement => {
          resetData[`agreed_${agreement.id}`] = false;
        });
      }

      setFormData(resetData);

      // Reset basic errors
      const resetErrors = {
        firstName: '',
        lastName: '',
        phoneNumber: '',
        email: '',
        password: '',
        confirmPassword: '',
      };

      // Reset agreement errors
      if (Array.isArray(agreements)) {
        agreements.forEach(agreement => {
          resetErrors[`agreed_${agreement.id}`] = '';
        });
      }

      setErrors(resetErrors);
      setSubmitError('');
      setSuccess(false);
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>{t('auth.signUpTitle')}</DialogTitle>
      <DialogContent>
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
            id="firstName"
            name="firstName"
            label={t('auth.firstName')}
            type="text"
            value={formData.firstName}
            onChange={handleChange}
            error={!!errors.firstName}
            margin="normal"
            required
            autoComplete="given-name"
            disabled={loading || success}
            variant="outlined"
            inputProps={{ maxLength: 100 }}
            InputProps={{
              endAdornment: errors.firstName && (
                <Tooltip title={errors.firstName} arrow placement="top">
                  <IconButton size="small" edge="end" color="error">
                    <ErrorOutlineIcon />
                  </IconButton>
                </Tooltip>
              ),
            }}
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
            margin="normal"
            required
            autoComplete="family-name"
            disabled={loading || success}
            variant="outlined"
            inputProps={{ maxLength: 100 }}
            InputProps={{
              endAdornment: errors.lastName && (
                <Tooltip title={errors.lastName} arrow placement="top">
                  <IconButton size="small" edge="end" color="error">
                    <ErrorOutlineIcon />
                  </IconButton>
                </Tooltip>
              ),
            }}
          />

          <TextField
            fullWidth
            id="phoneNumber"
            name="phoneNumber"
            label={t('auth.phoneNumber')}
            type="tel"
            value={formData.phoneNumber}
            onChange={handleChange}
            error={!!errors.phoneNumber}
            margin="normal"
            required
            autoComplete="tel"
            disabled={loading || success}
            variant="outlined"
            placeholder="+1234567890"
            InputProps={{
              endAdornment: errors.phoneNumber && (
                <Tooltip title={errors.phoneNumber} arrow placement="top">
                  <IconButton size="small" edge="end" color="error">
                    <ErrorOutlineIcon />
                  </IconButton>
                </Tooltip>
              ),
            }}
          />

          <TextField
            fullWidth
            id="email"
            name="email"
            label={t('auth.email')}
            type="email"
            value={formData.email}
            onChange={handleChange}
            error={!!errors.email}
            margin="normal"
            required
            autoComplete="email"
            disabled={loading || success}
            variant="outlined"
            InputProps={{
              endAdornment: errors.email && (
                <Tooltip title={errors.email} arrow placement="top">
                  <IconButton size="small" edge="end" color="error">
                    <ErrorOutlineIcon />
                  </IconButton>
                </Tooltip>
              ),
            }}
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
            margin="normal"
            required
            autoComplete="new-password"
            disabled={loading || success}
            variant="outlined"
            InputProps={{
              endAdornment: errors.password && (
                <Tooltip title={errors.password} arrow placement="top">
                  <IconButton size="small" edge="end" color="error">
                    <ErrorOutlineIcon />
                  </IconButton>
                </Tooltip>
              ),
            }}
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
            margin="normal"
            required
            autoComplete="new-password"
            disabled={loading || success}
            variant="outlined"
            InputProps={{
              endAdornment: errors.confirmPassword && (
                <Tooltip title={errors.confirmPassword} arrow placement="top">
                  <IconButton size="small" edge="end" color="error">
                    <ErrorOutlineIcon />
                  </IconButton>
                </Tooltip>
              ),
            }}
          />

          <Box sx={{ mt: 2 }}>
            {agreementsLoading && (
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <CircularProgress size={20} sx={{ mr: 1 }} />
                <Typography variant="body2">{t('auth.loadingAgreements', 'Loading agreements...')}</Typography>
              </Box>
            )}

            {agreementsError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {agreementsError}
              </Alert>
            )}

            {!agreementsLoading && Array.isArray(agreements) && agreements.length === 0 && !agreementsError && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                {t('auth.noAgreementsAvailable', 'No agreements available')}
              </Alert>
            )}

            {Array.isArray(agreements) && agreements.map((agreement) => {
              const fieldName = `agreed_${agreement.id}`;
              return (
                <Box key={agreement.id}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={formData[fieldName] || false}
                        onChange={handleCheckboxChange}
                        name={fieldName}
                        color="primary"
                        disabled={loading || success || agreementsLoading}
                      />
                    }
                    label={
                      <Typography variant="body2">
                        {t('auth.agreeToThe', 'I agree to the')}{' '}
                        <MuiLink
                          href={`/agreement/${agreement.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {agreement.name}
                        </MuiLink>
                      </Typography>
                    }
                  />
                  {errors[fieldName] && (
                    <Typography variant="caption" color="error" display="block">
                      {errors[fieldName]}
                    </Typography>
                  )}
                </Box>
              );
            })}
          </Box>

          <Button
            type="submit"
            fullWidth
            variant="contained"
            color="primary"
            sx={{ mt: 3, mb: 2 }}
            disabled={loading || success || !isFormValid()}
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

