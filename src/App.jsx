import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import AppLayout from './components/AppLayout';
import LandingPage from './pages/LandingPage';
import BlogPage from './pages/BlogPage';
import ArticlePage from './pages/ArticlePage';
import ProfilePage from './pages/ProfilePage';
import BookingPage from './pages/BookingPage';
import SignUpPage from './pages/SignUpPage';
import AdminPage from './pages/AdminPage';
import AdminDashboard from './pages/AdminDashboard';
import AdminBlogPage from './pages/AdminBlogPage';
import AdminProfilePage from './pages/AdminProfilePage';
import AdminHomePage from './pages/AdminHomePage';
import AdminGalleryPage from './pages/AdminGalleryPage';
import AboutMePage from './pages/AboutMePage';
import SessionsConfigurationPage from './pages/SessionsConfigurationPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import AdminRoute from './components/AdminRoute';
import AdminRedirect from './components/AdminRedirect';
import ErrorBoundary from './components/ErrorBoundary';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
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
  Link as MuiLink,
  TextField,
  Alert,
  CircularProgress,
} from '@mui/material';
import { Link } from 'react-router-dom';
import { setToken, fetchWithAuth, hasAdminRole, getRolesFromToken } from './utils/api';
import axios from 'axios';
import dayjs from 'dayjs';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#2C5F5F', // Dark teal
      light: '#3A7A7A',
      dark: '#1F4545',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#4A9B9B', // Lighter teal for accents
      light: '#6BB8B8',
      dark: '#357575',
    },
  },
  components: {
    MuiButton: {
      defaultProps: {
        disableRipple: true,
      },
      styleOverrides: {
        root: {
          '&:focus': {
            outline: 'none',
            boxShadow: 'none',
          },
          '&:focus-visible': {
            outline: '2px solid',
            outlineColor: 'primary.main',
            outlineOffset: '2px',
          },
          // Remove shadow after click
          '&:active': {
            boxShadow: 'none',
          },
          // Remove shadow when not actively focused (for mouse clicks)
          '&:focus:not(:focus-visible)': {
            boxShadow: 'none',
          },
        },
      },
    },
    MuiIconButton: {
      defaultProps: {
        disableRipple: true,
      },
      styleOverrides: {
        root: {
          '&:focus': {
            outline: 'none',
            boxShadow: 'none',
          },
          '&:focus-visible': {
            outline: '2px solid',
            outlineColor: 'primary.main',
            outlineOffset: '2px',
          },
          '&:active': {
            boxShadow: 'none',
          },
          '&:focus:not(:focus-visible)': {
            boxShadow: 'none',
          },
        },
      },
    },
    MuiListItemButton: {
      defaultProps: {
        disableRipple: true,
      },
      styleOverrides: {
        root: {
          '&:focus': {
            outline: 'none',
            boxShadow: 'none',
          },
          '&:focus-visible': {
            outline: '2px solid',
            outlineColor: 'primary.main',
            outlineOffset: '2px',
          },
          '&:active': {
            boxShadow: 'none',
          },
          '&:focus:not(:focus-visible)': {
            boxShadow: 'none',
          },
        },
      },
    },
    MuiTab: {
      defaultProps: {
        disableRipple: true,
      },
    },
    // MuiChip doesn't support disableRipple prop
    MuiFab: {
      defaultProps: {
        disableRipple: true,
      },
    },
    MuiToggleButton: {
      defaultProps: {
        disableRipple: true,
      },
    },
    MuiCardActionArea: {
      defaultProps: {
        disableRipple: true,
      },
    },
  },
});

