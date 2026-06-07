import { translations } from '../translations';

describe('translations', () => {
  it('should have common translations in zh and en', () => {
    expect(translations.common.now.zh).toBe('现在');
    expect(translations.common.now.en).toBe('Now');
    expect(translations.common.loading.zh).toBe('加载中...');
    expect(translations.common.loading.en).toBe('Loading...');
  });

  it('should have settings translations', () => {
    expect(translations.settings.title.zh).toBe('设置');
    expect(translations.settings.title.en).toBe('SETTINGS');
  });

  it('should have timeControl translations', () => {
    expect(translations.timeControl.jumpToNow.zh).toBeDefined();
    expect(translations.timeControl.jumpToNow.en).toBe('Jump to now');
  });

  it('should have search translations', () => {
    expect(translations.search.placeholder.zh).toContain('搜索');
    expect(translations.search.placeholder.en).toContain('Search');
  });

  it('should have satellite translations', () => {
    expect(translations.satellite.title.zh).toContain('卫星');
    expect(translations.satellite.title.en).toContain('SATELLITE');
  });

  it('should have celestialBodies translations', () => {
    expect(translations.celestialBodies.sun.zh).toBe('太阳');
    expect(translations.celestialBodies.earth.zh).toBe('地球');
  });

  it('should have celestialTypes translations', () => {
    expect(translations.celestialTypes.star.zh).toBe('恒星');
    expect(translations.celestialTypes.galaxy.en).toBe('Galaxy');
  });

  it('should have galaxy translations', () => {
    expect(translations.galaxy.milkyWay.zh).toBe('银河系');
  });

  it('should have zoomLevels translations', () => {
    expect(translations.zoomLevels.solarSystem.zh).toBe('太阳系');
  });

  it('should have language translations', () => {
    expect(translations.language.switch.zh).toBe('切换语言');
    expect(translations.language.chinese.en).toBe('Chinese');
    expect(translations.language.english.zh).toBe('英文');
  });
});
