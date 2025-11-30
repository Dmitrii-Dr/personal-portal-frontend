import React, { useState, useEffect, useRef } from 'react';
import { fetchWithAuth } from '../utils/api';
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

const BookingSettings = () => {
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

  // Fetch booking settings
  const fetchSettings = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchWithAuth('/api/v1/admin/booking/setting');

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || `Failed to load booking settings: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();
      setSettings(data);
      setFormData({
        bookingSlotsInterval: data.bookingSlotsInterval || 0,
        bookingFirstSlotInterval: data.bookingFirstSlotInterval || 10,
        bookingCancelationInterval: data.bookingCancelationInterval || 0,
        bookingUpdatingInterval: data.bookingUpdatingInterval || 0,
        defaultTimezone: data.defaultTimezone || 'UTC',
      });
    } catch (err) {
      console.error('Error fetching booking settings:', err);
      setError(err.message || 'Failed to load booking settings. Please try again.');
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

  // Format minutes to readable format (hours and minutes)
  const formatMinutes = (minutes) => {
    if (minutes === 0) return '0 minutes';
    if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    let result = `${hours} hour${hours !== 1 ? 's' : ''}`;
    if (remainingMinutes > 0) {
      result += ` ${remainingMinutes} minute${remainingMinutes !== 1 ? 's' : ''}`;
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
        defaultTimezone: settings.defaultTimezone || 'UTC',
      });
    }
  };

  // Validate form
  const validateForm = () => {
    const errors = {};

    if (formData.bookingSlotsInterval < 0) {
      errors.bookingSlotsInterval = 'Must be greater than or equal to 0';
    }

    if (formData.bookingFirstSlotInterval < 10) {
      errors.bookingFirstSlotInterval = 'Must be greater than or equal to 10 minutes';
    }

    if (formData.bookingCancelationInterval < 0) {
      errors.bookingCancelationInterval = 'Must be greater than or equal to 0';
    }

    if (formData.bookingUpdatingInterval < 0) {
      errors.bookingUpdatingInterval = 'Must be greater than or equal to 0';
    }

    if (!formData.defaultTimezone || formData.defaultTimezone.trim() === '') {
      errors.defaultTimezone = 'Timezone is required';
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
          defaultTimezone: formData.defaultTimezone,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || `Failed to update booking settings: ${response.status} ${response.statusText}`
        );
      }

      const updatedData = await response.json();
      setSettings(updatedData);
      setIsEditing(false);
      setSuccessMessage('Booking settings updated successfully');
      fetchSettings(); // Refresh to get latest data
    } catch (err) {
      console.error('Error updating booking settings:', err);
      setSaveError(err.message || 'Failed to update booking settings. Please try again.');
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
        <Typography variant="h6">Booking Settings</Typography>
        {!isEditing && (
          <Button
            variant="outlined"
            startIcon={<EditIcon />}
            onClick={handleEdit}
            sx={{ textTransform: 'none' }}
          >
            Edit
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
          Changing timezone requires all active availability rules to be archived first.
        </Alert>
      )}

      {!isEditing ? (
        // View Mode
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Typography variant="body2" color="text.secondary">
              Booking Slots Interval
            </Typography>
            <Typography variant="body1" gutterBottom>
              {settings ? formatMinutes(settings.bookingSlotsInterval) : 'N/A'}
            </Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="body2" color="text.secondary">
              Booking First Slot Interval
            </Typography>
            <Typography variant="body1" gutterBottom>
              {settings ? formatMinutes(settings.bookingFirstSlotInterval) : 'N/A'}
            </Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="body2" color="text.secondary">
              Booking Cancellation Interval
            </Typography>
            <Typography variant="body1" gutterBottom>
              {settings ? formatMinutes(settings.bookingCancelationInterval) : 'N/A'}
            </Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="body2" color="text.secondary">
              Booking Updating Interval
            </Typography>
            <Typography variant="body1" gutterBottom>
              {settings ? formatMinutes(settings.bookingUpdatingInterval) : 'N/A'}
            </Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="body2" color="text.secondary">
              Default Timezone
            </Typography>
            <Typography variant="body1" gutterBottom>
              {settings?.defaultTimezone && settings?.defaultUtcOffset
                ? `${settings.defaultTimezone} (${settings.defaultUtcOffset})`
                : settings?.defaultTimezone || 'N/A'}
            </Typography>
          </Grid>
        </Grid>
      ) : (
        // Edit Mode
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Booking Slots Interval (minutes)"
              type="number"
              value={formData.bookingSlotsInterval}
              onChange={handleChange('bookingSlotsInterval')}
              error={!!formErrors.bookingSlotsInterval}
              helperText={
                formErrors.bookingSlotsInterval ||
                'Interval between available booking slots (e.g., 30 = slots every 30 minutes)'
              }
              inputProps={{ min: 0 }}
              required
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Booking First Slot Interval (minutes)"
              type="number"
              value={formData.bookingFirstSlotInterval}
              onChange={handleChange('bookingFirstSlotInterval')}
              error={!!formErrors.bookingFirstSlotInterval}
              helperText={
                formErrors.bookingFirstSlotInterval ||
                'Minimum time from now until the first bookable slot (minimum: 10 minutes)'
              }
              inputProps={{ min: 10 }}
              required
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Booking Cancellation Interval (minutes)"
              type="number"
              value={formData.bookingCancelationInterval}
              onChange={handleChange('bookingCancelationInterval')}
              error={!!formErrors.bookingCancelationInterval}
              helperText={
                formErrors.bookingCancelationInterval ||
                'Minimum time before booking start time when cancellation is allowed'
              }
              inputProps={{ min: 0 }}
              required
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Booking Updating Interval (minutes)"
              type="number"
              value={formData.bookingUpdatingInterval}
              onChange={handleChange('bookingUpdatingInterval')}
              error={!!formErrors.bookingUpdatingInterval}
              helperText={
                formErrors.bookingUpdatingInterval ||
                'Minimum time before booking start time when updates are allowed'
              }
              inputProps={{ min: 0 }}
              required
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth required error={!!formErrors.defaultTimezone}>
              <InputLabel>Default Timezone</InputLabel>
              <Select
                value={formData.defaultTimezone}
                onChange={handleChange('defaultTimezone')}
                label="Default Timezone"
              >
                {getUniqueTimezoneOffsets().map((tz) => (
                  <MenuItem key={tz.value} value={tz.value}>
                    {tz.label} ({tz.offset})
                  </MenuItem>
                ))}
              </Select>
              {formErrors.defaultTimezone && (
                <Typography variant="caption" color="error" sx={{ mt: 0.5, display: 'block' }}>
                  {formErrors.defaultTimezone}
                </Typography>
              )}
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                Default timezone for availability rules (IANA timezone identifier). UTC offset is calculated automatically.
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
                Cancel
              </Button>
              <Button
                variant="contained"
                startIcon={<SaveIcon />}
                onClick={handleSave}
                disabled={saving}
                sx={{ textTransform: 'none' }}
              >
                {saving ? 'Saving...' : 'Save'}
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

