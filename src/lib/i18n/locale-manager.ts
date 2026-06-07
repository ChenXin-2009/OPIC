/**
 * Locale Manager
 * 
 * Manages user locale preferences including language, unit systems, and formatting options.
 * Provides browser locale detection, localStorage persistence, and cross-tab synchronization.
 * 
 * **Features:**
 * - Browser locale detection from navigator.language
 * - localStorage persistence for user preferences
 * - Cross-tab synchronization via storage event
 * - 300ms transition animation for language changes
 * - Automatic unit system detection (metric/imperial)
 * 
 * **Usage:**
 * ```typescript
 * import { getLocaleManager } from '@/lib/i18n/locale-manager';
 * 
 * const localeManager = getLocaleManager();
 * 
 * // Get current preferences
 * const prefs = localeManager.getPreferences();
 * 
 * // Change language
 * localeManager.setLanguage('zh-CN');
 * 
 * // Change unit system
 * localeManager.setUnitSystem('imperial');
 * ```
 * 
 * @see Requirements 5.9, 5.10, 5.11, 5.12, 5.13, 5.14, 5.18
 */

import type { DistanceUnit, TemperatureUnit } from './formatters';

export type { DistanceUnit, TemperatureUnit };

/**
 * Supported locale identifiers
 */
export type SupportedLocale = 'en-US' | 'zh-CN' | 'es-ES' | 'fr-FR' | 'de-DE' | 'ja-JP';

/**
 * Unit system types
 */
export type UnitSystem = 'metric' | 'imperial';

/**
 * Date format styles
 */
export type DateFormatStyle = 'short' | 'medium' | 'long';

/**
 * Locale preferences interface
 */
export interface LocalePreferences {
  language: SupportedLocale;
  unitSystem: UnitSystem;
  distanceUnit: DistanceUnit;
  temperatureUnit: TemperatureUnit;
  dateFormat: DateFormatStyle;
}

/**
 * Default locale preferences (en-US, metric)
 */
const DEFAULT_PREFERENCES: LocalePreferences = {
  language: 'en-US',
  unitSystem: 'metric',
  distanceUnit: 'km',
  temperatureUnit: 'celsius',
  dateFormat: 'medium',
};

/**
 * localStorage key for preferences
 */
const STORAGE_KEY = 'opic_locale_preferences';

/**
 * Language change animation duration (ms)
 */
const LANGUAGE_CHANGE_ANIMATION_DURATION = 300;

/**
 * Locale Manager Class
 * 
 * Manages locale preferences with persistence and synchronization.
 */
export class LocaleManager {
  private preferences: LocalePreferences;
  private listeners: Set<(prefs: LocalePreferences) => void> = new Set();
  private storageListener: ((event: StorageEvent) => void) | null = null;

  constructor() {
    // Load preferences from localStorage or detect from browser
    this.preferences = this.loadPreferences() || this.detectPreferences();
    
    // Setup cross-tab synchronization
    this.setupStorageListener();
  }

  /**
   * Detect preferences from browser settings
   * 
   * Uses navigator.language for locale detection and derives unit system
   * from country code (US uses imperial, others use metric).
   */
  private detectPreferences(): LocalePreferences {
    if (typeof navigator === 'undefined') {
      return DEFAULT_PREFERENCES;
    }

    const browserLocale = navigator.language;
    const language = this.mapToSupportedLocale(browserLocale);
    const isUS = browserLocale.startsWith('en-US');

    return {
      language,
      unitSystem: isUS ? 'imperial' : 'metric',
      distanceUnit: 'km', // Default to km for astronomical distances
      temperatureUnit: isUS ? 'fahrenheit' : 'celsius',
      dateFormat: 'medium',
    };
  }

  /**
   * Map browser locale to supported locale
   * 
   * Implements fallback strategy:
   * 1. Exact match (e.g., 'zh-CN' → 'zh-CN')
   * 2. Language match (e.g., 'zh-TW' → 'zh-CN')
   * 3. Default to 'en-US'
   */
  private mapToSupportedLocale(browserLocale: string): SupportedLocale {
    const supported: SupportedLocale[] = [
      'en-US',
      'zh-CN',
      'es-ES',
      'fr-FR',
      'de-DE',
      'ja-JP',
    ];

    // Exact match
    if (supported.includes(browserLocale as SupportedLocale)) {
      return browserLocale as SupportedLocale;
    }

    // Language prefix match (e.g., 'zh-TW' → 'zh-CN')
    const languagePrefix = browserLocale.split('-')[0];
    const languageMatch = supported.find((locale) =>
      locale.startsWith(languagePrefix)
    );

    if (languageMatch) {
      return languageMatch;
    }

    // Default fallback
    return 'en-US';
  }

  /**
   * Load preferences from localStorage
   */
  private loadPreferences(): LocalePreferences | null {
    if (typeof window === 'undefined') {
      return null;
    }

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        return null;
      }

      const parsed = JSON.parse(stored) as LocalePreferences;
      
      // Validate stored preferences
      if (this.isValidPreferences(parsed)) {
        return parsed;
      }

