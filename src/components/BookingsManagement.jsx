import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n/i18n';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { fetchAdminGroupedBookings, fetchWithAuth, getToken, fetchUserSettings } from '../utils/api';
import apiClient from '../utils/api';
import { getCachedSlots, setCachedSlots, invalidateCache, clearAllCache } from '../utils/bookingSlotCache';

// Extend dayjs with timezone support
dayjs.extend(utc);
dayjs.extend(timezone);

const monthsGenitive = 'Января_Февраля_Марта_Апреля_Мая_Июня_Июля_Августа_Сентября_Октября_Ноября_Декабря'.split('_');
import {
  Box,
  Typography,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Divider,
  Stack,
  Snackbar,
  Paper,
  Popover,
  List,
  ListItemButton,
  TextField,
  IconButton,
  Tooltip,
} from '@mui/material';
import { DateCalendar } from '@mui/x-date-pickers/DateCalendar';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import EditIcon from '@mui/icons-material/Edit';
import InfoIcon from '@mui/icons-material/Info';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import ClearIcon from '@mui/icons-material/Clear';
import CloseIcon from '@mui/icons-material/Close';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import WarningIcon from '@mui/icons-material/Warning';

const STATUS_COLORS = {
  PENDING_APPROVAL: 'warning',
  CONFIRMED: 'success',
  DECLINED: 'error',
  CANCELLED: 'default',
  COMPLETED: 'info',
};

const STATUS_TRANSITIONS = {
  PENDING_APPROVAL: ['CONFIRMED', 'DECLINED', 'CANCELLED'],
  CONFIRMED: ['DECLINED', 'CANCELLED', 'COMPLETED'],
  DECLINED: [], // Cannot transition from DECLINED
  CANCELLED: [], // Cannot transition from CANCELLED
  COMPLETED: [], // Cannot transition from COMPLETED
};

