import axios from 'axios';

// ─── In-memory access token (never stored in sessionStorage/localStorage) ───
let accessToken = null;

// localStorage key used only as a boolean hint so we know whether to attempt
// a silent refresh on page load. We never store the token itself here.
const SESSION_HINT_KEY = 'has_session';

export const getToken = () => accessToken;

export const setToken = (token) => {
  accessToken = token || null;
  if (accessToken) {
    localStorage.setItem(SESSION_HINT_KEY, '1');
  } else {
    localStorage.removeItem(SESSION_HINT_KEY);
  }
};

export const removeToken = () => {
  accessToken = null;
  localStorage.removeItem(SESSION_HINT_KEY);
  // Clear the XSRF-TOKEN cookie so hasSessionHint() returns false.
  // Prevents any further /refresh attempts after a forced logout.
  // The server also clears it, but doing it client-side makes us resilient
  // to cases where the server response doesn't (e.g. on /refresh 401).
  document.cookie = 'XSRF-TOKEN=; Max-Age=0; path=/; SameSite=Strict';
};

// ─── CSRF helper ─────────────────────────────────────────────────────────────
// Reads the JS-readable XSRF-TOKEN cookie that the server sets on login.
export const getXsrfToken = () => {
  const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
};

// Returns true if the user likely has an active session.
// Checks the localStorage flag (set by us on login) OR the XSRF-TOKEN cookie
// (set by the server on login) as a fallback for pre-existing sessions.
export const hasSessionHint = () =>
  !!localStorage.getItem(SESSION_HINT_KEY) || !!getXsrfToken();


// ─── JWT helpers ─────────────────────────────────────────────────────────────
export const decodeToken = (token) => {
  try {
    if (!token) return null;
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padding = base64.length % 4;
    if (padding) base64 += '='.repeat(4 - padding);
    return JSON.parse(atob(base64));
  } catch (error) {
    console.error('Error decoding token:', error);
    return null;
  }
};

export const getRolesFromToken = (token) => {
  const decoded = decodeToken(token);
  if (!decoded) {
    console.warn('Token could not be decoded');
    return [];
  }

  const normalize = (arr) =>
    arr.map((r) => (typeof r === 'object' && r.authority ? r.authority : r));

  if (decoded.roles) return normalize(Array.isArray(decoded.roles) ? decoded.roles : [decoded.roles]);
  if (decoded.role) return normalize(Array.isArray(decoded.role) ? decoded.role : [decoded.role]);
  if (decoded.authorities) return normalize(Array.isArray(decoded.authorities) ? decoded.authorities : [decoded.authorities]);
  if (decoded.scope) return Array.isArray(decoded.scope) ? decoded.scope : decoded.scope.split(' ');

  console.warn('No roles found in token. Available keys:', Object.keys(decoded));
  return [];
};

export const hasAdminRole = (token) => {
  const roles = getRolesFromToken(token);
  return roles.includes('ROLE_ADMIN') || roles.includes('ADMIN_ROLE');
};

export const isTokenExpired = (token) => {
  if (!token) return true;
  const decoded = decodeToken(token);
  if (!decoded) return true;
  if (!decoded.exp) return false;
  return Date.now() >= decoded.exp * 1000;
};

// ─── Refresh ──────────────────────────────────────────────────────────────────
// Called on page reload (when session hint is present) and by the axios 401
// interceptor when a regular request returns 401.
// Concurrent calls are deduplicated — only one HTTP request is ever in flight.
let _refreshPromise = null;

