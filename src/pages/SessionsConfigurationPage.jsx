import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { fetchWithAuth } from '../utils/api';
import apiClient from '../utils/api';
import { getCachedSlots, setCachedSlots } from '../utils/bookingSlotCache';
import AvailabilityRuleComponent from '../components/AvailabilityRuleComponent';
import AvailabilityOverrideComponent from '../components/AvailabilityOverrideComponent';
import BookingSettings from '../components/BookingSettings';
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Grid,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Container,
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { DateCalendar } from '@mui/x-date-pickers/DateCalendar';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import updateLocale from 'dayjs/plugin/updateLocale';
import localeData from 'dayjs/plugin/localeData';
import 'dayjs/locale/en-gb';

// Configure dayjs to start week on Monday
dayjs.extend(updateLocale);
dayjs.extend(localeData);
dayjs.locale('en-gb'); // Use en-gb locale which starts week on Monday

// Common timezones with UTC offsets
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
  { value: 'Asia/Almaty', offset: '+06:00', label: 'Asia/Almaty' },
  { value: 'Asia/Tokyo', offset: '+09:00', label: 'Asia/Tokyo' },
  { value: 'Asia/Seoul', offset: '+09:00', label: 'Asia/Seoul' },
  { value: 'Australia/Sydney', offset: '+10:00', label: 'Australia/Sydney' },
  { value: 'Australia/Melbourne', offset: '+10:00', label: 'Australia/Melbourne' },
  { value: 'Pacific/Auckland', offset: '+12:00', label: 'Pacific/Auckland' },
  { value: 'America/Honolulu', offset: '-10:00', label: 'America/Honolulu' },
  { value: 'America/Anchorage', offset: '-09:00', label: 'America/Anchorage' },
  { value: 'America/Los_Angeles', offset: '-08:00', label: 'America/Los_Angeles' },
  { value: 'America/Phoenix', offset: '-07:00', label: 'America/Phoenix' },
  { value: 'America/Denver', offset: '-07:00', label: 'America/Denver' },
  { value: 'America/Chicago', offset: '-06:00', label: 'America/Chicago' },
  { value: 'America/New_York', offset: '-05:00', label: 'America/New_York' },
  { value: 'America/Caracas', offset: '-04:00', label: 'America/Caracas' },
  { value: 'America/Sao_Paulo', offset: '-03:00', label: 'America/Sao_Paulo' },
];

// Helper function to get UTC offset for a timezone
const getTimezoneOffset = (timezone) => {
  try {
    const now = new Date();
    const utcDate = new Date(now.toLocaleString('en-US', { timeZone: 'UTC' }));
    const tzDate = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
    const offsetMs = tzDate - utcDate;
    const offsetHours = Math.floor(offsetMs / (1000 * 60 * 60));
    const offsetMinutes = Math.floor((offsetMs % (1000 * 60 * 60)) / (1000 * 60));
    const sign = offsetHours >= 0 ? '+' : '-';
    const absHours = Math.abs(offsetHours);
    const absMinutes = Math.abs(offsetMinutes);
    return `${sign}${absHours.toString().padStart(2, '0')}:${absMinutes.toString().padStart(2, '0')}`;
  } catch {
    return '+00:00';
  }
};

// Get timezone with offset for display
const getTimezoneWithOffset = (timezone) => {
  const found = COMMON_TIMEZONES.find(tz => tz.value === timezone);
  if (found) {
    return found;
  }
  // If not in common list, calculate offset dynamically
  return {
    value: timezone,
    offset: getTimezoneOffset(timezone),
    label: timezone,
  };
};

