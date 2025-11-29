import React, { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  List,
  ListItem,
  ListItemText,
  Chip,
  Container,
  CircularProgress,
  Alert,
  TextField,
  Avatar,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import dayjs from 'dayjs';
import axios from 'axios';
import apiClient from '../utils/api';
import BookingPageContent from './BookingPage';
import { loadImageWithCache } from '../utils/imageCache';

const LandingPage = () => {
  const navigate = useNavigate();
  const heroRef = useRef(null);
  const aboutRef = useRef(null);
  const servicesRef = useRef(null);
  const testimonialsRef = useRef(null);
  const contactRef = useRef(null);

  const [aboutMeData, setAboutMeData] = useState(null);
  const [aboutMeLoading, setAboutMeLoading] = useState(false);
  const [aboutMeError, setAboutMeError] = useState(null);
  const [welcomeData, setWelcomeData] = useState(null);
  const [welcomeLoading, setWelcomeLoading] = useState(true);
  const [welcomeError, setWelcomeError] = useState(null);
  
  // Image URLs state
  const [welcomeImageUrl, setWelcomeImageUrl] = useState(null);
  const [aboutImageUrl, setAboutImageUrl] = useState(null);
  const [educationImageUrl, setEducationImageUrl] = useState(null);
  const educationRef = useRef(null);
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    message: '',
  });
  const [contactSubmitting, setContactSubmitting] = useState(false);
  const [contactSuccess, setContactSuccess] = useState(false);
  const [contactError, setContactError] = useState('');
  
  // Session types state
  const [sessionTypes, setSessionTypes] = useState([]);
  const [loadingSessionTypes, setLoadingSessionTypes] = useState(true);
  const [sessionTypesError, setSessionTypesError] = useState(null);
  const [selectedSessionTypeId, setSelectedSessionTypeId] = useState(null);
  const [selectedSessionType, setSelectedSessionType] = useState(null);
  const [bookingDialogOpen, setBookingDialogOpen] = useState(false);

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

  // Fetch welcome data
  useEffect(() => {
    const fetchWelcomeData = async () => {
      setWelcomeLoading(true);
      setWelcomeError(null);
      try {
        const response = await fetch('/api/v1/public/welcome');
        if (!response.ok) {
          throw new Error(`Failed to load: ${response.status}`);
        }
        const data = await response.json();
        setWelcomeData(data);
        // Set about-me data from welcome response for backward compatibility
        if (data.aboutMessage) {
          setAboutMeData(data.aboutMessage);
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
      } catch (error) {
        console.error('Error fetching welcome data:', error);
        setWelcomeError(error.message || 'Failed to load welcome information');
      } finally {
        setWelcomeLoading(false);
      }
    };
    fetchWelcomeData();
  }, []);

  // Fetch session types
  useEffect(() => {
    const fetchSessionTypes = async () => {
      setLoadingSessionTypes(true);
      setSessionTypesError(null);
      try {
        const response = await apiClient.get('/api/v1/public/session/type', {
          timeout: 10000,
        });
        if (response.data && Array.isArray(response.data)) {
          setSessionTypes(response.data);
          // Set first session type as default if available
          if (response.data.length > 0) {
            setSelectedSessionTypeId(response.data[0].id || response.data[0].sessionTypeId);
          }
        } else {
          setSessionTypes([]);
        }
      } catch (error) {
        console.error('Error fetching session types:', error);
        setSessionTypesError(error.message || 'Failed to load session types');
        setSessionTypes([]);
      } finally {
        setLoadingSessionTypes(false);
      }
    };
    fetchSessionTypes();
  }, []);

  // Smooth scroll function
  const scrollToSection = (ref) => {
    if (ref && ref.current) {
      ref.current.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }
  };

  // Handle contact form submission
  const handleContactSubmit = async (e) => {
    e.preventDefault();
    setContactSubmitting(true);
    setContactError('');
    setContactSuccess(false);

    try {
      // TODO: Replace with actual contact API endpoint
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setContactSuccess(true);
      setContactForm({ name: '', email: '', message: '' });
    } catch (error) {
      setContactError('Failed to send message. Please try again.');
    } finally {
      setContactSubmitting(false);
    }
  };

  return (
    <Box sx={{ bgcolor: '#2C5F5F' }}>
      {/* Hero Section */}
      <Box
        ref={heroRef}
        id="hero"
        component="section"
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          color: 'white',
          textAlign: 'center',
          pt: { xs: '80px', sm: '90px', md: '100px' },
          pb: 8,
          overflow: 'hidden',
          width: '100%',
          marginTop: 0,
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
          <Typography
            variant="h1"
            component="h1"
            gutterBottom
            sx={{ fontSize: { xs: '2.5rem', md: '3.5rem' }, fontWeight: 700, mb: 3 }}
          >
            {welcomeLoading ? (
              <CircularProgress size={40} sx={{ color: 'white' }} />
            ) : welcomeError ? (
              'Welcome to Your Journey'
            ) : welcomeData?.welcomeMessage || 'Welcome to Your Journey'}
          </Typography>
          <Button
            variant="contained"
            size="large"
            onClick={() => scrollToSection(servicesRef)}
            sx={{
              px: 4,
              py: 1.5,
              fontSize: '1.1rem',
              textTransform: 'none',
              bgcolor: 'white',
              color: '#2C5F5F',
              fontWeight: 600,
              '&:hover': {
                bgcolor: 'grey.100',
              },
            }}
          >
            Book a Session
          </Button>
        </Container>
      </Box>

      {/* About Section */}
      <Box
        ref={aboutRef}
        id="about"
        component="section"
        sx={{
          py: { xs: 6, md: 10 },
          bgcolor: 'background.paper',
          scrollMarginTop: '64px',
        }}
      >
        <Container maxWidth="lg">
          <Grid container spacing={0} sx={{ alignItems: 'center' }}>
            {/* Left Column - Text Content */}
            <Grid item xs={12} md={6} sx={{ px: { xs: 2, sm: 4, md: 6 }, py: { xs: 4, md: 6 } }}>
              <Box sx={{ maxWidth: '600px' }}>
                {/* Header with line above */}
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

                {/* Content */}
                {welcomeLoading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                    <CircularProgress />
                  </Box>
                ) : welcomeError ? (
                  <Alert severity="error" sx={{ mb: 3 }}>{welcomeError}</Alert>
                ) : welcomeData?.aboutMessage ? (
                  <Box sx={{ mb: 4 }}>
                    <Typography
                      variant="body1"
                      sx={{
                        fontSize: { xs: '0.95rem', md: '1rem' },
                        lineHeight: 1.8,
                        color: 'text.primary',
                        mb: 2,
                        whiteSpace: 'pre-wrap',
                        fontFamily: 'sans-serif',
                      }}
                    >
                      {typeof welcomeData.aboutMessage === 'string'
                        ? welcomeData.aboutMessage.split('\n\n')[0] || welcomeData.aboutMessage
                        : welcomeData.aboutMessage}
                    </Typography>
                    {typeof welcomeData.aboutMessage === 'string' && welcomeData.aboutMessage.split('\n\n').length > 1 && (
                      <Typography
                        variant="body1"
                        sx={{
                          fontSize: { xs: '0.95rem', md: '1rem' },
                          lineHeight: 1.8,
                          color: 'text.primary',
                          whiteSpace: 'pre-wrap',
                          fontFamily: 'sans-serif',
                        }}
                      >
                        {welcomeData.aboutMessage.split('\n\n').slice(1).join('\n\n')}
                      </Typography>
                    )}
                  </Box>
                ) : (
                  <Box sx={{ mb: 4 }}>
                    <Typography
                      variant="body1"
                      sx={{
                        fontSize: { xs: '0.95rem', md: '1rem' },
                        lineHeight: 1.8,
                        color: 'text.secondary',
                        fontStyle: 'italic',
                        fontFamily: 'sans-serif',
                      }}
                    >
                      Content will be provided soon.
                    </Typography>
                  </Box>
                )}

                {/* Buttons */}
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mt: 4 }}>
                  <Button
                    variant="contained"
                    onClick={() => navigate('/about-me')}
                    sx={{
                      bgcolor: 'black',
                      color: 'white',
                      textTransform: 'none',
                      px: 4,
                      py: 1.5,
                      fontSize: '1rem',
                      fontWeight: 500,
                      borderRadius: 0,
                      '&:hover': {
                        bgcolor: '#333',
                      },
                    }}
                  >
                    Read More
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={() => scrollToSection(servicesRef)}
                    sx={{
                      borderColor: 'black',
                      color: 'black',
                      textTransform: 'none',
                      px: 4,
                      py: 1.5,
                      fontSize: '1rem',
                      fontWeight: 500,
                      borderRadius: 0,
                      '&:hover': {
                        borderColor: '#333',
                        bgcolor: 'rgba(0, 0, 0, 0.05)',
                      },
                    }}
                  >
                    Free Consultation
                  </Button>
                </Box>
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
                }}
              >
                {aboutImageUrl ? (
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
                    {aboutMeData && typeof aboutMeData === 'object' && aboutMeData.name
                      ? aboutMeData.name.charAt(0).toUpperCase()
                      : 'A'}
                  </Avatar>
                )}
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Education Section */}
      <Box
        ref={educationRef}
        id="education"
        component="section"
        sx={{
          py: { xs: 6, md: 10 },
          bgcolor: '#F0F7F7',
          scrollMarginTop: '64px',
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
                }}
              >
                {educationImageUrl ? (
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
              </Box>
            </Grid>

            {/* Right Column - Text Content */}
            <Grid item xs={12} md={6} sx={{ px: { xs: 2, sm: 4, md: 6 }, py: { xs: 4, md: 6 }, order: { xs: 1, md: 2 } }}>
              <Box sx={{ maxWidth: '600px', mx: { xs: 'auto', md: 0 } }}>
                {/* Header with line above */}
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

                {/* Content */}
                {welcomeLoading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                    <CircularProgress />
                  </Box>
                ) : welcomeError ? (
                  <Alert severity="error" sx={{ mb: 3 }}>{welcomeError}</Alert>
                ) : welcomeData?.educationMessage ? (
                  <Box sx={{ mb: 4 }}>
                    <Typography
                      variant="body1"
                      sx={{
                        fontSize: { xs: '0.95rem', md: '1rem' },
                        lineHeight: 1.8,
                        color: 'text.primary',
                        whiteSpace: 'pre-wrap',
                        fontFamily: 'sans-serif',
                      }}
                    >
                      {welcomeData.educationMessage}
                    </Typography>
                  </Box>
                ) : (
                  <Typography
                    variant="body1"
                    sx={{
                      fontSize: { xs: '0.95rem', md: '1rem' },
                      lineHeight: 1.8,
                      color: 'text.primary',
                      fontFamily: 'sans-serif',
                    }}
                  >
                    Content will be provided soon.
                  </Typography>
                )}
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Services Section */}
      <Box
        ref={servicesRef}
        id="services"
        component="section"
        sx={{
          py: 8,
          bgcolor: '#F0F7F7', // Light teal tint background
          scrollMarginTop: '64px',
        }}
      >
        <Container maxWidth="lg">
          <Typography
            variant="h3"
            component="h2"
            align="center"
            gutterBottom
            sx={{ mb: 2, fontWeight: 600 }}
          >
            Services & Pricing
          </Typography>
          <Typography
            variant="body1"
            color="text.secondary"
            align="center"
            paragraph
            sx={{ mb: 4 }}
          >
            Choose the service package that best fits your needs
          </Typography>

          {loadingSessionTypes ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : sessionTypesError ? (
            <Alert severity="error" sx={{ mb: 2 }}>
              {sessionTypesError}
            </Alert>
          ) : sessionTypes.length > 0 ? (
            <Grid container spacing={3} sx={{ mt: 2 }}>
              {sessionTypes.map((sessionType) => (
                <Grid item xs={12} md={4} key={sessionType.id || sessionType.sessionTypeId}>
                  <Card
                    sx={{
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: 4,
                      },
                    }}
                  >
                    <CardContent sx={{ flexGrow: 1 }}>
                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          mb: 2,
                        }}
                      >
                        <Typography variant="h5" component="h3">
                          {sessionType.name}
                        </Typography>
                        <Chip
                          label={`${sessionType.durationMinutes || 60} min`}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                      </Box>
                      {sessionType.description && (
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          paragraph
                          sx={{ mb: 2 }}
                        >
                          {sessionType.description}
                        </Typography>
                      )}
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="h4" component="span" color="primary">
                          ${sessionType.price || 0}
                        </Typography>
                      </Box>
                    </CardContent>
                    <CardActions sx={{ p: 2, pt: 0 }}>
                      <Button
                        variant="contained"
                        fullWidth
                        color="primary"
                        onClick={() => {
                          const sessionTypeId = sessionType.id || sessionType.sessionTypeId;
                          setSelectedSessionTypeId(sessionTypeId);
                          setSelectedSessionType(sessionType);
                          setBookingDialogOpen(true);
                        }}
                        sx={{ textTransform: 'none' }}
                      >
                        Book Now
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>
          ) : (
            <Alert severity="info" sx={{ mt: 2 }}>
              No session types available at this time.
            </Alert>
          )}
        </Container>
      </Box>

      {/* Booking Dialog - Popup */}
      <Dialog
        open={bookingDialogOpen}
        onClose={() => {
          setBookingDialogOpen(false);
          // Reset selected session type when closing
          setTimeout(() => {
            setSelectedSessionType(null);
            setSelectedSessionTypeId(null);
          }, 300);
        }}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            maxHeight: '90vh',
          },
        }}
      >
        <DialogTitle
          sx={{
            bgcolor: 'primary.main',
            color: 'white',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            py: 2,
          }}
        >
          <Typography variant="h5" component="h2" sx={{ fontWeight: 600 }}>
            Book a Session
          </Typography>
          <IconButton
            onClick={() => {
              setBookingDialogOpen(false);
              setTimeout(() => {
                setSelectedSessionType(null);
                setSelectedSessionTypeId(null);
              }, 300);
            }}
            sx={{ color: 'white' }}
            size="small"
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 0 }}>
          {/* Session Type Info Card */}
          {selectedSessionType && (
            <Box
              sx={{
                bgcolor: 'primary.light',
                color: 'white',
                p: 3,
                mb: 3,
              }}
            >
              <Typography variant="h5" component="h3" gutterBottom sx={{ fontWeight: 600 }}>
                {selectedSessionType.name}
              </Typography>
              {selectedSessionType.description && (
                <Typography variant="body1" sx={{ mb: 2, opacity: 0.95 }}>
                  {selectedSessionType.description}
                </Typography>
              )}
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mt: 2 }}>
                <Chip
                  label={`${selectedSessionType.durationMinutes || 60} minutes`}
                  sx={{
                    bgcolor: 'rgba(255, 255, 255, 0.2)',
                    color: 'white',
                    fontWeight: 500,
                  }}
                />
                <Chip
                  label={`$${selectedSessionType.price || 0}`}
                  sx={{
                    bgcolor: 'rgba(255, 255, 255, 0.2)',
                    color: 'white',
                    fontWeight: 'bold',
                    fontSize: '1rem',
                  }}
                />
              </Box>
            </Box>
          )}
          {/* Booking Form */}
          <Box sx={{ px: 3, pb: 3 }}>
            <BookingPageContent sessionTypeId={selectedSessionTypeId} />
          </Box>
        </DialogContent>
      </Dialog>

      {/* Testimonials Section */}
      <Box
        ref={testimonialsRef}
        id="testimonials"
        component="section"
        sx={{
          py: 8,
          bgcolor: '#F0F7F7', // Light teal tint background
          scrollMarginTop: '64px',
        }}
      >
        <Container maxWidth="lg">
          <Typography
            variant="h3"
            component="h2"
            align="center"
            gutterBottom
            sx={{ mb: 4, fontWeight: 600 }}
          >
            Testimonials
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="body1" sx={{ mb: 2, fontStyle: 'italic' }}>
                    "This coaching has transformed my life. I couldn't be happier with the
                    results!"
                  </Typography>
                  <Typography variant="subtitle2" color="text.secondary">
                    - Client Name
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="body1" sx={{ mb: 2, fontStyle: 'italic' }}>
                    "Professional, insightful, and truly caring. Highly recommend!"
                  </Typography>
                  <Typography variant="subtitle2" color="text.secondary">
                    - Client Name
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="body1" sx={{ mb: 2, fontStyle: 'italic' }}>
                    "The best investment I've made in myself. Thank you!"
                  </Typography>
                  <Typography variant="subtitle2" color="text.secondary">
                    - Client Name
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Contact Section */}
      <Box
        ref={contactRef}
        id="contact"
        component="section"
        sx={{
          py: 8,
          bgcolor: 'background.paper',
          scrollMarginTop: '64px',
        }}
      >
        <Container maxWidth="md">
          <Typography
            variant="h3"
            component="h2"
            align="center"
            gutterBottom
            sx={{ mb: 2, fontWeight: 600 }}
          >
            Get in Touch
          </Typography>
          <Typography
            variant="body1"
            color="text.secondary"
            align="center"
            paragraph
            sx={{ mb: 4 }}
          >
            Have questions? We'd love to hear from you.
          </Typography>
          <Card>
            <CardContent sx={{ p: 4 }}>
              {contactSuccess && (
                <Alert severity="success" sx={{ mb: 2 }}>
                  Thank you for your message! We'll get back to you soon.
                </Alert>
              )}
              {contactError && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {contactError}
                </Alert>
              )}
              <Box component="form" onSubmit={handleContactSubmit}>
                <TextField
                  fullWidth
                  label="Name"
                  value={contactForm.name}
                  onChange={(e) =>
                    setContactForm({ ...contactForm, name: e.target.value })
                  }
                  margin="normal"
                  required
                  disabled={contactSubmitting}
                />
                <TextField
                  fullWidth
                  label="Email"
                  type="email"
                  value={contactForm.email}
                  onChange={(e) =>
                    setContactForm({ ...contactForm, email: e.target.value })
                  }
                  margin="normal"
                  required
                  disabled={contactSubmitting}
                />
                <TextField
                  fullWidth
                  label="Message"
                  multiline
                  rows={4}
                  value={contactForm.message}
                  onChange={(e) =>
                    setContactForm({ ...contactForm, message: e.target.value })
                  }
                  margin="normal"
                  required
                  disabled={contactSubmitting}
                />
                <Button
                  type="submit"
                  variant="contained"
                  fullWidth
                  sx={{ mt: 3, textTransform: 'none' }}
                  disabled={contactSubmitting}
                >
                  {contactSubmitting ? (
                    <>
                      <CircularProgress size={20} sx={{ mr: 1 }} />
                      Sending...
                    </>
                  ) : (
                    'Send Message'
                  )}
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Container>
      </Box>
    </Box>
  );
};

export default LandingPage;

