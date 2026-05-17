import i18next, { type i18n } from 'i18next';
import en from '../../locales/en.json';
import zh from '../../locales/zh.json';

let instance: i18n | null = null;

export async function initI18n(lang: 'zh' | 'en'): Promise<void> {
  instance = i18next.createInstance();
  await instance.init({
    lng: lang,
    fallbackLng: 'en',
    resources: {
      zh: { translation: zh },
      en: { translation: en },
    },
    interpolation: { escapeValue: false },
  });
}

export function t(key: string, params?: Record<string, unknown>): string {
  if (!instance) throw new Error('i18n not initialized');
  return params === undefined ? instance.t(key) : instance.t(key, params);
}

export async function changeLanguage(lang: 'zh' | 'en'): Promise<void> {
  if (!instance) throw new Error('i18n not initialized');
  await instance.changeLanguage(lang);
}
