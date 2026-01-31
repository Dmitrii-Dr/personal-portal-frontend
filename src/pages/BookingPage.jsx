import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n/i18n';
import axios from 'axios';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import updateLocale from 'dayjs/plugin/updateLocale';
import localeData from 'dayjs/plugin/localeData';
import 'dayjs/locale/en-gb';
import 'dayjs/locale/ru';
import apiClient, { fetchWithAuth, getToken, fetchUserSettings as fetchUserSettingsCached } from '../utils/api';
import { getCachedSlots, setCachedSlots, invalidateCache, clearAllCache } from '../utils/bookingSlotCache';
import { fetchTimezones, sortTimezonesByOffset, getOffsetFromTimezone, extractTimezoneOffset, findTimezoneIdByOffset } from '../utils/timezoneService';

// Configure dayjs to start week on Monday
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(updateLocale);
dayjs.extend(localeData);


// Customize Russian locale to capitalize month names
dayjs.updateLocale('ru', {
  months: 'Январь_Февраль_Март_Апрель_Май_Июнь_Июль_Август_Сентябрь_Октябрь_Ноябрь_Декабрь'.split('_'),
  monthsShort: 'Янв_Фев_Мар_Апр_Май_Июн_Июл_Авг_Сен_Окт_Ноя_Дек'.split('_'),
});

// Genitive case months for Russian dates (when month is part of a date)
const monthsGenitive = 'Января_Февраля_Марта_Апреля_Мая_Июня_Июля_Августа_Сентября_Октября_Ноября_Декабря'.split('_');


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
  IconButton,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { DateCalendar } from '@mui/x-date-pickers/DateCalendar';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import AddIcon from '@mui/icons-material/Add';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';

