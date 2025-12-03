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
import ArrowBackIosIcon from '@mui/icons-material/ArrowBackIos';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
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
  const [reviewImageUrls, setReviewImageUrls] = useState([]);
  const [reviewCarouselIndex, setReviewCarouselIndex] = useState(0);
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

  // Footer/Contact Links
  // Data comes from /api/v1/public/welcome response in the "contact" field
  // Expected backend response format:
  // {
  //   "contact": [
  //     {
  //       "platform": "Telegram",  // Required: Platform name (Telegram, LinkedIn, GitHub, Email, Phone, Instagram, Twitter, Facebook, YouTube, WhatsApp, Website, B17)
  //       "value": "https://t.me/username",  // Required: URL or contact value
  //       "description": "Personal Account"  // Optional: Short description/label
  //     },
  //     {
  //       "platform": "Telegram",
  //       "value": "https://t.me/channel",
  //       "description": "Channel"
  //     }
  //   ]
  // }
  const [contactLinks, setContactLinks] = useState([]);

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
        
        // Load review images if reviewMediaIds exist
        if (data.reviewMediaIds && Array.isArray(data.reviewMediaIds) && data.reviewMediaIds.length > 0) {
          const loadReviewImages = async () => {
            const imagePromises = data.reviewMediaIds.map(mediaId => 
              loadImageWithCache(mediaId).catch(err => {
                console.error(`Error loading review image ${mediaId}:`, err);
                return null;
              })
            );
            const urls = await Promise.all(imagePromises);
            setReviewImageUrls(urls.filter(url => url !== null));
          };
          loadReviewImages();
        }
        
        // Load contact links if available
        if (data.contact && Array.isArray(data.contact)) {
          setContactLinks(data.contact);
        } else {
          // Fallback to stub data if no contact data
          setContactLinks([
            {
              platform: 'Telegram',
              value: 'https://t.me/example',
              description: 'Telegram',
            },
            {
              platform: 'LinkedIn',
              value: 'https://www.linkedin.com/in/example',
              description: 'LinkedIn',
            },
            {
              platform: 'GitHub',
              value: 'https://github.com/example',
              description: 'GitHub',
            },
            {
              platform: 'Email',
              value: 'mailto:contact@example.com',
              description: 'Email',
            },
          ]);
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

      {/* Testimonials/Reviews Section */}
      {welcomeData?.reviewMessage || (reviewImageUrls && reviewImageUrls.length > 0) ? (
        <Box
          ref={testimonialsRef}
          id="testimonials"
          component="section"
          sx={{
            py: { xs: 6, md: 10 },
            bgcolor: 'background.paper',
            scrollMarginTop: '64px',
          }}
        >
          <Container maxWidth="lg">
            {/* Header with line above */}
            <Box sx={{ mb: 4, textAlign: 'center' }}>
              <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                <Divider 
                  sx={{ 
                    width: '60px', 
                    height: '2px', 
                    bgcolor: 'black',
                  }} 
                />
              </Box>
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

            {/* Review Message */}
            {welcomeData?.reviewMessage && (
              <Box sx={{ mb: 6, textAlign: 'center', maxWidth: '800px', mx: 'auto', px: { xs: 2, sm: 4 } }}>
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
                  {welcomeData.reviewMessage}
                </Typography>
              </Box>
            )}

            {/* Review Images Carousel */}
            {reviewImageUrls && reviewImageUrls.length > 0 && (
              <Box sx={{ position: 'relative', width: '100%' }}>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 2,
                    position: 'relative',
                  }}
                >
                  {/* Left Arrow */}
                  {reviewImageUrls.length > 3 && (
                    <IconButton
                      onClick={() => {
                        setReviewCarouselIndex((prev) => {
                          if (prev === 0) {
                            // Wrap to end
                            return reviewImageUrls.length - 3;
                          }
                          return prev - 1;
                        });
                      }}
                      sx={{
                        position: 'absolute',
                        left: { xs: -10, md: -40 },
                        zIndex: 2,
                        bgcolor: 'white',
                        boxShadow: 2,
                        '&:hover': {
                          bgcolor: 'grey.100',
                        },
                      }}
                    >
                      <ArrowBackIosIcon />
                    </IconButton>
                  )}

                  {/* Image Frames Container */}
                  <Box
                    sx={{
                      display: 'flex',
                      gap: 2,
                      overflow: 'hidden',
                      width: '100%',
                      justifyContent: 'center',
                      maxWidth: { xs: '100%', md: '900px' },
                    }}
                  >
                    {Array.from({ length: 3 }).map((_, frameIndex) => {
                      const imageIndex = reviewCarouselIndex + frameIndex;
                      const imageUrl = reviewImageUrls[imageIndex] || null;
                      
                      return (
                        <Box
                          key={frameIndex}
                          sx={{
                            flex: '1 1 0',
                            minWidth: 0,
                            maxWidth: { xs: '100%', sm: '300px' },
                            aspectRatio: '4/3',
                            position: 'relative',
                            overflow: 'hidden',
                            bgcolor: '#F0F7F7',
                            border: '1px solid',
                            borderColor: 'divider',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {imageUrl ? (
                            <Box
                              component="img"
                              src={imageUrl}
                              alt={`Review ${imageIndex + 1}`}
                              sx={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'contain',
                              }}
                            />
                          ) : (
                            <Box
                              sx={{
                                width: '100%',
                                height: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                bgcolor: '#E0E0E0',
                              }}
                            >
                              <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{ fontStyle: 'italic' }}
                              >
                                {imageIndex < reviewImageUrls.length ? 'Loading...' : ''}
                              </Typography>
                            </Box>
                          )}
                        </Box>
                      );
                    })}
                  </Box>

                  {/* Right Arrow */}
                  {reviewImageUrls.length > 3 && (
                    <IconButton
                      onClick={() => {
                        const maxIndex = reviewImageUrls.length - 3;
                        setReviewCarouselIndex((prev) => {
                          if (prev >= maxIndex) {
                            // Wrap to beginning
                            return 0;
                          }
                          return prev + 1;
                        });
                      }}
                      sx={{
                        position: 'absolute',
                        right: { xs: -10, md: -40 },
                        zIndex: 2,
                        bgcolor: 'white',
                        boxShadow: 2,
                        '&:hover': {
                          bgcolor: 'grey.100',
                        },
                      }}
                    >
                      <ArrowForwardIosIcon />
                    </IconButton>
                  )}
                </Box>
              </Box>
            )}
          </Container>
        </Box>
      ) : null}

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

      {/* Footer/Contact Links Section */}
      <Box
        component="footer"
        sx={{
          py: { xs: 6, md: 8 },
          bgcolor: '#1F4545',
          color: 'white',
          scrollMarginTop: '64px',
        }}
      >
        <Container maxWidth="lg">
          <Typography
            variant="h4"
            component="h2"
            align="center"
            gutterBottom
            sx={{
              mb: 4,
              fontWeight: 600,
              fontSize: { xs: '1.5rem', md: '2rem' },
            }}
          >
            Connect With Me
          </Typography>
          <Typography
            variant="body1"
            align="center"
            sx={{
              mb: 4,
              opacity: 0.9,
              fontSize: { xs: '0.9rem', md: '1rem' },
            }}
          >
            Follow me on social media or reach out directly
          </Typography>
          
          {/* Social Links */}
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
                  component="a"
                  href={link.value}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'flex-start',
                    textDecoration: 'none',
                    color: 'white',
                    transition: 'all 0.3s ease-in-out',
                    width: { xs: 80, sm: 100, md: 120 },
                    minHeight: { xs: 100, md: 110 },
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      opacity: 0.8,
                    },
                  }}
                >
                  <Box
                    sx={{
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
                  </Box>
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
                    }}
                  >
                    {getLabel(link)}
                  </Typography>
                </Box>
              );
            })}
          </Box>

          {/* Copyright */}
          <Box
            sx={{
              mt: 6,
              pt: 4,
              borderTop: '1px solid rgba(255, 255, 255, 0.1)',
              textAlign: 'center',
            }}
          >
            <Typography
              variant="body2"
              sx={{
                opacity: 0.7,
                fontSize: { xs: '0.75rem', md: '0.875rem' },
              }}
            >
              © {new Date().getFullYear()} All rights reserved.
            </Typography>
          </Box>
        </Container>
      </Box>
    </Box>
  );
};

export default LandingPage;

