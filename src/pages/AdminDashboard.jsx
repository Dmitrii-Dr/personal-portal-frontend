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
} from '@mui/material';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import ClearIcon from '@mui/icons-material/Clear';
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
                        </Box>
                        {/* Prices on a new row */}
                        {booking.sessionPrices && Object.keys(booking.sessionPrices).length > 0 && (
                          <Stack direction="row" spacing={0.5} sx={{ mt: 0.5, flexWrap: 'wrap', gap: 0.5 }}>
                            {Object.entries(booking.sessionPrices).map(([currency, price]) => (
                              <Chip
                                key={currency}
                                label={`${currency}: ${price}`}
                                size="small"
                                sx={{ 
                                  height: 20, 
                                  fontSize: '0.65rem',
                                  '& .MuiChip-label': { px: 0.75 }
                                }}
                              />
                            ))}
                          </Stack>
                        )}
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

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" component="h1">
          Admin Dashboard
        </Typography>
      </Box>

      <Divider sx={{ my: 4 }} />

      {/* Sessions Tabs */}
      <Box sx={{ mb: 4 }}>
        <Tabs value={activeTab} onChange={handleTabChange} sx={{ mb: 3 }}>
          <Tab label="Active Sessions" />
          <Tab label="Past Sessions" />
        </Tabs>

        {activeTab === 0 && (
          <Box>
            <BookingsManagement />
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
    </Box>
  );
};

export default AdminDashboard;

