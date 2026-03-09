import { useEffect, useState } from 'react';

const computeLayout = () => {
  if (typeof window === 'undefined') {
    return {
      isMobileLayout: false,
      isPhone: false,
      isTablet: false,
      isLandscape: false,
      width: 0,
      height: 0,
    };
  }

  const width = window.innerWidth;
  const height = window.innerHeight;
  const isLandscape = width > height;

  const uaString =
    (typeof navigator !== 'undefined' && (navigator.userAgent || navigator.vendor)) ||
    (typeof window !== 'undefined' && window.opera) ||
    '';
  const ua = String(uaString).toLowerCase();
  const hasDocument = typeof document !== 'undefined';

  const isIpad =
    /ipad/.test(ua) ||
    (/(macintosh;.*mac os x)/.test(ua) && hasDocument && 'ontouchend' in document);

  const isAndroid = /android/.test(ua);
  const isMobileFlag = /mobile/.test(ua);

  const isIphone = /iphone|ipod/.test(ua);
  const isAndroidPhone = isAndroid && isMobileFlag;

  const isPhone = isIphone || isAndroidPhone || (/mobile/.test(ua) && !isIpad);
  const isTablet =
    !isPhone &&
    (isIpad || (/tablet/.test(ua) || (isAndroid && !isMobileFlag)));

  let isMobileLayout;

  if (isPhone) {
    // Phone: portrait → mobile, landscape → laptop view
    isMobileLayout = !isLandscape;
  } else if (isTablet) {
    // Tablet: portrait → mobile, landscape → laptop view
    isMobileLayout = !isLandscape;
  } else {
    // Desktop or unknown device: width-based breakpoint
    isMobileLayout = width < 900;
  }

  return {
    isMobileLayout,
    isPhone,
    isTablet,
    isLandscape,
    width,
    height,
  };
};

export const useResponsiveLayout = () => {
  const [layout, setLayout] = useState(() => computeLayout());

  useEffect(() => {
    const handleChange = () => {
      setLayout(computeLayout());
    };

    window.addEventListener('resize', handleChange);
    window.addEventListener('orientationchange', handleChange);

    return () => {
      window.removeEventListener('resize', handleChange);
      window.removeEventListener('orientationchange', handleChange);
    };
  }, []);

  return layout;
};

