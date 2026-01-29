import apiClient from './api';

// Cache for timezones to prevent duplicate requests
let timezonesCache = null;
let timezonesPromise = null;

/**
 * Fetch all supported timezones from the backend
 * Returns an array of timezone objects with id, displayName, and offset
 * The API returns: { id: number, displayName: string, offset: string } (e.g., "+03:00" or "Z")
 * We normalize "Z" to "+00:00" for consistency
 * @returns {Promise<Array<{id: number, displayName: string, offset: string}>>}
 */
export const fetchTimezones = async () => {
    // Return cached data if available
    if (timezonesCache !== null) {
        return timezonesCache;
    }

    // Return existing promise if request is in flight
    if (timezonesPromise) {
        return timezonesPromise;
    }

    // Create new request
    timezonesPromise = (async () => {
        try {
            const response = await apiClient.get('/api/v1/public/timezone', {
                timeout: 10000,
            });

            if (response.data && Array.isArray(response.data)) {
                // Normalize the data: convert "Z" to "+00:00" for consistency
                const normalizedData = response.data.map(tz => ({
                    id: tz.id,
                    displayName: tz.displayName,
                    offset: tz.offset === 'Z' ? '+00:00' : tz.offset
                }));
                timezonesCache = normalizedData;
                return normalizedData;
            } else {
                throw new Error('Invalid timezone data received from server');
            }
        } catch (error) {
            console.error('Error fetching timezones:', error);
            // Clear promise on error so it can be retried
            timezonesPromise = null;
            throw error;
        } finally {
            // Clear promise after completion (success or error)
            timezonesPromise = null;
        }
    })();

    return timezonesPromise;
};

/**
 * Clear timezones cache (useful when data needs to be refreshed)
 */
export const clearTimezonesCache = () => {
    timezonesCache = null;
    timezonesPromise = null;
};

/**
 * Get timezone offset by ID
 * @param {number} id - The ID of the timezone
 * @param {Array} timezones - Array of timezone objects
 * @returns {string} The offset (e.g., "+03:00") or "+00:00" if not found
 */
export const getTimezoneOffsetById = (id, timezones) => {
    if (!timezones || !Array.isArray(timezones)) {
        return '+00:00';
    }

    const timezone = timezones.find(tz => tz.id === id);
    return timezone ? timezone.offset : '+00:00';
};

/**
 * Find timezone by offset
 * @param {string} offset - The offset to search for (e.g., "+03:00")
 * @param {Array} timezones - Array of timezone objects
 * @returns {Object|null} The timezone object or null if not found
 */
export const findTimezoneByOffset = (offset, timezones) => {
    if (!timezones || !Array.isArray(timezones)) {
        return null;
    }

    return timezones.find(tz => tz.offset === offset) || null;
};

/**
 * Sort timezones by offset (negative offsets first, then positive offsets)
 * @param {Array} timezones - Array of timezone objects
 * @returns {Array} Sorted array of timezone objects
 */
export const sortTimezonesByOffset = (timezones) => {
    if (!timezones || !Array.isArray(timezones)) {
        return [];
    }

    return [...timezones].sort((a, b) => {
        // Parse offset to number for comparison (e.g., "+03:00" -> 3, "-05:00" -> -5)
        const parseOffset = (offset) => {
            const match = offset.match(/([+-])(\d{2}):(\d{2})/);
            if (!match) return 0;
            const sign = match[1] === '+' ? 1 : -1;
            const hours = parseInt(match[2], 10);
            const minutes = parseInt(match[3], 10);
            return sign * (hours + minutes / 60);
        };

        const offsetA = parseOffset(a.offset);
        const offsetB = parseOffset(b.offset);

        return offsetA - offsetB;
    });
};

/**
 * Get formatted UTC offset from a timezone identifier (e.g. "Asia/Tashkent" -> "+05:00")
 * If the input is already an offset, it is returned as is.
 * @param {string} timezone - Timezone identifier or offset
 * @returns {string} Offset string (e.g. "+05:00")
 */
export const getOffsetFromTimezone = (timezone) => {
    if (!timezone) return '+00:00';

    // If it's already an offset (e.g. +03:00 or -05:00), return it
    if (/^[+-]\d{2}:\d{2}$/.test(timezone)) {
        return timezone;
    }

    // Handle UTC/Z
    if (timezone === 'Z' || timezone === 'UTC') {
        return '+00:00';
    }

    try {
        const now = new Date();
        const utcDate = new Date(now.toLocaleString('en-US', { timeZone: 'UTC' }));
        const tzDate = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
        const offsetMs = tzDate - utcDate;
        const offsetHours = Math.floor(offsetMs / (1000 * 60 * 60));
        const offsetMinutes = Math.floor((offsetMs % (1000 * 60 * 60)) / (1000 * 60));
        const sign = offsetHours >= 0 ? '+' : '-';
        const absHours = Math.abs(offsetHours);
        const absMinutes = Math.abs(offsetMinutes);
        return `${sign}${absHours.toString().padStart(2, '0')}:${absMinutes.toString().padStart(2, '0')}`;
    } catch (e) {
        console.warn(`Could not calculate offset for timezone ${timezone}, defaulting to +00:00`);
        // Fallback: Default to UTC if invalid timezone
        return '+00:00';
    }
};

/**
 * Extract offset from timezone object or string (handles both legacy and new API format)
 * @param {Object|string} timezone - Timezone object with gmtOffset or legacy offset string
 * @returns {string} Offset string (e.g., "+03:00")
 */
export const extractTimezoneOffset = (timezone) => {
    if (!timezone) return '+00:00';

    // If it's already a string (legacy format), normalize it
    if (typeof timezone === 'string') {
        return getOffsetFromTimezone(timezone);
    }

    // If it's an object with gmtOffset (new format)
    if (timezone.gmtOffset) {
        return timezone.gmtOffset === 'Z' ? '+00:00' : timezone.gmtOffset;
    }

    // Fallback
    return '+00:00';
};

/**
 * Find timezone ID by offset
 * @param {string} offset - Offset string (e.g., "+03:00")
 * @param {Array} timezones - Array of timezone objects from API (optional, will use cache if not provided or empty)
 * @returns {number|null} Timezone ID or null if not found
 */
export const findTimezoneIdByOffset = (offset, timezones) => {
    // If timezones array is not provided or empty, try to use the cache
    let timezonesToSearch = timezones;
    if (!timezones || !Array.isArray(timezones) || timezones.length === 0) {
        if (timezonesCache && Array.isArray(timezonesCache) && timezonesCache.length > 0) {
            timezonesToSearch = timezonesCache;
        } else {
            console.error('findTimezoneIdByOffset: No timezones available');
            return null;
        }
    }

    if (!offset) {
        console.error('findTimezoneIdByOffset: offset is empty');
        return null;
    }

    const normalized = offset === 'Z' ? '+00:00' : offset;
    const found = timezonesToSearch.find(tz => tz.offset === normalized);

    if (!found) {
        console.error(`findTimezoneIdByOffset: No timezone found for offset "${normalized}"`);
    }

    return found ? found.id : null;
};
