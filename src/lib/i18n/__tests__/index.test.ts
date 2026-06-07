import { t, getTranslations } from '../index';

describe('t', () => {
  beforeEach(() => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should return Chinese translation for common.now', () => {
    expect(t('common.now', 'zh')).toBe('现在');
  });

  it('should return English translation for common.now', () => {
    expect(t('common.now', 'en')).toBe('Now');
  });

  it('should return English translation for timeControl.future', () => {
    expect(t('timeControl.future', 'en')).toBe('');
  });

  it('should return Chinese translation for celestialBodies.earth', () => {
    expect(t('celestialBodies.earth', 'zh')).toBe('地球');
  });

  it('should return English translation for celestialBodies.earth', () => {
    expect(t('celestialBodies.earth', 'en')).toBe('Earth');
  });

  it('should warn and return key for missing translation key', () => {
    const result = t('nonexistent.key', 'zh');
    expect(result).toBe('nonexistent.key');
    expect(console.warn).toHaveBeenCalled();
  });

  it('should warn and return key for missing language in existing key', () => {
    const result = t('common.now', 'fr' as any);
    expect(result).toBe('common.now');
    expect(console.warn).toHaveBeenCalled();
  });

  it('should return all known common keys', () => {
    const keys = ['common.now', 'common.loading', 'common.error', 'common.retry', 'common.search'];
    keys.forEach(key => {
      const zh = t(key, 'zh');
      const en = t(key, 'en');
      expect(zh).toBeTruthy();
      expect(en).toBeTruthy();
    });
  });
});

describe('getTranslations', () => {
  it('should return Chinese common translations as key-value pairs', () => {
    const result = getTranslations('common', 'zh');
    expect(result.now).toBe('现在');
    expect(result.loading).toBe('加载中...');
    expect(result.error).toBe('错误');
  });

  it('should return English common translations as key-value pairs', () => {
    const result = getTranslations('common', 'en');
    expect(result.now).toBe('Now');
    expect(result.loading).toBe('Loading...');
  });

  it('should return Chinese celestial body translations', () => {
    const result = getTranslations('celestialBodies', 'zh');
    expect(result.sun).toBe('太阳');
    expect(result.earth).toBe('地球');
    expect(result.mars).toBe('火星');
  });

  it('should return English celestial body translations', () => {
    const result = getTranslations('celestialBodies', 'en');
    expect(result.sun).toBe('Sun');
    expect(result.earth).toBe('Earth');
  });

  it('should return all satellite translations in Chinese', () => {
    const result = getTranslations('satellite', 'zh');
    expect(result.title).toBe('地球卫星');
    expect(result.info).toBe('卫星信息');
    expect(result.altitude).toBe('高度');
  });

  it('should return all satellite translations in English', () => {
    const result = getTranslations('satellite', 'en');
    expect(result.title).toBe('SATELLITES');
    expect(result.info).toBe('SATELLITE INFO');
  });
});
