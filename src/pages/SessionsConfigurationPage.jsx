import React, { useState, useEffect, useRef } from 'react';
import { fetchWithAuth } from '../utils/api';
import apiClient from '../utils/api';
import AvailabilityRuleComponent from '../components/AvailabilityRuleComponent';
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

const SessionsConfigurationPage = () => {
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
      Rub: '',
      Tenge: '',
      USD: '',
    },
  });
  const [error, setError] = useState(null);

  // Available slots state
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotsError, setSlotsError] = useState(null);
  const [selectedSessionTypeId, setSelectedSessionTypeId] = useState(1);
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
            setSelectedSessionTypeId(activeSessionTypes[0].id || activeSessionTypes[0].sessionTypeId || 1);
          } else if (data.length > 0) {
            // Fallback to first session type if no active ones
            setSelectedSessionTypeId(data[0].id || data[0].sessionTypeId || 1);
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

  // Fetch available slots when date or session type changes
  useEffect(() => {
    if (selectedSessionTypeId) {
      fetchAvailableSlots(selectedDate);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, selectedSessionTypeId]);

  // Fetch available slots
  const fetchAvailableSlots = async (date) => {
    try {
      setLoadingSlots(true);
      setSlotsError(null);
      const dateString = dayjs(date).format('YYYY-MM-DD');
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

      const response = await apiClient.get('/api/v1/public/booking/available/slot', {
        params: {
          sessionTypeId: selectedSessionTypeId,
          suggestedDate: dateString,
          timezone,
        },
        timeout: 10000,
      });

      if (response.data && response.data.slots && Array.isArray(response.data.slots)) {
        setAvailableSlots(response.data.slots);
      } else {
        setAvailableSlots([]);
      }
    } catch (err) {
      console.error('Error fetching available slots:', err);
      setSlotsError(err.message || 'Failed to load available slots');
      setAvailableSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  };

  // Handle session type form
  const handleOpenSessionTypeDialog = (sessionType = null) => {
    if (sessionType) {
      setEditingSessionType(sessionType);
      setSessionTypeForm({
        name: sessionType.name || '',
        description: sessionType.description || '',
        durationMinutes: sessionType.durationMinutes || 60,
        bufferMinutes: sessionType.bufferMinutes || 0,
        active: sessionType.active !== undefined ? sessionType.active : true,
        prices: sessionType.prices || {
          Rub: '',
          Tenge: '',
          USD: '',
        },
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
          Rub: '',
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

      // Prepare prices object - filter out empty values and convert to numbers
      const prices = {};
      if (sessionTypeForm.prices) {
        Object.keys(sessionTypeForm.prices).forEach((currency) => {
          const value = sessionTypeForm.prices[currency];
          if (value !== '' && value !== null && value !== undefined) {
            const numValue = parseFloat(value);
            if (!isNaN(numValue) && numValue >= 0) {
              prices[currency] = numValue;
            }
          }
        });
      }

      const requestBody = {
        name: sessionTypeForm.name,
        description: sessionTypeForm.description,
        durationMinutes: sessionTypeForm.durationMinutes,
        bufferMinutes: sessionTypeForm.bufferMinutes || 0,
        prices: Object.keys(prices).length > 0 ? prices : undefined,
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
        throw new Error(`Failed to save session type: ${response.status}`);
      }

      // Refresh session types
      const refreshResponse = await fetchWithAuth('/api/v1/admin/session/type/all');
      if (refreshResponse.ok) {
        const data = await refreshResponse.json();
        setSessionTypes(Array.isArray(data) ? data : []);
        // Update selected session type if needed
        const activeSessionTypes = Array.isArray(data) ? data.filter(st => st.active !== false) : [];
        if (activeSessionTypes.length > 0 && !activeSessionTypes.find(st => (st.id || st.sessionTypeId) === selectedSessionTypeId)) {
          setSelectedSessionTypeId(activeSessionTypes[0].id || activeSessionTypes[0].sessionTypeId || 1);
        }
      }

      handleCloseSessionTypeDialog();
    } catch (err) {
      console.error('Error saving session type:', err);
      setError(err.message || 'Failed to save session type');
    }
  };

  const handleDeleteSessionType = async (sessionType) => {
    if (!window.confirm(`Are you sure you want to delete "${sessionType.name}"?`)) {
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
        throw new Error(`Failed to delete: ${response.status}`);
      }

      // Refresh session types
      const refreshResponse = await fetchWithAuth('/api/v1/admin/session/type/all');
      if (refreshResponse.ok) {
        const data = await refreshResponse.json();
        setSessionTypes(Array.isArray(data) ? data : []);
        // Update selected session type if needed
        const activeSessionTypes = Array.isArray(data) ? data.filter(st => st.active !== false) : [];
        if (activeSessionTypes.length > 0 && !activeSessionTypes.find(st => (st.id || st.sessionTypeId) === selectedSessionTypeId)) {
          setSelectedSessionTypeId(activeSessionTypes[0].id || activeSessionTypes[0].sessionTypeId || 1);
        }
      }
    } catch (err) {
      console.error('Error deleting session type:', err);
      setError(err.message || 'Failed to delete session type');
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
        Sessions Configuration
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
                    <Typography variant="h6">Session Types</Typography>
                    <Button
                      variant="contained"
                      startIcon={<AddIcon />}
                      onClick={() => handleOpenSessionTypeDialog()}
                      sx={{ textTransform: 'none' }}
                    >
                      Add Session Type
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
                                    label={sessionType.active !== false ? 'Active' : 'Inactive'} 
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
                      No session types found. Add one to get started.
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

            {/* Available Slots Section */}
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Available Slots (View Only)
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                    <FormControl sx={{ minWidth: 200 }}>
                      <InputLabel>Session Type</InputLabel>
                      <Select
                        value={selectedSessionTypeId}
                        onChange={(e) => setSelectedSessionTypeId(e.target.value)}
                        label="Session Type"
                      >
                        {sessionTypes.map((st) => (
                          <MenuItem key={st.id || st.sessionTypeId} value={st.id || st.sessionTypeId}>
                            {st.name}
                          </MenuItem>
                        ))}
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
                        Available Times on {dayjs(selectedDate).format('MMMM D, YYYY')}
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
                                  secondary={endTime !== 'N/A' ? `Ends at ${endTime}` : null}
                                />
                              </ListItem>
                            );
                          })}
                        </List>
                      ) : (
                        <Alert severity="info">No available slots on this day.</Alert>
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
        <DialogTitle>{editingSessionType ? 'Edit Session Type' : 'Add Session Type'}</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Name"
            value={sessionTypeForm.name}
            onChange={(e) => setSessionTypeForm({ ...sessionTypeForm, name: e.target.value })}
            margin="normal"
            required
          />
          <TextField
            fullWidth
            label="Description"
            multiline
            rows={3}
            value={sessionTypeForm.description}
            onChange={(e) => setSessionTypeForm({ ...sessionTypeForm, description: e.target.value })}
            margin="normal"
          />
          <TextField
            fullWidth
            label="Duration (minutes)"
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
            label="Buffer (minutes)"
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
            label="Active (can be used for new bookings)"
            sx={{ mt: 2 }}
          />
          <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
            Prices
          </Typography>
          <TextField
            fullWidth
            label="Price (Rub)"
            type="number"
            value={sessionTypeForm.prices?.Rub || ''}
            onChange={(e) =>
              setSessionTypeForm({
                ...sessionTypeForm,
                prices: {
                  ...sessionTypeForm.prices,
                  Rub: e.target.value,
                },
              })
            }
            margin="normal"
            inputProps={{ step: '0.01', min: '0' }}
          />
          <TextField
            fullWidth
            label="Price (Tenge)"
            type="number"
            value={sessionTypeForm.prices?.Tenge || ''}
            onChange={(e) =>
              setSessionTypeForm({
                ...sessionTypeForm,
                prices: {
                  ...sessionTypeForm.prices,
                  Tenge: e.target.value,
                },
              })
            }
            margin="normal"
            inputProps={{ step: '0.01', min: '0' }}
          />
          <TextField
            fullWidth
            label="Price (USD)"
            type="number"
            value={sessionTypeForm.prices?.USD || ''}
            onChange={(e) =>
              setSessionTypeForm({
                ...sessionTypeForm,
                prices: {
                  ...sessionTypeForm.prices,
                  USD: e.target.value,
                },
              })
            }
            margin="normal"
            inputProps={{ step: '0.01', min: '0' }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseSessionTypeDialog} sx={{ textTransform: 'none' }}>
            Cancel
          </Button>
          <Button onClick={handleSaveSessionType} variant="contained" sx={{ textTransform: 'none' }}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SessionsConfigurationPage;