export const refreshAccessToken = () => {
  // Anonymous user — no session hints, skip entirely.
  if (!hasSessionHint()) return Promise.resolve(null);

  // If a refresh is already in flight, return the same promise so that
  // multiple simultaneous callers (e.g. AppLayout + AdminRoute on page reload)
  // share one HTTP request instead of making two.
  if (_refreshPromise) return _refreshPromise;

  _refreshPromise = (async () => {
    const xsrf = getXsrfToken();
    const headers = { 'Content-Type': 'application/json' };
    if (xsrf) headers['X-XSRF-TOKEN'] = xsrf;

    try {
      const response = await fetch('/api/v1/auth/refresh', {
        method: 'POST',
        credentials: 'same-origin',
        headers,
      });

      if (response.status === 401 || response.status === 403) {
        // Refresh token expired / invalid — end the session.
        removeToken(); // clears token + has_session flag + XSRF cookie
        window.dispatchEvent(new Event('token-expired')); // → forceLogout() → navigate('/')
        return null;
      }

      if (!response.ok) return null; // transient error — don't force logout

      const data = await response.json();
      const token = data.token ?? data.accessToken ?? null;
      if (token) setToken(token);
      return token;
    } catch {
      return null; // network error — don't force logout
    }
  })().finally(() => {
    _refreshPromise = null; // clear so future independent calls work normally
  });

  return _refreshPromise;
};

// ─── Logout ───────────────────────────────────────────────────────────────────
// Calls the server logout endpoint (clears HttpOnly refresh cookie) then
// wipes the in-memory access token.
export const logoutApi = async () => {
  const xsrf = getXsrfToken();
  const headers = { 'Content-Type': 'application/json' };
  if (xsrf) headers['X-XSRF-TOKEN'] = xsrf;

  try {
    await fetch('/api/v1/auth/logout', {
      method: 'POST',
      credentials: 'same-origin',
      headers,
    });
  } catch (error) {
    // Best-effort — clear local state regardless
    console.warn('Logout request failed:', error);
  } finally {
    removeToken();
  }
};

// ─── Axios instance ───────────────────────────────────────────────────────────
const apiClient = axios.create({
  baseURL: '/',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: false, // same-origin; cookies sent automatically
});

// ─── Public welcome cache ────────────────────────────────────────────────────
let _welcomePromise = null;
let _welcomeCache = null;
let _welcomeCacheTime = 0;
const WELCOME_CACHE_TTL_MS = 30000;

export const getPublicWelcome = ({ timeout, force = false } = {}) => {
  const now = Date.now();
  if (!force && _welcomeCache && now - _welcomeCacheTime < WELCOME_CACHE_TTL_MS) {
    return Promise.resolve(_welcomeCache);
  }

  if (!force && _welcomePromise) {
    return _welcomePromise;
  }

  _welcomePromise = (async () => {
    let token = getToken();
    if (!token && hasSessionHint()) {
      token = await refreshAccessToken();
    }

    const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

    return apiClient.get('/api/v1/public/welcome', {
      timeout,
      headers,
    });
  })()
    .then((response) => {
      const data = response.data;
      _welcomeCache = data;
      _welcomeCacheTime = Date.now();
      return data;
    })
    .finally(() => {
      _welcomePromise = null;
    });

  return _welcomePromise;
};

// Flag to prevent concurrent refresh attempts
let isRefreshing = false;
let failedQueue = []; // Array of { resolve, reject }

const processQueue = (error, token = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token);
  });
  failedQueue = [];
};

