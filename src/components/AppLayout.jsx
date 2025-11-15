import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { fetchWithAuth, getToken, removeToken } from '../utils/api';
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
} from '@mui/material';

const AppLayout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [hasToken, setHasToken] = useState(false);
  const [aboutMeOpen, setAboutMeOpen] = useState(false);
  const [aboutMeData, setAboutMeData] = useState(null);
  const [aboutMeLoading, setAboutMeLoading] = useState(false);
  const [aboutMeError, setAboutMeError] = useState(null);

  // Check if current route is an admin route
  const isAdminRoute = location.pathname.startsWith('/admin');

  // Check token on mount and listen for storage changes
  useEffect(() => {
    const checkToken = () => {
      setHasToken(!!getToken());
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
    const handleFocus = () => {
      checkToken();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('auth-changed', handleLogin);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('auth-changed', handleLogin);
    };
  }, []);

  const handleLogout = () => {
    removeToken();
    setHasToken(false);
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
                  <Button
                    component={Link}
                    to="/account"
                    color="inherit"
                    sx={{ textTransform: 'none' }}
                  >
                    My Account
                  </Button>
                )}
              </>
            )}

            {/* Logout button - always show if has token, Login button if not */}
            {hasToken ? (
              <Button
                onClick={handleLogout}
                color="inherit"
                sx={{ textTransform: 'none' }}
              >
                Logout
              </Button>
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

