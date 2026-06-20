import { LocaleManager } from '../locale-manager';

describe('LocaleManager', () => {
  let manager: LocaleManager;

  beforeEach(() => {
    localStorage.clear();
    jest.useFakeTimers();
    manager = new LocaleManager();
  });

  afterEach(() => {
    manager.destroy();
    jest.useRealTimers();
  });

  function toggleUnitSystem(mgr: LocaleManager): 'metric' | 'imperial' {
    const current = mgr.getPreferences().unitSystem;
    return current === 'imperial' ? 'metric' : 'imperial';
  }

  describe('getPreferences', () => {
    it('should return a preferences object', () => {
      const prefs = manager.getPreferences();
      expect(prefs).toHaveProperty('language');
      expect(prefs).toHaveProperty('unitSystem');
      expect(prefs).toHaveProperty('distanceUnit');
      expect(prefs).toHaveProperty('temperatureUnit');
      expect(prefs).toHaveProperty('dateFormat');
    });

    it('should return a copy (not reference)', () => {
      const prefs1 = manager.getPreferences();
      const prefs2 = manager.getPreferences();
      expect(prefs1).toEqual(prefs2);
      expect(prefs1).not.toBe(prefs2);
    });

    it('should have valid default language', () => {
      const prefs = manager.getPreferences();
      expect(['en-US', 'zh-CN', 'es-ES', 'fr-FR', 'de-DE', 'ja-JP']).toContain(prefs.language);
    });

    it('should have valid unit system', () => {
      const prefs = manager.getPreferences();
      expect(['metric', 'imperial']).toContain(prefs.unitSystem);
    });
  });

  describe('setLanguage', () => {
    it('should update language after animation delay', () => {
      const current = manager.getPreferences().language;
      const next = current === 'zh-CN' ? 'en-US' : 'zh-CN';
      manager.setLanguage(next);
      jest.advanceTimersByTime(200);
      expect(manager.getPreferences().language).toBe(next);
    });

    it('should not update language immediately', () => {
      const current = manager.getPreferences().language;
      const next = current === 'zh-CN' ? 'en-US' : 'zh-CN';
      manager.setLanguage(next);
      expect(manager.getPreferences().language).not.toBe(next);
    });

    it('should notify listeners after animation delay', () => {
      const listener = jest.fn();
      manager.subscribe(listener);
      const current = manager.getPreferences().language;
      const next = current === 'zh-CN' ? 'en-US' : 'zh-CN';
      manager.setLanguage(next);
      jest.advanceTimersByTime(200);
      expect(listener).toHaveBeenCalled();
    });

    it('should not notify listeners when setting same language', () => {
      const prefs = manager.getPreferences();
      const listener = jest.fn();
      manager.subscribe(listener);
      manager.setLanguage(prefs.language);
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('setUnitSystem', () => {
    it('should update unit system', () => {
      const next = toggleUnitSystem(manager);
      manager.setUnitSystem(next);
      expect(manager.getPreferences().unitSystem).toBe(next);
    });

    it('should set fahrenheit when switching to imperial', () => {
      const next = toggleUnitSystem(manager);
      manager.setUnitSystem(next);
      if (next === 'imperial') {
        expect(manager.getPreferences().temperatureUnit).toBe('fahrenheit');
      } else {
        expect(manager.getPreferences().temperatureUnit).toBe('celsius');
      }
    });

    it('should set celsius when switching to metric', () => {
      const current = manager.getPreferences().unitSystem;
      if (current === 'metric') {
        manager.setUnitSystem('imperial');
        manager.setUnitSystem('metric');
      } else {
        manager.setUnitSystem('metric');
      }
      expect(manager.getPreferences().temperatureUnit).toBe('celsius');
    });

    it('should not notify listeners when setting same unit system', () => {
      const prefs = manager.getPreferences();
      const listener = jest.fn();
      manager.subscribe(listener);
      manager.setUnitSystem(prefs.unitSystem);
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('setDistanceUnit', () => {
    it('should update distance unit', () => {
      manager.setDistanceUnit('au');
      expect(manager.getPreferences().distanceUnit).toBe('au');
    });

    it('should not notify when setting same unit', () => {
      const prefs = manager.getPreferences();
      const listener = jest.fn();
      manager.subscribe(listener);
      manager.setDistanceUnit(prefs.distanceUnit);
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('setTemperatureUnit', () => {
    it('should update temperature unit', () => {
      const current = manager.getPreferences().temperatureUnit;
      const next = current === 'celsius' ? 'fahrenheit' : 'celsius';
      manager.setTemperatureUnit(next);
      expect(manager.getPreferences().temperatureUnit).toBe(next);
    });

    it('should not notify when setting same unit', () => {
      const prefs = manager.getPreferences();
      const listener = jest.fn();
      manager.subscribe(listener);
      manager.setTemperatureUnit(prefs.temperatureUnit);
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('setDateFormat', () => {
    it('should update date format', () => {
      const current = manager.getPreferences().dateFormat;
      const next = current === 'long' ? 'short' : 'long';
      manager.setDateFormat(next);
      expect(manager.getPreferences().dateFormat).toBe(next);
    });

    it('should not notify when setting same format', () => {
      const prefs = manager.getPreferences();
      const listener = jest.fn();
      manager.subscribe(listener);
      manager.setDateFormat(prefs.dateFormat);
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('subscribe', () => {
    it('should call listener on unit system change', () => {
      const listener = jest.fn();
      manager.subscribe(listener);
      const next = toggleUnitSystem(manager);
      manager.setUnitSystem(next);
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('should call multiple listeners', () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();
      manager.subscribe(listener1);
      manager.subscribe(listener2);
      const next = toggleUnitSystem(manager);
      manager.setUnitSystem(next);
      expect(listener1).toHaveBeenCalledTimes(1);
      expect(listener2).toHaveBeenCalledTimes(1);
    });

    it('should return unsubscribe function', () => {
      const listener = jest.fn();
      const unsubscribe = manager.subscribe(listener);
      unsubscribe();
      const next = toggleUnitSystem(manager);
      manager.setUnitSystem(next);
      expect(listener).not.toHaveBeenCalled();
    });

    it('should support multiple unsubscribe calls safely', () => {
      const listener = jest.fn();
      const unsubscribe = manager.subscribe(listener);
      unsubscribe();
      unsubscribe();
      const next = toggleUnitSystem(manager);
      manager.setUnitSystem(next);
      expect(listener).not.toHaveBeenCalled();
    });

    it('should pass current preferences to listener', () => {
      let receivedPrefs: any;
      manager.subscribe((prefs) => { receivedPrefs = prefs; });
      const next = toggleUnitSystem(manager);
      manager.setUnitSystem(next);
      expect(receivedPrefs.unitSystem).toBe(next);
    });
  });

  describe('reset', () => {
    it('should reset to default preferences', () => {
      const next = toggleUnitSystem(manager);
      manager.setUnitSystem(next);
      manager.setDateFormat('long');
      manager.reset();
      const prefs = manager.getPreferences();
      expect(prefs.language).toBe('en-US');
      expect(prefs.unitSystem).toBe('metric');
      expect(prefs.temperatureUnit).toBe('celsius');
      expect(prefs.distanceUnit).toBe('km');
      expect(prefs.dateFormat).toBe('medium');
    });

    it('should notify listeners on reset', () => {
      const listener = jest.fn();
      manager.subscribe(listener);
      manager.reset();
      expect(listener).toHaveBeenCalled();
    });
  });

  describe('persistence', () => {
    it('should persist preferences to localStorage', () => {
      const next = toggleUnitSystem(manager);
      manager.setUnitSystem(next);
      const stored = localStorage.getItem('opic_locale_preferences');
      expect(stored).toBeTruthy();
      const parsed = JSON.parse(stored!);
      expect(parsed.unitSystem).toBe(next);
    });

    it('should restore preferences from localStorage', () => {
      const next = toggleUnitSystem(manager);
      manager.setUnitSystem(next);
      manager.setDateFormat('long');

      const newManager = new LocaleManager();
      const prefs = newManager.getPreferences();
      expect(prefs.unitSystem).toBe(next);
      expect(prefs.dateFormat).toBe('long');
      newManager.destroy();
    });
  });

  describe('cross-tab sync via storage event', () => {
    it('should update preferences when storage event fires', () => {
      const newPrefs = {
        language: 'zh-CN',
        unitSystem: 'metric',
        distanceUnit: 'km',
        temperatureUnit: 'celsius',
        dateFormat: 'medium',
      };
      const event = new StorageEvent('storage', {
        key: 'opic_locale_preferences',
        newValue: JSON.stringify(newPrefs),
      });
      window.dispatchEvent(event);

      expect(manager.getPreferences().language).toBe('zh-CN');
    });
  });

  describe('destroy', () => {
    it('should remove storage event listener', () => {
      const removeSpy = jest.spyOn(window, 'removeEventListener');
      manager.destroy();
      expect(removeSpy).toHaveBeenCalledWith('storage', expect.any(Function));
      removeSpy.mockRestore();
    });

    it('should be safe to call destroy multiple times', () => {
      manager.destroy();
      manager.destroy();
    });
  });
});
