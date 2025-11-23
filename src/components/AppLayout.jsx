import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { fetchWithAuth, getToken, removeToken, decodeToken } from '../utils/api';
import {
  AppBar,
  Toolbar,
  Typography,
  Container,
  Box,
  Button,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip,
  Chip,
} from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';

const AppLayout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [hasToken, setHasToken] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [aboutMeOpen, setAboutMeOpen] = useState(false);
  const [aboutMeData, setAboutMeData] = useState(null);
  const [aboutMeLoading, setAboutMeLoading] = useState(false);
  const [aboutMeError, setAboutMeError] = useState(null);

  // Check if current route is an admin route
  const isAdminRoute = location.pathname.startsWith('/admin');

  // Fetch user profile
  const lastFetchedTokenRef = useRef(null);
  const fetchUserProfile = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setUserProfile(null);
      lastFetchedTokenRef.current = null;
      return;
    }

    // Avoid refetching if we've already fetched for this token
    if (lastFetchedTokenRef.current === token) {
      return;
    }

    setProfileLoading(true);
    try {
      const response = await fetchWithAuth('/api/v1/user/profile');
      if (!response.ok) {
        throw new Error(`Failed to load profile: ${response.status}`);
      }
      const data = await response.json();
      setUserProfile(data);
      lastFetchedTokenRef.current = token;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      setUserProfile(null);
      lastFetchedTokenRef.current = null;
    } finally {
      setProfileLoading(false);
    }
  }, []);

  // Get display name from user profile
  const getUserDisplayName = () => {
    if (userProfile) {
      const firstName = userProfile.firstName || '';
      const lastName = userProfile.lastName || '';
      const name = `${firstName} ${lastName}`.trim();
      return name || userProfile.email || '';
    }
    // Fallback: try to derive from token if profile not loaded yet
    const token = getToken();
    const decoded = decodeToken(token);
    if (decoded) {
      const name =
        [decoded.given_name, decoded.family_name].filter(Boolean).join(' ').trim() ||
        decoded.name ||
        decoded.preferred_username ||
        decoded.username ||
        decoded.user_name ||
        decoded.email ||
        decoded.sub;
      if (name) return name;
    }
    return '';
  };

  // Check token on mount and listen for storage changes
  useEffect(() => {
    const checkToken = () => {
      const tokenExists = !!getToken();
      setHasToken(tokenExists);
      if (tokenExists) {
        fetchUserProfile();
      } else {
        setUserProfile(null);
      }
    };

    // Check initially
    checkToken();

    // Listen for storage changes (e.g., when login happens in another tab)
    const handleStorageChange = (e) => {
      if (e.key === 'auth_token' || e.key === null) {
        checkToken();
      }
    };

    // Listen for custom event when login happens in same tab
    const handleLogin = () => {
      checkToken();
    };

    // Check when window regains focus (user might have logged in in another tab)
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('auth-changed', handleLogin);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('auth-changed', handleLogin);
    };
  }, [fetchUserProfile]);

  const handleLogout = () => {
    removeToken();
    setHasToken(false);
    setUserProfile(null);
    // Dispatch custom event to notify other components of auth change
    window.dispatchEvent(new Event('auth-changed'));
    navigate('/');
  };

  const handleAboutMeOpen = () => {
    setAboutMeOpen(true);
  };

  const handleAboutMeClose = () => {
    setAboutMeOpen(false);
    setAboutMeError(null);
  };

  // Fetch about me data when dialog opens
  useEffect(() => {
    if (aboutMeOpen && !aboutMeData) {
      const fetchAboutMe = async () => {
        setAboutMeLoading(true);
        setAboutMeError(null);
        try {
          const response = await fetchWithAuth('/api/v1/pages/about-me');
          if (!response.ok) {
            throw new Error(`Failed to load: ${response.status}`);
          }
          const data = await response.json();
          setAboutMeData(data);
        } catch (error) {
          console.error('Error fetching about me:', error);
          setAboutMeError(error.message || 'Failed to load about me information');
        } finally {
          setAboutMeLoading(false);
        }
      };
      fetchAboutMe();
    }
  }, [aboutMeOpen, aboutMeData]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar position="static">
        <Toolbar>
          {/* Branding - Left side - Hide on admin routes */}
          {!isAdminRoute && (
            <Typography
              variant="h6"
              component={Link}
              to="/"
              sx={{
                flexGrow: 0,
                textDecoration: 'none',
                color: 'inherit',
                mr: 4,
              }}
            >
              Professional's Name
            </Typography>
          )}

          {/* Spacer */}
          <Box sx={{ flexGrow: 1 }} />

          {/* Navigation Links - Right side */}
          <Stack direction="row" spacing={2} alignItems="center">
            {/* Hide all navigation buttons on admin routes except Logout */}
            {!isAdminRoute && (
              <>
                {/* Public Links - Always visible */}
                <Button
                  component={Link}
                  to="/"
                  color="inherit"
                  sx={{ textTransform: 'none' }}
                >
                  Home
                </Button>
                <Button
                  onClick={handleAboutMeOpen}
                  color="inherit"
                  sx={{ textTransform: 'none' }}
                >
                  About me
                </Button>
                <Button
                  component={Link}
                  to="/blog"
                  color="inherit"
                  sx={{ textTransform: 'none' }}
                >
                  Blog
                </Button>

                {/* Conditional Links based on auth state */}
                {hasToken && (
                  <>
                    <Button
                      component={Link}
                      to="/profile"
                      color="inherit"
                      sx={{ textTransform: 'none' }}
                    >
                      My Profile
                    </Button>
                    <Button
                      component={Link}
                      to="/booking"
                      color="inherit"
                      sx={{ textTransform: 'none' }}
                    >
                      My Bookings
                    </Button>
                    <Button
                      component={Link}
                      to="/settings"
                      color="inherit"
                      sx={{ textTransform: 'none' }}
                    >
                      Settings
                    </Button>
                  </>
                )}
              </>
            )}

            {/* User name and Logout button - always show if has token, Login button if not */}
            {hasToken ? (
              <>
                <Chip
                  icon={<AccountCircleIcon />}
                  label={getUserDisplayName() || 'My Profile'}
                  color="primary"
                  variant="outlined"
                  sx={{
                    mr: 1,
                    fontWeight: 600,
                    display: 'inline-flex',
                    color: 'common.white',
                    borderColor: 'common.white',
                    '& .MuiChip-icon': { color: 'common.white' },
                    '& .MuiChip-label': { color: 'common.white' },
                  }}
                  component={Link}
                  to="/profile"
                />
                <Tooltip title="Logout">
                  <IconButton
                    onClick={handleLogout}
                    color="inherit"
                    size="large"
                    aria-label="logout"
                  >
                    <LogoutIcon />
                  </IconButton>
                </Tooltip>
              </>
            ) : !isAdminRoute ? (
              <Button
                component={Link}
                to="/login"
                color="inherit"
                sx={{ textTransform: 'none' }}
              >
                Login
              </Button>
            ) : null}
          </Stack>
        </Toolbar>
      </AppBar>

      {/* Main Content Area */}
      <Container
        component="main"
        maxWidth="lg"
        sx={{
          flexGrow: 1,
          py: 4,
        }}
      >
        {children}
      </Container>

      {/* About Me Dialog */}
      <Dialog
        open={aboutMeOpen}
        onClose={handleAboutMeClose}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>About Me</DialogTitle>
        <DialogContent>
          {aboutMeLoading && (
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: 200,
              }}
            >
              <CircularProgress />
            </Box>
          )}
          {aboutMeError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {aboutMeError}
            </Alert>
          )}
          {!aboutMeLoading && !aboutMeError && aboutMeData && (
            <DialogContentText component="div">
              {typeof aboutMeData === 'string' ? (
                <Typography>{aboutMeData}</Typography>
              ) : aboutMeData.content ? (
                <Typography>{aboutMeData.content}</Typography>
              ) : (
                <pre>{JSON.stringify(aboutMeData, null, 2)}</pre>
              )}
            </DialogContentText>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default AppLayout;

