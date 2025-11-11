import React, { useState, useEffect } from 'react';
import axios from 'axios';
import dayjs from 'dayjs';
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
} from '@mui/material';
import { DateCalendar } from '@mui/x-date-pickers/DateCalendar';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';

const BookingPage = () => {
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loading, setLoading] = useState(true); // Start with true since we fetch on mount
  const [error, setError] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);

  // Format date to YYYY-MM-DD for API
  const formatDateForAPI = (date) => {
    return dayjs(date).format('YYYY-MM-DD');
  };

  // Fetch available slots for a given date
  const fetchAvailableSlots = async (date) => {
    try {
      setLoading(true);
      setError(null);
      const dateString = formatDateForAPI(date);
      
      // For now, using stub data since API is not ready
      // TODO: Replace with actual API call when backend is ready
      // const response = await axios.get(`/api/booking/available-slots?date=${dateString}`);
      // setAvailableSlots(response.data || []);
      
      // Stub data for demonstration
      const stubSlots = [
        { id: '1', startTime: '09:00', endTime: '10:00', status: 'available' },
        { id: '2', startTime: '10:30', endTime: '11:30', status: 'available' },
        { id: '3', startTime: '14:00', endTime: '15:00', status: 'available' },
        { id: '4', startTime: '15:30', endTime: '16:30', status: 'available' },
      ];
      
      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 500));
      setAvailableSlots(stubSlots);
    } catch (err) {
      console.error('Error fetching available slots:', err);
      let errorMessage = 'Failed to load available slots. Please try again later.';
      
      if (err.response) {
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

  // Fetch slots on component mount and when date changes
  useEffect(() => {
    fetchAvailableSlots(selectedDate);
  }, [selectedDate]);

  // Handle date selection
  const handleDateChange = (newDate) => {
    setSelectedDate(newDate);
  };

  // Handle slot selection
  const handleSlotClick = (slot) => {
    setSelectedSlot(slot);
    setOpenDialog(true);
  };

  // Handle dialog close
  const handleDialogClose = () => {
    setOpenDialog(false);
    setSelectedSlot(null);
  };

  // Handle booking confirmation
  const handleConfirmBooking = () => {
    if (selectedSlot) {
      console.log('Booking confirmed for slot ID:', selectedSlot.id);
      console.log('Slot details:', selectedSlot);
      console.log('Date:', formatDateForAPI(selectedDate));
    }
    handleDialogClose();
  };

  // Format time for display
  const formatTime = (timeString) => {
    return dayjs(timeString, 'HH:mm').format('h:mm A');
  };

  // Format date for display
  const formatDateForDisplay = (date) => {
    return dayjs(date).format('MMMM D, YYYY');
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box>
        <Typography variant="h4" component="h1" gutterBottom>
          Book a Session
        </Typography>

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
                {availableSlots
                  .filter((slot) => slot.status === 'available')
                  .map((slot) => (
                    <ListItemButton
                      key={slot.id}
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
                        {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                      </Typography>
                    </ListItemButton>
                  ))}
              </List>
            ) : (
              <Alert severity="info">
                No available sessions on this day.
              </Alert>
            )}
          </Grid>
        </Grid>

        {/* Booking Confirmation Dialog */}
        <Dialog open={openDialog} onClose={handleDialogClose}>
          <DialogTitle>Confirm Booking</DialogTitle>
          <DialogContent>
            <DialogContentText>
              {selectedSlot && (
                <>
                  Confirm your booking for{' '}
                  <strong>{formatTime(selectedSlot.startTime)}</strong> on{' '}
                  <strong>{formatDateForDisplay(selectedDate)}</strong>?
                </>
              )}
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleDialogClose} color="inherit">
              Cancel
            </Button>
            <Button onClick={handleConfirmBooking} color="primary" variant="contained">
              Confirm Booking
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </LocalizationProvider>
  );
};

export default BookingPage;

