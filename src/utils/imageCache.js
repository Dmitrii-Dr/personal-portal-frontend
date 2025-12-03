// Image cache utility for session-based image caching
// Uses IndexedDB to persist blob data across page reloads
// Uses in-memory Map for object URLs (valid within current page session)

const DB_NAME = 'image_cache_db';
const DB_VERSION = 1;
const STORE_NAME = 'images';

// In-memory cache for current session (stores object URLs)
const memoryCache = new Map();

// IndexedDB instance cache
let dbInstance = null;

/**
 * Initialize IndexedDB
 * @returns {Promise<IDBDatabase>}
 */
const initDB = () => {
  return new Promise((resolve, reject) => {
    if (dbInstance) {
      resolve(dbInstance);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('Failed to open IndexedDB:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
};

/**
 * Get blob from IndexedDB
 * @param {string} mediaId - The media ID
 * @returns {Promise<Blob|null>}
 */
const getBlobFromDB = async (mediaId) => {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(mediaId);

      request.onsuccess = () => {
        resolve(request.result || null);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  } catch (error) {
    console.error('Error reading from IndexedDB:', error);
    return null;
  }
};

/**
 * Store blob in IndexedDB
 * @param {string} mediaId - The media ID
 * @param {Blob} blob - The blob to store
 */
const storeBlobInDB = async (mediaId, blob) => {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(blob, mediaId);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  } catch (error) {
    console.error('Error writing to IndexedDB:', error);
    // Don't throw - caching failure shouldn't break the app
  }
};

/**
 * Get cached image URL for a mediaId
 * @param {string} mediaId - The media ID
 * @returns {Promise<string|null>} - Cached object URL or null if not cached
 */
export const getCachedImage = async (mediaId) => {
  if (!mediaId) return null;

  // Check memory cache first (fastest)
  if (memoryCache.has(mediaId)) {
    return memoryCache.get(mediaId);
  }

  // Check IndexedDB for persisted blob
  const blob = await getBlobFromDB(mediaId);
  if (blob) {
    const objectUrl = URL.createObjectURL(blob);
    memoryCache.set(mediaId, objectUrl);
    return objectUrl;
  }

  return null;
};

/**
 * Cache an image URL for a mediaId
 * @param {string} mediaId - The media ID
 * @param {string} objectUrl - The object URL to cache
 * @param {Blob} blob - The blob data to persist
 */
export const setCachedImage = async (mediaId, objectUrl, blob) => {
  if (!mediaId || !objectUrl) return;

  // Store in memory cache
  memoryCache.set(mediaId, objectUrl);

  // Store blob in IndexedDB for persistence across page reloads
  if (blob) {
    await storeBlobInDB(mediaId, blob);
  }
};

/**
 * Load image from API with caching
 * @param {string} mediaId - The media ID to load
 * @returns {Promise<string>} - Promise resolving to object URL
 */
export const loadImageWithCache = async (mediaId) => {
  if (!mediaId) {
    throw new Error('Media ID is required');
  }

  // Check cache first (memory + IndexedDB)
  const cachedUrl = await getCachedImage(mediaId);
  if (cachedUrl) {
    return cachedUrl;
  }

  // Fetch from API
  try {
    const response = await fetch(`/api/v1/public/media/image/${mediaId}`, {
      method: 'GET',
      cache: 'default', // Use browser HTTP cache as well
    });

    if (!response.ok) {
      throw new Error(`Failed to load image: ${response.status}`);
    }

    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);

    // Cache the object URL and blob
    await setCachedImage(mediaId, objectUrl, blob);

    return objectUrl;
  } catch (error) {
    console.error(`Error loading image for mediaId ${mediaId}:`, error);
    throw error;
  }
};

/**
 * Clear a specific image from cache
 * @param {string} mediaId - The media ID to clear
 */
export const clearCachedImage = async (mediaId) => {
  if (!mediaId) return;

  const cachedUrl = memoryCache.get(mediaId);

  // Revoke object URL if it exists
  if (cachedUrl) {
    try {
      URL.revokeObjectURL(cachedUrl);
    } catch (e) {
      // Ignore errors
    }
  }

  // Remove from memory cache
  memoryCache.delete(mediaId);

  // Remove from IndexedDB
  try {
    const db = await initDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    store.delete(mediaId);
  } catch (error) {
    console.error('Error clearing image from IndexedDB:', error);
  }
};

/**
 * Clear all cached images
 */
export const clearAllCachedImages = async () => {
  // Revoke all object URLs
  memoryCache.forEach((url) => {
    try {
      URL.revokeObjectURL(url);
    } catch (e) {
      // Ignore errors
    }
  });

  // Clear memory cache
  memoryCache.clear();

  // Clear IndexedDB
  try {
    const db = await initDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    store.clear();
  } catch (error) {
    console.error('Error clearing IndexedDB:', error);
  }
};