const BookingPage = ({ sessionTypeId: propSessionTypeId, hideMyBookings = false }) => {
  const { t, i18n: i18nInstance } = useTranslation();
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loading, setLoading] = useState(false); // Don't fetch on mount, only when dialog opens
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
  const [selectedTimezone, setSelectedTimezone] = useState(null); // Anonymous user's selected timezone
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

  // New Booking Scroll state
  const newBookingSlotsScrollRef = useRef(null);
  const [showNewBookingScrollTop, setShowNewBookingScrollTop] = useState(false);
  const [showNewBookingScrollBottom, setShowNewBookingScrollBottom] = useState(false);

  // Update Booking Scroll state
  const updateBookingSlotsScrollRef = useRef(null);
  const [showUpdateBookingScrollTop, setShowUpdateBookingScrollTop] = useState(false);
  const [showUpdateBookingScrollBottom, setShowUpdateBookingScrollBottom] = useState(false);

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
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const slotsScrollRef = useRef(null);
  const pendingBookingAttempted = useRef(false);
  const navigate = useNavigate();

  // Timezones state
  const [timezones, setTimezones] = useState([]);
  const [timezonesLoading, setTimezonesLoading] = useState(true);

  // Booking settings state
  const [bookingSettings, setBookingSettings] = useState(null);

  const PENDING_BOOKING_KEY = 'pending_booking';

  // Format date to YYYY-MM-DD for API
  const formatDateForAPI = (date) => {
    return dayjs(date).format('YYYY-MM-DD');
  };

  // Fetch user settings to get timezone and currency (only when user is logged in)
  // Uses cached version from api.js to prevent duplicate calls
  const fetchUserSettings = async () => {
    if (!hasToken) {
      return;
    }

    try {
      const data = await fetchUserSettingsCached();
      if (data) {
        if (data.timezone) {
          const normalizedTimezone = extractTimezoneOffset(data.timezone);
          setUserTimezone(normalizedTimezone);
        } else {
          // Clear timezone if not in settings
          setUserTimezone(null);
        }
        if (data.currency) {
          setUserCurrency(data.currency);
        }
      } else {
        // Clear timezone if no data returned
        setUserTimezone(null);
      }
    } catch (err) {
      console.warn('Error fetching user settings:', err);
      // Clear timezone on error - don't use cached/browser timezone
      setUserTimezone(null);
    }
  };

  // Get currency symbol for display
  const getCurrencySymbol = (currency) => {
    if (!currency) return '';
    const currencyMap = {
      'Rubles': '₽',
      'Tenge': '₸',
      'USD': '$',
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

    const loadBookingSettings = async () => {
      try {
        const response = await apiClient.get('/api/v1/public/booking/setting');
        if (isMounted && response.data) {
          setBookingSettings(response.data);
        }
      } catch (err) {
        console.error('Error fetching booking settings:', err);
      }
    };

    loadTimezones();
    loadBookingSettings();

    return () => {
      isMounted = false;
    };
  }, []);

  // Initialize selected timezone for anonymous users - default to Moscow (+03:00)
  useEffect(() => {
    if (!hasToken && !selectedTimezone) {
      setSelectedTimezone('+03:00'); // Moscow timezone offset
    }
  }, [hasToken, selectedTimezone]);

  // Get current timezone being used for slot display
  const getCurrentTimezone = () => {
    if (userTimezone) {
      return userTimezone;
    }
    if (selectedTimezone) {
      return selectedTimezone;
    }
    // Default to Moscow (+03:00) for anonymous users
    return '+03:00';
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

      // Use user timezone from settings if logged in, otherwise use selected timezone for anonymous users
      let timezone = '+03:00'; // Default to Moscow (+03:00) for anonymous users
      if (userTimezone) {
        timezone = userTimezone;
      } else if (selectedTimezone) {
        timezone = selectedTimezone;
      }

      // Check cache first
      const cachedData = getCachedSlots(sessionTypeId, dateString, timezone);
      if (cachedData) {
        // Handle BookingSuggestionsDto response
        if (cachedData.slots && Array.isArray(cachedData.slots)) {
          setAvailableSlots(cachedData.slots);
        } else {
          setAvailableSlots([]);
        }
        setLoading(false);
        return;
      }

      const timezoneId = findTimezoneIdByOffset(timezone, timezones);
      if (!timezoneId) {
        console.error('Could not find timezone ID for offset:', timezone);
        // For anonymous users who haven't selected a timezone, show a helpful message
        if (!hasToken && !selectedTimezone) {
          setError(t('booking.pleaseSelectTimezone') || 'Please select a timezone to view available slots.');
        } else {
          setError('Invalid timezone selected. Please try again.');
        }
        setLoading(false);
        return;
      }

      const response = await apiClient.get('/api/v1/public/booking/available/slot', {
        params: {
          sessionTypeId,
          suggestedDate: dateString,
          timezoneId: timezoneId,
        },
        timeout: 10000,
      });

      // Handle BookingSuggestionsDto response
      if (response.data && response.data.slots && Array.isArray(response.data.slots)) {
        setAvailableSlots(response.data.slots);
        // Cache the response data
        setCachedSlots(sessionTypeId, dateString, timezone, response.data);
      } else {
        setAvailableSlots([]);
        // Cache empty result too
        setCachedSlots(sessionTypeId, dateString, timezone, { slots: [] });
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
      let errorMessage = t('pages.booking.failedToLoadBookings');
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
  }, [hasToken]);

  // Fetch past bookings (reusable function)
  const fetchPastBookings = useCallback(async (signal = null) => {
    try {
      setLoadingPastBookings(true);
      setPastBookingsError(null);

      const requestConfig = {
        params: {
          status: 'DECLINED,CANCELLED,COMPLETED',
        },
        timeout: 10000,
      };
      if (signal) {
        requestConfig.signal = signal;
      }
      const response = await apiClient.get('/api/v1/session/booking', requestConfig);
      if (response.data && Array.isArray(response.data)) {
        setPastBookings(response.data);
      } else {
        setPastBookings([]);
      }
    } catch (err) {
      // Don't set error if request was aborted
      if (err.name === 'AbortError' || err.name === 'CanceledError' || err.code === 'ERR_CANCELED') {
        return;
      }
      console.error('Error fetching past bookings:', err);
      let errorMessage = t('pages.booking.failedToLoadPastBookings');
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
  }, [hasToken]);

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
  // Always fetch fresh settings (never cache)
  useEffect(() => {
    if (hasToken) {
      // Always fetch fresh settings to get current timezone
      fetchUserSettings();
      fetchBookings();
    } else {
      // Clear timezone when logged out
      setUserTimezone(null);
      setGroupedBookings({});
      setBookingsError(null);
      setLoadingBookings(false);
    }
  }, [hasToken, fetchBookings]);

  // Track last fetched date and sessionTypeId to prevent duplicate calls
  const lastFetchedRef = useRef({ date: null, sessionTypeId: null });

  // Update sessionTypeId when prop changes
  useEffect(() => {
    if (propSessionTypeId !== undefined) {
      setSessionTypeId(propSessionTypeId);
    }
  }, [propSessionTypeId]);

  // Track if dialog was just opened to clear cache on fresh open
  const prevDialogOpenRef = useRef(false);

  // Fetch slots when New Booking dialog opens OR when hideMyBookings is true (form shown directly)
  useEffect(() => {
    // Only fetch if dialog is open OR if hideMyBookings is true (form shown directly)
    const shouldShowForm = newBookingDialogOpen || (hideMyBookings && propSessionTypeId);

    if (!shouldShowForm) {
      // Reset last fetched when dialog closes
      lastFetchedRef.current = { date: null, sessionTypeId: null, timezone: null };
      // Clear slots when dialog closes
      setAvailableSlots([]);
      setError(null);
      // Clear cache when popup is closed
      clearAllCache();
      prevDialogOpenRef.current = false;
      return;
    }

    // If dialog just opened (was closed, now open), clear cache to ensure fresh data
    const dialogJustOpened = !prevDialogOpenRef.current && shouldShowForm;
    if (dialogJustOpened) {
      clearAllCache();
      lastFetchedRef.current = { date: null, sessionTypeId: null, timezone: null };
    }
    prevDialogOpenRef.current = shouldShowForm;

    // If user is logged in but timezone not loaded yet, fetch settings first
    if (hasToken && !userTimezone) {
      fetchUserSettings();
      return; // Wait for timezone to load before fetching slots
    }

    const dateString = formatDateForAPI(selectedDate);
    const currentTimezone = getCurrentTimezone();
    // Fetch if date, sessionTypeId, or timezone changed from last fetch, and sessionTypeId is available
    const lastFetched = lastFetchedRef.current;
    const dateChanged = lastFetched.date !== dateString;
    const sessionTypeChanged = lastFetched.sessionTypeId !== sessionTypeId;
    const timezoneChanged = lastFetched.timezone !== currentTimezone;
    const isInitialLoad = lastFetched.date === null && lastFetched.sessionTypeId === null;

    // Fetch on initial dialog open or when date/sessionType/timezone changes
    if ((isInitialLoad || dateChanged || sessionTypeChanged || timezoneChanged) && sessionTypeId) {
      lastFetchedRef.current = { date: dateString, sessionTypeId, timezone: currentTimezone };
      fetchAvailableSlots(selectedDate);
    }
  }, [newBookingDialogOpen, hideMyBookings, propSessionTypeId, selectedDate, sessionTypeId, userTimezone, selectedTimezone, hasToken]);

  // Update scroll indicators when slots change
  useEffect(() => {
    if (slotsScrollRef.current && availableSlots.length > 4) {
      const element = slotsScrollRef.current;
      const isAtTop = element.scrollTop === 0;
      const isAtBottom = element.scrollHeight - element.scrollTop === element.clientHeight;

      setShowScrollTop(!isAtTop);
      setShowScrollBottom(!isAtBottom);
    } else {
      setShowScrollTop(false);
      setShowScrollBottom(false);
    }
  }, [availableSlots]);

  // Handle date selection
  const handleDateChange = (newDate) => {
    setSelectedDate(newDate);
  };

  // Handle new booking dialog close
  const handleNewBookingDialogClose = () => {
    setNewBookingDialogOpen(false);
    // Clear cache when popup is closed
    clearAllCache();
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
          setUpdateSlotError(t('pages.booking.sessionTypeNotFound'));
        }
      } else {
        setUpdateSlotError(t('pages.booking.failedToLoadSessionTypes'));
      }
    } catch (err) {
      console.error('Error fetching session types for update:', err);
      setUpdateSlotError(t('pages.booking.failedToLoadSessionTypesRetry'));
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

      // Use user timezone from settings if available and user is logged in, otherwise use UTC
      let timezone = '+00:00'; // Default to UTC
      if (hasToken && userTimezone) {
        timezone = userTimezone;
      }

      // Check cache first
      const cachedData = getCachedSlots(sessionTypeId, dateString, timezone);
      if (cachedData) {
        // Handle BookingSuggestionsDto response
        if (cachedData.slots && Array.isArray(cachedData.slots)) {
          setUpdateAvailableSlots(cachedData.slots);
        } else {
          setUpdateAvailableSlots([]);
        }
        setUpdateLoadingSlots(false);
        return;
      }

      const timezoneId = findTimezoneIdByOffset(timezone, timezones);
      if (!timezoneId) {
        console.error('Could not find timezone ID for offset:', timezone);
        // For anonymous users who haven't selected a timezone, show a helpful message
        if (!hasToken && !selectedTimezone) {
          setUpdateSlotError(t('booking.pleaseSelectTimezone') || 'Please select a timezone to view available slots.');
        } else {
          setUpdateSlotError('Invalid timezone selected. Please try again.');
        }
        setUpdateLoadingSlots(false);
        return;
      }

      const response = await apiClient.get('/api/v1/public/booking/available/slot', {
        params: {
          sessionTypeId,
          suggestedDate: dateString,
          timezoneId: timezoneId,
        },
        timeout: 10000,
      });

      // Handle BookingSuggestionsDto response
      if (response.data && response.data.slots && Array.isArray(response.data.slots)) {
        setUpdateAvailableSlots(response.data.slots);
        // Cache the response data
        setCachedSlots(sessionTypeId, dateString, timezone, response.data);
      } else {
        setUpdateAvailableSlots([]);
        // Cache empty result too
        setCachedSlots(sessionTypeId, dateString, timezone, { slots: [] });
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
    setUpdateSelectedSlot(null);
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
    // Delay clearing state until after dialog close animation completes
    setTimeout(() => {
      setBookingToUpdate(null);
      setUpdateSelectedSlot(null);
      setUpdateClientMessage('');
      setUpdateBookingError(null);
      setUpdateAvailableSlots([]);
      setUpdateSlotError(null);
      setUpdateSessionTypeId(null);
      // Clear cache when update dialog closes
      clearAllCache();
    }, 300);
  };

  // Handle booking update confirmation
  const handleConfirmUpdate = async () => {
    if (!bookingToUpdate || !bookingToUpdate.id || !updateSelectedSlot || !updateSelectedSlot.startTimeInstant) {
      // Use setBookingError (Snackbar) for validation to be consistent with handling logic
      setBookingError(t('pages.booking.selectTimeSlot'));
      return;
    }

    setUpdatingBooking(true);
    setUpdateBookingError(null);
    setBookingError(null);

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
      setSuccessMessage(t('pages.booking.bookingUpdated'));

      if (hasToken) {
        await fetchBookings(); // Refresh bookings list when user is logged in
        await fetchPastBookings(); // Refresh past sessions
      }
      // Invalidate cache for the date that was updated to refresh slots
      const dateString = formatDateForAPI(updateSelectedDate);
      const currentTimezone = getCurrentTimezone();
      if (updateSessionTypeId) {
        invalidateCache(updateSessionTypeId, dateString, currentTimezone);
      }
      await fetchAvailableSlots(selectedDate); // Refresh available slots
    } catch (err) {
      console.error('Error updating booking:', err);
      let errorMessage = t('pages.booking.failedToUpdateBooking');

      // Check for 400 or 500 errors and show user-friendly message
      if (err.response && (err.response.status === 400 || err.response.status >= 500)) {
        errorMessage = t('pages.booking.bookingErrorRetry');
        // Invalidate cache to refresh slots (e.g. if slot taken)
        const dateString = formatDateForAPI(updateSelectedDate);
        const currentTimezone = getCurrentTimezone();
        if (updateSessionTypeId) {
          invalidateCache(updateSessionTypeId, dateString, currentTimezone);
        }
      } else if (err.code === 'ECONNABORTED') {
        errorMessage = 'Request timed out. Please try again.';
      } else if (err.response) {
        errorMessage = err.response.data?.message || `Server error: ${err.response.status}`;
        // If update failed (e.g., slot was already booked), invalidate cache to refresh
        const dateString = formatDateForAPI(updateSelectedDate);
        const currentTimezone = getCurrentTimezone();
        if (updateSessionTypeId) {
          invalidateCache(updateSessionTypeId, dateString, currentTimezone);
        }
      } else if (err.request) {
        errorMessage = 'Unable to reach the server. Please check your connection.';
      } else {
        errorMessage = err.message || errorMessage;
      }

      // Use setBookingError (Snackbar) instead of inline setUpdateBookingError
      setBookingError(errorMessage);
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
      // Invalidate cache for the date that was canceled to refresh slots
      const dateString = formatDateForAPI(selectedDate);
      const currentTimezone = getCurrentTimezone();
      invalidateCache(sessionTypeId, dateString, currentTimezone);
      await fetchAvailableSlots(selectedDate); // Refresh available slots
    } catch (err) {
      console.error('Error cancelling booking:', err);
      let errorMessage = t('pages.booking.failedToCancelBooking');

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
      setBookingError(t('pages.booking.selectTimeSlot'));
      return;
    }

    // Check if user is logged in - DO NOT call API without token
    if (!hasToken || !getToken()) {
      // Get the timezone ID for the current timezone
      const currentTimezone = getCurrentTimezone();
      const timezoneId = findTimezoneIdByOffset(currentTimezone, timezones);

      // Save booking data to sessionStorage
      const pendingBooking = {
        sessionTypeId: sessionTypeId,
        startTimeInstant: selectedSlot.startTimeInstant,
        clientMessage: clientMessage.trim() || null,
        selectedDate: formatDateForAPI(selectedDate),
        timezoneId: timezoneId, // Include timezone ID for signup
      };
      sessionStorage.setItem(PENDING_BOOKING_KEY, JSON.stringify(pendingBooking));
      // Reset the attempted flag for this new booking
      pendingBookingAttempted.current = false;

      // Show login/signup dialog
      setLoginRequiredDialogOpen(true);
      setOpenDialog(false);
      return;
    }

    // User is logged in, proceed with booking - verify token exists before API call
    const token = getToken();
    if (!token) {
      setBookingError(t('landing.booking.mustBeLoggedIn'));
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
      handleNewBookingDialogClose(); // Close new booking dialog (also clears cache)
      setSuccessMessage(t('pages.booking.bookingSuccess'));
      navigate('/booking'); // Redirect to booking page on success
      if (hasToken) {
        await fetchBookings(); // Refresh bookings list when user is logged in
      }
      // Invalidate cache for the date that was booked to refresh slots
      const dateString = formatDateForAPI(selectedDate);
      const currentTimezone = getCurrentTimezone();
      invalidateCache(sessionTypeId, dateString, currentTimezone);
      await fetchAvailableSlots(selectedDate); // Refresh available slots
    } catch (err) {
      console.error('Error creating booking:', err);
      let errorMessage = t('pages.booking.bookingFailed');

      // Check for 400 or 500 errors and show user-friendly message
      if (err.response && (err.response.status === 400 || err.response.status >= 500)) {
        errorMessage = t('pages.booking.bookingErrorRetry');
        // Invalidate cache to refresh slots
        const dateString = formatDateForAPI(selectedDate);
        const currentTimezone = getCurrentTimezone();
        invalidateCache(sessionTypeId, dateString, currentTimezone);
      } else if (err.code === 'ECONNABORTED') {
        errorMessage = 'Request timed out. Please try again.';
      } else if (err.response) {
        errorMessage = err.response.data?.message || `Server error: ${err.response.status}`;
        // If booking failed (e.g., slot was already booked), invalidate cache to refresh
        const dateString = formatDateForAPI(selectedDate);
        const currentTimezone = getCurrentTimezone();
        invalidateCache(sessionTypeId, dateString, currentTimezone);
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

    // Prevent multiple attempts for the same booking
    if (pendingBookingAttempted.current) {
      return;
    }

    // Mark as attempted
    pendingBookingAttempted.current = true;

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
        setSuccessMessage(t('pages.booking.bookingSuccess'));
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
      // Remove pending booking to prevent infinite retries
      sessionStorage.removeItem(PENDING_BOOKING_KEY);
      // Show error to user for 400/500 errors
      if (err.response && (err.response.status === 400 || err.response.status >= 500)) {
        setBookingError(t('pages.booking.bookingErrorRetry'));
      }
    }
  }, [hasToken, t, fetchBookings, fetchAvailableSlots]);

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
      // Parse UTC time from API
      const utcTime = dayjs.utc(instantString);

      // Convert to user's timezone if available, otherwise use selected timezone for anonymous users
      let timezone = userTimezone || selectedTimezone || 'Europe/Moscow';

      // Convert UTC to user's timezone and format as HH:mm
      const localTime = utcTime.tz(timezone);
      return localTime.format('HH:mm');
    } catch {
      // Fallback: try without timezone conversion
      try {
        return dayjs(instantString).format('HH:mm');
      } catch {
        return instantString;
      }
    }
  };

  // Format date for display
  const formatDateForDisplay = (date) => {
    const locale = i18nInstance.language === 'ru' ? 'ru' : 'en-gb';
    if (locale === 'ru') {
      const d = dayjs(date);
      const day = d.format('D');
      const monthIndex = d.month();
      const monthGenitive = monthsGenitive[monthIndex];
      const year = d.format('YYYY');
      return `${day} ${monthGenitive}, ${year}`;
    }
    return dayjs(date).locale(locale).format('MMMM D, YYYY');
  };

  // Format instant for display (24-hour format) using user's timezone
  const formatInstant = (instantString) => {
    if (!instantString) return 'N/A';
    try {
      const locale = i18nInstance.language === 'ru' ? 'ru' : 'en-gb';
      // Parse UTC time from API
      const utcTime = dayjs.utc(instantString);

      // Convert to user's timezone if available, otherwise use selected timezone for anonymous users
      let timezone = userTimezone || selectedTimezone || 'Europe/Moscow';

      // Convert UTC to user's timezone and format with locale
      const localTime = utcTime.tz(timezone);

      if (locale === 'ru') {
        const day = localTime.format('D');
        const monthIndex = localTime.month();
        const monthGenitive = monthsGenitive[monthIndex];
        const year = localTime.format('YYYY');
        const time = localTime.format('HH:mm');
        return `${day} ${monthGenitive}, ${year}, ${time}`;
      }

      return localTime.locale(locale).format('MMMM D, YYYY, HH:mm');
    } catch {
      // Fallback: try without timezone conversion
      try {
        const locale = i18nInstance.language === 'ru' ? 'ru' : 'en-gb';
        const localTime = dayjs(instantString);

        if (locale === 'ru') {
          const day = localTime.format('D');
          const monthIndex = localTime.month();
          const monthGenitive = monthsGenitive[monthIndex];
          const year = localTime.format('YYYY');
          const time = localTime.format('HH:mm');
          return `${day} ${monthGenitive}, ${year}, ${time}`;
        }

        return localTime.locale(locale).format('MMMM D, YYYY, HH:mm');
      } catch {
        return instantString;
      }
    }
  };

  // Format booking start time, showing date and start time only
  const formatBookingStart = (startInstant) => {
    if (!startInstant) return 'N/A';
    try {
      const locale = i18nInstance.language === 'ru' ? 'ru' : 'en-gb';
      const timezone = userTimezone || selectedTimezone || 'Europe/Moscow';

      const startTime = dayjs.utc(startInstant).tz(timezone);

      let dateStr;
      if (locale === 'ru') {
        // Russian format with genitive case: "Сессия назначена на 31 Января, 2026"
        const day = startTime.format('D');
        const monthIndex = startTime.month();
        const monthGenitive = monthsGenitive[monthIndex];
        const year = startTime.format('YYYY');
        dateStr = `${day} ${monthGenitive}, ${year}`;
      } else {
        // English format: "January 31, 2026"
        dateStr = `${startTime.locale(locale).format('MMMM D, YYYY')}`;
      }
      const startTimeStr = startTime.format('HH:mm');
      return `${dateStr}, ${startTimeStr}`;
    } catch {
      return formatInstant(startInstant);
    }
  };

  // Get human-readable status label
  const getStatusLabel = (status) => {
    if (!status) return t('pages.booking.status.UNKNOWN');
    const statusKey = status.toUpperCase();
    const translationKey = `pages.booking.status.${statusKey}`;
    const translated = t(translationKey);
    // If translation key doesn't exist, return the status as-is
    return translated !== translationKey ? translated : status;
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

  // Check if booking can be updated based on settings
  const canUpdateBooking = (booking) => {
    if (!booking) return false;

    // If settings not loaded yet, default to allowing update (or disallow? usually safer to allow then fail or wait)
    // However, for better UX let's assume allowed if we are not sure, unless it's past
    if (!bookingSettings) return !isPastBooking(booking);

    // Also check standard "past" logic
    if (isPastBooking(booking)) {
      return false;
    }

    if (!booking.startTimeInstant) return false;

    try {
      const updateIntervalMinutes = bookingSettings.bookingUpdatingInterval || 0;
      const startTime = dayjs(booking.startTimeInstant);
      const now = dayjs();

      // Calculate deadline: startTime - interval
      const deadline = startTime.subtract(updateIntervalMinutes, 'minute');

      // If deadline > now, returns true (button available)
      return deadline.isAfter(now);
    } catch (e) {
      console.error("Error calculating update availability", e);
      return false;
    }
  };

  // Check if booking can be cancelled (if start time is in the future)
  const canCancelBooking = (booking) => {
    if (!booking || !booking.startTimeInstant) return false;

    // Check if start time is in the future
    const startTime = dayjs(booking.startTimeInstant);
    const now = dayjs();

    return startTime.isAfter(now);
  };

  // Get active bookings sorted by start time
  const getActiveBookings = () => {
    const confirmed = groupedBookings.CONFIRMED || [];
    const pendingApproval = groupedBookings.PENDING_APPROVAL || [];
    const allActive = [...confirmed, ...pendingApproval];

    // Sort by startTimeInstant
    return allActive.sort((a, b) => {
      if (!a.startTimeInstant) return 1;
      if (!b.startTimeInstant) return -1;
      return dayjs(a.startTimeInstant).diff(dayjs(b.startTimeInstant));
    });
  };

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  // Fetch past bookings when switching to Past Sessions tab
  const hasFetchedPastBookingsRef = useRef(false);
  const lastActiveTabRef = useRef(activeTab);

  useEffect(() => {
    // Reset fetch flag when switching tabs
    if (lastActiveTabRef.current !== activeTab) {
      hasFetchedPastBookingsRef.current = false;
      lastActiveTabRef.current = activeTab;
    }

    // Only fetch if:
    // 1. User has token
    // 2. On Past Sessions tab (activeTab === 1)
    // 3. Haven't fetched yet for this tab visit
    // 4. Not currently loading
    if (hasToken && activeTab === 1 && !loadingPastBookings && !hasFetchedPastBookingsRef.current) {
      let isMounted = true;
      const controller = new AbortController();

      const fetchData = async () => {
        hasFetchedPastBookingsRef.current = true;
        await fetchPastBookings(controller.signal);
        if (!isMounted) return;
      };

      fetchData();

      return () => {
        isMounted = false;
        controller.abort();
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasToken, activeTab]);

  // Effect to handle scroll indicator initial state when slots are loaded
  useEffect(() => {
    if (newBookingDialogOpen && newBookingSlotsScrollRef.current && availableSlots.length > 0) {
      // Small timeout to allow render
      setTimeout(() => {
        if (newBookingSlotsScrollRef.current) {
          const element = newBookingSlotsScrollRef.current;
          const isScrollable = element.scrollHeight > element.clientHeight;
          setShowNewBookingScrollBottom(isScrollable);
        }
      }, 100);
    }
  }, [newBookingDialogOpen, availableSlots]);

  useEffect(() => {
    if (updateDialogOpen && updateBookingSlotsScrollRef.current && updateAvailableSlots.length > 0) {
      // Small timeout to allow render
      setTimeout(() => {
        if (updateBookingSlotsScrollRef.current) {
          const element = updateBookingSlotsScrollRef.current;
          const isScrollable = element.scrollHeight > element.clientHeight;
          setShowUpdateBookingScrollBottom(isScrollable);
        }
      }, 100);
    }
  }, [updateDialogOpen, updateAvailableSlots]);

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale={i18nInstance.language === 'ru' ? 'ru' : 'en-gb'}>
      <Box>
        {/* Show "My Bookings" section only if user is logged in and not in dialog/popup */}
        {hasToken && !hideMyBookings && (
          <>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h4" component="h1">
                {t('pages.booking.myBookings')}
              </Typography>
              <Button
                variant="contained"
                color="primary"
                onClick={() => setNewBookingDialogOpen(true)}
                sx={{ textTransform: 'none' }}
                startIcon={<AddIcon />}
              >
                {t('pages.booking.newBooking')}
              </Button>
            </Box>

            {/* Tabs for Active Sessions and Past Sessions */}
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mt: 2 }}>
              <Tabs value={activeTab} onChange={handleTabChange} aria-label="booking tabs">
                <Tab label={t('pages.booking.activeSessions')} />
                <Tab label={t('pages.booking.pastSessions')} />
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
                                      {booking.sessionName || t('pages.booking.session')}
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
                                    <strong>{t('pages.booking.sessionScheduledFor')} </strong>{formatBookingStart(booking.startTimeInstant)}
                                  </Typography>
                                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                    <strong>{t('pages.booking.sessionDuration')}:</strong> {booking.sessionDurationMinutes} {t('common.minutes')}
                                  </Typography>
                                </Box>
                                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                                  <Chip
                                    label={getStatusLabel(booking.status)}
                                    color={getStatusColor(booking.status)}
                                    size="small"
                                  />
                                  {isPast && (
                                    <Tooltip title={t('pages.booking.pastTooltip')}>
                                      <Chip
                                        label={t('pages.booking.past')}
                                        size="small"
                                        sx={{ cursor: 'help', bgcolor: 'grey.300' }}
                                      />
                                    </Tooltip>
                                  )}
                                </Box>
                              </Box>
                              {booking.clientMessage && (
                                <>
                                  <Typography variant="body2" color="text.secondary">
                                    <strong>{t('pages.booking.message')}:</strong> {booking.clientMessage}
                                  </Typography>
                                </>
                              )}
                              <Divider sx={{ my: 1, mt: 2 }} />
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                {t('pages.booking.created')} {formatInstant(booking.createdAt)}
                              </Typography>
                              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 2 }}>
                                {booking.status?.toUpperCase() === 'CONFIRMED' ? (
                                  <>
                                    <Tooltip title={t('pages.booking.cancelTooltip')}>
                                      <span>
                                        <Button
                                          variant="outlined"
                                          color="primary"
                                          size="small"
                                          disabled={true}
                                          sx={{ textTransform: 'none' }}
                                        >
                                          {t('pages.booking.updateSessionDateTime')}
                                        </Button>
                                      </span>
                                    </Tooltip>
                                    <Tooltip title={t('pages.booking.cancelTooltip')}>
                                      <span>
                                        <Button
                                          variant="outlined"
                                          color="error"
                                          size="small"
                                          disabled={true}
                                          sx={{ textTransform: 'none' }}
                                        >
                                          {t('pages.booking.cancelBooking')}
                                        </Button>
                                      </span>
                                    </Tooltip>
                                  </>
                                ) : (
                                  <>
                                    {(booking.status?.toUpperCase() === 'PENDING_APPROVAL' || booking.status?.toUpperCase() === 'PENDING') && (
                                      canUpdateBooking(booking) ? (
                                        <Button
                                          variant="outlined"
                                          color="primary"
                                          size="small"
                                          onClick={() => handleUpdateClick(booking)}
                                          disabled={updatingBooking}
                                          sx={{ textTransform: 'none' }}
                                        >
                                          {t('pages.booking.updateSessionDateTime')}
                                        </Button>
                                      ) : (
                                        <Tooltip title={t('pages.booking.cancelTooltip')}>
                                          <span>
                                            <Button
                                              variant="outlined"
                                              color="primary"
                                              size="small"
                                              disabled={true}
                                              sx={{ textTransform: 'none' }}
                                            >
                                              {t('pages.booking.updateSessionDateTime')}
                                            </Button>
                                          </span>
                                        </Tooltip>
                                      )
                                    )}
                                    {canCancelBooking(booking) ? (
                                      <Button
                                        variant="outlined"
                                        color="error"
                                        size="small"
                                        onClick={() => handleCancelClick(booking)}
                                        disabled={cancelling}
                                        sx={{ textTransform: 'none' }}
                                      >
                                        {t('pages.booking.cancelBooking')}
                                      </Button>
                                    ) : (
                                      <Tooltip title={t('pages.booking.cancelTooltip')}>
                                        <span>
                                          <Button
                                            variant="outlined"
                                            color="error"
                                            size="small"
                                            disabled={true}
                                            sx={{ textTransform: 'none' }}
                                          >
                                            {t('pages.booking.cancelBooking')}
                                          </Button>
                                        </span>
                                      </Tooltip>
                                    )}
                                  </>
                                )}
                              </Box>
                            </CardContent>
                          </Card>
                        );
                      })
                    ) : (
                      <Alert severity="info" sx={{ mt: 2 }}>
                        {t('pages.booking.noActiveBookings')}
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
                                    {booking.sessionName || t('pages.booking.session')}
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
                                  <strong>{t('pages.booking.sessionScheduledFor')} </strong>{formatBookingStart(booking.startTimeInstant)}
                                </Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                  <strong>{t('pages.booking.sessionDuration')}:</strong> {booking.sessionDurationMinutes} {t('common.minutes')}
                                </Typography>
                              </Box>
                              <Chip
                                label={getStatusLabel(booking.status)}
                                color={getStatusColor(booking.status)}
                                size="small"
                              />
                            </Box>
                            {booking.clientMessage && (
                              <>
                                <Typography variant="body2" color="text.secondary">
                                  <strong>{t('pages.booking.message')}:</strong> {booking.clientMessage}
                                </Typography>
                              </>
                            )}
                            <Divider sx={{ my: 1, mt: 2 }} />
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                              {t('pages.booking.created')} {formatInstant(booking.createdAt)}
                            </Typography>
                          </CardContent>
                        </Card>
                      ))
                    ) : (
                      <Alert severity="info">
                        {t('pages.booking.noPastBookings')}
                      </Alert>
                    )}
                  </Box>
                )}
              </>
            )}
            <Divider sx={{ my: 4 }} />
          </>
        )}

        {/* New Booking Button - shown when user is not logged in (but not when hideMyBookings is true) */}
        {!hasToken && !hideMyBookings && (
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

        {/* Booking Form - shown directly when hideMyBookings is true, otherwise in dialog */}
        {hideMyBookings ? (
          <Box>
            {/* Session Type Selection - only show if not provided as prop */}
            {!propSessionTypeId && (
              <Box sx={{ mb: 3 }}>
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
                    <InputLabel>{t('pages.booking.selectSessionType')}</InputLabel>
                    <Select
                      value={sessionTypeId || ''}
                      onChange={(e) => setSessionTypeId(e.target.value)}
                      label={t('pages.booking.selectSessionType')}
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
                    {t('pages.booking.noSessionTypesAvailable')}
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
                  {t('pages.booking.availableTimes')} {formatDateForDisplay(selectedDate)}
                </Typography>

                {/* Timezone selector for anonymous users, info message for logged-in users */}
                {(loading || availableSlots.length > 0) && (
                  !hasToken ? (
                    <FormControl sx={{ mb: 2, width: '100%' }}>
                      <InputLabel>Timezone</InputLabel>
                      <Select
                        value={selectedTimezone || ''}
                        onChange={(e) => {
                          setSelectedTimezone(e.target.value);
                          // Re-fetch slots with new timezone
                          if (sessionTypeId) {
                            lastFetchedRef.current = { date: null, sessionTypeId: null };
                          }
                        }}
                        label="Timezone"
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
                  ) : (
                    <Alert severity="info" sx={{ mb: 2 }}>
                      <Tooltip title={t('pages.booking.slotsTimezoneTooltip')} placement="bottom">
                        <span>
                          {(() => {
                            const currentOffset = getCurrentTimezone();
                            const found = timezones.find(tz => tz.offset === currentOffset);
                            const displayName = found
                              ? t(`pages.profile.timezones.${found.id}`, { defaultValue: found.displayName })
                              : currentOffset;

                            return t('pages.booking.slotsTimezone', {
                              timezone: found ? `${displayName} (${currentOffset})` : currentOffset
                            });
                          })()}
                        </span>
                      </Tooltip>
                    </Alert>
                  )
                )}

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
                  <Box sx={{ position: 'relative' }}>
                    <Box
                      ref={slotsScrollRef}
                      sx={{ maxHeight: '240px', overflowY: 'auto', pr: 1 }}
                      onScroll={(e) => {
                        const element = e.target;
                        const isAtTop = element.scrollTop === 0;
                        const isAtBottom = element.scrollHeight - element.scrollTop === element.clientHeight;

                        setShowScrollTop(!isAtTop && availableSlots.length > 4);
                        setShowScrollBottom(!isAtBottom && availableSlots.length > 4);
                      }}
                    >
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
                  <Alert severity="info">
                    {t('pages.booking.noAvailableSessions')}
                  </Alert>
                )}
              </Grid>
            </Grid>
          </Box>
        ) : (
          /* New Booking Dialog - shown when hideMyBookings is false */
          <Dialog
            open={newBookingDialogOpen}
            onClose={handleNewBookingDialogClose}
            maxWidth="md"
            fullWidth
          >
            <DialogTitle>
              {t('landing.booking.title')}
              <IconButton
                aria-label="close"
                onClick={handleNewBookingDialogClose}
                sx={{
                  position: 'absolute',
                  right: 8,
                  top: 8,
                  color: (theme) => theme.palette.grey[500],
                }}
              >
                <CloseIcon />
              </IconButton>
            </DialogTitle>
            <DialogContent sx={{ pb: 4, minHeight: '620px' }}>
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
                      <InputLabel>{t('pages.booking.selectSessionType')}</InputLabel>
                      <Select
                        value={sessionTypeId || ''}
                        onChange={(e) => setSessionTypeId(e.target.value)}
                        label={t('pages.booking.selectSessionType')}
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
                      {t('pages.booking.noSessionTypesAvailable')}
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
                    {t('pages.booking.availableTimes')} {formatDateForDisplay(selectedDate)}
                  </Typography>

                  {/* Timezone selector for anonymous users, info message for logged-in users */}
                  {(loading || availableSlots.length > 0) && (
                    !hasToken ? (
                      <FormControl sx={{ mb: 2, width: '100%' }}>
                        <InputLabel>Timezone</InputLabel>
                        <Select
                          value={selectedTimezone || ''}
                          onChange={(e) => {
                            setSelectedTimezone(e.target.value);
                            // Reset last fetched to trigger re-fetch with new timezone
                            if (sessionTypeId) {
                              lastFetchedRef.current = { date: null, sessionTypeId: null, timezone: null };
                            }
                          }}
                          label="Timezone"
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
                    ) : (
                      <Alert severity="info" sx={{ mb: 2 }}>
                        <Tooltip title={t('pages.booking.slotsTimezoneTooltip')} placement="bottom">
                          <span>
                            {(() => {
                              const currentOffset = getCurrentTimezone();
                              const found = timezones.find(tz => tz.offset === currentOffset);
                              const displayName = found
                                ? t(`pages.profile.timezones.${found.id}`, { defaultValue: found.displayName })
                                : currentOffset;

                              return t('pages.booking.slotsTimezone', {
                                timezone: `${displayName} (${currentOffset})`
                              });
                            })()}
                          </span>
                        </Tooltip>
                      </Alert>
                    )
                  )}

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
                    <Box sx={{ position: 'relative' }}>
                      <Box
                        ref={newBookingSlotsScrollRef}
                        sx={{ maxHeight: '240px', overflowY: 'auto', pr: 1 }}
                        onScroll={(e) => {
                          const element = e.target;
                          const isAtTop = element.scrollTop === 0;
                          const isAtBottom = Math.abs(element.scrollHeight - element.scrollTop - element.clientHeight) < 1;

                          setShowNewBookingScrollTop(!isAtTop);
                          setShowNewBookingScrollBottom(!isAtBottom && availableSlots.length > 4);
                        }}
                      >
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
                      </Box>
                      {/* Top scroll indicator */}
                      {showNewBookingScrollTop && (
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
                      {showNewBookingScrollBottom && (
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
                    <Alert severity="info">
                      {t('pages.booking.noAvailableSessions')}
                    </Alert>
                  )}
                </Grid>
              </Grid>
            </DialogContent>

          </Dialog>
        )}

        {/* Booking Confirmation Dialog */}
        <Dialog open={openDialog} onClose={handleDialogClose} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ m: 0, p: 2, pr: 6 }}>
            {t('pages.booking.confirmBookingTitle')}
            <IconButton
              aria-label="close"
              onClick={handleDialogClose}
              disabled={submittingBooking}
              sx={{
                position: 'absolute',
                right: 8,
                top: 8,
                color: (theme) => theme.palette.grey[500],
              }}
            >
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent>
            <DialogContentText sx={{ mb: 2 }}>
              {dialogSlot && (
                <>
                  {t('pages.booking.confirmBookingMessage')}{' '}
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
                  {t('pages.booking.on')} <strong>{formatDateForDisplay(selectedDate)}</strong>?
                </>
              )}
            </DialogContentText>

            <TextField
              fullWidth
              multiline
              rows={4}
              label={t('pages.booking.messageOptional')}
              placeholder={t('pages.booking.messagePlaceholder')}
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
                  ? t('pages.booking.messageMaxLength')
                  : `${clientMessage.length}/2000 ${t('common.characters')}`
              }
              sx={{ mt: 1 }}
            />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button
              onClick={handleConfirmBooking}
              color="primary"
              variant="contained"
              fullWidth
              disabled={submittingBooking || !selectedSlot || !selectedSlot.startTimeInstant}
              sx={{ py: 1 }}
            >
              {submittingBooking ? (
                <>
                  <CircularProgress size={16} sx={{ mr: 1 }} />
                  {t('pages.booking.booking')}...
                </>
              ) : hasToken ? (
                t('pages.booking.confirmBooking')
              ) : (
                t('pages.booking.logInAndConfirm')
              )}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Login Required Dialog */}
        <Dialog open={loginRequiredDialogOpen} onClose={() => setLoginRequiredDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ m: 0, p: 2, pr: 6 }}>
            {t('auth.loginRequired')}
            <IconButton
              aria-label="close"
              onClick={() => setLoginRequiredDialogOpen(false)}
              sx={{
                position: 'absolute',
                right: 8,
                top: 8,
                color: (theme) => theme.palette.grey[500],
              }}
            >
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent>
            <DialogContentText>
              {t('landing.booking.loginToBook')}
            </DialogContentText>
            {dialogSlot && (
              <Box sx={{ mt: 2, p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  {t('pages.booking.selectedSlot')}:
                </Typography>
                <Typography variant="body1" sx={{ mt: 0.5 }}>
                  {dialogSlot.startTime
                    ? formatTime(dialogSlot.startTime)
                    : formatTimeFromInstant(dialogSlot.startTimeInstant)}
                  {dialogSlot.endTime && ` - ${formatTime(dialogSlot.endTime)}`}
                  {' '}{t('pages.booking.on')} {formatDateForDisplay(selectedDate)}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  {t('pages.booking.selectionSaved')}
                </Typography>
              </Box>
            )}
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2, gap: 1.5 }}>
            <Button
              onClick={() => {
                setLoginRequiredDialogOpen(false);
                navigate('/signup', { state: { returnTo: '/booking' } });
              }}
              variant="outlined"
              fullWidth
              sx={{ textTransform: 'none', py: 1 }}
            >
              {t('auth.signUp')}
            </Button>
            <Button
              onClick={() => {
                setLoginRequiredDialogOpen(false);
                navigate('/login', { state: { returnTo: '/booking' } });
              }}
              variant="contained"
              fullWidth
              sx={{ textTransform: 'none', py: 1 }}
            >
              {t('auth.login')}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Cancel Booking Confirmation Dialog */}
        <Dialog open={cancelDialogOpen} onClose={handleCancelDialogClose}>
          <DialogTitle>{t('pages.booking.cancelBookingTitle')}</DialogTitle>
          <DialogContent>
            <DialogContentText>
              {t('pages.booking.cancelBookingMessage')}
              {bookingToCancel && (
                <>
                  <br />
                  <br />
                  <strong>
                    {bookingToCancel.sessionName || t('pages.booking.session')} {t('pages.booking.on')}{' '}
                    {formatInstant(bookingToCancel.startTimeInstant)}
                  </strong>
                </>
              )}
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={handleCancelDialogClose}
              variant="contained"
              color="primary"
              disabled={cancelling}
              sx={{ textTransform: 'none' }}
            >
              {t('pages.booking.keepBooking')}
            </Button>
            <Button
              onClick={handleConfirmCancel}
              variant="outlined"
              color="error"
              disabled={cancelling}
              sx={{ textTransform: 'none' }}
            >
              {cancelling ? (
                <>
                  <CircularProgress size={16} sx={{ mr: 1 }} />
                  {t('pages.booking.cancelling')}
                </>
              ) : (
                t('pages.booking.cancelBooking')
              )}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Update Booking Dialog */}
        <Dialog open={updateDialogOpen} onClose={handleUpdateDialogClose} maxWidth="md" fullWidth>
          <DialogTitle sx={{ m: 0, p: 2, pr: 6 }}>
            {t('pages.booking.updateSessionDateTimeTitle')}
            <IconButton
              aria-label="close"
              onClick={handleUpdateDialogClose}
              disabled={updatingBooking}
              sx={{
                position: 'absolute',
                right: 8,
                top: 8,
                color: (theme) => theme.palette.grey[500],
              }}
            >
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent>
            {bookingToUpdate && (
              <>
                <DialogContentText sx={{ mb: 2 }}>
                  {t('pages.booking.selectNewDateTime')} <strong>{bookingToUpdate.sessionName || t('pages.booking.session')}</strong> {t('pages.booking.booking')}.
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
                        slotProps={{
                          calendarHeader: {
                            format: 'MMMM YYYY',
                          },
                        }}
                        dayOfWeekFormatter={(day) => day.charAt(0).toUpperCase() + day.slice(1)}
                      />
                    </Box>
                  </Grid>

                  {/* Right Column - Available Slots */}
                  <Grid item xs={12} md={6}>
                    <Typography variant="h6" gutterBottom>
                      {t('pages.booking.availableTimes')} {formatDateForDisplay(updateSelectedDate)}
                    </Typography>

                    {(updateLoadingSlots || updateAvailableSlots.length > 0) && (
                      <Alert severity="info" sx={{ mb: 2 }}>
                        <Tooltip title={t('pages.booking.slotsTimezoneTooltip')} placement="bottom">
                          <span>
                            {(() => {
                              const currentOffset = getCurrentTimezone();
                              const found = timezones.find(tz => tz.offset === currentOffset);
                              const displayName = found
                                ? t(`pages.profile.timezones.${found.id}`, { defaultValue: found.displayName })
                                : currentOffset;

                              return t('pages.booking.slotsTimezone', {
                                timezone: found ? `${displayName} (${currentOffset})` : currentOffset
                              });
                            })()}
                          </span>
                        </Tooltip>
                      </Alert>
                    )}

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
                      <Box sx={{ position: 'relative' }}>
                        <Box
                          ref={updateBookingSlotsScrollRef}
                          sx={{ maxHeight: '240px', overflowY: 'auto', pr: 1 }}
                          onScroll={(e) => {
                            const element = e.target;
                            const isAtTop = element.scrollTop === 0;
                            const isAtBottom = Math.abs(element.scrollHeight - element.scrollTop - element.clientHeight) < 1;

                            setShowUpdateBookingScrollTop(!isAtTop);
                            setShowUpdateBookingScrollBottom(!isAtBottom && updateAvailableSlots.length > 4);
                          }}
                        >
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
                        </Box>
                        {/* Top scroll indicator */}
                        {showUpdateBookingScrollTop && (
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
                        {showUpdateBookingScrollBottom && (
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
                      <Alert severity="info">
                        {t('pages.booking.noAvailableSessions')}
                      </Alert>
                    )}
                  </Grid>
                </Grid>

                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  label={t('pages.booking.messageOptional')}
                  placeholder={t('pages.booking.messagePlaceholder')}
                  value={updateClientMessage}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value.length <= 2000) {
                      setUpdateClientMessage(value);
                    }
                  }}
                  disabled={updatingBooking || !updateSelectedSlot}
                  error={updateClientMessage.length > 2000}
                  helperText={
                    updateClientMessage.length > 2000
                      ? t('pages.booking.messageMaxLength')
                      : `${updateClientMessage.length}/2000 ${t('common.characters')}`
                  }
                  sx={{
                    mt: 3,
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: (updatingBooking || !updateSelectedSlot) ? 'action.hover' : 'inherit'
                    }
                  }}
                />
              </>
            )}
          </DialogContent>
          <DialogActions>
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
                  {t('pages.booking.updating')}
                </>
              ) : (
                t('pages.booking.updateBooking')
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
          sx={{ mt: { xs: 8, sm: 9, md: 10 }, zIndex: 99999, position: 'fixed' }}
        >
          <Alert onClose={() => setSuccessMessage(null)} severity="success" sx={{ width: '100%' }}>
            {successMessage}
          </Alert>
        </Snackbar>

        {/* Error Snackbar */}
        <Snackbar
          open={!!bookingError}
          autoHideDuration={8000}
          onClose={() => setBookingError(null)}
          anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
          sx={{ mt: { xs: 8, sm: 9, md: 10 }, zIndex: 99999, position: 'fixed' }}
        >
          <Alert onClose={() => setBookingError(null)} severity="error" sx={{ width: '100%' }}>
            {bookingError}
          </Alert>
        </Snackbar>
      </Box>
    </LocalizationProvider >
  );
};


export default BookingPage;
