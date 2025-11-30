import React, { useState, useEffect, useRef } from 'react';
import dayjs from 'dayjs';
import { fetchAdminGroupedBookings, fetchWithAuth } from '../utils/api';
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
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import MessageIcon from '@mui/icons-material/Message';

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
  const hasFetchedRef = useRef(false);

  // Fetch bookings
  const fetchBookings = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch bookings grouped by status
      // If status is not provided, fetch all statuses
      const data = await fetchAdminGroupedBookings('PENDING_APPROVAL,CONFIRMED');

      // Handle different possible response formats
      if (data && typeof data === 'object') {
        // If response has bookings object with status keys
        if (data.bookings) {
          setBookings({
            PENDING_APPROVAL: data.bookings.PENDING_APPROVAL || [],
            CONFIRMED: data.bookings.CONFIRMED || [],
          });
        } 
        // If response is directly an object with status keys
        else if (data.PENDING_APPROVAL !== undefined || data.CONFIRMED !== undefined) {
          setBookings({
            PENDING_APPROVAL: data.PENDING_APPROVAL || [],
            CONFIRMED: data.CONFIRMED || [],
          });
        }
        // If response is an array, group by status
        else if (Array.isArray(data)) {
          const grouped = {
            PENDING_APPROVAL: data.filter(b => b.status === 'PENDING_APPROVAL'),
            CONFIRMED: data.filter(b => b.status === 'CONFIRMED'),
          };
          setBookings(grouped);
        }
        // Default: empty bookings
        else {
          setBookings({
            PENDING_APPROVAL: [],
            CONFIRMED: [],
          });
        }
      } else {
        setBookings({
          PENDING_APPROVAL: [],
          CONFIRMED: [],
        });
      }
    } catch (err) {
      console.error('Error fetching bookings:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Failed to load bookings. Please try again.';
      setError(errorMessage);
      setBookings({
        PENDING_APPROVAL: [],
        CONFIRMED: [],
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Prevent duplicate calls in React StrictMode
    if (hasFetchedRef.current) {
      return;
    }
    hasFetchedRef.current = true;
    fetchBookings();
  }, []);

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

  // Render booking card
  const renderBookingCard = (booking) => {
    const validTransitions = getValidTransitions(booking.status);
    const canUpdate = validTransitions.length > 0;

    return (
      <Card key={booking.id} sx={{ mb: 2 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="h6" gutterBottom>
                {getClientName(booking)}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {booking.clientEmail}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <Chip
                label={booking.status.replace(/_/g, ' ')}
                color={STATUS_COLORS[booking.status] || 'default'}
                size="small"
              />
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
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" component="h2">
          Bookings Management
        </Typography>
        <Button
          variant="outlined"
          onClick={fetchBookings}
          disabled={loading}
          sx={{ textTransform: 'none' }}
        >
          Refresh
        </Button>
      </Box>

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
                <Chip
                  label="PENDING APPROVAL"
                  color="warning"
                  sx={{ mr: 2, fontWeight: 'bold' }}
                />
                <Typography variant="body2" color="text.secondary">
                  {bookings.PENDING_APPROVAL.length} booking{bookings.PENDING_APPROVAL.length !== 1 ? 's' : ''}
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
                <Chip
                  label="CONFIRMED"
                  color="success"
                  sx={{ mr: 2, fontWeight: 'bold' }}
                />
                <Typography variant="body2" color="text.secondary">
                  {bookings.CONFIRMED.length} booking{bookings.CONFIRMED.length !== 1 ? 's' : ''}
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
  );
};

export default BookingsManagement;

