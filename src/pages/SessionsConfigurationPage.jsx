import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { fetchWithAuth } from '../utils/api';
import apiClient from '../utils/api';
import { getCachedSlots, setCachedSlots } from '../utils/bookingSlotCache';
import { fetchTimezones, sortTimezonesByOffset, getOffsetFromTimezone, extractTimezoneOffset, findTimezoneIdByOffset } from '../utils/timezoneService';
import AvailabilityRuleComponent from '../components/AvailabilityRuleComponent';
import AvailabilityOverrideComponent from '../components/AvailabilityOverrideComponent';
import BookingSettings from '../components/BookingSettings';
import UserAgreementsSection from '../components/UserAgreementsSection';
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
  Tooltip,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import { DateCalendar } from '@mui/x-date-pickers/DateCalendar';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import updateLocale from 'dayjs/plugin/updateLocale';
import localeData from 'dayjs/plugin/localeData';
import 'dayjs/locale/en-gb';
import 'dayjs/locale/ru';

// Configure dayjs to start week on Monday
dayjs.extend(updateLocale);
dayjs.extend(localeData);
dayjs.locale('en-gb'); // Use en-gb locale which starts week on Monday

const SessionsConfigurationPage = () => {
  const { t, i18n: i18nInstance } = useTranslation();

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
      Rubles: '',
      Tenge: '',
      USD: '',
    },
  });
  const [error, setError] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [sessionTypeToDelete, setSessionTypeToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Available slots state
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotsError, setSlotsError] = useState(null);
  const [selectedSessionTypeId, setSelectedSessionTypeId] = useState(null);
  const [selectedTimezone, setSelectedTimezone] = useState(null);
  const [userTimezone, setUserTimezone] = useState(null);
  const hasFetchedSessionTypesRef = useRef(false);

  // Available Slots Scroll state
  const slotsScrollRef = useRef(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [showScrollBottom, setShowScrollBottom] = useState(false);


  // Timezones state
  const [timezones, setTimezones] = useState([]);
  const [timezonesLoading, setTimezonesLoading] = useState(true);

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
            const normalizedTimezone = extractTimezoneOffset(data.timezone);
            setUserTimezone(normalizedTimezone);
            setSelectedTimezone(normalizedTimezone);
          } else {
            // Fallback to UTC offset if no timezone in settings
            setSelectedTimezone('+00:00');
          }
        } else {
          // Fallback to UTC offset if request fails
          setSelectedTimezone('+00:00');
        }
      } catch (err) {
        if (err.name === 'AbortError' || err.name === 'CanceledError' || err.code === 'ERR_CANCELED') {
          return;
        }
        if (!isMounted) return;
        console.warn('Error fetching user settings:', err);
        // Fallback to UTC offset
        setSelectedTimezone('+00:00');
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


      const timezoneId = findTimezoneIdByOffset(selectedTimezone, timezones);
      if (!timezoneId) {
        console.error('Could not find timezone ID for offset:', selectedTimezone);
        setSlotsError('Invalid timezone selected. Please try again.');
        setLoadingSlots(false);
        return;
      }

      const response = await apiClient.get('/api/v1/public/booking/available/slot', {
        params: {
          sessionTypeId: selectedSessionTypeId,
          suggestedDate: dateString,
          timezoneId: timezoneId,
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

  // Effect to handle scroll indicator initial state when slots are loaded
  useEffect(() => {
    if (availableSlots.length > 0) {
      // Small timeout to allow render
      setTimeout(() => {
        if (slotsScrollRef.current) {
          const element = slotsScrollRef.current;
          const isScrollable = element.scrollHeight > element.clientHeight;
          setShowScrollBottom(isScrollable);
        }
      }, 100);
    }
  }, [availableSlots]);

  // Handle session type form
  const handleOpenSessionTypeDialog = (sessionType = null) => {
    if (sessionType) {
      setEditingSessionType(sessionType);
      // Normalize prices - show actual values or empty string if 0
      const normalizedPrices = {
        Rubles: sessionType.prices?.Rubles || '',
        Tenge: sessionType.prices?.Tenge || '',
        USD: sessionType.prices?.USD || '',
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
          Rubles: '',
          Tenge: '',
          USD: '',
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

  const handleDeleteSessionType = (sessionType) => {
    setSessionTypeToDelete(sessionType);
    setDeleteDialogOpen(true);
  };

  const handleCloseDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setSessionTypeToDelete(null);
  };

  const handleConfirmDelete = async () => {
    if (!sessionTypeToDelete) return;

    setDeleting(true);
    try {
      const response = await fetchWithAuth(
        `/api/v1/admin/session/type/${sessionTypeToDelete.id || sessionTypeToDelete.sessionTypeId}`,
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
      handleCloseDeleteDialog();
    } catch (err) {
      console.error('Error deleting session type:', err);
      setError(err.message || t('admin.sessionConfiguration.failedToDelete'));
    } finally {
      setDeleting(false);
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
                    <Tooltip title={t('admin.sessionConfiguration.addSessionType')}>
                      <IconButton
                        color="primary"
                        onClick={() => handleOpenSessionTypeDialog()}
                      >
                        <AddIcon />
                      </IconButton>
                    </Tooltip>
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

            {/* User Agreements Section */}
            <Grid item xs={12}>
              <UserAgreementsSection />
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
                    </FormControl>
                  </Box>

                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale={i18nInstance.language === 'ru' ? 'ru' : 'en-gb'}>
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
                        <Box sx={{ position: 'relative' }}>
                          <Box
                            ref={slotsScrollRef}
                            sx={{ maxHeight: '240px', overflowY: 'auto', pr: 1 }}
                            onScroll={(e) => {
                              const element = e.target;
                              const isAtTop = element.scrollTop === 0;
                              const isAtBottom = Math.abs(element.scrollHeight - element.scrollTop - element.clientHeight) < 1;

                              setShowScrollTop(!isAtTop);
                              setShowScrollBottom(!isAtBottom && availableSlots.length > 4);
                            }}
                          >
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
                          </Box>
                          {/* Top scroll indicator */}
                          {showScrollTop && (
                            <Box
                              sx={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                height: '40px',
                                background: 'linear-gradient(to top, transparent, rgba(255,255,255,0.8))',
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'flex-start',
                                pointerEvents: 'none',
                                pt: 0.5,
                                borderRadius: '4px 4px 0 0',
                              }}
                            >
                              <KeyboardArrowUpIcon sx={{ color: 'text.secondary', opacity: 0.7 }} />
                            </Box>
                          )}
                          {/* Bottom scroll indicator */}
                          {showScrollBottom && (
                            <Box
                              sx={{
                                position: 'absolute',
                                bottom: 0,
                                left: 0,
                                right: 0,
                                height: '40px',
                                background: 'linear-gradient(to bottom, transparent, rgba(255,255,255,0.8))',
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'flex-end',
                                pointerEvents: 'none',
                                pb: 0.5,
                                borderRadius: '0 0 4px 4px',
                              }}
                            >
                              <KeyboardArrowDownIcon sx={{ color: 'text.secondary', opacity: 0.7 }} />
                            </Box>
                          )}
                        </Box>
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
            value={sessionTypeForm.prices?.Rubles ?? ''}
            onChange={(e) => {
              setSessionTypeForm({
                ...sessionTypeForm,
                prices: {
                  ...sessionTypeForm.prices,
                  Rubles: e.target.value,
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
            value={sessionTypeForm.prices?.Tenge ?? ''}
            onChange={(e) => {
              setSessionTypeForm({
                ...sessionTypeForm,
                prices: {
                  ...sessionTypeForm.prices,
                  Tenge: e.target.value,
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
            value={sessionTypeForm.prices?.USD ?? ''}
            onChange={(e) => {
              setSessionTypeForm({
                ...sessionTypeForm,
                prices: {
                  ...sessionTypeForm.prices,
                  USD: e.target.value,
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

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={handleCloseDeleteDialog}>
        <DialogTitle>{t('admin.sessionConfiguration.deleteSessionType')}</DialogTitle>
        <DialogContent>
          <Typography>
            {sessionTypeToDelete && t('admin.sessionConfiguration.confirmDelete', { name: sessionTypeToDelete.name })}
          </Typography>
          <Alert severity="warning" sx={{ mt: 2 }}>
            {t('admin.sessionConfiguration.deleteSessionTypeWarning')}
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog} disabled={deleting} sx={{ textTransform: 'none' }}>
            {t('admin.sessionConfiguration.cancel')}
          </Button>
          <Button
            onClick={handleConfirmDelete}
            variant="contained"
            color="error"
            disabled={deleting}
            sx={{ textTransform: 'none' }}
          >
            {deleting ? (
              <>
                <CircularProgress size={16} sx={{ mr: 1 }} />
                {t('admin.sessionConfiguration.deleting')}
              </>
            ) : (
              t('admin.sessionConfiguration.delete')
            )}
          </Button>
        </DialogActions>
      </Dialog>
    </Box >
  );
};

export default SessionsConfigurationPage;

