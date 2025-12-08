/**
 * Cache utility for booking available slots API calls
 * 
 * Features:
 * - Caches results keyed by sessionTypeId, suggestedDate, and timezone
 * - TTL of 5 minutes maximum
 * - Automatically clears on page reload (in-memory cache)
 * - Can be manually cleared when popup closes
 * - Invalidates cache entry on booking errors
 */

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds

// Cache storage: Map<key, { data, timestamp }>
const cache = new Map();

// Generate cache key from parameters
const getCacheKey = (sessionTypeId, suggestedDate, timezone) => {
  return `${sessionTypeId}|${suggestedDate}|${timezone}`;
};

// Check if cache entry is still valid
const isCacheValid = (entry) => {
  if (!entry || !entry.timestamp) {
    return false;
  }
  const age = Date.now() - entry.timestamp;
  return age < CACHE_TTL;
};

/**
 * Get cached slots data if available and valid
 * @param {string|number} sessionTypeId
 * @param {string} suggestedDate - YYYY-MM-DD format
 * @param {string} timezone
 * @returns {Object|null} Cached data or null if not found/invalid
 */
export const getCachedSlots = (sessionTypeId, suggestedDate, timezone) => {
  const key = getCacheKey(sessionTypeId, suggestedDate, timezone);
  const entry = cache.get(key);
  
  if (entry && isCacheValid(entry)) {
    return entry.data;
  }
  
  // Remove invalid entry
  if (entry) {
    cache.delete(key);
  }
  
  return null;
};

/**
 * Store slots data in cache
 * @param {string|number} sessionTypeId
 * @param {string} suggestedDate - YYYY-MM-DD format
 * @param {string} timezone
 * @param {Object} data - The slots data to cache
 */
export const setCachedSlots = (sessionTypeId, suggestedDate, timezone, data) => {
  const key = getCacheKey(sessionTypeId, suggestedDate, timezone);
  cache.set(key, {
    data,
    timestamp: Date.now(),
  });
};

/**
 * Invalidate cache entry for specific parameters
 * Used when a booking error occurs (e.g., slot was booked by someone else)
 * @param {string|number} sessionTypeId
 * @param {string} suggestedDate - YYYY-MM-DD format
 * @param {string} timezone
 */
export const invalidateCache = (sessionTypeId, suggestedDate, timezone) => {
  const key = getCacheKey(sessionTypeId, suggestedDate, timezone);
  cache.delete(key);
};

/**
 * Clear all cached slots
 * Call this when the booking popup is closed
 */
export const clearAllCache = () => {
  cache.clear();
};

/**
 * Clear expired entries from cache
 * This is called automatically but can be called manually if needed
 */
export const clearExpiredEntries = () => {
  const now = Date.now();
  for (const [key, entry] of cache.entries()) {
    if (!isCacheValid(entry)) {
      cache.delete(key);
    }
  }
};

// Periodically clean up expired entries (every minute)
if (typeof window !== 'undefined') {
  setInterval(clearExpiredEntries, 60 * 1000);
}

