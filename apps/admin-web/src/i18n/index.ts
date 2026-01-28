import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import enTranslations from './locales/en/common.json';
import thTranslations from './locales/th/common.json';

const resources = {
  en: {
    translation: enTranslations,
  },
  th: {
    translation: thTranslations,
  },
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: localStorage.getItem('farmiQ.lang') || 'en',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
