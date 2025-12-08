import React, { useState, useEffect } from 'react';
import apiClient from '../utils/api';
import {
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  Alert,
  CircularProgress,
  Grid,
  FormControlLabel,
  Checkbox,
  Switch,
  Snackbar,
  Popover,
  InputLabel as MuiInputLabel,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import { DateCalendar } from '@mui/x-date-pickers/DateCalendar';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';

const AvailabilityOverrideComponent = () => {
  const [overrides, setOverrides] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingOverride, setEditingOverride] = useState(null);
  const [overrideToDelete, setOverrideToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);
  const [dateAnchorEl, setDateAnchorEl] = useState(null);

  const [formData, setFormData] = useState({
    overrideDate: null,
    startTime: '',
    endTime: '',
    isAvailable: true,
  });
  const [startHourInput, setStartHourInput] = useState('00');
  const [startMinuteInput, setStartMinuteInput] = useState('00');
  const [endHourInput, setEndHourInput] = useState('00');
  const [endMinuteInput, setEndMinuteInput] = useState('00');

  // Fetch all availability overrides
  const fetchOverrides = async (signal = null) => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get('/api/v1/admin/booking/availability/override', {
        signal,
        timeout: 10000,
      });
      setOverrides(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      // Don't set error if request was aborted
      if (err.name === 'AbortError' || err.name === 'CanceledError' || err.code === 'ERR_CANCELED') {
        return;
      }
      console.error('Error fetching availability overrides:', err);
      let errorMessage = 'Failed to load availability overrides.';
      if (err.response?.status === 401) {
        errorMessage = 'Unauthorized. Please log in again.';
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.message) {
        errorMessage = err.message;
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    const loadOverrides = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await apiClient.get('/api/v1/admin/booking/availability/override', {
          signal: controller.signal,
          timeout: 10000,
        });
        
        if (!isMounted) return;
        
        setOverrides(Array.isArray(response.data) ? response.data : []);
      } catch (err) {
        // Don't set error if request was aborted
        if (err.name === 'AbortError' || err.name === 'CanceledError' || err.code === 'ERR_CANCELED') {
          return;
        }
        
        if (!isMounted) return;
        
        console.error('Error fetching availability overrides:', err);
        let errorMessage = 'Failed to load availability overrides.';
        if (err.response?.status === 401) {
          errorMessage = 'Unauthorized. Please log in again.';
        } else if (err.response?.data?.message) {
          errorMessage = err.response.data.message;
        } else if (err.message) {
          errorMessage = err.message;
        }
        setError(errorMessage);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadOverrides();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, []);

  // Format helpers
  const formatTime = (timeString) => {
    if (!timeString) return 'N/A';
    try {
      // Always display in 24-hour format (HH:mm)
      // Handle ISO time format (HH:mm:ss) or (HH:mm)
      const parts = timeString.split(':');
      if (parts.length >= 2) {
        const hours = parseInt(parts[0], 10);
        const minutes = parseInt(parts[1], 10);
        // Ensure hours are in 0-23 range and format as HH:mm
        const validHours = Math.max(0, Math.min(23, hours));
        const validMinutes = Math.max(0, Math.min(59, minutes));
        return `${validHours.toString().padStart(2, '0')}:${validMinutes.toString().padStart(2, '0')}`;
      }
      return timeString;
    } catch {
      return timeString;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return dayjs(dateString).format('MMM DD, YYYY');
    } catch {
      return dateString;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'ACTIVE':
        return 'success';
      case 'ARCHIVED':
        return 'default';
      default:
        return 'default';
    }
  };

  const getTypeLabel = (isAvailable) => {
    return isAvailable ? 'Extend' : 'Reduce';
  };

  const getTypeColor = (isAvailable) => {
    return isAvailable ? 'primary' : 'warning';
  };

  // Form handlers
  const handleOpenDialog = (override = null) => {
    if (override) {
      setEditingOverride(override);
      // Convert time strings (HH:mm:ss) to HTML time input format (HH:mm)
      const formatTimeForInput = (timeStr) => {
        if (!timeStr) return '';
        try {
          const parts = timeStr.split(':');
          if (parts.length >= 2) {
            return `${parts[0]}:${parts[1]}`;
          }
          return timeStr;
        } catch {
          return '';
        }
      };

      const startTime = formatTimeForInput(override.startTime);
      const endTime = formatTimeForInput(override.endTime);
      
      // Parse and set hour/minute inputs
      if (startTime) {
        const [startHour, startMin] = startTime.split(':');
        setStartHourInput(startHour || '00');
        setStartMinuteInput(startMin || '00');
      } else {
        setStartHourInput('00');
        setStartMinuteInput('00');
      }
      
      if (endTime) {
        const [endHour, endMin] = endTime.split(':');
        setEndHourInput(endHour || '00');
        setEndMinuteInput(endMin || '00');
      } else {
        setEndHourInput('00');
        setEndMinuteInput('00');
      }

      setFormData({
        overrideDate: override.overrideDate ? dayjs(override.overrideDate) : null,
        startTime: startTime,
        endTime: endTime,
        isAvailable: override.isAvailable !== undefined ? override.isAvailable : true,
      });
    } else {
      setEditingOverride(null);
      setStartHourInput('00');
      setStartMinuteInput('00');
      setEndHourInput('00');
      setEndMinuteInput('00');
      setFormData({
        overrideDate: null,
        startTime: '',
        endTime: '',
        isAvailable: true,
      });
    }
    setDatePopoverOpen(false);
    setDateAnchorEl(null);
    setFormErrors({});
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingOverride(null);
    setStartHourInput('00');
    setStartMinuteInput('00');
    setEndHourInput('00');
    setEndMinuteInput('00');
    setFormData({
      overrideDate: null,
      startTime: '',
      endTime: '',
      isAvailable: true,
    });
    setDatePopoverOpen(false);
    setDateAnchorEl(null);
    setFormErrors({});
  };

  const handleTimeChange = (field) => (e) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));
    // Clear error when user makes a change
    if (formErrors[field]) {
      setFormErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  // Time picker handlers for start time
  const handleStartHourChange = (increment) => {
    const currentHour = parseInt(startHourInput, 10) || 0;
    const newHour = increment 
      ? (currentHour + 1) % 24 
      : (currentHour - 1 + 24) % 24;
    const newHourStr = String(newHour).padStart(2, '0');
    setStartHourInput(newHourStr);
    const newTime = `${newHourStr}:${startMinuteInput}`;
    setFormData((prev) => ({ ...prev, startTime: newTime }));
    if (formErrors.startTime) {
      setFormErrors((prev) => ({ ...prev, startTime: '' }));
    }
  };

  const handleStartMinuteChange = (increment) => {
    const currentMinute = parseInt(startMinuteInput, 10) || 0;
    const newMinute = increment 
      ? (currentMinute + 5) % 60 
      : (currentMinute - 5 + 60) % 60;
    const newMinuteStr = String(newMinute).padStart(2, '0');
    setStartMinuteInput(newMinuteStr);
    const newTime = `${startHourInput}:${newMinuteStr}`;
    setFormData((prev) => ({ ...prev, startTime: newTime }));
    if (formErrors.startTime) {
      setFormErrors((prev) => ({ ...prev, startTime: '' }));
    }
  };

  const handleStartHourInputChange = (value) => {
    const numericValue = value.replace(/\D/g, '').slice(0, 2);
    setStartHourInput(numericValue || '');
  };

  const handleStartHourInputBlur = () => {
    const hour = parseInt(startHourInput, 10);
    let finalHour;
    if (isNaN(hour) || hour < 0) {
      finalHour = 0;
    } else if (hour > 23) {
      finalHour = 23;
    } else {
      finalHour = hour;
    }
    const newHourStr = String(finalHour).padStart(2, '0');
    setStartHourInput(newHourStr);
    const newTime = `${newHourStr}:${startMinuteInput}`;
    setFormData((prev) => ({ ...prev, startTime: newTime }));
  };

  const handleStartMinuteInputChange = (value) => {
    const numericValue = value.replace(/\D/g, '').slice(0, 2);
    setStartMinuteInput(numericValue || '');
  };

  const handleStartMinuteInputBlur = () => {
    const minute = parseInt(startMinuteInput, 10);
    let finalMinute;
    if (isNaN(minute) || minute < 0) {
      finalMinute = 0;
    } else if (minute > 59) {
      finalMinute = 59;
    } else {
      finalMinute = minute;
    }
    const newMinuteStr = String(finalMinute).padStart(2, '0');
    setStartMinuteInput(newMinuteStr);
    const newTime = `${startHourInput}:${newMinuteStr}`;
    setFormData((prev) => ({ ...prev, startTime: newTime }));
  };

  // Time picker handlers for end time
  const handleEndHourChange = (increment) => {
    const currentHour = parseInt(endHourInput, 10) || 0;
    const newHour = increment 
      ? (currentHour + 1) % 24 
      : (currentHour - 1 + 24) % 24;
    const newHourStr = String(newHour).padStart(2, '0');
    setEndHourInput(newHourStr);
    const newTime = `${newHourStr}:${endMinuteInput}`;
    setFormData((prev) => ({ ...prev, endTime: newTime }));
    if (formErrors.endTime) {
      setFormErrors((prev) => ({ ...prev, endTime: '' }));
    }
  };

  const handleEndMinuteChange = (increment) => {
    const currentMinute = parseInt(endMinuteInput, 10) || 0;
    const newMinute = increment 
      ? (currentMinute + 5) % 60 
      : (currentMinute - 5 + 60) % 60;
    const newMinuteStr = String(newMinute).padStart(2, '0');
    setEndMinuteInput(newMinuteStr);
    const newTime = `${endHourInput}:${newMinuteStr}`;
    setFormData((prev) => ({ ...prev, endTime: newTime }));
    if (formErrors.endTime) {
      setFormErrors((prev) => ({ ...prev, endTime: '' }));
    }
  };

  const handleEndHourInputChange = (value) => {
    const numericValue = value.replace(/\D/g, '').slice(0, 2);
    setEndHourInput(numericValue || '');
  };

  const handleEndHourInputBlur = () => {
    const hour = parseInt(endHourInput, 10);
    let finalHour;
    if (isNaN(hour) || hour < 0) {
      finalHour = 0;
    } else if (hour > 23) {
      finalHour = 23;
    } else {
      finalHour = hour;
    }
    const newHourStr = String(finalHour).padStart(2, '0');
    setEndHourInput(newHourStr);
    const newTime = `${newHourStr}:${endMinuteInput}`;
    setFormData((prev) => ({ ...prev, endTime: newTime }));
  };

  const handleEndMinuteInputChange = (value) => {
    const numericValue = value.replace(/\D/g, '').slice(0, 2);
    setEndMinuteInput(numericValue || '');
  };

  const handleEndMinuteInputBlur = () => {
    const minute = parseInt(endMinuteInput, 10);
    let finalMinute;
    if (isNaN(minute) || minute < 0) {
      finalMinute = 0;
    } else if (minute > 59) {
      finalMinute = 59;
    } else {
      finalMinute = minute;
    }
    const newMinuteStr = String(finalMinute).padStart(2, '0');
    setEndMinuteInput(newMinuteStr);
    const newTime = `${endHourInput}:${newMinuteStr}`;
    setFormData((prev) => ({ ...prev, endTime: newTime }));
  };

  const handleDateChange = (newValue) => {
    setFormData((prev) => ({ ...prev, overrideDate: newValue }));
    // Clear error when user makes a change
    if (formErrors.overrideDate) {
      setFormErrors((prev) => ({ ...prev, overrideDate: '' }));
    }
  };

  const handleIsAvailableChange = (e) => {
    setFormData((prev) => ({ ...prev, isAvailable: e.target.checked }));
  };

  // Check if form has all required fields filled
  const isFormValid = () => {
    return (
      formData.overrideDate &&
      formData.startTime &&
      formData.startTime.trim() !== '' &&
      formData.endTime &&
      formData.endTime.trim() !== ''
    );
  };

  // Validation
  const validateForm = () => {
    const errors = {};

    if (!formData.overrideDate) {
      errors.overrideDate = 'Override date is required';
    } else {
      // Check if date is in the past
      const today = dayjs().startOf('day');
      const selectedDate = dayjs(formData.overrideDate).startOf('day');
      if (selectedDate.isBefore(today)) {
        errors.overrideDate = 'Cannot create overrides for dates in the past';
      }
    }

    if (!formData.startTime || formData.startTime.trim() === '') {
      errors.startTime = 'Start time is required';
    }

    if (!formData.endTime || formData.endTime.trim() === '') {
      errors.endTime = 'End time is required';
    }

    if (formData.startTime && formData.endTime) {
      // Compare time strings (HH:mm format)
      const startParts = formData.startTime.split(':');
      const endParts = formData.endTime.split(':');
      if (startParts.length === 2 && endParts.length === 2) {
        const startMinutes = parseInt(startParts[0], 10) * 60 + parseInt(startParts[1], 10);
        const endMinutes = parseInt(endParts[0], 10) * 60 + parseInt(endParts[1], 10);

        if (endMinutes <= startMinutes) {
          errors.endTime = 'End time must be after start time';
        } else {
          // Check duration (max 24 hours)
          const durationMinutes = endMinutes - startMinutes;
          if (durationMinutes > 24 * 60) {
            errors.endTime = 'Duration cannot exceed 24 hours';
          }
        }
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Submit form
  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // Format data for API - convert time from HH:mm to HH:mm:ss
      const formatTimeForAPI = (timeStr) => {
        if (!timeStr) return '';
        // If already in HH:mm:ss format, return as is
        if (timeStr.split(':').length === 3) return timeStr;
        // Otherwise, add :00 for seconds
        return `${timeStr}:00`;
      };

      const payload = {
        overrideDate: formData.overrideDate.format('YYYY-MM-DD'),
        startTime: formatTimeForAPI(formData.startTime),
        endTime: formatTimeForAPI(formData.endTime),
        isAvailable: formData.isAvailable,
      };

      let response;
      if (editingOverride) {
        // Update existing override
        response = await apiClient.put(
          `/api/v1/admin/booking/availability/override/${editingOverride.id}`,
          payload
        );
        setSuccessMessage('Availability override updated successfully');
      } else {
        // Create new override
        response = await apiClient.post('/api/v1/admin/booking/availability/override', payload);
        setSuccessMessage('Availability override created successfully');
      }

      handleCloseDialog();
      fetchOverrides();
    } catch (err) {
      console.error('Error saving availability override:', err);
      let errorMessage = 'Failed to save availability override.';
      if (err.response?.status === 400) {
        errorMessage = err.response.data?.message || 'Validation error. Please check your input.';
      } else if (err.response?.status === 401) {
        errorMessage = 'Unauthorized. Please log in again.';
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.message) {
        errorMessage = err.message;
      }
      setError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  // Delete handlers
  const handleDeleteClick = (override) => {
    setOverrideToDelete(override);
    setDeleteDialogOpen(true);
  };

  const handleCloseDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setOverrideToDelete(null);
  };

  const handleConfirmDelete = async () => {
    if (!overrideToDelete) return;

    setDeleting(true);
    setError(null);

    try {
      await apiClient.delete(`/api/v1/admin/booking/availability/override/${overrideToDelete.id}`);
      setSuccessMessage('Availability override deleted successfully');
      handleCloseDeleteDialog();
      fetchOverrides();
    } catch (err) {
      console.error('Error deleting availability override:', err);
      let errorMessage = 'Failed to delete availability override.';
      if (err.response?.status === 401) {
        errorMessage = 'Unauthorized. Please log in again.';
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.message) {
        errorMessage = err.message;
      }
      setError(errorMessage);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Availability Rules Overrides</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
          sx={{ textTransform: 'none' }}
        >
          Add Override
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
      ) : overrides.length > 0 ? (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Time Range</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Timezone</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {overrides.map((override) => (
                <TableRow
                  key={override.id}
                  sx={{
                    ...(override.status === 'ACTIVE' && {
                      bgcolor: 'action.hover',
                    }),
                  }}
                >
                  <TableCell>{override.id}</TableCell>
                  <TableCell>{formatDate(override.overrideDate)}</TableCell>
                  <TableCell>
                    {formatTime(override.startTime)} - {formatTime(override.endTime)}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={getTypeLabel(override.isAvailable)}
                      color={getTypeColor(override.isAvailable)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={override.status}
                      color={getStatusColor(override.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{override.timezone || 'N/A'}</TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      onClick={() => handleOpenDialog(override)}
                      color="primary"
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleDeleteClick(override)}
                      color="error"
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <Alert severity="info">No availability overrides found. Create one to get started.</Alert>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingOverride ? 'Edit Availability Override' : 'Create Availability Override'}
        </DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              {/* Override Date */}
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  <MuiInputLabel
                    htmlFor="override-date"
                    sx={{ px: 0.5, fontSize: '0.875rem', mb: 0.5, lineHeight: 1.2 }}
                  >
                    Override Date *
                  </MuiInputLabel>
                  <Box>
                    <Button
                      variant="outlined"
                      id="override-date"
                      fullWidth
                      onClick={(e) => {
                        setDateAnchorEl(e.currentTarget);
                        setDatePopoverOpen(true);
                      }}
                      endIcon={<KeyboardArrowDownIcon />}
                      sx={{
                        justifyContent: 'space-between',
                        textTransform: 'none',
                        fontWeight: 'normal',
                        height: '56px',
                        ...(formErrors.overrideDate && {
                          borderColor: 'error.main',
                        }),
                      }}
                    >
                      {formData.overrideDate
                        ? formData.overrideDate.format('MMM D, YYYY')
                        : 'Pick a date'}
                    </Button>
                    <Popover
                      open={datePopoverOpen}
                      anchorEl={dateAnchorEl}
                      onClose={() => {
                        setDatePopoverOpen(false);
                        setDateAnchorEl(null);
                      }}
                      anchorOrigin={{
                        vertical: 'bottom',
                        horizontal: 'left',
                      }}
                      transformOrigin={{
                        vertical: 'top',
                        horizontal: 'left',
                      }}
                    >
                      <Box sx={{ p: 0 }}>
                        <DateCalendar
                          value={formData.overrideDate}
                          onChange={(date) => {
                            handleDateChange(date);
                            setDatePopoverOpen(false);
                            setDateAnchorEl(null);
                          }}
                          minDate={dayjs()}
                        />
                      </Box>
                    </Popover>
                  </Box>
                  {formErrors.overrideDate && (
                    <Typography variant="caption" color="error" sx={{ mt: 0.5, display: 'block' }}>
                      {formErrors.overrideDate}
                    </Typography>
                  )}
                </Box>
              </Grid>

              {/* Start Time and End Time */}
              <Grid item xs={12} sm={6}>
                <Box>
                  <MuiInputLabel
                    sx={{ px: 0.5, fontSize: '0.875rem', mb: 1, lineHeight: 1.2 }}
                  >
                    Start Time *
                  </MuiInputLabel>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                    {/* Hours */}
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <IconButton 
                        size="small" 
                        onClick={() => handleStartHourChange(true)}
                        disabled={!formData.overrideDate}
                        sx={{ mb: 0.5 }}
                      >
                        <ArrowUpwardIcon fontSize="small" />
                      </IconButton>
                      <TextField
                        value={startHourInput}
                        onChange={(e) => handleStartHourInputChange(e.target.value)}
                        onFocus={(e) => e.target.select()}
                        onBlur={handleStartHourInputBlur}
                        disabled={!formData.overrideDate}
                        error={!!formErrors.startTime}
                        inputProps={{
                          style: {
                            textAlign: 'center',
                            fontSize: '1.5rem',
                            fontWeight: 'bold',
                            padding: '12px',
                          },
                          maxLength: 2,
                        }}
                        autoComplete="off"
                        sx={{
                          width: 70,
                          '& .MuiOutlinedInput-root': {
                            border: 1,
                            borderColor: formErrors.startTime ? 'error.main' : 'divider',
                            borderRadius: 1,
                            bgcolor: 'grey.100',
                            '&:hover': {
                              borderColor: formErrors.startTime ? 'error.main' : 'primary.main',
                            },
                            '&.Mui-focused': {
                              borderColor: formErrors.startTime ? 'error.main' : 'primary.main',
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
                        onClick={() => handleStartHourChange(false)}
                        disabled={!formData.overrideDate}
                        sx={{ mt: 0.5 }}
                      >
                        <ArrowDownwardIcon fontSize="small" />
                      </IconButton>
                    </Box>
                    
                    <Typography variant="h5" sx={{ mx: 1 }}>
                      :
                    </Typography>
                    
                    {/* Minutes */}
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <IconButton 
                        size="small" 
                        onClick={() => handleStartMinuteChange(true)}
                        disabled={!formData.overrideDate}
                        sx={{ mb: 0.5 }}
                      >
                        <ArrowUpwardIcon fontSize="small" />
                      </IconButton>
                      <TextField
                        value={startMinuteInput}
                        onChange={(e) => handleStartMinuteInputChange(e.target.value)}
                        onFocus={(e) => e.target.select()}
                        onBlur={handleStartMinuteInputBlur}
                        disabled={!formData.overrideDate}
                        error={!!formErrors.startTime}
                        inputProps={{
                          style: {
                            textAlign: 'center',
                            fontSize: '1.5rem',
                            fontWeight: 'bold',
                            padding: '12px',
                          },
                          maxLength: 2,
                        }}
                        autoComplete="off"
                        sx={{
                          width: 70,
                          '& .MuiOutlinedInput-root': {
                            border: 1,
                            borderColor: formErrors.startTime ? 'error.main' : 'divider',
                            borderRadius: 1,
                            bgcolor: 'grey.100',
                            '&:hover': {
                              borderColor: formErrors.startTime ? 'error.main' : 'primary.main',
                            },
                            '&.Mui-focused': {
                              borderColor: formErrors.startTime ? 'error.main' : 'primary.main',
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
                        onClick={() => handleStartMinuteChange(false)}
                        disabled={!formData.overrideDate}
                        sx={{ mt: 0.5 }}
                      >
                        <ArrowDownwardIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </Box>
                  {formErrors.startTime && (
                    <Typography variant="caption" color="error" sx={{ mt: 0.5, display: 'block', textAlign: 'center' }}>
                      {formErrors.startTime}
                    </Typography>
                  )}
                </Box>
              </Grid>

              <Grid item xs={12} sm={6}>
                <Box>
                  <MuiInputLabel
                    sx={{ px: 0.5, fontSize: '0.875rem', mb: 1, lineHeight: 1.2 }}
                  >
                    End Time *
                  </MuiInputLabel>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                    {/* Hours */}
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <IconButton 
                        size="small" 
                        onClick={() => handleEndHourChange(true)}
                        disabled={!formData.overrideDate}
                        sx={{ mb: 0.5 }}
                      >
                        <ArrowUpwardIcon fontSize="small" />
                      </IconButton>
                      <TextField
                        value={endHourInput}
                        onChange={(e) => handleEndHourInputChange(e.target.value)}
                        onFocus={(e) => e.target.select()}
                        onBlur={handleEndHourInputBlur}
                        disabled={!formData.overrideDate}
                        error={!!formErrors.endTime}
                        inputProps={{
                          style: {
                            textAlign: 'center',
                            fontSize: '1.5rem',
                            fontWeight: 'bold',
                            padding: '12px',
                          },
                          maxLength: 2,
                        }}
                        autoComplete="off"
                        sx={{
                          width: 70,
                          '& .MuiOutlinedInput-root': {
                            border: 1,
                            borderColor: formErrors.endTime ? 'error.main' : 'divider',
                            borderRadius: 1,
                            bgcolor: 'grey.100',
                            '&:hover': {
                              borderColor: formErrors.endTime ? 'error.main' : 'primary.main',
                            },
                            '&.Mui-focused': {
                              borderColor: formErrors.endTime ? 'error.main' : 'primary.main',
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
                        onClick={() => handleEndHourChange(false)}
                        disabled={!formData.overrideDate}
                        sx={{ mt: 0.5 }}
                      >
                        <ArrowDownwardIcon fontSize="small" />
                      </IconButton>
                    </Box>
                    
                    <Typography variant="h5" sx={{ mx: 1 }}>
                      :
                    </Typography>
                    
                    {/* Minutes */}
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <IconButton 
                        size="small" 
                        onClick={() => handleEndMinuteChange(true)}
                        disabled={!formData.overrideDate}
                        sx={{ mb: 0.5 }}
                      >
                        <ArrowUpwardIcon fontSize="small" />
                      </IconButton>
                      <TextField
                        value={endMinuteInput}
                        onChange={(e) => handleEndMinuteInputChange(e.target.value)}
                        onFocus={(e) => e.target.select()}
                        onBlur={handleEndMinuteInputBlur}
                        disabled={!formData.overrideDate}
                        error={!!formErrors.endTime}
                        inputProps={{
                          style: {
                            textAlign: 'center',
                            fontSize: '1.5rem',
                            fontWeight: 'bold',
                            padding: '12px',
                          },
                          maxLength: 2,
                        }}
                        autoComplete="off"
                        sx={{
                          width: 70,
                          '& .MuiOutlinedInput-root': {
                            border: 1,
                            borderColor: formErrors.endTime ? 'error.main' : 'divider',
                            borderRadius: 1,
                            bgcolor: 'grey.100',
                            '&:hover': {
                              borderColor: formErrors.endTime ? 'error.main' : 'primary.main',
                            },
                            '&.Mui-focused': {
                              borderColor: formErrors.endTime ? 'error.main' : 'primary.main',
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
                        onClick={() => handleEndMinuteChange(false)}
                        disabled={!formData.overrideDate}
                        sx={{ mt: 0.5 }}
                      >
                        <ArrowDownwardIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </Box>
                  {formErrors.endTime && (
                    <Typography variant="caption" color="error" sx={{ mt: 0.5, display: 'block', textAlign: 'center' }}>
                      {formErrors.endTime}
                    </Typography>
                  )}
                </Box>
              </Grid>

              {/* Is Available Toggle */}
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.isAvailable}
                      onChange={handleIsAvailableChange}
                      color="success"
                      sx={{
                        '& .MuiSwitch-switchBase:not(.Mui-checked)': {
                          color: 'error.main',
                        },
                        '& .MuiSwitch-switchBase:not(.Mui-checked) + .MuiSwitch-track': {
                          backgroundColor: 'error.main',
                        },
                      }}
                    />
                  }
                  label={
                    <Typography variant="body2">
                      {formData.isAvailable
                        ? 'This time range will be added to availability'
                        : 'This time range will be blocked for booking'}
                    </Typography>
                  }
                />
              </Grid>
            </Grid>
          </LocalizationProvider>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} sx={{ textTransform: 'none' }} disabled={submitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            sx={{ textTransform: 'none' }}
            disabled={submitting || !isFormValid()}
          >
            {submitting ? (
              <>
                <CircularProgress size={16} sx={{ mr: 1 }} />
                {editingOverride ? 'Updating...' : 'Creating...'}
              </>
            ) : (
              editingOverride ? 'Update Override' : 'Create Override'
            )}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={handleCloseDeleteDialog}>
        <DialogTitle>Delete Availability Override</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to delete this availability override?</Typography>
          {overrideToDelete && (
            <Box sx={{ mt: 2, p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
              <Typography variant="body2">
                <strong>Date:</strong> {formatDate(overrideToDelete.overrideDate)}
              </Typography>
              <Typography variant="body2">
                <strong>Time:</strong> {formatTime(overrideToDelete.startTime)} -{' '}
                {formatTime(overrideToDelete.endTime)}
              </Typography>
              <Typography variant="body2">
                <strong>Type:</strong> {getTypeLabel(overrideToDelete.isAvailable)}
              </Typography>
              {overrideToDelete.status === 'ACTIVE' && (
                <Alert severity="warning" sx={{ mt: 1 }}>
                  This will remove the override for the specified date and time.
                </Alert>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={handleCloseDeleteDialog}
            sx={{ textTransform: 'none' }}
            disabled={deleting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirmDelete}
            variant="contained"
            color="error"
            sx={{ textTransform: 'none' }}
            disabled={deleting}
          >
            {deleting ? (
              <>
                <CircularProgress size={16} sx={{ mr: 1 }} />
                Deleting...
              </>
            ) : (
              'Delete'
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
  );
};

export default AvailabilityOverrideComponent;

