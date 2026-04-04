import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from '@/locales/en.json';
import fr from '@/locales/fr.json';
import zh from '@/locales/zh.json';

const STORAGE_KEY = 'bridge-ed:locale';

function readStoredLocale(): string {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === 'en' || v === 'zh' || v === 'fr') return v;
  } catch {
    /* ignore */
  }
  return 'en';
}

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    zh: { translation: zh },
    fr: { translation: fr },
  },
  lng: readStoredLocale(),
  fallbackLng: 'en',
  supportedLngs: ['en', 'zh', 'fr'],
  interpolation: { escapeValue: false },
  react: { useSuspense: false },
});

i18n.on('languageChanged', (lng) => {
  try {
    localStorage.setItem(STORAGE_KEY, lng);
  } catch {
    /* ignore */
  }
});

export default i18n;
