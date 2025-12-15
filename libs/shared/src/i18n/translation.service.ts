import { readFileSync } from 'fs';
import { join } from 'path';
import { SupportedLanguage, translations } from './translations';
import { detectLanguage } from './language-detector';

type TranslationKey = string;
type TranslationParams = Record<string, string | number>;

/**
 * Translation service for multi-language support
 */
class TranslationService {
  private translations: Map<SupportedLanguage, Record<string, any>> = new Map();

  constructor() {
    // Load all translation files
    (['ru', 'en', 'ro'] as SupportedLanguage[]).forEach((lang) => {
      this.translations.set(lang, translations[lang]);
    });
  }

  /**
   * Translate a key with optional parameters
   * @param key - Translation key (e.g., 'bot.start.welcome')
   * @param params - Parameters for interpolation (e.g., { name: 'Venue' })
   * @param lang - Language code, defaults to 'ru'
   * @returns Translated string or key if not found
   */
  t(key: TranslationKey, params?: TranslationParams, lang?: SupportedLanguage): string {
    const language = lang || 'ru';
    const translations = this.translations.get(language) || this.translations.get('ru')!;

    // Navigate nested object (e.g., 'bot.start.welcome')
    const keys = key.split('.');
    let value: any = translations;

    for (const k of keys) {
      value = value?.[k];
      if (value === undefined) {
        // Fallback to Russian if key not found
        const ruTranslations = this.translations.get('ru')!;
        value = ruTranslations;
        for (const rk of keys) {
          value = value?.[rk];
          if (value === undefined) {
            return key; // Return key if not found even in fallback
          }
        }
        break;
      }
    }

    // Interpolate parameters
    if (typeof value === 'string' && params) {
      return value.replace(/\{(\w+)\}/g, (match, paramKey) => {
        return params[paramKey]?.toString() || match;
      });
    }

    return value || key;
  }

  /**
   * Get language from Telegram context
   * @param ctx - Telegram context or object with language_code
   * @returns Detected language
   */
  getLanguage(ctx: any): SupportedLanguage {
    return detectLanguage(ctx?.from?.language_code || ctx?.language_code);
  }
}

export const translationService = new TranslationService();
