import ruTranslations from './ru.json';
import enTranslations from './en.json';
import roTranslations from './ro.json';

export const translations = {
  ru: ruTranslations,
  en: enTranslations,
  ro: roTranslations,
};

export type SupportedLanguage = 'ru' | 'en' | 'ro';
