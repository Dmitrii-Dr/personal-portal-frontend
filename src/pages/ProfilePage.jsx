import React, { useEffect, useState, useMemo } from 'react';
import { fetchWithAuth } from '../utils/api';
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
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';

// Common timezones with unique UTC offsets (one representative per offset)
// Format: { value: timezone, offset: UTC offset, label: display name }
const COMMON_TIMEZONES = [
  { value: 'UTC', offset: '+00:00', label: 'UTC' },
  { value: 'Europe/London', offset: '+00:00', label: 'Europe/London' },
  { value: 'Europe/Paris', offset: '+01:00', label: 'Europe/Paris' },
  { value: 'Europe/Berlin', offset: '+01:00', label: 'Europe/Berlin' },
  { value: 'Europe/Athens', offset: '+02:00', label: 'Europe/Athens' },
  { value: 'Europe/Moscow', offset: '+03:00', label: 'Europe/Moscow' },
  { value: 'Asia/Dubai', offset: '+04:00', label: 'Asia/Dubai' },
  { value: 'Asia/Tashkent', offset: '+05:00', label: 'Asia/Tashkent' },
  { value: 'Asia/Kolkata', offset: '+05:30', label: 'Asia/Kolkata' },
  { value: 'Asia/Dhaka', offset: '+06:00', label: 'Asia/Dhaka' },
  { value: 'Asia/Bangkok', offset: '+07:00', label: 'Asia/Bangkok' },
  { value: 'Asia/Singapore', offset: '+08:00', label: 'Asia/Singapore' },
  { value: 'Asia/Shanghai', offset: '+08:00', label: 'Asia/Shanghai' },
  { value: 'Asia/Tokyo', offset: '+09:00', label: 'Asia/Tokyo' },
  { value: 'Australia/Sydney', offset: '+10:00', label: 'Australia/Sydney' },
  { value: 'Pacific/Auckland', offset: '+12:00', label: 'Pacific/Auckland' },
  { value: 'America/Honolulu', offset: '-10:00', label: 'America/Honolulu' },
  { value: 'America/Anchorage', offset: '-09:00', label: 'America/Anchorage' },
  { value: 'America/Los_Angeles', offset: '-08:00', label: 'America/Los_Angeles' },
  { value: 'America/Denver', offset: '-07:00', label: 'America/Denver' },
  { value: 'America/Chicago', offset: '-06:00', label: 'America/Chicago' },
  { value: 'America/New_York', offset: '-05:00', label: 'America/New_York' },
  { value: 'America/Caracas', offset: '-04:00', label: 'America/Caracas' },
  { value: 'America/Sao_Paulo', offset: '-03:00', label: 'America/Sao_Paulo' },
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
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [firstNameError, setFirstNameError] = useState('');
  const [lastNameError, setLastNameError] = useState('');
  const [editingFirstName, setEditingFirstName] = useState(false);
  const [editingLastName, setEditingLastName] = useState(false);
  
  // Settings state
  const [settings, setSettings] = useState(null);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [settingsError, setSettingsError] = useState(null);
  const [settingsFormData, setSettingsFormData] = useState({
    timezone: '',
    language: '',
  });
  const [settingsErrors, setSettingsErrors] = useState({
    timezone: '',
    language: '',
  });
  const [savingSettings, setSavingSettings] = useState(false);

  const timezones = getUniqueTimezoneOffsets();
  const languages = ['english', 'spanish', 'french', 'german', 'italian', 'portuguese', 'russian', 'chinese', 'japanese'];

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetchWithAuth('/api/v1/user/profile');
        if (!res.ok) {
          throw new Error(`Failed to load profile: ${res.status} ${res.statusText}`);
        }
        const data = await res.json();
        if (isMounted) {
          setProfile(data);
          setFirstName(data?.firstName || '');
          setLastName(data?.lastName || '');
        }
      } catch (e) {
        if (isMounted) {
          setError(e.message || 'Failed to load profile');
        }
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
  }, []);

  // Fetch settings
  useEffect(() => {
    let isMounted = true;
    const fetchSettings = async () => {
      setSettingsLoading(true);
      setSettingsError(null);
      try {
        const response = await fetchWithAuth('/api/v1/user/setting');
        if (!response.ok) {
          throw new Error(`Failed to load settings: ${response.status}`);
        }
        const data = await response.json();
        if (isMounted) {
          setSettings(data);
          setSettingsFormData({
            timezone: data.timezone || '',
            language: data.language || 'english',
          });
        }
      } catch (err) {
        if (isMounted) {
          console.error('Error fetching settings:', err);
          setSettingsError(err.message || 'Failed to load settings. Please try again.');
        }
      } finally {
        if (isMounted) {
          setSettingsLoading(false);
        }
      }
    };

    fetchSettings();
    return () => {
      isMounted = false;
    };
  }, []);

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
    return ok;
  };

  // Check if there are any changes (memoized for reactivity)
  const hasChanges = useMemo(() => {
    const profileChanged = 
      (firstName || '').trim() !== (profile?.firstName || '') ||
      (lastName || '').trim() !== (profile?.lastName || '');
    
    const settingsChanged = 
      settingsFormData.timezone !== (settings?.timezone || '') ||
      settingsFormData.language !== (settings?.language || 'english');
    
    return profileChanged || settingsChanged;
  }, [firstName, lastName, profile?.firstName, profile?.lastName, settingsFormData.timezone, settingsFormData.language, settings?.timezone, settings?.language]);

  const handleSave = async () => {
    setSaveError('');
    setSaveSuccess('');
    
    // Track what needs to be saved
    const profileChanged = 
      (firstName || '').trim() !== (profile?.firstName || '') ||
      (lastName || '').trim() !== (profile?.lastName || '');
    
    const settingsChanged = 
      settingsFormData.timezone !== (settings?.timezone || '') ||
      settingsFormData.language !== (settings?.language || 'english');
    
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
        const newProfile = updated || { ...(profile || {}), firstName: body.firstName, lastName: body.lastName };
        setProfile(newProfile);
        // Reset editing states to show pencil icons again
        setEditingFirstName(false);
        setEditingLastName(false);
        // Notify app to refresh displayed user name if needed
        window.dispatchEvent(new Event('auth-changed'));
      } catch (e) {
        errors.push(e.message || 'Failed to update profile');
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
      } catch (err) {
        errors.push(err.message || 'Failed to update settings');
      }
    }
    
    // Show success or error messages
    if (errors.length > 0) {
      setSaveError(errors.join('; '));
    } else {
      if (profileChanged && settingsChanged) {
        setSaveSuccess('Profile and settings updated successfully!');
      } else if (profileChanged) {
        setSaveSuccess('Profile updated successfully!');
      } else if (settingsChanged) {
        setSaveSuccess('Settings updated successfully!');
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
    };
    let isValid = true;

    if (!settingsFormData.timezone.trim()) {
      newErrors.timezone = 'Timezone is required';
      isValid = false;
    } else if (settingsFormData.timezone.length > 50) {
      newErrors.timezone = 'Timezone must be at most 50 characters';
      isValid = false;
    }

    if (!settingsFormData.language.trim()) {
      newErrors.language = 'Language is required';
      isValid = false;
    } else if (settingsFormData.language.length > 10) {
      newErrors.language = 'Language must be at most 10 characters';
      isValid = false;
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
      <Typography variant="h4" component="h1" gutterBottom>
        My Profile
      </Typography>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 160 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error">{error}</Alert>
      ) : (
        <Card>
          <CardContent>
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
            <Grid container spacing={2}>
              {/* First row: First name and Last name */}
              <Grid item xs={12} sm={6}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
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
                  {editingFirstName ? (
                    <TextField
                      fullWidth
                      label="First name"
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
                        First name
                      </Typography>
                      <Typography variant="body1">{firstName || '-'}</Typography>
                    </Box>
                  )}
                </Box>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
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
                  {editingLastName ? (
                    <TextField
                      fullWidth
                      label="Last name"
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
                        Last name
                      </Typography>
                      <Typography variant="body1">{lastName || '-'}</Typography>
                    </Box>
                  )}
                </Box>
              </Grid>
              {/* Second row: Email */}
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary">
                  Email
                </Typography>
                <Typography variant="body1">{profile?.email || '-'}</Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

            {/* User Settings Section */}
            <Divider sx={{ mt: 3, mb: 3 }} />
            <Typography variant="h6" gutterBottom>
              User Settings
            </Typography>

            {settingsLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 80 }}>
                <CircularProgress />
              </Box>
            ) : settingsError ? (
              <Alert severity="error" sx={{ mb: 2 }}>
                {settingsError}
              </Alert>
            ) : settings ? (
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel id="timezone-label">Timezone</InputLabel>
                    <Select
                      labelId="timezone-label"
                      id="timezone"
                      value={settingsFormData.timezone}
                      label="Timezone"
                      onChange={(e) => handleSettingsFieldChange('timezone', e.target.value)}
                      error={!!settingsErrors.timezone}
                      disabled={saving || savingSettings}
                    >
                      {timezones.map((tz) => (
                        <MenuItem key={tz.value} value={tz.value}>
                          {tz.label} ({tz.offset})
                        </MenuItem>
                      ))}
                    </Select>
                    {settingsErrors.timezone && (
                      <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.75 }}>
                        {settingsErrors.timezone}
                      </Typography>
                    )}
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                      Your timezone preference for viewing and booking sessions.
                    </Typography>
                  </FormControl>
                </Grid>

                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel id="language-label">Language</InputLabel>
                    <Select
                      labelId="language-label"
                      id="language"
                      value={settingsFormData.language}
                      label="Language"
                      onChange={(e) => handleSettingsFieldChange('language', e.target.value)}
                      error={!!settingsErrors.language}
                      disabled={saving || savingSettings}
                    >
                      {languages.map((lang) => (
                        <MenuItem key={lang} value={lang}>
                          {lang.charAt(0).toUpperCase() + lang.slice(1)}
                        </MenuItem>
                      ))}
                    </Select>
                    {settingsErrors.language && (
                      <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.75 }}>
                        {settingsErrors.language}
                      </Typography>
                    )}
                  </FormControl>
                </Grid>
              </Grid>
            ) : null}

            <Divider sx={{ mt: 3 }} />
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
              <Button
                variant="contained"
                color="primary"
                onClick={handleSave}
                disabled={saving || savingSettings || !hasChanges}
                sx={{ textTransform: 'none' }}
              >
                {(saving || savingSettings) ? (
                  <>
                    <CircularProgress size={16} sx={{ mr: 1 }} />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </Box>
    </Box>
  );
};

export default ProfilePage;


