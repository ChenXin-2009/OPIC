import { getTranslations, getTranslationByKey } from '../index';

describe('locales index', () => {
  it('loads all locale modules without error', () => {
    expect(() => { require('../index'); }).not.toThrow();
  });

  describe('getTranslations', () => {
    it('returns translations for requested locale', () => {
      const t = getTranslations('zh-CN');
      expect(t.common.now).toBe('现在');
    });

    it('falls back to en-US for unsupported locale', () => {
      const t = getTranslations('ko-KR' as any);
      expect(t.common.now).toBe('Now');
    });

    it('uses browser locale when requested locale is unsupported', () => {
      const t = getTranslations('ko-KR' as any, 'zh-CN');
      expect(t.common.now).toBe('现在');
    });

    it('matches by language prefix when browser locale has variant', () => {
      const t = getTranslations('ko-KR' as any, 'zh-TW');
      expect(t.common.now).toBe('现在');
    });

    it('falls back to en-US when neither locale nor browser locale works', () => {
      const t = getTranslations('ko-KR' as any, 'xx-XX');
      expect(t.common.now).toBe('Now');
    });
  });

  describe('getTranslationByKey', () => {
    it('returns value for a valid key path', () => {
      const t = getTranslations('en-US');
      expect(getTranslationByKey(t, 'common.now')).toBe('Now');
    });

    it('returns deep nested value', () => {
      const t = getTranslations('zh-CN');
      expect(getTranslationByKey(t, 'common.loading')).toBe('加载中...');
    });

    it('returns key path when key is not found', () => {
      const t = getTranslations('en-US');
      expect(getTranslationByKey(t, 'nonexistent.key')).toBe('nonexistent.key');
    });

    it('returns key path when value is not a string', () => {
      const t = getTranslations('en-US');
      expect(getTranslationByKey(t, 'common')).toBe('common');
    });
  });
});