// Request interceptor — attach access token
apiClient.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      delete config.headers.Authorization;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — auto-refresh on 401, PEC-412 redirect on 403
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Portal inactive — redirect to maintenance for /api/v1/user/** calls
    if (error.response?.status === 500) {
      try {
        const body = error.response?.data;
        const url = originalRequest?.url || '';
        if (
          body?.code === 'PEC-416' &&
          url.startsWith('/api/v1/user/') &&
          window.location.pathname !== '/maintenance'
        ) {
          window.location.assign('/maintenance');
          return Promise.reject(error);
        }
      } catch (_) {
        // ignore parse errors
      }
    }

    // Account not verified — redirect to verification page from anywhere
    if (error.response?.status === 403) {
      try {
        const body = error.response?.data;
        if (body?.code === 'PEC-412' && window.location.pathname !== '/verify-account') {
          window.dispatchEvent(new Event('account-not-verified'));
          return Promise.reject(error);
        }
      } catch (_) {
        // ignore parse errors
      }
    }

    if (
      error.response?.status === 401 &&
      !originalRequest._retry              // prevent infinite loop
    ) {
      if (isRefreshing) {
        // Queue this request until the in-flight refresh completes
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const newToken = await refreshAccessToken();

      isRefreshing = false;

      if (newToken) {
        processQueue(null, newToken);
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        // Notify the UI that auth state changed (e.g. header shows logged-in)
        window.dispatchEvent(new Event('auth-changed'));
        return apiClient(originalRequest);
      } else {
        processQueue(new Error('Session expired'));
        removeToken();
        window.dispatchEvent(new Event('token-expired'));
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);

// ─── fetchWithAuth ────────────────────────────────────────────────────────────
// Thin wrapper around native fetch that attaches the Authorization header.
// For 401 handling in plain-fetch paths use the axios client instead, or
// handle manually.  Most protected calls in this codebase use apiClient.
export const fetchWithAuth = async (url, options = {}) => {
  let token = getToken();
  if (!token && hasSessionHint()) {
    token = await refreshAccessToken();
  }
  const headers = { ...options.headers };
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(url, {
    credentials: 'same-origin',
    ...options,
    headers,
  });

  // Portal inactive — redirect to maintenance for /api/v1/user/** calls
  if (response.status === 500 && typeof url === 'string' && url.startsWith('/api/v1/user/')) {
    try {
      const body = await response.clone().json();
      if (body?.code === 'PEC-416' && window.location.pathname !== '/maintenance') {
        window.location.assign('/maintenance');
        return response;
      }
    } catch (_) {
      // ignore parse errors
    }
  }

  // Transparent 401 refresh for plain-fetch callers
  if (response.status === 401) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      headers.Authorization = `Bearer ${newToken}`;
      // Notify the UI that auth state changed
      window.dispatchEvent(new Event('auth-changed'));
      return fetch(url, { credentials: 'same-origin', ...options, headers });
    }
    removeToken();
    window.dispatchEvent(new Event('token-expired'));
  }

  return response;
};

// ─── Admin API ────────────────────────────────────────────────────────────────
export const fetchAdminGroupedBookings = async (status = null) => {
  const params = {};
  if (status) params.status = status;
  const response = await apiClient.get('/api/v1/admin/session/booking/group', {
    params,
    timeout: 10000,
  });
  return response.data;
};

// ─── User profile (with simple in-request dedup) ─────────────────────────────
let userProfileCache = null;
let userProfilePromise = null;

export const fetchUserProfile = async () => {
  if (!getToken()) return null;

  if (userProfileCache !== null) return userProfileCache;
  if (userProfilePromise) return userProfilePromise;

  userProfilePromise = (async () => {
    try {
      const response = await fetchWithAuth('/api/v1/user/profile');
      if (response.ok) {
        const data = await response.json();
        userProfileCache = data;
        return data;
      }
      throw new Error(`Failed to fetch user profile: ${response.status}`);
    } catch (error) {
      userProfilePromise = null;
      throw error;
    } finally {
      userProfilePromise = null;
    }
  })();

  return userProfilePromise;
};

export const clearUserProfileCache = () => {
  userProfileCache = null;
  userProfilePromise = null;
};

// ─── User settings (with simple in-request dedup) ────────────────────────────
let userSettingsCache = null;
let userSettingsPromise = null;

export const fetchUserSettings = async () => {
  if (!getToken()) return null;

  if (userSettingsCache !== null) return userSettingsCache;
  if (userSettingsPromise) return userSettingsPromise;

  userSettingsPromise = (async () => {
    try {
      const response = await fetchWithAuth('/api/v1/user/setting');
      if (response.ok) {
        const data = await response.json();
        userSettingsCache = data;
        return data;
      }
      throw new Error(`Failed to fetch user settings: ${response.status}`);
    } catch (error) {
      userSettingsPromise = null;
      throw error;
    } finally {
      userSettingsPromise = null;
    }
  })();

  return userSettingsPromise;
};

export const clearUserSettingsCache = () => {
  userSettingsCache = null;
  userSettingsPromise = null;
};

export default apiClient;