const BookingsManagement = () => {
  const { t } = useTranslation();
  const [bookings, setBookings] = useState({
    PENDING_APPROVAL: [],
    CONFIRMED: [],
  });
  const [allBookings, setAllBookings] = useState({
    PENDING_APPROVAL: [],
    CONFIRMED: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [newStatus, setNewStatus] = useState('');
  const [updating, setUpdating] = useState(false);
  const [updateError, setUpdateError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [infoDialogOpen, setInfoDialogOpen] = useState(false);
  const [selectedBookingInfo, setSelectedBookingInfo] = useState(null);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [userTimezone, setUserTimezone] = useState(null);
  const [calendarAnchorEl, setCalendarAnchorEl] = useState(null);
  const [rescheduleDialogOpen, setRescheduleDialogOpen] = useState(false);
  const [bookingToReschedule, setBookingToReschedule] = useState(null);
  const [rescheduleSelectedDate, setRescheduleSelectedDate] = useState(dayjs());
  const [rescheduleAvailableSlots, setRescheduleAvailableSlots] = useState([]);
  const [confirmRescheduleDialogOpen, setConfirmRescheduleDialogOpen] = useState(false);
  const [rescheduleLoadingSlots, setRescheduleLoadingSlots] = useState(false);
  const [rescheduleSlotError, setRescheduleSlotError] = useState(null);
  const [rescheduleSelectedSlot, setRescheduleSelectedSlot] = useState(null);
  const [rescheduleClientMessage, setRescheduleClientMessage] = useState('');
  const [reschedulingBooking, setReschedulingBooking] = useState(false);
  const [rescheduleBookingError, setRescheduleBookingError] = useState(null);
  const [rescheduleSessionTypeId, setRescheduleSessionTypeId] = useState(null);
  const [showCustomTimePicker, setShowCustomTimePicker] = useState(false);
  const [customStartTime, setCustomStartTime] = useState(null);
  const [hourInput, setHourInput] = useState('00');
  const [minuteInput, setMinuteInput] = useState('00');
  const hasFetchedRef = useRef(false);
  const allBookingsRef = useRef({
    PENDING_APPROVAL: [],
    CONFIRMED: [],
  });

  // Reschedule Slots Scroll state
  const rescheduleSlotsScrollRef = useRef(null);
  const [showRescheduleScrollTop, setShowRescheduleScrollTop] = useState(false);
  const [showRescheduleScrollBottom, setShowRescheduleScrollBottom] = useState(false);

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

  // Fetch user timezone from settings
  const fetchUserTimezone = async () => {
    try {
      const data = await fetchUserSettings();
      if (data && data.timezone) {
        setUserTimezone(data.timezone);
      } else {
        // Fallback to browser timezone
        const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        setUserTimezone(browserTimezone);
      }
    } catch (err) {
      console.warn('Error fetching user timezone:', err);
      // Fallback to browser timezone
      const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      setUserTimezone(browserTimezone);
    }
  };

  // Apply date filter to bookings
  const applyDateFilter = (bookingsToFilter, start, end) => {
    // If no filter is set, show all bookings
    if (!start && !end) {
      setBookings(bookingsToFilter);
      return;
    }

    // Allow filtering with just start date (single day) or both dates
    if (!start) {
      setBookings(bookingsToFilter);
      return;
    }

    // Don't filter if timezone is not loaded yet
    if (!userTimezone) {
      setBookings(bookingsToFilter);
      return;
    }

    const filtered = {
      PENDING_APPROVAL: [],
      CONFIRMED: [],
    };

    // Normalize filter dates - calendar dates are just dates, format them as YYYY-MM-DD
    const startDateStr = dayjs(start).format('YYYY-MM-DD');
    // If no end date, use start date (single day filter)
    const endDateStr = end ? dayjs(end).format('YYYY-MM-DD') : startDateStr;

    // Ensure start is before end
    const actualStartStr = startDateStr <= endDateStr ? startDateStr : endDateStr;
    const actualEndStr = startDateStr <= endDateStr ? endDateStr : startDateStr;

    ['PENDING_APPROVAL', 'CONFIRMED'].forEach((status) => {
      filtered[status] = bookingsToFilter[status].filter((booking) => {
        if (!booking.startTimeInstant) {
          return false; // Exclude bookings without start time
        }

        try {
          // Parse UTC time and convert to user's timezone
          const bookingUtc = dayjs.utc(booking.startTimeInstant);
          const bookingInTimezone = bookingUtc.tz(userTimezone);
          const bookingDateStr = bookingInTimezone.format('YYYY-MM-DD');

          // Compare date strings (YYYY-MM-DD format) for accurate date-only comparison
          const isInRange = bookingDateStr >= actualStartStr && bookingDateStr <= actualEndStr;

          return isInRange;
        } catch (error) {
          console.error('Error parsing booking date:', booking.startTimeInstant, error);
          return false; // Exclude bookings with invalid dates
        }
      });
    });

    setBookings(filtered);
  };

  // Fetch bookings
  const fetchBookings = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch bookings grouped by status
      // If status is not provided, fetch all statuses
      const data = await fetchAdminGroupedBookings('PENDING_APPROVAL,CONFIRMED');

      // Handle different possible response formats
      let fetchedBookings = {
        PENDING_APPROVAL: [],
        CONFIRMED: [],
      };

      if (data && typeof data === 'object') {
        // If response has bookings object with status keys
        if (data.bookings) {
          fetchedBookings = {
            PENDING_APPROVAL: data.bookings.PENDING_APPROVAL || [],
            CONFIRMED: data.bookings.CONFIRMED || [],
          };
        }
        // If response is directly an object with status keys
        else if (data.PENDING_APPROVAL !== undefined || data.CONFIRMED !== undefined) {
          fetchedBookings = {
            PENDING_APPROVAL: data.PENDING_APPROVAL || [],
            CONFIRMED: data.CONFIRMED || [],
          };
        }
        // If response is an array, group by status
        else if (Array.isArray(data)) {
          fetchedBookings = {
            PENDING_APPROVAL: data.filter(b => b.status === 'PENDING_APPROVAL'),
            CONFIRMED: data.filter(b => b.status === 'CONFIRMED'),
          };
        }
      }

      // Store all bookings and apply filter
      setAllBookings(fetchedBookings);
      allBookingsRef.current = fetchedBookings;
      applyDateFilter(fetchedBookings, startDate, endDate);
    } catch (err) {
      console.error('Error fetching bookings:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Failed to load bookings. Please try again.';
      setError(errorMessage);
      const emptyBookings = {
        PENDING_APPROVAL: [],
        CONFIRMED: [],
      };
      setAllBookings(emptyBookings);
      allBookingsRef.current = emptyBookings;
      setBookings(emptyBookings);
    } finally {
      setLoading(false);
    }
  };

  // Handle date selection from calendar
  const handleDateSelect = (date) => {
    if (!date) return;

    const selectedDay = dayjs(date).startOf('day');

    // If no start date selected, set it as start and end (single day)
    if (!startDate) {
      setStartDate(selectedDay);
      setEndDate(selectedDay);
    }
    // If start date is selected
    else {
      const startDay = dayjs(startDate).startOf('day');
      const isSingleDay = endDate && dayjs(startDate).isSame(endDate, 'day');
      const isRangeComplete = endDate && !dayjs(startDate).isSame(endDate, 'day');

      // If a range is already complete (start and end are different), clear and start fresh
      if (isRangeComplete) {
        setStartDate(selectedDay);
        setEndDate(selectedDay);
      }
      // If clicking the same date as start, and it's a single day selection, clear filter
      else if (selectedDay.isSame(startDay) && isSingleDay) {
        setStartDate(null);
        setEndDate(null);
      }
      // If selected date is before start date, swap them
      else if (selectedDay.isBefore(startDay)) {
        setEndDate(startDate);
        setStartDate(selectedDay);
      }
      // Otherwise set as end date (creates a range)
      else {
        setEndDate(selectedDay);
      }
    }
  };

  // Apply filter when dates change
  useEffect(() => {
    const currentBookings = allBookingsRef.current;
    // Apply filter if we have bookings loaded, start date is set, and timezone is loaded
    if (Object.keys(currentBookings).length > 0 && startDate && userTimezone) {
      applyDateFilter(currentBookings, startDate, endDate);
    } else if (Object.keys(currentBookings).length > 0 && !startDate && !endDate) {
      // If no dates selected, show all bookings
      setBookings(currentBookings);
    }
  }, [startDate, endDate, userTimezone]);

  // Clear date filter
  const handleClearFilter = () => {
    setStartDate(null);
    setEndDate(null);
    setBookings(allBookingsRef.current);
    setCalendarAnchorEl(null);
  };

  // Handle predefined filter buttons
  const handleTodayFilter = () => {
    const today = dayjs().startOf('day');
    setStartDate(today);
    setEndDate(today);
    setCalendarAnchorEl(null);
  };

  const handleThisWeekFilter = () => {
    const today = dayjs().startOf('day');
    const startOfWeek = today.startOf('week'); // Monday
    const endOfWeek = today.endOf('week'); // Sunday
    setStartDate(startOfWeek);
    setEndDate(endOfWeek);
    setCalendarAnchorEl(null);
  };

  const handleThisMonthFilter = () => {
    const today = dayjs().startOf('day');
    const startOfMonth = today.startOf('month');
    const endOfMonth = today.endOf('month');
    setStartDate(startOfMonth);
    setEndDate(endOfMonth);
    setCalendarAnchorEl(null);
  };

  // Determine which predefined filter is active
  const getActiveFilter = () => {
    if (!startDate || !endDate) return null;

    const today = dayjs().startOf('day');
    const startDay = dayjs(startDate).startOf('day');
    const endDay = dayjs(endDate).startOf('day');

    // Format dates as strings for comparison
    const startStr = startDay.format('YYYY-MM-DD');
    const endStr = endDay.format('YYYY-MM-DD');
    const todayStr = today.format('YYYY-MM-DD');

    // Check if it's "Today" filter
    if (startStr === todayStr && endStr === todayStr) {
      return 'today';
    }

    // Check if it's "This Week" filter
    const startOfWeek = today.startOf('week');
    const endOfWeek = today.endOf('week');
    const startOfWeekStr = startOfWeek.format('YYYY-MM-DD');
    const endOfWeekStr = endOfWeek.format('YYYY-MM-DD');
    if (startStr === startOfWeekStr && endStr === endOfWeekStr) {
      return 'thisWeek';
    }

    // Check if it's "This Month" filter
    const startOfMonth = today.startOf('month');
    const endOfMonth = today.endOf('month');
    const startOfMonthStr = startOfMonth.format('YYYY-MM-DD');
    const endOfMonthStr = endOfMonth.format('YYYY-MM-DD');
    if (startStr === startOfMonthStr && endStr === endOfMonthStr) {
      return 'thisMonth';
    }

    return null;
  };

  // Fetch timezone on mount
  useEffect(() => {
    if (getToken()) {
      fetchUserTimezone();
    } else {
      // If not logged in, use browser timezone
      const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      setUserTimezone(browserTimezone);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    // Prevent duplicate calls in React StrictMode
    if (hasFetchedRef.current) {
      return;
    }
    hasFetchedRef.current = true;
    fetchBookings();
  }, []);

  // Re-apply filter when timezone changes
  useEffect(() => {
    if (userTimezone && startDate && Object.keys(allBookingsRef.current).length > 0) {
      applyDateFilter(allBookingsRef.current, startDate, endDate);
    }
  }, [userTimezone]);

  // Fetch reschedule slots when date or session type changes (only for future dates)
  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    const fetchSlots = async () => {
      if (!rescheduleSessionTypeId || !rescheduleSelectedDate || !userTimezone) {
        return;
      }

      // Don't fetch slots for past dates
      const isPastDate = rescheduleSelectedDate.isBefore(dayjs(), 'day');
      if (isPastDate) {
        if (isMounted) {
          setRescheduleAvailableSlots([]);
          setRescheduleSlotError(null);
        }
        return;
      }

      try {
        if (isMounted) {
          setRescheduleLoadingSlots(true);
          setRescheduleSlotError(null);
        }

        const dateString = formatDateForAPI(rescheduleSelectedDate);
        const timezone = userTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

        // Check cache first
        const cachedData = getCachedSlots(rescheduleSessionTypeId, dateString, timezone);
        if (cachedData) {
          if (!isMounted) return;
          if (cachedData.slots && Array.isArray(cachedData.slots)) {
            setRescheduleAvailableSlots(cachedData.slots);
          } else {
            setRescheduleAvailableSlots([]);
          }
          if (isMounted) {
            setRescheduleLoadingSlots(false);
          }
          return;
        }

        const response = await apiClient.get('/api/v1/public/booking/available/slot', {
          params: {
            sessionTypeId: rescheduleSessionTypeId,
            suggestedDate: dateString,
            timezoneId: userTimezone?.id,
          },
          signal: controller.signal,
          timeout: 10000,
        });

        if (!isMounted) return;

        if (response.data && response.data.slots && Array.isArray(response.data.slots)) {
          setRescheduleAvailableSlots(response.data.slots);
          // Cache the response data
          setCachedSlots(rescheduleSessionTypeId, dateString, timezone, response.data);
        } else {
          setRescheduleAvailableSlots([]);
          // Cache empty result too
          setCachedSlots(rescheduleSessionTypeId, dateString, timezone, { slots: [] });
        }
      } catch (err) {
        // Don't set error if request was aborted
        if (err.name === 'AbortError' || err.name === 'CanceledError' || err.code === 'ERR_CANCELED') {
          return;
        }

        console.error('Error fetching available slots for reschedule:', err);
        if (!isMounted) return;

        let errorMessage = t('admin.bookingsManagement.failedToLoadSlots');

        if (err.code === 'ECONNABORTED') {
          errorMessage = t('admin.bookingsManagement.requestTimeout');
        } else if (err.response) {
          errorMessage = err.response.data?.message || `Server error: ${err.response.status}`;
        } else if (err.request) {
          errorMessage = t('admin.bookingsManagement.unableToReachServer');
        } else {
          errorMessage = err.message || errorMessage;
        }

        setRescheduleSlotError(errorMessage);
        setRescheduleAvailableSlots([]);
      } finally {
        if (isMounted) {
          setRescheduleLoadingSlots(false);
        }
      }
    };

    fetchSlots();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [rescheduleSessionTypeId, rescheduleSelectedDate, userTimezone]);

  // Effect to handle scroll indicator initial state when slots are loaded
  useEffect(() => {
    if (rescheduleAvailableSlots.length > 0) {
      // Small timeout to allow render
      setTimeout(() => {
        if (rescheduleSlotsScrollRef.current) {
          const element = rescheduleSlotsScrollRef.current;
          const isScrollable = element.scrollHeight > element.clientHeight;
          setShowRescheduleScrollBottom(isScrollable);
        }
      }, 100);
    }
  }, [rescheduleAvailableSlots, showCustomTimePicker]);


  // Format date and time in admin's timezone
  const formatDateTime = (instantString) => {
    if (!instantString) return 'N/A';
    const locale = i18n.language === 'ru' ? 'ru' : 'en-gb';
    try {
      let localTime;
      if (userTimezone) {
        // Convert UTC time to admin's timezone using offset
        // userTimezone is an offset string (e.g. "+03:00" or object with gmtOffset), so we use utcOffset
        const offset = typeof userTimezone === 'object' ? (userTimezone.gmtOffset === 'Z' ? '+00:00' : userTimezone.gmtOffset) : userTimezone;
        localTime = dayjs.utc(instantString).utcOffset(offset);
      } else {
        // Fallback to browser timezone if admin timezone not loaded yet
        localTime = dayjs(instantString);
      }
      if (locale === 'ru') {
        const day = localTime.format('D');
        const monthGenitive = monthsGenitive[localTime.month()];
        const year = localTime.format('YYYY');
        const time = localTime.format('HH:mm');
        return `${day} ${monthGenitive}, ${year} ${time}`;
      }
      return localTime.locale(locale).format('MMM DD, YYYY HH:mm');
    } catch {
      return instantString;
    }
  };

  // Get client display name
  const getClientName = (booking) => {
    const firstName = booking.clientFirstName || '';
    const lastName = booking.clientLastName || '';
    const name = `${firstName} ${lastName}`.trim();
    return name || booking.clientEmail || 'Unknown';
  };

  // Get human-readable status label
  const getStatusLabel = (status) => {
    if (!status) return '';
    // Use the status translation from pages.booking.status
    return t(`pages.booking.status.${status}`, { defaultValue: status.replace(/_/g, ' ') });
  };

  // Handle update dialog open
  const handleUpdateClick = (booking) => {
    setSelectedBooking(booking);
    setNewStatus('');
    setUpdateError(null);
    setUpdateDialogOpen(true);
  };

  // Handle update dialog close
  const handleUpdateClose = () => {
    setUpdateDialogOpen(false);
    setSelectedBooking(null);
    setNewStatus('');
    setUpdateError(null);
  };

  // Handle info dialog open
  const handleInfoClick = (booking) => {
    setSelectedBookingInfo(booking);
    setInfoDialogOpen(true);
  };

  // Handle info dialog close
  const handleInfoClose = () => {
    setInfoDialogOpen(false);
    setSelectedBookingInfo(null);
  };

  // Format date to YYYY-MM-DD for API
  const formatDateForAPI = (date) => {
    return dayjs(date).format('YYYY-MM-DD');
  };

  // Format time from instant in admin's timezone
  const formatTimeFromInstant = (instantString) => {
    if (!instantString) return 'N/A';
    try {
      if (userTimezone) {
        // Convert UTC time to admin's timezone using offset
        const offset = typeof userTimezone === 'object' ? (userTimezone.gmtOffset === 'Z' ? '+00:00' : userTimezone.gmtOffset) : userTimezone;
        return dayjs.utc(instantString).utcOffset(offset).format('HH:mm');
      } else {
        // Fallback to browser timezone if admin timezone not loaded yet
        return dayjs(instantString).format('HH:mm');
      }
    } catch {
      return instantString;
    }
  };

  // Format time from LocalTime string
  const formatTime = (timeString) => {
    if (!timeString) return 'N/A';
    try {
      const time = timeString.includes(':') ? timeString.split(':').slice(0, 2).join(':') : timeString;
      return dayjs(time, 'HH:mm').format('HH:mm');
    } catch {
      return timeString;
    }
  };

  // Format date for display
  const formatDateForDisplay = (date) => {
    return dayjs(date).format('MMMM D, YYYY');
  };

  // Handle reschedule button click
  const handleRescheduleClick = async (booking) => {
    setBookingToReschedule(booking);
    setRescheduleSelectedDate(dayjs());
    setRescheduleAvailableSlots([]);
    setRescheduleSlotError(null);
    setRescheduleSelectedSlot(null);
    setRescheduleClientMessage(booking.clientMessage || '');
    setRescheduleBookingError(null);
    setRescheduleSessionTypeId(null);
    setRescheduleDialogOpen(true);

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
          setRescheduleSessionTypeId(sessionTypeId);
          // Fetch slots for the matched session type
          fetchRescheduleSlots(dayjs(), sessionTypeId);
        } else {
          setRescheduleSlotError(t('admin.bookingsManagement.sessionTypeNotAvailable', { sessionName: booking.sessionName }));
        }
      } else {
        setRescheduleSlotError(t('admin.bookingsManagement.failedToLoadSessionTypes'));
      }
    } catch (err) {
      console.error('Error fetching session types for reschedule:', err);
      setRescheduleSlotError(t('admin.bookingsManagement.failedToLoadSessionTypesRetry'));
    }
  };

  // Fetch available slots for reschedule
  const fetchRescheduleSlots = async (date, sessionTypeId) => {
    if (!sessionTypeId) {
      setRescheduleLoadingSlots(false);
      setRescheduleAvailableSlots([]);
      setRescheduleSlotError(t('admin.bookingsManagement.sessionTypeNotFound'));
      return;
    }

    try {
      setRescheduleLoadingSlots(true);
      setRescheduleSlotError(null);
      const dateString = formatDateForAPI(date);

      const timezone = userTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

      // Check cache first
      const cachedData = getCachedSlots(sessionTypeId, dateString, timezone);
      if (cachedData) {
        if (cachedData.slots && Array.isArray(cachedData.slots)) {
          setRescheduleAvailableSlots(cachedData.slots);
        } else {
          setRescheduleAvailableSlots([]);
        }
        setRescheduleLoadingSlots(false);
        return;
      }

      const response = await apiClient.get('/api/v1/public/booking/available/slot', {
        params: {
          sessionTypeId,
          suggestedDate: dateString,
          timezoneId: userTimezone?.id,
        },
        timeout: 10000,
      });

      if (response.data && response.data.slots && Array.isArray(response.data.slots)) {
        setRescheduleAvailableSlots(response.data.slots);
        // Cache the response data
        setCachedSlots(sessionTypeId, dateString, timezone, response.data);
      } else {
        setRescheduleAvailableSlots([]);
        // Cache empty result too
        setCachedSlots(sessionTypeId, dateString, timezone, { slots: [] });
      }
    } catch (err) {
      console.error('Error fetching available slots for reschedule:', err);
      let errorMessage = t('admin.bookingsManagement.failedToLoadSlots');

      if (err.code === 'ECONNABORTED') {
        errorMessage = t('admin.bookingsManagement.requestTimeout');
      } else if (err.response) {
        errorMessage = err.response.data?.message || `Server error: ${err.response.status}`;
      } else if (err.request) {
        errorMessage = t('admin.bookingsManagement.unableToReachServer');
      } else {
        errorMessage = err.message || errorMessage;
      }

      setRescheduleSlotError(errorMessage);
      setRescheduleAvailableSlots([]);
    } finally {
      setRescheduleLoadingSlots(false);
    }
  };

  // Handle reschedule date change
  const handleRescheduleDateChange = (newDate) => {
    setRescheduleSelectedDate(newDate);
    // Reset custom time selection when date changes
    if (showCustomTimePicker && customStartTime) {
      // Update the selected slot with new date and existing time
      const combinedDateTime = newDate
        .hour(customStartTime.hour())
        .minute(customStartTime.minute())
        .second(0)
        .millisecond(0);

      const customSlot = {
        startTimeInstant: combinedDateTime.toISOString(),
        startTime: `${String(customStartTime.hour()).padStart(2, '0')}:${String(customStartTime.minute()).padStart(2, '0')}`,
      };
      setRescheduleSelectedSlot(customSlot);
    } else {
      setRescheduleSelectedSlot(null);
    }

    // Clear slots for past dates immediately (useEffect will handle fetching for future dates)
    const isPastDate = newDate.isBefore(dayjs(), 'day');
    if (isPastDate) {
      setRescheduleAvailableSlots([]);
      setRescheduleSlotError(null);
    }
  };

  const handleConfirmRescheduleDialogClose = () => {
    if (reschedulingBooking) return;
    setConfirmRescheduleDialogOpen(false);
  };

  // Handle reschedule slot selection
  const handleRescheduleSlotClick = (slot) => {
    setRescheduleSelectedSlot(slot);
    setShowCustomTimePicker(false);
    setCustomStartTime(null);
    setConfirmRescheduleDialogOpen(true);
  };

  // Handle create new slot click
  const handleCreateNewSlotClick = () => {
    setShowCustomTimePicker(true);
    setRescheduleSelectedSlot(null);
    const defaultTime = dayjs().hour(9).minute(0); // Default to 9:00 AM
    setCustomStartTime(defaultTime);
    setHourInput('09');
    setMinuteInput('00');
  };

  // Handle custom time selection
  const handleCustomTimeChange = (newTime) => {
    setCustomStartTime(newTime);
    setHourInput(String(newTime.hour()).padStart(2, '0'));
    setMinuteInput(String(newTime.minute()).padStart(2, '0'));
    if (newTime && rescheduleSelectedDate) {
      // Combine date from calendar with custom time
      const combinedDateTime = rescheduleSelectedDate
        .hour(newTime.hour())
        .minute(newTime.minute())
        .second(0)
        .millisecond(0);

      // Create a slot-like object with the combined datetime
      const customSlot = {
        startTimeInstant: combinedDateTime.toISOString(),
        startTime: `${String(newTime.hour()).padStart(2, '0')}:${String(newTime.minute()).padStart(2, '0')}`,
      };
      setRescheduleSelectedSlot(customSlot);
    }
  };

  // Handle hour increment/decrement
  const handleHourChange = (increment) => {
    if (!customStartTime) return;
    const newHour = increment
      ? (customStartTime.hour() + 1) % 24
      : (customStartTime.hour() - 1 + 24) % 24;
    const newTime = customStartTime.hour(newHour);
    handleCustomTimeChange(newTime);
  };

  // Handle minute increment/decrement
  const handleMinuteChange = (increment) => {
    if (!customStartTime) return;
    const newMinute = increment
      ? (customStartTime.minute() + 5) % 60
      : (customStartTime.minute() - 5 + 60) % 60;
    const newTime = customStartTime.minute(newMinute);
    handleCustomTimeChange(newTime);
  };

  // Handle manual hour input change (while typing)
  const handleHourInputChange = (value) => {
    // Allow free typing - only update display
    const numericValue = value.replace(/\D/g, '').slice(0, 2);
    setHourInput(numericValue || '');
  };

  // Handle manual hour input blur (when done typing)
  const handleHourInputBlur = () => {
    if (!customStartTime) return;
    const hour = parseInt(hourInput, 10);
    if (isNaN(hour) || hour < 0) {
      const newTime = customStartTime.hour(0);
      handleCustomTimeChange(newTime);
    } else if (hour > 23) {
      const newTime = customStartTime.hour(23);
      handleCustomTimeChange(newTime);
    } else {
      const newTime = customStartTime.hour(hour);
      handleCustomTimeChange(newTime);
    }
  };

  // Handle manual minute input change (while typing)
  const handleMinuteInputChange = (value) => {
    // Allow free typing - only update display
    const numericValue = value.replace(/\D/g, '').slice(0, 2);
    setMinuteInput(numericValue || '');
  };

  // Handle manual minute input blur (when done typing)
  const handleMinuteInputBlur = () => {
    if (!customStartTime) return;
    const minute = parseInt(minuteInput, 10);
    if (isNaN(minute) || minute < 0) {
      const newTime = customStartTime.minute(0);
      handleCustomTimeChange(newTime);
    } else if (minute > 59) {
      const newTime = customStartTime.minute(59);
      handleCustomTimeChange(newTime);
    } else {
      const newTime = customStartTime.minute(minute);
      handleCustomTimeChange(newTime);
    }
  };

  // Handle "Now" button - set to current time
  const handleSetNow = () => {
    const now = dayjs();
    handleCustomTimeChange(now);
  };

  // Handle "Clear" button
  const handleClearTime = () => {
    setCustomStartTime(null);
    setRescheduleSelectedSlot(null);
  };

  // Handle reschedule dialog close
  const handleRescheduleDialogClose = () => {
    if (reschedulingBooking) return;
    setRescheduleDialogOpen(false);
    setBookingToReschedule(null);
    setRescheduleSelectedSlot(null);
    setRescheduleClientMessage('');
    setRescheduleBookingError(null);
    setRescheduleAvailableSlots([]);
    setRescheduleSlotError(null);
    setRescheduleSessionTypeId(null);
    setShowCustomTimePicker(false);
    setCustomStartTime(null);
    // Clear cache when reschedule dialog closes
    clearAllCache();
  };

  // Handle booking reschedule confirmation
  const handleConfirmReschedule = async () => {
    if (!bookingToReschedule || !bookingToReschedule.id) {
      setRescheduleBookingError(t('admin.bookingsManagement.bookingInfoMissing'));
      return;
    }

    // Check if we have a selected slot or custom time
    let startTimeInstant;
    if (rescheduleSelectedSlot && rescheduleSelectedSlot.startTimeInstant) {
      startTimeInstant = rescheduleSelectedSlot.startTimeInstant;
    } else if (customStartTime && rescheduleSelectedDate) {
      // Combine date from calendar with custom time
      const combinedDateTime = rescheduleSelectedDate
        .hour(customStartTime.hour())
        .minute(customStartTime.minute())
        .second(0)
        .millisecond(0);
      startTimeInstant = combinedDateTime.toISOString();
    } else {
      setRescheduleBookingError(t('admin.bookingsManagement.noSlotSelected'));
      return;
    }

    // Get userId from booking - try different possible field names
    const userId = bookingToReschedule.userId || bookingToReschedule.clientId || bookingToReschedule.user?.id;
    if (!userId) {
      setRescheduleBookingError(t('admin.bookingsManagement.userIDNotFound'));
      return;
    }

    setReschedulingBooking(true);
    setRescheduleBookingError(null);

    try {
      const payload = {
        id: bookingToReschedule.id,
        startTime: startTimeInstant,
        clientMessage: rescheduleClientMessage.trim() || undefined,
        userId: userId,
      };

      const response = await apiClient.put(`/api/v1/admin/session/booking/${bookingToReschedule.id}`, payload, {
        timeout: 10000,
      });

      if (!response || (response.status && response.status >= 400)) {
        throw new Error('Failed to update booking');
      }

      // Success - close dialog and refresh bookings
      handleRescheduleDialogClose();
      setSuccessMessage(t('admin.bookingsManagement.rescheduleSuccess'));
      // Invalidate cache for the date that was rescheduled to refresh slots
      const dateString = formatDateForAPI(rescheduleSelectedDate);
      const timezone = userTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
      if (rescheduleSessionTypeId) {
        invalidateCache(rescheduleSessionTypeId, dateString, timezone);
      }
      fetchBookings();
    } catch (err) {
      console.error('Error rescheduling booking:', err);
      let errorMessage = t('admin.bookingsManagement.failedToUpdateBooking');

      if (err.code === 'ECONNABORTED') {
        errorMessage = t('admin.bookingsManagement.requestTimeout');
      } else if (err.response) {
        errorMessage = err.response.data?.message || `Server error: ${err.response.status}`;
        // If reschedule failed (e.g., slot was already booked), invalidate cache to refresh
        const dateString = formatDateForAPI(rescheduleSelectedDate);
        const timezone = userTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
        if (rescheduleSessionTypeId) {
          invalidateCache(rescheduleSessionTypeId, dateString, timezone);
        }
      } else if (err.request) {
        errorMessage = t('admin.bookingsManagement.unableToReachServer');
      } else {
        errorMessage = err.message || errorMessage;
      }

      setRescheduleBookingError(errorMessage);
    } finally {
      setReschedulingBooking(false);
    }
  };

  // Handle status update
  const handleStatusUpdate = async () => {
    if (!selectedBooking || !newStatus) {
      setUpdateError(t('admin.dashboard.statusRequired'));
      return;
    }

    setUpdating(true);
    setUpdateError(null);

    try {
      const response = await fetchWithAuth('/api/v1/admin/session/booking/status', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: selectedBooking.id,
          status: newStatus,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || `Failed to update booking: ${response.status} ${response.statusText}`
        );
      }

      // Success - close dialog and refresh bookings
      handleUpdateClose();
      setSuccessMessage(t('admin.bookingsManagement.statusUpdatedTo', { status: getStatusLabel(newStatus) }));
      fetchBookings();
    } catch (err) {
      console.error('Error updating booking status:', err);
      setUpdateError(err.message || 'Failed to update booking status. Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  // Get valid transitions for current status
  const getValidTransitions = (currentStatus) => {
    return STATUS_TRANSITIONS[currentStatus] || [];
  };

  // Check if a CONFIRMED booking is overdue
  const isOverdue = (booking) => {
    if (booking.status !== 'CONFIRMED' || !booking.endTimeInstant) {
      return false;
    }
    const endTime = dayjs(booking.endTimeInstant);
    const now = dayjs();
    return endTime.isBefore(now);
  };

  // Check if a PENDING_APPROVAL booking is less than 24 hours away
  const isUrgent = (booking) => {
    if (booking.status !== 'PENDING_APPROVAL' || !booking.startTimeInstant) {
      return false;
    }
    try {
      const startTime = userTimezone
        ? dayjs.utc(booking.startTimeInstant).tz(userTimezone)
        : dayjs(booking.startTimeInstant);
      const now = userTimezone
        ? dayjs().tz(userTimezone)
        : dayjs();
      const hoursUntilStart = startTime.diff(now, 'hour', true);
      return hoursUntilStart > 0 && hoursUntilStart < 24;
    } catch {
      return false;
    }
  };

  // Check if a PENDING_APPROVAL booking is in the past
  const isPast = (booking) => {
    if (booking.status !== 'PENDING_APPROVAL' || !booking.startTimeInstant) {
      return false;
    }
    try {
      const startTime = userTimezone
        ? dayjs.utc(booking.startTimeInstant).tz(userTimezone)
        : dayjs(booking.startTimeInstant);
      const now = userTimezone
        ? dayjs().tz(userTimezone)
        : dayjs();
      return startTime.isBefore(now);
    } catch {
      return false;
    }
  };

  // Render booking card
  const renderBookingCard = (booking) => {
    const validTransitions = getValidTransitions(booking.status);
    const canUpdate = validTransitions.length > 0;
    const overdue = isOverdue(booking);
    const urgent = isUrgent(booking);
    const past = isPast(booking);

    return (
      <Card
        key={booking.id}
        sx={{
          mb: 2,
          bgcolor: (overdue || past) ? 'grey.300' : 'background.paper'
        }}
      >
        <CardContent>
          {/* First row: Status chips and Info button on left, Update button on right */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
              <Chip
                label={getStatusLabel(booking.status)}
                color={STATUS_COLORS[booking.status] || 'default'}
                size="small"
              />
              {overdue && (
                <Chip
                  label={t('pages.booking.overdue')}
                  color="default"
                  size="small"
                  sx={{ bgcolor: 'grey.500', color: 'white' }}
                />
              )}
              {past && (
                <Chip
                  label={t('pages.booking.overdue')}
                  color="default"
                  size="small"
                  sx={{ bgcolor: 'grey.500', color: 'white' }}
                />
              )}
              {urgent && (
                <Tooltip title={t('pages.booking.urgentTooltip')}>
                  <WarningIcon sx={{ color: 'error.main', fontSize: '1.5rem' }} />
                </Tooltip>
              )}
              <Button
                size="small"
                variant="outlined"
                startIcon={<InfoIcon />}
                onClick={() => handleInfoClick(booking)}
                sx={{ textTransform: 'none' }}
              >
                {t('common.info')}
              </Button>
            </Box>
            {canUpdate && (
              <Button
                size="small"
                variant="outlined"
                startIcon={<EditIcon />}
                onClick={() => handleUpdateClick(booking)}
                sx={{ textTransform: 'none' }}
              >
                {t('admin.bookingsManagement.update')}
              </Button>
            )}
          </Box>

          {/* Client name */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="h6">
              {getClientName(booking)}
            </Typography>
          </Box>

          <Divider sx={{ my: 2 }} />

          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">
                {t('admin.bookingsManagement.sessionType')}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {booking.sessionDurationMinutes && (
                  <Chip
                    label={`${booking.sessionDurationMinutes} min`}
                    size="small"
                    sx={{
                      height: 20,
                      fontSize: '0.65rem',
                      '& .MuiChip-label': { px: 0.75 }
                    }}
                  />
                )}
                <Typography variant="body1">
                  {booking.sessionName || 'N/A'}
                </Typography>
                {getBookingPriceDisplay(booking.sessionPrices) && (
                  <Chip
                    label={getBookingPriceDisplay(booking.sessionPrices)}
                    size="small"
                    color="primary"
                    variant="outlined"
                    sx={{
                      height: 20,
                      fontSize: '0.65rem',
                      '& .MuiChip-label': { px: 0.75 }
                    }}
                  />
                )}
              </Box>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    {t('admin.bookingsManagement.startTime')}
                  </Typography>
                  <Typography variant="body1">
                    {formatDateTime(booking.startTimeInstant)}
                  </Typography>
                </Box>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<AccessTimeIcon />}
                  onClick={() => handleRescheduleClick(booking)}
                  sx={{ textTransform: 'none', alignSelf: 'flex-end' }}
                >
                  {t('admin.bookingsManagement.update')}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    );
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h5" component="h2">
            {t('admin.bookingsManagement.title')}
          </Typography>
        </Box>

        {/* Date Range Filter */}
        <Paper sx={{ p: 2, mb: 3, bgcolor: 'background.paper' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            <FilterAltIcon color="action" />
            <Button
              variant={startDate && endDate && !getActiveFilter() ? 'contained' : 'outlined'}
              size="small"
              startIcon={<FilterAltIcon />}
              onClick={(e) => setCalendarAnchorEl(e.currentTarget)}
              sx={{ textTransform: 'none' }}
            >
              {t('admin.bookingsManagement.dateRange')}
            </Button>
            <Button
              variant={getActiveFilter() === 'today' ? 'contained' : 'outlined'}
              size="small"
              onClick={handleTodayFilter}
              sx={{ textTransform: 'none' }}
            >
              {t('admin.bookingsManagement.today')}
            </Button>
            <Button
              variant={getActiveFilter() === 'thisWeek' ? 'contained' : 'outlined'}
              size="small"
              onClick={handleThisWeekFilter}
              sx={{ textTransform: 'none' }}
            >
              {t('admin.bookingsManagement.thisWeek')}
            </Button>
            <Button
              variant={getActiveFilter() === 'thisMonth' ? 'contained' : 'outlined'}
              size="small"
              onClick={handleThisMonthFilter}
              sx={{ textTransform: 'none' }}
            >
              {t('admin.bookingsManagement.thisMonth')}
            </Button>
            {startDate && (
              <Typography variant="body2" color="text.secondary">
                {endDate && dayjs(startDate).format('YYYY-MM-DD') !== dayjs(endDate).format('YYYY-MM-DD') ? (
                  <>
                    {t('admin.bookingsManagement.fromTo', {
                      start: dayjs(startDate).format('MMM DD, YYYY'),
                      end: dayjs(endDate).format('MMM DD, YYYY')
                    })}
                  </>
                ) : (
                  <>{t('admin.bookingsManagement.date', { date: dayjs(startDate).format('MMM DD, YYYY') })}</>
                )}
              </Typography>
            )}
            {(startDate || endDate) && (
              <Button
                variant="outlined"
                size="small"
                startIcon={<ClearIcon />}
                onClick={handleClearFilter}
                sx={{ textTransform: 'none', ml: 'auto' }}
              >
                {t('admin.bookingsManagement.clearFilter')}
              </Button>
            )}
          </Box>

          {/* Calendar Popover */}
          <Popover
            open={Boolean(calendarAnchorEl)}
            anchorEl={calendarAnchorEl}
            onClose={() => setCalendarAnchorEl(null)}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'left',
            }}
            transformOrigin={{
              vertical: 'top',
              horizontal: 'left',
            }}
          >
            <Box sx={{ p: 1 }}>
              <DateCalendar
                value={endDate || startDate || null}
                onChange={handleDateSelect}
                shouldDisableDate={(date) => false}
                key={`${startDate?.format('YYYY-MM-DD') || ''}-${endDate?.format('YYYY-MM-DD') || ''}`}
                sx={{
                  '& .MuiPickersDay-root': {
                    position: 'relative',
                    '&.range-start': {
                      backgroundColor: 'primary.main',
                      color: 'primary.contrastText',
                      borderRadius: '50% 0 0 50%',
                      fontWeight: 'bold',
                      '&:hover': {
                        backgroundColor: 'primary.dark',
                      },
                    },
                    '&.range-end': {
                      backgroundColor: 'primary.main',
                      color: 'primary.contrastText',
                      borderRadius: '0 50% 50% 0',
                      fontWeight: 'bold',
                      '&:hover': {
                        backgroundColor: 'primary.dark',
                      },
                    },
                    '&.range-middle': {
                      backgroundColor: 'primary.light',
                      color: 'primary.contrastText',
                      borderRadius: 0,
                      '&:hover': {
                        backgroundColor: 'primary.main',
                      },
                    },
                    '&.range-single': {
                      backgroundColor: 'primary.main',
                      color: 'primary.contrastText',
                      borderRadius: '50%',
                      fontWeight: 'bold',
                      '&:hover': {
                        backgroundColor: 'primary.dark',
                      },
                    },
                  },
                }}
                slotProps={{
                  day: (ownerState) => {
                    const dayValue = dayjs(ownerState.day).startOf('day');
                    const dayStr = dayValue.format('YYYY-MM-DD');

                    let sx = {};
                    if (startDate && endDate) {
                      // Normalize dates to start of day and format as strings
                      const startDay = dayjs(startDate).startOf('day');
                      const endDay = dayjs(endDate).startOf('day');
                      const startStr = startDay.format('YYYY-MM-DD');
                      const endStr = endDay.format('YYYY-MM-DD');
                      const actualStart = startStr <= endStr ? startStr : endStr;
                      const actualEnd = startStr <= endStr ? endStr : startStr;

                      if (dayStr === actualStart && dayStr === actualEnd) {
                        // Single date selected (start and end are the same)
                        sx = {
                          backgroundColor: 'primary.main',
                          color: 'primary.contrastText',
                          borderRadius: '50%',
                          fontWeight: 'bold',
                          '&:hover': {
                            backgroundColor: 'primary.dark',
                          },
                        };
                      } else if (dayStr === actualStart) {
                        // Start of range
                        sx = {
                          backgroundColor: 'primary.main',
                          color: 'primary.contrastText',
                          borderRadius: '50% 0 0 50%',
                          fontWeight: 'bold',
                          '&:hover': {
                            backgroundColor: 'primary.dark',
                          },
                        };
                      } else if (dayStr === actualEnd) {
                        // End of range - ensure this is checked before middle dates
                        sx = {
                          backgroundColor: 'primary.main',
                          color: 'primary.contrastText',
                          borderRadius: '0 50% 50% 0',
                          fontWeight: 'bold',
                          '&:hover': {
                            backgroundColor: 'primary.dark',
                          },
                        };
                      } else if (dayStr > actualStart && dayStr < actualEnd) {
                        // Middle of range (between start and end, exclusive)
                        sx = {
                          backgroundColor: 'primary.light',
                          color: 'primary.contrastText',
                          borderRadius: 0,
                          '&:hover': {
                            backgroundColor: 'primary.main',
                          },
                        };
                      }
                    } else if (startDate) {
                      const startDay = dayjs(startDate).startOf('day');
                      const startStr = startDay.format('YYYY-MM-DD');
                      if (dayStr === startStr) {
                        // Only start date selected
                        sx = {
                          backgroundColor: 'primary.main',
                          color: 'primary.contrastText',
                          borderRadius: '50%',
                          fontWeight: 'bold',
                          '&:hover': {
                            backgroundColor: 'primary.dark',
                          },
                        };
                      }
                    }

                    return { sx };
                  },
                }}
              />
            </Box>
          </Popover>
        </Paper>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Grid container spacing={3}>
            {/* Pending Approval Section */}
            <Grid item xs={12} md={6}>
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    {bookings.PENDING_APPROVAL.length === 1
                      ? t('admin.bookingsManagement.pendingApprovalCount', { count: bookings.PENDING_APPROVAL.length })
                      : t('admin.bookingsManagement.pendingApprovalCountPlural', { count: bookings.PENDING_APPROVAL.length })}
                  </Typography>
                </Box>
                {bookings.PENDING_APPROVAL.length > 0 ? (
                  <Box>
                    {bookings.PENDING_APPROVAL.map((booking) => renderBookingCard(booking))}
                  </Box>
                ) : (
                  <Alert severity="info">{t('admin.bookingsManagement.noPendingApproval')}</Alert>
                )}
              </Box>
            </Grid>

            {/* Confirmed Section */}
            <Grid item xs={12} md={6}>
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    {bookings.CONFIRMED.length === 1
                      ? t('admin.bookingsManagement.confirmedCount', { count: bookings.CONFIRMED.length })
                      : t('admin.bookingsManagement.confirmedCountPlural', { count: bookings.CONFIRMED.length })}
                  </Typography>
                </Box>
                {bookings.CONFIRMED.length > 0 ? (
                  <Box>
                    {bookings.CONFIRMED.map((booking) => renderBookingCard(booking))}
                  </Box>
                ) : (
                  <Alert severity="info">{t('admin.bookingsManagement.noConfirmed')}</Alert>
                )}
              </Box>
            </Grid>
          </Grid>
        )}

        {/* Update Status Dialog */}
        <Dialog open={updateDialogOpen} onClose={handleUpdateClose} maxWidth="sm" fullWidth>
          <DialogTitle>{t('admin.bookingsManagement.updateBookingStatus')}</DialogTitle>
          <DialogContent>
            {updateError && (
              <Alert severity="error" sx={{ mb: 2 }} onClose={() => setUpdateError(null)}>
                {updateError}
              </Alert>
            )}

            {selectedBooking && (
              <Box>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {t('admin.bookingsManagement.client')} {getClientName(selectedBooking)}
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {t('admin.bookingsManagement.session')} {selectedBooking.sessionName}
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mb: 3 }}>
                  {t('admin.bookingsManagement.currentStatus')}{' '}
                  <Chip
                    label={getStatusLabel(selectedBooking.status)}
                    color={STATUS_COLORS[selectedBooking.status] || 'default'}
                    size="small"
                  />
                </Typography>

                <FormControl fullWidth required>
                  <InputLabel>{t('admin.bookingsManagement.newStatus')}</InputLabel>
                  <Select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    label={t('admin.bookingsManagement.newStatus')}
                    disabled={updating}
                  >
                    {getValidTransitions(selectedBooking.status).map((status) => (
                      <MenuItem key={status} value={status}>
                        {getStatusLabel(status)}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button
              onClick={handleUpdateClose}
              sx={{ textTransform: 'none' }}
              disabled={updating}
            >
              {t('admin.bookingsManagement.cancel')}
            </Button>
            <Button
              onClick={handleStatusUpdate}
              variant="contained"
              sx={{ textTransform: 'none' }}
              disabled={updating || !newStatus}
            >
              {updating ? (
                <>
                  <CircularProgress size={16} sx={{ mr: 1 }} />
                  {t('admin.bookingsManagement.updating')}
                </>
              ) : (
                t('admin.bookingsManagement.updateStatus')
              )}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Info Dialog */}
        <Dialog open={infoDialogOpen} onClose={handleInfoClose} maxWidth="md" fullWidth>
          <DialogTitle>{t('admin.bookingsManagement.bookingDetails')}</DialogTitle>
          <DialogContent>
            {selectedBookingInfo && (
              <Box>
                {/* Main Data - Duplicated */}
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    {t('admin.bookingsManagement.mainInformation')}
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" color="text.secondary">
                        {t('admin.bookingsManagement.status')}
                      </Typography>
                      <Box sx={{ mt: 0.5, mb: 1 }}>
                        <Chip
                          label={getStatusLabel(selectedBookingInfo.status)}
                          color={STATUS_COLORS[selectedBookingInfo.status] || 'default'}
                          size="small"
                        />
                        {isOverdue(selectedBookingInfo) && (
                          <Chip
                            label={t('pages.booking.overdue')}
                            color="default"
                            size="small"
                            sx={{ bgcolor: 'grey.500', color: 'white', ml: 1 }}
                          />
                        )}
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" color="text.secondary">
                        {t('admin.bookingsManagement.clientName')}
                      </Typography>
                      <Typography variant="body1" gutterBottom>
                        {getClientName(selectedBookingInfo)}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" color="text.secondary">
                        {t('admin.bookingsManagement.startTime')}
                      </Typography>
                      <Typography variant="body1" gutterBottom>
                        {formatDateTime(selectedBookingInfo.startTimeInstant)}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" color="text.secondary">
                        {t('admin.bookingsManagement.sessionType')}
                      </Typography>
                      <Typography variant="body1" gutterBottom>
                        {selectedBookingInfo.sessionName || 'N/A'}
                      </Typography>
                    </Grid>
                  </Grid>
                </Box>

                <Divider sx={{ my: 3 }} />

                {/* Additional Information */}
                <Box>
                  <Typography variant="h6" gutterBottom>
                    {t('admin.bookingsManagement.additionalInformation')}
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" color="text.secondary">
                        {t('admin.bookingsManagement.email')}
                      </Typography>
                      <Typography variant="body1" gutterBottom>
                        {selectedBookingInfo.clientEmail || 'N/A'}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" color="text.secondary">
                        {t('admin.bookingsManagement.endTime')}
                      </Typography>
                      <Typography variant="body1" gutterBottom>
                        {formatDateTime(selectedBookingInfo.endTimeInstant)}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" color="text.secondary">
                        {t('admin.bookingsManagement.createdAt')}
                      </Typography>
                      <Typography variant="body1" gutterBottom>
                        {formatDateTime(selectedBookingInfo.createdAt)}
                      </Typography>
                    </Grid>
                    {selectedBookingInfo.sessionDurationMinutes && (
                      <Grid item xs={12} sm={6}>
                        <Typography variant="body2" color="text.secondary">
                          {t('admin.bookingsManagement.duration')}
                        </Typography>
                        <Typography variant="body1" gutterBottom>
                          {selectedBookingInfo.sessionDurationMinutes} {t('admin.bookingsManagement.minutes')}
                        </Typography>
                      </Grid>
                    )}
                    {selectedBookingInfo.sessionPrices && Object.keys(selectedBookingInfo.sessionPrices).length > 0 && (
                      <Grid item xs={12}>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          {t('admin.bookingsManagement.prices')}
                        </Typography>
                        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                          {Object.entries(selectedBookingInfo.sessionPrices).map(([currency, price]) => {
                            const symbol = getCurrencySymbol(currency);
                            return (
                              <Chip
                                key={currency}
                                label={`${currency}: ${price}${symbol}`}
                                size="small"
                              />
                            );
                          })}
                        </Stack>
                      </Grid>
                    )}
                    <Grid item xs={12}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        {t('admin.bookingsManagement.clientMessage')}
                      </Typography>
                      {selectedBookingInfo.clientMessage ? (
                        <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', bgcolor: 'grey.50', p: 2, borderRadius: 1 }}>
                          {selectedBookingInfo.clientMessage}
                        </Typography>
                      ) : (
                        <Typography variant="body2" color="text.secondary" fontStyle="italic" sx={{ bgcolor: 'grey.50', p: 2, borderRadius: 1 }}>
                          {t('admin.bookingsManagement.noMessageProvided')}
                        </Typography>
                      )}
                    </Grid>
                  </Grid>
                </Box>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleInfoClose} sx={{ textTransform: 'none' }}>
              {t('common.close')}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Reschedule/Update Booking Dialog */}
        <Dialog open={rescheduleDialogOpen} onClose={handleRescheduleDialogClose} maxWidth="md" fullWidth>
          <DialogTitle>{t('admin.bookingsManagement.updateSessionDateTime')}</DialogTitle>
          <DialogContent sx={{ pb: 1, minHeight: '555px' }}>
            {bookingToReschedule && (
              <>
                <DialogContentText sx={{ mb: 2 }}>
                  {bookingToReschedule.sessionName
                    ? t('admin.bookingsManagement.selectNewDateTime', {
                      sessionName: bookingToReschedule.sessionName.replace(/<[^>]*>?/gm, '')
                    })
                    : t('admin.bookingsManagement.selectNewDateTimeFallback')}
                </DialogContentText>

                {/* Current and New Time Display */}
                <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        {t('admin.bookingsManagement.currentDateTime')}
                      </Typography>
                      <Typography variant="body1" fontWeight="medium">
                        {formatDateTime(bookingToReschedule.startTimeInstant)}
                      </Typography>
                    </Grid>
                    {rescheduleSelectedSlot && (
                      <Grid item xs={12} sm={6}>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          {t('admin.bookingsManagement.newDateTime')}
                        </Typography>
                        <Typography variant="body1" fontWeight="medium" color="primary.main">
                          {formatDateTime(rescheduleSelectedSlot.startTimeInstant)}
                        </Typography>
                      </Grid>
                    )}
                  </Grid>

                </Box>

                {rescheduleBookingError && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {rescheduleBookingError}
                  </Alert>
                )}

                {/* Warning for past date selection */}
                {rescheduleSelectedDate && rescheduleSelectedDate.isBefore(dayjs(), 'day') && (
                  <Alert severity="warning" sx={{ mb: 2 }}>
                    {t('admin.bookingsManagement.pastDateWarning')}
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
                        value={rescheduleSelectedDate}
                        onChange={handleRescheduleDateChange}
                        sx={{ width: '100%' }}
                        firstDayOfWeek={1}
                      />
                    </Box>
                  </Grid>

                  {/* Right Column - Available Slots */}
                  <Grid item xs={12} md={6}>
                    <Typography variant="h6" gutterBottom>
                      {t('admin.bookingsManagement.availableTimes')} {formatDateForDisplay(rescheduleSelectedDate)}
                    </Typography>

                    {rescheduleSlotError && (
                      <Alert severity="error" sx={{ mb: 2 }}>
                        {rescheduleSlotError}
                      </Alert>
                    )}

                    {rescheduleLoadingSlots ? (
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
                    ) : rescheduleAvailableSlots.length > 0 ? (
                      <Box sx={{ position: 'relative' }}>
                        <Box
                          ref={rescheduleSlotsScrollRef}
                          sx={{ maxHeight: '260px', overflowY: 'auto', pr: 1 }}
                          onScroll={(e) => {
                            const element = e.target;
                            const isAtTop = element.scrollTop === 0;
                            const isAtBottom = Math.abs(element.scrollHeight - element.scrollTop - element.clientHeight) < 1;

                            setShowRescheduleScrollTop(!isAtTop);
                            setShowRescheduleScrollBottom(!isAtBottom && rescheduleAvailableSlots.length > 4);
                          }}
                        >
                          <List>
                            {rescheduleAvailableSlots.map((slot, index) => {
                              const startTime = slot.startTime
                                ? formatTime(slot.startTime)
                                : (slot.startTimeInstant ? formatTimeFromInstant(slot.startTimeInstant) : 'N/A');
                              const endTime = slot.endTime
                                ? formatTime(slot.endTime)
                                : 'N/A';
                              const isSelected = rescheduleSelectedSlot?.startTimeInstant === slot.startTimeInstant && !showCustomTimePicker;

                              return (
                                <ListItemButton
                                  key={slot.startTimeInstant || `slot-${index}`}
                                  onClick={() => handleRescheduleSlotClick(slot)}
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
                            {/* Create new slot option */}
                            <ListItemButton
                              onClick={handleCreateNewSlotClick}
                              selected={showCustomTimePicker}
                              sx={{
                                border: 1,
                                borderColor: showCustomTimePicker ? 'primary.main' : 'divider',
                                borderStyle: 'dashed',
                                borderRadius: 1,
                                mb: 1,
                                bgcolor: showCustomTimePicker ? 'action.selected' : 'transparent',
                                '&:hover': {
                                  bgcolor: 'action.hover',
                                },
                              }}
                            >
                              <Typography variant="body1" sx={{ fontStyle: 'italic' }}>
                                {t('admin.bookingsManagement.createNewSlot')}
                              </Typography>
                            </ListItemButton>
                            {/* Custom time picker */}
                            {showCustomTimePicker && (
                              <Box
                                sx={{
                                  mt: 1,
                                  p: 2,
                                  border: 2,
                                  borderColor: 'primary.main',
                                  borderRadius: 2,
                                  bgcolor: 'action.hover',
                                  boxShadow: 2
                                }}
                              >
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                  {t('admin.bookingsManagement.enterTime')}
                                </Typography>
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 2 }}>
                                  {/* Hours */}
                                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                    <IconButton
                                      size="small"
                                      onClick={() => handleHourChange(true)}
                                      sx={{ mb: 0.5 }}
                                    >
                                      <ArrowUpwardIcon fontSize="small" />
                                    </IconButton>
                                    <TextField
                                      value={hourInput}
                                      onChange={(e) => handleHourInputChange(e.target.value)}
                                      onFocus={(e) => e.target.select()}
                                      onBlur={handleHourInputBlur}
                                      inputProps={{
                                        style: {
                                          textAlign: 'center',
                                          fontSize: '2rem',
                                          fontWeight: 'bold',
                                          padding: '16px',
                                        },
                                        maxLength: 2,
                                      }}
                                      autoComplete="off"
                                      sx={{
                                        width: 80,
                                        '& .MuiOutlinedInput-root': {
                                          border: 1,
                                          borderColor: 'divider',
                                          borderRadius: 1,
                                          bgcolor: 'grey.100',
                                          '&:hover': {
                                            borderColor: 'primary.main',
                                          },
                                          '&.Mui-focused': {
                                            borderColor: 'primary.main',
                                            bgcolor: 'grey.100',
                                          },
                                          '& fieldset': {
                                            border: 'none',
                                          },
                                        },
                                      }}
                                    />
                                    <IconButton
                                      size="small"
                                      onClick={() => handleHourChange(false)}
                                      sx={{ mt: 0.5 }}
                                    >
                                      <ArrowDownwardIcon fontSize="small" />
                                    </IconButton>
                                  </Box>

                                  <Typography variant="h4" sx={{ mx: 1 }}>
                                    :
                                  </Typography>

                                  {/* Minutes */}
                                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                    <IconButton
                                      size="small"
                                      onClick={() => handleMinuteChange(true)}
                                      sx={{ mb: 0.5 }}
                                    >
                                      <ArrowUpwardIcon fontSize="small" />
                                    </IconButton>
                                    <TextField
                                      value={minuteInput}
                                      onChange={(e) => handleMinuteInputChange(e.target.value)}
                                      onFocus={(e) => e.target.select()}
                                      onBlur={handleMinuteInputBlur}
                                      inputProps={{
                                        style: {
                                          textAlign: 'center',
                                          fontSize: '2rem',
                                          fontWeight: 'bold',
                                          padding: '16px',
                                        },
                                        maxLength: 2,
                                      }}
                                      sx={{
                                        width: 80,
                                        '& .MuiOutlinedInput-root': {
                                          border: 1,
                                          borderColor: 'divider',
                                          borderRadius: 1,
                                          bgcolor: 'grey.100',
                                          '&:hover': {
                                            borderColor: 'primary.main',
                                          },
                                          '&.Mui-focused': {
                                            borderColor: 'primary.main',
                                            bgcolor: 'grey.100',
                                          },
                                          '& fieldset': {
                                            border: 'none',
                                          },
                                        },
                                      }}
                                    />
                                    <IconButton
                                      size="small"
                                      onClick={() => handleMinuteChange(false)}
                                      sx={{ mt: 0.5 }}
                                    >
                                      <ArrowDownwardIcon fontSize="small" />
                                    </IconButton>
                                  </Box>
                                </Box>

                                {/* Now and Clear buttons */}
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
                                  <Button
                                    size="small"
                                    onClick={handleSetNow}
                                    sx={{ color: 'primary.main', textTransform: 'none' }}
                                  >
                                    {t('admin.bookingsManagement.now')}
                                  </Button>
                                  <Button
                                    size="small"
                                    onClick={handleClearTime}
                                    sx={{ color: 'primary.main', textTransform: 'none' }}
                                  >
                                    {t('admin.bookingsManagement.clear')}
                                  </Button>
                                </Box>
                              </Box>
                            )}
                          </List>
                        </Box>
                        {/* Top scroll indicator */}
                        {showRescheduleScrollTop && (
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
                        {showRescheduleScrollBottom && (
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
                      <>
                        <Alert severity="info" sx={{ mb: 2 }}>
                          {t('admin.bookingsManagement.noAvailableSessions')}
                        </Alert>
                        {/* Create new slot option even when no slots available */}
                        <ListItemButton
                          onClick={handleCreateNewSlotClick}
                          selected={showCustomTimePicker}
                          sx={{
                            border: 1,
                            borderColor: showCustomTimePicker ? 'primary.main' : 'divider',
                            borderStyle: 'dashed',
                            borderRadius: 1,
                            bgcolor: showCustomTimePicker ? 'action.selected' : 'transparent',
                            '&:hover': {
                              bgcolor: 'action.hover',
                            },
                          }}
                        >
                          <Typography variant="body1" sx={{ fontStyle: 'italic' }}>
                            {t('admin.bookingsManagement.createNewSlot')}
                          </Typography>
                        </ListItemButton>
                        {/* Custom time picker */}
                        {showCustomTimePicker && (
                          <Box
                            sx={{
                              mt: 1,
                              p: 2,
                              border: 2,
                              borderColor: 'primary.main',
                              borderRadius: 2,
                              bgcolor: 'action.hover',
                              boxShadow: 2
                            }}
                          >
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                              {t('admin.bookingsManagement.enterTime')}
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 2 }}>
                              {/* Hours */}
                              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <IconButton
                                  size="small"
                                  onClick={() => handleHourChange(true)}
                                  sx={{ mb: 0.5 }}
                                >
                                  <ArrowUpwardIcon fontSize="small" />
                                </IconButton>
                                <TextField
                                  value={hourInput}
                                  onChange={(e) => handleHourInputChange(e.target.value)}
                                  onFocus={(e) => e.target.select()}
                                  onBlur={handleHourInputBlur}
                                  inputProps={{
                                    style: {
                                      textAlign: 'center',
                                      fontSize: '2rem',
                                      fontWeight: 'bold',
                                      padding: '16px',
                                    },
                                    maxLength: 2,
                                  }}
                                  autoComplete="off"
                                  sx={{
                                    width: 80,
                                    '& .MuiOutlinedInput-root': {
                                      border: 1,
                                      borderColor: 'divider',
                                      borderRadius: 1,
                                      bgcolor: 'grey.100',
                                      '&:hover': {
                                        borderColor: 'primary.main',
                                      },
                                      '&.Mui-focused': {
                                        borderColor: 'primary.main',
                                        bgcolor: 'grey.100',
                                      },
                                      '& fieldset': {
                                        border: 'none',
                                      },
                                    },
                                  }}
                                />
                                <IconButton
                                  size="small"
                                  onClick={() => handleHourChange(false)}
                                  sx={{ mt: 0.5 }}
                                >
                                  <ArrowDownwardIcon fontSize="small" />
                                </IconButton>
                              </Box>

                              <Typography variant="h4" sx={{ mx: 1 }}>
                                :
                              </Typography>

                              {/* Minutes */}
                              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <IconButton
                                  size="small"
                                  onClick={() => handleMinuteChange(true)}
                                  sx={{ mb: 0.5 }}
                                >
                                  <ArrowUpwardIcon fontSize="small" />
                                </IconButton>
                                <TextField
                                  value={minuteInput}
                                  onChange={(e) => handleMinuteInputChange(e.target.value)}
                                  onFocus={(e) => e.target.select()}
                                  onBlur={handleMinuteInputBlur}
                                  inputProps={{
                                    style: {
                                      textAlign: 'center',
                                      fontSize: '2rem',
                                      fontWeight: 'bold',
                                      padding: '16px',
                                    },
                                    maxLength: 2,
                                  }}
                                  sx={{
                                    width: 80,
                                    '& .MuiOutlinedInput-root': {
                                      border: 1,
                                      borderColor: 'divider',
                                      borderRadius: 1,
                                      bgcolor: 'grey.100',
                                      '&:hover': {
                                        borderColor: 'primary.main',
                                      },
                                      '&.Mui-focused': {
                                        borderColor: 'primary.main',
                                        bgcolor: 'grey.100',
                                      },
                                      '& fieldset': {
                                        border: 'none',
                                      },
                                    },
                                  }}
                                />
                                <IconButton
                                  size="small"
                                  onClick={() => handleMinuteChange(false)}
                                  sx={{ mt: 0.5 }}
                                >
                                  <ArrowDownwardIcon fontSize="small" />
                                </IconButton>
                              </Box>
                            </Box>

                            {/* Now and Clear buttons */}
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
                              <Button
                                size="small"
                                onClick={handleSetNow}
                                sx={{ color: 'primary.main', textTransform: 'none' }}
                              >
                                {t('admin.bookingsManagement.now')}
                              </Button>
                              <Button
                                size="small"
                                onClick={handleClearTime}
                                sx={{ color: 'primary.main', textTransform: 'none' }}
                              >
                                {t('admin.bookingsManagement.clear')}
                              </Button>
                            </Box>
                          </Box>
                        )}
                      </>
                    )}
                  </Grid>
                </Grid>

              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Confirm Reschedule Dialog */}
        <Dialog open={confirmRescheduleDialogOpen} onClose={handleConfirmRescheduleDialogClose} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ m: 0, p: 2, pr: 6 }}>
            {t('pages.booking.confirmUpdateTitle')}
            <IconButton
              aria-label="close"
              onClick={handleConfirmRescheduleDialogClose}
              disabled={reschedulingBooking}
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
            {(rescheduleSelectedSlot || (customStartTime && rescheduleSelectedDate)) && bookingToReschedule && (
              <Alert severity="info" sx={{ mb: 2 }}>
                Date/time will be updated from <strong>{formatDateTime(bookingToReschedule.startTimeInstant)}</strong> to <strong>
                  {rescheduleSelectedSlot
                    ? formatDateTime(rescheduleSelectedSlot.startTimeInstant)
                    : (customStartTime && rescheduleSelectedDate
                      ? formatDateTime(rescheduleSelectedDate.hour(customStartTime.hour()).minute(customStartTime.minute()).second(0).millisecond(0).toISOString())
                      : '')
                  }
                </strong>.
              </Alert>
            )}
            <DialogContentText sx={{ mb: 2 }}>
              {t('pages.booking.confirmUpdateMessage')}{' '}
              <strong>
                {rescheduleSelectedSlot && (rescheduleSelectedSlot.startTime
                  ? formatTime(rescheduleSelectedSlot.startTime)
                  : (rescheduleSelectedSlot.startTimeInstant ? formatTimeFromInstant(rescheduleSelectedSlot.startTimeInstant) : 'N/A'))}
              </strong>{' '}
              {rescheduleSelectedSlot && rescheduleSelectedSlot.endTime && (
                <>
                  - <strong>{formatTime(rescheduleSelectedSlot.endTime)}</strong>{' '}
                </>
              )}
              {t('pages.booking.on')} <strong>{formatDateForDisplay(rescheduleSelectedDate)}</strong>?
            </DialogContentText>

            <TextField
              fullWidth
              multiline
              rows={4}
              label={t('admin.bookingsManagement.messageOptional')}
              placeholder="Add any additional notes or questions..."
              value={rescheduleClientMessage}
              onChange={(e) => {
                const value = e.target.value;
                if (value.length <= 2000) {
                  setRescheduleClientMessage(value);
                }
              }}
              disabled={reschedulingBooking}
              error={rescheduleClientMessage.length > 2000}
              helperText={
                rescheduleClientMessage.length > 2000
                  ? t('admin.dashboard.messageMaxLength')
                  : `${rescheduleClientMessage.length}/2000 ${t('common.characters')}`
              }
              sx={{ mt: 1 }}
            />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button
              onClick={handleConfirmReschedule}
              color="primary"
              variant="contained"
              fullWidth
              disabled={reschedulingBooking || (!rescheduleSelectedSlot && !(customStartTime && rescheduleSelectedDate))}
              sx={{ py: 1 }}
            >
              {reschedulingBooking ? (
                <>
                  <CircularProgress size={16} sx={{ mr: 1 }} />
                  {t('admin.bookingsManagement.rescheduling')}
                </>
              ) : (
                t('admin.bookingsManagement.confirmReschedule')
              )}
            </Button>
          </DialogActions>
        </Dialog>

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
    </LocalizationProvider>
  );
};

export default BookingsManagement;
