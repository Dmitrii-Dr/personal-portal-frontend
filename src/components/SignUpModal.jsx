import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
  useMediaQuery,
  useTheme,
  MenuItem,
} from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import CloseIcon from '@mui/icons-material/Close';

const SignUpModal = ({ open, onClose, onSwitchToLogin }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { t } = useTranslation();
  const countryCodes = [
    { key: 'US:+1', code: '+1', label: 'US (+1)', flag: '🇺🇸' },
    { key: 'CA:+1', code: '+1', label: 'CA (+1)', flag: '🇨🇦' },
    { key: 'UK:+44', code: '+44', label: 'UK (+44)', flag: '🇬🇧' },
    { key: 'DE:+49', code: '+49', label: 'DE (+49)', flag: '🇩🇪' },
    { key: 'FR:+33', code: '+33', label: 'FR (+33)', flag: '🇫🇷' },
    { key: 'ES:+34', code: '+34', label: 'ES (+34)', flag: '🇪🇸' },
    { key: 'IT:+39', code: '+39', label: 'IT (+39)', flag: '🇮🇹' },
    { key: 'NL:+31', code: '+31', label: 'NL (+31)', flag: '🇳🇱' },
    { key: 'SE:+46', code: '+46', label: 'SE (+46)', flag: '🇸🇪' },
    { key: 'NO:+47', code: '+47', label: 'NO (+47)', flag: '🇳🇴' },
    { key: 'DK:+45', code: '+45', label: 'DK (+45)', flag: '🇩🇰' },
    { key: 'FI:+358', code: '+358', label: 'FI (+358)', flag: '🇫🇮' },
    { key: 'PL:+48', code: '+48', label: 'PL (+48)', flag: '🇵🇱' },
    { key: 'UA:+380', code: '+380', label: 'UA (+380)', flag: '🇺🇦' },
    { key: 'RU:+7', code: '+7', label: 'RU (+7)', flag: '🇷🇺' },
    { key: 'KZ:+7', code: '+7', label: 'KZ (+7)', flag: '🇰🇿' },
    { key: 'TR:+90', code: '+90', label: 'TR (+90)', flag: '🇹🇷' },
    { key: 'IL:+972', code: '+972', label: 'IL (+972)', flag: '🇮🇱' },
    { key: 'AE:+971', code: '+971', label: 'AE (+971)', flag: '🇦🇪' },
    { key: 'SA:+966', code: '+966', label: 'SA (+966)', flag: '🇸🇦' },
    { key: 'IN:+91', code: '+91', label: 'IN (+91)', flag: '🇮🇳' },
    { key: 'PK:+92', code: '+92', label: 'PK (+92)', flag: '🇵🇰' },
    { key: 'BD:+880', code: '+880', label: 'BD (+880)', flag: '🇧🇩' },
    { key: 'CN:+86', code: '+86', label: 'CN (+86)', flag: '🇨🇳' },
    { key: 'JP:+81', code: '+81', label: 'JP (+81)', flag: '🇯🇵' },
    { key: 'KR:+82', code: '+82', label: 'KR (+82)', flag: '🇰🇷' },
    { key: 'SG:+65', code: '+65', label: 'SG (+65)', flag: '🇸🇬' },
    { key: 'MY:+60', code: '+60', label: 'MY (+60)', flag: '🇲🇾' },
    { key: 'TH:+66', code: '+66', label: 'TH (+66)', flag: '🇹🇭' },
    { key: 'VN:+84', code: '+84', label: 'VN (+84)', flag: '🇻🇳' },
    { key: 'AU:+61', code: '+61', label: 'AU (+61)', flag: '🇦🇺' },
    { key: 'NZ:+64', code: '+64', label: 'NZ (+64)', flag: '🇳🇿' },
    { key: 'ZA:+27', code: '+27', label: 'ZA (+27)', flag: '🇿🇦' },
    { key: 'BR:+55', code: '+55', label: 'BR (+55)', flag: '🇧🇷' },
    { key: 'MX:+52', code: '+52', label: 'MX (+52)', flag: '🇲🇽' },
    { key: 'AR:+54', code: '+54', label: 'AR (+54)', flag: '🇦🇷' },
    { key: 'CL:+56', code: '+56', label: 'CL (+56)', flag: '🇨🇱' },
  ];
  const sortedCountryCodes = [...countryCodes].sort((a, b) => {
    const aNum = parseInt(a.code.replace('+', ''), 10);
    const bNum = parseInt(b.code.replace('+', ''), 10);
    if (aNum !== bNum) return aNum - bNum;
    return a.label.localeCompare(b.label);
  });
  const [agreements, setAgreements] = useState({});
  const [agreementsLoading, setAgreementsLoading] = useState(false);
  const [agreementsError, setAgreementsError] = useState('');
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    countryCode: 'US:+1',
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
    // Strictly 10 digits (national number)
    return /^\d{10}$/.test(phoneNumber);
  };

  // Check if all mandatory fields are filled
  const isFormValid = () => {
    const hasFirstName = formData.firstName.trim().length > 0;
    const hasLastName = formData.lastName.trim().length > 0;
    const hasPhoneNumber = formData.phoneNumber.trim().length > 0;
    const hasEmail = formData.email.trim().length > 0;
    const hasPassword = formData.password.trim().length > 0;
    const hasConfirmPassword = formData.confirmPassword.trim().length > 0;
    const hasValidPhoneNumber = hasPhoneNumber && validatePhoneNumber(formData.phoneNumber);

    // Check if all agreements are checked
    const allAgreementsChecked = Array.isArray(agreements) && agreements.every(agreement => {
      const fieldName = `agreed_${agreement.id}`;
      return formData[fieldName] === true;
    });

    return hasFirstName && hasLastName && hasValidPhoneNumber && hasEmail &&
      hasPassword && hasConfirmPassword && allAgreementsChecked;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    // For phone number, allow only digits
    if (name === 'phoneNumber') {
      const sanitizedValue = value.replace(/\D/g, '');
      setFormData((prev) => ({
        ...prev,
        [name]: sanitizedValue,
      }));
      if (sanitizedValue.trim() && !validatePhoneNumber(sanitizedValue)) {
        setErrors((prev) => ({
          ...prev,
          [name]: t('auth.phoneNumberInvalid'),
        }));
      } else if (errors[name]) {
        setErrors((prev) => ({
          ...prev,
          [name]: '',
        }));
      }
    } else {
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

      const selectedCountry = countryCodes.find((c) => c.key === formData.countryCode);
      const dialingCode = selectedCountry ? selectedCountry.code : '';

      const response = await fetch('/api/v1/auth/registry', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          phoneNumber: `${dialingCode}${formData.phoneNumber.trim()}`,
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

      // /registry returns 201 with no body — no token, no auto-login.
      // The backend sends a 6-digit verification code to the user's email.
      setSuccess(true);

      // After 2 seconds close this modal and open the login modal
      setTimeout(() => {
        const resetData = {
          firstName: '',
          lastName: '',
          countryCode: 'US:+1',
          phoneNumber: '',
          email: '',
          password: '',
          confirmPassword: '',
        };
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
        if (onSwitchToLogin) {
          setTimeout(() => onSwitchToLogin(), 300);
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
        countryCode: 'US:+1',
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
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth fullScreen={isMobile}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pr: 1 }}>
        {t('auth.signUpTitle')}
        <IconButton size="small" onClick={handleClose} aria-label="close">
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
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

          <Box
            sx={{
              display: 'flex',
              gap: 2,
              flexDirection: { xs: 'column', sm: 'row' },
              mt: 2,
            }}
          >
            <TextField
              select
              fullWidth
              id="countryCode"
              name="countryCode"
              label={t('auth.countryCode')}
              value={formData.countryCode}
              onChange={handleChange}
              margin="normal"
              required
              disabled={loading || success}
              variant="outlined"
              sx={{ flex: { xs: '1 1 auto', sm: '0 0 200px' } }}
              SelectProps={{
                renderValue: (selected) => {
                  const match = countryCodes.find((c) => c.key === selected);
                  return match ? `${match.flag} ${match.label}` : selected;
                },
                MenuProps: {
                  disablePortal: true,
                  anchorOrigin: { vertical: 'bottom', horizontal: 'left' },
                  transformOrigin: { vertical: 'top', horizontal: 'left' },
                  PaperProps: { sx: { maxHeight: 320 } },
                },
              }}
            >
              {sortedCountryCodes.map((option) => (
                <MenuItem key={option.key} value={option.key}>
                  {option.flag} {option.label}
                </MenuItem>
              ))}
            </TextField>
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
              placeholder="5551234567"
              inputProps={{ maxLength: 10 }}
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
          </Box>

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
