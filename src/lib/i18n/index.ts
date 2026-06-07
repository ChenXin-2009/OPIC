/**
 * i18n 工具函数
 */

import { Language, TranslationKey, translations } from './translations';

export type { Language, TranslationKey };
export { translations };

// Export formatter utilities
export {
  formatDate,
  formatRelativeTime,
  formatNumber,
  formatScientific,
  convertDistance,
  formatDistance,
  convertTemperature,
  convertTimeDuration,
  formatTimeDuration,
  type DistanceUnit,
  type TimeUnit,
  type TemperatureUnit,
} from './formatters';

// Export locale manager
export {
  LocaleManager,
  getLocaleManager,
  initializeLocaleManager,
  type SupportedLocale,
  type UnitSystem,
  type DateFormatStyle,
  type LocalePreferences,
} from './locale-manager';

/**
 * 获取翻译文本
 * @param key 翻译键，使用点号分隔，如 'common.now'
 * @param lang 语言
 * @returns 翻译后的文本
 */
export function t(key: string, lang: Language): string {
  const keys = key.split('.');
  let value: any = translations;
  
  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k];
    } else {
      console.warn(`Translation key not found: ${key}`);
      return key;
    }
  }
  
  if (value && typeof value === 'object' && lang in value) {
    return value[lang];
  }
  
  console.warn(`Translation not found for key: ${key}, lang: ${lang}`);
  return key;
}

/**
 * 获取嵌套翻译对象
 * @param namespace 命名空间，如 'common'
 * @param lang 语言
 * @returns 翻译对象
 */
export function getTranslations<T extends keyof TranslationKey>(
  namespace: T,
  lang: Language
): Record<string, string> {
  const ns = translations[namespace];
  const result: Record<string, string> = {};
  
  for (const key in ns) {
    const value = ns[key as keyof typeof ns];
    if (value && typeof value === 'object' && lang in value) {
      result[key] = (value as unknown as Record<string, string>)[lang];
    }
  }
  
  return result;
}