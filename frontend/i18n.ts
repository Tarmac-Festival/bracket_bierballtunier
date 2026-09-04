import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import Backend from 'i18next-http-backend';
import { initReactI18next } from 'react-i18next';

i18n
  .use(Backend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    defaultNS: 'common',
    interpolation: {
      escapeValue: false,
    },
    backend: {
      // The scripts carry a hash in their name and so update by themselves, but the
      // wordings are plain files served without a cache header. Revalidating means a
      // browser that already has them asks whether they changed instead of assuming they
      // did not, which is the difference between seeing a new text and seeing its key.
      requestOptions: { cache: 'no-cache' },
    },
  });

export default i18n;
