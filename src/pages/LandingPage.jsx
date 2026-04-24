import React, { useRef, useState, useEffect, useLayoutEffect, useMemo, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
  Avatar,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Menu,
  Tooltip,
  Link,
  Fade,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ArrowBackIosIcon from '@mui/icons-material/ArrowBackIos';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import KeyboardArrowLeftRoundedIcon from '@mui/icons-material/KeyboardArrowLeftRounded';
import KeyboardArrowRightRoundedIcon from '@mui/icons-material/KeyboardArrowRightRounded';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import dayjs from 'dayjs';
import axios from 'axios';
import apiClient, { getPublicWelcome } from '../utils/api';
import { contactLinksFromWelcome } from '../utils/contactLinksFromWelcome';
import ContactLinksGrid from '../components/ContactLinksGrid';
import BookingPageContent from './BookingPage';
import { loadImageWithCache } from '../utils/imageCache';
import { useResponsiveLayout } from '../utils/useResponsiveLayout';
import LandingPageLoader from '../components/landing/LandingPageLoader';

/** Ensure external footer URLs open correctly (prepend https if scheme missing). */
function normalizeFooterHref(url) {
  const trimmed = (url || '').trim();
  if (!trimmed) return '#';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function parseFooterLinksFromWelcome(welcomeData) {
  const raw = welcomeData?.extendedParameters?.footerLinks;
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item) => item && typeof item === 'object')
    .map((item) => ({
      linkDisplayName: typeof item.linkDisplayName === 'string' ? item.linkDisplayName.trim() : '',
      linkUrl: typeof item.linkUrl === 'string' ? item.linkUrl.trim() : '',
    }))
    .filter((item) => item.linkDisplayName && item.linkUrl);
}

// Currency symbol mapping
const getCurrencySymbol = (currency) => {
  const currencyMap = {
    'Rubles': '₽',
    'Tenge': '₸',
  };
  return currencyMap[currency] || currency;
};

// Check if all prices are 0 (free)
const areAllPricesZero = (prices) => {
  if (!prices || typeof prices !== 'object') {
    return false;
  }
  const priceValues = Object.values(prices);
  return priceValues.length > 0 && priceValues.every(price => price === 0 || price === null || price === undefined);
};

