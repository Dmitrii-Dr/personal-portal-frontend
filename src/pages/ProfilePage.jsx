import React, { useEffect, useState } from 'react';
import { fetchWithAuth } from '../utils/api';
import {
  Box,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Alert,
  Grid,
  Divider,
  TextField,
  Button,
  IconButton,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';

const ProfilePage = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [firstNameError, setFirstNameError] = useState('');
  const [lastNameError, setLastNameError] = useState('');
  const [editingFirstName, setEditingFirstName] = useState(false);
  const [editingLastName, setEditingLastName] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetchWithAuth('/api/v1/user/profile');
        if (!res.ok) {
          throw new Error(`Failed to load profile: ${res.status} ${res.statusText}`);
        }
        const data = await res.json();
        if (isMounted) {
          setProfile(data);
          setFirstName(data?.firstName || '');
          setLastName(data?.lastName || '');
        }
      } catch (e) {
        if (isMounted) {
          setError(e.message || 'Failed to load profile');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    load();
    return () => {
      isMounted = false;
    };
  }, []);

  const validate = () => {
    let ok = true;
    const fn = (firstName || '').trim();
    const ln = (lastName || '').trim();
    if (fn.length > 100) {
      setFirstNameError('First name must be at most 100 characters');
      ok = false;
    } else {
      setFirstNameError('');
    }
    if (ln.length > 100) {
      setLastNameError('Last name must be at most 100 characters');
      ok = false;
    } else {
      setLastNameError('');
    }
    return ok;
  };

  const handleSave = async () => {
    setSaveError('');
    setSaveSuccess('');
    if (!validate()) return;
    setSaving(true);
    try {
      const body = {
        firstName: (firstName || '').trim(),
        lastName: (lastName || '').trim(),
      };
      const res = await fetchWithAuth('/api/v1/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        throw new Error(errText || `Failed to update profile: ${res.status} ${res.statusText}`);
      }
      // If backend returns updated profile, prefer it; else use local state
      let updated = null;
      try {
        updated = await res.json();
      } catch {
        // response might have no body
      }
      const newProfile = updated || { ...(profile || {}), firstName: body.firstName, lastName: body.lastName };
      setProfile(newProfile);
      setSaveSuccess('Profile updated successfully.');
      // Notify app to refresh displayed user name if needed
      window.dispatchEvent(new Event('auth-changed'));
    } catch (e) {
      setSaveError(e.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        My Profile
      </Typography>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 160 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error">{error}</Alert>
      ) : (
        <Card>
          <CardContent>
            {saveError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {saveError}
              </Alert>
            )}
            {saveSuccess && (
              <Alert severity="success" sx={{ mb: 2 }}>
                {saveSuccess}
              </Alert>
            )}
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Email
                </Typography>
                <Typography variant="body1">{profile?.email || '-'}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {editingFirstName ? (
                    <TextField
                      fullWidth
                      label="First name"
                      value={firstName}
                      onChange={(e) => {
                        setFirstName(e.target.value);
                        setSaveError('');
                        setSaveSuccess('');
                        if (firstNameError) setFirstNameError('');
                      }}
                      error={!!firstNameError}
                      helperText={firstNameError}
                      disabled={saving}
                    />
                  ) : (
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="subtitle2" color="text.secondary">
                        First name
                      </Typography>
                      <Typography variant="body1">{firstName || '-'}</Typography>
                    </Box>
                  )}
                  {!editingFirstName && (
                    <IconButton
                      aria-label="Edit first name"
                      onClick={() => setEditingFirstName(true)}
                      size="small"
                      disabled={saving}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                  )}
                </Box>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {editingLastName ? (
                    <TextField
                      fullWidth
                      label="Last name"
                      value={lastName}
                      onChange={(e) => {
                        setLastName(e.target.value);
                        setSaveError('');
                        setSaveSuccess('');
                        if (lastNameError) setLastNameError('');
                      }}
                      error={!!lastNameError}
                      helperText={lastNameError}
                      disabled={saving}
                    />
                  ) : (
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Last name
                      </Typography>
                      <Typography variant="body1">{lastName || '-'}</Typography>
                    </Box>
                  )}
                  {!editingLastName && (
                    <IconButton
                      aria-label="Edit last name"
                      onClick={() => setEditingLastName(true)}
                      size="small"
                      disabled={saving}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                  )}
                </Box>
              </Grid>
            </Grid>
            <Divider sx={{ mt: 2 }} />
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
              <Button
                variant="contained"
                onClick={handleSave}
                disabled={saving}
                sx={{ textTransform: 'none' }}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default ProfilePage;


