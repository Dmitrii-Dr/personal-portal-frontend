/**
 * apiErrors.js
 *
 * Maps backend PEC-* error codes to localized user-facing messages.
 * Error strings live in src/i18n/locales/errors.{en,ru}.json
 * and are registered under the "errors" i18n namespace.
 *
 * Usage:
 *   import { getApiErrorMessage } from '../utils/apiErrors';
 *
 *   // Inside a React component (has access to i18n instance):
 *   const msg = getApiErrorMessage(error.response?.data?.code, error.response?.data?.message);
 *
 *   // Outside React (e.g. axios interceptor):
 *   import i18n from '../i18n/i18n';
 *   const msg = getApiErrorMessage(code, fallback, i18n);
 */

import i18nInstance from '../i18n/i18n';

/**
 * Returns a localized message for the given backend error code.
 *
 * @param {string|undefined} code     - Backend error code, e.g. "PEC-413"
 * @param {string|undefined} fallback - Raw message from the backend (used if code has no translation)
 * @param {object} [i18n]             - Optional i18n instance (defaults to the global one)
 * @returns {string} Localized error message
 */
export function getApiErrorMessage(code, fallback, i18n = i18nInstance) {
    if (code) {
        const key = code.trim();
        const translated = i18n.t(key, { ns: 'errors' });
        // i18next returns the key itself when no translation is found
        if (translated && translated !== key) {
            return translated;
        }
    }
    // Fall back to raw backend message if present, otherwise generic fallback
    return fallback || i18n.t('fallback', { ns: 'errors' });
}

/**
 * Extracts and localizes the error from an axios error response.
 * Convenience wrapper for use in catch blocks.
 *
 * @param {object} err - Axios error object
 * @param {string} [defaultMessage] - Override for when no code/message is available
 * @param {object} [i18n] - Optional i18n instance
 * @returns {string}
 */
export function getAxiosErrorMessage(err, defaultMessage, i18n = i18nInstance) {
    const code = err?.response?.data?.code;
    const message = err?.response?.data?.message;
    return getApiErrorMessage(code, message || defaultMessage, i18n);
}