const SessionsConfigurationPage = () => {
  const { t } = useTranslation();
  
  // Session types state
  const [sessionTypes, setSessionTypes] = useState([]);
  const [loadingSessionTypes, setLoadingSessionTypes] = useState(false);
  const [sessionTypeDialogOpen, setSessionTypeDialogOpen] = useState(false);
  const [editingSessionType, setEditingSessionType] = useState(null);
  const [sessionTypeForm, setSessionTypeForm] = useState({
    name: '',
    description: '',
    durationMinutes: 60,
    bufferMinutes: 0,
    active: true,
    prices: {
      Rubles: 0,
      Tenge: 0,
      USD: 0,
    },
  });
  const [error, setError] = useState(null);

  // Available slots state
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotsError, setSlotsError] = useState(null);
  const [selectedSessionTypeId, setSelectedSessionTypeId] = useState(null);
  const [selectedTimezone, setSelectedTimezone] = useState(null);
  const [userTimezone, setUserTimezone] = useState(null);
  const hasFetchedSessionTypesRef = useRef(false);

  // Fetch session types (admin endpoint returns all session types, active and inactive)
  useEffect(() => {
    // Prevent duplicate calls in React StrictMode
    if (hasFetchedSessionTypesRef.current) {
      return;
    }
    hasFetchedSessionTypesRef.current = true;

    const fetchSessionTypes = async () => {
      setLoadingSessionTypes(true);
      try {
        const response = await fetchWithAuth('/api/v1/admin/session/type/all');
        if (response.ok) {
          const data = await response.json();
          setSessionTypes(Array.isArray(data) ? data : []);
          // Filter to only active session types for the available slots selector
          const activeSessionTypes = Array.isArray(data) ? data.filter(st => st.active !== false) : [];
          if (activeSessionTypes.length > 0) {
            setSelectedSessionTypeId(activeSessionTypes[0].id || activeSessionTypes[0].sessionTypeId || null);
          } else if (data.length > 0) {
            // Fallback to first session type if no active ones
            setSelectedSessionTypeId(data[0].id || data[0].sessionTypeId || null);
          } else {
            // No session types available
            setSelectedSessionTypeId(null);
          }
        }
      } catch (err) {
        console.error('Error fetching session types:', err);
      } finally {
        setLoadingSessionTypes(false);
      }
    };
    fetchSessionTypes();
  }, []);

  // Fetch user settings to get default timezone
  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    const fetchUserSettings = async () => {
      try {
        const response = await fetchWithAuth('/api/v1/user/setting');
        if (!isMounted) return;
        if (response.ok) {
          const data = await response.json();
          if (data.timezone) {
            setUserTimezone(data.timezone);
            setSelectedTimezone(data.timezone);
          } else {
            // Fallback to browser timezone if no timezone in settings
            const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
            setSelectedTimezone(browserTimezone);
          }
        } else {
          // Fallback to browser timezone if request fails
          const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
          setSelectedTimezone(browserTimezone);
        }
      } catch (err) {
        if (err.name === 'AbortError' || err.name === 'CanceledError' || err.code === 'ERR_CANCELED') {
          return;
        }
        if (!isMounted) return;
        console.warn('Error fetching user settings:', err);
        // Fallback to browser timezone
        const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
        setSelectedTimezone(browserTimezone);
      }
    };

    fetchUserSettings();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, []);

  // Fetch available slots when date, session type, or timezone changes
  useEffect(() => {
    if (selectedSessionTypeId && selectedTimezone) {
      fetchAvailableSlots(selectedDate);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, selectedSessionTypeId, selectedTimezone]);

  // Fetch available slots
  const fetchAvailableSlots = async (date) => {
    if (!selectedTimezone) {
      return;
    }
    try {
      setLoadingSlots(true);
      setSlotsError(null);
      const dateString = dayjs(date).format('YYYY-MM-DD');

      // Check cache first
      const cachedData = getCachedSlots(selectedSessionTypeId, dateString, selectedTimezone);
      if (cachedData) {
        if (cachedData.slots && Array.isArray(cachedData.slots)) {
          setAvailableSlots(cachedData.slots);
        } else {
          setAvailableSlots([]);
        }
        setLoadingSlots(false);
        return;
      }

      const response = await apiClient.get('/api/v1/public/booking/available/slot', {
        params: {
          sessionTypeId: selectedSessionTypeId,
          suggestedDate: dateString,
          timezone: selectedTimezone,
        },
        timeout: 10000,
      });

      if (response.data && response.data.slots && Array.isArray(response.data.slots)) {
        setAvailableSlots(response.data.slots);
        // Cache the response data
        setCachedSlots(selectedSessionTypeId, dateString, selectedTimezone, response.data);
      } else {
        setAvailableSlots([]);
        // Cache empty result too
        setCachedSlots(selectedSessionTypeId, dateString, selectedTimezone, { slots: [] });
      }
    } catch (err) {
      console.error('Error fetching available slots:', err);
      setSlotsError(err.message || t('admin.sessionConfiguration.failedToLoadSlots'));
      setAvailableSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  };

  // Handle session type form
  const handleOpenSessionTypeDialog = (sessionType = null) => {
    if (sessionType) {
      setEditingSessionType(sessionType);
      // Normalize prices - ensure all currencies have values, default to 0
      const normalizedPrices = {
        Rubles: sessionType.prices?.Rubles ?? 0,
        Tenge: sessionType.prices?.Tenge ?? 0,
        USD: sessionType.prices?.USD ?? 0,
      };
      
      setSessionTypeForm({
        name: sessionType.name || '',
        description: sessionType.description || '',
        durationMinutes: sessionType.durationMinutes || 60,
        bufferMinutes: sessionType.bufferMinutes || 0,
        active: sessionType.active !== undefined ? sessionType.active : true,
        prices: normalizedPrices,
      });
    } else {
      setEditingSessionType(null);
      setSessionTypeForm({
        name: '',
        description: '',
        durationMinutes: 60,
        bufferMinutes: 0,
        active: true,
        prices: {
          Rubles: 0,
          Tenge: 0,
          USD: 0,
        },
      });
    }
    setSessionTypeDialogOpen(true);
  };

  const handleCloseSessionTypeDialog = () => {
    setSessionTypeDialogOpen(false);
    setEditingSessionType(null);
  };

  const handleSaveSessionType = async () => {
    try {
      const url = editingSessionType
        ? `/api/v1/admin/session/type/${editingSessionType.id || editingSessionType.sessionTypeId}`
        : '/api/v1/admin/session/type';
      const method = editingSessionType ? 'PUT' : 'POST';

      // Prepare prices object - ensure all currencies have valid numbers (default to 0)
      // All currencies are required and must be >= 0
      const prices = {};
      const requiredCurrencies = ['Rubles', 'Tenge', 'USD'];
      let hasInvalidPrice = false;
      
      requiredCurrencies.forEach((currency) => {
        const value = sessionTypeForm.prices?.[currency];
        // Convert to number, default to 0 if empty/null/undefined
        let numValue = 0;
        if (value !== '' && value !== null && value !== undefined) {
          numValue = parseFloat(value);
          if (isNaN(numValue) || numValue < 0) {
            hasInvalidPrice = true;
            numValue = 0; // Default to 0 for invalid values
          }
        }
        // Always set the price (never null/undefined)
        prices[currency] = numValue;
      });

      if (hasInvalidPrice) {
        setError(t('admin.sessionConfiguration.allPricesMustBeValid'));
        return;
      }

      const requestBody = {
        name: sessionTypeForm.name,
        description: sessionTypeForm.description,
        durationMinutes: sessionTypeForm.durationMinutes,
        bufferMinutes: sessionTypeForm.bufferMinutes || 0,
        prices: prices, // Always include prices with all currencies
      };

      // Include active field when updating (optional field in UpdateSessionTypeRequest)
      // New session types are created as active by default, so we only need to include it for updates
      if (editingSessionType) {
        requestBody.active = sessionTypeForm.active !== false;
      }

      const response = await fetchWithAuth(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(t('admin.sessionConfiguration.failedToSave'));
      }

      // Refresh session types
      const refreshResponse = await fetchWithAuth('/api/v1/admin/session/type/all');
      if (refreshResponse.ok) {
        const data = await refreshResponse.json();
        setSessionTypes(Array.isArray(data) ? data : []);
        // Update selected session type if needed
        const activeSessionTypes = Array.isArray(data) ? data.filter(st => st.active !== false) : [];
        if (activeSessionTypes.length > 0 && !activeSessionTypes.find(st => (st.id || st.sessionTypeId) === selectedSessionTypeId)) {
          setSelectedSessionTypeId(activeSessionTypes[0].id || activeSessionTypes[0].sessionTypeId || null);
        } else if (activeSessionTypes.length === 0) {
          setSelectedSessionTypeId(null);
        }
      }

      handleCloseSessionTypeDialog();
    } catch (err) {
      console.error('Error saving session type:', err);
      setError(err.message || t('admin.sessionConfiguration.failedToSave'));
    }
  };

  const handleDeleteSessionType = async (sessionType) => {
    if (!window.confirm(t('admin.sessionConfiguration.confirmDelete', { name: sessionType.name }))) {
      return;
    }

    try {
      const response = await fetchWithAuth(
        `/api/v1/admin/session/type/${sessionType.id || sessionType.sessionTypeId}`,
        {
          method: 'DELETE',
        }
      );

      if (!response.ok) {
        throw new Error(t('admin.sessionConfiguration.failedToDelete'));
      }

      // Refresh session types
      const refreshResponse = await fetchWithAuth('/api/v1/admin/session/type/all');
      if (refreshResponse.ok) {
        const data = await refreshResponse.json();
        setSessionTypes(Array.isArray(data) ? data : []);
        // Update selected session type if needed
        const activeSessionTypes = Array.isArray(data) ? data.filter(st => st.active !== false) : [];
        if (activeSessionTypes.length > 0 && !activeSessionTypes.find(st => (st.id || st.sessionTypeId) === selectedSessionTypeId)) {
          setSelectedSessionTypeId(activeSessionTypes[0].id || activeSessionTypes[0].sessionTypeId || null);
        } else if (activeSessionTypes.length === 0) {
          setSelectedSessionTypeId(null);
        }
      }
    } catch (err) {
      console.error('Error deleting session type:', err);
      setError(err.message || t('admin.sessionConfiguration.failedToDelete'));
    }
  };

  const formatTime = (timeString) => {
    if (!timeString) return 'N/A';
    try {
      // Always display in 24-hour format (HH:mm)
      const time = timeString.includes(':') ? timeString.split(':').slice(0, 2).join(':') : timeString;
      return dayjs(time, 'HH:mm').format('HH:mm');
    } catch {
      return timeString;
    }
  };

  const formatTimeFromInstant = (instantString) => {
    if (!instantString) return 'N/A';
    try {
      // Always display in 24-hour format (HH:mm)
      return dayjs(instantString).format('HH:mm');
    } catch {
      return instantString;
    }
  };

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        {t('admin.sessionConfiguration.title')}
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Box sx={{ bgcolor: 'background.paper', py: 4, mt: 3 }}>
        <Container maxWidth="lg">
          <Grid container spacing={3}>
            {/* Session Types Section */}
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6">{t('admin.sessionConfiguration.sessionTypes')}</Typography>
                    <Button
                      variant="contained"
                      startIcon={<AddIcon />}
                      onClick={() => handleOpenSessionTypeDialog()}
                      sx={{ textTransform: 'none' }}
                    >
                      {t('admin.sessionConfiguration.addSessionType')}
                    </Button>
                  </Box>

                  {loadingSessionTypes ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                      <CircularProgress />
                    </Box>
                  ) : sessionTypes.length > 0 ? (
                    <List>
                      {sessionTypes.map((sessionType) => (
                        <ListItem key={sessionType.id || sessionType.sessionTypeId}>
                          <ListItemText
                            primary={sessionType.name}
                            secondary={
                              <>
                                {sessionType.description && (
                                  <Typography variant="body2" color="text.secondary">
                                    {sessionType.description}
                                  </Typography>
                                )}
                                <Box sx={{ display: 'flex', gap: 1, mt: 0.5, flexWrap: 'wrap' }}>
                                  <Chip 
                                    label={sessionType.active !== false ? t('admin.sessionConfiguration.active') : t('admin.sessionConfiguration.inactive')} 
                                    size="small" 
                                    color={sessionType.active !== false ? 'success' : 'default'}
                                  />
                                  <Chip label={`${sessionType.durationMinutes} min`} size="small" />
                                  {sessionType.prices && Object.keys(sessionType.prices).length > 0 ? (
                                    Object.entries(sessionType.prices).map(([currency, price]) => (
                                      <Chip
                                        key={currency}
                                        label={`${currency}: ${price}`}
                                        size="small"
                                        color="primary"
                                      />
                                    ))
                                  ) : sessionType.price ? (
                                    <Chip label={`$${sessionType.price}`} size="small" color="primary" />
                                  ) : null}
                                </Box>
                              </>
                            }
                          />
                          <ListItemSecondaryAction>
                            <IconButton
                              edge="end"
                              onClick={() => handleOpenSessionTypeDialog(sessionType)}
                              sx={{ mr: 1 }}
                            >
                              <EditIcon />
                            </IconButton>
                            <IconButton
                              edge="end"
                              onClick={() => handleDeleteSessionType(sessionType)}
                              color="error"
                            >
                              <DeleteIcon />
                            </IconButton>
                          </ListItemSecondaryAction>
                        </ListItem>
                      ))}
                    </List>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      {t('admin.sessionConfiguration.noSessionTypesFound')}
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* Booking Settings Section */}
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <BookingSettings />
                </CardContent>
              </Card>
            </Grid>

            {/* Availability Rules Section */}
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <AvailabilityRuleComponent />
                </CardContent>
              </Card>
            </Grid>

            {/* Availability Rules Overrides Section */}
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <AvailabilityOverrideComponent />
                </CardContent>
              </Card>
            </Grid>

            {/* Available Slots Section */}
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    {t('admin.sessionConfiguration.availableSlots')}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                    <FormControl sx={{ minWidth: 200 }}>
                      <InputLabel id="session-type-select-label">{t('admin.sessionConfiguration.sessionType')}</InputLabel>
                      <Select
                        labelId="session-type-select-label"
                        value={selectedSessionTypeId || ''}
                        onChange={(e) => setSelectedSessionTypeId(e.target.value)}
                        label={t('admin.sessionConfiguration.sessionType')}
                      >
                        {sessionTypes.map((st) => (
                          <MenuItem key={st.id || st.sessionTypeId} value={st.id || st.sessionTypeId}>
                            {st.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <FormControl sx={{ minWidth: 300 }}>
                      <InputLabel>{t('admin.sessionConfiguration.timezone')}</InputLabel>
                      <Select
                        value={selectedTimezone || ''}
                        onChange={(e) => setSelectedTimezone(e.target.value)}
                        label={t('admin.sessionConfiguration.timezone')}
                      >
                        {(() => {
                          // Get all timezones, including user's timezone if not in the list
                          const allTimezones = [...COMMON_TIMEZONES];
                          if (selectedTimezone && !COMMON_TIMEZONES.find(tz => tz.value === selectedTimezone)) {
                            const tzWithOffset = getTimezoneWithOffset(selectedTimezone);
                            allTimezones.unshift(tzWithOffset);
                          }
                          return allTimezones.map((tz) => (
                            <MenuItem key={tz.value} value={tz.value}>
                              {tz.label} ({tz.offset})
                            </MenuItem>
                          ));
                        })()}
                      </Select>
                    </FormControl>
                  </Box>

                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="en-gb">
                        <DateCalendar
                          value={selectedDate}
                          onChange={(newDate) => setSelectedDate(newDate)}
                          minDate={dayjs()}
                          firstDayOfWeek={1}
                        />
                      </LocalizationProvider>
                    </Grid>

                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle1" gutterBottom>
                        {t('admin.sessionConfiguration.availableTimesOn', { date: dayjs(selectedDate).format('MMMM D, YYYY') })}
                      </Typography>

                      {slotsError && (
                        <Alert severity="error" sx={{ mb: 2 }}>
                          {slotsError}
                        </Alert>
                      )}

                      {loadingSlots ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                          <CircularProgress />
                        </Box>
                      ) : availableSlots.length > 0 ? (
                        <List>
                          {availableSlots.map((slot, index) => {
                            const startTime = slot.startTime
                              ? formatTime(slot.startTime)
                              : slot.startTimeInstant
                              ? formatTimeFromInstant(slot.startTimeInstant)
                              : 'N/A';
                            const endTime = slot.endTime ? formatTime(slot.endTime) : 'N/A';

                            return (
                              <ListItem
                                key={slot.startTimeInstant || `slot-${index}`}
                                sx={{
                                  border: 1,
                                  borderColor: 'divider',
                                  borderRadius: 1,
                                  mb: 1,
                                }}
                              >
                                <ListItemText
                                  primary={startTime}
                                  secondary={endTime !== 'N/A' ? t('admin.sessionConfiguration.endsAt', { time: endTime }) : null}
                                />
                              </ListItem>
                            );
                          })}
                        </List>
                      ) : (
                        <Alert severity="info">{t('admin.sessionConfiguration.noAvailableSlots')}</Alert>
                      )}
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Session Type Dialog */}
      <Dialog open={sessionTypeDialogOpen} onClose={handleCloseSessionTypeDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editingSessionType ? t('admin.sessionConfiguration.editSessionType') : t('admin.sessionConfiguration.addSessionType')}</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label={t('admin.sessionConfiguration.name')}
            value={sessionTypeForm.name}
            onChange={(e) => setSessionTypeForm({ ...sessionTypeForm, name: e.target.value })}
            margin="normal"
            required
          />
          <TextField
            fullWidth
            label={t('admin.sessionConfiguration.description')}
            multiline
            rows={3}
            value={sessionTypeForm.description}
            onChange={(e) => setSessionTypeForm({ ...sessionTypeForm, description: e.target.value })}
            margin="normal"
          />
          <TextField
            fullWidth
            label={t('admin.sessionConfiguration.durationMinutes')}
            type="number"
            value={sessionTypeForm.durationMinutes}
            onChange={(e) =>
              setSessionTypeForm({ ...sessionTypeForm, durationMinutes: parseInt(e.target.value) || 0 })
            }
            margin="normal"
            required
          />
          <TextField
            fullWidth
            label={t('admin.sessionConfiguration.bufferMinutes')}
            type="number"
            value={sessionTypeForm.bufferMinutes || 0}
            onChange={(e) =>
              setSessionTypeForm({ ...sessionTypeForm, bufferMinutes: parseInt(e.target.value) || 0 })
            }
            margin="normal"
            required
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={sessionTypeForm.active !== false}
                onChange={(e) =>
                  setSessionTypeForm({ ...sessionTypeForm, active: e.target.checked })
                }
              />
            }
            label={t('admin.sessionConfiguration.activeCanBeUsed')}
            sx={{ mt: 2 }}
          />
          <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
            {t('admin.sessionConfiguration.prices')}
          </Typography>
          <TextField
            fullWidth
            label={t('admin.sessionConfiguration.priceRubles')}
            type="number"
            value={sessionTypeForm.prices?.Rubles ?? 0}
            onChange={(e) => {
              const value = e.target.value === '' ? 0 : e.target.value;
              setSessionTypeForm({
                ...sessionTypeForm,
                prices: {
                  ...sessionTypeForm.prices,
                  Rubles: value,
                },
              });
            }}
            margin="normal"
            inputProps={{ step: '0.01', min: '0' }}
            required
          />
          <TextField
            fullWidth
            label={t('admin.sessionConfiguration.priceTenge')}
            type="number"
            value={sessionTypeForm.prices?.Tenge ?? 0}
            onChange={(e) => {
              const value = e.target.value === '' ? 0 : e.target.value;
              setSessionTypeForm({
                ...sessionTypeForm,
                prices: {
                  ...sessionTypeForm.prices,
                  Tenge: value,
                },
              });
            }}
            margin="normal"
            inputProps={{ step: '0.01', min: '0' }}
            required
          />
          <TextField
            fullWidth
            label={t('admin.sessionConfiguration.priceUSD')}
            type="number"
            value={sessionTypeForm.prices?.USD ?? 0}
            onChange={(e) => {
              const value = e.target.value === '' ? 0 : e.target.value;
              setSessionTypeForm({
                ...sessionTypeForm,
                prices: {
                  ...sessionTypeForm.prices,
                  USD: value,
                },
              });
            }}
            margin="normal"
            inputProps={{ step: '0.01', min: '0' }}
            required
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseSessionTypeDialog} sx={{ textTransform: 'none' }}>
            {t('admin.sessionConfiguration.cancel')}
          </Button>
          <Button onClick={handleSaveSessionType} variant="contained" sx={{ textTransform: 'none' }}>
            {t('admin.sessionConfiguration.save')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SessionsConfigurationPage;

