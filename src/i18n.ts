import i18next from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import HTTPBackend from 'i18next-http-backend';

export const i18n = i18next.use(HTTPBackend).use(LanguageDetector).init({
  fallbackLng: 'en',
  nonExplicitSupportedLngs: true,
  lowerCaseLng: true,
  backend: {
    loadPath: `${__webpack_public_path__}./assets/i18n/{{lng}}.json`,
  },
  interpolation: {
    format: (value, format) => {
      if (format === 't') return i18next.t(value);
      return value;
    },
  },
  supportedLngs: ['en', 'zh', 'zh-cn', 'ja'],
}, () => {
  document.title = i18next.t('appName');
  for (const element of document.querySelectorAll<HTMLElement>('*[data-lang]'))
    element.textContent = i18next.t(element.dataset.lang ?? '');
  for (const element of document.querySelectorAll<HTMLElement>('*[data-tooltip-lang]'))
    element.dataset.tooltip = i18next.t(element.dataset.tooltipLang ?? '');
  document.documentElement.lang = i18next.language;
});