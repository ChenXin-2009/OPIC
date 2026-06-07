/**
 * Locale translations
 * 
 * Provides translation files for all supported locales.
 * 
 * Supported locales:
 * - en-US: English (United States)
 * - zh-CN: Chinese (Simplified, China)
 * - es-ES: Spanish (Spain)
 * - fr-FR: French (France)
 * - de-DE: German (Germany)
 * - ja-JP: Japanese (Japan)
 * 
 * @see Requirements 5.8, 5.15, 5.16, 5.17
 */

import enUS from './en-US.json';
import zhCN from './zh-CN.json';
import esES from './es-ES.json';
import frFR from './fr-FR.json';
import deDE from './de-DE.json';
import jaJP from './ja-JP.json';

import type { SupportedLocale } from '../locale-manager';

/**
 * Translation type (inferred from en-US structure)
 */
export type TranslationStructure = typeof enUS;

/**
 * Locale translations map
 */
export const localeTranslations: Record<SupportedLocale, TranslationStructure> = {
  'en-US': enUS,
  'zh-CN': zhCN,
  'es-ES': esES,
  'fr-FR': frFR,
  'de-DE': deDE,
  'ja-JP': jaJP,
};

/**
 * Get translations for a specific locale
 * 
 * Implements fallback strategy:
 * 1. Requested locale
 * 2. Browser locale (if available)
 * 3. en-US (default)
 * 
 * @param locale - The requested locale
 * @param browserLocale - The browser's locale (optional)
 * @returns Translation object
 */
export function getTranslations(
  locale: SupportedLocale,
  browserLocale?: string
): TranslationStructure {
  // Try requested locale
  if (locale in localeTranslations) {
    return localeTranslations[locale];
  }

  // Try browser locale if provided
  if (browserLocale) {
    const normalizedBrowser = browserLocale as SupportedLocale;
    if (normalizedBrowser in localeTranslations) {
      return localeTranslations[normalizedBrowser];
    }

    // Try language prefix match (e.g., 'zh-TW' → 'zh-CN')
    const languagePrefix = browserLocale.split('-')[0];
    const match = Object.keys(localeTranslations).find((key) =>
      key.startsWith(languagePrefix)
    ) as SupportedLocale | undefined;

    if (match) {
      return localeTranslations[match];
    }
  }

  // Fallback to en-US
  return localeTranslations['en-US'];
}

/**
 * Get a nested translation value by key path
 * 
 * @param translations - The translations object
 * @param keyPath - The key path (e.g., 'common.now')
 * @returns The translation string or the key path if not found
 * 
 * @example
 * getTranslationByKey(enUS, 'common.now') // "Now"
 * getTranslationByKey(zhCN, 'settings.title') // "设置"
 */
export function getTranslationByKey(
  translations: TranslationStructure,
  keyPath: string
): string {
  const keys = keyPath.split('.');
  let value: any = translations;

  for (const key of keys) {
    if (value && typeof value === 'object' && key in value) {
      value = value[key];
    } else {
      console.warn(`[i18n] Translation key not found: ${keyPath}`);
      return keyPath;
    }
  }

  if (typeof value === 'string') {
    return value;
  }

  console.warn(`[i18n] Translation value is not a string: ${keyPath}`);
  return keyPath;
}

/**
 * Type-safe translation key builder
 * 
 * Helper type to ensure translation keys are valid.
 */
export type TranslationKey = 
  | `common.${keyof typeof enUS.common}`
  | `settings.${keyof typeof enUS.settings}`
  | `celestialBodies.${keyof typeof enUS.celestialBodies}`
  | `celestialTypes.${keyof typeof enUS.celestialTypes}`
  | `errors.${keyof typeof enUS.errors}`
  | `loading.${keyof typeof enUS.loading}`;
