import React, { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { fetchWithAuth, fetchUserProfile, clearUserProfileCache, fetchUserSettings, clearUserSettingsCache, getToken } from '../utils/api';
import {
  Box,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Alert,
  Grid,
  Divider,
  TextField,
  Button,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  ListItemIcon,
  Switch,
  FormControlLabel,
  CardHeader,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';

// Common timezones with unique UTC offsets (one representative per offset)
// Format: { value: timezone, offset: UTC offset, labelKey: translation key }
const COMMON_TIMEZONES = [
  { value: 'UTC', offset: '+00:00', labelKey: 'UTC' },
  { value: 'Europe/London', offset: '+00:00', labelKey: 'Europe/London' },
  { value: 'Europe/Paris', offset: '+01:00', labelKey: 'Europe/Paris' },
  { value: 'Europe/Berlin', offset: '+01:00', labelKey: 'Europe/Berlin' },
  { value: 'Europe/Athens', offset: '+02:00', labelKey: 'Europe/Athens' },
  { value: 'Europe/Moscow', offset: '+03:00', labelKey: 'Europe/Moscow' },
  { value: 'Asia/Dubai', offset: '+04:00', labelKey: 'Asia/Dubai' },
  { value: 'Asia/Tashkent', offset: '+05:00', labelKey: 'Asia/Tashkent' },
  { value: 'Asia/Kolkata', offset: '+05:30', labelKey: 'Asia/Kolkata' },
  { value: 'Asia/Dhaka', offset: '+06:00', labelKey: 'Asia/Dhaka' },
  { value: 'Asia/Bangkok', offset: '+07:00', labelKey: 'Asia/Bangkok' },
  { value: 'Asia/Singapore', offset: '+08:00', labelKey: 'Asia/Singapore' },
  { value: 'Asia/Shanghai', offset: '+08:00', labelKey: 'Asia/Shanghai' },
  { value: 'Asia/Tokyo', offset: '+09:00', labelKey: 'Asia/Tokyo' },
  { value: 'Australia/Sydney', offset: '+10:00', labelKey: 'Australia/Sydney' },
  { value: 'Pacific/Auckland', offset: '+12:00', labelKey: 'Pacific/Auckland' },
  { value: 'America/Honolulu', offset: '-10:00', labelKey: 'America/Honolulu' },
  { value: 'America/Anchorage', offset: '-09:00', labelKey: 'America/Anchorage' },
  { value: 'America/Los_Angeles', offset: '-08:00', labelKey: 'America/Los_Angeles' },
  { value: 'America/Denver', offset: '-07:00', labelKey: 'America/Denver' },
  { value: 'America/Chicago', offset: '-06:00', labelKey: 'America/Chicago' },
  { value: 'America/New_York', offset: '-05:00', labelKey: 'America/New_York' },
  { value: 'America/Caracas', offset: '-04:00', labelKey: 'America/Caracas' },
  { value: 'America/Sao_Paulo', offset: '-03:00', labelKey: 'America/Sao_Paulo' },
];

// Group timezones by unique offset and keep only one representative per offset
const getUniqueTimezoneOffsets = () => {
  const offsetMap = new Map();

  COMMON_TIMEZONES.forEach((tz) => {
    if (!offsetMap.has(tz.offset)) {
      offsetMap.set(tz.offset, tz);
    }
  });

  return Array.from(offsetMap.values()).sort((a, b) => {
    // Sort: UTC first, then positive offsets (highest first), then negative offsets (least negative first)
    if (a.offset === '+00:00') return -1;
    if (b.offset === '+00:00') return 1;

    const offsetA = a.offset;
    const offsetB = b.offset;

    // Both positive or both negative
    if ((offsetA.startsWith('+') && offsetB.startsWith('+')) ||
      (offsetA.startsWith('-') && offsetB.startsWith('-'))) {
      return offsetB.localeCompare(offsetA);
    }

    // One positive, one negative
    if (offsetA.startsWith('+')) return -1;
    return 1;
  });
};

const ProfilePage = () => {
  const { t } = useTranslation();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [firstNameError, setFirstNameError] = useState('');
  const [lastNameError, setLastNameError] = useState('');
  const [phoneNumberError, setPhoneNumberError] = useState('');
  const [editingFirstName, setEditingFirstName] = useState(false);
  const [editingLastName, setEditingLastName] = useState(false);
  const [editingPhoneNumber, setEditingPhoneNumber] = useState(false);

  // Settings state
  const [settings, setSettings] = useState(null);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [settingsError, setSettingsError] = useState(null);
  const [settingsFormData, setSettingsFormData] = useState({
    timezone: '',
    language: '',
    currency: '',
    emailNotificationEnabled: false,
  });
  const [settingsErrors, setSettingsErrors] = useState({
    timezone: '',
    language: '',
    currency: '',
  });
  const [savingSettings, setSavingSettings] = useState(false);

  const timezones = getUniqueTimezoneOffsets();
  const languages = ['english', 'spanish', 'french', 'german', 'italian', 'portuguese', 'russian', 'chinese', 'japanese'];
  const currencies = [
    { value: 'Rubles', symbol: '₽', displayName: t('pages.profile.currencies.RUB') },
    { value: 'Tenge', symbol: '₸', displayName: t('pages.profile.currencies.TENGE') },
    { value: 'USD', symbol: '$', displayName: t('pages.profile.currencies.USD') },
  ];

  // Track current token to detect user changes
  const [currentToken, setCurrentToken] = useState(getToken());

  // Listen for token changes and clear cache when user changes
  useEffect(() => {
    const checkTokenChange = () => {
      const newToken = getToken();
      if (newToken !== currentToken) {
        // Token changed - clear caches and reset state
        clearUserProfileCache();
        clearUserSettingsCache();
        setProfile(null);
        setSettings(null);
        setFirstName('');
        setLastName('');
        setSettingsFormData({
          timezone: '',
          language: 'english',
          currency: '',
          emailNotificationEnabled: true,
        });
        setPhoneNumber('');
        setCurrentToken(newToken);
        // The useEffects will automatically reload data when currentToken changes
      }
    };

    const handleStorageChange = (e) => {
      if (e.key === 'auth_token' || e.key === null) {
        checkTokenChange();
      }
    };

    const handleAuthChanged = () => {
      checkTokenChange();
    };

    const handleTokenExpired = () => {
      checkTokenChange();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('auth-changed', handleAuthChanged);
    window.addEventListener('token-expired', handleTokenExpired);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('auth-changed', handleAuthChanged);
      window.removeEventListener('token-expired', handleTokenExpired);
    };
  }, [currentToken]);

  // Helper function to normalize currency value
  const normalizeCurrencyValue = (value) => {
    if (!value) return '';
    // Check if it's already a valid value
    const currencyByValue = currencies.find(c => c.value === value);
    if (currencyByValue) return currencyByValue.value;
    // Check if it's a display name
    const currencyByDisplayName = currencies.find(c => c.displayName === value);
    if (currencyByDisplayName) return currencyByDisplayName.value;
    // Return empty if no match
    return '';
  };

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      // Clear cache to ensure fresh data on each page load
      clearUserProfileCache();
      // Reset state to avoid showing stale data
      setProfile(null);
      setFirstName('');
      setLastName('');
      setLoading(true);
      setError('');

      try {
        // Fetch fresh profile data
        const data = await fetchUserProfile();
        if (!isMounted) return;

        if (data) {
          setProfile(data);
          setFirstName(data?.firstName || '');
          setLastName(data?.lastName || '');
          setPhoneNumber(data?.phoneNumber || '');
        } else {
          setError(t('pages.profile.noProfileData'));
        }
      } catch (e) {
        if (!isMounted) return;

        setError(e.message || t('pages.profile.failedToLoadProfile'));
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      isMounted = false;
    };
  }, [currentToken]);

  // Fetch settings
  useEffect(() => {
    let isMounted = true;

    const loadSettings = async () => {
      // Clear cache to ensure fresh data on each page load
      clearUserSettingsCache();
      // Reset state to avoid showing stale data
      setSettings(null);
      setSettingsFormData({
        timezone: '',
        language: 'english',
        currency: '',
        emailNotificationEnabled: true,
      });
      setSettingsLoading(true);
      setSettingsError(null);

      try {
        // Fetch fresh settings data
        const data = await fetchUserSettings();
        if (!isMounted) return;

        if (data) {
          setSettings(data);
          setSettingsFormData({
            timezone: data.timezone || '',
            language: data.language || 'english',
            currency: normalizeCurrencyValue(data.currency),
            emailNotificationEnabled: data.emailNotificationEnabled !== undefined ? data.emailNotificationEnabled : true,
          });
        }
      } catch (err) {
        if (!isMounted) return;

        console.error('Error fetching settings:', err);
        setSettingsError(err.message || t('pages.profile.failedToLoadSettings'));
      } finally {
        if (isMounted) {
          setSettingsLoading(false);
        }
      }
    };

    loadSettings();

    return () => {
      isMounted = false;
    };
  }, [currentToken]);

  const validate = () => {
    let ok = true;
    const fn = (firstName || '').trim();
    const ln = (lastName || '').trim();
    if (fn.length > 100) {
      setFirstNameError('First name must be at most 100 characters');
      ok = false;
    } else {
      setFirstNameError('');
    }
    if (ln.length > 100) {
      setLastNameError('Last name must be at most 100 characters');
      ok = false;
    } else {
      setLastNameError('');
    }
    const pn = (phoneNumber || '').trim();
    if (pn && !/^\+?[\d\s-]{10,20}$/.test(pn)) {
      setPhoneNumberError(t('pages.profile.phoneNumberInvalid'));
      ok = false;
    } else {
      setPhoneNumberError('');
    }
    return ok;
  };

  // Check if there are any changes (memoized for reactivity)
  const hasChanges = useMemo(() => {
    const profileChanged =
      (firstName || '').trim() !== (profile?.firstName || '') ||
      (lastName || '').trim() !== (profile?.lastName || '') ||
      (phoneNumber || '').trim() !== (profile?.phoneNumber || '');

    const settingsChanged =
      settingsFormData.timezone !== (settings?.timezone || '') ||
      settingsFormData.language !== (settings?.language || 'english') ||
      settingsFormData.currency !== (settings?.currency || '') ||
      settingsFormData.emailNotificationEnabled !== (settings?.emailNotificationEnabled ?? true);

    return profileChanged || settingsChanged;
  }, [firstName, lastName, phoneNumber, profile?.firstName, profile?.lastName, profile?.phoneNumber, settingsFormData.timezone, settingsFormData.language, settingsFormData.currency, settingsFormData.emailNotificationEnabled, settings?.timezone, settings?.language, settings?.currency, settings?.emailNotificationEnabled]);

  const handleSave = async () => {
    setSaveError('');
    setSaveSuccess('');

    // Track what needs to be saved
    const profileChanged =
      (firstName || '').trim() !== (profile?.firstName || '') ||
      (lastName || '').trim() !== (profile?.lastName || '') ||
      (phoneNumber || '').trim() !== (profile?.phoneNumber || '');

    const settingsChanged =
      settingsFormData.timezone !== (settings?.timezone || '') ||
      settingsFormData.language !== (settings?.language || 'english') ||
      settingsFormData.currency !== (settings?.currency || '') ||
      settingsFormData.emailNotificationEnabled !== (settings?.emailNotificationEnabled ?? true);

    // Validate profile changes
    if (profileChanged && !validate()) {
      return;
    }

    // Validate settings changes
    if (settingsChanged && !validateSettings()) {
      return;
    }

    // If nothing changed, don't make any API calls
    if (!profileChanged && !settingsChanged) {
      return;
    }

    setSaving(true);
    setSavingSettings(true);

    const errors = [];

    // Save profile if changed
    if (profileChanged) {
      try {
        const body = {
          firstName: (firstName || '').trim(),
          lastName: (lastName || '').trim(),
          phoneNumber: (phoneNumber || '').trim(),
        };
        const res = await fetchWithAuth('/api/v1/user/profile', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const errText = await res.text().catch(() => '');
          throw new Error(errText || `Failed to update profile: ${res.status} ${res.statusText}`);
        }
        // If backend returns updated profile, prefer it; else use local state
        let updated = null;
        try {
          updated = await res.json();
        } catch {
          // response might have no body
        }
        const newProfile = updated || { ...(profile || {}), firstName: body.firstName, lastName: body.lastName, phoneNumber: body.phoneNumber };
        setProfile(newProfile);
        // Clear cache so next fetch gets fresh data
        clearUserProfileCache();
        // Reset editing states to show pencil icons again
        setEditingFirstName(false);
        setEditingLastName(false);
        setEditingPhoneNumber(false);
        // Notify app to refresh displayed user name if needed
        window.dispatchEvent(new Event('auth-changed'));
      } catch (e) {
        errors.push(e.message || t('pages.profile.failedToUpdateProfile'));
      }
    }

    // Save settings if changed
    if (settingsChanged) {
      try {
        const response = await fetchWithAuth('/api/v1/user/setting', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            timezone: settingsFormData.timezone.trim(),
            language: settingsFormData.language.trim(),
            currency: settingsFormData.currency.trim(),
            emailNotificationEnabled: settingsFormData.emailNotificationEnabled,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.message || `Failed to update settings: ${response.status} ${response.statusText}`
          );
        }

        const updatedData = await response.json();
        setSettings(updatedData);
        // Clear cache so next fetch gets fresh data
        clearUserSettingsCache();
      } catch (err) {
        errors.push(err.message || t('pages.profile.failedToUpdateSettings'));
      }
    }

    // Show success or error messages
    if (errors.length > 0) {
      setSaveError(errors.join('; '));
    } else {
      if (profileChanged && settingsChanged) {
        setSaveSuccess(t('pages.profile.profileAndSettingsUpdated'));
      } else if (profileChanged) {
        setSaveSuccess(t('pages.profile.profileUpdated'));
      } else if (settingsChanged) {
        setSaveSuccess(t('pages.profile.settingsUpdated'));
      }

      // Clear success message after 3 seconds
      setTimeout(() => {
        setSaveSuccess('');
      }, 3000);
    }

    setSaving(false);
    setSavingSettings(false);
  };

  const validateSettings = () => {
    const newErrors = {
      timezone: '',
      language: '',
      currency: '',
    };
    let isValid = true;

    if (!settingsFormData.timezone.trim()) {
      newErrors.timezone = t('pages.profile.timezoneRequired');
      isValid = false;
    } else if (settingsFormData.timezone.length > 50) {
      newErrors.timezone = t('pages.profile.timezoneMaxLength');
      isValid = false;
    }

    if (!settingsFormData.language.trim()) {
      newErrors.language = t('pages.profile.languageRequired');
      isValid = false;
    } else if (settingsFormData.language.length > 10) {
      newErrors.language = t('pages.profile.languageMaxLength');
      isValid = false;
    }

    if (!settingsFormData.currency.trim()) {
      newErrors.currency = t('pages.profile.currencyRequired');
      isValid = false;
    } else {
      const validCurrencyValues = currencies.map(c => c.value);
      if (!validCurrencyValues.includes(settingsFormData.currency)) {
        newErrors.currency = t('pages.profile.currencyInvalid');
        isValid = false;
      }
    }

    setSettingsErrors(newErrors);
    return isValid;
  };

  const handleSettingsFieldChange = (field, value) => {
    setSettingsFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    // Clear error when user starts typing
    if (settingsErrors[field]) {
      setSettingsErrors((prev) => ({
        ...prev,
        [field]: '',
      }));
    }
    setSaveError('');
    setSaveSuccess('');
  };


  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom sx={{ mb: 3 }}>
        {t('pages.profile.title')}
      </Typography>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 160 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error">{error}</Alert>
      ) : (
        <Grid container spacing={4}>
          <Grid item xs={12}>
            {saveError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {saveError}
              </Alert>
            )}
            {saveSuccess && (
              <Alert severity="success" sx={{ mb: 2 }}>
                {saveSuccess}
              </Alert>
            )}

            {/* Personal Information Card */}
            <Card sx={{ mb: 4 }}>
              <CardHeader
                title={t('pages.profile.personalInfo')}
                titleTypographyProps={{ variant: 'h6' }}
              />
              <Divider />
              <CardContent>
                <Grid container spacing={3}>
                  {/* First row: First name and Last name */}
                  <Grid item xs={12} sm={6}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {editingFirstName ? (
                        <TextField
                          fullWidth
                          label={t('pages.profile.firstName')}
                          value={firstName}
                          onChange={(e) => {
                            setFirstName(e.target.value);
                            setSaveError('');
                            setSaveSuccess('');
                            if (firstNameError) setFirstNameError('');
                          }}
                          error={!!firstNameError}
                          helperText={firstNameError}
                          disabled={saving || savingSettings}
                        />
                      ) : (
                        <Box sx={{ flexGrow: 1 }}>
                          <Typography variant="subtitle2" color="text.secondary">
                            {t('pages.profile.firstName')}
                          </Typography>
                          <Typography variant="body1">{firstName || '-'}</Typography>
                        </Box>
                      )}
                      {!editingFirstName && (
                        <IconButton
                          aria-label="Edit first name"
                          onClick={() => setEditingFirstName(true)}
                          size="small"
                          disabled={saving || savingSettings}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      )}
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {editingLastName ? (
                        <TextField
                          fullWidth
                          label={t('pages.profile.lastName')}
                          value={lastName}
                          onChange={(e) => {
                            setLastName(e.target.value);
                            setSaveError('');
                            setSaveSuccess('');
                            if (lastNameError) setLastNameError('');
                          }}
                          error={!!lastNameError}
                          helperText={lastNameError}
                          disabled={saving || savingSettings}
                        />
                      ) : (
                        <Box sx={{ flexGrow: 1 }}>
                          <Typography variant="subtitle2" color="text.secondary">
                            {t('pages.profile.lastName')}
                          </Typography>
                          <Typography variant="body1">{lastName || '-'}</Typography>
                        </Box>
                      )}
                      {!editingLastName && (
                        <IconButton
                          aria-label="Edit last name"
                          onClick={() => setEditingLastName(true)}
                          size="small"
                          disabled={saving || savingSettings}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      )}
                    </Box>
                  </Grid>

                  {/* Second row: Phone Number and Email */}
                  <Grid item xs={12} sm={6}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {editingPhoneNumber ? (
                        <TextField
                          fullWidth
                          label={t('pages.profile.phoneNumber')}
                          value={phoneNumber}
                          onChange={(e) => {
                            setPhoneNumber(e.target.value);
                            setSaveError('');
                            setSaveSuccess('');
                            if (phoneNumberError) setPhoneNumberError('');
                          }}
                          error={!!phoneNumberError}
                          helperText={phoneNumberError}
                          placeholder="+1234567890"
                          disabled={saving || savingSettings}
                        />
                      ) : (
                        <Box sx={{ flexGrow: 1 }}>
                          <Typography variant="subtitle2" color="text.secondary">
                            {t('pages.profile.phoneNumber')}
                          </Typography>
                          <Typography variant="body1">{phoneNumber || '-'}</Typography>
                        </Box>
                      )}
                      {!editingPhoneNumber && (
                        <IconButton
                          aria-label="Edit phone number"
                          onClick={() => setEditingPhoneNumber(true)}
                          size="small"
                          disabled={saving || savingSettings}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      )}
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      {t('pages.profile.email')}
                    </Typography>
                    <Typography variant="body1">{profile?.email || '-'}</Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* User Settings Card */}
            {settingsLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 80 }}>
                <CircularProgress />
              </Box>
            ) : settingsError ? (
              <Alert severity="error" sx={{ mb: 2 }}>
                {settingsError}
              </Alert>
            ) : settings ? (
              <Card>
                <CardHeader
                  title={t('pages.profile.userSettings')}
                  titleTypographyProps={{ variant: 'h6' }}
                />
                <Divider />
                <CardContent>
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                      <FormControl fullWidth>
                        <InputLabel id="timezone-label">{t('pages.profile.timezone')}</InputLabel>
                        <Select
                          labelId="timezone-label"
                          id="timezone"
                          value={settingsFormData.timezone}
                          label={t('pages.profile.timezone')}
                          onChange={(e) => handleSettingsFieldChange('timezone', e.target.value)}
                          error={!!settingsErrors.timezone}
                          disabled={saving || savingSettings}
                        >
                          {timezones.map((tz) => (
                            <MenuItem key={tz.value} value={tz.value}>
                              {t(`pages.profile.timezones.${tz.labelKey}`)} ({tz.offset})
                            </MenuItem>
                          ))}
                        </Select>
                        {settingsErrors.timezone && (
                          <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.75 }}>
                            {settingsErrors.timezone}
                          </Typography>
                        )}
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                          {t('pages.profile.timezoneDescription')}
                        </Typography>
                      </FormControl>
                    </Grid>

                    <Grid item xs={12} md={6}>
                      <FormControl fullWidth>
                        <InputLabel id="currency-label">{t('pages.profile.currency')}</InputLabel>
                        <Select
                          labelId="currency-label"
                          id="currency"
                          value={settingsFormData.currency}
                          label={t('pages.profile.currency')}
                          onChange={(e) => handleSettingsFieldChange('currency', e.target.value)}
                          error={!!settingsErrors.currency}
                          disabled={saving || savingSettings}
                          required
                          renderValue={(selected) => {
                            if (!selected) return '';
                            const currency = currencies.find(c => c.value === selected);
                            if (!currency) return selected;
                            // Use a simple approach that Material-UI can reliably render
                            return (
                              <span>
                                <span style={{ fontSize: '1.1rem', fontWeight: 'bold', marginRight: '6px' }}>
                                  {currency.symbol}
                                </span>
                                {currency.displayName}
                              </span>
                            );
                          }}
                        >
                          {currencies.map((currency) => (
                            <MenuItem key={currency.value} value={currency.value}>
                              <ListItemIcon sx={{ minWidth: 32 }}>
                                <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>
                                  {currency.symbol}
                                </span>
                              </ListItemIcon>
                              {currency.displayName}
                            </MenuItem>
                          ))}
                        </Select>
                        {settingsErrors.currency && (
                          <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.75 }}>
                            {settingsErrors.currency}
                          </Typography>
                        )}
                      </FormControl>
                    </Grid>

                    {/* Next row: Email Notifications */}
                    <Grid item xs={12} md={6}>
                      <Box sx={{ height: '100%', display: 'flex', alignItems: 'center' }}>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={settingsFormData.emailNotificationEnabled}
                              onChange={(e) => handleSettingsFieldChange('emailNotificationEnabled', e.target.checked)}
                              disabled={saving || savingSettings}
                            />
                          }
                          label={t('pages.profile.emailNotifications')}
                        />
                      </Box>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: -1 }}>
                        {t('pages.profile.emailNotificationDescription')}
                      </Typography>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            ) : null}

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 4 }}>
              <Button
                variant="contained"
                color="primary"
                onClick={handleSave}
                disabled={saving || savingSettings || !hasChanges}
                sx={{ textTransform: 'none', px: 4, py: 1 }}
              >
                {(saving || savingSettings) ? (
                  <>
                    <CircularProgress size={16} sx={{ mr: 1, color: 'inherit' }} />
                    {t('pages.profile.saving')}
                  </>
                ) : (
                  t('pages.profile.saveChanges')
                )}
              </Button>
            </Box>
          </Grid>
        </Grid>
      )}
    </Box>
  );
};

export default ProfilePage;


