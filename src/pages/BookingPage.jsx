import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import dayjs from 'dayjs';
import updateLocale from 'dayjs/plugin/updateLocale';
import localeData from 'dayjs/plugin/localeData';
import 'dayjs/locale/en-gb';
import apiClient, { fetchWithAuth, getToken } from '../utils/api';

// Configure dayjs to start week on Monday
dayjs.extend(updateLocale);
dayjs.extend(localeData);
dayjs.locale('en-gb'); // Use en-gb locale which starts week on Monday
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
  Tabs,
  Tab,
  Tooltip,
  Snackbar,
} from '@mui/material';
import { DateCalendar } from '@mui/x-date-pickers/DateCalendar';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import AddIcon from '@mui/icons-material/Add';

const BookingPage = ({ sessionTypeId: propSessionTypeId, hideMyBookings = false }) => {
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
  const [userCurrency, setUserCurrency] = useState(null); // User currency from settings
  const [groupedBookings, setGroupedBookings] = useState({});
  const [pastBookings, setPastBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [loadingPastBookings, setLoadingPastBookings] = useState(false);
  const [bookingsError, setBookingsError] = useState(null);
  const [pastBookingsError, setPastBookingsError] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [bookingToCancel, setBookingToCancel] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const [hasToken, setHasToken] = useState(false);
  const [loginRequiredDialogOpen, setLoginRequiredDialogOpen] = useState(false);
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [bookingToUpdate, setBookingToUpdate] = useState(null);
  const [updateSelectedDate, setUpdateSelectedDate] = useState(dayjs());
  const [updateAvailableSlots, setUpdateAvailableSlots] = useState([]);
  const [updateLoadingSlots, setUpdateLoadingSlots] = useState(false);
  const [updateSlotError, setUpdateSlotError] = useState(null);
  const [updateSelectedSlot, setUpdateSelectedSlot] = useState(null);
  const [updateClientMessage, setUpdateClientMessage] = useState('');
  const [updatingBooking, setUpdatingBooking] = useState(false);
  const [updateBookingError, setUpdateBookingError] = useState(null);
  const [updateSessionTypeId, setUpdateSessionTypeId] = useState(null); // Matched session type ID for update
  const [newBookingDialogOpen, setNewBookingDialogOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);
  const navigate = useNavigate();
  
  const PENDING_BOOKING_KEY = 'pending_booking';

  // Format date to YYYY-MM-DD for API
  const formatDateForAPI = (date) => {
    return dayjs(date).format('YYYY-MM-DD');
  };

  // Fetch user settings to get timezone and currency (only when user is logged in)
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
        if (data.currency) {
          setUserCurrency(data.currency);
        }
      }
    } catch (err) {
      console.warn('Error fetching user settings:', err);
      // Fallback to browser timezone if settings fetch fails
      const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      setUserTimezone(browserTimezone);
    }
  };

  // Get currency symbol for display
  const getCurrencySymbol = (currency) => {
    if (!currency) return '';
    const currencyMap = {
      'Rubles': '₽',
      'Tenge': '₸',
      'USD': '$',
      'USD': '$', // Fallback for typo
    };
    return currencyMap[currency] || '';
  };

  // Format session type display with price in user's currency
  const formatSessionTypeDisplay = (sessionType) => {
    const name = sessionType.name || '';
    const duration = sessionType.durationMinutes || 60;
    let priceDisplay = '';
    
    if (userCurrency && sessionType.prices && sessionType.prices[userCurrency] !== undefined) {
      const price = sessionType.prices[userCurrency];
      const symbol = getCurrencySymbol(userCurrency);
      priceDisplay = `${price}${symbol}`;
    } else if (sessionType.price !== undefined) {
      // Fallback to old price field if available
      priceDisplay = `${sessionType.price}$`;
    }
    
    if (priceDisplay) {
      return `${name}. ${duration} min. ${priceDisplay}`;
    } else {
      return `${name}. ${duration} min`;
    }
  };

  // Get first price from sessionPrices object and format it
  const getBookingPriceDisplay = (sessionPrices) => {
    if (!sessionPrices || typeof sessionPrices !== 'object') {
      return null;
    }
    
    // Get the first key-value pair from sessionPrices
    const currencies = Object.keys(sessionPrices);
    if (currencies.length === 0) {
      return null;
    }
    
    const firstCurrency = currencies[0];
    const price = sessionPrices[firstCurrency];
    
    if (price === null || price === undefined) {
      return null;
    }
    
    const symbol = getCurrencySymbol(firstCurrency);
    return `${price}${symbol}`;
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

  // Fetch bookings grouped by status (reusable function)
  const fetchBookings = useCallback(async () => {
    try {
      setLoadingBookings(true);
      setBookingsError(null);
      const response = await apiClient.get('/api/v1/session/booking/group', {
        params: {
          status: 'PENDING_APPROVAL,CONFIRMED',
        },
        timeout: 10000,
      });
      if (response.data && response.data.bookings) {
        setGroupedBookings(response.data.bookings || {});
      } else {
        setGroupedBookings({});
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
      setGroupedBookings({});
    } finally {
      setLoadingBookings(false);
    }
  }, []);

  // Fetch past bookings (reusable function)
  const fetchPastBookings = useCallback(async () => {
    try {
      setLoadingPastBookings(true);
      setPastBookingsError(null);
      const response = await apiClient.get('/api/v1/session/booking', {
        params: {
          status: 'DECLINED,CANCELLED,COMPLETED',
        },
        timeout: 10000,
      });
      if (response.data && Array.isArray(response.data)) {
        setPastBookings(response.data);
      } else {
        setPastBookings([]);
      }
    } catch (err) {
      console.error('Error fetching past bookings:', err);
      let errorMessage = 'Failed to load past bookings. Please try again later.';
      if (err.code === 'ECONNABORTED') {
        errorMessage = 'Request timed out. Please try again.';
      } else if (err.response) {
        errorMessage = err.response.data?.message || `Server error: ${err.response.status}`;
      } else if (err.request) {
        errorMessage = 'Unable to reach the server. Please check your connection.';
      } else {
        errorMessage = err.message || errorMessage;
      }
      setPastBookingsError(errorMessage);
      setPastBookings([]);
    } finally {
      setLoadingPastBookings(false);
    }
  }, []);

  // Fetch session types if not provided as prop
  useEffect(() => {
    if (propSessionTypeId) {
      // Session type provided as prop, no need to fetch
      setLoadingSessionTypes(false);
      return;
    }

    let isMounted = true;
    const controller = new AbortController();

    const fetchSessionTypes = async () => {
      setLoadingSessionTypes(true);
      setSessionTypesError(null);
      try {
        const response = await apiClient.get('/api/v1/public/session/type', {
          signal: controller.signal,
          timeout: 10000,
        });
        if (!isMounted) return;
        
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
        // Don't set error if request was aborted
        if (error.name === 'AbortError' || error.name === 'CanceledError' || error.code === 'ERR_CANCELED') {
          return;
        }
        
        if (!isMounted) return;
        
        console.error('Error fetching session types:', error);
        setSessionTypesError(error.message || 'Failed to load session types');
        setSessionTypes([]);
      } finally {
        if (isMounted) {
          setLoadingSessionTypes(false);
        }
      }
    };
    
    fetchSessionTypes();
    
    return () => {
      isMounted = false;
      controller.abort();
    };
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

  // Fetch user settings and bookings automatically when user is logged in
  useEffect(() => {
    if (hasToken) {
      fetchUserSettings();
      fetchBookings();
    } else {
      setGroupedBookings({});
      setBookingsError(null);
      setLoadingBookings(false);
    }
  }, [hasToken, fetchBookings]);

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

  // Handle update booking click
  const handleUpdateClick = async (booking) => {
    setBookingToUpdate(booking);
    setUpdateSelectedDate(dayjs());
    setUpdateAvailableSlots([]);
    setUpdateSlotError(null);
    setUpdateSelectedSlot(null);
    setUpdateClientMessage(booking.clientMessage || '');
    setUpdateBookingError(null);
    setUpdateSessionTypeId(null);
    setUpdateDialogOpen(true);
    
    // Fetch active session types and match by name to find the session type ID
    try {
      const response = await apiClient.get('/api/v1/public/session/type', {
        timeout: 10000,
      });
      if (response.data && Array.isArray(response.data)) {
        // Match booking session name to find the session type
        const matchedSessionType = response.data.find(
          st => st.name === booking.sessionName
        );
        if (matchedSessionType) {
          const sessionTypeId = matchedSessionType.id || matchedSessionType.sessionTypeId;
          setUpdateSessionTypeId(sessionTypeId);
          // Fetch slots for the matched session type
          fetchUpdateSlots(dayjs(), sessionTypeId);
        } else {
          setUpdateSlotError(`Session type "${booking.sessionName}" is no longer available for booking.`);
        }
      } else {
        setUpdateSlotError('Failed to load session types.');
      }
    } catch (err) {
      console.error('Error fetching session types for update:', err);
      setUpdateSlotError('Failed to load session types. Please try again.');
    }
  };

  // Fetch available slots for update (similar to fetchAvailableSlots but for specific session type)
  const fetchUpdateSlots = async (date, sessionTypeId) => {
    if (!sessionTypeId) {
      setUpdateLoadingSlots(false);
      setUpdateAvailableSlots([]);
      setUpdateSlotError('Session type not found');
      return;
    }

    try {
      setUpdateLoadingSlots(true);
      setUpdateSlotError(null);
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
        setUpdateAvailableSlots(response.data.slots);
      } else {
        setUpdateAvailableSlots([]);
      }
    } catch (err) {
      console.error('Error fetching available slots for update:', err);
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
      
      setUpdateSlotError(errorMessage);
      setUpdateAvailableSlots([]);
    } finally {
      setUpdateLoadingSlots(false);
    }
  };

  // Handle update date change
  const handleUpdateDateChange = (newDate) => {
    setUpdateSelectedDate(newDate);
    if (updateSessionTypeId) {
      fetchUpdateSlots(newDate, updateSessionTypeId);
    }
  };

  // Handle update slot selection
  const handleUpdateSlotClick = (slot) => {
    setUpdateSelectedSlot(slot);
  };

  // Handle update dialog close
  const handleUpdateDialogClose = () => {
    if (updatingBooking) return; // Prevent closing during update
    setUpdateDialogOpen(false);
    setBookingToUpdate(null);
    setUpdateSelectedSlot(null);
    setUpdateClientMessage('');
    setUpdateBookingError(null);
    setUpdateAvailableSlots([]);
    setUpdateSlotError(null);
    setUpdateSessionTypeId(null);
  };

  // Handle booking update confirmation
  const handleConfirmUpdate = async () => {
    if (!bookingToUpdate || !bookingToUpdate.id || !updateSelectedSlot || !updateSelectedSlot.startTimeInstant) {
      setUpdateBookingError('Please select a time slot');
      return;
    }

    setUpdatingBooking(true);
    setUpdateBookingError(null);

    try {
      const payload = {
        id: bookingToUpdate.id,
        startTime: updateSelectedSlot.startTimeInstant,
        clientMessage: updateClientMessage.trim() || null,
      };

      const response = await apiClient.put(`/api/v1/session/booking/${bookingToUpdate.id}`, payload, {
        timeout: 10000,
      });

      if (!response || (response.status && response.status >= 400)) {
        throw new Error('Failed to update booking');
      }

      // Success - close dialog and refresh bookings and slots
      handleUpdateDialogClose();
      if (hasToken) {
        await fetchBookings(); // Refresh bookings list when user is logged in
        await fetchPastBookings(); // Refresh past sessions
      }
      await fetchAvailableSlots(selectedDate); // Refresh available slots
    } catch (err) {
      console.error('Error updating booking:', err);
      let errorMessage = 'Failed to update booking. Please try again.';
      
      if (err.code === 'ECONNABORTED') {
        errorMessage = 'Request timed out. Please try again.';
      } else if (err.response) {
        errorMessage = err.response.data?.message || `Server error: ${err.response.status}`;
      } else if (err.request) {
        errorMessage = 'Unable to reach the server. Please check your connection.';
      } else {
        errorMessage = err.message || errorMessage;
      }
      
      setUpdateBookingError(errorMessage);
    } finally {
      setUpdatingBooking(false);
    }
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
      let response;
      const status = bookingToCancel.status?.toUpperCase();
      
      // Use POST for PENDING_APPROVAL or PENDING status, DELETE for others
      if (status === 'PENDING_APPROVAL' || status === 'PENDING') {
        response = await apiClient.post(`/api/v1/session/booking/${bookingToCancel.id}/cancel`, {}, {
          timeout: 10000,
        });
      } else {
        response = await apiClient.delete(`/api/v1/session/booking/${bookingToCancel.id}`, {
          timeout: 10000,
        });
      }

      if (!response || (response.status && response.status >= 400)) {
        throw new Error('Failed to cancel booking');
      }

      // Success - close dialog and refresh bookings and slots
      handleCancelDialogClose();
      if (hasToken) {
        await fetchBookings(); // Refresh bookings list when user is logged in
        await fetchPastBookings(); // Refresh past sessions to show canceled booking
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
      setNewBookingDialogOpen(false); // Close new booking dialog
      setSuccessMessage('Booking created successfully!');
      if (hasToken) {
        await fetchBookings(); // Refresh bookings list when user is logged in
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
        setSuccessMessage('Booking created successfully!');
        if (hasToken) {
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
  }, [hasToken]);

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
      // Always display in 24-hour format (HH:mm)
      // Handle LocalTime format (HH:mm:ss or HH:mm)
      const time = timeString.includes(':') ? timeString.split(':').slice(0, 2).join(':') : timeString;
      return dayjs(time, 'HH:mm').format('HH:mm');
    } catch {
      return timeString;
    }
  };

  // Format time from Instant if LocalTime is not available
  const formatTimeFromInstant = (instantString) => {
    if (!instantString) return 'N/A';
    try {
      // Always display in 24-hour format (HH:mm)
      return dayjs(instantString).format('HH:mm');
    } catch {
      return instantString;
    }
  };

  // Format date for display
  const formatDateForDisplay = (date) => {
    return dayjs(date).format('MMMM D, YYYY');
  };

  // Format instant for display (24-hour format)
  const formatInstant = (instantString) => {
    if (!instantString) return 'N/A';
    try {
      return dayjs(instantString).format('MMMM D, YYYY HH:mm');
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
      case 'PENDING_APPROVAL':
      case 'PENDING':
        return 'warning';
      case 'CANCELLED':
      case 'DECLINED':
        return 'error';
      default:
        return 'default';
    }
  };

  // Check if booking is past (CONFIRMED or PENDING_APPROVAL status with endTimeInstant in the past)
  const isPastBooking = (booking) => {
    if (!booking) {
      return false;
    }
    const status = booking.status?.toUpperCase();
    if (status !== 'CONFIRMED' && status !== 'PENDING_APPROVAL') {
      return false;
    }
    if (!booking.endTimeInstant) {
      return false;
    }
    try {
      const endTime = dayjs(booking.endTimeInstant);
      return endTime.isBefore(dayjs());
    } catch {
      return false;
    }
  };

  // Get active bookings (CONFIRMED first, then PENDING_APPROVAL)
  const getActiveBookings = () => {
    const confirmed = groupedBookings.CONFIRMED || [];
    const pendingApproval = groupedBookings.PENDING_APPROVAL || [];
    return [...confirmed, ...pendingApproval];
  };

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    // Fetch past bookings when switching to Past Sessions tab
    if (newValue === 1 && hasToken && pastBookings.length === 0 && !loadingPastBookings) {
      fetchPastBookings();
    }
  };

  // Fetch past bookings when component mounts if user is already on Past Sessions tab
  useEffect(() => {
    if (hasToken && activeTab === 1 && pastBookings.length === 0 && !loadingPastBookings) {
      fetchPastBookings();
    }
  }, [hasToken, activeTab, pastBookings.length, loadingPastBookings, fetchPastBookings]);

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="en-gb">
      <Box>
        {/* Show "My Bookings" section only if user is logged in and not in dialog/popup */}
        {hasToken && !hideMyBookings && (
          <>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h4" component="h1">
                My Bookings
              </Typography>
              <Button
                variant="contained"
                color="primary"
                onClick={() => setNewBookingDialogOpen(true)}
                sx={{ textTransform: 'none' }}
                startIcon={<AddIcon />}
              >
                New Booking
              </Button>
            </Box>

            {/* Tabs for Active Sessions and Past Sessions */}
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mt: 2 }}>
              <Tabs value={activeTab} onChange={handleTabChange} aria-label="booking tabs">
                <Tab label="Active Sessions" />
                <Tab label="Past Sessions" />
              </Tabs>
            </Box>

            {/* Tab Panels */}
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
            ) : (
              <>
                {/* Active Sessions Tab */}
                {activeTab === 0 && (
                  <Box sx={{ mt: 2 }}>
                    {getActiveBookings().length > 0 ? (
                      getActiveBookings().map((booking) => {
                        const isPast = isPastBooking(booking);
                        return (
                          <Card 
                            key={booking.id} 
                            sx={{ 
                              mb: 2,
                              bgcolor: isPast ? 'grey.200' : 'background.paper',
                            }}
                          >
                            <CardContent>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                                <Box>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                    <Typography variant="h6" component="h2">
                                      {booking.sessionName || 'Session'}
                                    </Typography>
                                    {getBookingPriceDisplay(booking.sessionPrices) && (
                                      <Chip
                                        label={getBookingPriceDisplay(booking.sessionPrices)}
                                        size="small"
                                        color="primary"
                                        variant="outlined"
                                      />
                                    )}
                                  </Box>
                                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                    {formatInstant(booking.startTimeInstant)} - {formatInstant(booking.endTimeInstant)}
                                  </Typography>
                                </Box>
                                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                                  <Chip
                                    label={booking.status || 'UNKNOWN'}
                                    color={getStatusColor(booking.status)}
                                    size="small"
                                  />
                                  {isPast && (
                                    <Tooltip title="Status will be updated soon by administrator">
                                      <Chip
                                        label="Past"
                                        size="small"
                                        sx={{ cursor: 'help', bgcolor: 'grey.300' }}
                                      />
                                    </Tooltip>
                                  )}
                                </Box>
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
                            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 2 }}>
                              {booking.status?.toUpperCase() === 'CONFIRMED' ? (
                                <Tooltip title="Please contact me to cancel or change session time">
                                  <span>
                                    <Button
                                      variant="outlined"
                                      color="error"
                                      size="small"
                                      disabled={true}
                                      sx={{ textTransform: 'none' }}
                                    >
                                      Cancel Booking
                                    </Button>
                                  </span>
                                </Tooltip>
                              ) : (
                                <>
                                  {(booking.status?.toUpperCase() === 'PENDING_APPROVAL' || booking.status?.toUpperCase() === 'PENDING') && (
                                    <Button
                                      variant="outlined"
                                      color="primary"
                                      size="small"
                                      onClick={() => handleUpdateClick(booking)}
                                      disabled={updatingBooking || isPast}
                                      sx={{ textTransform: 'none' }}
                                    >
                                      Update Session Date/Time
                                    </Button>
                                  )}
                                  <Button
                                    variant="outlined"
                                    color="error"
                                    size="small"
                                    onClick={() => handleCancelClick(booking)}
                                    disabled={cancelling || isPast}
                                    sx={{ textTransform: 'none' }}
                                  >
                                    Cancel Booking
                                  </Button>
                                </>
                              )}
                            </Box>
                          </CardContent>
                        </Card>
                        );
                      })
                    ) : (
                      <Alert severity="info" sx={{ mt: 2 }}>
                        No active bookings found.
                      </Alert>
                    )}
                  </Box>
                )}

                {/* Past Sessions Tab */}
                {activeTab === 1 && (
                  <Box sx={{ mt: 2 }}>
                    {loadingPastBookings ? (
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
                    ) : pastBookingsError ? (
                      <Alert severity="error">
                        {pastBookingsError}
                      </Alert>
                    ) : pastBookings.length > 0 ? (
                      pastBookings.map((booking) => (
                        <Card key={booking.id} sx={{ mb: 2 }}>
                          <CardContent>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                              <Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                  <Typography variant="h6" component="h2">
                                    {booking.sessionName || 'Session'}
                                  </Typography>
                                  {getBookingPriceDisplay(booking.sessionPrices) && (
                                    <Chip
                                      label={getBookingPriceDisplay(booking.sessionPrices)}
                                      size="small"
                                      color="primary"
                                      variant="outlined"
                                    />
                                  )}
                                </Box>
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
                          </CardContent>
                        </Card>
                      ))
                    ) : (
                      <Alert severity="info">
                        No past bookings found.
                      </Alert>
                    )}
                  </Box>
                )}
              </>
            )}
            <Divider sx={{ my: 4 }} />
          </>
        )}

        {/* New Booking Button - shown when user is not logged in or hideMyBookings is true */}
        {(!hasToken || hideMyBookings) && (
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
            <Button
              variant="contained"
              color="primary"
              onClick={() => setNewBookingDialogOpen(true)}
              sx={{ textTransform: 'none' }}
              startIcon={<AddIcon />}
            >
              New Booking
            </Button>
          </Box>
        )}

        {/* New Booking Dialog */}
        <Dialog 
          open={newBookingDialogOpen} 
          onClose={() => setNewBookingDialogOpen(false)} 
          maxWidth="md" 
          fullWidth
        >
          <DialogTitle>Book a Session</DialogTitle>
          <DialogContent>
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
                  <FormControl sx={{ minWidth: 300, width: '100%' }}>
                    <InputLabel>Select Session Type</InputLabel>
                    <Select
                      value={sessionTypeId || ''}
                      onChange={(e) => setSessionTypeId(e.target.value)}
                      label="Select Session Type"
                    >
                      {sessionTypes.map((st) => (
                        <MenuItem key={st.id || st.sessionTypeId} value={st.id || st.sessionTypeId}>
                          {formatSessionTypeDisplay(st)}
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

            <Grid container spacing={3} sx={{ mt: propSessionTypeId ? 0 : 2 }}>
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
                    firstDayOfWeek={1}
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
          </DialogContent>
          <DialogActions>
            <Button 
              onClick={() => setNewBookingDialogOpen(false)} 
              color="inherit"
              sx={{ textTransform: 'none' }}
            >
              Close
            </Button>
          </DialogActions>
        </Dialog>

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
                    {bookingToCancel.sessionName || 'Session'} on{' '}
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

        {/* Update Booking Dialog */}
        <Dialog open={updateDialogOpen} onClose={handleUpdateDialogClose} maxWidth="md" fullWidth>
          <DialogTitle>Update Session Date/Time</DialogTitle>
          <DialogContent>
            {bookingToUpdate && (
              <>
                <DialogContentText sx={{ mb: 2 }}>
                  Select a new date and time for your <strong>{bookingToUpdate.sessionName || 'Session'}</strong> booking.
                </DialogContentText>

                {updateBookingError && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {updateBookingError}
                  </Alert>
                )}

                <Grid container spacing={3} sx={{ mt: 1 }}>
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
                        value={updateSelectedDate}
                        onChange={handleUpdateDateChange}
                        minDate={dayjs()}
                        sx={{ width: '100%' }}
                        firstDayOfWeek={1}
                      />
                    </Box>
                  </Grid>

                  {/* Right Column - Available Slots */}
                  <Grid item xs={12} md={6}>
                    <Typography variant="h6" gutterBottom>
                      Available Times on {formatDateForDisplay(updateSelectedDate)}
                    </Typography>

                    {updateSlotError && (
                      <Alert severity="error" sx={{ mb: 2 }}>
                        {updateSlotError}
                      </Alert>
                    )}

                    {updateLoadingSlots ? (
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
                    ) : updateAvailableSlots.length > 0 ? (
                      <List>
                        {updateAvailableSlots.map((slot, index) => {
                          const startTime = slot.startTime 
                            ? formatTime(slot.startTime) 
                            : (slot.startTimeInstant ? formatTimeFromInstant(slot.startTimeInstant) : 'N/A');
                          const endTime = slot.endTime 
                            ? formatTime(slot.endTime) 
                            : 'N/A';
                          const isSelected = updateSelectedSlot?.startTimeInstant === slot.startTimeInstant;
                          
                          return (
                            <ListItemButton
                              key={slot.startTimeInstant || `slot-${index}`}
                              onClick={() => handleUpdateSlotClick(slot)}
                              selected={isSelected}
                              sx={{
                                border: 1,
                                borderColor: isSelected ? 'primary.main' : 'divider',
                                borderRadius: 1,
                                mb: 1,
                                bgcolor: isSelected ? 'action.selected' : 'transparent',
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

                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  label="Message (Optional)"
                  placeholder="Add any additional notes or questions..."
                  value={updateClientMessage}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value.length <= 2000) {
                      setUpdateClientMessage(value);
                    }
                  }}
                  disabled={updatingBooking}
                  error={updateClientMessage.length > 2000}
                  helperText={
                    updateClientMessage.length > 2000
                      ? 'Message must be 2000 characters or less'
                      : `${updateClientMessage.length}/2000 characters`
                  }
                  sx={{ mt: 3 }}
                />
              </>
            )}
          </DialogContent>
          <DialogActions>
            <Button 
              onClick={handleUpdateDialogClose} 
              color="inherit"
              disabled={updatingBooking}
              sx={{ textTransform: 'none' }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleConfirmUpdate} 
              color="primary" 
              variant="contained"
              disabled={updatingBooking || !updateSelectedSlot || !updateSelectedSlot.startTimeInstant}
              sx={{ textTransform: 'none' }}
            >
              {updatingBooking ? (
                <>
                  <CircularProgress size={16} sx={{ mr: 1 }} />
                  Updating...
                </>
              ) : (
                'Update Booking'
              )}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Success Snackbar */}
        <Snackbar
          open={!!successMessage}
          autoHideDuration={6000}
          onClose={() => setSuccessMessage(null)}
          anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
          sx={{ mt: { xs: 8, sm: 9, md: 10 } }}
        >
          <Alert onClose={() => setSuccessMessage(null)} severity="success" sx={{ width: '100%' }}>
            {successMessage}
          </Alert>
        </Snackbar>
      </Box>
    </LocalizationProvider>
  );
};

export default BookingPage;

