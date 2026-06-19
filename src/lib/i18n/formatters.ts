/**
 * Internationalization formatter utilities
 * Provides locale-aware formatting for dates, numbers, and units
 */

// ============================================================================
// Type Definitions
// ============================================================================

/** 距离单位：千米、天文单位、光年 */
export type DistanceUnit = 'km' | 'au' | 'ly';
/** 时间单位：秒、分、时、天 */
export type TimeUnit = 'seconds' | 'minutes' | 'hours' | 'days';
/** 温度单位：摄氏度、华氏度 */
export type TemperatureUnit = 'celsius' | 'fahrenheit';

// ============================================================================
// Date and Time Formatting
// ============================================================================

/**
 * Format a date according to locale using Intl.DateTimeFormat
 * **Validates: Requirements 5.1**
 * 
 * @param date - The date to format
 * @param locale - The locale string (e.g., 'en-US', 'zh-CN')
 * @param options - Optional Intl.DateTimeFormat options
 * @returns Formatted date string
 * 
 * @example
 * formatDate(new Date(), 'en-US') // "12/31/2024"
 * formatDate(new Date(), 'zh-CN', { dateStyle: 'long' }) // "2024年12月31日"
 */
export function formatDate(
  date: Date,
  locale: string,
  options?: Intl.DateTimeFormatOptions
): string {
  return new Intl.DateTimeFormat(locale, options).format(date);
}

/**
 * Format relative time using Intl.RelativeTimeFormat
 * 
 * @param value - The relative time value
 * @param unit - The time unit
 * @param locale - The locale string
 * @returns Formatted relative time string
 * 
 * @example
 * formatRelativeTime(-1, 'day', 'en-US') // "1 day ago"
 * formatRelativeTime(2, 'hour', 'zh-CN') // "2小时后"
 */
export function formatRelativeTime(
  value: number,
  unit: Intl.RelativeTimeFormatUnit,
  locale: string
): string {
  return new Intl.RelativeTimeFormat(locale).format(value, unit);
}

// ============================================================================
// Number Formatting
// ============================================================================

/**
 * Format a number according to locale using Intl.NumberFormat
 * **Validates: Requirements 5.2, 5.4**
 * 
 * @param value - The number to format
 * @param locale - The locale string
 * @param options - Optional Intl.NumberFormat options
 * @returns Formatted number string
 * 
 * @example
 * formatNumber(1234567.89, 'en-US') // "1,234,567.89"
 * formatNumber(1234567.89, 'de-DE') // "1.234.567,89"
 */
export function formatNumber(
  value: number,
  locale: string,
  options?: Intl.NumberFormatOptions
): string {
  return new Intl.NumberFormat(locale, options).format(value);
}

/**
 * Format a number in scientific notation with maximum 6 decimal places
 * **Validates: Requirements 5.3**
 * 
 * @param value - The number to format
 * @param locale - The locale string
 * @param decimals - Maximum number of decimal places (default: 6)
 * @returns Formatted scientific notation string
 * 
 * @example
 * formatScientific(1234567890, 'en-US') // "1.234568e+9"
 * formatScientific(0.00000123456789, 'en-US') // "1.234568e-6"
 */
export function formatScientific(
  value: number,
  locale: string,
  decimals: number = 6
): string {
  return new Intl.NumberFormat(locale, {
    notation: 'scientific',
    maximumFractionDigits: decimals
  }).format(value);
}

// ============================================================================
// Distance Conversion and Formatting
// ============================================================================

/**
 * Conversion factors to kilometers
 */
const DISTANCE_TO_KM: Record<DistanceUnit, number> = {
  km: 1,
  au: 149597870.7,      // 1 AU = 149,597,870.7 km
  ly: 9460730472580.8   // 1 light-year = 9,460,730,472,580.8 km
};

/**
 * Convert distance between different units
 * **Validates: Requirements 5.5**
 * 
 * @param value - The distance value to convert
 * @param from - The source unit
 * @param to - The target unit
 * @returns Converted distance value
 * 
 * @example
 * convertDistance(1, 'au', 'km') // 149597870.7
 * convertDistance(1, 'ly', 'au') // 63241.077
 */
export function convertDistance(
  value: number,
  from: DistanceUnit,
  to: DistanceUnit
): number {
  if (from === to) return value;
  
  // Convert to km first, then to target unit
  const valueInKm = value * DISTANCE_TO_KM[from];
  return valueInKm / DISTANCE_TO_KM[to];
}

