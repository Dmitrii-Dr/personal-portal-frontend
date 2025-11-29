import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import dayjs from 'dayjs';
import apiClient, { fetchWithAuth, getToken } from '../utils/api';
import {
  Grid,
  Typography,
  CircularProgress,
  Box,
  List,
  ListItemButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  Alert,
  Card,
  CardContent,
  Chip,
  Divider,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { DateCalendar } from '@mui/x-date-pickers/DateCalendar';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';

const BookingPage = ({ sessionTypeId: propSessionTypeId }) => {
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loading, setLoading] = useState(true); // Start with true since we fetch on mount
  const [error, setError] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [dialogSlot, setDialogSlot] = useState(null); // Keep slot data for dialog display during close animation
  const [clientMessage, setClientMessage] = useState('');
  const [submittingBooking, setSubmittingBooking] = useState(false);
  const [bookingError, setBookingError] = useState(null);
  const [sessionTypeId, setSessionTypeId] = useState(propSessionTypeId || null); // Use prop or null
  const [sessionTypes, setSessionTypes] = useState([]);
  const [loadingSessionTypes, setLoadingSessionTypes] = useState(!propSessionTypeId); // Only load if no prop provided
  const [sessionTypesError, setSessionTypesError] = useState(null);
  const [userTimezone, setUserTimezone] = useState(null); // User timezone from settings
  const [bookings, setBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [bookingsError, setBookingsError] = useState(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [bookingToCancel, setBookingToCancel] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const [showMyBookings, setShowMyBookings] = useState(false);
  const [hasToken, setHasToken] = useState(false);
  const [loginRequiredDialogOpen, setLoginRequiredDialogOpen] = useState(false);
  const navigate = useNavigate();
  
  const PENDING_BOOKING_KEY = 'pending_booking';

  // Format date to YYYY-MM-DD for API
  const formatDateForAPI = (date) => {
    return dayjs(date).format('YYYY-MM-DD');
  };

  // Fetch user settings to get timezone (only when user is logged in)
  const fetchUserSettings = async () => {
    if (!hasToken) {
      return;
    }
    
    try {
      const response = await fetchWithAuth('/api/v1/user/setting');
      if (response.ok) {
        const data = await response.json();
        if (data.timezone) {
          setUserTimezone(data.timezone);
        }
      }
    } catch (err) {
      console.warn('Error fetching user settings:', err);
      // Fallback to browser timezone if settings fetch fails
      const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      setUserTimezone(browserTimezone);
    }
  };

  // Fetch available slots for a given date
  const fetchAvailableSlots = async (date) => {
    // Don't fetch if no session type is selected
    if (!sessionTypeId) {
      setLoading(false);
      setAvailableSlots([]);
      setError('Please select a session type');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const dateString = formatDateForAPI(date);
      
      // Use user timezone from settings if available and user is logged in, otherwise use browser timezone
      let timezone = 'UTC';
      if (hasToken && userTimezone) {
        timezone = userTimezone;
      } else {
        try {
          timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        } catch {
          timezone = 'UTC'; // Final fallback
        }
      }
      
      const response = await apiClient.get('/api/v1/public/booking/available/slot', {
        params: {
          sessionTypeId,
          suggestedDate: dateString,
          timezone,
        },
        timeout: 10000,
      });
      
      // Handle BookingSuggestionsDto response
      if (response.data && response.data.slots && Array.isArray(response.data.slots)) {
        setAvailableSlots(response.data.slots);
      } else {
        setAvailableSlots([]);
      }
    } catch (err) {
      console.error('Error fetching available slots:', err);
      let errorMessage = 'Failed to load available slots. Please try again later.';
      
      if (err.code === 'ECONNABORTED') {
        errorMessage = 'Request timed out. Please try again.';
      } else if (err.response) {
        errorMessage = err.response.data?.message || `Server error: ${err.response.status}`;
      } else if (err.request) {
        errorMessage = 'Unable to reach the server. Please check your connection.';
      } else {
        errorMessage = err.message || errorMessage;
      }
      
      setError(errorMessage);
      setAvailableSlots([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch bookings (reusable function)
  const fetchBookings = useCallback(async () => {
    try {
      setLoadingBookings(true);
      setBookingsError(null);
      const response = await apiClient.get('/api/v1/session/booking', {
        timeout: 10000,
      });
      if (response.data && Array.isArray(response.data)) {
        setBookings(response.data);
      } else {
        setBookings([]);
      }
    } catch (err) {
      console.error('Error fetching bookings:', err);
      let errorMessage = 'Failed to load bookings. Please try again later.';
      if (err.code === 'ECONNABORTED') {
        errorMessage = 'Request timed out. Please try again.';
      } else if (err.response) {
        errorMessage = err.response.data?.message || `Server error: ${err.response.status}`;
      } else if (err.request) {
        errorMessage = 'Unable to reach the server. Please check your connection.';
      } else {
        errorMessage = err.message || errorMessage;
      }
      setBookingsError(errorMessage);
      setBookings([]);
    } finally {
      setLoadingBookings(false);
    }
  }, []);

  // Fetch session types if not provided as prop
  useEffect(() => {
    if (propSessionTypeId) {
      // Session type provided as prop, no need to fetch
      setLoadingSessionTypes(false);
      return;
    }

    const fetchSessionTypes = async () => {
      setLoadingSessionTypes(true);
      setSessionTypesError(null);
      try {
        const response = await apiClient.get('/api/v1/public/session/type', {
          timeout: 10000,
        });
        if (response.data && Array.isArray(response.data)) {
          setSessionTypes(response.data);
          // Set first session type as default if available
          if (response.data.length > 0) {
            setSessionTypeId(response.data[0].id || response.data[0].sessionTypeId);
          }
        } else {
          setSessionTypes([]);
        }
      } catch (error) {
        console.error('Error fetching session types:', error);
        setSessionTypesError(error.message || 'Failed to load session types');
        setSessionTypes([]);
      } finally {
        setLoadingSessionTypes(false);
      }
    };
    fetchSessionTypes();
  }, [propSessionTypeId]);

  // Check if user is logged in on mount and when token changes
  useEffect(() => {
    const checkToken = () => {
      const tokenExists = !!getToken();
      setHasToken(tokenExists);
    };
    
    checkToken();
    
    // Listen for storage changes (e.g., when login happens in another tab)
    const handleStorageChange = (e) => {
      if (e.key === 'auth_token' || e.key === null) {
        checkToken();
      }
    };
    
    // Listen for custom event when login happens in same tab
    const handleAuthChanged = () => {
      checkToken();
    };
    
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('auth-changed', handleAuthChanged);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('auth-changed', handleAuthChanged);
    };
  }, []);

  // Fetch user settings and bookings only when user clicks "My Bookings" and is logged in
  const handleShowMyBookings = async () => {
    if (!hasToken) {
      return;
    }
    
    setShowMyBookings(true);
    setLoadingBookings(true);
    
    // Fetch user settings first to get timezone
    await fetchUserSettings();
    // Then fetch bookings
    await fetchBookings();
  };

  // Fetch slots on component mount and when date changes
  // Track last fetched date to prevent duplicate calls
  const lastFetchedDateRef = useRef(null);

  // Update sessionTypeId when prop changes
  useEffect(() => {
    if (propSessionTypeId !== undefined) {
      setSessionTypeId(propSessionTypeId);
    }
  }, [propSessionTypeId]);

  useEffect(() => {
    const dateString = formatDateForAPI(selectedDate);
    // Only fetch if the date string is different from the last fetched one and sessionTypeId is available
    if (lastFetchedDateRef.current !== dateString && sessionTypeId) {
      lastFetchedDateRef.current = dateString;
      fetchAvailableSlots(selectedDate);
    }
  }, [selectedDate, hasToken, userTimezone, sessionTypeId]);

  // Handle date selection
  const handleDateChange = (newDate) => {
    setSelectedDate(newDate);
  };

  // Handle slot selection
  const handleSlotClick = (slot) => {
    setSelectedSlot(slot);
    setDialogSlot(slot); // Store for dialog display
    setClientMessage(''); // Reset client message
    setBookingError(null); // Clear any previous errors
    setOpenDialog(true);
  };

  // Handle dialog close
  const handleDialogClose = () => {
    if (submittingBooking) return; // Prevent closing during submission
    setOpenDialog(false);
    // Clear selectedSlot immediately for logic, but keep dialogSlot for display during animation
    setSelectedSlot(null);
    setClientMessage(''); // Clear client message
    setBookingError(null); // Clear error
    // Clear dialogSlot after animation completes
    setTimeout(() => {
      setDialogSlot(null);
    }, 300); // Material-UI dialog close animation is typically ~225ms, using 300ms for safety
  };

  // Handle cancel booking click
  const handleCancelClick = (booking) => {
    setBookingToCancel(booking);
    setCancelDialogOpen(true);
  };

  // Handle cancel dialog close
  const handleCancelDialogClose = () => {
    if (cancelling) return; // Prevent closing during cancellation
    setCancelDialogOpen(false);
    setBookingToCancel(null);
  };

  // Handle booking cancellation
  const handleConfirmCancel = async () => {
    if (!bookingToCancel || !bookingToCancel.id) {
      return;
    }

    setCancelling(true);
    try {
      const response = await apiClient.delete(`/api/v1/session/booking/${bookingToCancel.id}`, {
        timeout: 10000,
      });

      if (!response || (response.status && response.status >= 400)) {
        throw new Error('Failed to cancel booking');
      }

      // Success - close dialog and refresh bookings and slots
      handleCancelDialogClose();
      if (hasToken && showMyBookings) {
        await fetchBookings(); // Refresh bookings list only if user is logged in and viewing bookings
      }
      await fetchAvailableSlots(selectedDate); // Refresh available slots
    } catch (err) {
      console.error('Error cancelling booking:', err);
      let errorMessage = 'Failed to cancel booking. Please try again.';
      
      if (err.code === 'ECONNABORTED') {
        errorMessage = 'Request timed out. Please try again.';
      } else if (err.response) {
        errorMessage = err.response.data?.message || `Server error: ${err.response.status}`;
      } else if (err.request) {
        errorMessage = 'Unable to reach the server. Please check your connection.';
      } else {
        errorMessage = err.message || errorMessage;
      }
      
      alert(errorMessage);
    } finally {
      setCancelling(false);
    }
  };

  // Handle booking confirmation
  const handleConfirmBooking = async () => {
    if (!selectedSlot || !selectedSlot.startTimeInstant) {
      setBookingError('Invalid slot selected. Please try again.');
      return;
    }

    // Check if user is logged in - DO NOT call API without token
    if (!hasToken || !getToken()) {
      // Save booking data to sessionStorage
      const pendingBooking = {
        sessionTypeId: sessionTypeId,
        startTimeInstant: selectedSlot.startTimeInstant,
        clientMessage: clientMessage.trim() || null,
        selectedDate: formatDateForAPI(selectedDate),
      };
      sessionStorage.setItem(PENDING_BOOKING_KEY, JSON.stringify(pendingBooking));
      
      // Show login/signup dialog
      setLoginRequiredDialogOpen(true);
      return;
    }

    // User is logged in, proceed with booking - verify token exists before API call
    const token = getToken();
    if (!token) {
      setBookingError('You must be logged in to book a session.');
      setLoginRequiredDialogOpen(true);
      return;
    }

    setSubmittingBooking(true);
    setBookingError(null);

    try {
      const payload = {
        sessionTypeId: sessionTypeId,
        startTimeInstant: selectedSlot.startTimeInstant,
        clientMessage: clientMessage.trim() || null,
      };

      const response = await apiClient.post('/api/v1/session/booking', payload, {
        timeout: 10000,
      });

      if (!response || (response.status && response.status >= 400)) {
        throw new Error('Failed to create booking');
      }

      // Success - close dialog and refresh bookings and slots
      handleDialogClose();
      if (hasToken && showMyBookings) {
        await fetchBookings(); // Refresh bookings list only if user is logged in and viewing bookings
      }
      await fetchAvailableSlots(selectedDate); // Refresh available slots
    } catch (err) {
      console.error('Error creating booking:', err);
      let errorMessage = 'Failed to create booking. Please try again.';
      
      if (err.code === 'ECONNABORTED') {
        errorMessage = 'Request timed out. Please try again.';
      } else if (err.response) {
        errorMessage = err.response.data?.message || `Server error: ${err.response.status}`;
      } else if (err.request) {
        errorMessage = 'Unable to reach the server. Please check your connection.';
      } else {
        errorMessage = err.message || errorMessage;
      }
      
      setBookingError(errorMessage);
    } finally {
      setSubmittingBooking(false);
    }
  };

  // Complete pending booking after login
  const completePendingBooking = useCallback(async () => {
    const pendingBookingStr = sessionStorage.getItem(PENDING_BOOKING_KEY);
    const token = getToken();
    
    // Only proceed if we have both pending booking and a valid token
    if (!pendingBookingStr || !hasToken || !token) {
      return;
    }

    try {
      const pendingBooking = JSON.parse(pendingBookingStr);
      
      const payload = {
        sessionTypeId: pendingBooking.sessionTypeId,
        startTimeInstant: pendingBooking.startTimeInstant,
        clientMessage: pendingBooking.clientMessage,
      };

      // Verify token exists before making API call
      if (!getToken()) {
        console.warn('Token not available for pending booking');
        return;
      }

      const response = await apiClient.post('/api/v1/session/booking', payload, {
        timeout: 10000,
      });

      if (response && response.status < 400) {
        // Success - remove pending booking and refresh
        sessionStorage.removeItem(PENDING_BOOKING_KEY);
        if (showMyBookings) {
          await fetchBookings();
        }
        // Refresh slots for the date that was selected
        if (pendingBooking.selectedDate) {
          const date = dayjs(pendingBooking.selectedDate);
          await fetchAvailableSlots(date);
        }
      }
    } catch (err) {
      console.error('Error completing pending booking:', err);
      // Don't show error to user, just log it
    }
  }, [hasToken, showMyBookings]);

  // Check for pending booking when user logs in
  useEffect(() => {
    if (hasToken) {
      completePendingBooking();
    }
  }, [hasToken, completePendingBooking]);

  // Format time for display
  const formatTime = (timeString) => {
    if (!timeString) return 'N/A';
    try {
      // Handle LocalTime format (HH:mm:ss or HH:mm)
      const time = timeString.includes(':') ? timeString.split(':').slice(0, 2).join(':') : timeString;
      return dayjs(time, 'HH:mm').format('h:mm A');
    } catch {
      return timeString;
    }
  };

  // Format time from Instant if LocalTime is not available
  const formatTimeFromInstant = (instantString) => {
    if (!instantString) return 'N/A';
    try {
      return dayjs(instantString).format('h:mm A');
    } catch {
      return instantString;
    }
  };

  // Format date for display
  const formatDateForDisplay = (date) => {
    return dayjs(date).format('MMMM D, YYYY');
  };

  // Format instant for display
  const formatInstant = (instantString) => {
    if (!instantString) return 'N/A';
    try {
      return dayjs(instantString).format('MMMM D, YYYY h:mm A');
    } catch {
      return instantString;
    }
  };

  // Get status color
  const getStatusColor = (status) => {
    switch (status?.toUpperCase()) {
      case 'CONFIRMED':
      case 'COMPLETED':
        return 'success';
      case 'PENDING':
        return 'warning';
      case 'CANCELLED':
        return 'error';
      default:
        return 'default';
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box>
        {/* Show "My Bookings" section only if user is logged in */}
        {hasToken && (
          <>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h4" component="h1">
                My Bookings
              </Typography>
              {!showMyBookings && (
                <Button
                  variant="outlined"
                  onClick={handleShowMyBookings}
                  sx={{ textTransform: 'none' }}
                >
                  Show My Bookings
                </Button>
              )}
            </Box>

            {/* Bookings List - only show if user clicked "Show My Bookings" */}
            {showMyBookings && (
              <>
                {loadingBookings ? (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              minHeight: 200,
              mt: 2,
            }}
          >
            <CircularProgress />
          </Box>
        ) : bookingsError ? (
          <Alert severity="error" sx={{ mt: 2 }}>
            {bookingsError}
          </Alert>
        ) : bookings.length > 0 ? (
          <Box sx={{ mt: 2 }}>
            {bookings.map((booking) => (
              <Card key={booking.id} sx={{ mb: 2 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                    <Box>
                      <Typography variant="h6" component="h2">
                        {booking.sessionTypeName || 'Session'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        {formatInstant(booking.startTimeInstant)} - {formatInstant(booking.endTimeInstant)}
                      </Typography>
                    </Box>
                    <Chip
                      label={booking.status || 'UNKNOWN'}
                      color={getStatusColor(booking.status)}
                      size="small"
                    />
                  </Box>
                  {booking.clientMessage && (
                    <>
                      <Divider sx={{ my: 1 }} />
                      <Typography variant="body2" color="text.secondary">
                        <strong>Message:</strong> {booking.clientMessage}
                      </Typography>
                    </>
                  )}
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                    Created: {formatInstant(booking.createdAt)}
                  </Typography>
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                    <Button
                      variant="outlined"
                      color="error"
                      size="small"
                      onClick={() => handleCancelClick(booking)}
                      disabled={cancelling}
                      sx={{ textTransform: 'none' }}
                    >
                      Cancel Booking
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Box>
                ) : (
                  <Alert severity="info" sx={{ mt: 2 }}>
                    No bookings found.
                  </Alert>
                )}
              </>
            )}
            <Divider sx={{ my: 4 }} />
          </>
        )}

        <Typography variant="h4" component="h1" gutterBottom>
          Book a Session
        </Typography>

        {/* Session Type Selection - only show if not provided as prop */}
        {!propSessionTypeId && (
          <Box sx={{ mb: 3, mt: 2 }}>
            {loadingSessionTypes ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                <CircularProgress />
              </Box>
            ) : sessionTypesError ? (
              <Alert severity="error" sx={{ mb: 2 }}>
                {sessionTypesError}
              </Alert>
            ) : sessionTypes.length > 0 ? (
              <FormControl sx={{ minWidth: 300 }}>
                <InputLabel>Select Session Type</InputLabel>
                <Select
                  value={sessionTypeId || ''}
                  onChange={(e) => setSessionTypeId(e.target.value)}
                  label="Select Session Type"
                >
                  {sessionTypes.map((st) => (
                    <MenuItem key={st.id || st.sessionTypeId} value={st.id || st.sessionTypeId}>
                      {st.name} - ${st.price || 0} ({st.durationMinutes || 60} min)
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            ) : (
              <Alert severity="info">
                No session types available at this time.
              </Alert>
            )}
          </Box>
        )}

        <Grid container spacing={3} sx={{ mt: 2 }}>
          {/* Left Column - Date Calendar */}
          <Grid item xs={12} md={6}>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'center',
                border: 1,
                borderColor: 'divider',
                borderRadius: 2,
                p: 2,
                bgcolor: 'background.paper',
              }}
            >
              <DateCalendar
                value={selectedDate}
                onChange={handleDateChange}
                minDate={dayjs()}
                sx={{ width: '100%' }}
              />
            </Box>
          </Grid>

          {/* Right Column - Available Slots */}
          <Grid item xs={12} md={6}>
            <Typography variant="h6" gutterBottom>
              Available Times on {formatDateForDisplay(selectedDate)}
            </Typography>

            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            {loading ? (
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  minHeight: 200,
                }}
              >
                <CircularProgress />
              </Box>
            ) : availableSlots.length > 0 ? (
              <List>
                {availableSlots.map((slot, index) => {
                  const startTime = slot.startTime 
                    ? formatTime(slot.startTime) 
                    : (slot.startTimeInstant ? formatTimeFromInstant(slot.startTimeInstant) : 'N/A');
                  const endTime = slot.endTime 
                    ? formatTime(slot.endTime) 
                    : 'N/A';
                  
                  return (
                    <ListItemButton
                      key={slot.startTimeInstant || `slot-${index}`}
                      onClick={() => handleSlotClick(slot)}
                      sx={{
                        border: 1,
                        borderColor: 'divider',
                        borderRadius: 1,
                        mb: 1,
                        '&:hover': {
                          bgcolor: 'action.hover',
                        },
                      }}
                    >
                      <Typography variant="body1">
                        {startTime}{endTime !== 'N/A' ? ` - ${endTime}` : ''}
                      </Typography>
                    </ListItemButton>
                  );
                })}
              </List>
            ) : (
              <Alert severity="info">
                No available sessions on this day. Please select another day.
              </Alert>
            )}
          </Grid>
        </Grid>

        {/* Booking Confirmation Dialog */}
        <Dialog open={openDialog} onClose={handleDialogClose} maxWidth="sm" fullWidth>
          <DialogTitle>Confirm Booking</DialogTitle>
          <DialogContent>
            <DialogContentText sx={{ mb: 2 }}>
              {dialogSlot && (
                <>
                  Confirm your booking for{' '}
                  <strong>
                    {dialogSlot.startTime 
                      ? formatTime(dialogSlot.startTime) 
                      : formatTimeFromInstant(dialogSlot.startTimeInstant)}
                  </strong>{' '}
                  {dialogSlot.endTime && (
                    <>
                      - <strong>{formatTime(dialogSlot.endTime)}</strong>{' '}
                    </>
                  )}
                  on <strong>{formatDateForDisplay(selectedDate)}</strong>?
                </>
              )}
            </DialogContentText>
            
            {bookingError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {bookingError}
              </Alert>
            )}

            <TextField
              fullWidth
              multiline
              rows={4}
              label="Message (Optional)"
              placeholder="Add any additional notes or questions..."
              value={clientMessage}
              onChange={(e) => {
                const value = e.target.value;
                if (value.length <= 2000) {
                  setClientMessage(value);
                }
              }}
              disabled={submittingBooking}
              error={clientMessage.length > 2000}
              helperText={
                clientMessage.length > 2000
                  ? 'Message must be 2000 characters or less'
                  : `${clientMessage.length}/2000 characters`
              }
              sx={{ mt: 1 }}
            />
          </DialogContent>
          <DialogActions>
            <Button 
              onClick={handleDialogClose} 
              color="inherit"
              disabled={submittingBooking}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleConfirmBooking} 
              color="primary" 
              variant="contained"
              disabled={submittingBooking || !selectedSlot || !selectedSlot.startTimeInstant}
            >
              {submittingBooking ? (
                <>
                  <CircularProgress size={16} sx={{ mr: 1 }} />
                  Booking...
                </>
              ) : hasToken ? (
                'Confirm Booking'
              ) : (
                'Log in and confirm'
              )}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Login Required Dialog */}
        <Dialog open={loginRequiredDialogOpen} onClose={() => setLoginRequiredDialogOpen(false)}>
          <DialogTitle>Login Required</DialogTitle>
          <DialogContent>
            <DialogContentText>
              You need to be logged in to book a session. Please log in or sign up to continue.
            </DialogContentText>
            {dialogSlot && (
              <Box sx={{ mt: 2, p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Selected slot:
                </Typography>
                <Typography variant="body1" sx={{ mt: 0.5 }}>
                  {dialogSlot.startTime 
                    ? formatTime(dialogSlot.startTime) 
                    : formatTimeFromInstant(dialogSlot.startTimeInstant)}
                  {dialogSlot.endTime && ` - ${formatTime(dialogSlot.endTime)}`}
                  {' '}on {formatDateForDisplay(selectedDate)}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  Your selection will be saved and the booking will be completed after you log in.
                </Typography>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => setLoginRequiredDialogOpen(false)}
              color="inherit"
              sx={{ textTransform: 'none' }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                setLoginRequiredDialogOpen(false);
                navigate('/signup', { state: { returnTo: '/booking' } });
              }}
              variant="outlined"
              sx={{ textTransform: 'none' }}
            >
              Sign Up
            </Button>
            <Button
              onClick={() => {
                setLoginRequiredDialogOpen(false);
                navigate('/login', { state: { returnTo: '/booking' } });
              }}
              variant="contained"
              sx={{ textTransform: 'none' }}
            >
              Log In
            </Button>
          </DialogActions>
        </Dialog>

        {/* Cancel Booking Confirmation Dialog */}
        <Dialog open={cancelDialogOpen} onClose={handleCancelDialogClose}>
          <DialogTitle>Cancel Booking</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Are you sure you want to cancel this booking? This action cannot be undone.
              {bookingToCancel && (
                <>
                  <br />
                  <br />
                  <strong>
                    {bookingToCancel.sessionTypeName || 'Session'} on{' '}
                    {formatInstant(bookingToCancel.startTimeInstant)}
                  </strong>
                </>
              )}
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={handleCancelDialogClose}
              color="inherit"
              disabled={cancelling}
              sx={{ textTransform: 'none' }}
            >
              Keep Booking
            </Button>
            <Button
              onClick={handleConfirmCancel}
              variant="contained"
              color="error"
              disabled={cancelling}
              sx={{ textTransform: 'none' }}
            >
              {cancelling ? (
                <>
                  <CircularProgress size={16} sx={{ mr: 1 }} />
                  Cancelling...
                </>
              ) : (
                'Cancel Booking'
              )}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </LocalizationProvider>
  );
};

export default BookingPage;

