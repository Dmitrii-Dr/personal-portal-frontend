import axios from 'axios';

const TOKEN_KEY = 'auth_token';

// Get token from sessionStorage
export const getToken = () => {
  return sessionStorage.getItem(TOKEN_KEY);
};

// Save token to sessionStorage
export const setToken = (token) => {
  if (token) {
    sessionStorage.setItem(TOKEN_KEY, token);
  } else {
    sessionStorage.removeItem(TOKEN_KEY);
  }
};

// Remove token from sessionStorage
export const removeToken = () => {
  sessionStorage.removeItem(TOKEN_KEY);
};

// Decode JWT token to get payload
export const decodeToken = (token) => {
  try {
    if (!token) return null;
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = parts[1];
    
    // Base64URL decode - add padding if needed
    let base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padding = base64.length % 4;
    if (padding) {
      base64 += '='.repeat(4 - padding);
    }
    
    const decoded = JSON.parse(atob(base64));
    return decoded;
  } catch (error) {
    console.error('Error decoding token:', error);
    return null;
  }
};

// Get roles from token
export const getRolesFromToken = (token) => {
  const decoded = decodeToken(token);
  if (!decoded) {
    console.warn('Token could not be decoded');
    return [];
  }
  
  // Debug: log decoded token to help diagnose issues
  console.log('Decoded token:', decoded);
  
  // Handle different possible role field names
  if (decoded.roles) {
    let roles = Array.isArray(decoded.roles) ? decoded.roles : [decoded.roles];
    // Handle Spring Security format where roles might be objects with 'authority' field
    roles = roles.map(role => typeof role === 'object' && role.authority ? role.authority : role);
    console.log('Found roles:', roles);
    return roles;
  }
  if (decoded.role) {
    let roles = Array.isArray(decoded.role) ? decoded.role : [decoded.role];
    roles = roles.map(role => typeof role === 'object' && role.authority ? role.authority : role);
    console.log('Found role:', roles);
    return roles;
  }
  if (decoded.authorities) {
    let roles = Array.isArray(decoded.authorities) ? decoded.authorities : [decoded.authorities];
    // Handle Spring Security format where authorities might be objects with 'authority' field
    roles = roles.map(role => typeof role === 'object' && role.authority ? role.authority : role);
    console.log('Found authorities:', roles);
    return roles;
  }
  if (decoded.scope) {
    const roles = Array.isArray(decoded.scope) ? decoded.scope : decoded.scope.split(' ');
    console.log('Found scope:', roles);
    return roles;
  }
  
  console.warn('No roles found in token. Available keys:', Object.keys(decoded));
  return [];
};

// Check if user has ROLE_ADMIN
export const hasAdminRole = (token) => {
  const roles = getRolesFromToken(token);
  return roles.includes('ROLE_ADMIN') || roles.includes('ADMIN_ROLE');
};

// Check if token is expired
export const isTokenExpired = (token) => {
  if (!token) return true;
  
  const decoded = decodeToken(token);
  if (!decoded) return true;
  
  // Check if token has exp attribute
  if (!decoded.exp) return false; // If no exp, assume not expired (let server handle it)
  
  // exp is in seconds since epoch, Date.now() is in milliseconds
  const expirationTime = decoded.exp * 1000;
  const currentTime = Date.now();
  
  return currentTime >= expirationTime;
};

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: '/',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add Authorization header
apiClient.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      // Check if token is expired before making request
      if (isTokenExpired(token)) {
        removeToken();
        // Reject the request with a specific error
        return Promise.reject(new Error('Token expired'));
      }
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      // Ensure Authorization header is not set if no token
      delete config.headers.Authorization;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling (optional, can be extended later)
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle 401 unauthorized errors - clear token on 401
    if (error.response?.status === 401) {
      removeToken();
      // Dispatch event to notify components of token expiration
      window.dispatchEvent(new Event('token-expired'));
    }
    return Promise.reject(error);
  }
);

