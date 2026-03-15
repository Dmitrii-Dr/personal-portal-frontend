import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { fetchWithAuth, getToken, removeToken, decodeToken, fetchUserProfile, clearUserProfileCache, logoutApi, hasSessionHint, refreshAccessToken, getPublicWelcome, hasAdminRole } from '../utils/api';
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
  Avatar,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import LoginIcon from '@mui/icons-material/Login';
import HomeIcon from '@mui/icons-material/Home';
import BookOnlineIcon from '@mui/icons-material/BookOnline';
import PersonIcon from '@mui/icons-material/Person';
import LanguageIcon from '@mui/icons-material/Language';
import MenuIcon from '@mui/icons-material/Menu';
import LoginModal from './LoginModal';
import SignUpModal from './SignUpModal';
import { getSelectedAvatar, setSelectedAvatar as storeSetSelectedAvatar, DEFAULT_AVATAR_ID } from '../utils/avatarStore';

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

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [drawerTopColor, setDrawerTopColor] = useState('#d6baab');

  // Track selected profile avatar
  const [selectedAvatar, setSelectedAvatar] = useState(() => getSelectedAvatar());

  const isAdminUser = (() => {
    const token = getToken();
    return !!token && hasAdminRole(token);
  })();

  useEffect(() => {
    if (location.pathname === '/maintenance') {
      return;
    }

    const fetchWelcomeData = async () => {
      try {
        const data = await getPublicWelcome({ timeout: 10000 });
        if (data && data.extendedParameters && data.extendedParameters.welcomeLeftColourHex) {
          setDrawerTopColor(data.extendedParameters.welcomeLeftColourHex);
        }
      } catch (error) {
        console.error('Error fetching welcome data for drawer coloring:', error);
      }
    };
    fetchWelcomeData();
  }, [location.pathname]);

  useEffect(() => {
    const handleAvatarChanged = () => {
      setSelectedAvatar(getSelectedAvatar());
    };
    window.addEventListener('avatar-changed', handleAvatarChanged);
    return () => window.removeEventListener('avatar-changed', handleAvatarChanged);
  }, []);

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
  // Check if we're on the verify-account page where navigation buttons should be hidden
  const isVerifyAccountPage = location.pathname === '/verify-account';
  // Check if we're on the maintenance page
  const isMaintenancePage = location.pathname === '/maintenance';

  // Redirect to maintenance page when site is inactive (non-admin routes).
  useEffect(() => {
    if (isAdminRoute) {
      return;
    }

    const checkMaintenanceStatus = async () => {
      try {
        // Ensure admin tokens restored before deciding on maintenance redirect.
        let token = getToken();
        if (!token && hasSessionHint()) {
          token = await refreshAccessToken();
        }
        const isAdminUser = !!token && hasAdminRole(token);
        if (isAdminUser) {
          return;
        }

        const data = await getPublicWelcome({ timeout: 10000 });
        if (data && data.isActive === false && location.pathname !== '/maintenance') {
          navigate('/maintenance', { replace: true });
          return;
        }
        if (data && data.isActive === true && location.pathname === '/maintenance') {
          navigate('/', { replace: true });
        }
      } catch (error) {
        console.error('Error checking maintenance status:', error);
      }
    };

    checkMaintenanceStatus();
  }, [isAdminRoute, location.pathname, navigate]);

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
  const isFetchingRef = useRef(false);
  const loadUserProfile = useCallback(async () => {
    // Profile loading only makes sense when a token is available.
    // Token restoration is handled separately by refreshAccessToken().
    if (!getToken()) return;

    // Don't load profile on the verification page — the account is unverified
    // and /profile will return 403 PEC-412, causing a redirect loop.
    if (window.location.pathname === '/verify-account') return;

    if (isFetchingRef.current) return; // prevent concurrent fetches

    isFetchingRef.current = true;
    setProfileLoading(true);
    try {
      const data = await fetchUserProfile();
      if (!isFetchingRef.current) return; // unmounted

      if (data) {
        setUserProfile(data);
        setHasToken(true);
        // Seed the avatar store so the navbar icon is correct on every page,
        // not only after the user visits /profile.
        storeSetSelectedAvatar(data.avatarId ?? DEFAULT_AVATAR_ID);
        window.dispatchEvent(new CustomEvent('user-profile-loaded', { detail: data }));
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    } finally {
      setProfileLoading(false);
      isFetchingRef.current = false;
    }
  }, []);

  // Tracks whether we should reload the user profile as soon as we navigate
  // away from /verify-account (e.g. right after successful activation).
  const pendingProfileReloadRef = useRef(false);

  // Handle account-verified event: optimistically flip isVerified in the cached
  // userProfile so the user menu is correct immediately, then schedule a full
  // profile reload for when the location changes away from /verify-account.
  // (loadUserProfile has a guard that skips it on /verify-account, so we can't
  // call it synchronously here — the navigation hasn't happened yet.)
  useEffect(() => {
    const handleAccountVerified = () => {
      // Optimistic update — mark the cached profile as verified so the
      // user menu stops redirecting to /verify-account.
      setUserProfile((prev) => prev ? { ...prev, isVerified: true } : prev);
      // Flag a reload to be executed once we leave /verify-account.
      pendingProfileReloadRef.current = true;
    };
    window.addEventListener('account-verified', handleAccountVerified);
    return () => window.removeEventListener('account-verified', handleAccountVerified);
  }, []);

  // When we navigate away from /verify-account and a reload was pending
  // (set by the account-verified handler), trigger it now. This guarantees
  // the profile cache holds isVerified: true before the user can reach /profile.
  useEffect(() => {
    if (location.pathname !== '/verify-account' && pendingProfileReloadRef.current) {
      pendingProfileReloadRef.current = false;
      loadUserProfile();
    }
  }, [location.pathname, loadUserProfile]);

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

  // Forced local-only logout — used when the server already ended the session
  // (e.g. /refresh returned 401/403). No API call; just wipe everything and redirect.
  const forceLogout = useCallback(() => {
    removeToken();
    clearUserProfileCache();
    setHasToken(false);
    setUserProfile(null);
    isFetchingRef.current = false;
    navigate('/');
  }, [navigate]);

  // User-initiated logout — calls the server to revoke the refresh cookie.
  const handleLogout = useCallback(async () => {
    await logoutApi(); // POST /api/v1/auth/logout + X-XSRF-TOKEN header
    forceLogout();
  }, [forceLogout]);

  // On mount: attempt a silent refresh to restore session after page reload.
  // Access token lives only in memory, so it is lost on every reload.
  useEffect(() => {
    const bootstrap = async () => {
      // Anonymous user — no session, nothing to do.
      if (!getToken() && !hasSessionHint()) return;

      // Same-tab navigation — token already in memory.
      if (getToken()) {
        setHasToken(true);
        loadUserProfile();
        return;
      }

      // Page reload — call /refresh to restore the access token.
      // If /refresh returns 401/403, it dispatches 'token-expired' →
      // forceLogout() → navigate('/').
      const token = await refreshAccessToken();
      if (token) {
        setHasToken(true);
        loadUserProfile();
        // Notify all components (e.g. BookingPage) that auth state changed so
        // they can update their own hasToken and re-fetch their data.
        window.dispatchEvent(new Event('auth-changed'));
      }
    };

    bootstrap();

    // Listen for custom event when login happens in the same tab
    const handleLogin = () => {
      const token = getToken();
      setHasToken(!!token);
      if (token) loadUserProfile();
    };

    // Listen for token expiration / refresh failure — clears local state and
    // sends user to landing page WITHOUT calling the server (session already dead).
    const handleTokenExpired = () => {
      forceLogout();
    };

    window.addEventListener('auth-changed', handleLogin);
    window.addEventListener('token-expired', handleTokenExpired);

    return () => {
      window.removeEventListener('auth-changed', handleLogin);
      window.removeEventListener('token-expired', handleTokenExpired);
    };
  }, [forceLogout, loadUserProfile]);

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
    // Don't clear pending_booking here — user may have just registered and
    // will proceed to login + verification. BookingPage clears it after submission.
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
      {!isMaintenancePage && (
        <AppBar
          position="fixed"
          sx={{
            top: 0,
            zIndex: 1100,
            bgcolor: isLandingPage && !scrolled ? 'transparent' : 'primary.main',
            boxShadow: isLandingPage && !scrolled ? 'none' : 2,
            transition: 'all 0.3s ease-in-out',
          }}
        >
          <Toolbar sx={{ minHeight: { xs: 64, sm: 64 }, height: { xs: 64, sm: 64 }, position: 'relative' }}>
          {/* Mobile Hamburger Menu Icon (Aligned Left, Landing Page Only) */}
          {isMobile && isLandingPage && (
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={() => setMobileOpen(true)}
              sx={{ mr: 2, display: { md: 'none' } }}
            >
              <MenuIcon />
            </IconButton>
          )}

          {/* Home Button - Top Left */}
          {isLandingPage && !isAdminRoute ? (
              <Tooltip title={t('navigation.home')} arrow>
                <IconButton
                  onClick={() => scrollToSection('hero')}
                  color="inherit"
                  size="medium"
                  aria-label="home"
                  sx={{
                    display: { xs: 'none', md: 'inline-flex' },
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
            <>
              {/* Mobile Home Icon (Only on non-landing pages) */}
              <IconButton
                onClick={() => navigate('/')}
                color="inherit"
                size="medium"
                aria-label="home"
                sx={{
                  display: { xs: 'inline-flex', md: 'none' },
                  mr: { xs: 1, sm: 2 },
                }}
              >
                <HomeIcon />
              </IconButton>

              {/* Desktop Home Button (with text) */}
              <Button
                onClick={() => navigate('/')}
                color="inherit"
                startIcon={<HomeIcon />}
                sx={{
                  display: { xs: 'none', md: 'inline-flex' },
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
            </>
            )
          }

          {/* Navigation Links (Desktop) */}
          <Box sx={{ flexGrow: 1, display: { xs: 'none', md: 'flex' }, justifyContent: 'center' }}>
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
              {!isAdminRoute && !isUserPage && !isBlogPage && !isAgreementPage && !isAboutMePage && !isVerifyAccountPage && (
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
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 'auto' }}>
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

            {/* User menu - only show for non-admin users on non-admin routes */}
            {hasToken && !isAdminUser && !isAdminRoute && (
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
                        {selectedAvatar ? (
                          <Avatar src={selectedAvatar.src} alt={selectedAvatar.label} sx={{ width: 40, height: 40 }} />
                        ) : (
                          <AccountCircleIcon sx={{ fontSize: 40 }} />
                        )}
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
                  <MenuItem
                    onClick={() => {
                      if (userProfile?.isVerified === false) {
                        handleUserMenuClose();
                        navigate('/verify-account', {
                          state: {
                            returnTo: '/profile',
                            email: userProfile?.email || '',
                          },
                        });
                      } else {
                        handleUserMenuClick('/profile');
                      }
                    }}
                    disabled={isVerifyAccountPage}
                  >
                    <ListItemIcon>
                      <PersonIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>{t('userMenu.myProfile')}</ListItemText>
                  </MenuItem>
                  <MenuItem
                    onClick={() => {
                      if (userProfile?.isVerified === false) {
                        handleUserMenuClose();
                        navigate('/verify-account');
                      } else {
                        handleUserMenuClick('/booking');
                      }
                    }}
                    disabled={isVerifyAccountPage}
                  >
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

            {/* Admin user menu - show for admin users on any route when logged in */}
            {hasToken && isAdminUser && (
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
                        {selectedAvatar ? (
                          <Avatar src={selectedAvatar.src} alt={selectedAvatar.label} sx={{ width: 40, height: 40 }} />
                        ) : (
                          <AccountCircleIcon sx={{ fontSize: 40 }} />
                        )}
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
                  <MenuItem onClick={() => handleUserMenuClick('/admin/dashboard')}>
                    <ListItemIcon>
                      <HomeIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>{t('navigation.dashboard')}</ListItemText>
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

            {/* Mobile Drawer */}
            {isMobile && isLandingPage && (
              <Drawer
                anchor="left"
                open={mobileOpen}
                onClose={() => setMobileOpen(false)}
                ModalProps={{
                  keepMounted: true, // Better open performance on mobile.
                }}
                sx={{
                  display: { xs: 'block', md: 'none' },
                  '& .MuiDrawer-paper': {
                    boxSizing: 'border-box',
                    width: 250,
                    bgcolor: 'rgba(255, 255, 255, 0.75)',
                    backdropFilter: 'blur(10px)',
                    borderRight: '1px solid rgba(255, 255, 255, 0.2)'
                  },
                }}
              >
                <Box sx={{ height: { xs: 64, sm: 64 }, minHeight: { xs: 64, sm: 64 }, bgcolor: drawerTopColor, width: '100%' }} />
                <Divider />
                <List onClick={() => setMobileOpen(false)} sx={{ bgcolor: 'transparent' }}>
                  {/* Landing Page Home Link - Scroll to hero */}
                  {(isLandingPage && !isAdminRoute) && (
                    <ListItem disablePadding>
                      <ListItemButton onClick={() => scrollToSection('hero')}>
                        <ListItemText primary={t('navigation.home')} />
                      </ListItemButton>
                    </ListItem>
                  )}

                  {/* Public Navigation Links */}
                  {!isAdminRoute && !isUserPage && !isBlogPage && !isAgreementPage && !isAboutMePage && !isVerifyAccountPage && (
                    <>
                      {isLandingPage && (
                        <>
                          <ListItem disablePadding>
                            <ListItemButton onClick={() => scrollToSection('about')}>
                              <ListItemText primary={t('navigation.about')} />
                            </ListItemButton>
                          </ListItem>
                          <ListItem disablePadding>
                            <ListItemButton onClick={() => scrollToSection('services')}>
                              <ListItemText primary={t('navigation.services')} />
                            </ListItemButton>
                          </ListItem>
                          <ListItem disablePadding>
                            <ListItemButton onClick={() => scrollToSection('blog')}>
                              <ListItemText primary={t('navigation.blog')} />
                            </ListItemButton>
                          </ListItem>
                          <ListItem disablePadding>
                            <ListItemButton onClick={() => scrollToSection('testimonials')}>
                              <ListItemText primary={t('navigation.testimonials')} />
                            </ListItemButton>
                          </ListItem>
                          <ListItem disablePadding>
                            <ListItemButton onClick={() => scrollToSection('contact')}>
                              <ListItemText primary={t('navigation.contact')} />
                            </ListItemButton>
                          </ListItem>
                        </>
                      )}
                    </>
                  )}
                </List>
              </Drawer>
            )}
          </Box>
          </Toolbar>
        </AppBar>
      )}

      {/* Main Content Area */}
      {isMaintenancePage ? (
        <Box component="main" sx={{ flexGrow: 1 }}>
          {children}
        </Box>
      ) : isLandingPage ? (
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
