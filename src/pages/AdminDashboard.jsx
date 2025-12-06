import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Alert,
  CircularProgress,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Grid,
  Chip,
  Stack,
  Divider,
  Tabs,
  Tab,
  Card,
  CardContent,
  Pagination,
  Paper,
  Popover,
  List,
  ListItemButton,
  Checkbox,
  FormControlLabel,
  IconButton,
} from '@mui/material';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import ClearIcon from '@mui/icons-material/Clear';
import AddIcon from '@mui/icons-material/Add';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import { DateCalendar } from '@mui/x-date-pickers/DateCalendar';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';

// Extend dayjs with timezone support
dayjs.extend(utc);
dayjs.extend(timezone);
import apiClient from '../utils/api';
import { fetchWithAuth, getToken, fetchUserSettings } from '../utils/api';
import CreateTagForm from '../components/CreateTagForm';
import BookingsManagement from '../components/BookingsManagement';

const PastSessions = () => {
  const [status, setStatus] = useState('COMPLETED');
  const [bookings, setBookings] = useState([]);
  const [allBookings, setAllBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [size] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [userTimezone, setUserTimezone] = useState(null);
  const [calendarAnchorEl, setCalendarAnchorEl] = useState(null);
  const requestIdRef = useRef(0);
  const mountedRef = useRef(true);
  const fetchingParamsRef = useRef(null);
  const fetchingPromiseRef = useRef(null);
  const allBookingsRef = useRef([]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Fetch user timezone from settings
  const fetchUserTimezone = async () => {
    try {
      const data = await fetchUserSettings();
      if (data && data.timezone) {
        setUserTimezone(data.timezone);
      } else {
        const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        setUserTimezone(browserTimezone);
      }
    } catch (err) {
      console.warn('Error fetching user timezone:', err);
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

  // Fetch timezone on mount
  useEffect(() => {
    if (getToken()) {
      fetchUserTimezone();
    } else {
      const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      setUserTimezone(browserTimezone);
    }
  }, []);

  // Apply date filter to bookings and pagination
  const applyDateFilter = (bookingsToFilter, start, end) => {
    let filtered = bookingsToFilter;

    // Apply date filter if dates are set and timezone is loaded
    if (start && userTimezone) {
      const startDateStr = dayjs(start).format('YYYY-MM-DD');
      const endDateStr = end ? dayjs(end).format('YYYY-MM-DD') : startDateStr;
      
      const actualStartStr = startDateStr <= endDateStr ? startDateStr : endDateStr;
      const actualEndStr = startDateStr <= endDateStr ? endDateStr : startDateStr;

      filtered = bookingsToFilter.filter((booking) => {
        if (!booking.startTimeInstant) {
          return false;
        }
        
        try {
          const bookingUtc = dayjs.utc(booking.startTimeInstant);
          const bookingInTimezone = bookingUtc.tz(userTimezone);
          const bookingDateStr = bookingInTimezone.format('YYYY-MM-DD');
          
          return bookingDateStr >= actualStartStr && bookingDateStr <= actualEndStr;
        } catch (error) {
          console.error('Error parsing booking date:', booking.startTimeInstant, error);
          return false;
        }
      });
    }

    // Apply pagination
    const totalFiltered = filtered.length;
    const startIndex = page * size;
    const endIndex = startIndex + size;
    const paginated = filtered.slice(startIndex, endIndex);

    setBookings(paginated);
    setTotalElements(totalFiltered);
    setTotalPages(Math.ceil(totalFiltered / size));
  };

  // Handle date selection from calendar
  const handleDateSelect = (date) => {
    if (!date) return;
    
    const selectedDay = dayjs(date).startOf('day');
    
    if (!startDate) {
      setStartDate(selectedDay);
      setEndDate(selectedDay);
      setPage(0); // Reset to first page
    } else {
      const startDay = dayjs(startDate).startOf('day');
      const isSingleDay = endDate && dayjs(startDate).isSame(endDate, 'day');
      
      if (selectedDay.isSame(startDay) && isSingleDay) {
        setStartDate(null);
        setEndDate(null);
        setPage(0); // Reset to first page
      } else if (selectedDay.isBefore(startDay)) {
        setEndDate(startDate);
        setStartDate(selectedDay);
        setPage(0); // Reset to first page
      } else {
        setEndDate(selectedDay);
        setPage(0); // Reset to first page
      }
    }
  };

  // Clear date filter
  const handleClearFilter = () => {
    setStartDate(null);
    setEndDate(null);
    setPage(0); // Reset to first page
    setCalendarAnchorEl(null);
  };

  // Handle predefined filter buttons
  const handleTodayFilter = () => {
    const today = dayjs().startOf('day');
    setStartDate(today);
    setEndDate(today);
    setPage(0); // Reset to first page
    setCalendarAnchorEl(null);
  };

  const handleThisWeekFilter = () => {
    const today = dayjs().startOf('day');
    const startOfWeek = today.startOf('week');
    const endOfWeek = today.endOf('week');
    setStartDate(startOfWeek);
    setEndDate(endOfWeek);
    setPage(0); // Reset to first page
    setCalendarAnchorEl(null);
  };

  const handleThisMonthFilter = () => {
    const today = dayjs().startOf('day');
    const startOfMonth = today.startOf('month');
    const endOfMonth = today.endOf('month');
    setStartDate(startOfMonth);
    setEndDate(endOfMonth);
    setPage(0); // Reset to first page
    setCalendarAnchorEl(null);
  };

  // Determine which predefined filter is active
  const getActiveFilter = () => {
    if (!startDate || !endDate) return null;
    
    const today = dayjs().startOf('day');
    const startDay = dayjs(startDate).startOf('day');
    const endDay = dayjs(endDate).startOf('day');
    
    const startStr = startDay.format('YYYY-MM-DD');
    const endStr = endDay.format('YYYY-MM-DD');
    const todayStr = today.format('YYYY-MM-DD');
    
    if (startStr === todayStr && endStr === todayStr) {
      return 'today';
    }
    
    const startOfWeek = today.startOf('week');
    const endOfWeek = today.endOf('week');
    const startOfWeekStr = startOfWeek.format('YYYY-MM-DD');
    const endOfWeekStr = endOfWeek.format('YYYY-MM-DD');
    if (startStr === startOfWeekStr && endStr === endOfWeekStr) {
      return 'thisWeek';
    }
    
    const startOfMonth = today.startOf('month');
    const endOfMonth = today.endOf('month');
    const startOfMonthStr = startOfMonth.format('YYYY-MM-DD');
    const endOfMonthStr = endOfMonth.format('YYYY-MM-DD');
    if (startStr === startOfMonthStr && endStr === endOfMonthStr) {
      return 'thisMonth';
    }
    
    return null;
  };

  // Apply filter when dates or page change
  useEffect(() => {
    const currentBookings = allBookingsRef.current;
    if (currentBookings.length > 0) {
      applyDateFilter(currentBookings, startDate, endDate);
    }
  }, [startDate, endDate, userTimezone, page, size]);

  useEffect(() => {
    const paramsKey = `${status}-${page}-${size}`;
    
    // Skip if we're already fetching the same parameters
    if (fetchingParamsRef.current === paramsKey && fetchingPromiseRef.current) {
      return;
    }
    
    // Mark these parameters as being fetched
    fetchingParamsRef.current = paramsKey;
    
    // Increment request ID for this fetch
    const currentRequestId = ++requestIdRef.current;
    
    const fetchPastSessions = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const response = await fetchWithAuth(
          `/api/v1/admin/session/booking/status/${status}?page=${page}&size=${size}`
        );

        if (!response.ok) {
          throw new Error(`Failed to load sessions: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        
        // Only update state if this is still the latest request and component is mounted
        if (currentRequestId !== requestIdRef.current || !mountedRef.current) {
          return;
        }
        
        // Handle paginated response
        let fetchedBookings = [];
        if (data.content && Array.isArray(data.content)) {
          fetchedBookings = data.content;
          setTotalPages(data.totalPages || 0);
          setTotalElements(data.totalElements || 0);
        } else if (Array.isArray(data)) {
          fetchedBookings = data;
          setTotalPages(1);
          setTotalElements(data.length);
        } else {
          fetchedBookings = [];
          setTotalPages(0);
          setTotalElements(0);
        }

        // Store all bookings and apply date filter and pagination
        setAllBookings(fetchedBookings);
        allBookingsRef.current = fetchedBookings;
        applyDateFilter(fetchedBookings, startDate, endDate);
      } catch (err) {
        // Only update state if this is still the latest request and component is mounted
        if (currentRequestId !== requestIdRef.current || !mountedRef.current) {
          return;
        }
        console.error('Error fetching past sessions:', err);
        setError(err.message || 'Failed to load past sessions. Please try again.');
        setBookings([]);
        setTotalPages(0);
        setTotalElements(0);
      } finally {
        // Only clear loading if this is still the latest request
        if (currentRequestId === requestIdRef.current && mountedRef.current) {
          setLoading(false);
        }
        // Clear fetching params and promise if this was the latest request
        if (currentRequestId === requestIdRef.current) {
          fetchingParamsRef.current = null;
          fetchingPromiseRef.current = null;
        }
      }
    };

    // Store the promise and execute fetch
    fetchingPromiseRef.current = fetchPastSessions();
    
    // Cleanup: don't clear refs here to prevent race condition with React StrictMode
    // The refs will be cleared in the finally block when the fetch completes
  }, [status, page, size]);

  const handleStatusChange = (e) => {
    setStatus(e.target.value);
    setPage(0); // Reset to first page when status changes
  };

  const handlePageChange = (event, value) => {
    setPage(value - 1); // MUI Pagination is 1-based, API is 0-based
  };

  const formatDateTime = (instantString) => {
    if (!instantString) return 'N/A';
    try {
      return dayjs(instantString).format('MMM DD, YYYY HH:mm');
    } catch {
      return instantString;
    }
  };

  const getClientName = (booking) => {
    const firstName = booking.clientFirstName || '';
    const lastName = booking.clientLastName || '';
    const name = `${firstName} ${lastName}`.trim();
    return name || booking.clientEmail || 'Unknown';
  };

  const STATUS_COLORS = {
    COMPLETED: 'success',
    DECLINED: 'error',
    CANCELLED: 'default',
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box>
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={status}
              onChange={handleStatusChange}
              label="Status"
            >
              <MenuItem value="COMPLETED">Completed</MenuItem>
              <MenuItem value="DECLINED">Declined</MenuItem>
              <MenuItem value="CANCELLED">Cancelled</MenuItem>
            </Select>
          </FormControl>
          {!loading && (
            <Typography variant="body2" color="text.secondary">
              Total: {totalElements} session{totalElements !== 1 ? 's' : ''}
            </Typography>
          )}
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
                      const startDay = dayjs(startDate).startOf('day');
                      const endDay = dayjs(endDate).startOf('day');
                      const startStr = startDay.format('YYYY-MM-DD');
                      const endStr = endDay.format('YYYY-MM-DD');
                      const actualStart = startStr <= endStr ? startStr : endStr;
                      const actualEnd = startStr <= endStr ? endStr : startStr;
                      
                      if (dayStr === actualStart && dayStr === actualEnd) {
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
      ) : bookings.length === 0 ? (
        <Alert severity="info">No {status.toLowerCase()} sessions found.</Alert>
      ) : (
        <>
          <Grid container spacing={2}>
            {bookings.map((booking) => (
              <Grid item xs={12} key={booking.id}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 2 }}>
                      <Chip
                        label={booking.status.replace(/_/g, ' ')}
                        color={STATUS_COLORS[booking.status] || 'default'}
                        size="small"
                      />
                    </Box>
                    
                    <Box sx={{ mb: 1 }}>
                      <Typography variant="h6">
                        {getClientName(booking)}
                      </Typography>
                    </Box>
                    
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        {booking.clientEmail}
                      </Typography>
                    </Box>

                    <Divider sx={{ my: 2 }} />

                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="body2" color="text.secondary">
                          Session Type
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
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
                        <Typography variant="body2" color="text.secondary">
                          Start Time
                        </Typography>
                        <Typography variant="body1" gutterBottom>
                          {formatDateTime(booking.startTimeInstant)}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="body2" color="text.secondary">
                          End Time
                        </Typography>
                        <Typography variant="body1" gutterBottom>
                          {formatDateTime(booking.endTimeInstant)}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="body2" color="text.secondary">
                          Created At
                        </Typography>
                        <Typography variant="body1" gutterBottom>
                          {formatDateTime(booking.createdAt)}
                        </Typography>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          {totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
              <Pagination
                count={totalPages}
                page={page + 1} // MUI Pagination is 1-based
                onChange={handlePageChange}
                color="primary"
                showFirstButton
                showLastButton
              />
            </Box>
          )}
        </>
      )}
    </Box>
    </LocalizationProvider>
  );
};

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);
  const [addPostOpen, setAddPostOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [articleData, setArticleData] = useState({
    title: '',
    slug: '',
    content: '',
    excerpt: '',
    status: 'DRAFT',
  });
  const [availableUsers, setAvailableUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [usersError, setUsersError] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [availableTags, setAvailableTags] = useState([]);
  const [loadingTags, setLoadingTags] = useState(false);
  const [selectedTagIds, setSelectedTagIds] = useState([]);
  const [showCreateTagForm, setShowCreateTagForm] = useState(false);
  
  // New Booking Dialog State
  const [newBookingOpen, setNewBookingOpen] = useState(false);
  const [bookingSessionTypes, setBookingSessionTypes] = useState([]);
  const [loadingSessionTypes, setLoadingSessionTypes] = useState(false);
  const [sessionTypesError, setSessionTypesError] = useState(null);
  const [selectedSessionTypeId, setSelectedSessionTypeId] = useState(null);
  const [bookingAvailableUsers, setBookingAvailableUsers] = useState([]);
  const [loadingBookingUsers, setLoadingBookingUsers] = useState(false);
  const [bookingUsersError, setBookingUsersError] = useState('');
  const [selectedClientId, setSelectedClientId] = useState('');
  const [bookingSelectedDate, setBookingSelectedDate] = useState(dayjs());
  const [bookingAvailableSlots, setBookingAvailableSlots] = useState([]);
  const [loadingBookingSlots, setLoadingBookingSlots] = useState(false);
  const [bookingSlotsError, setBookingSlotsError] = useState(null);
  const [selectedBookingSlot, setSelectedBookingSlot] = useState(null);
  const [bookingClientMessage, setBookingClientMessage] = useState('');
  const [submittingBooking, setSubmittingBooking] = useState(false);
  const [bookingError, setBookingError] = useState(null);
  const [userTimezone, setUserTimezone] = useState(null);
  const bookingsRefreshKeyRef = useRef(0);
  const [showCustomTimePicker, setShowCustomTimePicker] = useState(false);
  const [customStartTime, setCustomStartTime] = useState(null);
  const [hourInput, setHourInput] = useState('00');
  const [minuteInput, setMinuteInput] = useState('00');
  
  // Create New Client Dialog State
  const [createClientOpen, setCreateClientOpen] = useState(false);
  const [newClientData, setNewClientData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    sendEmailNotification: false,
  });
  const [creatingClient, setCreatingClient] = useState(false);
  const [createClientError, setCreateClientError] = useState(null);

  const handleAddPostOpen = () => {
    setAddPostOpen(true);
    setArticleData({
      title: '',
      slug: '',
      content: '',
      excerpt: '',
      status: 'DRAFT',
    });
    setSubmitError('');
    setSelectedUserIds([]);
    setSelectedTagIds([]);
    setShowCreateTagForm(false);
    // Preload users and tags for selection
    fetchUsers();
    fetchTags();
  };

  const handleAddPostClose = () => {
    setAddPostOpen(false);
    setArticleData({
      title: '',
      slug: '',
      content: '',
      excerpt: '',
      status: 'DRAFT',
    });
    setSubmitError('');
    setSelectedUserIds([]);
    setUsersError('');
    setSelectedTagIds([]);
    setShowCreateTagForm(false);
  };

  const handleFieldChange = (field) => (e) => {
    setArticleData((prev) => ({
      ...prev,
      [field]: e.target.value,
    }));
    setSubmitError('');
  };

  const fetchUsers = async () => {
    setLoadingUsers(true);
    setUsersError('');
    try {
      const response = await fetchWithAuth('/api/v1/admin/users');
      if (!response.ok) {
        throw new Error(`Failed to load users: ${response.status} ${response.statusText}`);
      }
      const users = await response.json();
      // Ensure array and normalize fields we need
      const list = Array.isArray(users) ? users : [];
      setAvailableUsers(list);
    } catch (err) {
      console.error('Error fetching users:', err);
      setUsersError(err.message || 'Failed to load users');
      setAvailableUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  };

  const userFullName = (user) => {
    const first = user.firstName || '';
    const last = user.lastName || '';
    const name = `${last} ${first}`.trim();
    return name || user.email || user.id;
  };

  const handleUsersChange = (e) => {
    const value = e.target.value || [];
    setSelectedUserIds(typeof value === 'string' ? value.split(',') : value);
  };

  const fetchTags = async () => {
    setLoadingTags(true);
    try {
      const response = await apiClient.get('/api/v1/admin/tags', {
        timeout: 10000,
      });
      const tags = Array.isArray(response.data) ? response.data : [];
      setAvailableTags(tags);
    } catch (err) {
      console.error('Error fetching tags:', err);
      setAvailableTags([]);
    } finally {
      setLoadingTags(false);
    }
  };

  const validateForm = () => {
    if (!articleData.title.trim()) {
      setSubmitError('Title is required');
      return false;
    }
    if (!articleData.slug.trim()) {
      setSubmitError('Slug is required');
      return false;
    }
    if (!articleData.content.trim()) {
      setSubmitError('Content is required');
      return false;
    }
    if (!articleData.status) {
      setSubmitError('Status is required');
      return false;
    }
    return true;
  };

  const handleSubmitPost = async () => {
    if (!validateForm()) {
      return;
    }

    setSubmitting(true);
    setSubmitError('');

    try {
      const allowedUserIds = articleData.status === 'PUBLISHED' ? [] : (Array.isArray(selectedUserIds) ? selectedUserIds : []);
      const response = await fetchWithAuth('/api/v1/admin/articles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: articleData.title.trim(),
          slug: articleData.slug.trim(),
          content: articleData.content.trim(),
          excerpt: articleData.excerpt.trim() || null,
          status: articleData.status,
          allowedUserIds: allowedUserIds,
          tagIds: Array.isArray(selectedTagIds) ? selectedTagIds : [],
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message ||
            `Failed to create article: ${response.status} ${response.statusText}`
        );
      }

      // Success - close dialog
      handleAddPostClose();
    } catch (err) {
      console.error('Error creating article:', err);
      setSubmitError(err.message || 'Failed to create article. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  // Fetch user timezone
  useEffect(() => {
    const fetchTimezone = async () => {
      try {
        const data = await fetchUserSettings();
        if (data && data.timezone) {
          setUserTimezone(data.timezone);
        } else {
          const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
          setUserTimezone(browserTimezone);
        }
      } catch (err) {
        console.warn('Error fetching user timezone:', err);
        const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        setUserTimezone(browserTimezone);
      }
    };
    if (getToken()) {
      fetchTimezone();
    } else {
      const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      setUserTimezone(browserTimezone);
    }
  }, []);

  // New Booking Dialog Handlers
  const handleNewBookingOpen = () => {
    setNewBookingOpen(true);
    setSelectedSessionTypeId(null);
    setSelectedClientId('');
    setBookingSelectedDate(dayjs());
    setBookingAvailableSlots([]);
    setSelectedBookingSlot(null);
    setBookingClientMessage('');
    setBookingError(null);
    setSessionTypesError(null);
    setBookingSlotsError(null);
    setBookingUsersError('');
    setShowCustomTimePicker(false);
    setCustomStartTime(null);
    fetchBookingSessionTypes();
    fetchBookingUsers();
  };

  const handleNewBookingClose = () => {
    if (submittingBooking) return;
    setNewBookingOpen(false);
    setSelectedSessionTypeId(null);
    setSelectedClientId('');
    setBookingSelectedDate(dayjs());
    setBookingAvailableSlots([]);
    setSelectedBookingSlot(null);
    setBookingClientMessage('');
    setBookingError(null);
    setShowCustomTimePicker(false);
    setCustomStartTime(null);
  };

  const fetchBookingSessionTypes = async () => {
    setLoadingSessionTypes(true);
    setSessionTypesError(null);
    try {
      const response = await apiClient.get('/api/v1/public/session/type', {
        timeout: 10000,
      });
      if (response.data && Array.isArray(response.data)) {
        setBookingSessionTypes(response.data);
      } else {
        setBookingSessionTypes([]);
      }
    } catch (err) {
      console.error('Error fetching session types:', err);
      setSessionTypesError(err.message || 'Failed to load session types');
      setBookingSessionTypes([]);
    } finally {
      setLoadingSessionTypes(false);
    }
  };

  const fetchBookingUsers = async () => {
    setLoadingBookingUsers(true);
    setBookingUsersError('');
    try {
      const response = await fetchWithAuth('/api/v1/admin/users');
      if (!response.ok) {
        throw new Error(`Failed to load users: ${response.status} ${response.statusText}`);
      }
      const users = await response.json();
      const list = Array.isArray(users) ? users : [];
      setBookingAvailableUsers(list);
    } catch (err) {
      console.error('Error fetching users:', err);
      setBookingUsersError(err.message || 'Failed to load users');
      setBookingAvailableUsers([]);
    } finally {
      setLoadingBookingUsers(false);
    }
  };

  const fetchBookingSlots = async (date, sessionTypeId) => {
    if (!sessionTypeId) {
      setBookingAvailableSlots([]);
      setBookingSlotsError(null);
      return;
    }

    setLoadingBookingSlots(true);
    setBookingSlotsError(null);
    try {
      const dateString = dayjs(date).format('YYYY-MM-DD');
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
        setBookingAvailableSlots(response.data.slots);
      } else {
        setBookingAvailableSlots([]);
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
      setBookingSlotsError(errorMessage);
      setBookingAvailableSlots([]);
    } finally {
      setLoadingBookingSlots(false);
    }
  };

  // Fetch slots when session type or date changes
  useEffect(() => {
    if (selectedSessionTypeId && bookingSelectedDate && userTimezone) {
      fetchBookingSlots(bookingSelectedDate, selectedSessionTypeId);
    }
  }, [selectedSessionTypeId, bookingSelectedDate, userTimezone]);

  const handleBookingDateChange = (newDate) => {
    setBookingSelectedDate(newDate);
    setSelectedBookingSlot(null);
    // Update custom slot if custom time is selected
    if (showCustomTimePicker && customStartTime) {
      const combinedDateTime = newDate
        .hour(customStartTime.hour())
        .minute(customStartTime.minute())
        .second(0)
        .millisecond(0);
      
      const customSlot = {
        startTimeInstant: combinedDateTime.toISOString(),
        startTime: `${String(customStartTime.hour()).padStart(2, '0')}:${String(customStartTime.minute()).padStart(2, '0')}`,
      };
      setSelectedBookingSlot(customSlot);
    }
  };

  const handleBookingSlotClick = (slot) => {
    // Check if selected date is today and slot is in the past
    const isToday = bookingSelectedDate.isSame(dayjs(), 'day');
    if (isToday && slot.startTimeInstant) {
      const slotTime = dayjs(slot.startTimeInstant);
      if (slotTime.isBefore(dayjs())) {
        setBookingError('Cannot select a time slot in the past for today');
        return;
      }
    }
    
    setBookingError(null);
    setSelectedBookingSlot(slot);
    setShowCustomTimePicker(false);
    setCustomStartTime(null);
  };

  // Handle create new slot click
  const handleCreateNewSlotClick = () => {
    setShowCustomTimePicker(true);
    setSelectedBookingSlot(null);
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
    if (newTime && bookingSelectedDate) {
      // Combine date from calendar with custom time
      const combinedDateTime = bookingSelectedDate
        .hour(newTime.hour())
        .minute(newTime.minute())
        .second(0)
        .millisecond(0);
      
      // Check if selected date is today and time is in the past
      const isToday = bookingSelectedDate.isSame(dayjs(), 'day');
      const isPastTime = isToday && combinedDateTime.isBefore(dayjs());
      
      if (isPastTime) {
        setBookingError('Cannot select a time in the past for today');
        // Still create the slot object but mark it as invalid
        const customSlot = {
          startTimeInstant: combinedDateTime.toISOString(),
          startTime: `${String(newTime.hour()).padStart(2, '0')}:${String(newTime.minute()).padStart(2, '0')}`,
        };
        setSelectedBookingSlot(customSlot);
        return;
      }
      
      setBookingError(null);
      
      // Create a slot-like object with the combined datetime
      const customSlot = {
        startTimeInstant: combinedDateTime.toISOString(),
        startTime: `${String(newTime.hour()).padStart(2, '0')}:${String(newTime.minute()).padStart(2, '0')}`,
      };
      setSelectedBookingSlot(customSlot);
    }
  };

  // Handle hour increment/decrement
  const handleHourChange = (increment) => {
    if (!customStartTime || !bookingSelectedDate) return;
    
    let newHour;
    if (increment) {
      newHour = (customStartTime.hour() + 1) % 24;
    } else {
      newHour = (customStartTime.hour() - 1 + 24) % 24;
    }
    
    const newTime = customStartTime.hour(newHour);
    handleCustomTimeChange(newTime);
  };

  // Handle minute increment/decrement
  const handleMinuteChange = (increment) => {
    if (!customStartTime || !bookingSelectedDate) return;
    
    let newMinute;
    if (increment) {
      newMinute = (customStartTime.minute() + 5) % 60;
    } else {
      newMinute = (customStartTime.minute() - 5 + 60) % 60;
    }
    
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
    if (!customStartTime || !bookingSelectedDate) return;
    const hour = parseInt(hourInput, 10);
    
    let finalHour;
    if (isNaN(hour) || hour < 0) {
      finalHour = 0;
    } else if (hour > 23) {
      finalHour = 23;
    } else {
      finalHour = hour;
    }
    
    const newTime = customStartTime.hour(finalHour);
    handleCustomTimeChange(newTime);
  };

  // Handle manual minute input change (while typing)
  const handleMinuteInputChange = (value) => {
    // Allow free typing - only update display
    const numericValue = value.replace(/\D/g, '').slice(0, 2);
    setMinuteInput(numericValue || '');
  };

  // Handle manual minute input blur (when done typing)
  const handleMinuteInputBlur = () => {
    if (!customStartTime || !bookingSelectedDate) return;
    const minute = parseInt(minuteInput, 10);
    
    let finalMinute;
    if (isNaN(minute) || minute < 0) {
      finalMinute = 0;
    } else if (minute > 59) {
      finalMinute = 59;
    } else {
      finalMinute = minute;
    }
    
    const newTime = customStartTime.minute(finalMinute);
    handleCustomTimeChange(newTime);
  };

  // Handle "Now" button - set to current time
  const handleSetNow = () => {
    const now = dayjs();
    handleCustomTimeChange(now);
  };

  // Handle "Clear" button
  const handleClearTime = () => {
    setCustomStartTime(null);
    setSelectedBookingSlot(null);
  };

  const formatTime = (timeString) => {
    if (!timeString) return 'N/A';
    try {
      // Handle LocalTime format (HH:mm:ss or HH:mm)
      const time = timeString.includes(':') ? timeString.split(':').slice(0, 2).join(':') : timeString;
      return dayjs(time, 'HH:mm').format('HH:mm');
    } catch {
      return timeString;
    }
  };

  const formatTimeFromInstant = (instantString) => {
    if (!instantString) return 'N/A';
    try {
      return dayjs(instantString).format('HH:mm');
    } catch {
      return instantString;
    }
  };

  const formatDateForDisplay = (date) => {
    return dayjs(date).format('MMMM D, YYYY');
  };

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

  const handleCreateClientOpen = () => {
    setCreateClientOpen(true);
    setNewClientData({
      email: '',
      firstName: '',
      lastName: '',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      sendEmailNotification: false,
    });
    setCreateClientError(null);
  };

  const handleCreateClientClose = () => {
    if (creatingClient) return;
    setCreateClientOpen(false);
    setNewClientData({
      email: '',
      firstName: '',
      lastName: '',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      sendEmailNotification: false,
    });
    setCreateClientError(null);
  };

  const handleCreateClientSubmit = async () => {
    // Validate form
    if (!newClientData.email.trim()) {
      setCreateClientError('Email is required');
      return;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newClientData.email.trim())) {
      setCreateClientError('Please enter a valid email address');
      return;
    }

    if (!newClientData.timezone || !newClientData.timezone.trim()) {
      setCreateClientError('Timezone is required');
      return;
    }

    if (newClientData.timezone.length > 50) {
      setCreateClientError('Timezone must be at most 50 characters');
      return;
    }

    if (newClientData.firstName && newClientData.firstName.length > 100) {
      setCreateClientError('First name must be at most 100 characters');
      return;
    }

    if (newClientData.lastName && newClientData.lastName.length > 100) {
      setCreateClientError('Last name must be at most 100 characters');
      return;
    }

    setCreatingClient(true);
    setCreateClientError(null);

    try {
      // Create user via admin API - CreateUserAdminRequest
      const payload = {
        email: newClientData.email.trim(),
        firstName: newClientData.firstName.trim() || undefined,
        lastName: newClientData.lastName.trim() || undefined,
        timezone: newClientData.timezone.trim(),
        sendEmailNotification: newClientData.sendEmailNotification || false,
      };

      const response = await fetchWithAuth('/api/v1/admin/user/registry', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || `Failed to create client: ${response.status} ${response.statusText}`
        );
      }

      // UserResponse: { id, email, firstName, lastName, createdAt, updatedAt }
      const createdUser = await response.json();
      
      // Refresh users list
      await fetchBookingUsers();
      
      // Select the newly created user
      if (createdUser && createdUser.id) {
        setSelectedClientId(createdUser.id);
      }

      // Close dialog
      handleCreateClientClose();
    } catch (err) {
      console.error('Error creating client:', err);
      setCreateClientError(err.message || 'Failed to create client. Please try again.');
    } finally {
      setCreatingClient(false);
    }
  };

  const handleSubmitBooking = async () => {
    if (!selectedSessionTypeId) {
      setBookingError('Please select a session type');
      return;
    }
    if (!selectedClientId) {
      setBookingError('Please select a client');
      return;
    }
    if (!selectedBookingSlot || !selectedBookingSlot.startTimeInstant) {
      setBookingError('Please select a time slot or create a custom time');
      return;
    }

    // Check if there's a past time error
    if (bookingError) {
      return; // Don't submit if there's an error
    }

    // Double-check if selected time is in the past (for today)
    const isToday = bookingSelectedDate.isSame(dayjs(), 'day');
    if (isToday && selectedBookingSlot.startTimeInstant) {
      const slotTime = dayjs(selectedBookingSlot.startTimeInstant);
      if (slotTime.isBefore(dayjs())) {
        setBookingError('Cannot select a time in the past for today');
        return;
      }
    }

    setSubmittingBooking(true);
    setBookingError(null);

    try {
      const payload = {
        sessionTypeId: selectedSessionTypeId,
        startTimeInstant: selectedBookingSlot.startTimeInstant,
        clientMessage: bookingClientMessage.trim() || undefined,
      };

      if (selectedClientId) {
        payload.userId = selectedClientId;
      }

      const response = await apiClient.post('/api/v1/admin/session/booking', payload, {
        timeout: 10000,
      });

      if (!response || (response.status && response.status >= 400)) {
        throw new Error('Failed to create booking');
      }

      // Refresh bookings by updating key to force BookingsManagement remount
      bookingsRefreshKeyRef.current += 1;

      // Success - close dialog
      handleNewBookingClose();
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

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h4" component="h1">
            Admin Dashboard
          </Typography>
        </Box>

        <Divider sx={{ my: 4 }} />

        {/* Sessions Tabs */}
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Tabs value={activeTab} onChange={handleTabChange}>
              <Tab label="Active Sessions" />
              <Tab label="Past Sessions" />
            </Tabs>
            {activeTab === 0 && (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleNewBookingOpen}
                sx={{ textTransform: 'none' }}
              >
                New Booking
              </Button>
            )}
          </Box>

          {activeTab === 0 && (
            <Box>
              <BookingsManagement key={bookingsRefreshKeyRef.current} />
            </Box>
          )}

          {activeTab === 1 && (
            <Box>
              <PastSessions />
            </Box>
          )}
        </Box>

      <Divider sx={{ my: 4 }} />

      {/* Add Post Dialog */}
      <Dialog open={addPostOpen} onClose={handleAddPostClose} maxWidth="md" fullWidth>
        <DialogTitle>Add New Article</DialogTitle>
        <DialogContent>
          {submitError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {submitError}
            </Alert>
          )}
          {articleData.status === 'PUBLISHED' && selectedUserIds.length > 0 && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              Selected users will be erased when submitting a published article.
            </Alert>
          )}
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                autoFocus
                fullWidth
                label="Title *"
                variant="outlined"
                value={articleData.title}
                onChange={handleFieldChange('title')}
                required
                disabled={submitting}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Slug *"
                variant="outlined"
                value={articleData.slug}
                onChange={handleFieldChange('slug')}
                required
                disabled={submitting}
                helperText="URL-friendly identifier (e.g., my-article-title)"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Content *"
                variant="outlined"
                multiline
                rows={8}
                value={articleData.content}
                onChange={handleFieldChange('content')}
                required
                disabled={submitting}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Excerpt"
                variant="outlined"
                multiline
                rows={3}
                value={articleData.excerpt}
                onChange={handleFieldChange('excerpt')}
                disabled={submitting}
                helperText="Optional short summary"
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth required>
                <InputLabel>Status *</InputLabel>
                <Select
                  value={articleData.status}
                  onChange={handleFieldChange('status')}
                  label="Status *"
                  disabled={submitting}
                >
                  <MenuItem value="DRAFT">Draft</MenuItem>
                  <MenuItem value="PUBLISHED">Published</MenuItem>
                  <MenuItem value="PRIVATE">Private</MenuItem>
                  <MenuItem value="ARCHIVED">Archived</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Users (visible to)</InputLabel>
                <Select
                  multiple
                  value={selectedUserIds}
                  onChange={handleUsersChange}
                  label="Users (visible to)"
                  disabled={submitting || articleData.status === 'PUBLISHED' || loadingUsers}
                  renderValue={(selected) => {
                    if (!selected || selected.length === 0) return '';
                    const names = selected
                      .map((id) => {
                        const u = availableUsers.find((au) => au.id === id);
                        return u ? userFullName(u) : id;
                      })
                      .join(', ');
                    return names;
                  }}
                >
                  {loadingUsers && (
                    <MenuItem disabled>
                      <CircularProgress size={16} sx={{ mr: 1 }} /> Loading users...
                    </MenuItem>
                  )}
                  {!loadingUsers &&
                    availableUsers.map((user) => (
                      <MenuItem key={user.id} value={user.id}>
                        {userFullName(user)}
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>
              {usersError && (
                <Alert severity="error" sx={{ mt: 1 }}>
                  {usersError}
                </Alert>
              )}
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Tags</InputLabel>
                <Select
                  multiple
                  value={selectedTagIds}
                  onChange={(e) => {
                    const value = e.target.value || [];
                    setSelectedTagIds(typeof value === 'string' ? value.split(',') : value);
                  }}
                  label="Tags"
                  disabled={submitting || loadingTags}
                  renderValue={(selected) => {
                    if (!selected || selected.length === 0) return '';
                    return selected
                      .map((id) => {
                        const tag = availableTags.find((t) => t.tagId === id);
                        return tag ? tag.name : id;
                      })
                      .join(', ');
                  }}
                >
                  {loadingTags && (
                    <MenuItem disabled>
                      <CircularProgress size={16} sx={{ mr: 1 }} /> Loading tags...
                    </MenuItem>
                  )}
                  {!loadingTags &&
                    availableTags.map((tag) => (
                      <MenuItem key={tag.tagId} value={tag.tagId}>
                        {tag.name}
                      </MenuItem>
                    ))}
                  <MenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowCreateTagForm(true);
                    }}
                    sx={{ fontStyle: 'italic', color: 'primary.main' }}
                  >
                    + Create new tag
                  </MenuItem>
                </Select>
              </FormControl>
              {showCreateTagForm && (
                <CreateTagForm
                  onTagCreated={(tagId) => {
                    setSelectedTagIds((prev) => [...prev, tagId]);
                    setShowCreateTagForm(false);
                  }}
                  onCancel={() => setShowCreateTagForm(false)}
                  availableTags={availableTags}
                  setAvailableTags={setAvailableTags}
                />
              )}
              {selectedTagIds.length > 0 && (
                <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap', gap: 1 }}>
                  {selectedTagIds.map((tagId) => {
                    const tag = availableTags.find((t) => t.tagId === tagId);
                    return tag ? (
                      <Chip
                        key={tagId}
                        label={tag.name}
                        size="small"
                        onDelete={() => {
                          setSelectedTagIds((prev) => prev.filter((id) => id !== tagId));
                        }}
                      />
                    ) : null;
                  })}
                </Stack>
              )}
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={handleAddPostClose}
            sx={{ textTransform: 'none' }}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmitPost}
            variant="contained"
            sx={{ textTransform: 'none' }}
            disabled={
              submitting ||
              !articleData.title.trim() ||
              !articleData.slug.trim() ||
              !articleData.content.trim()
            }
          >
            {submitting ? (
              <>
                <CircularProgress size={16} sx={{ mr: 1 }} />
                Creating...
              </>
            ) : (
              'Create Article'
            )}
          </Button>
        </DialogActions>
      </Dialog>

      {/* New Booking Dialog */}
      <Dialog open={newBookingOpen} onClose={handleNewBookingClose} maxWidth="md" fullWidth>
        <DialogTitle>Book a Session</DialogTitle>
        <DialogContent>
          {bookingError && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setBookingError(null)}>
              {bookingError}
            </Alert>
          )}

          <Grid container spacing={2} sx={{ mt: 1 }}>
            {/* Session Type Selection */}
            <Grid item xs={12}>
              <FormControl fullWidth required>
                <InputLabel>Session Type *</InputLabel>
                <Select
                  value={selectedSessionTypeId || ''}
                  onChange={(e) => {
                    setSelectedSessionTypeId(e.target.value);
                    setSelectedBookingSlot(null);
                    setBookingAvailableSlots([]);
                  }}
                  label="Session Type *"
                  disabled={submittingBooking || loadingSessionTypes}
                >
                  {loadingSessionTypes && (
                    <MenuItem disabled>
                      <CircularProgress size={16} sx={{ mr: 1 }} /> Loading session types...
                    </MenuItem>
                  )}
                  {!loadingSessionTypes &&
                    bookingSessionTypes.map((st) => (
                      <MenuItem key={st.id || st.sessionTypeId} value={st.id || st.sessionTypeId}>
                        {st.name} - ${st.price || 0} ({st.durationMinutes || 60} min)
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>
              {sessionTypesError && (
                <Alert severity="error" sx={{ mt: 1 }}>
                  {sessionTypesError}
                </Alert>
              )}
            </Grid>

            {/* Client Selection */}
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Client</InputLabel>
                <Select
                  value={selectedClientId}
                  onChange={(e) => {
                    const value = e.target.value;
                    // Ignore the special create new value
                    if (value !== '__create_new__') {
                      setSelectedClientId(value);
                    }
                  }}
                  label="Client"
                  disabled={submittingBooking || loadingBookingUsers}
                  renderValue={(selected) => {
                    if (!selected) return '';
                    const user = bookingAvailableUsers.find((u) => u.id === selected);
                    return user ? userFullName(user) : selected;
                  }}
                >
                  {loadingBookingUsers && (
                    <MenuItem disabled>
                      <CircularProgress size={16} sx={{ mr: 1 }} /> Loading users...
                    </MenuItem>
                  )}
                  {!loadingBookingUsers &&
                    bookingAvailableUsers.map((user) => (
                      <MenuItem key={user.id} value={user.id}>
                        {userFullName(user)}
                      </MenuItem>
                    ))}
                  <MenuItem 
                    value="__create_new__"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCreateClientOpen();
                    }}
                    sx={{ fontStyle: 'italic', color: 'primary.main', borderTop: '1px solid', borderColor: 'divider', mt: 0.5 }}
                  >
                    + Create new client
                  </MenuItem>
                </Select>
              </FormControl>
              {bookingUsersError && (
                <Alert severity="error" sx={{ mt: 1 }}>
                  {bookingUsersError}
                </Alert>
              )}
            </Grid>

            {/* Date and Time Selection */}
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
                  opacity: selectedSessionTypeId ? 1 : 0.6,
                  pointerEvents: selectedSessionTypeId ? 'auto' : 'none',
                }}
              >
                <DateCalendar
                  value={bookingSelectedDate}
                  onChange={handleBookingDateChange}
                  minDate={dayjs()}
                  sx={{ width: '100%' }}
                  firstDayOfWeek={1}
                  disabled={!selectedSessionTypeId}
                />
              </Box>
              {!selectedSessionTypeId && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1, textAlign: 'center' }}>
                  Please select a session type to enable date selection
                </Typography>
              )}
            </Grid>

            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>
                Available Times on {formatDateForDisplay(bookingSelectedDate)}
              </Typography>

              {!selectedSessionTypeId ? (
                <Alert severity="info">
                  Please select a session type to view available time slots.
                </Alert>
              ) : (
                <>
                  {bookingSlotsError && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                      {bookingSlotsError}
                    </Alert>
                  )}

                  {loadingBookingSlots ? (
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
                  ) : bookingAvailableSlots.length > 0 ? (
                    <List>
                      {bookingAvailableSlots.map((slot, index) => {
                        const startTime = slot.startTime 
                          ? formatTime(slot.startTime) 
                          : (slot.startTimeInstant ? formatTimeFromInstant(slot.startTimeInstant) : 'N/A');
                        const endTime = slot.endTime 
                          ? formatTime(slot.endTime) 
                          : 'N/A';
                        const isSelected = selectedBookingSlot?.startTimeInstant === slot.startTimeInstant && !showCustomTimePicker;
                        
                        // Check if slot is in the past (only for today)
                        const isToday = bookingSelectedDate.isSame(dayjs(), 'day');
                        const isPastSlot = isToday && slot.startTimeInstant && dayjs(slot.startTimeInstant).isBefore(dayjs());
                        const isDisabled = isPastSlot;
                        
                        return (
                          <ListItemButton
                            key={slot.startTimeInstant || `slot-${index}`}
                            onClick={() => !isDisabled && handleBookingSlotClick(slot)}
                            selected={isSelected}
                            disabled={isDisabled}
                            sx={{
                              border: 1,
                              borderColor: isSelected ? 'primary.main' : (isDisabled ? 'error.light' : 'divider'),
                              borderRadius: 1,
                              mb: 1,
                              bgcolor: isSelected ? 'action.selected' : (isDisabled ? 'action.disabledBackground' : 'transparent'),
                              opacity: isDisabled ? 0.5 : 1,
                              '&:hover': {
                                bgcolor: isDisabled ? 'action.disabledBackground' : 'action.hover',
                              },
                              '&.Mui-disabled': {
                                opacity: 0.5,
                              },
                            }}
                          >
                            <Typography variant="body1" color={isDisabled ? 'text.disabled' : 'text.primary'}>
                              {startTime}{endTime !== 'N/A' ? ` - ${endTime}` : ''}
                              {isDisabled && ' (Past)'}
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
                            bgcolor: 'background.paper',
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
                            bgcolor: 'background.paper',
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
                </>
              )}
            </Grid>

            {/* Client Message */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={4}
                label="Message (Optional)"
                placeholder="Add any additional notes or questions..."
                value={bookingClientMessage}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value.length <= 2000) {
                    setBookingClientMessage(value);
                  }
                }}
                disabled={submittingBooking}
                error={bookingClientMessage.length > 2000}
                helperText={
                  bookingClientMessage.length > 2000
                    ? 'Message must be 2000 characters or less'
                    : `${bookingClientMessage.length}/2000 characters`
                }
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={handleNewBookingClose}
            sx={{ textTransform: 'none' }}
            disabled={submittingBooking}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmitBooking}
            variant="contained"
            sx={{ textTransform: 'none' }}
            disabled={
              submittingBooking ||
              !selectedSessionTypeId ||
              !selectedClientId ||
              (!selectedBookingSlot && !(customStartTime && bookingSelectedDate)) ||
              !!bookingError
            }
          >
            {submittingBooking ? (
              <>
                <CircularProgress size={16} sx={{ mr: 1 }} />
                Creating...
              </>
            ) : (
              'Create Booking'
            )}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create New Client Dialog */}
      <Dialog open={createClientOpen} onClose={handleCreateClientClose} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Client</DialogTitle>
        <DialogContent>
          {createClientError && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setCreateClientError(null)}>
              {createClientError}
            </Alert>
          )}

          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                autoFocus
                fullWidth
                label="Email *"
                type="email"
                value={newClientData.email}
                onChange={(e) => {
                  setNewClientData((prev) => ({ ...prev, email: e.target.value }));
                  setCreateClientError(null);
                }}
                required
                disabled={creatingClient}
                error={!!createClientError && createClientError.includes('email')}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="First Name"
                value={newClientData.firstName}
                onChange={(e) => {
                  setNewClientData((prev) => ({ ...prev, firstName: e.target.value }));
                }}
                disabled={creatingClient}
                inputProps={{ maxLength: 100 }}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Last Name"
                value={newClientData.lastName}
                onChange={(e) => {
                  setNewClientData((prev) => ({ ...prev, lastName: e.target.value }));
                }}
                disabled={creatingClient}
                inputProps={{ maxLength: 100 }}
              />
            </Grid>

            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Timezone</InputLabel>
                <Select
                  value={newClientData.timezone}
                  onChange={(e) => {
                    setNewClientData((prev) => ({ ...prev, timezone: e.target.value }));
                  }}
                  label="Timezone"
                  disabled={creatingClient}
                >
                  {getUniqueTimezoneOffsets().map((tz) => (
                    <MenuItem key={tz.value} value={tz.value}>
                      {tz.label} ({tz.offset})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={newClientData.sendEmailNotification}
                    onChange={(e) => {
                      setNewClientData((prev) => ({ ...prev, sendEmailNotification: e.target.checked }));
                    }}
                    disabled={creatingClient}
                  />
                }
                label="Send email notification"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={handleCreateClientClose}
            sx={{ textTransform: 'none' }}
            disabled={creatingClient}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreateClientSubmit}
            variant="contained"
            sx={{ textTransform: 'none' }}
            disabled={creatingClient || !newClientData.email.trim()}
          >
            {creatingClient ? (
              <>
                <CircularProgress size={16} sx={{ mr: 1 }} />
                Creating...
              </>
            ) : (
              'Create Client'
            )}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
    </LocalizationProvider>
  );
};

export default AdminDashboard;

