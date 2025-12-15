import { SupportedLanguage } from './translations';

const LANGUAGE_MAP: Record<string, SupportedLanguage> = {
  ru: 'ru',
  en: 'en',
  ro: 'ro',
  'ru-RU': 'ru',
  'en-US': 'en',
  'en-GB': 'en',
  'ro-RO': 'ro',
};

/**
 * Detect language from Telegram language code
 * @param telegramLanguageCode - Language code from Telegram (e.g., 'ru', 'en-US', 'ro-RO')
 * @returns Supported language code, defaults to 'ru'
 */
export function detectLanguage(telegramLanguageCode?: string): SupportedLanguage {
  if (!telegramLanguageCode) {
    return 'ru'; // Default fallback
  }

  // Try exact match
  if (LANGUAGE_MAP[telegramLanguageCode]) {
    return LANGUAGE_MAP[telegramLanguageCode];
  }

  // Try language code only (e.g., 'ru' from 'ru-RU')
  const langCode = telegramLanguageCode.split('-')[0];
  if (LANGUAGE_MAP[langCode]) {
    return LANGUAGE_MAP[langCode];
  }

  return 'ru'; // Default fallback
}
