import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import apiClient from '../utils/api';
import {
  Box,
  Typography,
  Card,
  CardContent,
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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Alert,
  CircularProgress,
  Grid,
  Checkbox,
  FormControlLabel,
  FormGroup,
  Snackbar,
  Popover,
  InputLabel as MuiInputLabel,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import { DateCalendar } from '@mui/x-date-pickers/DateCalendar';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';

const AvailabilityRuleComponent = () => {
  const { t } = useTranslation();
  
  const DAYS_OF_WEEK = [
    { value: 'MONDAY', label: t('admin.sessionConfiguration.availabilityRules.monday') },
    { value: 'TUESDAY', label: t('admin.sessionConfiguration.availabilityRules.tuesday') },
    { value: 'WEDNESDAY', label: t('admin.sessionConfiguration.availabilityRules.wednesday') },
    { value: 'THURSDAY', label: t('admin.sessionConfiguration.availabilityRules.thursday') },
    { value: 'FRIDAY', label: t('admin.sessionConfiguration.availabilityRules.friday') },
    { value: 'SATURDAY', label: t('admin.sessionConfiguration.availabilityRules.saturday') },
    { value: 'SUNDAY', label: t('admin.sessionConfiguration.availabilityRules.sunday') },
  ];

  const STATUS_OPTIONS = [
    { value: 'ACTIVE', label: t('admin.sessionConfiguration.availabilityRules.active') },
    { value: 'INACTIVE', label: t('admin.sessionConfiguration.availabilityRules.inactive') },
    { value: 'ARCHIVED', label: t('admin.sessionConfiguration.availabilityRules.archived') },
  ];
  
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [ruleToDelete, setRuleToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  const [formData, setFormData] = useState({
    daysOfWeek: [],
    availableStartTime: '',
    availableEndTime: '',
    ruleStartDate: null,
    ruleEndDate: null,
    ruleStatus: 'ACTIVE',
  });
  const [dateFromPopoverOpen, setDateFromPopoverOpen] = useState(false);
  const [dateToPopoverOpen, setDateToPopoverOpen] = useState(false);
  const [dateFromAnchorEl, setDateFromAnchorEl] = useState(null);
  const [dateToAnchorEl, setDateToAnchorEl] = useState(null);

  // Fetch active availability rules
  const fetchRules = async (signal = null) => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get('/api/v1/admin/booking/availability/rule/active', {
        signal,
        timeout: 10000,
      });
      setRules(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      // Don't set error if request was aborted
      if (err.name === 'AbortError' || err.name === 'CanceledError' || err.code === 'ERR_CANCELED') {
        return;
      }
      console.error('Error fetching availability rules:', err);
      let errorMessage = t('admin.sessionConfiguration.availabilityRules.failedToLoad');
      if (err.response?.status === 401) {
        errorMessage = t('admin.sessionConfiguration.availabilityRules.unauthorized');
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

    const loadRules = async () => {
      await fetchRules(controller.signal);
    };

    loadRules();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, []);

  // Format helpers
  const formatDaysOfWeek = (days) => {
    if (!Array.isArray(days) || days.length === 0) return t('admin.sessionConfiguration.availabilityRules.none');
    const dayLabels = days.map((day) => {
      const dayObj = DAYS_OF_WEEK.find((d) => d.value === day);
      return dayObj ? dayObj.label.substring(0, 3) : day;
    });
    return dayLabels.join(', ');
  };

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
      case 'INACTIVE':
        return 'default';
      case 'ARCHIVED':
        return 'error';
      default:
        return 'default';
    }
  };

  // Form handlers
  const handleOpenDialog = (rule = null) => {
    if (rule) {
      setEditingRule(rule);
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
      
      setFormData({
        daysOfWeek: Array.isArray(rule.daysOfWeek) ? [...rule.daysOfWeek] : [],
        availableStartTime: formatTimeForInput(rule.availableStartTime),
        availableEndTime: formatTimeForInput(rule.availableEndTime),
        ruleStartDate: rule.ruleStartDate ? dayjs(rule.ruleStartDate) : null,
        ruleEndDate: rule.ruleEndDate ? dayjs(rule.ruleEndDate) : null,
        ruleStatus: rule.ruleStatus || 'ACTIVE',
      });
    } else {
      setEditingRule(null);
      setFormData({
        daysOfWeek: [],
        availableStartTime: '',
        availableEndTime: '',
        ruleStartDate: null,
        ruleEndDate: null,
        ruleStatus: 'ACTIVE',
      });
    }
    setDateFromPopoverOpen(false);
    setDateToPopoverOpen(false);
    setDateFromAnchorEl(null);
    setDateToAnchorEl(null);
    setFormErrors({});
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingRule(null);
    setFormData({
      daysOfWeek: [],
      availableStartTime: '',
      availableEndTime: '',
      ruleStartDate: null,
      ruleEndDate: null,
      ruleStatus: 'ACTIVE',
    });
    setDateFromPopoverOpen(false);
    setDateToPopoverOpen(false);
    setDateFromAnchorEl(null);
    setDateToAnchorEl(null);
    setFormErrors({});
  };

  const handleDayChange = (day) => {
    setFormData((prev) => {
      const newDays = prev.daysOfWeek.includes(day)
        ? prev.daysOfWeek.filter((d) => d !== day)
        : [...prev.daysOfWeek, day];
      return { ...prev, daysOfWeek: newDays };
    });
    // Clear error when user makes a change
    if (formErrors.daysOfWeek) {
      setFormErrors((prev) => ({ ...prev, daysOfWeek: '' }));
    }
  };

  const handleTimeChange = (field) => (e) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));
    // Clear error when user makes a change
    if (formErrors[field]) {
      setFormErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const handleDateChange = (field) => (newValue) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: newValue };
      // Set default time when date is selected and time is empty
      if (newValue) {
        if (field === 'ruleStartDate' && !prev.availableStartTime) {
          updated.availableStartTime = '09:00';
        }
        if (field === 'ruleEndDate' && !prev.availableEndTime) {
          updated.availableEndTime = '18:00';
        }
      }
      return updated;
    });
    // Clear error when user makes a change
    if (formErrors[field]) {
      setFormErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const handleStatusChange = (e) => {
    setFormData((prev) => ({ ...prev, ruleStatus: e.target.value }));
  };

  // Check if form has all required fields filled
  const isFormValid = () => {
    return (
      formData.daysOfWeek &&
      formData.daysOfWeek.length > 0 &&
      formData.availableStartTime &&
      formData.availableStartTime.trim() !== '' &&
      formData.availableEndTime &&
      formData.availableEndTime.trim() !== '' &&
      formData.ruleStartDate &&
      formData.ruleEndDate &&
      formData.ruleStatus
    );
  };

  // Validation
  const validateForm = () => {
    const errors = {};

    if (!formData.daysOfWeek || formData.daysOfWeek.length === 0) {
      errors.daysOfWeek = t('admin.sessionConfiguration.availabilityRules.atLeastOneDay');
    }

    if (!formData.availableStartTime || formData.availableStartTime.trim() === '') {
      errors.availableStartTime = t('admin.sessionConfiguration.availabilityRules.startTimeRequired');
    }

    if (!formData.availableEndTime || formData.availableEndTime.trim() === '') {
      errors.availableEndTime = t('admin.sessionConfiguration.availabilityRules.endTimeRequired');
    }

    if (formData.availableStartTime && formData.availableEndTime) {
      // Compare time strings (HH:mm format)
      const startParts = formData.availableStartTime.split(':');
      const endParts = formData.availableEndTime.split(':');
      if (startParts.length === 2 && endParts.length === 2) {
        const startMinutes = parseInt(startParts[0], 10) * 60 + parseInt(startParts[1], 10);
        const endMinutes = parseInt(endParts[0], 10) * 60 + parseInt(endParts[1], 10);
        if (endMinutes <= startMinutes) {
          errors.availableEndTime = t('admin.sessionConfiguration.availabilityRules.endTimeAfterStart');
        }
      }
    }

    if (!formData.ruleStartDate) {
      errors.ruleStartDate = t('admin.sessionConfiguration.availabilityRules.startDateRequired');
    }

    if (!formData.ruleEndDate) {
      errors.ruleEndDate = t('admin.sessionConfiguration.availabilityRules.endDateRequired');
    }

    if (formData.ruleStartDate && formData.ruleEndDate) {
      if (formData.ruleEndDate.isBefore(formData.ruleStartDate)) {
        errors.ruleEndDate = t('admin.sessionConfiguration.availabilityRules.endDateAfterStart');
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
        daysOfWeek: formData.daysOfWeek,
        availableStartTime: formatTimeForAPI(formData.availableStartTime),
        availableEndTime: formatTimeForAPI(formData.availableEndTime),
        ruleStartDate: formData.ruleStartDate.format('YYYY-MM-DD'),
        ruleEndDate: formData.ruleEndDate.format('YYYY-MM-DD'),
        ruleStatus: formData.ruleStatus,
      };

      let response;
      if (editingRule) {
        // Update existing rule
        payload.id = editingRule.id;
        response = await apiClient.put(
          `/api/v1/admin/booking/availability/rule/${editingRule.id}`,
          payload
        );
        setSuccessMessage(t('admin.sessionConfiguration.availabilityRules.updatedSuccessfully'));
      } else {
        // Create new rule
        response = await apiClient.post(
          '/api/v1/admin/booking/availability/rule',
          payload
        );
        setSuccessMessage(t('admin.sessionConfiguration.availabilityRules.createdSuccessfully'));
      }

      handleCloseDialog();
      fetchRules();
    } catch (err) {
      console.error('Error saving availability rule:', err);
      let errorMessage = t('admin.sessionConfiguration.availabilityRules.failedToSave');
      if (err.response?.status === 400) {
        errorMessage = err.response.data?.message || t('admin.sessionConfiguration.availabilityRules.validationError');
      } else if (err.response?.status === 401) {
        errorMessage = t('admin.sessionConfiguration.availabilityRules.unauthorized');
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
  const handleDeleteClick = (rule) => {
    setRuleToDelete(rule);
    setDeleteDialogOpen(true);
  };

  const handleCloseDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setRuleToDelete(null);
  };

  const handleConfirmDelete = async () => {
    if (!ruleToDelete) return;

    setDeleting(true);
    setError(null);

    try {
      await apiClient.delete(`/api/v1/admin/booking/availability/rule/${ruleToDelete.id}`);
      setSuccessMessage(t('admin.sessionConfiguration.availabilityRules.deletedSuccessfully'));
      handleCloseDeleteDialog();
      fetchRules();
    } catch (err) {
      console.error('Error deleting availability rule:', err);
      let errorMessage = t('admin.sessionConfiguration.availabilityRules.failedToDelete');
      if (err.response?.status === 401) {
        errorMessage = t('admin.sessionConfiguration.availabilityRules.unauthorized');
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
        <Typography variant="h6">{t('admin.sessionConfiguration.availabilityRules.title')}</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
          sx={{ textTransform: 'none' }}
        >
          {t('admin.sessionConfiguration.availabilityRules.addRule')}
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
      ) : rules.length > 0 ? (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>{t('admin.sessionConfiguration.availabilityRules.id')}</TableCell>
                <TableCell>{t('admin.sessionConfiguration.availabilityRules.daysOfWeek')}</TableCell>
                <TableCell>{t('admin.sessionConfiguration.availabilityRules.timeRange')}</TableCell>
                <TableCell>{t('admin.sessionConfiguration.availabilityRules.dateRange')}</TableCell>
                <TableCell>{t('admin.sessionConfiguration.availabilityRules.status')}</TableCell>
                <TableCell>{t('admin.sessionConfiguration.availabilityRules.timezone')}</TableCell>
                <TableCell align="right">{t('admin.sessionConfiguration.availabilityRules.actions')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rules.map((rule) => (
                <TableRow
                  key={rule.id}
                  sx={{
                    ...(rule.ruleStatus === 'ACTIVE' && {
                      bgcolor: 'action.hover',
                    }),
                  }}
                >
                  <TableCell>{rule.id}</TableCell>
                  <TableCell>{formatDaysOfWeek(rule.daysOfWeek)}</TableCell>
                  <TableCell>
                    {formatTime(rule.availableStartTime)} - {formatTime(rule.availableEndTime)}
                  </TableCell>
                  <TableCell>
                    {formatDate(rule.ruleStartDate)} - {formatDate(rule.ruleEndDate)}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={STATUS_OPTIONS.find(s => s.value === rule.ruleStatus)?.label || rule.ruleStatus}
                      color={getStatusColor(rule.ruleStatus)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{rule.timezone || 'N/A'}</TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      onClick={() => handleOpenDialog(rule)}
                      color="primary"
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleDeleteClick(rule)}
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
        <Alert severity="info">{t('admin.sessionConfiguration.availabilityRules.noRulesFound')}</Alert>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>{editingRule ? t('admin.sessionConfiguration.availabilityRules.editRule') : t('admin.sessionConfiguration.availabilityRules.createRule')}</DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {formData.ruleStatus === 'ACTIVE' && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              {t('admin.sessionConfiguration.availabilityRules.willBeValidated')}
            </Alert>
          )}

          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              {/* Row 1: Rule Start Date and Rule End Date */}
              <Grid item xs={12} sm={6}>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
                    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 0 }}>
                      <MuiInputLabel htmlFor="date-from" sx={{ px: 0.5, fontSize: '0.875rem', mb: 0.5, lineHeight: 1.2 }}>
                        {t('admin.sessionConfiguration.availabilityRules.ruleStartDate')}
                      </MuiInputLabel>
                      <Box>
                        <Button
                          variant="outlined"
                          id="date-from"
                          fullWidth
                          onClick={(e) => {
                            setDateFromAnchorEl(e.currentTarget);
                            setDateFromPopoverOpen(true);
                          }}
                          endIcon={<KeyboardArrowDownIcon />}
                          sx={{
                            justifyContent: 'space-between',
                            textTransform: 'none',
                            fontWeight: 'normal',
                            height: '56px',
                            ...(formErrors.ruleStartDate && {
                              borderColor: 'error.main',
                            }),
                          }}
                        >
                          {formData.ruleStartDate
                            ? formData.ruleStartDate.format('MMM D, YYYY')
                            : t('admin.sessionConfiguration.availabilityRules.pickADate')}
                        </Button>
                        <Popover
                          open={dateFromPopoverOpen}
                          anchorEl={dateFromAnchorEl}
                          onClose={() => {
                            setDateFromPopoverOpen(false);
                            setDateFromAnchorEl(null);
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
                              value={formData.ruleStartDate}
                              onChange={(date) => {
                                handleDateChange('ruleStartDate')(date);
                                setDateFromPopoverOpen(false);
                                setDateFromAnchorEl(null);
                              }}
                              minDate={dayjs()}
                            />
                          </Box>
                        </Popover>
                      </Box>
                      {formErrors.ruleStartDate && (
                        <Typography variant="caption" color="error" sx={{ mt: 0.5, display: 'block' }}>
                          {formErrors.ruleStartDate}
                        </Typography>
                      )}
                    </Box>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0, width: 120, flexShrink: 0 }}>
                      <MuiInputLabel
                        htmlFor="time-from"
                        sx={{ px: 0.5, fontSize: '0.875rem', mb: 0.5, visibility: 'hidden', height: '20px', lineHeight: 1.2 }}
                      >
                        {t('admin.sessionConfiguration.availabilityRules.startTime')}
                      </MuiInputLabel>
                      <TextField
                        type="time"
                        id="time-from"
                        value={formData.availableStartTime}
                        onChange={handleTimeChange('availableStartTime')}
                        error={!!formErrors.availableStartTime}
                        helperText={formErrors.availableStartTime}
                        disabled={!formData.ruleStartDate}
                        inputProps={{
                          step: 1,
                          style: {
                            WebkitAppearance: 'none',
                            MozAppearance: 'textfield',
                          },
                        }}
                        sx={{
                          '& input[type="time"]::-webkit-calendar-picker-indicator': {
                            display: 'none',
                          },
                          '& .MuiFormHelperText-root': {
                            marginTop: 0.5,
                            marginBottom: 0,
                          },
                        }}
                      />
                    </Box>
                  </Box>
              </Grid>

              <Grid item xs={12} sm={6}>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
                    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 0 }}>
                      <MuiInputLabel htmlFor="date-to" sx={{ px: 0.5, fontSize: '0.875rem', mb: 0.5, lineHeight: 1.2 }}>
                        {t('admin.sessionConfiguration.availabilityRules.ruleEndDate')}
                      </MuiInputLabel>
                      <Box>
                        <Button
                          variant="outlined"
                          id="date-to"
                          fullWidth
                          onClick={(e) => {
                            setDateToAnchorEl(e.currentTarget);
                            setDateToPopoverOpen(true);
                          }}
                          endIcon={<KeyboardArrowDownIcon />}
                          sx={{
                            justifyContent: 'space-between',
                            textTransform: 'none',
                            fontWeight: 'normal',
                            height: '56px',
                            ...(formErrors.ruleEndDate && {
                              borderColor: 'error.main',
                            }),
                          }}
                        >
                          {formData.ruleEndDate
                            ? formData.ruleEndDate.format('MMM D, YYYY')
                            : t('admin.sessionConfiguration.availabilityRules.pickADate')}
                        </Button>
                        <Popover
                          open={dateToPopoverOpen}
                          anchorEl={dateToAnchorEl}
                          onClose={() => {
                            setDateToPopoverOpen(false);
                            setDateToAnchorEl(null);
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
                              value={formData.ruleEndDate}
                              onChange={(date) => {
                                handleDateChange('ruleEndDate')(date);
                                setDateToPopoverOpen(false);
                                setDateToAnchorEl(null);
                              }}
                              minDate={formData.ruleStartDate || dayjs()}
                            />
                          </Box>
                        </Popover>
                      </Box>
                      {formErrors.ruleEndDate && (
                        <Typography variant="caption" color="error" sx={{ mt: 0.5, display: 'block' }}>
                          {formErrors.ruleEndDate}
                        </Typography>
                      )}
                    </Box>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0, width: 120, flexShrink: 0 }}>
                      <MuiInputLabel
                        htmlFor="time-to"
                        sx={{ px: 0.5, fontSize: '0.875rem', mb: 0.5, visibility: 'hidden', height: '20px', lineHeight: 1.2 }}
                      >
                        {t('admin.sessionConfiguration.availabilityRules.endTime')}
                      </MuiInputLabel>
                      <TextField
                        type="time"
                        id="time-to"
                        value={formData.availableEndTime}
                        onChange={handleTimeChange('availableEndTime')}
                        error={!!formErrors.availableEndTime}
                        helperText={formErrors.availableEndTime}
                        disabled={!formData.ruleEndDate}
                        inputProps={{
                          step: 1,
                          style: {
                            WebkitAppearance: 'none',
                            MozAppearance: 'textfield',
                          },
                        }}
                        sx={{
                          '& input[type="time"]::-webkit-calendar-picker-indicator': {
                            display: 'none',
                          },
                          '& .MuiFormHelperText-root': {
                            marginTop: 0.5,
                            marginBottom: 0,
                          },
                        }}
                      />
                  </Box>
                </Box>
              </Grid>

              {/* Row 2: Days of Week and Rule Status */}
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required error={!!formErrors.daysOfWeek}>
                  <InputLabel>{t('admin.sessionConfiguration.availabilityRules.daysOfWeekLabel')}</InputLabel>
                  <Select
                    multiple
                    value={formData.daysOfWeek}
                    onChange={(e) => {
                      const value = e.target.value;
                      setFormData((prev) => ({ ...prev, daysOfWeek: typeof value === 'string' ? value.split(',') : value }));
                      if (formErrors.daysOfWeek) {
                        setFormErrors((prev) => ({ ...prev, daysOfWeek: '' }));
                      }
                    }}
                    label={t('admin.sessionConfiguration.availabilityRules.daysOfWeekLabel')}
                    renderValue={(selected) => {
                      if (!selected || selected.length === 0) return '';
                      return selected
                        .map((day) => {
                          const dayObj = DAYS_OF_WEEK.find((d) => d.value === day);
                          return dayObj ? dayObj.label : day;
                        })
                        .join(', ');
                    }}
                  >
                    {DAYS_OF_WEEK.map((day) => (
                      <MenuItem key={day.value} value={day.value}>
                        <Checkbox checked={formData.daysOfWeek.includes(day.value)} />
                        {day.label}
                      </MenuItem>
                    ))}
                  </Select>
                  {formErrors.daysOfWeek && (
                    <Typography variant="caption" color="error" sx={{ mt: 0.5, display: 'block' }}>
                      {formErrors.daysOfWeek}
                    </Typography>
                  )}
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required>
                  <InputLabel>{t('admin.sessionConfiguration.availabilityRules.ruleStatus')}</InputLabel>
                  <Select
                    value={formData.ruleStatus}
                    onChange={handleStatusChange}
                    label={t('admin.sessionConfiguration.availabilityRules.ruleStatus')}
                  >
                    {STATUS_OPTIONS.map((status) => (
                      <MenuItem key={status.value} value={status.value}>
                        {status.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </LocalizationProvider>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} sx={{ textTransform: 'none' }} disabled={submitting}>
            {t('admin.sessionConfiguration.availabilityRules.cancel')}
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
                {editingRule ? t('admin.sessionConfiguration.availabilityRules.updating') : t('admin.sessionConfiguration.availabilityRules.creating')}
              </>
            ) : (
              editingRule ? t('admin.sessionConfiguration.availabilityRules.updateRule') : t('admin.sessionConfiguration.availabilityRules.createRule')
            )}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={handleCloseDeleteDialog}>
        <DialogTitle>{t('admin.sessionConfiguration.availabilityRules.deleteRule')}</DialogTitle>
        <DialogContent>
          <Typography>
            {t('admin.sessionConfiguration.availabilityRules.confirmDelete')}
          </Typography>
          {ruleToDelete && (
            <Box sx={{ mt: 2, p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
              <Typography variant="body2">
                <strong>{t('admin.sessionConfiguration.availabilityRules.days')}</strong> {formatDaysOfWeek(ruleToDelete.daysOfWeek)}
              </Typography>
              <Typography variant="body2">
                <strong>{t('admin.sessionConfiguration.availabilityRules.time')}</strong> {formatTime(ruleToDelete.availableStartTime)} -{' '}
                {formatTime(ruleToDelete.availableEndTime)}
              </Typography>
              <Typography variant="body2">
                <strong>{t('admin.sessionConfiguration.availabilityRules.dateRangeLabel')}</strong> {formatDate(ruleToDelete.ruleStartDate)} -{' '}
                {formatDate(ruleToDelete.ruleEndDate)}
              </Typography>
              {ruleToDelete.ruleStatus === 'ACTIVE' && (
                <Alert severity="warning" sx={{ mt: 1 }}>
                  {t('admin.sessionConfiguration.availabilityRules.willRemoveAvailability')}
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
            {t('admin.sessionConfiguration.availabilityRules.cancel')}
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
                {t('admin.sessionConfiguration.availabilityRules.deleting')}
              </>
            ) : (
              t('admin.sessionConfiguration.availabilityRules.delete')
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

export default AvailabilityRuleComponent;

