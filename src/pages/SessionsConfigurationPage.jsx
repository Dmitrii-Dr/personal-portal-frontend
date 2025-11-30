import React, { useState, useEffect } from 'react';
import { fetchWithAuth } from '../utils/api';
import apiClient from '../utils/api';
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
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { DateCalendar } from '@mui/x-date-pickers/DateCalendar';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';

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
    price: 0,
  });
  const [error, setError] = useState(null);

  // Available slots state
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotsError, setSlotsError] = useState(null);
  const [selectedSessionTypeId, setSelectedSessionTypeId] = useState(1);

  // Fetch session types
  useEffect(() => {
    const fetchSessionTypes = async () => {
      setLoadingSessionTypes(true);
      try {
        const response = await fetch('/api/v1/public/session/type');
        if (response.ok) {
          const data = await response.json();
          setSessionTypes(Array.isArray(data) ? data : []);
          if (data.length > 0) {
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
        price: sessionType.price || 0,
      });
    } else {
      setEditingSessionType(null);
      setSessionTypeForm({
        name: '',
        description: '',
        durationMinutes: 60,
        price: 0,
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

      const response = await fetchWithAuth(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sessionTypeForm),
      });

      if (!response.ok) {
        throw new Error(`Failed to save session type: ${response.status}`);
      }

      // Refresh session types
      const refreshResponse = await fetch('/api/v1/public/session/type');
      if (refreshResponse.ok) {
        const data = await refreshResponse.json();
        setSessionTypes(Array.isArray(data) ? data : []);
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
      const refreshResponse = await fetch('/api/v1/public/session/type');
      if (refreshResponse.ok) {
        const data = await refreshResponse.json();
        setSessionTypes(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Error deleting session type:', err);
      setError(err.message || 'Failed to delete session type');
    }
  };

  const formatTime = (timeString) => {
    if (!timeString) return 'N/A';
    try {
      const time = timeString.includes(':') ? timeString.split(':').slice(0, 2).join(':') : timeString;
      return dayjs(time, 'HH:mm').format('h:mm A');
    } catch {
      return timeString;
    }
  };

  const formatTimeFromInstant = (instantString) => {
    if (!instantString) return 'N/A';
    try {
      return dayjs(instantString).format('h:mm A');
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
                                <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                                  <Chip label={`${sessionType.durationMinutes} min`} size="small" />
                                  <Chip label={`$${sessionType.price}`} size="small" color="primary" />
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
                      <LocalizationProvider dateAdapter={AdapterDayjs}>
                        <DateCalendar
                          value={selectedDate}
                          onChange={(newDate) => setSelectedDate(newDate)}
                          minDate={dayjs()}
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
            label="Price"
            type="number"
            value={sessionTypeForm.price}
            onChange={(e) =>
              setSessionTypeForm({ ...sessionTypeForm, price: parseFloat(e.target.value) || 0 })
            }
            margin="normal"
            required
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

