import React, { useState, useEffect } from 'react';
import { fetchWithAuth } from '../utils/api';
import apiClient from '../utils/api';
import { loadImageWithCache } from '../utils/imageCache';
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Grid,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  Container,
  Avatar,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { DateCalendar } from '@mui/x-date-pickers/DateCalendar';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';

const AdminHomePage = () => {
  const [welcomeData, setWelcomeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Welcome message state
  const [welcomeMessage, setWelcomeMessage] = useState('');
  const [aboutMeContent, setAboutMeContent] = useState('');
  const [educationContent, setEducationContent] = useState('');
  
  // Media IDs state
  const [welcomeMediaId, setWelcomeMediaId] = useState(null);
  const [aboutMediaId, setAboutMediaId] = useState(null);
  const [educationMediaId, setEducationMediaId] = useState(null);
  
  // Image upload states
  const [uploadingWelcomeImage, setUploadingWelcomeImage] = useState(false);
  const [uploadingAboutImage, setUploadingAboutImage] = useState(false);
  const [uploadingEducationImage, setUploadingEducationImage] = useState(false);
  
  // Image preview URLs
  const [welcomeImageUrl, setWelcomeImageUrl] = useState(null);
  const [aboutImageUrl, setAboutImageUrl] = useState(null);
  const [educationImageUrl, setEducationImageUrl] = useState(null);

  // Session types state
  const [sessionTypes, setSessionTypes] = useState([]);
  const [loadingSessionTypes, setLoadingSessionTypes] = useState(false);
  const [sessionTypeDialogOpen, setSessionTypeDialogOpen] = useState(false);
  const [editingSessionType, setEditingSessionType] = useState(null);
  const [sessionTypeForm, setSessionTypeForm] = useState({
    name: '',
    description: '',
    durationMinutes: 60,
    price: 0,
  });

  // Available slots state
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotsError, setSlotsError] = useState(null);
  const [selectedSessionTypeId, setSelectedSessionTypeId] = useState(1);

  // Fetch welcome data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/v1/public/welcome');
        if (!response.ok) {
          throw new Error(`Failed to load: ${response.status}`);
        }
        const data = await response.json();
        setWelcomeData(data);
        setWelcomeMessage(data.welcomeMessage || '');
        setAboutMeContent(data.aboutMessage || '');
        setEducationContent(data.educationMessage || '');
        setWelcomeMediaId(data.welcomeMediaId || null);
        setAboutMediaId(data.aboutMediaId || null);
        setEducationMediaId(data.educationMediaId || null);
        
        // Load images if mediaIds exist
        if (data.welcomeMediaId) {
          loadImage(data.welcomeMediaId, 'welcome').catch(err => {
            console.error('Error loading welcome image:', err);
          });
        }
        if (data.aboutMediaId) {
          loadImage(data.aboutMediaId, 'about').catch(err => {
            console.error('Error loading about image:', err);
          });
        }
        if (data.educationMediaId) {
          loadImage(data.educationMediaId, 'education').catch(err => {
            console.error('Error loading education image:', err);
          });
        }
      } catch (err) {
        console.error('Error fetching welcome data:', err);
        setError(err.message || 'Failed to load welcome data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Fetch session types
  useEffect(() => {
    const fetchSessionTypes = async () => {
      setLoadingSessionTypes(true);
      try {
        const response = await fetch('/api/v1/public/session/type');
        if (response.ok) {
          const data = await response.json();
          setSessionTypes(Array.isArray(data) ? data : []);
          if (data.length > 0) {
            setSelectedSessionTypeId(data[0].id || data[0].sessionTypeId || 1);
          }
        }
      } catch (err) {
        console.error('Error fetching session types:', err);
      } finally {
        setLoadingSessionTypes(false);
      }
    };
    fetchSessionTypes();
  }, []);

  // Fetch available slots when date or session type changes
  useEffect(() => {
    if (selectedSessionTypeId) {
      fetchAvailableSlots(selectedDate);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, selectedSessionTypeId]);

  // Load image from mediaId with caching
  const loadImage = async (mediaId, type) => {
    if (!mediaId) return;
    
    try {
      const objectUrl = await loadImageWithCache(mediaId);
      
      if (type === 'welcome') {
        setWelcomeImageUrl(objectUrl);
      } else if (type === 'about') {
        setAboutImageUrl(objectUrl);
      } else if (type === 'education') {
        setEducationImageUrl(objectUrl);
      }
    } catch (err) {
      console.error(`Error loading image for ${type}:`, err);
    }
  };

  // Fetch available slots
  const fetchAvailableSlots = async (date) => {
    try {
      setLoadingSlots(true);
      setSlotsError(null);
      const dateString = dayjs(date).format('YYYY-MM-DD');
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

      const response = await apiClient.get('/api/v1/public/booking/available/slot', {
        params: {
          sessionTypeId: selectedSessionTypeId,
          suggestedDate: dateString,
          timezone,
        },
        timeout: 10000,
      });

      if (response.data && response.data.slots && Array.isArray(response.data.slots)) {
        setAvailableSlots(response.data.slots);
      } else {
        setAvailableSlots([]);
      }
    } catch (err) {
      console.error('Error fetching available slots:', err);
      setSlotsError(err.message || 'Failed to load available slots');
      setAvailableSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  };

  // Handle image upload for a specific section
  const handleImageUpload = async (file, type) => {
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    // Set uploading state
    if (type === 'welcome') {
      setUploadingWelcomeImage(true);
    } else if (type === 'about') {
      setUploadingAboutImage(true);
    } else if (type === 'education') {
      setUploadingEducationImage(true);
    }

    try {
      // Upload image
      const formData = new FormData();
      formData.append('file', file);

      const uploadResponse = await apiClient.post('/api/v1/admin/media/image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (!uploadResponse.data || !uploadResponse.data.mediaId) {
        throw new Error('Failed to upload image: No mediaId returned');
      }

      const mediaId = uploadResponse.data.mediaId;

      // Update state immediately
      if (type === 'welcome') {
        setWelcomeMediaId(mediaId);
      } else if (type === 'about') {
        setAboutMediaId(mediaId);
      } else if (type === 'education') {
        setEducationMediaId(mediaId);
      }

      // Immediately update the corresponding mediaId via PUT request
      const updatePayload = {
        welcomeMessage: welcomeMessage,
        aboutMessage: aboutMeContent,
        educationMessage: educationContent,
        welcomeMediaId: type === 'welcome' ? mediaId : welcomeMediaId,
        aboutMediaId: type === 'about' ? mediaId : aboutMediaId,
        educationMediaId: type === 'education' ? mediaId : educationMediaId,
      };

      const updateResponse = await fetchWithAuth('/api/v1/admin/home', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatePayload),
      });

      if (!updateResponse.ok) {
        throw new Error(`Failed to update mediaId: ${updateResponse.status}`);
      }

      // Load and display the image
      await loadImage(mediaId, type);
    } catch (err) {
      console.error(`Error uploading image for ${type}:`, err);
      setError(err.message || `Failed to upload image for ${type}`);
    } finally {
      if (type === 'welcome') {
        setUploadingWelcomeImage(false);
      } else if (type === 'about') {
        setUploadingAboutImage(false);
      } else if (type === 'education') {
        setUploadingEducationImage(false);
      }
    }
  };

  // Save welcome data
  const handleSaveWelcome = async () => {
    setSaving(true);
    setSaveSuccess(false);
    setError(null);

    try {
      const response = await fetchWithAuth('/api/v1/admin/home', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          welcomeMessage: welcomeMessage,
          aboutMessage: aboutMeContent,
          educationMessage: educationContent,
          welcomeMediaId: welcomeMediaId,
          aboutMediaId: aboutMediaId,
          educationMediaId: educationMediaId,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to save: ${response.status}`);
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving welcome data:', err);
      setError(err.message || 'Failed to save welcome data');
    } finally {
      setSaving(false);
    }
  };

  // Handle session type form
  const handleOpenSessionTypeDialog = (sessionType = null) => {
    if (sessionType) {
      setEditingSessionType(sessionType);
      setSessionTypeForm({
        name: sessionType.name || '',
        description: sessionType.description || '',
        durationMinutes: sessionType.durationMinutes || 60,
        price: sessionType.price || 0,
      });
    } else {
      setEditingSessionType(null);
      setSessionTypeForm({
        name: '',
        description: '',
        durationMinutes: 60,
        price: 0,
      });
    }
    setSessionTypeDialogOpen(true);
  };

  const handleCloseSessionTypeDialog = () => {
    setSessionTypeDialogOpen(false);
    setEditingSessionType(null);
  };

  const handleSaveSessionType = async () => {
    try {
      const url = editingSessionType
        ? `/api/v1/admin/session/type/${editingSessionType.id || editingSessionType.sessionTypeId}`
        : '/api/v1/admin/session/type';
      const method = editingSessionType ? 'PUT' : 'POST';

      const response = await fetchWithAuth(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sessionTypeForm),
      });

      if (!response.ok) {
        throw new Error(`Failed to save session type: ${response.status}`);
      }

      // Refresh session types
      const refreshResponse = await fetch('/api/v1/public/session/type');
      if (refreshResponse.ok) {
        const data = await refreshResponse.json();
        setSessionTypes(Array.isArray(data) ? data : []);
      }

      handleCloseSessionTypeDialog();
    } catch (err) {
      console.error('Error saving session type:', err);
      setError(err.message || 'Failed to save session type');
    }
  };

  const handleDeleteSessionType = async (sessionType) => {
    if (!window.confirm(`Are you sure you want to delete "${sessionType.name}"?`)) {
      return;
    }

    try {
      const response = await fetchWithAuth(
        `/api/v1/admin/session/type/${sessionType.id || sessionType.sessionTypeId}`,
        {
          method: 'DELETE',
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to delete: ${response.status}`);
      }

      // Refresh session types
      const refreshResponse = await fetch('/api/v1/public/session/type');
      if (refreshResponse.ok) {
        const data = await refreshResponse.json();
        setSessionTypes(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Error deleting session type:', err);
      setError(err.message || 'Failed to delete session type');
    }
  };

  const formatTime = (timeString) => {
    if (!timeString) return 'N/A';
    try {
      const time = timeString.includes(':') ? timeString.split(':').slice(0, 2).join(':') : timeString;
      return dayjs(time, 'HH:mm').format('h:mm A');
    } catch {
      return timeString;
    }
  };

  const formatTimeFromInstant = (instantString) => {
    if (!instantString) return 'N/A';
    try {
      return dayjs(instantString).format('h:mm A');
    } catch {
      return instantString;
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ bgcolor: '#2C5F5F' }}>
      {/* Header */}
      <Box sx={{ p: 2, bgcolor: 'background.paper', borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Home Page Management
        </Typography>
      </Box>

      {/* Hero Section */}
      <Box
        component="section"
        sx={{
          minHeight: '60vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          color: 'white',
          textAlign: 'center',
          py: 8,
          overflow: 'hidden',
          width: '100%',
          '&::before': welcomeImageUrl ? {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100%',
            height: '100%',
            backgroundImage: `url(${welcomeImageUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center center',
            backgroundRepeat: 'no-repeat',
            zIndex: 0,
          } : {},
          '&::after': welcomeImageUrl ? {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100%',
            height: '100%',
            background: 'linear-gradient(135deg, rgba(44, 95, 95, 0.3) 0%, rgba(31, 69, 69, 0.4) 100%)',
            zIndex: 0,
          } : {},
          background: welcomeImageUrl 
            ? 'transparent'
            : 'linear-gradient(135deg, #2C5F5F 0%, #1F4545 100%)',
        }}
      >
        <Container maxWidth="md" sx={{ position: 'relative', zIndex: 1 }}>
          {/* Image Upload Button */}
          <Box sx={{ mb: 4, position: 'relative' }}>
            <input
              accept="image/*"
              style={{ display: 'none' }}
              id="welcome-image-upload"
              type="file"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  handleImageUpload(file, 'welcome');
                }
                e.target.value = '';
              }}
            />
            <label htmlFor="welcome-image-upload">
              <Button
                variant="contained"
                component="span"
                startIcon={uploadingWelcomeImage ? <CircularProgress size={20} sx={{ color: 'white' }} /> : <CloudUploadIcon />}
                disabled={uploadingWelcomeImage}
                sx={{ 
                  textTransform: 'none',
                  bgcolor: 'rgba(255, 255, 255, 0.2)',
                  '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.3)' },
                }}
              >
                {uploadingWelcomeImage ? 'Uploading...' : welcomeImageUrl ? 'Change Image' : 'Upload Image'}
              </Button>
            </label>
          </Box>

          {/* Editable Welcome Message */}
          <TextField
            fullWidth
            multiline
            rows={3}
            value={welcomeMessage}
            onChange={(e) => setWelcomeMessage(e.target.value)}
            placeholder="Welcome Message"
            sx={{
              mb: 3,
              '& .MuiInputBase-input': {
                color: 'white',
                fontSize: { xs: '2rem', md: '3rem' },
                fontWeight: 700,
                textAlign: 'center',
              },
              '& .MuiOutlinedInput-root': {
                '& fieldset': {
                  borderColor: 'rgba(255, 255, 255, 0.3)',
                },
                '&:hover fieldset': {
                  borderColor: 'rgba(255, 255, 255, 0.5)',
                },
                '&.Mui-focused fieldset': {
                  borderColor: 'white',
                },
              },
            }}
          />
        </Container>
      </Box>

      {/* About Me Section */}
      <Box
        component="section"
        sx={{
          py: { xs: 6, md: 10 },
          bgcolor: 'background.paper',
        }}
      >
        <Container maxWidth="lg">
          <Grid container spacing={0} sx={{ alignItems: 'center' }}>
            {/* Left Column - Text Content */}
            <Grid item xs={12} md={6} sx={{ px: { xs: 2, sm: 4, md: 6 }, py: { xs: 4, md: 6 } }}>
              <Box sx={{ maxWidth: '600px' }}>
                <Box sx={{ mb: 3 }}>
                  <Divider 
                    sx={{ 
                      width: '60px', 
                      height: '2px', 
                      bgcolor: 'black',
                      mb: 2,
                    }} 
                  />
                  <Typography
                    variant="h2"
                    component="h2"
                    sx={{
                      fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem' },
                      fontWeight: 700,
                      color: 'black',
                      letterSpacing: '0.05em',
                      textTransform: 'uppercase',
                      fontFamily: 'sans-serif',
                    }}
                  >
                    ABOUT ME
                  </Typography>
                </Box>

                <TextField
                  fullWidth
                  multiline
                  rows={8}
                  value={aboutMeContent}
                  onChange={(e) => setAboutMeContent(e.target.value)}
                  placeholder="About Me Content"
                  sx={{
                    '& .MuiInputBase-input': {
                      fontSize: { xs: '0.95rem', md: '1rem' },
                      lineHeight: 1.8,
                      fontFamily: 'sans-serif',
                    },
                  }}
                />
              </Box>
            </Grid>

            {/* Right Column - Image */}
            <Grid item xs={12} md={6} sx={{ position: 'relative', height: { xs: '400px', md: '600px' } }}>
              <Box
                sx={{
                  width: '100%',
                  height: '100%',
                  background: aboutImageUrl ? 'transparent' : 'linear-gradient(135deg, #E3F2FD 0%, #BBDEFB 50%, #90CAF9 100%)',
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  border: '2px dashed',
                  borderColor: aboutImageUrl ? 'transparent' : 'grey.300',
                }}
              >
                {aboutImageUrl ? (
                  <Box sx={{ position: 'relative', width: '100%', height: '100%' }}>
                    <Box
                      component="img"
                      src={aboutImageUrl}
                      alt="About Me"
                      sx={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                      }}
                    />
                  </Box>
                ) : (
                  <Avatar
                    sx={{
                      width: { xs: 200, sm: 300, md: 400 },
                      height: { xs: 200, sm: 300, md: 400 },
                      bgcolor: '#2C5F5F',
                      fontSize: { xs: '4rem', md: '6rem' },
                      fontWeight: 600,
                    }}
                  >
                    A
                  </Avatar>
                )}
                <Box
                  sx={{
                    position: 'absolute',
                    bottom: 16,
                    right: 16,
                  }}
                >
                  <input
                    accept="image/*"
                    style={{ display: 'none' }}
                    id="about-image-upload"
                    type="file"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handleImageUpload(file, 'about');
                      }
                      e.target.value = '';
                    }}
                  />
                  <label htmlFor="about-image-upload">
                    <Button
                      variant="contained"
                      component="span"
                      startIcon={uploadingAboutImage ? <CircularProgress size={20} /> : <CloudUploadIcon />}
                      disabled={uploadingAboutImage}
                      sx={{ textTransform: 'none' }}
                    >
                      {uploadingAboutImage ? 'Uploading...' : aboutImageUrl ? 'Change' : 'Upload Image'}
                    </Button>
                  </label>
                </Box>
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Education Section */}
      <Box
        component="section"
        sx={{
          py: { xs: 6, md: 10 },
          bgcolor: '#F0F7F7',
        }}
      >
        <Container maxWidth="lg">
          <Grid container spacing={0} sx={{ alignItems: 'center' }}>
            {/* Left Column - Image */}
            <Grid item xs={12} md={6} sx={{ position: 'relative', height: { xs: '300px', md: '400px' }, order: { xs: 2, md: 1 } }}>
              <Box
                sx={{
                  width: '100%',
                  height: '100%',
                  background: educationImageUrl ? 'transparent' : 'linear-gradient(135deg, #E3F2FD 0%, #BBDEFB 50%, #90CAF9 100%)',
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  border: '2px dashed',
                  borderColor: educationImageUrl ? 'transparent' : 'grey.300',
                }}
              >
                {educationImageUrl ? (
                  <Box sx={{ position: 'relative', width: '100%', height: '100%' }}>
                    <Box
                      component="img"
                      src={educationImageUrl}
                      alt="Education"
                      sx={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                      }}
                    />
                  </Box>
                ) : (
                  <Avatar
                    sx={{
                      width: { xs: 150, sm: 200, md: 250 },
                      height: { xs: 150, sm: 200, md: 250 },
                      bgcolor: '#2C5F5F',
                      fontSize: { xs: '3rem', md: '4rem' },
                      fontWeight: 600,
                    }}
                  >
                    E
                  </Avatar>
                )}
                <Box
                  sx={{
                    position: 'absolute',
                    bottom: 16,
                    right: 16,
                  }}
                >
                  <input
                    accept="image/*"
                    style={{ display: 'none' }}
                    id="education-image-upload"
                    type="file"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handleImageUpload(file, 'education');
                      }
                      e.target.value = '';
                    }}
                  />
                  <label htmlFor="education-image-upload">
                    <Button
                      variant="contained"
                      component="span"
                      startIcon={uploadingEducationImage ? <CircularProgress size={20} /> : <CloudUploadIcon />}
                      disabled={uploadingEducationImage}
                      sx={{ textTransform: 'none' }}
                    >
                      {uploadingEducationImage ? 'Uploading...' : educationImageUrl ? 'Change' : 'Upload Image'}
                    </Button>
                  </label>
                </Box>
              </Box>
            </Grid>

            {/* Right Column - Text Content */}
            <Grid item xs={12} md={6} sx={{ px: { xs: 2, sm: 4, md: 6 }, py: { xs: 4, md: 6 }, order: { xs: 1, md: 2 } }}>
              <Box sx={{ maxWidth: '600px', mx: { xs: 'auto', md: 0 } }}>
                <Box sx={{ mb: 3 }}>
                  <Divider 
                    sx={{ 
                      width: '60px', 
                      height: '2px', 
                      bgcolor: 'black',
                      mb: 2,
                    }} 
                  />
                  <Typography
                    variant="h2"
                    component="h2"
                    sx={{
                      fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem' },
                      fontWeight: 700,
                      color: 'black',
                      letterSpacing: '0.05em',
                      textTransform: 'uppercase',
                      fontFamily: 'sans-serif',
                    }}
                  >
                    MY EDUCATION
                  </Typography>
                </Box>

                <TextField
                  fullWidth
                  multiline
                  rows={6}
                  value={educationContent}
                  onChange={(e) => setEducationContent(e.target.value)}
                  placeholder="Education Content"
                  sx={{
                    '& .MuiInputBase-input': {
                      fontSize: { xs: '0.95rem', md: '1rem' },
                      lineHeight: 1.8,
                      fontFamily: 'sans-serif',
                    },
                  }}
                />
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Save Changes Section */}
      <Box sx={{ p: 2, bgcolor: 'background.paper', borderTop: 1, borderBottom: 1, borderColor: 'divider' }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        {saveSuccess && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Changes saved successfully!
          </Alert>
        )}
        <Button
          variant="contained"
          onClick={handleSaveWelcome}
          disabled={saving}
          sx={{ textTransform: 'none' }}
        >
          {saving ? (
            <>
              <CircularProgress size={20} sx={{ mr: 1 }} />
              Saving...
            </>
          ) : (
            'Save Changes'
          )}
        </Button>
      </Box>

      {/* Session Types and Available Slots Section */}
      <Box sx={{ bgcolor: 'background.paper', py: 4 }}>
        <Container maxWidth="lg">
          <Grid container spacing={3}>
            {/* Session Types Section */}
            <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Session Types</Typography>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => handleOpenSessionTypeDialog()}
                  sx={{ textTransform: 'none' }}
                >
                  Add Session Type
                </Button>
              </Box>

              {loadingSessionTypes ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                  <CircularProgress />
                </Box>
              ) : sessionTypes.length > 0 ? (
                <List>
                  {sessionTypes.map((sessionType) => (
                    <ListItem key={sessionType.id || sessionType.sessionTypeId}>
                      <ListItemText
                        primary={sessionType.name}
                        secondary={
                          <>
                            {sessionType.description && (
                              <Typography variant="body2" color="text.secondary">
                                {sessionType.description}
                              </Typography>
                            )}
                            <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                              <Chip label={`${sessionType.durationMinutes} min`} size="small" />
                              <Chip label={`$${sessionType.price}`} size="small" color="primary" />
                            </Box>
                          </>
                        }
                      />
                      <ListItemSecondaryAction>
                        <IconButton
                          edge="end"
                          onClick={() => handleOpenSessionTypeDialog(sessionType)}
                          sx={{ mr: 1 }}
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton
                          edge="end"
                          onClick={() => handleDeleteSessionType(sessionType)}
                          color="error"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No session types found. Add one to get started.
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Available Slots Section */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Available Slots (View Only)
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                <FormControl sx={{ minWidth: 200 }}>
                  <InputLabel>Session Type</InputLabel>
                  <Select
                    value={selectedSessionTypeId}
                    onChange={(e) => setSelectedSessionTypeId(e.target.value)}
                    label="Session Type"
                  >
                    {sessionTypes.map((st) => (
                      <MenuItem key={st.id || st.sessionTypeId} value={st.id || st.sessionTypeId}>
                        {st.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>

              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <LocalizationProvider dateAdapter={AdapterDayjs}>
                    <DateCalendar
                      value={selectedDate}
                      onChange={(newDate) => setSelectedDate(newDate)}
                      minDate={dayjs()}
                    />
                  </LocalizationProvider>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle1" gutterBottom>
                    Available Times on {dayjs(selectedDate).format('MMMM D, YYYY')}
                  </Typography>

                  {slotsError && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                      {slotsError}
                    </Alert>
                  )}

                  {loadingSlots ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                      <CircularProgress />
                    </Box>
                  ) : availableSlots.length > 0 ? (
                    <List>
                      {availableSlots.map((slot, index) => {
                        const startTime = slot.startTime
                          ? formatTime(slot.startTime)
                          : slot.startTimeInstant
                          ? formatTimeFromInstant(slot.startTimeInstant)
                          : 'N/A';
                        const endTime = slot.endTime ? formatTime(slot.endTime) : 'N/A';

                        return (
                          <ListItem
                            key={slot.startTimeInstant || `slot-${index}`}
                            sx={{
                              border: 1,
                              borderColor: 'divider',
                              borderRadius: 1,
                              mb: 1,
                            }}
                          >
                            <ListItemText
                              primary={startTime}
                              secondary={endTime !== 'N/A' ? `Ends at ${endTime}` : null}
                            />
                          </ListItem>
                        );
                      })}
                    </List>
                  ) : (
                    <Alert severity="info">No available slots on this day.</Alert>
                  )}
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Session Type Dialog */}
      <Dialog open={sessionTypeDialogOpen} onClose={handleCloseSessionTypeDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editingSessionType ? 'Edit Session Type' : 'Add Session Type'}</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Name"
            value={sessionTypeForm.name}
            onChange={(e) => setSessionTypeForm({ ...sessionTypeForm, name: e.target.value })}
            margin="normal"
            required
          />
          <TextField
            fullWidth
            label="Description"
            multiline
            rows={3}
            value={sessionTypeForm.description}
            onChange={(e) => setSessionTypeForm({ ...sessionTypeForm, description: e.target.value })}
            margin="normal"
          />
          <TextField
            fullWidth
            label="Duration (minutes)"
            type="number"
            value={sessionTypeForm.durationMinutes}
            onChange={(e) =>
              setSessionTypeForm({ ...sessionTypeForm, durationMinutes: parseInt(e.target.value) || 0 })
            }
            margin="normal"
            required
          />
          <TextField
            fullWidth
            label="Price"
            type="number"
            value={sessionTypeForm.price}
            onChange={(e) =>
              setSessionTypeForm({ ...sessionTypeForm, price: parseFloat(e.target.value) || 0 })
            }
            margin="normal"
            required
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseSessionTypeDialog} sx={{ textTransform: 'none' }}>
            Cancel
          </Button>
          <Button onClick={handleSaveSessionType} variant="contained" sx={{ textTransform: 'none' }}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminHomePage;

