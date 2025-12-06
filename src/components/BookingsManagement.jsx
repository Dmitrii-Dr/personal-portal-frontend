import React, { useState, useEffect, useRef } from 'react';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { fetchAdminGroupedBookings, fetchWithAuth, getToken, fetchUserSettings } from '../utils/api';
import apiClient from '../utils/api';

// Extend dayjs with timezone support
dayjs.extend(utc);
dayjs.extend(timezone);
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
} from '@mui/material';
import { DateCalendar } from '@mui/x-date-pickers/DateCalendar';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import EditIcon from '@mui/icons-material/Edit';
import InfoIcon from '@mui/icons-material/Info';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import ClearIcon from '@mui/icons-material/Clear';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';

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
        
        const response = await apiClient.get('/api/v1/public/booking/available/slot', {
          params: {
            sessionTypeId: rescheduleSessionTypeId,
            suggestedDate: dateString,
            timezone,
          },
          signal: controller.signal,
          timeout: 10000,
        });
        
        if (!isMounted) return;
        
        if (response.data && response.data.slots && Array.isArray(response.data.slots)) {
          setRescheduleAvailableSlots(response.data.slots);
        } else {
          setRescheduleAvailableSlots([]);
        }
      } catch (err) {
        // Don't set error if request was aborted
        if (err.name === 'AbortError' || err.name === 'CanceledError' || err.code === 'ERR_CANCELED') {
          return;
        }
        
        console.error('Error fetching available slots for reschedule:', err);
        if (!isMounted) return;
        
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

  // Format date and time
  const formatDateTime = (instantString) => {
    if (!instantString) return 'N/A';
    try {
      return dayjs(instantString).format('MMM DD, YYYY HH:mm');
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

  // Format time from instant
  const formatTimeFromInstant = (instantString) => {
    if (!instantString) return 'N/A';
    try {
      return dayjs(instantString).format('HH:mm');
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
          setRescheduleSlotError(`Session type "${booking.sessionName}" is no longer available for booking.`);
        }
      } else {
        setRescheduleSlotError('Failed to load session types.');
      }
    } catch (err) {
      console.error('Error fetching session types for reschedule:', err);
      setRescheduleSlotError('Failed to load session types. Please try again.');
    }
  };

  // Fetch available slots for reschedule
  const fetchRescheduleSlots = async (date, sessionTypeId) => {
    if (!sessionTypeId) {
      setRescheduleLoadingSlots(false);
      setRescheduleAvailableSlots([]);
      setRescheduleSlotError('Session type not found');
      return;
    }

    try {
      setRescheduleLoadingSlots(true);
      setRescheduleSlotError(null);
      const dateString = formatDateForAPI(date);
      
      const timezone = userTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
      
      const response = await apiClient.get('/api/v1/public/booking/available/slot', {
        params: {
          sessionTypeId,
          suggestedDate: dateString,
          timezone,
        },
        timeout: 10000,
      });
      
      if (response.data && response.data.slots && Array.isArray(response.data.slots)) {
        setRescheduleAvailableSlots(response.data.slots);
      } else {
        setRescheduleAvailableSlots([]);
      }
    } catch (err) {
      console.error('Error fetching available slots for reschedule:', err);
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

  // Handle reschedule slot selection
  const handleRescheduleSlotClick = (slot) => {
    setRescheduleSelectedSlot(slot);
    setShowCustomTimePicker(false);
    setCustomStartTime(null);
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
  };

  // Handle booking reschedule confirmation
  const handleConfirmReschedule = async () => {
    if (!bookingToReschedule || !bookingToReschedule.id) {
      setRescheduleBookingError('Booking information is missing');
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
      setRescheduleBookingError('Please select a time slot or create a custom time');
      return;
    }

    // Get userId from booking - try different possible field names
    const userId = bookingToReschedule.userId || bookingToReschedule.clientId || bookingToReschedule.user?.id;
    if (!userId) {
      setRescheduleBookingError('User ID not found in booking data');
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
      setSuccessMessage('Booking updated successfully');
      fetchBookings();
    } catch (err) {
      console.error('Error rescheduling booking:', err);
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
      
      setRescheduleBookingError(errorMessage);
    } finally {
      setReschedulingBooking(false);
    }
  };

  // Handle status update
  const handleStatusUpdate = async () => {
    if (!selectedBooking || !newStatus) {
      setUpdateError('Please select a new status');
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
      setSuccessMessage(`Booking status updated to ${newStatus}`);
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

  // Render booking card
  const renderBookingCard = (booking) => {
    const validTransitions = getValidTransitions(booking.status);
    const canUpdate = validTransitions.length > 0;
    const overdue = isOverdue(booking);

    return (
      <Card 
        key={booking.id} 
        sx={{ 
          mb: 2,
          bgcolor: overdue ? 'grey.300' : 'background.paper'
        }}
      >
        <CardContent>
          {/* First row: Status chips and Info button on left, Update button on right */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
            <Chip
              label={booking.status.replace(/_/g, ' ')}
              color={STATUS_COLORS[booking.status] || 'default'}
              size="small"
            />
            {overdue && (
              <Chip
                label="Overdue"
                color="default"
                size="small"
                sx={{ bgcolor: 'grey.500', color: 'white' }}
              />
            )}
            <Button
              size="small"
              variant="outlined"
                startIcon={<InfoIcon />}
                onClick={() => handleInfoClick(booking)}
              sx={{ textTransform: 'none' }}
            >
                Info
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
                Update
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
                Session Type
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
                Start Time
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
                  Update
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
            Bookings Management
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
              Date Range
            </Button>
            <Button
              variant={getActiveFilter() === 'today' ? 'contained' : 'outlined'}
              size="small"
              onClick={handleTodayFilter}
              sx={{ textTransform: 'none' }}
            >
              Today
            </Button>
            <Button
              variant={getActiveFilter() === 'thisWeek' ? 'contained' : 'outlined'}
              size="small"
              onClick={handleThisWeekFilter}
              sx={{ textTransform: 'none' }}
            >
              This Week
            </Button>
            <Button
              variant={getActiveFilter() === 'thisMonth' ? 'contained' : 'outlined'}
              size="small"
              onClick={handleThisMonthFilter}
              sx={{ textTransform: 'none' }}
            >
              This Month
            </Button>
            {startDate && (
              <Typography variant="body2" color="text.secondary">
                {endDate && dayjs(startDate).format('YYYY-MM-DD') !== dayjs(endDate).format('YYYY-MM-DD') ? (
                  <>
                    From: {dayjs(startDate).format('MMM DD, YYYY')} To: {dayjs(endDate).format('MMM DD, YYYY')}
                  </>
                ) : (
                  <>Date: {dayjs(startDate).format('MMM DD, YYYY')}</>
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
                Clear Filter
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
                  {bookings.PENDING_APPROVAL.length} booking{bookings.PENDING_APPROVAL.length !== 1 ? 's' : ''} wait for approval
                </Typography>
              </Box>
              {bookings.PENDING_APPROVAL.length > 0 ? (
                <Box>
                  {bookings.PENDING_APPROVAL.map((booking) => renderBookingCard(booking))}
                </Box>
              ) : (
                <Alert severity="info">No bookings pending approval.</Alert>
              )}
            </Box>
          </Grid>

          {/* Confirmed Section */}
          <Grid item xs={12} md={6}>
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  {bookings.CONFIRMED.length} booking{bookings.CONFIRMED.length !== 1 ? 's' : ''} were confirmed
                </Typography>
              </Box>
              {bookings.CONFIRMED.length > 0 ? (
                <Box>
                  {bookings.CONFIRMED.map((booking) => renderBookingCard(booking))}
                </Box>
              ) : (
                <Alert severity="info">No confirmed bookings.</Alert>
              )}
            </Box>
          </Grid>
        </Grid>
      )}

      {/* Update Status Dialog */}
      <Dialog open={updateDialogOpen} onClose={handleUpdateClose} maxWidth="sm" fullWidth>
        <DialogTitle>Update Booking Status</DialogTitle>
        <DialogContent>
          {updateError && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setUpdateError(null)}>
              {updateError}
            </Alert>
          )}

          {selectedBooking && (
            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Client: {getClientName(selectedBooking)}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Session: {selectedBooking.sessionName}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mb: 3 }}>
                Current Status:{' '}
                <Chip
                  label={selectedBooking.status.replace(/_/g, ' ')}
                  color={STATUS_COLORS[selectedBooking.status] || 'default'}
                  size="small"
                />
              </Typography>

              <FormControl fullWidth required>
                <InputLabel>New Status</InputLabel>
                <Select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  label="New Status"
                  disabled={updating}
                >
                  {getValidTransitions(selectedBooking.status).map((status) => (
                    <MenuItem key={status} value={status}>
                      {status.replace(/_/g, ' ')}
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
            Cancel
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
                Updating...
              </>
            ) : (
              'Update Status'
            )}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Info Dialog */}
      <Dialog open={infoDialogOpen} onClose={handleInfoClose} maxWidth="md" fullWidth>
        <DialogTitle>Booking Details</DialogTitle>
        <DialogContent>
          {selectedBookingInfo && (
            <Box>
              {/* Main Data - Duplicated */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Main Information
              </Typography>
                <Divider sx={{ mb: 2 }} />
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      Status
                    </Typography>
                    <Box sx={{ mt: 0.5, mb: 1 }}>
                      <Chip
                        label={selectedBookingInfo.status.replace(/_/g, ' ')}
                        color={STATUS_COLORS[selectedBookingInfo.status] || 'default'}
                        size="small"
                      />
                      {isOverdue(selectedBookingInfo) && (
                        <Chip
                          label="Overdue"
                          color="default"
                          size="small"
                          sx={{ bgcolor: 'grey.500', color: 'white', ml: 1 }}
                        />
                      )}
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      Client Name
                    </Typography>
                    <Typography variant="body1" gutterBottom>
                      {getClientName(selectedBookingInfo)}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      Start Time
                    </Typography>
                    <Typography variant="body1" gutterBottom>
                      {formatDateTime(selectedBookingInfo.startTimeInstant)}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      Session Type
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
                  Additional Information
              </Typography>
              <Divider sx={{ mb: 2 }} />
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      Email
                    </Typography>
                    <Typography variant="body1" gutterBottom>
                      {selectedBookingInfo.clientEmail || 'N/A'}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      End Time
                    </Typography>
                    <Typography variant="body1" gutterBottom>
                      {formatDateTime(selectedBookingInfo.endTimeInstant)}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      Created At
                    </Typography>
                    <Typography variant="body1" gutterBottom>
                      {formatDateTime(selectedBookingInfo.createdAt)}
                    </Typography>
                  </Grid>
                  {selectedBookingInfo.sessionDurationMinutes && (
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" color="text.secondary">
                        Duration
                      </Typography>
                      <Typography variant="body1" gutterBottom>
                        {selectedBookingInfo.sessionDurationMinutes} minutes
                      </Typography>
                    </Grid>
                  )}
                  {selectedBookingInfo.sessionPrices && Object.keys(selectedBookingInfo.sessionPrices).length > 0 && (
                    <Grid item xs={12}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Prices
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
                      Client Message
                    </Typography>
                    {selectedBookingInfo.clientMessage ? (
                      <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', bgcolor: 'grey.50', p: 2, borderRadius: 1 }}>
                        {selectedBookingInfo.clientMessage}
                </Typography>
              ) : (
                      <Typography variant="body2" color="text.secondary" fontStyle="italic" sx={{ bgcolor: 'grey.50', p: 2, borderRadius: 1 }}>
                  No message provided
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
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reschedule/Update Booking Dialog */}
      <Dialog open={rescheduleDialogOpen} onClose={handleRescheduleDialogClose} maxWidth="md" fullWidth>
        <DialogTitle>Update Session Date/Time</DialogTitle>
        <DialogContent>
          {bookingToReschedule && (
            <>
              <DialogContentText sx={{ mb: 2 }}>
                Select a new date and time for the <strong>{bookingToReschedule.sessionName || 'Session'}</strong> booking.
              </DialogContentText>

              {/* Current and New Time Display */}
              <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Current Date/Time
                    </Typography>
                    <Typography variant="body1" fontWeight="medium">
                      {formatDateTime(bookingToReschedule.startTimeInstant)}
                    </Typography>
                  </Grid>
                  {rescheduleSelectedSlot && (
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        New Date/Time
                      </Typography>
                      <Typography variant="body1" fontWeight="medium" color="primary.main">
                        {formatDateTime(rescheduleSelectedSlot.startTimeInstant)}
                      </Typography>
                    </Grid>
                  )}
                </Grid>
                {(rescheduleSelectedSlot || (customStartTime && rescheduleSelectedDate)) && (
                  <Alert severity="info" sx={{ mt: 2 }}>
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
              </Box>

              {rescheduleBookingError && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {rescheduleBookingError}
                </Alert>
              )}

              {/* Warning for past date selection */}
              {rescheduleSelectedDate && rescheduleSelectedDate.isBefore(dayjs(), 'day') && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  You are selecting a past date. Please ensure this is intentional.
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
                    Available Times on {formatDateForDisplay(rescheduleSelectedDate)}
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
                          + Create new slot
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
                            Enter time
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
                              Now
                            </Button>
                            <Button
                              size="small"
                              onClick={handleClearTime}
                              sx={{ color: 'primary.main', textTransform: 'none' }}
                            >
                              Clear
                            </Button>
                          </Box>
                        </Box>
                      )}
                    </List>
                  ) : (
                    <>
                      <Alert severity="info" sx={{ mb: 2 }}>
                        No available sessions on this day. Please select another day.
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
                          + Create new slot
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
                            Enter time
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
                              Now
                            </Button>
                            <Button
                              size="small"
                              onClick={handleClearTime}
                              sx={{ color: 'primary.main', textTransform: 'none' }}
                            >
                              Clear
                            </Button>
                          </Box>
                        </Box>
                      )}
                    </>
                  )}
                </Grid>
              </Grid>

              <TextField
                fullWidth
                multiline
                rows={4}
                label="Message (Optional)"
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
                    ? 'Message must be 2000 characters or less'
                    : `${rescheduleClientMessage.length}/2000 characters`
                }
                sx={{ mt: 3 }}
              />
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={handleRescheduleDialogClose} 
            color="inherit"
            disabled={reschedulingBooking}
            sx={{ textTransform: 'none' }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleConfirmReschedule} 
            color="primary" 
            variant="contained"
            disabled={reschedulingBooking || (!rescheduleSelectedSlot && !(customStartTime && rescheduleSelectedDate))}
            sx={{ textTransform: 'none' }}
          >
            {reschedulingBooking ? (
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

