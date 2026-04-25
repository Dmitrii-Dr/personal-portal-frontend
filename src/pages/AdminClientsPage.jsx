import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  Snackbar,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import {
  deleteAdminUser,
  fetchAdminUsers,
  fetchAdminUserSettings,
  updateAdminUser,
  updateAdminUserSettings,
} from '../utils/api';
import { getAxiosErrorMessage } from '../utils/apiErrors';
import {
  extractTimezoneOffset,
  fetchTimezones,
  findTimezoneIdByOffset,
  sortTimezonesByOffset,
} from '../utils/timezoneService';

const getClientLocked = (client) => Boolean(client?.isLocked ?? client?.locked);
const currencyOptions = [
  { value: 'Rubles', labelKey: 'admin.clients.currencyRubles' },
  { value: 'Tenge', labelKey: 'admin.clients.currencyTenge' },
  { value: 'USD', labelKey: 'admin.clients.currencyUsd' },
];

const getClientName = (client) => {
  if (!client) return '';
  const name = `${client.firstName || ''} ${client.lastName || ''}`.trim();
  return name || client.email || client.phoneNumber || client.id;
};

const AdminClientsPage = () => {
  const { t } = useTranslation();
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    phoneNumber: '',
    isLocked: false,
  });
  const [settings, setSettings] = useState(null);
  const [settingsFormData, setSettingsFormData] = useState({
    timezone: '',
    currency: '',
    emailNotificationEnabled: true,
  });
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [timezones, setTimezones] = useState([]);
  const [timezonesLoading, setTimezonesLoading] = useState(false);
  const [timezonesError, setTimezonesError] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [lockDialogOpen, setLockDialogOpen] = useState(false);
  const deleteConfirmationWord = t('admin.clients.deleteConfirmationWord');

  const getClientId = (client) => String(client?.id ?? client?.userId ?? '');

  const normalizeCurrencyValue = (value) => {
    if (!value) return '';
    const option = currencyOptions.find(
      (currency) => currency.value === value || t(currency.labelKey) === value
    );
    return option?.value || '';
  };

  const getSettingsFormData = (data) => ({
    timezone: extractTimezoneOffset(data?.timezone) || '',
    currency: normalizeCurrencyValue(data?.currency),
    emailNotificationEnabled: data?.emailNotificationEnabled ?? true,
  });

  const resetSettingsForm = () => {
    setSettings(null);
    setSettingsFormData({
      timezone: '',
      currency: '',
      emailNotificationEnabled: true,
    });
  };

  const loadClients = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchAdminUsers();
      const list = Array.isArray(data) ? data : [];
      setClients(list);
      setSelectedClient((prevSelected) => {
        if (!prevSelected) return null;
        return list.find((client) => getClientId(client) === getClientId(prevSelected)) || null;
      });
    } catch (err) {
      setError(getAxiosErrorMessage(err, t('admin.clients.loadFailed')));
      setClients([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClients();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadTimezones = async () => {
      setTimezonesLoading(true);
      setTimezonesError('');
      try {
        const data = await fetchTimezones();
        if (!isMounted) return;
        setTimezones(sortTimezonesByOffset(Array.isArray(data) ? data : []));
      } catch (err) {
        if (!isMounted) return;
        setTimezones([]);
        setTimezonesError(getAxiosErrorMessage(err, t('admin.clients.timezonesLoadFailed')));
      } finally {
        if (isMounted) {
          setTimezonesLoading(false);
        }
      }
    };

    loadTimezones();

    return () => {
      isMounted = false;
    };
  }, [t]);

  useEffect(() => {
    if (!selectedClient) {
      setFormData({
        email: '',
        firstName: '',
        lastName: '',
        phoneNumber: '',
        isLocked: false,
      });
      resetSettingsForm();
      return;
    }

    setFormData({
      email: selectedClient.email || '',
      firstName: selectedClient.firstName || '',
      lastName: selectedClient.lastName || '',
      phoneNumber: selectedClient.phoneNumber || '',
      isLocked: getClientLocked(selectedClient),
    });
  }, [selectedClient]);

  useEffect(() => {
    if (!selectedClient) return undefined;

    let isMounted = true;

    const loadSettings = async () => {
      setSettingsLoading(true);
      setError('');
      resetSettingsForm();
      try {
        const data = await fetchAdminUserSettings(getClientId(selectedClient));
        if (!isMounted) return;
        setSettings(data);
        setSettingsFormData(getSettingsFormData(data));
      } catch (err) {
        if (!isMounted) return;
        setError(getAxiosErrorMessage(err, t('admin.clients.settingsLoadFailed')));
      } finally {
        if (isMounted) {
          setSettingsLoading(false);
        }
      }
    };

    loadSettings();

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClient]);

  const handleFieldChange = (field) => (event) => {
    if (field === 'isLocked') {
      const nextLockedValue = event.target.checked;
      if (nextLockedValue) {
        setLockDialogOpen(true);
        return;
      }
      setFormData((prev) => ({ ...prev, isLocked: false }));
      setError('');
      return;
    }

    const value = event.target.value;
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError('');
  };

  const handleSettingsFieldChange = (field) => (event) => {
    const value = field === 'emailNotificationEnabled' ? event.target.checked : event.target.value;
    setSettingsFormData((prev) => ({ ...prev, [field]: value }));
    setError('');
  };

  const handleClientChange = (_, nextClient) => {
    setError('');
    setSelectedClient(nextClient);
  };

  const confirmLockClient = () => {
    setFormData((prev) => ({ ...prev, isLocked: true }));
    setLockDialogOpen(false);
    setError('');
  };

  const validateForm = () => {
    const normalizedEmail = formData.email.trim();
    if (normalizedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError(t('admin.clients.emailInvalid'));
      return false;
    }
    if (formData.firstName.length > 100) {
      setError(t('admin.clients.firstNameMaxLength'));
      return false;
    }
    if (formData.lastName.length > 100) {
      setError(t('admin.clients.lastNameMaxLength'));
      return false;
    }
    if (formData.phoneNumber.length > 20) {
      setError(t('admin.clients.phoneMaxLength'));
      return false;
    }
    return true;
  };

  const validateSettingsForm = () => {
    if (!settings) return true;
    if (!settingsFormData.timezone) {
      setError(t('admin.clients.timezoneRequired'));
      return false;
    }
    if (!settingsFormData.currency) {
      setError(t('admin.clients.currencyRequired'));
      return false;
    }
    if (!findTimezoneIdByOffset(settingsFormData.timezone, timezones)) {
      setError(t('admin.clients.timezoneInvalid'));
      return false;
    }
    return true;
  };

  const isProfileChanged = () => {
    if (!selectedClient) return false;
    return (
      formData.email.trim() !== (selectedClient.email || '') ||
      formData.firstName !== (selectedClient.firstName || '') ||
      formData.lastName !== (selectedClient.lastName || '') ||
      formData.phoneNumber !== (selectedClient.phoneNumber || '') ||
      formData.isLocked !== getClientLocked(selectedClient)
    );
  };

  const isSettingsChanged = () => {
    if (!settings) return false;
    const originalSettingsFormData = getSettingsFormData(settings);
    return (
      settingsFormData.timezone !== originalSettingsFormData.timezone ||
      settingsFormData.currency !== originalSettingsFormData.currency ||
      settingsFormData.emailNotificationEnabled !== originalSettingsFormData.emailNotificationEnabled
    );
  };

  const handleSave = async () => {
    if (!selectedClient || !validateForm() || !validateSettingsForm()) return;

    const profileChanged = isProfileChanged();
    const settingsChanged = isSettingsChanged();
    if (!profileChanged && !settingsChanged) return;

    setSaving(true);
    setError('');
    const errors = [];
    let savedProfile = false;
    let savedSettings = false;
    try {
      if (profileChanged) {
        try {
          const updated = await updateAdminUser(getClientId(selectedClient), {
            email: formData.email.trim(),
            firstName: formData.firstName,
            lastName: formData.lastName,
            phoneNumber: formData.phoneNumber,
            isLocked: formData.isLocked,
          });
          setClients((prev) => prev.map((client) => (getClientId(client) === getClientId(updated) ? updated : client)));
          setSelectedClient(updated);
          savedProfile = true;
        } catch (err) {
          errors.push(getAxiosErrorMessage(err, t('admin.clients.updateFailed')));
        }
      }

      if (settingsChanged) {
        try {
          const timezoneId = findTimezoneIdByOffset(settingsFormData.timezone, timezones);
          const updatedSettings = await updateAdminUserSettings(getClientId(selectedClient), {
            timezoneId,
            currency: settingsFormData.currency,
            emailNotificationEnabled: settingsFormData.emailNotificationEnabled,
          });
          setSettings(updatedSettings);
          setSettingsFormData(getSettingsFormData(updatedSettings));
          savedSettings = true;
        } catch (err) {
          errors.push(getAxiosErrorMessage(err, t('admin.clients.settingsUpdateFailed')));
        }
      }

      if (errors.length > 0) {
        setError(errors.join(' '));
        if (savedProfile || savedSettings) {
          setSuccessMessage(t('admin.clients.partialUpdateSuccess'));
        }
        return;
      }

      if (savedProfile || savedSettings) {
        setSuccessMessage(t('admin.clients.updateSuccess'));
      }
    } catch (err) {
      setError(getAxiosErrorMessage(err, t('admin.clients.updateFailed')));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedClient || deleteConfirmation !== deleteConfirmationWord) return;

    setDeleting(true);
    setError('');
    try {
      await deleteAdminUser(getClientId(selectedClient));
      setClients((prev) => {
        const next = prev.filter((client) => getClientId(client) !== getClientId(selectedClient));
        setSelectedClient(null);
        return next;
      });
      setDeleteDialogOpen(false);
      setDeleteConfirmation('');
      setSuccessMessage(t('admin.clients.deleteSuccess'));
    } catch (err) {
      setError(getAxiosErrorMessage(err, t('admin.clients.deleteFailed')));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 1180, mx: 'auto', p: { xs: 1.5, sm: 3 } }}>
      <Stack spacing={3}>
        <Box sx={{ px: { xs: 0.5, sm: 0 } }}>
          <Typography variant="h4" component="h1" gutterBottom>
            {t('admin.clients.title')}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {t('admin.clients.description')}
          </Typography>
        </Box>

        {error && <Alert severity="error">{error}</Alert>}

        <Stack spacing={2.5}>
          <Card sx={{ borderRadius: 3 }}>
            <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
              <Stack spacing={2}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
                  <Typography variant="h6">{t('admin.clients.selectClient')}</Typography>
                  {loading && <CircularProgress size={20} />}
                </Box>

                <Autocomplete
                  fullWidth
                  options={clients}
                  value={selectedClient}
                  disabled={loading || clients.length === 0}
                  getOptionLabel={getClientName}
                  isOptionEqualToValue={(option, value) => getClientId(option) === getClientId(value)}
                  onChange={handleClientChange}
                  renderInput={(params) => <TextField {...params} label={t('admin.clients.client')} />}
                />

                {!loading && clients.length === 0 && <Alert severity="info">{t('admin.clients.noClients')}</Alert>}

                {selectedClient && (
                  <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                    <Chip
                      size="small"
                      color={selectedClient.isVerified ? 'success' : 'default'}
                      label={selectedClient.isVerified ? t('admin.clients.verified') : t('admin.clients.notVerified')}
                    />
                    <Chip
                      size="small"
                      color={getClientLocked(selectedClient) ? 'error' : 'success'}
                      label={getClientLocked(selectedClient) ? t('admin.clients.locked') : t('admin.clients.active')}
                    />
                  </Stack>
                )}
              </Stack>
            </CardContent>
          </Card>

          <Card sx={{ borderRadius: 3, opacity: selectedClient ? 1 : 0.7 }}>
            <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
              <Stack spacing={2.5}>
                <Typography variant="h6">{t('admin.clients.details')}</Typography>

                  {!selectedClient ? (
                    <Alert severity="info">{t('admin.clients.selectClientHint')}</Alert>
                  ) : (
                    <>
                      <TextField
                        fullWidth
                        label={t('admin.clients.email')}
                        type="email"
                        value={formData.email}
                        onChange={handleFieldChange('email')}
                        disabled={saving || deleting}
                      />
                      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
                        <Box>
                          <TextField
                            fullWidth
                            label={t('admin.clients.firstName')}
                            value={formData.firstName}
                            onChange={handleFieldChange('firstName')}
                            disabled={saving || deleting}
                          />
                        </Box>
                        <Box>
                          <TextField
                            fullWidth
                            label={t('admin.clients.lastName')}
                            value={formData.lastName}
                            onChange={handleFieldChange('lastName')}
                            disabled={saving || deleting}
                          />
                        </Box>
                      </Box>
                      <TextField
                        fullWidth
                        label={t('admin.clients.phoneNumber')}
                        value={formData.phoneNumber}
                        onChange={handleFieldChange('phoneNumber')}
                        disabled={saving || deleting}
                      />
                      <FormControlLabel
                        control={
                          <Switch
                            checked={formData.isLocked}
                            onChange={handleFieldChange('isLocked')}
                            disabled={saving || deleting}
                            color={formData.isLocked ? 'error' : 'success'}
                          />
                        }
                        label={formData.isLocked ? t('admin.clients.locked') : t('admin.clients.active')}
                      />
                      <Alert severity={formData.isLocked ? 'error' : 'success'}>
                        {formData.isLocked ? t('admin.clients.lockedWarning') : t('admin.clients.activeWarning')}
                      </Alert>
                      <Typography variant="h6" sx={{ pt: 1 }}>
                        {t('admin.clients.settings')}
                      </Typography>
                      {settingsLoading ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <CircularProgress size={20} />
                          <Typography variant="body2" color="text.secondary">
                            {t('admin.clients.settingsLoading')}
                          </Typography>
                        </Box>
                      ) : settings ? (
                        <>
                          {timezonesError && <Alert severity="warning">{timezonesError}</Alert>}
                          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
                            <TextField
                              select
                              fullWidth
                              label={t('admin.clients.timezone')}
                              value={settingsFormData.timezone}
                              onChange={handleSettingsFieldChange('timezone')}
                              disabled={saving || deleting || timezonesLoading}
                            >
                              {timezonesLoading ? (
                                <MenuItem disabled value="">
                                  {t('admin.clients.timezonesLoading')}
                                </MenuItem>
                              ) : (
                                timezones.map((timezone) => (
                                  <MenuItem key={timezone.id} value={timezone.offset}>
                                    {t(`pages.profile.timezones.${timezone.id}`, { defaultValue: timezone.displayName })} ({timezone.offset})
                                  </MenuItem>
                                ))
                              )}
                            </TextField>
                            <TextField
                              select
                              fullWidth
                              label={t('admin.clients.currency')}
                              value={settingsFormData.currency}
                              onChange={handleSettingsFieldChange('currency')}
                              disabled={saving || deleting}
                            >
                              {currencyOptions.map((currency) => (
                                <MenuItem key={currency.value} value={currency.value}>
                                  {t(currency.labelKey)}
                                </MenuItem>
                              ))}
                            </TextField>
                          </Box>
                          <FormControlLabel
                            control={
                              <Switch
                                checked={settingsFormData.emailNotificationEnabled}
                                onChange={handleSettingsFieldChange('emailNotificationEnabled')}
                                disabled={saving || deleting}
                              />
                            }
                            label={t('admin.clients.emailNotifications')}
                          />
                        </>
                      ) : (
                        <Alert severity="warning">{t('admin.clients.settingsUnavailable')}</Alert>
                      )}
                      <Stack direction={{ xs: 'column-reverse', sm: 'row' }} spacing={2} justifyContent="space-between">
                        <Button
                          variant="outlined"
                          color="error"
                          startIcon={<DeleteIcon />}
                          onClick={() => setDeleteDialogOpen(true)}
                          disabled={saving || deleting}
                          sx={{ textTransform: 'none' }}
                        >
                          {t('admin.clients.deleteClient')}
                        </Button>
                        <Button
                          variant="contained"
                          startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <SaveIcon />}
                          onClick={handleSave}
                          disabled={saving || deleting}
                          sx={{ textTransform: 'none', minWidth: { sm: 220 } }}
                        >
                          {saving ? t('admin.clients.saving') : t('admin.clients.saveChanges')}
                        </Button>
                      </Stack>
                    </>
                  )}
              </Stack>
            </CardContent>
          </Card>
        </Stack>
      </Stack>

      <Dialog open={deleteDialogOpen} onClose={() => !deleting && setDeleteDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t('admin.clients.deleteDialogTitle')}</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            {t('admin.clients.deleteDialogDescription', {
              name: selectedClient ? getClientName(selectedClient) : '',
              confirmation: deleteConfirmationWord,
            })}
          </DialogContentText>
          <TextField
            fullWidth
            autoFocus
            label={t('admin.clients.deleteConfirmationLabel')}
            value={deleteConfirmation}
            onChange={(event) => setDeleteConfirmation(event.target.value)}
            disabled={deleting}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} disabled={deleting} sx={{ textTransform: 'none' }}>
            {t('common.cancel')}
          </Button>
          <Button
            onClick={handleDelete}
            color="error"
            variant="contained"
            disabled={deleting || deleteConfirmation !== deleteConfirmationWord}
            sx={{ textTransform: 'none' }}
          >
            {deleting ? t('admin.clients.deleting') : t('admin.clients.confirmDelete')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={lockDialogOpen} onClose={() => setLockDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t('admin.clients.lockDialogTitle')}</DialogTitle>
        <DialogContent>
          <DialogContentText>{t('admin.clients.lockDialogDescription')}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLockDialogOpen(false)} sx={{ textTransform: 'none' }}>
            {t('common.cancel')}
          </Button>
          <Button color="error" variant="contained" onClick={confirmLockClient} sx={{ textTransform: 'none' }}>
            {t('admin.clients.confirmLock')}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={!!successMessage}
        autoHideDuration={4000}
        onClose={() => setSuccessMessage('')}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert severity="success" onClose={() => setSuccessMessage('')} sx={{ width: '100%' }}>
          {successMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default AdminClientsPage;