// Placeholder components for routes
const HomePage = () => {
  const { t } = useTranslation();
  const [healthStatus, setHealthStatus] = useState('');
  const [healthError, setHealthError] = useState('');
  const [checking, setChecking] = useState(false);
  const [accessStatus, setAccessStatus] = useState('');
  const [accessError, setAccessError] = useState('');
  const [checkingAccess, setCheckingAccess] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotsError, setSlotsError] = useState(null);
  const navigate = useNavigate();

  // Stub data for prices and services - TODO: Replace with API call
  const services = [
    {
      id: '1',
      name: 'Consultation',
      description: 'Initial consultation to discuss your needs and goals',
      price: 150,
      duration: '60 min',
      features: ['One-on-one session', 'Personalized assessment', 'Action plan'],
    },
    {
      id: '2',
      name: 'Monthly Package',
      description: 'Ongoing support with regular check-ins',
      price: 500,
      duration: 'Monthly',
      features: [
        '4 sessions per month',
        'Email support',
        'Progress tracking',
        'Customized approach',
      ],
    },
    {
      id: '3',
      name: 'Premium Package',
      description: 'Comprehensive support with priority access',
      price: 1200,
      duration: 'Monthly',
      features: [
        'Unlimited sessions',
        '24/7 priority support',
        'Detailed reports',
        'Custom solutions',
        'Quarterly review',
      ],
    },
  ];

  const handleCheckHealth = async () => {
    setChecking(true);
    setHealthStatus('');
    setHealthError('');

    try {
      const response = await fetchWithAuth(`api/v1/health`);
      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const text = await response.text();
      setHealthStatus(text || 'OK');
    } catch (error) {
      setHealthError(error.message || 'Unable to reach backend');
    } finally {
      setChecking(false);
    }
  };

  const handleCheckAccess = async () => {
    setCheckingAccess(true);
    setAccessStatus('');
    setAccessError('');

    try {
      const response = await fetchWithAuth(`api/v1/health/access`);
      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const text = await response.text();
      setAccessStatus(text || 'OK');
    } catch (error) {
      setAccessError(error.message || 'Unable to reach backend');
    } finally {
      setCheckingAccess(false);
    }
  };

  const handleBookSession = async () => {
    // Navigate to booking page - the page will handle session type selection and slot fetching
    navigate('/booking');
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Home Page
          </Typography>
          <Typography variant="body1" paragraph sx={{ mb: 0 }}>
            Welcome to the home page!
          </Typography>
        </Box>
        <Button
          variant="contained"
          color="primary"
          size="large"
          onClick={handleBookSession}
          disabled={loadingSlots}
          sx={{ textTransform: 'none' }}
        >
          {loadingSlots ? (
            <>
              <CircularProgress size={20} sx={{ mr: 1 }} />
              Loading...
            </>
          ) : (
            {/* Translation handled in component */}
          )}
        </Button>
      </Box>

      {slotsError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {slotsError}
        </Alert>
      )}

      {/* Health Check Section */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <Button
            variant="outlined"
            onClick={handleCheckHealth}
            disabled={checking}
          >
            {checking ? 'Checking…' : 'Check Backend Health'}
          </Button>
          <Button
            variant="outlined"
            onClick={handleCheckAccess}
            disabled={checkingAccess}
          >
            {checkingAccess ? 'Checking…' : 'Check Access'}
          </Button>
        </Box>
        {healthStatus && (
          <Typography variant="body2" color="success.main" sx={{ mb: 1 }}>
            Backend response: {healthStatus}
          </Typography>
        )}
        {healthError && (
          <Typography variant="body2" color="error.main" sx={{ mb: 1 }}>
            Backend error: {healthError}
          </Typography>
        )}
        {accessStatus && (
          <Typography variant="body2" color="success.main" sx={{ mb: 1 }}>
            Access response: {accessStatus}
          </Typography>
        )}
        {accessError && (
          <Typography variant="body2" color="error.main" sx={{ mb: 1 }}>
            Access error: {accessError}
          </Typography>
        )}
      </Box>

      {/* Prices and Services Section */}
      <Box sx={{ mt: 6 }}>
        <Typography variant="h4" component="h2" gutterBottom>
          {t('landing.services.title')}
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          {t('landing.services.description')}
        </Typography>

        <Grid container spacing={3} sx={{ mt: 2 }}>
          {services.map((service) => (
            <Grid item xs={12} md={4} key={service.id}>
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
                      {service.name}
                    </Typography>
                    <Chip
                      label={service.duration}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                  </Box>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    paragraph
                    sx={{ mb: 2 }}
                  >
                    {service.description}
                  </Typography>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="h4" component="span" color="primary">
                      ${service.price}
                    </Typography>
                    {service.duration === 'Monthly' && (
                      <Typography variant="body2" color="text.secondary" component="span">
                        /month
                      </Typography>
                    )}
                  </Box>
                  <List dense>
                    {service.features.map((feature, index) => (
                      <ListItem key={index} disablePadding>
                        <ListItemText
                          primary={feature}
                          primaryTypographyProps={{
                            variant: 'body2',
                          }}
                        />
                      </ListItem>
                    ))}
                  </List>
                </CardContent>
                <CardActions sx={{ p: 2, pt: 0 }}>
                  <Button
                    variant="contained"
                    fullWidth
                    color="primary"
                    sx={{ textTransform: 'none' }}
                  >
                    Book Now
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>
    </Box>
  );
};

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState({
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');
  
  // Get return path from location state
  const returnTo = location.state?.returnTo || '/booking';

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: '',
      }));
    }
    setSubmitError('');
  };

  const validateForm = () => {
    const newErrors = {
      email: '',
      password: '',
    };
    let isValid = true;

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
      isValid = false;
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Email must be valid';
      isValid = false;
    }

    if (!formData.password.trim()) {
      newErrors.password = 'Password is required';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email.trim(),
          password: formData.password,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message ||
            `Login failed: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();
      
      // Save token to sessionStorage
      if (data.token) {
        setToken(data.token);
        // Dispatch custom event to notify AppLayout of auth change
        window.dispatchEvent(new Event('auth-changed'));
        
        // Check if user has admin role - check both response roles and token
        const responseRoles = data.roles || [];
        const tokenRoles = getRolesFromToken(data.token);
        const allRoles = [...new Set([...responseRoles, ...tokenRoles])]; // Combine and deduplicate
        const isAdmin = allRoles.includes('ROLE_ADMIN') || allRoles.includes('ADMIN_ROLE');
        
        console.log('Response roles:', responseRoles);
        console.log('Token roles:', tokenRoles);
        console.log('All roles:', allRoles);
        console.log('Is admin?', isAdmin);
        
        if (isAdmin) {
          // Admin user - redirect to admin dashboard
          console.log('Redirecting to /admin/dashboard');
          navigate('/admin/dashboard');
        } else {
          // Regular user - redirect to return path or home page
          console.log('Redirecting to', returnTo);
          navigate(returnTo);
        }
      } else {
        throw new Error('No token received from server');
      }
    } catch (error) {
      console.error('Error logging in:', error);
      setSubmitError(error.message || 'Failed to login. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '60vh',
      }}
    >
      <Card sx={{ maxWidth: 500, width: '100%' }}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom align="center">
            Login
          </Typography>
          <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 3 }}>
            Sign in to your account
          </Typography>

          {submitError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {submitError}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} noValidate>
            <TextField
              fullWidth
              id="email"
              name="email"
              label="Email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              error={!!errors.email}
              helperText={errors.email}
              margin="normal"
              required
              autoComplete="email"
              disabled={loading}
            />

            <TextField
              fullWidth
              id="password"
              name="password"
              label="Password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              error={!!errors.password}
              helperText={errors.password}
              margin="normal"
              required
              autoComplete="current-password"
              disabled={loading}
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              color="primary"
              sx={{ mt: 3, mb: 2 }}
              disabled={loading}
            >
              {loading ? (
                <>
                  <CircularProgress size={20} sx={{ mr: 1 }} />
                  Logging in...
                </>
              ) : (
                'Login'
              )}
            </Button>

            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="body2">
                Don't have an account?{' '}
                <MuiLink component={Link} to="/signup">
                  Sign up
                </MuiLink>
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

const AccountPage = () => (
  <div>
    <h1>My Account</h1>
    <p>Account settings and information.</p>
  </div>
);

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <ErrorBoundary>
        <Router>
          <AdminRedirect>
            <AppLayout>
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/blog" element={<BlogPage />} />
                <Route path="/blog/:articleId" element={<ArticlePage />} />
                <Route path="/booking" element={<BookingPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/signup" element={<SignUpPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/about-me" element={<AboutMePage />} />
                <Route path="/admin" element={<AdminPage />} />
                {/* All /admin/* routes except /admin itself are protected by AdminRoute */}
                <Route
                  path="/admin/*"
                  element={
                    <AdminRoute>
                      <Routes>
                        <Route path="dashboard" element={<AdminDashboard />} />
                        <Route path="home" element={<AdminHomePage />} />
                        <Route path="blog" element={<AdminBlogPage />} />
                        <Route path="gallery" element={<AdminGalleryPage />} />
                        <Route path="profile" element={<AdminProfilePage />} />
                        <Route path="session/configuration" element={<SessionsConfigurationPage />} />
                        {/* Add more admin routes here as needed */}
                      </Routes>
                    </AdminRoute>
                  }
                />
              </Routes>
            </AppLayout>
          </AdminRedirect>
        </Router>
      </ErrorBoundary>
    </ThemeProvider>
  );
}

export default App;