// Helper function to add Authorization header to fetch requests
export const fetchWithAuth = async (url, options = {}) => {
  const token = getToken();
  
  // Check if token is expired before making request
  if (token && isTokenExpired(token)) {
    removeToken();
    window.dispatchEvent(new Event('token-expired'));
    throw new Error('Token expired');
  }
  
  const headers = {
    ...options.headers,
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return fetch(url, {
    ...options,
    headers,
  });
};

// Admin API functions

// Fetch grouped bookings for admin
export const fetchAdminGroupedBookings = async (status = null) => {
  const params = {};
  if (status) {
    params.status = status;
  }
  const response = await apiClient.get('/api/v1/admin/session/booking/group', {
    params,
    timeout: 10000,
  });
  return response.data;
};

// Cache for user profile to prevent duplicate requests
let userProfileCache = null;
let userProfilePromise = null;
let userProfileToken = null;

// Fetch user profile with caching
// Note: We don't use abort signals for shared requests to prevent one component
// from canceling a request that other components are waiting for
export const fetchUserProfile = async () => {
  const token = getToken();
  
  // If no token, clear cache and return null
  if (!token) {
    userProfileCache = null;
    userProfileToken = null;
    userProfilePromise = null;
    return null;
  }

  // Return cached data if available and token matches
  if (userProfileCache !== null && userProfileToken === token) {
    return userProfileCache;
  }

  // Return existing promise if request is in flight for the same token
  if (userProfilePromise && userProfileToken === token) {
    return userProfilePromise;
  }

  // Create new request (without abort signal to allow sharing between components)
  userProfileToken = token;
  userProfilePromise = (async () => {
    try {
      const response = await fetchWithAuth('/api/v1/user/profile');
      if (response.ok) {
        const data = await response.json();
        userProfileCache = data;
        return data;
      } else {
        throw new Error(`Failed to fetch user profile: ${response.status}`);
      }
    } catch (error) {
      // Clear promise on error so it can be retried
      userProfilePromise = null;
      userProfileToken = null;
      throw error;
    } finally {
      // Clear promise after completion (success or error)
      userProfilePromise = null;
    }
  })();

  return userProfilePromise;
};

// Clear user profile cache (useful when profile is updated)
export const clearUserProfileCache = () => {
  userProfileCache = null;
  userProfilePromise = null;
  userProfileToken = null;
};

// Cache for user settings to prevent duplicate requests
let userSettingsCache = null;
let userSettingsPromise = null;
let userSettingsToken = null;

// Fetch user settings with caching
export const fetchUserSettings = async () => {
  const token = getToken();
  
  // If no token, clear cache and return null
  if (!token) {
    userSettingsCache = null;
    userSettingsToken = null;
    userSettingsPromise = null;
    return null;
  }

  // Return cached data if available and token matches
  if (userSettingsCache !== null && userSettingsToken === token) {
    return userSettingsCache;
  }

  // Return existing promise if request is in flight for the same token
  if (userSettingsPromise && userSettingsToken === token) {
    return userSettingsPromise;
  }

  // Create new request
  userSettingsToken = token;
  userSettingsPromise = (async () => {
    try {
      const response = await fetchWithAuth('/api/v1/user/setting');
      if (response.ok) {
        const data = await response.json();
        userSettingsCache = data;
        return data;
      } else {
        throw new Error(`Failed to fetch user settings: ${response.status}`);
      }
    } catch (error) {
      // Clear promise on error so it can be retried
      userSettingsPromise = null;
      userSettingsToken = null;
      throw error;
    } finally {
      // Clear promise after completion (success or error)
      userSettingsPromise = null;
    }
  })();

  return userSettingsPromise;
};

// Clear user settings cache (useful when settings are updated)
export const clearUserSettingsCache = () => {
  userSettingsCache = null;
  userSettingsPromise = null;
  userSettingsToken = null;
};

// Export configured axios instance
export default apiClient;

