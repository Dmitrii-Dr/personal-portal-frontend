import React, { useState, useEffect } from 'react';
import { fetchWithAuth } from '../utils/api';
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Grid,
  Paper,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';

const SettingsPage = () => {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    timezone: '',
    language: '',
  });
  const [errors, setErrors] = useState({
    timezone: '',
    language: '',
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState('');

  // Get all available timezones
  const getTimezones = () => {
    try {
      // Use Intl.supportedValuesOf if available (modern browsers)
      if (typeof Intl !== 'undefined' && Intl.supportedValuesOf) {
        return Intl.supportedValuesOf('timeZone').sort();
      }
      // Fallback: common timezones
      return [
        'UTC',
        'America/New_York',
        'America/Chicago',
        'America/Denver',
        'America/Los_Angeles',
        'Europe/London',
        'Europe/Paris',
        'Europe/Berlin',
        'Asia/Tokyo',
        'Asia/Shanghai',
        'Asia/Dubai',
        'Asia/Tashkent',
        'Australia/Sydney',
        'America/Sao_Paulo',
      ].sort();
    } catch (e) {
      // Fallback if Intl.supportedValuesOf is not available
      return [
        'UTC',
        'America/New_York',
        'America/Chicago',
        'America/Denver',
        'America/Los_Angeles',
        'Europe/London',
        'Europe/Paris',
        'Europe/Berlin',
        'Asia/Tokyo',
        'Asia/Shanghai',
        'Asia/Dubai',
        'Asia/Tashkent',
        'Australia/Sydney',
        'America/Sao_Paulo',
      ].sort();
    }
  };

  const timezones = getTimezones();
  const languages = ['english', 'spanish', 'french', 'german', 'italian', 'portuguese', 'russian', 'chinese', 'japanese'];

  useEffect(() => {
    const fetchSettings = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetchWithAuth('/api/v1/user/setting');
        if (!response.ok) {
          throw new Error(`Failed to load settings: ${response.status}`);
        }
        const data = await response.json();
        setSettings(data);
        setFormData({
          timezone: data.timezone || '',
          language: data.language || 'english',
        });
      } catch (err) {
        console.error('Error fetching settings:', err);
        setError(err.message || 'Failed to load settings. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const validateForm = () => {
    const newErrors = {
      timezone: '',
      language: '',
    };
    let isValid = true;

    if (!formData.timezone.trim()) {
      newErrors.timezone = 'Timezone is required';
      isValid = false;
    } else if (formData.timezone.length > 50) {
      newErrors.timezone = 'Timezone must be at most 50 characters';
      isValid = false;
    }

    if (!formData.language.trim()) {
      newErrors.language = 'Language is required';
      isValid = false;
    } else if (formData.language.length > 10) {
      newErrors.language = 'Language must be at most 10 characters';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleFieldChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: '',
      }));
    }
    setSaveError('');
    setSaveSuccess('');
  };

  const handleSave = async () => {
    setSaveError('');
    setSaveSuccess('');

    if (!validateForm()) {
      return;
    }

    setSaving(true);
    try {
      const response = await fetchWithAuth('/api/v1/user/setting', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          timezone: formData.timezone.trim(),
          language: formData.language.trim(),
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
      setSaveSuccess('Settings updated successfully!');
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSaveSuccess('');
      }, 3000);
    } catch (err) {
      console.error('Error updating settings:', err);
      setSaveError(err.message || 'Failed to update settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '60vh',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ mt: 2 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Settings
      </Typography>

      {saveSuccess && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {saveSuccess}
        </Alert>
      )}

      {saveError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {saveError}
        </Alert>
      )}

      {settings && (
        <Grid container spacing={3} sx={{ mt: 2 }}>
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                User Settings
              </Typography>
              
              <Box sx={{ mt: 3 }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  ID:
                </Typography>
                <Typography variant="body1" sx={{ mb: 3 }}>
                  {settings.id}
                </Typography>

                <FormControl fullWidth sx={{ mb: 3 }}>
                  <InputLabel id="timezone-label">Timezone</InputLabel>
                  <Select
                    labelId="timezone-label"
                    id="timezone"
                    value={formData.timezone}
                    label="Timezone"
                    onChange={(e) => handleFieldChange('timezone', e.target.value)}
                    error={!!errors.timezone}
                    disabled={saving}
                  >
                    {timezones.map((tz) => (
                      <MenuItem key={tz} value={tz}>
                        {tz}
                      </MenuItem>
                    ))}
                  </Select>
                  {errors.timezone && (
                    <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.75 }}>
                      {errors.timezone}
                    </Typography>
                  )}
                </FormControl>

                <FormControl fullWidth sx={{ mb: 3 }}>
                  <InputLabel id="language-label">Language</InputLabel>
                  <Select
                    labelId="language-label"
                    id="language"
                    value={formData.language}
                    label="Language"
                    onChange={(e) => handleFieldChange('language', e.target.value)}
                    error={!!errors.language}
                    disabled={saving}
                  >
                    {languages.map((lang) => (
                      <MenuItem key={lang} value={lang}>
                        {lang.charAt(0).toUpperCase() + lang.slice(1)}
                      </MenuItem>
                    ))}
                  </Select>
                  {errors.language && (
                    <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.75 }}>
                      {errors.language}
                    </Typography>
                  )}
                </FormControl>

                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleSave}
                    disabled={saving}
                    sx={{ textTransform: 'none' }}
                  >
                    {saving ? (
                      <>
                        <CircularProgress size={16} sx={{ mr: 1 }} />
                        Saving...
                      </>
                    ) : (
                      'Save Settings'
                    )}
                  </Button>
                </Box>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      )}
    </Box>
  );
};

export default SettingsPage;

