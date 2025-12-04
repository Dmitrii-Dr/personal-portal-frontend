import React, { useState, useEffect, useRef } from 'react';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { fetchAdminGroupedBookings, fetchWithAuth, getToken, fetchUserSettings } from '../utils/api';

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
} from '@mui/material';
import { DateCalendar } from '@mui/x-date-pickers/DateCalendar';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import EditIcon from '@mui/icons-material/Edit';
import MessageIcon from '@mui/icons-material/Message';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import ClearIcon from '@mui/icons-material/Clear';

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
  const [messageDialogOpen, setMessageDialogOpen] = useState(false);
  const [selectedBookingMessage, setSelectedBookingMessage] = useState(null);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [userTimezone, setUserTimezone] = useState(null);
  const [calendarAnchorEl, setCalendarAnchorEl] = useState(null);
  const hasFetchedRef = useRef(false);
  const allBookingsRef = useRef({
    PENDING_APPROVAL: [],
    CONFIRMED: [],
  });

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

  // Handle message dialog open
  const handleMessageClick = (booking) => {
    setSelectedBookingMessage({
      clientName: getClientName(booking),
      clientEmail: booking.clientEmail,
      message: booking.clientMessage,
    });
    setMessageDialogOpen(true);
  };

  // Handle message dialog close
  const handleMessageClose = () => {
    setMessageDialogOpen(false);
    setSelectedBookingMessage(null);
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
          {/* First row: Status chips and action buttons */}
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 2, flexWrap: 'nowrap' }}>
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
              startIcon={<MessageIcon />}
              onClick={() => handleMessageClick(booking)}
              sx={{ textTransform: 'none' }}
            >
              Message
            </Button>
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
          
          {/* Second row: Client name */}
          <Box sx={{ mb: 1 }}>
            <Typography variant="h6">
              {getClientName(booking)}
            </Typography>
          </Box>
          
          {/* Third row: Email */}
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
              <Typography variant="body1" gutterBottom>
                {booking.sessionTypeName || 'N/A'}
              </Typography>
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
                Session: {selectedBooking.sessionTypeName}
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

      {/* Message Dialog */}
      <Dialog open={messageDialogOpen} onClose={handleMessageClose} maxWidth="sm" fullWidth>
        <DialogTitle>Client Message</DialogTitle>
        <DialogContent>
          {selectedBookingMessage && (
            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                From: {selectedBookingMessage.clientName}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mb: 3 }}>
                Email: {selectedBookingMessage.clientEmail}
              </Typography>
              <Divider sx={{ mb: 2 }} />
              {selectedBookingMessage.message ? (
                <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                  {selectedBookingMessage.message}
                </Typography>
              ) : (
                <Typography variant="body2" color="text.secondary" fontStyle="italic">
                  No message provided
                </Typography>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleMessageClose} sx={{ textTransform: 'none' }}>
            Close
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