      console.warn('[LocaleManager] Invalid stored preferences, using defaults');
      return null;
    } catch (error) {
      console.error('[LocaleManager] Failed to load preferences:', error);
      return null;
    }
  }

  /**
   * Validate preferences object
   */
  private isValidPreferences(prefs: any): prefs is LocalePreferences {
    return (
      prefs &&
      typeof prefs === 'object' &&
      'language' in prefs &&
      'unitSystem' in prefs &&
      'distanceUnit' in prefs &&
      'temperatureUnit' in prefs &&
      'dateFormat' in prefs
    );
  }

  /**
   * Save preferences to localStorage
   */
  private savePreferences(): void {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.preferences));
    } catch (error) {
      console.error('[LocaleManager] Failed to save preferences:', error);
    }
  }

  /**
   * Setup cross-tab synchronization via storage event
   */
  private setupStorageListener(): void {
    if (typeof window === 'undefined') {
      return;
    }

    this.storageListener = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY && event.newValue) {
        try {
          const newPrefs = JSON.parse(event.newValue) as LocalePreferences;
          if (this.isValidPreferences(newPrefs)) {
            this.preferences = newPrefs;
            this.notifyListeners();
          }
        } catch (error) {
          console.error('[LocaleManager] Failed to parse storage event:', error);
        }
      }
    };

    window.addEventListener('storage', this.storageListener);
  }

  /**
   * Cleanup storage listener
   */
  public destroy(): void {
    if (typeof window !== 'undefined' && this.storageListener) {
      window.removeEventListener('storage', this.storageListener);
    }
  }

  /**
   * Notify all listeners of preference changes
   */
  private notifyListeners(): void {
    this.listeners.forEach((listener) => {
      try {
        listener(this.preferences);
      } catch (error) {
        console.error('[LocaleManager] Listener error:', error);
      }
    });
  }

  /**
   * Get current preferences
   */
  public getPreferences(): LocalePreferences {
    return { ...this.preferences };
  }

  /**
   * Set language with transition animation
   * 
   * Triggers 300ms fade animation for smooth language change.
   */
  public setLanguage(language: SupportedLocale): void {
    if (this.preferences.language === language) {
      return;
    }

    // Apply fade-out animation
    if (typeof document !== 'undefined') {
      document.documentElement.style.transition = `opacity ${LANGUAGE_CHANGE_ANIMATION_DURATION}ms ease-in-out`;
      document.documentElement.style.opacity = '0.5';

      setTimeout(() => {
        // Update language
        this.preferences.language = language;
        this.savePreferences();
        this.notifyListeners();

        // Fade back in
        document.documentElement.style.opacity = '1';
        
        // Remove transition after animation
        setTimeout(() => {
          document.documentElement.style.transition = '';
        }, LANGUAGE_CHANGE_ANIMATION_DURATION);
      }, LANGUAGE_CHANGE_ANIMATION_DURATION / 2);
    } else {
      // Server-side or no animation
      this.preferences.language = language;
      this.savePreferences();
      this.notifyListeners();
    }
  }

  /**
   * Set unit system (metric/imperial)
   * 
   * Automatically updates distance and temperature units.
   */
  public setUnitSystem(system: UnitSystem): void {
    if (this.preferences.unitSystem === system) {
      return;
    }

    this.preferences.unitSystem = system;

    // Update related units
    if (system === 'imperial') {
      this.preferences.temperatureUnit = 'fahrenheit';
      // Keep distanceUnit as 'km' for astronomical data
    } else {
      this.preferences.temperatureUnit = 'celsius';
    }

    this.savePreferences();
    this.notifyListeners();
  }

  /**
   * Set distance unit preference
   */
  public setDistanceUnit(unit: DistanceUnit): void {
    if (this.preferences.distanceUnit === unit) {
      return;
    }

    this.preferences.distanceUnit = unit;
    this.savePreferences();
    this.notifyListeners();
  }

  /**
   * Set temperature unit preference
   */
  public setTemperatureUnit(unit: TemperatureUnit): void {
    if (this.preferences.temperatureUnit === unit) {
      return;
    }

    this.preferences.temperatureUnit = unit;
    this.savePreferences();
    this.notifyListeners();
  }

  /**
   * Set date format style
   */
  public setDateFormat(format: DateFormatStyle): void {
    if (this.preferences.dateFormat === format) {
      return;
    }

    this.preferences.dateFormat = format;
    this.savePreferences();
    this.notifyListeners();
  }

  /**
   * Subscribe to preference changes
   * 
   * Returns unsubscribe function.
   */
  public subscribe(listener: (prefs: LocalePreferences) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Reset to default preferences
   */
  public reset(): void {
    this.preferences = { ...DEFAULT_PREFERENCES };
    this.savePreferences();
    this.notifyListeners();
  }
}

/**
 * Singleton instance
 */
let localeManagerInstance: LocaleManager | null = null;

/**
 * Get or create LocaleManager singleton instance
 */
export function getLocaleManager(): LocaleManager {
  if (!localeManagerInstance) {
    localeManagerInstance = new LocaleManager();
  }
  return localeManagerInstance;
}

/**
 * Initialize locale manager and return preferences
 * 
 * Convenience function for application initialization.
 */
export function initializeLocaleManager(): LocalePreferences {
  const manager = getLocaleManager();
  return manager.getPreferences();
}
