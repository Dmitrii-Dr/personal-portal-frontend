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
  Container,
  Avatar,
  Divider,
  IconButton,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Paper,
  Stack,
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import TelegramIcon from '@mui/icons-material/Telegram';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import GitHubIcon from '@mui/icons-material/GitHub';
import EmailIcon from '@mui/icons-material/Email';
import LanguageIcon from '@mui/icons-material/Language';
import PhoneIcon from '@mui/icons-material/Phone';
import InstagramIcon from '@mui/icons-material/Instagram';
import TwitterIcon from '@mui/icons-material/Twitter';
import FacebookIcon from '@mui/icons-material/Facebook';
import YouTubeIcon from '@mui/icons-material/YouTube';

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
  const [reviewMessage, setReviewMessage] = useState('');
  
  // Media IDs state
  const [welcomeMediaId, setWelcomeMediaId] = useState(null);
  const [aboutMediaId, setAboutMediaId] = useState(null);
  const [educationMediaId, setEducationMediaId] = useState(null);
  const [reviewMediaIds, setReviewMediaIds] = useState([]);
  
  // Image upload states
  const [uploadingWelcomeImage, setUploadingWelcomeImage] = useState(false);
  const [uploadingAboutImage, setUploadingAboutImage] = useState(false);
  const [uploadingEducationImage, setUploadingEducationImage] = useState(false);
  const [uploadingReviewImage, setUploadingReviewImage] = useState(false);
  
  // Image preview URLs
  const [welcomeImageUrl, setWelcomeImageUrl] = useState(null);
  const [aboutImageUrl, setAboutImageUrl] = useState(null);
  const [educationImageUrl, setEducationImageUrl] = useState(null);
  const [reviewImageUrls, setReviewImageUrls] = useState([]);

  // Contact links state
  // Supported platforms: Telegram, LinkedIn, GitHub, Email, Phone, Instagram, Twitter, Facebook, YouTube, WhatsApp, Website, B17
  // Expected backend format in /welcome response:
  // {
  //   "contact": [
  //     {
  //       "platform": "Telegram",  // Required: Platform name
  //       "value": "https://t.me/username"  // Required: URL or contact value
  //     },
  //     {
  //       "platform": "Telegram",
  //       "value": "https://t.me/channel"
  //     }
  //   ]
  // }
  const [contactLinks, setContactLinks] = useState([
    {
      platform: 'Telegram',
      value: 'https://t.me/example',
      description: 'Personal Account',
    },
    {
      platform: 'LinkedIn',
      value: 'https://www.linkedin.com/in/example',
      description: '',
    },
  ]);
  const [editingContactIndex, setEditingContactIndex] = useState(null);
  const [newContactLink, setNewContactLink] = useState({
    platform: 'Telegram',
    value: '',
    description: '',
  });

  const supportedPlatforms = [
    'Telegram',
    'LinkedIn',
    'GitHub',
    'Email',
    'Phone',
    'Instagram',
    'Twitter',
    'Facebook',
    'YouTube',
    'WhatsApp',
    'Website',
    'B17',
  ];


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
        setReviewMessage(data.reviewMessage || '');
        setWelcomeMediaId(data.welcomeMediaId || null);
        setAboutMediaId(data.aboutMediaId || null);
        setEducationMediaId(data.educationMediaId || null);
        setReviewMediaIds(data.reviewMediaIds || []);
        
        // Load contact links if available
        if (data.contact && Array.isArray(data.contact)) {
          setContactLinks(data.contact.map(link => ({
            platform: link.platform || 'Website',
            value: link.value || '',
            description: link.description || '',
          })));
        }
        
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
        
        // Load review images if reviewMediaIds exist
        if (data.reviewMediaIds && Array.isArray(data.reviewMediaIds) && data.reviewMediaIds.length > 0) {
          loadReviewImages(data.reviewMediaIds);
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

  // Load multiple review images
  const loadReviewImages = async (mediaIds) => {
    if (!mediaIds || !Array.isArray(mediaIds) || mediaIds.length === 0) return;
    
    try {
      const imagePromises = mediaIds.map(mediaId => 
        loadImageWithCache(mediaId).catch(err => {
          console.error(`Error loading review image ${mediaId}:`, err);
          return null;
        })
      );
      const urls = await Promise.all(imagePromises);
      setReviewImageUrls(urls.filter(url => url !== null));
    } catch (err) {
      console.error('Error loading review images:', err);
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
    } else if (type === 'review') {
      setUploadingReviewImage(true);
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
      } else if (type === 'review') {
        // Add to review media IDs array
        const newReviewMediaIds = [...reviewMediaIds, mediaId];
        setReviewMediaIds(newReviewMediaIds);
        
        // Load and display the new image
        const objectUrl = await loadImageWithCache(mediaId);
        setReviewImageUrls(prev => [...prev, objectUrl]);
        
        // Immediately update via PUT request
        const updatePayload = {
          welcomeMessage: welcomeMessage,
          aboutMessage: aboutMeContent,
          educationMessage: educationContent,
          reviewMessage: reviewMessage,
          welcomeMediaId: welcomeMediaId,
          aboutMediaId: aboutMediaId,
          educationMediaId: educationMediaId,
          reviewMediaIds: newReviewMediaIds,
          contact: formatContactForBackend(),
        };

        const updateResponse = await fetchWithAuth('/api/v1/admin/home', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updatePayload),
        });

        if (!updateResponse.ok) {
          throw new Error(`Failed to update review mediaIds: ${updateResponse.status}`);
        }
        
        return; // Early return for review type
      }

      // Immediately update the corresponding mediaId via PUT request (for non-review types)
      const updatePayload = {
        welcomeMessage: welcomeMessage,
        aboutMessage: aboutMeContent,
        educationMessage: educationContent,
        reviewMessage: reviewMessage,
        welcomeMediaId: type === 'welcome' ? mediaId : welcomeMediaId,
        aboutMediaId: type === 'about' ? mediaId : aboutMediaId,
        educationMediaId: type === 'education' ? mediaId : educationMediaId,
        reviewMediaIds: reviewMediaIds,
        contact: formatContactForBackend(),
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
      } else if (type === 'review') {
        setUploadingReviewImage(false);
      }
    }
  };

  // Handle deletion of a review image
  const handleDeleteReviewImage = async (index) => {
    try {
      const newReviewMediaIds = reviewMediaIds.filter((_, i) => i !== index);
      const newReviewImageUrls = reviewImageUrls.filter((_, i) => i !== index);
      
      setReviewMediaIds(newReviewMediaIds);
      setReviewImageUrls(newReviewImageUrls);

      // Update via PUT request
      const updatePayload = {
        welcomeMessage: welcomeMessage,
        aboutMessage: aboutMeContent,
        educationMessage: educationContent,
        reviewMessage: reviewMessage,
        welcomeMediaId: welcomeMediaId,
        aboutMediaId: aboutMediaId,
        educationMediaId: educationMediaId,
        reviewMediaIds: newReviewMediaIds,
        contact: formatContactForBackend(),
      };

      const updateResponse = await fetchWithAuth('/api/v1/admin/home', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatePayload),
      });

      if (!updateResponse.ok) {
        throw new Error(`Failed to delete review image: ${updateResponse.status}`);
      }
    } catch (err) {
      console.error('Error deleting review image:', err);
      setError(err.message || 'Failed to delete review image');
    }
  };

  // Helper function to format contact links for backend
  const formatContactForBackend = () => {
    return contactLinks.map(link => ({
      platform: link.platform,
      value: link.value,
      ...(link.description && { description: link.description }),
    }));
  };

  // Contact links handlers
  const handleAddContactLink = () => {
    if (!newContactLink.value.trim()) {
      setError('Please enter a contact value/URL');
      return;
    }
    
    // Format value based on platform
    let formattedValue = newContactLink.value.trim();
    if (newContactLink.platform === 'Email' && !formattedValue.startsWith('mailto:')) {
      formattedValue = `mailto:${formattedValue}`;
    } else if (newContactLink.platform === 'Phone' && !formattedValue.startsWith('tel:')) {
      formattedValue = `tel:${formattedValue}`;
    } else if (newContactLink.platform === 'WhatsApp') {
      // Format WhatsApp URL if needed
      if (!formattedValue.startsWith('http://') && !formattedValue.startsWith('https://') && !formattedValue.startsWith('wa.me/') && !formattedValue.startsWith('api.whatsapp.com/')) {
        // If it's just a phone number, format it for WhatsApp
        const phoneNumber = formattedValue.replace(/[^\d+]/g, ''); // Remove non-digit characters except +
        if (phoneNumber) {
          formattedValue = `https://wa.me/${phoneNumber}`;
        }
      } else if (formattedValue.startsWith('wa.me/')) {
        formattedValue = `https://${formattedValue}`;
      }
    }
    
    setContactLinks([
      ...contactLinks,
      {
        platform: newContactLink.platform,
        value: formattedValue,
        description: newContactLink.description.trim(),
      },
    ]);
    setNewContactLink({
      platform: 'Telegram',
      value: '',
      description: '',
    });
  };

  const handleEditContactLink = (index) => {
    setEditingContactIndex(index);
    setNewContactLink({
      platform: contactLinks[index].platform,
      value: contactLinks[index].value.replace(/^(mailto:|tel:)/, ''),
      description: contactLinks[index].description,
    });
  };

  const handleUpdateContactLink = () => {
    if (!newContactLink.value.trim()) {
      setError('Please enter a contact value/URL');
      return;
    }
    
    // Format value based on platform
    let formattedValue = newContactLink.value.trim();
    if (newContactLink.platform === 'Email' && !formattedValue.startsWith('mailto:')) {
      formattedValue = `mailto:${formattedValue}`;
    } else if (newContactLink.platform === 'Phone' && !formattedValue.startsWith('tel:')) {
      formattedValue = `tel:${formattedValue}`;
    } else if (newContactLink.platform === 'WhatsApp') {
      // Format WhatsApp URL if needed
      if (!formattedValue.startsWith('http://') && !formattedValue.startsWith('https://') && !formattedValue.startsWith('wa.me/') && !formattedValue.startsWith('api.whatsapp.com/')) {
        // If it's just a phone number, format it for WhatsApp
        const phoneNumber = formattedValue.replace(/[^\d+]/g, ''); // Remove non-digit characters except +
        if (phoneNumber) {
          formattedValue = `https://wa.me/${phoneNumber}`;
        }
      } else if (formattedValue.startsWith('wa.me/')) {
        formattedValue = `https://${formattedValue}`;
      }
    }
    
    const updatedLinks = [...contactLinks];
    updatedLinks[editingContactIndex] = {
      platform: newContactLink.platform,
      value: formattedValue,
      description: newContactLink.description.trim(),
    };
    setContactLinks(updatedLinks);
    setEditingContactIndex(null);
    setNewContactLink({
      platform: 'Telegram',
      value: '',
      description: '',
    });
  };

  const handleDeleteContactLink = (index) => {
    setContactLinks(contactLinks.filter((_, i) => i !== index));
  };

  const handleCancelEdit = () => {
    setEditingContactIndex(null);
    setNewContactLink({
      platform: 'Telegram',
      value: '',
      description: '',
    });
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
          reviewMessage: reviewMessage,
          welcomeMediaId: welcomeMediaId,
          aboutMediaId: aboutMediaId,
          educationMediaId: educationMediaId,
          reviewMediaIds: reviewMediaIds,
          contact: formatContactForBackend(),
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

      {/* Reviews/Testimonials Section */}
      <Box
        component="section"
        sx={{
          py: { xs: 6, md: 10 },
          bgcolor: 'background.paper',
        }}
      >
        <Container maxWidth="lg">
          <Box sx={{ mb: 4 }}>
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
                mb: 3,
              }}
            >
              TESTIMONIALS
            </Typography>
          </Box>

          {/* Review Message Text Field */}
          <Box sx={{ mb: 4 }}>
            <TextField
              fullWidth
              multiline
              rows={4}
              value={reviewMessage}
              onChange={(e) => setReviewMessage(e.target.value)}
              placeholder="Review/Testimonials Message"
              label="Review Message"
              sx={{
                '& .MuiInputBase-input': {
                  fontSize: { xs: '0.95rem', md: '1rem' },
                  lineHeight: 1.8,
                  fontFamily: 'sans-serif',
                },
              }}
            />
          </Box>

          {/* Review Images Section */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" component="h3" sx={{ mb: 2 }}>
              Review Images
            </Typography>
            
            {/* Upload Button */}
            <Box sx={{ mb: 3 }}>
              <input
                accept="image/*"
                style={{ display: 'none' }}
                id="review-image-upload"
                type="file"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    handleImageUpload(file, 'review');
                  }
                  e.target.value = '';
                }}
              />
              <label htmlFor="review-image-upload">
                <Button
                  variant="contained"
                  component="span"
                  startIcon={uploadingReviewImage ? <CircularProgress size={20} /> : <CloudUploadIcon />}
                  disabled={uploadingReviewImage}
                  sx={{ textTransform: 'none' }}
                >
                  {uploadingReviewImage ? 'Uploading...' : 'Upload Review Image'}
                </Button>
              </label>
            </Box>

            {/* Display Uploaded Images */}
            {reviewImageUrls.length > 0 && (
              <Grid container spacing={2}>
                {reviewImageUrls.map((imageUrl, index) => (
                  <Grid item xs={12} sm={6} md={4} key={index}>
                    <Card
                      sx={{
                        position: 'relative',
                        height: '100%',
                      }}
                    >
                      <Box
                        component="img"
                        src={imageUrl}
                        alt={`Review ${index + 1}`}
                        sx={{
                          width: '100%',
                          height: '200px',
                          objectFit: 'contain',
                          bgcolor: '#F0F7F7',
                        }}
                      />
                      <Box
                        sx={{
                          position: 'absolute',
                          top: 8,
                          right: 8,
                        }}
                      >
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteReviewImage(index)}
                          sx={{
                            bgcolor: 'rgba(255, 255, 255, 0.9)',
                            '&:hover': {
                              bgcolor: 'rgba(255, 255, 255, 1)',
                            },
                          }}
                        >
                          <DeleteIcon fontSize="small" color="error" />
                        </IconButton>
                      </Box>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}

            {reviewImageUrls.length === 0 && (
              <Box
                sx={{
                  p: 4,
                  border: '2px dashed',
                  borderColor: 'grey.300',
                  borderRadius: 2,
                  textAlign: 'center',
                  bgcolor: 'grey.50',
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  No review images uploaded yet. Click "Upload Review Image" to add images.
                </Typography>
              </Box>
            )}
          </Box>
        </Container>
      </Box>

      {/* Contact Links Section */}
      <Box
        component="section"
        sx={{
          py: { xs: 6, md: 10 },
          bgcolor: '#1F4545',
          color: 'white',
        }}
      >
        <Container maxWidth="lg">
          <Box sx={{ mb: 4 }}>
            <Divider 
              sx={{ 
                width: '60px', 
                height: '2px', 
                bgcolor: 'white',
                mb: 2,
              }} 
            />
            <Typography
              variant="h2"
              component="h2"
              sx={{
                fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem' },
                fontWeight: 700,
                color: 'white',
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                fontFamily: 'sans-serif',
                mb: 3,
              }}
            >
              Contact Links
            </Typography>
            <Typography
              variant="body1"
              sx={{ mb: 4, opacity: 0.9 }}
            >
              Manage your social media and contact links that appear in the footer of the landing page.
              You can add multiple links for the same platform (e.g., personal Telegram and channel).
            </Typography>
          </Box>

          {/* Add/Edit Contact Link Form */}
          <Card sx={{ mb: 4, bgcolor: 'rgba(255, 255, 255, 0.1)', color: 'white' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ color: 'white', mb: 3 }}>
                {editingContactIndex !== null ? 'Edit Contact Link' : 'Add New Contact Link'}
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <FormControl fullWidth>
                    <InputLabel sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>Platform</InputLabel>
                    <Select
                      value={newContactLink.platform}
                      label="Platform"
                      onChange={(e) =>
                        setNewContactLink({ ...newContactLink, platform: e.target.value })
                      }
                      sx={{
                        color: 'white',
                        '& .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'rgba(255, 255, 255, 0.3)',
                        },
                        '&:hover .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'rgba(255, 255, 255, 0.5)',
                        },
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'white',
                        },
                        '& .MuiSvgIcon-root': {
                          color: 'white',
                        },
                      }}
                    >
                      {supportedPlatforms.map((platform) => (
                        <MenuItem key={platform} value={platform}>
                          {platform}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label={
                      newContactLink.platform === 'Email'
                        ? 'Email Address'
                        : newContactLink.platform === 'Phone'
                        ? 'Phone Number'
                        : newContactLink.platform === 'WhatsApp'
                        ? 'WhatsApp Number or URL'
                        : 'URL or Value'
                    }
                    value={newContactLink.value}
                    onChange={(e) =>
                      setNewContactLink({ ...newContactLink, value: e.target.value })
                    }
                    placeholder={
                      newContactLink.platform === 'Email'
                        ? 'example@email.com'
                        : newContactLink.platform === 'Phone'
                        ? '+1234567890'
                        : newContactLink.platform === 'WhatsApp'
                        ? '+1234567890 or https://wa.me/...'
                        : 'https://...'
                    }
                    sx={{
                      '& .MuiInputLabel-root': {
                        color: 'rgba(255, 255, 255, 0.7)',
                      },
                      '& .MuiOutlinedInput-root': {
                        color: 'white',
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
                </Grid>
                <Grid item xs={12} sm={3}>
                  <TextField
                    fullWidth
                    label="Description (Optional)"
                    value={newContactLink.description}
                    onChange={(e) =>
                      setNewContactLink({ ...newContactLink, description: e.target.value })
                    }
                    placeholder="e.g., Personal Account, Channel"
                    sx={{
                      '& .MuiInputLabel-root': {
                        color: 'rgba(255, 255, 255, 0.7)',
                      },
                      '& .MuiOutlinedInput-root': {
                        color: 'white',
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
                </Grid>
                <Grid item xs={12} sm={1}>
                  <Stack direction="row" spacing={1} sx={{ height: '100%' }}>
                    {editingContactIndex !== null ? (
                      <>
                        <Button
                          variant="contained"
                          onClick={handleUpdateContactLink}
                          sx={{ 
                            textTransform: 'none', 
                            minWidth: 'auto', 
                            flex: 1,
                            bgcolor: 'white',
                            color: '#1F4545',
                            '&:hover': {
                              bgcolor: 'rgba(255, 255, 255, 0.9)',
                            },
                          }}
                        >
                          Save
                        </Button>
                        <Button
                          variant="outlined"
                          onClick={handleCancelEdit}
                          sx={{ 
                            textTransform: 'none', 
                            minWidth: 'auto', 
                            flex: 1,
                            borderColor: 'white',
                            color: 'white',
                            '&:hover': {
                              borderColor: 'white',
                              bgcolor: 'rgba(255, 255, 255, 0.1)',
                            },
                          }}
                        >
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={handleAddContactLink}
                        sx={{ 
                          textTransform: 'none', 
                          width: '100%',
                          bgcolor: 'white',
                          color: '#1F4545',
                          '&:hover': {
                            bgcolor: 'rgba(255, 255, 255, 0.9)',
                          },
                        }}
                      >
                        Add
                      </Button>
                    )}
                  </Stack>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Contact Links Display - Matching Landing Page Style */}
          {contactLinks.length > 0 ? (
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: { xs: 2, sm: 3, md: 4 },
              }}
            >
              {contactLinks.map((link, index) => {
                // Map platform name to icon component
                const getIcon = (platform) => {
                  const platformLower = (platform || '').toLowerCase();
                  switch (platformLower) {
                    case 'telegram':
                      return <TelegramIcon sx={{ fontSize: { xs: 32, md: 40 } }} />;
                    case 'linkedin':
                      return <LinkedInIcon sx={{ fontSize: { xs: 32, md: 40 } }} />;
                    case 'github':
                      return <GitHubIcon sx={{ fontSize: { xs: 32, md: 40 } }} />;
                    case 'email':
                      return <EmailIcon sx={{ fontSize: { xs: 32, md: 40 } }} />;
                    case 'phone':
                      return <PhoneIcon sx={{ fontSize: { xs: 32, md: 40 } }} />;
                    case 'instagram':
                      return <InstagramIcon sx={{ fontSize: { xs: 32, md: 40 } }} />;
                    case 'twitter':
                      return <TwitterIcon sx={{ fontSize: { xs: 32, md: 40 } }} />;
                    case 'facebook':
                      return <FacebookIcon sx={{ fontSize: { xs: 32, md: 40 } }} />;
                    case 'youtube':
                      return <YouTubeIcon sx={{ fontSize: { xs: 32, md: 40 } }} />;
                    case 'whatsapp':
                      return (
                        <Box
                          component="img"
                          src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg"
                          alt="WhatsApp"
                          sx={{
                            width: { xs: 32, md: 40 },
                            height: { xs: 32, md: 40 },
                            objectFit: 'contain',
                            filter: 'brightness(0) invert(1)',
                          }}
                          onError={(e) => {
                            // Fallback: show text if image fails to load
                            e.target.style.display = 'none';
                            const parent = e.target.parentElement;
                            if (parent && !parent.querySelector('.whatsapp-fallback')) {
                              const fallback = document.createElement('span');
                              fallback.className = 'whatsapp-fallback';
                              fallback.textContent = 'WA';
                              fallback.style.cssText = 'font-size: 18px; font-weight: bold; color: white; display: flex; align-items: center; justify-content: center;';
                              parent.appendChild(fallback);
                            }
                          }}
                        />
                      );
                    case 'website':
                      return <LanguageIcon sx={{ fontSize: { xs: 32, md: 40 } }} />;
                    case 'b17':
                      return (
                        <Box
                          component="img"
                          src="https://www.b17.ru/favicon.ico"
                          alt="B17"
                          sx={{
                            width: { xs: 32, md: 40 },
                            height: { xs: 32, md: 40 },
                            objectFit: 'contain',
                            filter: 'brightness(0) invert(1)',
                          }}
                          onError={(e) => {
                            // Fallback: show text if image fails to load
                            e.target.style.display = 'none';
                            const parent = e.target.parentElement;
                            if (parent && !parent.querySelector('.b17-fallback')) {
                              const fallback = document.createElement('span');
                              fallback.className = 'b17-fallback';
                              fallback.textContent = 'B17';
                              fallback.style.cssText = 'font-size: 18px; font-weight: bold; color: white; display: flex; align-items: center; justify-content: center;';
                              parent.appendChild(fallback);
                            }
                          }}
                        />
                      );
                    default:
                      return <LanguageIcon sx={{ fontSize: { xs: 32, md: 40 } }} />;
                  }
                };

                // Get display label
                const getLabel = (link) => {
                  if (link.description) {
                    return link.description;
                  }
                  return link.platform || 'Link';
                };

                return (
                  <Box
                    key={index}
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'flex-start',
                      position: 'relative',
                      transition: 'all 0.3s ease-in-out',
                      width: { xs: 80, sm: 100, md: 120 },
                      minHeight: { xs: 140, md: 150 },
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        '& .edit-delete-buttons': {
                          opacity: 1,
                        },
                      },
                    }}
                  >
                    {/* Icon Circle */}
                    <Box
                      sx={{
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: { xs: 56, md: 72 },
                        height: { xs: 56, md: 72 },
                        borderRadius: '50%',
                        bgcolor: 'rgba(255, 255, 255, 0.1)',
                        mb: 1.5,
                        flexShrink: 0,
                        transition: 'all 0.3s ease-in-out',
                        '&:hover': {
                          bgcolor: 'rgba(255, 255, 255, 0.2)',
                          transform: 'scale(1.1)',
                        },
                      }}
                    >
                      {getIcon(link.platform)}
                      
                      {/* Edit/Delete Buttons Overlay */}
                      <Box
                        className="edit-delete-buttons"
                        sx={{
                          position: 'absolute',
                          top: -8,
                          right: -8,
                          display: 'flex',
                          gap: 0.5,
                          opacity: 0,
                          transition: 'opacity 0.3s ease-in-out',
                          zIndex: 10,
                        }}
                      >
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditContactLink(index);
                          }}
                          sx={{
                            bgcolor: 'rgba(0, 0, 0, 0.8)',
                            color: 'white',
                            width: 28,
                            height: 28,
                            '&:hover': {
                              bgcolor: 'rgba(0, 0, 0, 1)',
                            },
                          }}
                        >
                          <EditIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteContactLink(index);
                          }}
                          sx={{
                            bgcolor: 'rgba(211, 47, 47, 0.9)',
                            color: 'white',
                            width: 28,
                            height: 28,
                            '&:hover': {
                              bgcolor: 'rgba(211, 47, 47, 1)',
                            },
                          }}
                        >
                          <DeleteIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                      </Box>
                    </Box>
                    
                    {/* Label */}
                    <Typography
                      variant="caption"
                      sx={{
                        fontSize: { xs: '0.75rem', md: '0.875rem' },
                        textAlign: 'center',
                        opacity: 0.9,
                        width: '100%',
                        minHeight: { xs: '2.5em', md: '2.5em' },
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        lineHeight: 1.3,
                        wordBreak: 'break-word',
                        hyphens: 'auto',
                        color: 'white',
                        mb: 0.5,
                      }}
                    >
                      {getLabel(link)}
                    </Typography>
                    
                    {/* URL Preview (small text below) */}
                    <Typography
                      variant="caption"
                      sx={{
                        fontSize: '0.65rem',
                        textAlign: 'center',
                        opacity: 0.6,
                        width: '100%',
                        color: 'white',
                        wordBreak: 'break-all',
                        lineHeight: 1.2,
                      }}
                    >
                      {link.value.length > 30 ? `${link.value.substring(0, 30)}...` : link.value}
                    </Typography>
                  </Box>
                );
              })}
            </Box>
          ) : (
            <Paper
              sx={{
                p: 4,
                textAlign: 'center',
                bgcolor: 'rgba(255, 255, 255, 0.1)',
                border: '2px dashed',
                borderColor: 'rgba(255, 255, 255, 0.3)',
                color: 'white',
              }}
            >
              <Typography variant="body2">
                No contact links added yet. Use the form above to add your first contact link.
              </Typography>
            </Paper>
          )}
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

    </Box>
  );
};

export default AdminHomePage;

