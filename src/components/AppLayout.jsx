import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { fetchWithAuth, getToken, removeToken, decodeToken, isTokenExpired, fetchUserProfile, clearUserProfileCache } from '../utils/api';
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
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
} from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import LoginIcon from '@mui/icons-material/Login';
import HomeIcon from '@mui/icons-material/Home';
import BookOnlineIcon from '@mui/icons-material/BookOnline';
import PersonIcon from '@mui/icons-material/Person';
import LanguageIcon from '@mui/icons-material/Language';
import LoginModal from './LoginModal';
import SignUpModal from './SignUpModal';

const AppLayout = ({ children }) => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [hasToken, setHasToken] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [aboutMeOpen, setAboutMeOpen] = useState(false);
  const [aboutMeData, setAboutMeData] = useState(null);
  const [aboutMeLoading, setAboutMeLoading] = useState(false);
  const [aboutMeError, setAboutMeError] = useState(null);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [signUpModalOpen, setSignUpModalOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [userMenuAnchorEl, setUserMenuAnchorEl] = useState(null);
  const userMenuOpen = Boolean(userMenuAnchorEl);
  const [languageMenuAnchorEl, setLanguageMenuAnchorEl] = useState(null);
  const languageMenuOpen = Boolean(languageMenuAnchorEl);

  // Check if current route is an admin route
  const isAdminRoute = location.pathname.startsWith('/admin');
  // Check if we're on the landing page
  const isLandingPage = location.pathname === '/';
  // Check if we're on user pages where navigation buttons should be hidden
  const isUserPage = ['/profile', '/booking'].includes(location.pathname);
  // Check if we're on the blog page where navigation buttons should be hidden
  const isBlogPage = location.pathname.startsWith('/blog');
  // Check if we're on an agreement page where navigation buttons should be hidden
  const isAgreementPage = location.pathname.startsWith('/agreement');
  // Check if we're on the About Me page where navigation buttons should be hidden
  const isAboutMePage = location.pathname === '/about-me';

  // Handle scroll to change header background
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      setScrolled(scrollPosition > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Fetch user profile
  const lastFetchedTokenRef = useRef(null);
  const isFetchingRef = useRef(false);
  const loadUserProfile = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setUserProfile(null);
      lastFetchedTokenRef.current = null;
      isFetchingRef.current = false;
      clearUserProfileCache();
      return;
    }

    // Avoid refetching if we've already fetched for this token or if already fetching
    if (lastFetchedTokenRef.current === token || isFetchingRef.current) {
      return;
    }

    isFetchingRef.current = true;
    setProfileLoading(true);
    try {
      const data = await fetchUserProfile();
      if (!isFetchingRef.current) return; // Component unmounted or another fetch started

      setUserProfile(data);
      lastFetchedTokenRef.current = token;
      // Dispatch event so other components can reuse this data
      if (data) {
        window.dispatchEvent(new CustomEvent('user-profile-loaded', { detail: data }));
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
      if (isFetchingRef.current) {
        setUserProfile(null);
        lastFetchedTokenRef.current = null;
      }
    } finally {
      setProfileLoading(false);
      isFetchingRef.current = false;
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

  // Get full name (first + last) from user profile
  const getUserFullName = () => {
    if (userProfile) {
      const firstName = userProfile.firstName || '';
      const lastName = userProfile.lastName || '';
      return `${firstName} ${lastName}`.trim();
    }
    // Fallback: try to derive from token if profile not loaded yet
    const token = getToken();
    const decoded = decodeToken(token);
    if (decoded) {
      const firstName = decoded.given_name || '';
      const lastName = decoded.family_name || '';
      const fullName = `${firstName} ${lastName}`.trim();
      if (fullName) return fullName;
    }
    return '';
  };

  // Listen for profile requests from other components
  useEffect(() => {
    const handleProfileRequest = () => {
      // If profile is already loaded, dispatch it immediately
      if (userProfile) {
        window.dispatchEvent(new CustomEvent('user-profile-loaded', { detail: userProfile }));
      }
    };

    window.addEventListener('request-user-profile', handleProfileRequest);

    return () => {
      window.removeEventListener('request-user-profile', handleProfileRequest);
    };
  }, [userProfile]);

  // Check token on mount and listen for storage changes
  useEffect(() => {
    const checkToken = () => {
      const token = getToken();
      const tokenExists = !!token;

      // Check if token is expired
      if (tokenExists && isTokenExpired(token)) {
        // Token expired, log out user
        handleLogout();
        return;
      }

      setHasToken(tokenExists);
      if (tokenExists) {
        loadUserProfile();
      } else {
        setUserProfile(null);
      }
    };

    // Check initially
    // fetchUserProfile has guards to prevent duplicate calls (isFetchingRef and lastFetchedTokenRef)
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

    // Listen for token expiration event
    const handleTokenExpired = () => {
      handleLogout();
    };

    // Check when window regains focus (user might have logged in in another tab)
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('auth-changed', handleLogin);
    window.addEventListener('token-expired', handleTokenExpired);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('auth-changed', handleLogin);
      window.removeEventListener('token-expired', handleTokenExpired);
    };
  }, [loadUserProfile]);

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

  // Scroll to section function
  const scrollToSection = (sectionId) => {
    if (isLandingPage) {
      const element = document.getElementById(sectionId);
      if (element) {
        element.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      }
    } else {
      // Navigate to landing page with hash, then scroll
      navigate(`/#${sectionId}`);
      setTimeout(() => {
        const element = document.getElementById(sectionId);
        if (element) {
          element.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
          });
        }
      }, 100);
    }
  };

  // Handle scroll to section from URL hash
  useEffect(() => {
    if (isLandingPage && location.hash) {
      const sectionId = location.hash.substring(1);
      setTimeout(() => {
        const element = document.getElementById(sectionId);
        if (element) {
          element.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
          });
        }
      }, 100);
    }
  }, [isLandingPage, location.hash]);

  // Handle login modal
  const handleLoginClick = () => {
    setLoginModalOpen(true);
  };

  const handleLoginClose = () => {
    setLoginModalOpen(false);
    // If user closes login modal without logging in (no token), clear pending booking
    // This prevents auto-booking if they change their mind
    if (!getToken()) {
      sessionStorage.removeItem('pending_booking');
    }
  };

  const handleSwitchToSignUp = () => {
    setLoginModalOpen(false);
    setTimeout(() => {
      setSignUpModalOpen(true);
    }, 300);
  };

  // Handle signup modal
  const handleSignUpClick = () => {
    setSignUpModalOpen(true);
  };

  const handleSignUpClose = () => {
    setSignUpModalOpen(false);
    // If user closes signup modal without logging in (no token), clear pending booking
    if (!getToken()) {
      sessionStorage.removeItem('pending_booking');
    }
  };

  const handleSwitchToLogin = () => {
    setSignUpModalOpen(false);
    setTimeout(() => {
      setLoginModalOpen(true);
    }, 300);
  };

  // Handle user menu
  const handleUserMenuOpen = (event) => {
    setUserMenuAnchorEl(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setUserMenuAnchorEl(null);
  };

  const handleUserMenuClick = (path) => {
    handleUserMenuClose();
    if (path === 'logout') {
      handleLogout();
    } else {
      navigate(path);
    }
  };

  // Handle language menu
  const handleLanguageMenuOpen = (event) => {
    setLanguageMenuAnchorEl(event.currentTarget);
  };

  const handleLanguageMenuClose = () => {
    setLanguageMenuAnchorEl(null);
  };

  const handleLanguageChange = (lang) => {
    i18n.changeLanguage(lang);
    handleLanguageMenuClose();
  };

  // Check URL for login/signup redirects
  useEffect(() => {
    if (location.pathname === '/login' && !isAdminRoute) {
      navigate('/');
      setTimeout(() => {
        setLoginModalOpen(true);
      }, 100);
    } else if (location.pathname === '/signup' && !isAdminRoute) {
      navigate('/');
      setTimeout(() => {
        setSignUpModalOpen(true);
      }, 100);
    }
  }, [location.pathname, navigate, isAdminRoute]);

  // Periodic token expiration check
  useEffect(() => {
    // Check token expiration every 5 minutes
    const checkInterval = setInterval(() => {
      const token = getToken();
      if (token && isTokenExpired(token)) {
        handleLogout();
      }
    }, 300000); // Check every 5 minutes (300000 ms)

    return () => {
      clearInterval(checkInterval);
    };
  }, []);

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
          setAboutMeError(error.message || t('common.error'));
        } finally {
          setAboutMeLoading(false);
        }
      };
      fetchAboutMe();
    }
  }, [aboutMeOpen, aboutMeData]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar
        position="fixed"
        sx={{
          top: 0,
          zIndex: 1100,
          bgcolor: isLandingPage && !scrolled ? 'transparent' : '#2C5F5F',
          boxShadow: isLandingPage && !scrolled ? 'none' : 2,
          transition: 'all 0.3s ease-in-out',
        }}
      >
        <Toolbar sx={{ minHeight: { xs: 56, sm: 64 }, position: 'relative' }}>
          {/* Home Button - Top Left */}
          {!isAdminRoute && (
            isLandingPage ? (
              <Tooltip title={t('navigation.home')} arrow>
                <IconButton
                  onClick={() => scrollToSection('hero')}
                  color="inherit"
                  size="medium"
                  aria-label="home"
                  sx={{
                    mr: { xs: 1, sm: 2 },
                    transition: 'all 0.2s ease-in-out',
                    '&:hover': {
                      bgcolor: 'rgba(255, 255, 255, 0.1)',
                      transform: 'scale(1.1)',
                    },
                  }}
                >
                  <HomeIcon />
                </IconButton>
              </Tooltip>
            ) : (
              <Button
                onClick={() => navigate('/')}
                color="inherit"
                startIcon={<HomeIcon />}
                sx={{
                  mr: { xs: 1, sm: 2 },
                  textTransform: 'none',
                  fontWeight: 500,
                  fontSize: { xs: '0.875rem', sm: '0.9375rem' },
                  px: { xs: 1, sm: 1.5 },
                  py: 1,
                  borderRadius: 1,
                  transition: 'all 0.2s ease-in-out',
                  '&:hover': {
                    bgcolor: 'rgba(255, 255, 255, 0.1)',
                    transform: 'translateY(-1px)',
                  },
                }}
              >
                {t('navigation.home')}
              </Button>
            )
          )}

          {/* Navigation Links */}
          <Box sx={{ flexGrow: 1, display: 'flex', justifyContent: 'center' }}>
            <Stack
              direction="row"
              spacing={{ xs: 1, sm: 2, md: 3 }}
              alignItems="center"
              sx={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)',
              }}
            >
              {/* Admin Navigation Links */}
              {isAdminRoute && (
                <>
                  <Button
                    component={Link}
                    to="/admin/dashboard"
                    color="inherit"
                    sx={{
                      textTransform: 'none',
                      fontWeight: 500,
                      fontSize: { xs: '0.875rem', sm: '0.9375rem', md: '1rem' },
                      px: { xs: 1, sm: 1.5 },
                      py: 1,
                      borderRadius: 1,
                      transition: 'all 0.2s ease-in-out',
                      '&:hover': {
                        bgcolor: 'rgba(255, 255, 255, 0.1)',
                        transform: 'translateY(-1px)',
                      },
                    }}
                  >
                    {t('navigation.dashboard')}
                  </Button>
                  <Button
                    component={Link}
                    to="/admin/home"
                    color="inherit"
                    sx={{
                      textTransform: 'none',
                      fontWeight: 500,
                      fontSize: { xs: '0.875rem', sm: '0.9375rem', md: '1rem' },
                      px: { xs: 1, sm: 1.5 },
                      py: 1,
                      borderRadius: 1,
                      transition: 'all 0.2s ease-in-out',
                      '&:hover': {
                        bgcolor: 'rgba(255, 255, 255, 0.1)',
                        transform: 'translateY(-1px)',
                      },
                    }}
                  >
                    {t('navigation.homePage')}
                  </Button>
                  <Button
                    component={Link}
                    to="/admin/blog"
                    color="inherit"
                    sx={{
                      textTransform: 'none',
                      fontWeight: 500,
                      fontSize: { xs: '0.875rem', sm: '0.9375rem', md: '1rem' },
                      px: { xs: 1, sm: 1.5 },
                      py: 1,
                      borderRadius: 1,
                      transition: 'all 0.2s ease-in-out',
                      '&:hover': {
                        bgcolor: 'rgba(255, 255, 255, 0.1)',
                        transform: 'translateY(-1px)',
                      },
                    }}
                  >
                    {t('navigation.blog')}
                  </Button>
                  <Button
                    component={Link}
                    to="/admin/session/configuration"
                    color="inherit"
                    sx={{
                      textTransform: 'none',
                      fontWeight: 500,
                      fontSize: { xs: '0.875rem', sm: '0.9375rem', md: '1rem' },
                      px: { xs: 1, sm: 1.5 },
                      py: 1,
                      borderRadius: 1,
                      transition: 'all 0.2s ease-in-out',
                      '&:hover': {
                        bgcolor: 'rgba(255, 255, 255, 0.1)',
                        transform: 'translateY(-1px)',
                      },
                    }}
                  >
                    {t('navigation.sessions')}
                  </Button>
                  <Button
                    component={Link}
                    to="/admin/gallery"
                    color="inherit"
                    sx={{
                      textTransform: 'none',
                      fontWeight: 500,
                      fontSize: { xs: '0.875rem', sm: '0.9375rem', md: '1rem' },
                      px: { xs: 1, sm: 1.5 },
                      py: 1,
                      borderRadius: 1,
                      transition: 'all 0.2s ease-in-out',
                      '&:hover': {
                        bgcolor: 'rgba(255, 255, 255, 0.1)',
                        transform: 'translateY(-1px)',
                      },
                    }}
                  >
                    {t('navigation.gallery')}
                  </Button>
                </>
              )}

              {/* Public Navigation Links */}
              {!isAdminRoute && !isUserPage && !isBlogPage && !isAgreementPage && !isAboutMePage && (
                <>
                  {/* Public Links - Scroll to section on landing page, navigate otherwise */}
                  {isLandingPage ? (
                    <>
                      <Button
                        onClick={() => scrollToSection('about')}
                        color="inherit"
                        sx={{
                          textTransform: 'none',
                          fontWeight: 500,
                          fontSize: { xs: '0.875rem', sm: '0.9375rem', md: '1rem' },
                          px: { xs: 1, sm: 1.5 },
                          py: 1,
                          borderRadius: 1,
                          transition: 'all 0.2s ease-in-out',
                          '&:hover': {
                            bgcolor: 'rgba(255, 255, 255, 0.1)',
                            transform: 'translateY(-1px)',
                          },
                        }}
                      >
                        {t('navigation.about')}
                      </Button>
                      <Button
                        onClick={() => scrollToSection('services')}
                        color="inherit"
                        sx={{
                          textTransform: 'none',
                          fontWeight: 500,
                          fontSize: { xs: '0.875rem', sm: '0.9375rem', md: '1rem' },
                          px: { xs: 1, sm: 1.5 },
                          py: 1,
                          borderRadius: 1,
                          transition: 'all 0.2s ease-in-out',
                          '&:hover': {
                            bgcolor: 'rgba(255, 255, 255, 0.1)',
                            transform: 'translateY(-1px)',
                          },
                        }}
                      >
                        {t('navigation.services')}
                      </Button>
                      <Button
                        onClick={() => scrollToSection('blog')}
                        color="inherit"
                        sx={{
                          textTransform: 'none',
                          fontWeight: 500,
                          fontSize: { xs: '0.875rem', sm: '0.9375rem', md: '1rem' },
                          px: { xs: 1, sm: 1.5 },
                          py: 1,
                          borderRadius: 1,
                          transition: 'all 0.2s ease-in-out',
                          '&:hover': {
                            bgcolor: 'rgba(255, 255, 255, 0.1)',
                            transform: 'translateY(-1px)',
                          },
                        }}
                      >
                        {t('navigation.blog')}
                      </Button>
                      <Button
                        onClick={() => scrollToSection('testimonials')}
                        color="inherit"
                        sx={{
                          textTransform: 'none',
                          fontWeight: 500,
                          fontSize: { xs: '0.875rem', sm: '0.9375rem', md: '1rem' },
                          px: { xs: 1, sm: 1.5 },
                          py: 1,
                          borderRadius: 1,
                          transition: 'all 0.2s ease-in-out',
                          '&:hover': {
                            bgcolor: 'rgba(255, 255, 255, 0.1)',
                            transform: 'translateY(-1px)',
                          },
                        }}
                      >
                        {t('navigation.testimonials')}
                      </Button>
                      <Button
                        onClick={() => scrollToSection('contact')}
                        color="inherit"
                        sx={{
                          textTransform: 'none',
                          fontWeight: 500,
                          fontSize: { xs: '0.875rem', sm: '0.9375rem', md: '1rem' },
                          px: { xs: 1, sm: 1.5 },
                          py: 1,
                          borderRadius: 1,
                          transition: 'all 0.2s ease-in-out',
                          '&:hover': {
                            bgcolor: 'rgba(255, 255, 255, 0.1)',
                            transform: 'translateY(-1px)',
                          },
                        }}
                      >
                        {t('navigation.contact')}
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        component={Link}
                        to="/"
                        color="inherit"
                        sx={{
                          textTransform: 'none',
                          fontWeight: 500,
                          fontSize: { xs: '0.875rem', sm: '0.9375rem', md: '1rem' },
                          px: { xs: 1, sm: 1.5 },
                          py: 1,
                          borderRadius: 1,
                          transition: 'all 0.2s ease-in-out',
                          '&:hover': {
                            bgcolor: 'rgba(255, 255, 255, 0.1)',
                            transform: 'translateY(-1px)',
                          },
                        }}
                      >
                        {t('navigation.home')}
                      </Button>
                      <Button
                        onClick={handleAboutMeOpen}
                        color="inherit"
                        sx={{
                          textTransform: 'none',
                          fontWeight: 500,
                          fontSize: { xs: '0.875rem', sm: '0.9375rem', md: '1rem' },
                          px: { xs: 1, sm: 1.5 },
                          py: 1,
                          borderRadius: 1,
                          transition: 'all 0.2s ease-in-out',
                          '&:hover': {
                            bgcolor: 'rgba(255, 255, 255, 0.1)',
                            transform: 'translateY(-1px)',
                          },
                        }}
                      >
                        {t('navigation.about')}
                      </Button>
                    </>
                  )}

                </>
              )}
            </Stack>
          </Box>

          {/* Right side: Language selector, User menu and Login button */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {/* Language Selector */}
            <Tooltip title={i18n.language === 'ru' ? 'Русский' : 'English'} arrow>
              <IconButton
                onClick={handleLanguageMenuOpen}
                color="inherit"
                size="medium"
                aria-label="language selector"
                sx={{
                  transition: 'all 0.2s ease-in-out',
                  '&:hover': {
                    bgcolor: 'rgba(255, 255, 255, 0.1)',
                    transform: 'scale(1.1)',
                  },
                }}
              >
                <LanguageIcon />
              </IconButton>
            </Tooltip>
            <Menu
              anchorEl={languageMenuAnchorEl}
              open={languageMenuOpen}
              onClose={handleLanguageMenuClose}
              disableScrollLock
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'right',
              }}
              transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
            >
              <MenuItem
                onClick={() => handleLanguageChange('ru')}
                selected={i18n.language === 'ru'}
              >
                <ListItemText>Русский</ListItemText>
              </MenuItem>
              <MenuItem
                onClick={() => handleLanguageChange('en')}
                selected={i18n.language === 'en'}
              >
                <ListItemText>English</ListItemText>
              </MenuItem>
            </Menu>

            {/* User menu - only show on non-admin routes when logged in */}
            {hasToken && !isAdminRoute && (
              <>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {getUserFullName() && (
                    <Typography
                      variant="body1"
                      sx={{
                        display: { xs: 'none', sm: 'block' },
                        fontWeight: 500,
                        color: 'inherit',
                      }}
                    >
                      {getUserFullName()}
                    </Typography>
                  )}
                  <Tooltip title={t('navigation.account')} arrow>
                    <Box
                      sx={{
                        position: 'relative',
                        display: 'inline-flex',
                      }}
                    >
                      <IconButton
                        onClick={handleUserMenuOpen}
                        color="inherit"
                        size="large"
                        aria-label="account menu"
                        aria-controls={userMenuOpen ? 'user-menu' : undefined}
                        aria-haspopup="true"
                        aria-expanded={userMenuOpen ? 'true' : undefined}
                        sx={{
                          transition: 'all 0.2s ease-in-out',
                          '&:hover': {
                            bgcolor: 'rgba(255, 255, 255, 0.1)',
                            transform: 'scale(1.1)',
                          },
                        }}
                      >
                        <AccountCircleIcon sx={{ fontSize: 40 }} />
                      </IconButton>
                      <Box
                        sx={{
                          position: 'absolute',
                          bottom: 6,
                          right: 6,
                          width: 10,
                          height: 10,
                          borderRadius: '50%',
                          bgcolor: '#4caf50',
                          border: '2px solid',
                          borderColor: 'background.paper',
                          zIndex: 1,
                        }}
                      />
                    </Box>
                  </Tooltip>
                </Box>
                <Menu
                  id="user-menu"
                  anchorEl={userMenuAnchorEl}
                  open={userMenuOpen}
                  onClose={handleUserMenuClose}
                  disableScrollLock
                  MenuListProps={{
                    'aria-labelledby': 'account-button',
                    sx: {
                      padding: 0,
                    },
                  }}
                  PaperProps={{
                    sx: {
                      minWidth: 200,
                      overflow: 'hidden',
                      mt: 0.5,
                    },
                  }}
                  sx={{
                    '& .MuiBackdrop-root': {
                      backgroundColor: 'transparent',
                    },
                  }}
                  anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'right',
                  }}
                  transformOrigin={{
                    vertical: 'top',
                    horizontal: 'right',
                  }}
                >
                  <MenuItem onClick={() => handleUserMenuClick('/profile')}>
                    <ListItemIcon>
                      <PersonIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>{t('userMenu.myProfile')}</ListItemText>
                  </MenuItem>
                  <MenuItem onClick={() => handleUserMenuClick('/booking')}>
                    <ListItemIcon>
                      <BookOnlineIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>{t('userMenu.myBookings')}</ListItemText>
                  </MenuItem>
                  <Divider />
                  <MenuItem onClick={() => handleUserMenuClick('logout')}>
                    <ListItemIcon>
                      <LogoutIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>{t('navigation.logout')}</ListItemText>
                  </MenuItem>
                </Menu>
              </>
            )}

            {/* Admin user menu - show on admin routes when logged in */}
            {hasToken && isAdminRoute && (
              <>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {getUserFullName() && (
                    <Typography
                      variant="body1"
                      sx={{
                        display: { xs: 'none', sm: 'block' },
                        fontWeight: 500,
                        color: 'inherit',
                      }}
                    >
                      {getUserFullName()}
                    </Typography>
                  )}
                  <Tooltip title={t('navigation.adminAccount')} arrow>
                    <Box
                      sx={{
                        position: 'relative',
                        display: 'inline-flex',
                      }}
                    >
                      <IconButton
                        onClick={handleUserMenuOpen}
                        color="inherit"
                        size="large"
                        aria-label="admin account menu"
                        aria-controls={userMenuOpen ? 'admin-user-menu' : undefined}
                        aria-haspopup="true"
                        aria-expanded={userMenuOpen ? 'true' : undefined}
                        sx={{
                          transition: 'all 0.2s ease-in-out',
                          '&:hover': {
                            bgcolor: 'rgba(255, 255, 255, 0.1)',
                            transform: 'scale(1.1)',
                          },
                        }}
                      >
                        <AccountCircleIcon sx={{ fontSize: 40 }} />
                      </IconButton>
                      <Box
                        sx={{
                          position: 'absolute',
                          bottom: 6,
                          right: 6,
                          width: 10,
                          height: 10,
                          borderRadius: '50%',
                          bgcolor: '#4caf50',
                          border: '2px solid',
                          borderColor: 'background.paper',
                          zIndex: 1,
                        }}
                      />
                    </Box>
                  </Tooltip>
                </Box>
                <Menu
                  id="admin-user-menu"
                  anchorEl={userMenuAnchorEl}
                  open={userMenuOpen}
                  onClose={handleUserMenuClose}
                  disableScrollLock
                  MenuListProps={{
                    'aria-labelledby': 'admin-account-button',
                    sx: {
                      padding: 0,
                    },
                  }}
                  PaperProps={{
                    sx: {
                      minWidth: 200,
                      overflow: 'hidden',
                      mt: 0.5,
                    },
                  }}
                  sx={{
                    '& .MuiBackdrop-root': {
                      backgroundColor: 'transparent',
                    },
                  }}
                  anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'right',
                  }}
                  transformOrigin={{
                    vertical: 'top',
                    horizontal: 'right',
                  }}
                >
                  <MenuItem onClick={() => handleUserMenuClick('/admin/profile')}>
                    <ListItemIcon>
                      <PersonIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>{t('userMenu.myProfile')}</ListItemText>
                  </MenuItem>
                  <Divider />
                  <MenuItem onClick={() => handleUserMenuClick('logout')}>
                    <ListItemIcon>
                      <LogoutIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>{t('navigation.logout')}</ListItemText>
                  </MenuItem>
                </Menu>
              </>
            )}

            {/* Login Icon Button - only show if not logged in and not on admin route */}
            {!hasToken && !isAdminRoute && (
              <Tooltip title={t('navigation.login')} arrow>
                <IconButton
                  onClick={handleLoginClick}
                  color="inherit"
                  size="medium"
                  aria-label="login"
                  sx={{
                    transition: 'all 0.2s ease-in-out',
                    '&:hover': {
                      bgcolor: 'rgba(255, 255, 255, 0.1)',
                      transform: 'scale(1.1)',
                    },
                  }}
                >
                  <LoginIcon />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        </Toolbar>
      </AppBar>

      {/* Main Content Area */}
      {isLandingPage ? (
        <Box component="main" sx={{ flexGrow: 1 }}>
          {children}
        </Box>
      ) : (
        <Container
          component="main"
          maxWidth="lg"
          sx={{
            flexGrow: 1,
            py: 4,
            pt: { xs: '80px', sm: '90px', md: '100px' },
          }}
        >
          {children}
        </Container>
      )}

      {/* About Me Dialog */}
      <Dialog
        open={aboutMeOpen}
        onClose={handleAboutMeClose}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>{t('dialog.aboutMe')}</DialogTitle>
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

      {/* Login Modal */}
      <LoginModal
        open={loginModalOpen}
        onClose={handleLoginClose}
        onSwitchToSignUp={handleSwitchToSignUp}
      />

      {/* Sign Up Modal */}
      <SignUpModal
        open={signUpModalOpen}
        onClose={handleSignUpClose}
        onSwitchToLogin={handleSwitchToLogin}
      />
    </Box>
  );
};

export default AppLayout;

