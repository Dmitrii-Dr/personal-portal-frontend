import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import enTranslations from './locales/en.json';
import ruTranslations from './locales/ru.json';
import enErrors from './locales/errors.en.json';
import ruErrors from './locales/errors.ru.json';

// Supported language codes
const SUPPORTED_LANGS = ['en', 'ru'];

/**
 * Get language from URL search params (e.g. ?lang=en).
 * Used so adding ?lang=en to any URL switches to English and the choice is persisted.
 */
const getLangFromUrl = () => {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const lang = params.get('lang');
  return SUPPORTED_LANGS.includes(lang) ? lang : null;
};

// Get saved language: URL param overrides localStorage; default to Russian
const getStoredLanguage = () => {
  const urlLang = getLangFromUrl();
  if (urlLang) return urlLang;
  try {
    const saved = localStorage.getItem('i18nextLng');
    if (saved && SUPPORTED_LANGS.includes(saved)) {
      return saved;
    }
  } catch (e) {
    console.error('Error reading language from localStorage:', e);
  }
  return 'ru'; // Default to Russian
};

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        translation: enTranslations,
        errors: enErrors,
      },
      ru: {
        translation: ruTranslations,
        errors: ruErrors,
      },
    },
    lng: getStoredLanguage(),
    fallbackLng: 'ru',
    ns: ['translation', 'errors'],
    defaultNS: 'translation',
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    react: {
      useSuspense: false, // Avoid suspense requirement
    },
  });

// Update HTML lang attribute when language changes
i18n.on('languageChanged', (lng) => {
  document.documentElement.lang = lng;
  try {
    localStorage.setItem('i18nextLng', lng);
  } catch (e) {
    console.error('Error saving language to localStorage:', e);
  }
});

// Set initial HTML lang attribute
document.documentElement.lang = getStoredLanguage();

export default i18n;

