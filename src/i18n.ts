import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import fr from './locales/fr.json';
import zh from './locales/zh.json';

function initialLanguage(): string {
  if (typeof window === 'undefined') return 'en';
  try {
    const stored = localStorage.getItem('i18nextLng');
    if (stored === 'en' || stored === 'zh' || stored === 'fr') return stored;
  } catch {
    /* ignore */
  }
  const base = navigator.language.split('-')[0]?.toLowerCase() ?? 'en';
  if (base === 'zh' || base === 'fr') return base;
  return 'en';
}

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    zh: { translation: zh },
    fr: { translation: fr },
  },
  lng: initialLanguage(),
  fallbackLng: 'en',
  supportedLngs: ['en', 'zh', 'fr'],
  nonExplicitSupportedLngs: true,
  interpolation: { escapeValue: false },
  react: { useSuspense: false },
});

i18n.on('languageChanged', (lng) => {
  try {
    const short = lng.split('-')[0]?.toLowerCase() ?? 'en';
    if (short === 'en' || short === 'zh' || short === 'fr') {
      localStorage.setItem('i18nextLng', short);
    }
  } catch {
    /* ignore */
  }
});

export default i18n;
