import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { fetchWithAuth } from '../utils/api';
import { fetchTimezones, sortTimezonesByOffset, extractTimezoneOffset, findTimezoneIdByOffset } from '../utils/timezoneService';
import {
  Box,
  Typography,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Snackbar,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';

const BookingSettings = () => {
  const { t } = useTranslation();
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [formData, setFormData] = useState({
    bookingSlotsInterval: 0,
    bookingFirstSlotInterval: 10,
    bookingCancelationInterval: 0,
    bookingUpdatingInterval: 0,
    defaultTimezone: 'UTC',
  });
  const [formErrors, setFormErrors] = useState({});
  const hasFetchedRef = useRef(false);

  // Timezones state
  const [timezones, setTimezones] = useState([]);
  const [timezonesLoading, setTimezonesLoading] = useState(true);

  // Fetch booking settings
  const fetchSettings = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchWithAuth('/api/v1/admin/booking/setting');

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || t('admin.sessionConfiguration.bookingSettings.failedToLoad')
        );
      }

      const data = await response.json();
      setSettings(data);
      setFormData({
        bookingSlotsInterval: data.bookingSlotsInterval || 0,
        bookingFirstSlotInterval: data.bookingFirstSlotInterval || 10,
        bookingCancelationInterval: data.bookingCancelationInterval || 0,
        bookingUpdatingInterval: data.bookingUpdatingInterval || 0,
        defaultTimezone: extractTimezoneOffset(data.defaultTimezone) || '+00:00',
      });
    } catch (err) {
      console.error('Error fetching booking settings:', err);
      setError(err.message || t('admin.sessionConfiguration.bookingSettings.failedToLoad'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Prevent duplicate calls in React StrictMode
    if (hasFetchedRef.current) {
      return;
    }
    hasFetchedRef.current = true;
    fetchSettings();
  }, []);

  // Fetch timezones from API
  useEffect(() => {
    let isMounted = true;

    const loadTimezones = async () => {
      setTimezonesLoading(true);

      try {
        const data = await fetchTimezones();
        if (!isMounted) return;

        if (data && Array.isArray(data)) {
          const sortedTimezones = sortTimezonesByOffset(data);
          setTimezones(sortedTimezones);
        }
      } catch (err) {
        if (!isMounted) return;
        console.error('Error fetching timezones:', err);
      } finally {
        if (isMounted) {
          setTimezonesLoading(false);
        }
      }
    };

    loadTimezones();

    return () => {
      isMounted = false;
    };
  }, []);

  // Format minutes to readable format (hours and minutes)
  const formatMinutes = (minutes) => {
    if (minutes === 0) return `0 ${t('admin.sessionConfiguration.bookingSettings.minutes')}`;
    if (minutes < 60) {
      const minuteKey = minutes === 1 ? 'minute' : 'minutes';
      return `${minutes} ${t(`admin.sessionConfiguration.bookingSettings.${minuteKey}`)}`;
    }

    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    const hourKey = hours === 1 ? 'hour' : 'hours';
    let result = `${hours} ${t(`admin.sessionConfiguration.bookingSettings.${hourKey}`)}`;
    if (remainingMinutes > 0) {
      const minuteKey = remainingMinutes === 1 ? 'minute' : 'minutes';
      result += ` ${remainingMinutes} ${t(`admin.sessionConfiguration.bookingSettings.${minuteKey}`)}`;
    }
    return result;
  };

  // Handle edit mode
  const handleEdit = () => {
    setIsEditing(true);
    setSaveError(null);
    setFormErrors({});
  };

  // Handle cancel edit
  const handleCancel = () => {
    setIsEditing(false);
    setSaveError(null);
    setFormErrors({});
    // Reset form data to current settings
    if (settings) {
      setFormData({
        bookingSlotsInterval: settings.bookingSlotsInterval || 0,
        bookingFirstSlotInterval: settings.bookingFirstSlotInterval || 10,
        bookingCancelationInterval: settings.bookingCancelationInterval || 0,
        bookingUpdatingInterval: settings.bookingUpdatingInterval || 0,
        defaultTimezone: extractTimezoneOffset(settings.defaultTimezone) || '+00:00',
      });
    }
  };

  // Validate form
  const validateForm = () => {
    const errors = {};

    if (formData.bookingSlotsInterval < 0) {
      errors.bookingSlotsInterval = t('admin.sessionConfiguration.bookingSettings.mustBeGreaterThanOrEqual');
    }

    if (formData.bookingFirstSlotInterval < 10) {
      errors.bookingFirstSlotInterval = t('admin.sessionConfiguration.bookingSettings.mustBeGreaterThanOrEqual10');
    }

    if (formData.bookingCancelationInterval < 0) {
      errors.bookingCancelationInterval = t('admin.sessionConfiguration.bookingSettings.mustBeGreaterThanOrEqual');
    }

    if (formData.bookingUpdatingInterval < 0) {
      errors.bookingUpdatingInterval = t('admin.sessionConfiguration.bookingSettings.mustBeGreaterThanOrEqual');
    }

    if (!formData.defaultTimezone || formData.defaultTimezone.trim() === '') {
      errors.defaultTimezone = t('admin.sessionConfiguration.bookingSettings.timezoneRequired');
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle save
  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    setSaving(true);
    setSaveError(null);

    try {
      const response = await fetchWithAuth('/api/v1/admin/booking/setting', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bookingSlotsInterval: formData.bookingSlotsInterval,
          bookingFirstSlotInterval: formData.bookingFirstSlotInterval,
          bookingCancelationInterval: formData.bookingCancelationInterval,
          bookingUpdatingInterval: formData.bookingUpdatingInterval,
          defaultTimezoneId: findTimezoneIdByOffset(formData.defaultTimezone, timezones),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || t('admin.sessionConfiguration.bookingSettings.failedToUpdate')
        );
      }

      const updatedData = await response.json();
      setSettings(updatedData);
      setIsEditing(false);
      setSuccessMessage(t('admin.sessionConfiguration.bookingSettings.updatedSuccessfully'));
      fetchSettings(); // Refresh to get latest data
    } catch (err) {
      console.error('Error updating booking settings:', err);
      setSaveError(err.message || t('admin.sessionConfiguration.bookingSettings.failedToUpdate'));
    } finally {
      setSaving(false);
    }
  };

  // Handle input change
  const handleChange = (field) => (e) => {
    const value = e.target.value;
    setFormData((prev) => ({
      ...prev,
      [field]: field === 'defaultTimezone' ? value : parseInt(value, 10) || 0,
    }));
    // Clear error when user makes a change
    if (formErrors[field]) {
      setFormErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const timezoneChanged = settings && formData.defaultTimezone !== settings.defaultTimezone;

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error && !settings) {
    return (
      <Alert severity="error" onClose={() => setError(null)}>
        {error}
      </Alert>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">{t('admin.sessionConfiguration.bookingSettings.title')}</Typography>
        {!isEditing && (
          <Button
            variant="outlined"
            startIcon={<EditIcon />}
            onClick={handleEdit}
            sx={{ textTransform: 'none' }}
          >
            {t('admin.sessionConfiguration.bookingSettings.edit')}
          </Button>
        )}
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {saveError && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setSaveError(null)}>
          {saveError}
        </Alert>
      )}

      {timezoneChanged && isEditing && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {t('admin.sessionConfiguration.bookingSettings.timezoneChangedWarning')}
        </Alert>
      )}

      {!isEditing ? (
        // View Mode
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Typography variant="body2" color="text.secondary">
              {t('admin.sessionConfiguration.bookingSettings.bookingSlotsInterval')}
            </Typography>
            <Typography variant="body1" gutterBottom>
              {settings ? formatMinutes(settings.bookingSlotsInterval) : 'N/A'}
            </Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="body2" color="text.secondary">
              {t('admin.sessionConfiguration.bookingSettings.bookingFirstSlotInterval')}
            </Typography>
            <Typography variant="body1" gutterBottom>
              {settings ? formatMinutes(settings.bookingFirstSlotInterval) : 'N/A'}
            </Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="body2" color="text.secondary">
              {t('admin.sessionConfiguration.bookingSettings.bookingCancellationInterval')}
            </Typography>
            <Typography variant="body1" gutterBottom>
              {settings ? formatMinutes(settings.bookingCancelationInterval) : 'N/A'}
            </Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="body2" color="text.secondary">
              {t('admin.sessionConfiguration.bookingSettings.bookingUpdatingInterval')}
            </Typography>
            <Typography variant="body1" gutterBottom>
              {settings ? formatMinutes(settings.bookingUpdatingInterval) : 'N/A'}
            </Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="body2" color="text.secondary">
              {t('admin.sessionConfiguration.bookingSettings.defaultTimezone')}
            </Typography>
            <Typography variant="body1" gutterBottom>
              {extractTimezoneOffset(settings?.defaultTimezone) || 'N/A'}
            </Typography>
          </Grid>
        </Grid>
      ) : (
        // Edit Mode
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label={t('admin.sessionConfiguration.bookingSettings.bookingSlotsIntervalLabel')}
              type="number"
              value={formData.bookingSlotsInterval}
              onChange={handleChange('bookingSlotsInterval')}
              error={!!formErrors.bookingSlotsInterval}
              helperText={
                formErrors.bookingSlotsInterval ||
                t('admin.sessionConfiguration.bookingSettings.bookingSlotsIntervalHelper')
              }
              inputProps={{ min: 0 }}
              required
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label={t('admin.sessionConfiguration.bookingSettings.bookingFirstSlotIntervalLabel')}
              type="number"
              value={formData.bookingFirstSlotInterval}
              onChange={handleChange('bookingFirstSlotInterval')}
              error={!!formErrors.bookingFirstSlotInterval}
              helperText={
                formErrors.bookingFirstSlotInterval ||
                t('admin.sessionConfiguration.bookingSettings.bookingFirstSlotIntervalHelper')
              }
              inputProps={{ min: 10 }}
              required
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label={t('admin.sessionConfiguration.bookingSettings.bookingCancellationIntervalLabel')}
              type="number"
              value={formData.bookingCancelationInterval}
              onChange={handleChange('bookingCancelationInterval')}
              error={!!formErrors.bookingCancelationInterval}
              helperText={
                formErrors.bookingCancelationInterval ||
                t('admin.sessionConfiguration.bookingSettings.bookingCancellationIntervalHelper')
              }
              inputProps={{ min: 0 }}
              required
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label={t('admin.sessionConfiguration.bookingSettings.bookingUpdatingIntervalLabel')}
              type="number"
              value={formData.bookingUpdatingInterval}
              onChange={handleChange('bookingUpdatingInterval')}
              error={!!formErrors.bookingUpdatingInterval}
              helperText={
                formErrors.bookingUpdatingInterval ||
                t('admin.sessionConfiguration.bookingSettings.bookingUpdatingIntervalHelper')
              }
              inputProps={{ min: 0 }}
              required
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth required error={!!formErrors.defaultTimezone}>
              <InputLabel>{t('admin.sessionConfiguration.bookingSettings.defaultTimezone')}</InputLabel>
              <Select
                value={formData.defaultTimezone}
                onChange={handleChange('defaultTimezone')}
                label={t('admin.sessionConfiguration.bookingSettings.defaultTimezone')}
                disabled={timezonesLoading}
              >
                {timezonesLoading ? (
                  <MenuItem disabled>
                    <CircularProgress size={20} sx={{ mr: 1 }} />
                    Loading timezones...
                  </MenuItem>
                ) : (
                  timezones.map((tz) => (
                    <MenuItem key={tz.offset} value={tz.offset}>
                      {t(`pages.profile.timezones.${tz.id}`, { defaultValue: tz.displayName })} ({tz.offset})
                    </MenuItem>
                  ))
                )}
              </Select>
              {formErrors.defaultTimezone && (
                <Typography variant="caption" color="error" sx={{ mt: 0.5, display: 'block' }}>
                  {formErrors.defaultTimezone}
                </Typography>
              )}
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                {t('admin.sessionConfiguration.bookingSettings.defaultTimezoneHelper')}
              </Typography>
            </FormControl>
          </Grid>
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 2 }}>
              <Button
                variant="outlined"
                startIcon={<CancelIcon />}
                onClick={handleCancel}
                disabled={saving}
                sx={{ textTransform: 'none' }}
              >
                {t('admin.sessionConfiguration.bookingSettings.cancel')}
              </Button>
              <Button
                variant="contained"
                startIcon={<SaveIcon />}
                onClick={handleSave}
                disabled={saving}
                sx={{ textTransform: 'none' }}
              >
                {saving ? t('admin.sessionConfiguration.bookingSettings.saving') : t('admin.sessionConfiguration.bookingSettings.save')}
              </Button>
            </Box>
          </Grid>
        </Grid>
      )}

      {/* Success Snackbar */}
      <Snackbar
        open={!!successMessage}
        autoHideDuration={6000}
        onClose={() => setSuccessMessage(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={() => setSuccessMessage(null)} severity="success" sx={{ width: '100%' }}>
          {successMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default BookingSettings;

