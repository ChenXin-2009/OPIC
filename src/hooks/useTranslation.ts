/**
 * 多语言翻译 Hook
 * 提供便捷的翻译功能
 */

'use client';

import { useCallback } from 'react';
import { useSolarSystemStore } from '@/lib/state';
import { Language, TranslationKey, translations } from '@/lib/i18n/translations';

/**
 * 获取嵌套值的辅助函数
 */
function getNestedValue(obj: any, path: string[]): any {
  let current = obj;
  for (const key of path) {
    if (current && typeof current === 'object' && key in current) {
      current = current[key];
    } else {
      return undefined;
    }
  }
  return current;
}

/**
 * 多语言翻译 Hook
 * @returns 翻译函数和当前语言
 */
export function useTranslation() {
  const lang = useSolarSystemStore((state) => state.lang);
  
  /**
   * 翻译函数
   * @param key 翻译键，使用点号分隔，如 'common.now'
   * @returns 翻译后的文本
   */
  const t = useCallback((key: string): string => {
    const keys = key.split('.');
    const value = getNestedValue(translations, keys);
    
    if (value && typeof value === 'object' && lang in value) {
      return value[lang];
    }
    
    // 回退到英文
    if (value && typeof value === 'object' && 'en' in value) {
      return value.en;
    }
    
    console.warn(`Translation not found: ${key}`);
    return key;
  }, [lang]);
  
  /**
   * 获取整个命名空间的翻译
   */
  const getNamespace = useCallback(<T extends keyof TranslationKey>(
    namespace: T
  ): Record<string, string> => {
    const ns = translations[namespace];
    const result: Record<string, string> = {};
    
    for (const key in ns) {
      const value = ns[key as keyof typeof ns];
      if (value && typeof value === 'object' && lang in value) {
        result[key] = (value as Record<string, string>)[lang];
      }
    }
    
    return result;
  }, [lang]);
  
  return {
    t,
    lang,
    getNamespace,
    // 便捷方法
    isZh: lang === 'zh',
    isEn: lang === 'en',
  };
}

/**
 * 格式化时间差
 * @param days 天数
 * @param lang 语言
 */
export function formatTimeDiff(days: number, lang: Language): string {
  const absDays = Math.abs(days);
  
  if (absDays < 1) {
    const hours = Math.floor(absDays * 24);
    const minutes = Math.floor((absDays * 24 - hours) * 60);
    if (hours > 0) {
      return lang === 'zh' ? `${hours}小时${minutes}分钟` : `${hours}h ${minutes}m`;
    }
    return lang === 'zh' ? `${minutes}分钟` : `${minutes}m`;
  } else if (absDays < 365) {
    const daysInt = Math.floor(absDays);
    return lang === 'zh' ? `${daysInt}天` : `${daysInt} days`;
  } else {
    const years = Math.floor(absDays / 365.25);
    const remainingDays = Math.floor(absDays % 365.25);
    if (remainingDays > 0) {
      return lang === 'zh' ? `${years}年${remainingDays}天` : `${years}y ${remainingDays}d`;
    }
    return lang === 'zh' ? `${years}年` : `${years} years`;
  }
}

export type { Language, TranslationKey };