/**
 * Format distance with automatic unit selection based on magnitude
 * **Validates: Requirements 5.5**
 * 
 * @param valueKm - The distance value in kilometers
 * @param locale - The locale string
 * @param preferredUnit - The preferred unit system (optional)
 * @returns Formatted distance string with appropriate unit
 * 
 * @example
 * formatDistance(384400, 'en-US') // "384,400 km" (Earth-Moon distance)
 * formatDistance(149597870.7, 'en-US') // "1 au" (Earth-Sun distance)
 * formatDistance(9460730472580.8, 'en-US') // "1 ly"
 */
export function formatDistance(
  valueKm: number,
  locale: string,
  preferredUnit?: DistanceUnit
): string {
  let unit: DistanceUnit;
  let value: number;
  
  // Auto-select appropriate unit based on magnitude
  if (valueKm < 1e6) {
    // Less than 1 million km -> use km
    unit = 'km';
    value = valueKm;
  } else if (valueKm < 1e12) {
    // Between 1M km and 1 trillion km -> use AU
    unit = 'au';
    value = convertDistance(valueKm, 'km', 'au');
  } else {
    // Greater than 1 trillion km -> use light-years
    unit = 'ly';
    value = convertDistance(valueKm, 'km', 'ly');
  }
  
  // Override with preferred unit if specified
  if (preferredUnit) {
    unit = preferredUnit;
    value = convertDistance(valueKm, 'km', preferredUnit);
  }
  
  return `${formatNumber(value, locale)} ${unit}`;
}

// ============================================================================
// Temperature Conversion and Formatting
// ============================================================================

/**
 * Convert temperature between Celsius and Fahrenheit
 * **Validates: Requirements 5.7**
 * 
 * @param value - The temperature value to convert
 * @param from - The source unit
 * @param to - The target unit
 * @returns Converted temperature value
 * 
 * @example
 * convertTemperature(0, 'celsius', 'fahrenheit') // 32
 * convertTemperature(32, 'fahrenheit', 'celsius') // 0
 * convertTemperature(100, 'celsius', 'fahrenheit') // 212
 */
export function convertTemperature(
  value: number,
  from: TemperatureUnit,
  to: TemperatureUnit
): number {
  if (from === to) return value;
  
  if (from === 'celsius' && to === 'fahrenheit') {
    return (value * 9 / 5) + 32;
  }
  
  if (from === 'fahrenheit' && to === 'celsius') {
    return (value - 32) * 5 / 9;
  }
  
  return value;
}

// ============================================================================
// Time Duration Conversion and Formatting
// ============================================================================

/**
 * Conversion factors to seconds
 */
const TIME_TO_SECONDS: Record<TimeUnit, number> = {
  seconds: 1,
  minutes: 60,
  hours: 3600,
  days: 86400
};

/**
 * Convert time duration between different units
 * **Validates: Requirements 5.6**
 * 
 * @param value - The time duration value to convert
 * @param from - The source unit
 * @param to - The target unit
 * @returns Converted time duration value
 * 
 * @example
 * convertTimeDuration(60, 'seconds', 'minutes') // 1
 * convertTimeDuration(24, 'hours', 'days') // 1
 * convertTimeDuration(1, 'days', 'seconds') // 86400
 */
export function convertTimeDuration(
  value: number,
  from: TimeUnit,
  to: TimeUnit
): number {
  if (from === to) return value;
  
  // Convert to seconds first, then to target unit
  const valueInSeconds = value * TIME_TO_SECONDS[from];
  return valueInSeconds / TIME_TO_SECONDS[to];
}

/**
 * Format time duration with automatic unit selection based on magnitude
 * **Validates: Requirements 5.6**
 * 
 * @param valueSeconds - The time duration in seconds
 * @param locale - The locale string
 * @returns Formatted time duration string with appropriate unit
 * 
 * @example
 * formatTimeDuration(30, 'en-US') // "30 seconds"
 * formatTimeDuration(3600, 'en-US') // "1 hour"
 * formatTimeDuration(86400, 'en-US') // "1 day"
 */
export function formatTimeDuration(
  valueSeconds: number,
  locale: string
): string {
  let unit: TimeUnit;
  let value: number;
  
  // Auto-select appropriate unit based on magnitude
  if (valueSeconds < 60) {
    // Less than 60 seconds -> use seconds
    unit = 'seconds';
    value = valueSeconds;
  } else if (valueSeconds < 3600) {
    // Less than 1 hour -> use minutes
    unit = 'minutes';
    value = convertTimeDuration(valueSeconds, 'seconds', 'minutes');
  } else if (valueSeconds < 86400) {
    // Less than 1 day -> use hours
    unit = 'hours';
    value = convertTimeDuration(valueSeconds, 'seconds', 'hours');
  } else {
    // 1 day or more -> use days
    unit = 'days';
    value = convertTimeDuration(valueSeconds, 'seconds', 'days');
  }
  
  return `${formatNumber(value, locale)} ${unit}`;
}