const truncateText = (value, maxLength) => {
  if (!value || typeof value !== 'string') return '';
  const normalized = value.trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength).trimEnd()}...`;
};

/**
 * Portrait viewport w/h (width/innerHeight). ~2/3 ≈ 0.667; 9:16 ≈ 0.56.
 * Wide band = fill (cover); scroll only for clearly odd sizes (e.g. split view, very squat or very ribbon).
 * Standalone PWA on iPhone reports taller viewport → smaller r; keep MIN low enough to stay fill.
 */
const MOBILE_HERO_ASPECT_MIN = 0.36;
const MOBILE_HERO_ASPECT_MAX = 0.92;

/** Minimum time the landing loader stays visible after mount (ms), even if data is ready sooner. */
const MIN_LANDING_LOADER_MS = 1500;

/** Must match `PORTAL_SHELL_BOOTED_SESSION_KEY` in main.jsx / index.html — set after first shell dismiss. */
const PORTAL_SHELL_BOOTED_SESSION_KEY = '__portalShellBooted';

/** Set when landing first reached displayReady in this tab — suppresses full-screen coin loader on return to `/`. */
const LANDING_VISITED_SESSION_KEY = '__portalLandingVisited';

function isNearTwoThreeViewport() {
  if (typeof window === 'undefined') return true;
  const vv = window.visualViewport;
  const w = vv ? vv.width : window.innerWidth;
  const h = vv ? vv.height : window.innerHeight;
  if (!h) return true;
  const r = w / h;
  return r >= MOBILE_HERO_ASPECT_MIN && r <= MOBILE_HERO_ASPECT_MAX;
}

const LandingPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { isMobileLayout } = useResponsiveLayout();
  const isMobile = isMobileLayout;
  const isMobileImage = isMobileLayout;
  const heroRef = useRef(null);
  const aboutRef = useRef(null);
  const servicesRef = useRef(null);
  const testimonialsRef = useRef(null);
  const blogRef = useRef(null);

  const [aboutMeData, setAboutMeData] = useState(null);
  const [aboutMeLoading, setAboutMeLoading] = useState(false);
  const [aboutMeError, setAboutMeError] = useState(null);
  const [welcomeData, setWelcomeData] = useState(null);
  const [welcomeLoading, setWelcomeLoading] = useState(true);
  const [welcomeError, setWelcomeError] = useState(null);
  const [heroImagesReady, setHeroImagesReady] = useState(false);
  const landingLoaderStartedAtRef = useRef(performance.now());
  /** False after first successful boot in this tab → skip MIN_LANDING_LOADER_MS on warm reloads. */
  const applyMinLandingLoaderMsRef = useRef(
    (() => {
      try {
        return sessionStorage.getItem(PORTAL_SHELL_BOOTED_SESSION_KEY) !== '1';
      } catch {
        return true;
      }
    })()
  );
  /** First visit to `/` in this tab: show LandingPageLoader; later client navigations use a plain hold screen. */
  const showFullScreenLandingLoaderRef = useRef(
    (() => {
      try {
        return sessionStorage.getItem(LANDING_VISITED_SESSION_KEY) !== '1';
      } catch {
        return true;
      }
    })()
  );
  const [displayReady, setDisplayReady] = useState(false);
  /** Mobile: true = fill #hero with cover; false = horizontal scroll (viewport aspect outside 2:3 band). */
  const [heroViewportFillMode, setHeroViewportFillMode] = useState(true);
  /** Scroll mode: min width for inner track = max(band width, (2/3)*band height). */
  const [scrollTrackMinWidthPx, setScrollTrackMinWidthPx] = useState(0);

  // Image URLs state
  const [welcomeRightImageUrl, setWelcomeRightImageUrl] = useState(null);
  const [welcomeLeftImageUrl, setWelcomeLeftImageUrl] = useState(null);
  const [welcomeMobileImageUrl, setWelcomeMobileImageUrl] = useState(null);
  const [aboutImageUrl, setAboutImageUrl] = useState(null);
  const [educationImageUrl, setEducationImageUrl] = useState(null);

  // Hero frame background colours read from extendedParameters (with hardcoded fallbacks)
  const [heroLeftColour, setHeroLeftColour] = useState('#d6baab');
  const [heroRightColour, setHeroRightColour] = useState('#7f7d72');
  const [heroButtonColour, setHeroButtonColour] = useState('#ffffff');
  const [heroButtonTextColour, setHeroButtonTextColour] = useState('#2C5F5F');
  const [reviewMediaIds, setReviewMediaIds] = useState([]);
  const [reviewImageUrls, setReviewImageUrls] = useState([]);
  const [loadingReviewImages, setLoadingReviewImages] = useState({});
  const [reviewCarouselIndex, setReviewCarouselIndex] = useState(0);
  const imagesToShow = isMobile ? 1 : 3;
  const showArrows = reviewMediaIds.length > imagesToShow;
  const mobileServicesScrollRef = useRef(null);
  const [mobileServicesAtBottom, setMobileServicesAtBottom] = useState(false);
  const desktopServicesScrollRef = useRef(null);
  const [desktopServicesCanScrollLeft, setDesktopServicesCanScrollLeft] = useState(false);
  const [desktopServicesCanScrollRight, setDesktopServicesCanScrollRight] = useState(false);
  const educationRef = useRef(null);

  // Session types state
  const [sessionTypes, setSessionTypes] = useState([]);
  const [loadingSessionTypes, setLoadingSessionTypes] = useState(true);
  const [sessionTypesError, setSessionTypesError] = useState(null);
  const [selectedSessionTypeId, setSelectedSessionTypeId] = useState(null);
  const [selectedSessionType, setSelectedSessionType] = useState(null);
  const [bookingDialogOpen, setBookingDialogOpen] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState('Rubles');
  const [currencyMenuAnchor, setCurrencyMenuAnchor] = useState(null);

  const getCompactSessionPrice = (sessionType) => {
    if (sessionType.prices && areAllPricesZero(sessionType.prices)) {
      return t('landing.booking.free');
    }
    if (sessionType.prices && sessionType.prices[selectedCurrency] !== undefined) {
      return `${sessionType.prices[selectedCurrency]} ${getCurrencySymbol(selectedCurrency)}`;
    }
    if (sessionType.prices && Object.keys(sessionType.prices).length > 0) {
      return `N/A ${getCurrencySymbol(selectedCurrency)}`;
    }
    if (sessionType.price !== undefined && sessionType.price !== null) {
      return `$${sessionType.price}`;
    }
    return 'N/A';
  };

  const orderedSessionTypes = useMemo(() => {
    if (!Array.isArray(sessionTypes) || sessionTypes.length === 0) {
      return [];
    }

    const order = welcomeData?.extendedParameters?.sessionTypeDisplayOrder;
    if (!Array.isArray(order) || order.length === 0) {
      return sessionTypes;
    }

    const orderMap = new Map(order.map((id, index) => [String(id), index]));
    return [...sessionTypes].sort((a, b) => {
      const aId = String(a?.id || a?.sessionTypeId || '');
      const bId = String(b?.id || b?.sessionTypeId || '');
      const aIndex = orderMap.has(aId) ? orderMap.get(aId) : Number.POSITIVE_INFINITY;
      const bIndex = orderMap.has(bId) ? orderMap.get(bId) : Number.POSITIVE_INFINITY;
      if (aIndex !== bIndex) return aIndex - bIndex;
      return 0;
    });
  }, [sessionTypes, welcomeData]);

  const updateDesktopServicesScrollState = useCallback(() => {
    const el = desktopServicesScrollRef.current;
    if (!el) {
      setDesktopServicesCanScrollLeft(false);
      setDesktopServicesCanScrollRight(false);
      return;
    }

    const maxScrollLeft = el.scrollWidth - el.clientWidth;
    setDesktopServicesCanScrollLeft(el.scrollLeft > 4);
    setDesktopServicesCanScrollRight(maxScrollLeft - el.scrollLeft > 4);
  }, []);

  // Ref callback: fires the moment the scroll container is attached to the DOM.
  // This guarantees measurement happens as soon as the element exists, regardless
  // of async session-type loading — no effect dependency timing issues.
  const desktopScrollRefCallback = useCallback((el) => {
    desktopServicesScrollRef.current = el;
    if (!el) {
      setDesktopServicesCanScrollLeft(false);
      setDesktopServicesCanScrollRight(false);
      return;
    }
    const maxScrollLeft = el.scrollWidth - el.clientWidth;
    setDesktopServicesCanScrollLeft(el.scrollLeft > 4);
    setDesktopServicesCanScrollRight(maxScrollLeft - el.scrollLeft > 4);
  }, []);

  const scrollDesktopServices = useCallback((direction) => {
    const el = desktopServicesScrollRef.current;
    if (!el) return;
    const cardWidth = 364 + 24; // card width + gap
    el.scrollBy({ left: direction * cardWidth, behavior: 'smooth' });
  }, []);

  const desktopScrollHintDoneRef = useRef(false);

  // Resize handler only — initial measurement is handled by desktopScrollRefCallback.
  useLayoutEffect(() => {
    if (isMobile) return undefined;

    window.addEventListener('resize', updateDesktopServicesScrollState);
    return () => {
      window.removeEventListener('resize', updateDesktopServicesScrollState);
    };
  }, [isMobile, updateDesktopServicesScrollState]);

  useEffect(() => {
    if (isMobile || orderedSessionTypes.length <= 1 || desktopScrollHintDoneRef.current) return;
    const el = desktopServicesScrollRef.current;
    if (!el) return;
    const maxScrollLeft = el.scrollWidth - el.clientWidth;
    if (maxScrollLeft <= 4) return;
    desktopScrollHintDoneRef.current = true;
    const t1 = setTimeout(() => {
      el.scrollBy({ left: 72, behavior: 'smooth' });
      const t2 = setTimeout(() => {
        el.scrollBy({ left: -72, behavior: 'smooth' });
      }, 650);
      return () => clearTimeout(t2);
    }, 900);
    return () => clearTimeout(t1);
  }, [isMobile, orderedSessionTypes.length]);

  // Blog articles state
  const [blogArticles, setBlogArticles] = useState([]);
  const [blogLoading, setBlogLoading] = useState(false);
  const [blogError, setBlogError] = useState(null);

  // Footer/Contact Links
  // Data comes from /api/v1/public/welcome response in the "contact" field
  // Expected backend response format:
  // {
  //   "contact": [
  //     {
  //       "platform": "Telegram",  // Required: Platform name (Telegram, LinkedIn, GitHub, Email, Phone, Instagram, Twitter, Facebook, YouTube, VK.com, WhatsApp, Website, B17)
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

      if (type === 'welcome-right') {
        setWelcomeRightImageUrl(objectUrl);
      } else if (type === 'welcome-left') {
        setWelcomeLeftImageUrl(objectUrl);
      } else if (type === 'welcome-mobile') {
        setWelcomeMobileImageUrl(objectUrl);
      } else if (type === 'about') {
        setAboutImageUrl(objectUrl);
      } else if (type === 'education') {
        setEducationImageUrl(objectUrl);
      }
    } catch (err) {
      console.error(`Error loading image for ${type}:`, err);
      throw err;
    }
  };

  // Fetch welcome data
  useEffect(() => {
    let isMounted = true;
    const fetchWelcomeData = async () => {
      try {
        setWelcomeLoading(true);
        setWelcomeError(null);

        const data = await getPublicWelcome({ timeout: 10000 });

        if (!isMounted) return;

        setWelcomeData(data);
        // Set about-me data from welcome response for backward compatibility
        if (data.aboutMessage) {
          setAboutMeData(data.aboutMessage);
        }

        // Read hero frame colours from extendedParameters
        const ep = data.extendedParameters || {};
        setHeroLeftColour(ep.welcomeLeftColourHex || '#d6baab');
        setHeroRightColour(ep.welcomeRightColourHex || '#7f7d72');
        setHeroButtonColour(ep.welcomeBookSessionButtonColourHex || '#ffffff');
        setHeroButtonTextColour(ep.welcomeBookSessionButtonTextColourHex || '#2C5F5F');

        // Load hero images (block rendering until these are ready or error)
        const heroLoaders = [];
        if (data.welcomeRightMediaId) {
          heroLoaders.push(loadImage(data.welcomeRightMediaId, 'welcome-right'));
        }
        if (data.welcomeLeftMediaId) {
          heroLoaders.push(loadImage(data.welcomeLeftMediaId, 'welcome-left'));
        }
        if (data.welcomeMobileMediaId) {
          heroLoaders.push(loadImage(data.welcomeMobileMediaId, 'welcome-mobile'));
        }

        if (heroLoaders.length > 0) {
          await Promise.allSettled(heroLoaders);
          if (isMounted) {
            setHeroImagesReady(true);
          }
        } else if (isMounted) {
          setHeroImagesReady(true);
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

        // Store review media IDs for lazy loading
        if (data.reviewMediaIds && Array.isArray(data.reviewMediaIds) && data.reviewMediaIds.length > 0) {
          if (isMounted) {
            setReviewMediaIds(data.reviewMediaIds);
            // Initialize reviewImageUrls array with nulls
            setReviewImageUrls(new Array(data.reviewMediaIds.length).fill(null));
          }
        }

        setContactLinks(contactLinksFromWelcome(data));
      } catch (error) {
        const isCancellationError =
          error.name === 'AbortError' ||
          error.name === 'CanceledError' ||
          error.code === 'ERR_CANCELED' ||
          (error.message && error.message.includes('canceled'));

        // If the request was cancelled because the component is unmounting, just bail.
        if (isCancellationError) {
          if (!isMounted) return;
          // Component is still mounted; prevent the page from staying blank.
          setHeroImagesReady(true);
          return;
        }

        if (!isMounted) return;

        console.error('Error fetching welcome data:', error);
        let errorMessage = 'Failed to load welcome information';
        if (error.response?.data?.message) {
          errorMessage = error.response.data.message;
        } else if (error.message) {
          errorMessage = error.message;
        }

        setWelcomeError(errorMessage);
        // Backend /welcome failed => show maintenance instead of empty landing page.
        setHeroImagesReady(true);
        navigate('/maintenance', { replace: true });
      } finally {
        if (isMounted) {
          setWelcomeLoading(false);
        }
      }
    };

    fetchWelcomeData();

    return () => {
      isMounted = false;
    };
  }, []);

  // Lazy load review images based on carousel position
  useEffect(() => {
    if (!reviewMediaIds || reviewMediaIds.length === 0) return;

    const loadImageGroup = async (startIndex, endIndex) => {
      for (let i = startIndex; i < endIndex && i < reviewMediaIds.length; i++) {
        // Skip if already loaded or loading
        if (reviewImageUrls[i] || loadingReviewImages[i]) continue;

        const mediaId = reviewMediaIds[i];

        // Mark as loading
        setLoadingReviewImages(prev => ({ ...prev, [i]: true }));

        try {
          const url = await loadImageWithCache(mediaId);
          setReviewImageUrls(prev => {
            const newUrls = [...prev];
            newUrls[i] = url;
            return newUrls;
          });
        } catch (err) {
          console.error(`Error loading review image ${mediaId}:`, err);
          setReviewImageUrls(prev => {
            const newUrls = [...prev];
            newUrls[i] = null;
            return newUrls;
          });
        } finally {
          setLoadingReviewImages(prev => ({ ...prev, [i]: false }));
        }
      }
    };

    // Load current visible group
    const currentGroupStart = reviewCarouselIndex;
    const currentGroupEnd = reviewCarouselIndex + imagesToShow;
    loadImageGroup(currentGroupStart, currentGroupEnd);

    // Preload next group
    const nextGroupStart = currentGroupEnd;
    const nextGroupEnd = nextGroupStart + imagesToShow;
    if (nextGroupStart < reviewMediaIds.length) {
      loadImageGroup(nextGroupStart, nextGroupEnd);
    }
  }, [reviewMediaIds, reviewCarouselIndex, imagesToShow]);

  // Fetch session types
  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    const fetchSessionTypes = async () => {
      try {
        setLoadingSessionTypes(true);
        setSessionTypesError(null);

        const response = await apiClient.get('/api/v1/public/session/type', {
          signal: controller.signal,
          timeout: 10000,
        });

        if (!isMounted) return;

        if (response.data && Array.isArray(response.data)) {
          setSessionTypes(response.data);
        } else {
          setSessionTypes([]);
        }
      } catch (error) {
        // Don't set error if request was aborted
        if (
          error.name === 'AbortError' ||
          error.name === 'CanceledError' ||
          error.code === 'ERR_CANCELED' ||
          (error.message && error.message.includes('canceled'))
        ) {
          return;
        }

        if (!isMounted) return;

        console.error('Error fetching session types:', error);
        let errorMessage = 'Failed to load session types';
        if (error.response?.data?.message) {
          errorMessage = error.response.data.message;
        } else if (error.message) {
          errorMessage = error.message;
        }
        setSessionTypesError(errorMessage);
        setSessionTypes([]);
      } finally {
        if (isMounted) {
          setLoadingSessionTypes(false);
        }
      }
    };

    fetchSessionTypes();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, []);

  useEffect(() => {
    if (orderedSessionTypes.length === 0) {
      setSelectedSessionTypeId(null);
      return;
    }

    setSelectedSessionTypeId((previousId) => {
      if (previousId && orderedSessionTypes.some((st) => (st.id || st.sessionTypeId) === previousId)) {
        return previousId;
      }
      return orderedSessionTypes[0].id || orderedSessionTypes[0].sessionTypeId;
    });
  }, [orderedSessionTypes]);

  // Fetch blog articles
  useEffect(() => {
    const fetchBlogArticles = async () => {
      if (!welcomeData?.welcomeArticleIds || !Array.isArray(welcomeData.welcomeArticleIds) || welcomeData.welcomeArticleIds.length === 0) {
        return;
      }

      setBlogLoading(true);
      setBlogError(null);
      try {
        // Build query string with article IDs - filter out empty/null/undefined values
        const validArticleIds = welcomeData.welcomeArticleIds.filter(id => id && id.trim() !== '');
        if (validArticleIds.length === 0) {
          setBlogArticles([]);
          setBlogLoading(false);
          return;
        }
        const articleIds = validArticleIds.join(',');
        const response = await apiClient.get(`/api/v1/public/articles?id=${articleIds}`, {
          timeout: 10000,
        });

        if (response.data && Array.isArray(response.data)) {
          setBlogArticles(response.data);
        } else {
          setBlogArticles([]);
        }
      } catch (error) {
        console.error('Error fetching blog articles:', error);
        setBlogError(error.message || 'Failed to load blog articles');
        setBlogArticles([]);
      } finally {
        setBlogLoading(false);
      }
    };

    fetchBlogArticles();
  }, [welcomeData]);

  // Smooth scroll function
  const scrollToSection = (ref) => {
    if (ref && ref.current) {
      ref.current.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }
  };

  // Mobile image: prefer welcomeMobileImageUrl, fallback to welcomeRightImageUrl
  const heroMobileImage = welcomeMobileImageUrl || welcomeRightImageUrl;

  const isPageReady = !welcomeLoading && heroImagesReady;

  useEffect(() => {
    if (!isPageReady) {
      setDisplayReady(false);
      return;
    }
    if (!applyMinLandingLoaderMsRef.current) {
      setDisplayReady(true);
      return;
    }
    const elapsed = performance.now() - landingLoaderStartedAtRef.current;
    const remaining = Math.max(0, MIN_LANDING_LOADER_MS - elapsed);
    const id = window.setTimeout(() => setDisplayReady(true), remaining);
    return () => clearTimeout(id);
  }, [isPageReady]);

  useEffect(() => {
    if (!displayReady) return;
    try {
      sessionStorage.setItem(LANDING_VISITED_SESSION_KEY, '1');
    } catch {
      /* ignore quota / private mode */
    }
  }, [displayReady]);

  // Hash scroll must run after full content exists. AppLayout used to scroll at 100ms,
  // but #contact (and other sections) are not mounted until displayReady — so direct
  // /#section loads on slow networks never scrolled.
  useEffect(() => {
    if (!displayReady || !location.hash) return;
    const sectionId = location.hash.slice(1);
    if (!sectionId) return;

    let timeoutId;
    const rafId = requestAnimationFrame(() => {
      timeoutId = window.setTimeout(() => {
        const el = document.getElementById(sectionId);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 0);
    });

    return () => {
      cancelAnimationFrame(rafId);
      if (timeoutId != null) clearTimeout(timeoutId);
    };
  }, [displayReady, location.hash]);

  useEffect(() => {
    if (!isMobileImage) return;
    const update = () => setHeroViewportFillMode(isNearTwoThreeViewport());
    update();
    window.addEventListener('resize', update);
    const vv = window.visualViewport;
    if (vv) {
      vv.addEventListener('resize', update);
      vv.addEventListener('scroll', update);
    }
    return () => {
      window.removeEventListener('resize', update);
      if (vv) {
        vv.removeEventListener('resize', update);
        vv.removeEventListener('scroll', update);
      }
    };
  }, [isMobileImage]);

  useEffect(() => {
    if (!isMobileImage || heroViewportFillMode || !displayReady) return;
    const node = heroRef.current;
    if (!node) return;
    const apply = () => {
      const { clientWidth, clientHeight } = node;
      const twoThreeWidthAtFullHeight = (clientHeight * 2) / 3;
      setScrollTrackMinWidthPx(Math.max(clientWidth, twoThreeWidthAtFullHeight));
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(node);
    return () => ro.disconnect();
  }, [isMobileImage, heroViewportFillMode, displayReady]);

  const landingFooterLinks = parseFooterLinksFromWelcome(welcomeData);

  return (
    <>
      {displayReady && (
    <Box sx={{ bgcolor: heroRightColour }}>
      {/* Hero: desktop = single section; mobile = viewport strip 85% #hero + 15% #hero-book-cta */}
      {isMobileImage ? (
        <Box
          sx={{
            height: '100dvh',
            maxHeight: '100dvh',
            minHeight: '100vh',
            paddingTop: '64px',
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            width: '100%',
            position: 'relative',
          }}
        >
          <Box
            ref={heroRef}
            component="section"
            id="hero"
            sx={{
              flex: '0 0 85%',
              flexGrow: 0,
              flexShrink: 0,
              flexBasis: '85%',
              minHeight: 0,
              maxHeight: '85%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'stretch',
              justifyContent: 'flex-start',
              overflowX: heroViewportFillMode ? 'hidden' : 'auto',
              overflowY: 'hidden',
              WebkitOverflowScrolling: heroViewportFillMode ? undefined : 'touch',
              width: '100%',
              background: `linear-gradient(to right, ${heroLeftColour} 50%, ${heroRightColour} 50%)`,
            }}
          >
            {heroViewportFillMode ? (
              /* Fill band: cover entire #hero area (viewport aspect near 2:3) */
              <Box
                sx={{
                  flex: 1,
                  minHeight: 0,
                  width: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  boxSizing: 'border-box',
                  px: { xs: 0, sm: 2 },
                }}
              >
                <Box
                  sx={{
                    flex: 1,
                    minHeight: 0,
                    width: '100%',
                    position: 'relative',
                    overflow: 'hidden',
                    backgroundColor: heroRightColour,
                  }}
                >
                  {heroMobileImage ? (
                    <Box
                      component="img"
                      src={heroMobileImage}
                      alt="Hero"
                      sx={{
                        position: 'absolute',
                        inset: 0,
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        objectPosition: 'center top',
                        zIndex: 1,
                      }}
                    />
                  ) : (
                    <Box
                      sx={{
                        position: 'absolute',
                        inset: 0,
                        background: (theme) =>
                          `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                      }}
                    />
                  )}
                </Box>
              </Box>
            ) : (
              /* Anomaly aspect: horizontal scroll; track minWidth = max(band w, (2/3)*band h) */
              <Box
                sx={{
                  flex: 1,
                  minHeight: 0,
                  width: '100%',
                  height: '100%',
                  boxSizing: 'border-box',
                  px: { xs: 0, sm: 2 },
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <Box
                  sx={{
                    height: '100%',
                    minHeight: 0,
                    minWidth: scrollTrackMinWidthPx > 0 ? `${scrollTrackMinWidthPx}px` : '100%',
                    position: 'relative',
                    flexShrink: 0,
                    alignSelf: 'flex-start',
                    backgroundColor: heroRightColour,
                  }}
                >
                  {heroMobileImage ? (
                    <Box
                      component="img"
                      src={heroMobileImage}
                      alt="Hero"
                      sx={{
                        position: 'absolute',
                        inset: 0,
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        objectPosition: 'center top',
                        zIndex: 1,
                      }}
                    />
                  ) : (
                    <Box
                      sx={{
                        position: 'absolute',
                        inset: 0,
                        background: (theme) =>
                          `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                      }}
                    />
                  )}
                </Box>
              </Box>
            )}
          </Box>
          <Box
            component="section"
            id="hero-book-cta"
            sx={{
              flex: '0 0 15%',
              flexGrow: 0,
              flexShrink: 0,
              flexBasis: '15%',
              minHeight: 0,
              maxHeight: '15%',
              width: '100%',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              py: { xs: 0.5, sm: 1 },
              px: { xs: 0, sm: 2 },
              boxSizing: 'border-box',
              bgcolor: 'background.default',
              overflow: 'hidden',
            }}
          >
            <Button
              variant="contained"
              onClick={() => scrollToSection(servicesRef)}
              sx={{
                px: { xs: 4, sm: 6 },
                py: { xs: 1, sm: 1.4 },
                fontSize: { xs: '0.9rem', sm: '1.05rem' },
                borderRadius: 999,
                textTransform: 'none',
                fontWeight: 600,
                boxShadow: 4,
                bgcolor: heroButtonColour,
                color: heroButtonTextColour,
                maxWidth: '100%',
                '&:hover': {
                  bgcolor: heroButtonColour,
                  filter: 'brightness(0.95)',
                },
              }}
            >
              {t('landing.hero.bookSession')}
            </Button>
          </Box>
        </Box>
      ) : (
        <Box
          ref={heroRef}
          id="hero"
          component="section"
          sx={{
            paddingTop: '64px',
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'stretch',
            position: 'relative',
            overflow: 'hidden',
            width: '100%',
            marginTop: 0,
            background: `linear-gradient(to right, ${heroLeftColour} 50%, ${heroRightColour} 50%)`,
          }}
        >
          {/* ─── Desktop layout: two side-by-side frames ─── */}
          <Box
            sx={{
              width: '100%',
              height: 'calc(100vh - 64px)',
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'stretch',
              justifyContent: 'center',
            }}
          >
            {/* Inner constrained container — stops growing at 1600px */}
            <Box
              sx={{
                width: '100%',
                maxWidth: '1700px',
                height: '100%',
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'stretch',
                justifyContent: 'center',
              }}
            >
              {/* LEFT FRAME – background image when set, with Book a Session button centered */}
              <Box
                sx={{
                  flex: '0 0 auto',
                  width: 'min(50%, calc((100vh - 64px) * 5 / 6))',
                  height: 'auto',
                  aspectRatio: '5 / 6',
                  marginRight: '50px',
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  background: heroLeftColour,
                }}
              >
                {/* Left frame background photo */}
                {welcomeLeftImageUrl && (
                  <Box
                    component="img"
                    src={welcomeLeftImageUrl}
                    alt="Left frame"
                    sx={{
                      position: 'absolute',
                      inset: 0,
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      objectPosition: 'center top',
                      zIndex: 0,
                    }}
                  />
                )}
                <Button
                  variant="contained"
                  onClick={() => scrollToSection(servicesRef)}
                  sx={{
                    px: 'clamp(30px, 3vw, 40px)',
                    py: 'clamp(12px, 1.4vw, 18px)',
                    fontSize: 'clamp(0.75rem, 1.1vw + 0.2rem, 1.4rem)',
                    borderRadius: 999,
                    textTransform: 'none',
                    bgcolor: heroButtonColour,
                    color: heroButtonTextColour,
                    fontWeight: 600,
                    boxShadow: 4,
                    zIndex: 3,
                    position: 'relative',
                    '&:hover': {
                      bgcolor: heroButtonColour,
                      filter: 'brightness(0.95)',
                    },
                  }}
                >
                  {t('landing.hero.bookSession')}
                </Button>
              </Box>

              {/* RIGHT FRAME – personal photo (welcomeRightMediaId) */}
              <Box
                sx={{
                  flex: '0 0 auto',
                  width: 'min(50%, calc((100vh - 64px) * 5 / 6))',
                  height: 'auto',
                  aspectRatio: '5 / 6',
                  marginLeft: '50px',
                  position: 'relative',
                  overflow: 'hidden',
                  background: heroRightColour,
                }}
              >
                {welcomeRightImageUrl ? (
                  <Box
                    component="img"
                    src={welcomeRightImageUrl}
                    alt="Hero"
                    sx={{
                      position: 'absolute',
                      inset: 0,
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      objectPosition: 'center top',
                      zIndex: 1,
                    }}
                  />
                ) : (
                  /* Fallback gradient when no photo is set */
                  <Box
                    sx={{
                      position: 'absolute',
                      inset: 0,
                      background: (theme) => `linear-gradient(145deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 100%)`,
                    }}
                  />
                )}
              </Box>
            </Box>
          </Box>
        </Box>
      )}

      {/* About Section */}
      <Box
        ref={aboutRef}
        id="about"
        component="section"
        sx={{
          pt: { xs: 1.25, md: 1.25 },
          pb: { xs: 6, md: 10 },
          bgcolor: 'background.paper',
          scrollMarginTop: '64px',
        }}
      >
        <Container maxWidth="lg">
          <Grid container spacing={0} sx={{ alignItems: 'center' }}>
            {/* Image column (left on md+; below text on xs) */}
            <Grid item xs={12} md={6} sx={{ position: 'relative', height: { xs: '400px', md: '600px' }, order: { xs: 2, md: 1 } }}>
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
                    alt={t('landing.about.alt')}
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
                      bgcolor: 'primary.main',
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

            {/* Text + buttons column (right on md+; first on xs) */}
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
                      fontSize: { xs: '1.5rem', sm: '1.75rem', md: '2rem' },
                      fontWeight: 700,
                      color: 'black',
                      letterSpacing: '0.05em',
                      textTransform: 'uppercase',
                      fontFamily: 'sans-serif',
                    }}
                  >
                    {t('landing.about.title')}
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
                      {t('landing.about.contentSoon')}
                    </Typography>
                  </Box>
                )}

                {/* Buttons */}
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mt: 4 }}>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={() => navigate('/about-me')}
                    sx={{
                      textTransform: 'none',
                      px: 4,
                      py: 1.5,
                      fontSize: '1rem',
                      fontWeight: 500,
                      flex: 1,
                      minWidth: '180px',
                    }}
                  >
                    {t('landing.about.readMore')}
                  </Button>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={() => scrollToSection(servicesRef)}
                    sx={{
                      textTransform: 'none',
                      px: 4,
                      py: 1.5,
                      fontSize: '1rem',
                      fontWeight: 500,
                      flex: 1,
                      minWidth: '180px',
                    }}
                  >
                    {t('landing.about.freeConsultation')}
                  </Button>
                </Box>
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
            {/* Text column (left on md+; first on xs) */}
            <Grid item xs={12} md={6} sx={{ px: { xs: 2, sm: 4, md: 6 }, py: { xs: 4, md: 6 }, order: { xs: 1, md: 1 } }}>
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
                      fontSize: { xs: '1.5rem', sm: '1.75rem', md: '2rem' },
                      fontWeight: 700,
                      color: 'black',
                      letterSpacing: '0.05em',
                      textTransform: 'uppercase',
                      fontFamily: 'sans-serif',
                    }}
                  >
                    {t('landing.education.title')}
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

            {/* Image column (right on md+; below text on xs) */}
            <Grid item xs={12} md={6} sx={{ position: 'relative', height: { xs: '300px', md: '400px' }, order: { xs: 2, md: 2 } }}>
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
                      bgcolor: 'primary.main',
                      fontSize: { xs: '3rem', md: '4rem' },
                      fontWeight: 600,
                    }}
                  >
                    E
                  </Avatar>
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
            sx={{
              mb: 2,
              fontWeight: 600,
              fontSize: { xs: '1.5rem', sm: '1.75rem', md: '2rem' },
            }}
          >
            {t('landing.services.title')}
          </Typography>
          <Typography
            variant="body1"
            color="text.secondary"
            align="center"
            paragraph
            sx={{ mb: 4 }}
          >
            {t('landing.services.description')}
          </Typography>

          {loadingSessionTypes ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : sessionTypesError ? (
            <Alert severity="error" sx={{ mb: 2 }}>
              {sessionTypesError}
            </Alert>
          ) : orderedSessionTypes.length > 0 ? (
            <Box sx={{ position: 'relative', width: '100%' }}>
              {/* Currency Selector Line */}
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  alignItems: 'center',
                  mb: 2,
                  pb: 1,
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                    {t('landing.services.currency')}:
                  </Typography>
                  <Tooltip title="Select currency">
                    <IconButton
                      onClick={(e) => setCurrencyMenuAnchor(e.currentTarget)}
                      size="small"
                      sx={{
                        color: 'text.primary',
                        fontSize: '1rem',
                        minWidth: 'auto',
                        padding: '4px 8px',
                        '&:hover': {
                          bgcolor: 'action.hover',
                        },
                      }}
                    >
                      <Typography variant="body2" sx={{ fontSize: '1rem', fontWeight: 500 }}>
                        {getCurrencySymbol(selectedCurrency)}
                      </Typography>
                    </IconButton>
                  </Tooltip>
                </Box>
                <Menu
                  anchorEl={currencyMenuAnchor}
                  open={Boolean(currencyMenuAnchor)}
                  onClose={() => setCurrencyMenuAnchor(null)}
                >
                  <MenuItem
                    onClick={() => {
                      setSelectedCurrency('Rubles');
                      setCurrencyMenuAnchor(null);
                    }}
                    selected={selectedCurrency === 'Rubles'}
                  >
                    ₽ {t('landing.services.currencies.Rubles')}
                  </MenuItem>
                  <MenuItem
                    onClick={() => {
                      setSelectedCurrency('Tenge');
                      setCurrencyMenuAnchor(null);
                    }}
                    selected={selectedCurrency === 'Tenge'}
                  >
                    ₸ {t('landing.services.currencies.Tenge')}
                  </MenuItem>
                </Menu>
              </Box>
              {isMobile ? (
                /* Mobile: single column; scrollable container when > 3 options */
                <Box sx={{ position: 'relative', mt: 1 }}>
                  <Box
                    ref={mobileServicesScrollRef}
                    onScroll={(e) => {
                      const el = e.target;
                      setMobileServicesAtBottom(
                        Math.abs(el.scrollHeight - el.scrollTop - el.clientHeight) < 4
                      );
                    }}
                    sx={
                      orderedSessionTypes.length > 3
                        ? {
                            maxHeight: '480px',
                            overflowY: 'auto',
                            pr: 0.5,
                            scrollbarWidth: 'thin',
                          }
                        : {}
                    }
                  >
                    <Grid container spacing={1.25}>
                      {orderedSessionTypes.map((sessionType) => (
                        <Grid item xs={12} key={sessionType.id || sessionType.sessionTypeId} sx={{ display: 'flex' }}>
                          <Card sx={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
                            <CardContent
                              sx={{
                                flexGrow: 1,
                                display: 'flex',
                                flexDirection: 'column',
                                p: 1.5,
                                minHeight: { xs: 150, sm: 170 },
                              }}
                            >
                              <Box sx={{ mb: 0.5 }}>
                                <Typography
                                  variant="body1"
                                  component="h3"
                                  sx={{
                                    fontWeight: 600,
                                    lineHeight: 1.35,
                                    fontSize: {
                                      xs: truncateText(sessionType.name, 100).length > 70
                                        ? 'clamp(0.86rem, 2.8vw, 1rem)'
                                        : 'clamp(0.94rem, 3.3vw, 1.08rem)',
                                      sm: '1rem',
                                    },
                                    overflowWrap: 'anywhere',
                                  }}
                                >
                                  {truncateText(sessionType.name, 100)}
                                </Typography>
                              </Box>
                              <Box sx={{ minHeight: 48, mb: 0.75 }}>
                                <Typography
                                  variant="body2"
                                  color="text.secondary"
                                  sx={{
                                    lineHeight: 1.35,
                                    fontSize: {
                                      xs: truncateText(sessionType.description, 100).length > 85
                                        ? 'clamp(0.8rem, 2.6vw, 0.9rem)'
                                        : 'clamp(0.86rem, 3vw, 0.96rem)',
                                      sm: '0.875rem',
                                    },
                                    overflowWrap: 'anywhere',
                                  }}
                                >
                                  {truncateText(sessionType.description, 100)}
                                </Typography>
                              </Box>
                            </CardContent>
                            <CardActions
                              disableSpacing
                              sx={{ p: 1.25, pt: 0.25, flexDirection: 'column', alignItems: 'stretch', gap: 0.75 }}
                            >
                              <Box sx={{ width: '100%', display: 'flex', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 0.5 }}>
                                <Chip
                                  label={`${sessionType.durationMinutes || 60} ${t('landing.booking.min')}`}
                                  size="small"
                                  color="primary"
                                  variant="outlined"
                                  sx={{ flexShrink: 0, '& .MuiChip-label': { fontWeight: 700 } }}
                                />
                                <Chip
                                  size="small"
                                  variant="outlined"
                                  color="primary"
                                  label={getCompactSessionPrice(sessionType)}
                                  sx={{ flexShrink: 0, mr: 0.5, '& .MuiChip-label': { fontWeight: 700 } }}
                                />
                              </Box>
                              <Button
                                variant="contained"
                                fullWidth
                                color="primary"
                                size="medium"
                                onClick={() => {
                                  const sessionTypeId = sessionType.id || sessionType.sessionTypeId;
                                  setSelectedSessionTypeId(sessionTypeId);
                                  setSelectedSessionType(sessionType);
                                  setBookingDialogOpen(true);
                                }}
                                sx={{ textTransform: 'none', py: 1, width: '100%', mx: 0 }}
                              >
                                {t('landing.services.bookNow')}
                              </Button>
                            </CardActions>
                          </Card>
                        </Grid>
                      ))}
                    </Grid>
                  </Box>
                  {/* Bottom fade gradient — visible when list is scrollable and not at the end */}
                  {orderedSessionTypes.length > 3 && !mobileServicesAtBottom && (
                    <Box
                      sx={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        height: 72,
                        background: 'linear-gradient(to bottom, transparent 0%, rgba(240,247,247,0.85) 60%, #F0F7F7 100%)',
                        pointerEvents: 'none',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'flex-end',
                        pb: 0.5,
                        borderRadius: '0 0 4px 4px',
                      }}
                    >
                      <KeyboardArrowDownIcon sx={{ color: 'text.secondary', opacity: 0.6, fontSize: 22 }} />
                    </Box>
                  )}
                </Box>
              ) : (
                /* Desktop: single-row horizontal scrolling list */
                <Box sx={{ position: 'relative', width: '100%', mt: 2 }}>
                  <Box
                    ref={desktopScrollRefCallback}
                    onScroll={updateDesktopServicesScrollState}
                    sx={{
                      width: '100%',
                      overflowX: 'auto',
                      overflowY: 'hidden',
                      pb: 1,
                      scrollBehavior: 'smooth',
                      scrollSnapType: 'x mandatory',
                      '&::-webkit-scrollbar': { display: 'none' },
                      msOverflowStyle: 'none',
                      scrollbarWidth: 'none',
                    }}
                  >
                    <Box sx={{ display: 'flex', flexWrap: 'nowrap', gap: 3, minWidth: 'max-content' }}>
                    {orderedSessionTypes.map((sessionType) => (
                      <Card
                        key={sessionType.id || sessionType.sessionTypeId}
                        sx={{
                          width: { md: 340, lg: 360 },
                          minHeight: '230px',
                          flex: '0 0 auto',
                          display: 'flex',
                          flexDirection: 'column',
                          scrollSnapAlign: 'start',
                          transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
                          '&:hover': {
                            transform: 'translateY(-4px)',
                            boxShadow: 4,
                          },
                        }}
                      >
                          <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', p: 2.5, minHeight: 170 }}>
                            <Box sx={{ mb: 0.75 }}>
                              <Typography
                                variant="body1"
                                component="h3"
                                sx={{
                                  fontWeight: 600,
                                  lineHeight: 1.35,
                                  fontSize: {
                                    xs: truncateText(sessionType.name, 100).length > 70
                                      ? 'clamp(0.86rem, 2.8vw, 1rem)'
                                      : 'clamp(0.94rem, 3.3vw, 1.08rem)',
                                    sm: truncateText(sessionType.name, 100).length > 70
                                      ? 'clamp(0.9rem, 1.4vw, 1rem)'
                                      : 'clamp(1rem, 1.8vw, 1.12rem)',
                                  },
                                  overflowWrap: 'anywhere',
                                }}
                              >
                                {truncateText(sessionType.name, 100)}
                              </Typography>
                            </Box>
                            <Box sx={{ minHeight: 48, mb: 0.75 }}>
                              <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{
                                  lineHeight: 1.35,
                                  fontSize: {
                                    xs: truncateText(sessionType.description, 100).length > 85
                                      ? 'clamp(0.8rem, 2.6vw, 0.9rem)'
                                      : 'clamp(0.86rem, 3vw, 0.96rem)',
                                    sm: truncateText(sessionType.description, 100).length > 85
                                      ? 'clamp(0.82rem, 1.2vw, 0.92rem)'
                                      : 'clamp(0.9rem, 1.5vw, 1rem)',
                                  },
                                  overflowWrap: 'anywhere',
                                }}
                              >
                                {truncateText(sessionType.description, 100)}
                              </Typography>
                            </Box>
                          </CardContent>
                          <CardActions disableSpacing sx={{ p: 1.5, pt: 0, flexDirection: 'column', alignItems: 'stretch', gap: 0.75 }}>
                            <Box sx={{ width: '100%', display: 'flex', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 0.5 }}>
                              <Chip
                                label={`${sessionType.durationMinutes || 60} ${t('landing.booking.min')}`}
                                size="small"
                                color="primary"
                                variant="outlined"
                                sx={{ flexShrink: 0, '& .MuiChip-label': { fontWeight: 700 } }}
                              />
                              <Chip
                                size="small"
                                variant="outlined"
                                color="primary"
                                label={getCompactSessionPrice(sessionType)}
                                sx={{ flexShrink: 0, mr: 0.5, '& .MuiChip-label': { fontWeight: 700 } }}
                              />
                            </Box>
                            <Button
                              variant="contained"
                              fullWidth
                              color="primary"
                              size="medium"
                              onClick={() => {
                                const sessionTypeId = sessionType.id || sessionType.sessionTypeId;
                                setSelectedSessionTypeId(sessionTypeId);
                                setSelectedSessionType(sessionType);
                                setBookingDialogOpen(true);
                              }}
                              sx={{ textTransform: 'none', width: '100%', mx: 0 }}
                            >
                              {t('landing.services.bookNow')}
                            </Button>
                          </CardActions>
                      </Card>
                    ))}
                    </Box>
                  </Box>
                  {/* Left fade + scroll button */}
                  <>
                    {desktopServicesCanScrollLeft && (
                      <Box
                        sx={{
                          position: 'absolute',
                          top: 0,
                          bottom: 8,
                          left: 0,
                          width: 88,
                          background: 'linear-gradient(to right, rgba(240,247,247,0.97) 0%, rgba(240,247,247,0.7) 55%, transparent 100%)',
                          pointerEvents: 'none',
                          zIndex: 1,
                        }}
                      />
                    )}
                    <IconButton
                      onClick={() => scrollDesktopServices(-1)}
                      size="large"
                      aria-label="scroll left"
                      disabled={!desktopServicesCanScrollLeft}
                      sx={{
                        position: 'absolute',
                        top: '50%',
                        left: -16,
                        width: 48,
                        height: 48,
                        transform: 'translateY(-50%)',
                        zIndex: 2,
                        bgcolor: 'primary.main',
                        color: 'primary.contrastText',
                        boxShadow: '0 6px 18px rgba(0,0,0,0.28)',
                        border: '1px solid',
                        borderColor: 'primary.dark',
                        '&:hover': {
                          bgcolor: 'primary.dark',
                          boxShadow: '0 10px 24px rgba(0,0,0,0.34)',
                          transform: 'translateY(-50%) scale(1.1)',
                        },
                        '&:focus-visible': {
                          outline: '3px solid',
                          outlineColor: 'rgba(25,118,210,0.35)',
                          outlineOffset: 2,
                        },
                        '&.Mui-disabled': {
                          bgcolor: 'grey.300',
                          color: 'grey.600',
                          borderColor: 'grey.400',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
                        },
                        transition: 'transform 0.18s ease, box-shadow 0.18s ease',
                      }}
                    >
                      <KeyboardArrowLeftRoundedIcon sx={{ fontSize: 28 }} />
                    </IconButton>
                  </>
                  {/* Right fade + scroll button */}
                  <>
                    {desktopServicesCanScrollRight && (
                      <Box
                        sx={{
                          position: 'absolute',
                          top: 0,
                          bottom: 8,
                          right: 0,
                          width: 88,
                          background: 'linear-gradient(to left, rgba(240,247,247,0.97) 0%, rgba(240,247,247,0.7) 55%, transparent 100%)',
                          pointerEvents: 'none',
                          zIndex: 1,
                        }}
                      />
                    )}
                    <IconButton
                      onClick={() => scrollDesktopServices(1)}
                      size="large"
                      aria-label="scroll right"
                      disabled={!desktopServicesCanScrollRight}
                      sx={{
                        position: 'absolute',
                        top: '50%',
                        right: -16,
                        width: 48,
                        height: 48,
                        transform: 'translateY(-50%)',
                        zIndex: 2,
                        bgcolor: 'primary.main',
                        color: 'primary.contrastText',
                        boxShadow: '0 6px 18px rgba(0,0,0,0.28)',
                        border: '1px solid',
                        borderColor: 'primary.dark',
                        '&:hover': {
                          bgcolor: 'primary.dark',
                          boxShadow: '0 10px 24px rgba(0,0,0,0.34)',
                          transform: 'translateY(-50%) scale(1.1)',
                        },
                        '&:focus-visible': {
                          outline: '3px solid',
                          outlineColor: 'rgba(25,118,210,0.35)',
                          outlineOffset: 2,
                        },
                        '&.Mui-disabled': {
                          bgcolor: 'grey.300',
                          color: 'grey.600',
                          borderColor: 'grey.400',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
                        },
                        transition: 'transform 0.18s ease, box-shadow 0.18s ease',
                      }}
                    >
                      <KeyboardArrowRightRoundedIcon sx={{ fontSize: 28 }} />
                    </IconButton>
                  </>
                </Box>
              )}
            </Box>
          ) : (
            <Alert severity="info" sx={{ mt: 2 }}>
              No session types available at this time.
            </Alert>
          )}
        </Container>
      </Box>

      {/* Blog Section */}
      <Box
        ref={blogRef}
        id="blog"
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
                fontSize: { xs: '1.5rem', sm: '1.75rem', md: '2rem' },
                fontWeight: 700,
                color: 'black',
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                fontFamily: 'sans-serif',
                mb: 3,
              }}
            >
              {t('landing.blog.title')}
            </Typography>
          </Box>

          {welcomeData?.welcomeArticleIds && Array.isArray(welcomeData.welcomeArticleIds) && welcomeData.welcomeArticleIds.length > 0 ? (
            <>
              {blogLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress />
                </Box>
              ) : blogError ? (
                <Alert severity="error" sx={{ mb: 3 }}>
                  {blogError}
                </Alert>
              ) : blogArticles.length > 0 ? (
                <>
                  <Grid container spacing={3}>
                    {blogArticles.map((article) => {
                      // Use excerpt if available, otherwise get first 250 characters of content
                      const stripHtml = (html) => {
                        if (!html) return '';
                        // Remove HTML tags using regex
                        return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
                      };

                      const plainContent = stripHtml(article.content || '');
                      const cleanExcerpt = article.excerpt ? article.excerpt.trim() : '';

                      const contentPreview = cleanExcerpt
                        ? cleanExcerpt
                        : (plainContent.length > 250
                          ? plainContent.substring(0, 250) + '...'
                          : plainContent);

                      return (
                        <Grid item xs={12} md={4} key={article.articleId}>
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
                              <Typography
                                variant="subtitle1"
                                component="h3"
                                gutterBottom
                                sx={{
                                  fontWeight: 600,
                                  lineHeight: 1.4,
                                  mb: 1,
                                }}
                              >
                                {article.title || 'Untitled'}
                              </Typography>
                              <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{
                                  fontSize: '0.8rem',
                                  lineHeight: 1.5,
                                  mb: 2,
                                }}
                              >
                                {contentPreview}
                              </Typography>
                            </CardContent>
                            <CardActions sx={{ p: 2, pt: 0 }}>
                              <Button
                                variant="outlined"
                                onClick={() => {
                                  const identifier = article.slug || article.articleId;
                                  navigate(`/blog/${identifier}`);
                                }}
                                sx={{ textTransform: 'none' }}
                              >
                                {t('landing.blog.readMore')}
                              </Button>
                            </CardActions>
                          </Card>
                        </Grid>
                      );
                    })}
                  </Grid>
                  {/* Button to redirect to blog page */}
                  <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={() => navigate('/blog')}
                      sx={{
                        textTransform: 'none',
                        px: 4,
                        py: 1.5,
                        fontSize: '1rem',
                        fontWeight: 500,
                      }}
                    >
                      {t('landing.blog.viewAllArticles')}
                    </Button>
                  </Box>
                </>
              ) : (
                <Alert severity="info" sx={{ mt: 2 }}>
                  {t('landing.blog.noArticlesAvailable')}
                </Alert>
              )}
            </>
          ) : (
            <Alert severity="info" sx={{ mt: 2 }}>
              {t('landing.blog.noBlogConfigured')}
            </Alert>
          )}
        </Container>
      </Box>

      {/* Testimonials/Reviews Section */}
      {welcomeData?.reviewMessage || (reviewMediaIds && reviewMediaIds.length > 0) ? (
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
                  fontSize: { xs: '1.5rem', sm: '1.75rem', md: '2rem' },
                  fontWeight: 700,
                  color: 'black',
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                  fontFamily: 'sans-serif',
                  mb: 3,
                }}
              >
                {t('landing.testimonials.title')}
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
            {reviewMediaIds && reviewMediaIds.length > 0 && (
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
                  {showArrows && (
                    <IconButton
                      onClick={() => {
                        setReviewCarouselIndex((prev) => Math.max(0, prev - 1));
                      }}
                      disabled={reviewCarouselIndex === 0}
                      sx={{
                        position: 'absolute',
                        left: { xs: -15, md: -50 },
                        zIndex: 2,
                        bgcolor: 'white',
                        boxShadow: 2,
                        width: 40,
                        height: 40,
                        padding: 1,
                        borderRadius: '50%',
                        '&:hover': {
                          bgcolor: 'grey.100',
                        },
                        '&.Mui-disabled': {
                          bgcolor: 'grey.200',
                          opacity: 0.5,
                        },
                      }}
                    >
                      <ArrowBackIosIcon sx={{ ml: 0.5, fontSize: 20 }} />
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
                      maxWidth: { xs: '100%', md: '1950px' },
                    }}
                  >
                    {Array.from({ length: imagesToShow }).map((_, frameIndex) => {
                      const imageIndex = reviewCarouselIndex + frameIndex;
                      const imageUrl = reviewImageUrls[imageIndex];
                      const isLoading = loadingReviewImages[imageIndex];
                      const imageExists = imageIndex < reviewMediaIds.length;

                      return (
                        <Box
                          key={frameIndex}
                          sx={{
                            flex: '1 1 0',
                            minWidth: 0,
                            maxWidth: { xs: '100%', sm: '650px' },
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
                          ) : isLoading ? (
                            <CircularProgress size={40} />
                          ) : imageExists ? (
                            <Box
                              sx={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: 1,
                              }}
                            >
                              <CircularProgress size={40} />
                              <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{ fontStyle: 'italic' }}
                              >
                                Loading...
                              </Typography>
                            </Box>
                          ) : null}
                        </Box>
                      );
                    })}
                  </Box>

                  {/* Right Arrow */}
                  {showArrows && (
                    <IconButton
                      onClick={() => {
                        const maxIndex = reviewMediaIds.length - imagesToShow;
                        setReviewCarouselIndex((prev) => Math.min(maxIndex, prev + 1));
                      }}
                      disabled={reviewCarouselIndex >= reviewMediaIds.length - imagesToShow}
                      sx={{
                        position: 'absolute',
                        right: { xs: -15, md: -50 },
                        zIndex: 2,
                        bgcolor: 'white',
                        boxShadow: 2,
                        width: 40,
                        height: 40,
                        padding: 1,
                        borderRadius: '50%',
                        '&:hover': {
                          bgcolor: 'grey.100',
                        },
                        '&.Mui-disabled': {
                          bgcolor: 'grey.200',
                          opacity: 0.5,
                        },
                      }}
                    >
                      <ArrowForwardIosIcon sx={{ fontSize: 20 }} />
                    </IconButton>
                  )}
                </Box>
              </Box>
            )}
          </Container>
        </Box>
      ) : null}

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
        maxWidth="lg"
        fullWidth
        fullScreen={isMobile}
        PaperProps={{
          sx: {
            borderRadius: isMobile ? 0 : 2,
            maxHeight: isMobile ? 'none' : '95vh',
            height: isMobile ? '100%' : undefined,
            display: 'flex',
            flexDirection: 'column',
          },
        }}
      >
        <DialogTitle
          sx={{
            bgcolor: 'primary.main',
            color: 'white',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            py: 2.5,
            px: 3,
            position: 'sticky',
            top: 0,
            zIndex: 1,
          }}
        >
          <Typography
            variant="h5"
            component="h2"
            sx={{
              fontWeight: 600,
              fontSize: { xs: '1.25rem', sm: '1.5rem' },
              textAlign: 'center',
              flex: 1,
            }}
          >
            {t('landing.booking.title')}
          </Typography>
          <IconButton
            onClick={() => {
              setBookingDialogOpen(false);
              setTimeout(() => {
                setSelectedSessionType(null);
                setSelectedSessionTypeId(null);
              }, 300);
            }}
            sx={{
              color: 'white',
              position: 'absolute',
              right: 8,
              '&:hover': {
                bgcolor: 'rgba(255, 255, 255, 0.1)',
              },
            }}
            size="medium"
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent
          dividers
          sx={{
            p: 0,
            overflow: 'auto',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            minHeight: '620px',
          }}
        >
          {/* Session Type Info Card */}
          {selectedSessionType && (
            <Box
              sx={{
                bgcolor: 'grey.50',
                borderBottom: 1,
                borderColor: 'divider',
                p: { xs: 2.5, sm: 3 },
              }}
            >
              <Box sx={{ mb: 2 }}>
                <Typography
                  variant="h6"
                  component="h3"
                  gutterBottom
                  sx={{
                    fontWeight: 600,
                    color: 'text.primary',
                    mb: 1,
                  }}
                >
                  {selectedSessionType.name}
                </Typography>
                {selectedSessionType.description && (
                  <Typography
                    variant="body2"
                    sx={{
                      color: 'text.secondary',
                      lineHeight: 1.6,
                    }}
                  >
                    {selectedSessionType.description}
                  </Typography>
                )}
              </Box>
              <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                <Chip
                  label={`${selectedSessionType.durationMinutes || 60} ${t('landing.booking.min')}`}
                  size="small"
                  sx={{
                    bgcolor: 'primary.main',
                    color: 'white',
                    fontWeight: 500,
                    height: 28,
                  }}
                />
                {selectedSessionType.prices && areAllPricesZero(selectedSessionType.prices) ? (
                  <Chip
                    label={t('landing.booking.free')}
                    size="small"
                    sx={{
                      bgcolor: 'success.main',
                      color: 'white',
                      fontWeight: 600,
                      height: 28,
                      fontSize: '0.875rem',
                    }}
                  />
                ) : selectedSessionType.prices && selectedSessionType.prices[selectedCurrency] ? (
                  <Chip
                    label={`${selectedSessionType.prices[selectedCurrency]} ${getCurrencySymbol(selectedCurrency)}`}
                    size="small"
                    sx={{
                      bgcolor: 'success.main',
                      color: 'white',
                      fontWeight: 600,
                      height: 28,
                      fontSize: '0.875rem',
                    }}
                  />
                ) : selectedSessionType.prices && Object.keys(selectedSessionType.prices).length > 0 ? (
                  <Chip
                    label={`Price not available in ${selectedCurrency}`}
                    size="small"
                    sx={{
                      bgcolor: 'warning.light',
                      color: 'text.primary',
                      fontWeight: 500,
                      height: 28,
                    }}
                  />
                ) : selectedSessionType.price ? (
                  <Chip
                    label={`$${selectedSessionType.price}`}
                    size="small"
                    sx={{
                      bgcolor: 'success.main',
                      color: 'white',
                      fontWeight: 600,
                      height: 28,
                      fontSize: '0.875rem',
                    }}
                  />
                ) : null}
              </Box>
            </Box>
          )}
          {/* Booking Form */}
          <Box
            sx={{
              pt: { xs: 1, sm: 1.5 },
              px: { xs: 2, sm: 3 },
              pb: { xs: 2, sm: 3 },
              flex: 1,
              overflow: 'auto',
            }}
          >
            <BookingPageContent sessionTypeId={selectedSessionTypeId} hideMyBookings={true} />
          </Box>
        </DialogContent>
      </Dialog>

      {/* Footer/Contact Links Section */}
      <Box
        id="contact"
        component="footer"
        sx={{
          py: { xs: 6, md: 8 },
          bgcolor: 'primary.dark',
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
            {t('landing.contact.connectWithMe')}
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
            {t('landing.contact.followDescription')}
          </Typography>

          <ContactLinksGrid links={contactLinks} />

          {(() => {
            const legalText =
              welcomeData?.extendedParameters?.footerMessage &&
              String(welcomeData.extendedParameters.footerMessage).trim();
            const hasLegal = Boolean(legalText);
            const hasLinks = landingFooterLinks.length > 0;
            if (!hasLegal && !hasLinks) return null;
            return (
              <Box
                sx={{
                  mt: { xs: 4, md: 6 },
                  pt: { xs: 3, md: 4 },
                  borderTop: '1px solid',
                  borderColor: 'rgba(255, 255, 255, 0.25)',
                  maxWidth: 900,
                  mx: 'auto',
                }}
              >
                {hasLegal && (
                  <Typography
                    variant="body2"
                    component="div"
                    align="center"
                    sx={{
                      opacity: 0.85,
                      fontSize: { xs: '0.75rem', md: '0.8rem' },
                      lineHeight: 1.7,
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                    }}
                  >
                    {legalText}
                  </Typography>
                )}
                {hasLinks && (
                  <Box
                    sx={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      justifyContent: 'center',
                      alignItems: 'center',
                      gap: { xs: 1, sm: 1.5 },
                      ...(hasLegal
                        ? { mt: { xs: 1, md: 1.25 } }
                        : {}),
                    }}
                  >
                    {landingFooterLinks.map((item, index) => (
                      <Link
                        key={`${item.linkUrl}-${index}`}
                        href={normalizeFooterHref(item.linkUrl)}
                        target="_blank"
                        rel="noopener noreferrer"
                        underline="hover"
                        sx={{
                          color: 'inherit',
                          fontSize: { xs: '0.65rem', md: '0.7rem' },
                          fontWeight: 500,
                          letterSpacing: 'normal',
                          textTransform: 'none',
                          py: 0.25,
                          px: 0.5,
                          minHeight: 'auto',
                          display: 'inline-flex',
                          alignItems: 'center',
                        }}
                      >
                        {item.linkDisplayName}
                      </Link>
                    ))}
                  </Box>
                )}
              </Box>
            );
          })()}
        </Container>
      </Box>
    </Box>
      )}
      {!displayReady &&
        (showFullScreenLandingLoaderRef.current ? (
          <Fade in={!displayReady} timeout={420} unmountOnExit appear={false}>
            <Box
              sx={{
                position: 'fixed',
                inset: 0,
                zIndex: (theme) => theme.zIndex.modal + 2,
              }}
            >
              <LandingPageLoader />
            </Box>
          </Fade>
        ) : (
          <Box
            aria-hidden
            sx={{
              position: 'fixed',
              inset: 0,
              zIndex: (theme) => theme.zIndex.modal + 2,
              minHeight: '100vh',
              width: '100%',
              bgcolor: '#F0F7F7',
            }}
          />
        ))}
    </>
  );
};

export default LandingPage;
