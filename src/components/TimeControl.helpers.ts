/**
 * Helper functions for TimeControl component
 * Extracted to reduce complexity and improve testability
 */

/**
 * Calculates time control opacity based on camera distance
 * Fades out between 3000AU and 5000AU
 * 
 * @param cameraDistance - Current camera distance in AU
 * @returns Opacity value between 0 and 1
 */
export function calculateTimeControlOpacity(cameraDistance: number): number {
  const FADE_START = 3000;
  const FADE_END = 5000;
  
  if (cameraDistance >= FADE_END) {
    return 0;
  } else if (cameraDistance > FADE_START) {
    return 1 - (cameraDistance - FADE_START) / (FADE_END - FADE_START);
  }
  return 1;
}

/**
 * Formats time as HH:MM:SS
 * 
 * @param date - Date to format
 * @returns Formatted time string
 */
export function formatTime(date: Date): string {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

/**
 * Formats date as YYYY-MM-DD for date input
 * 
 * @param date - Date to format
 * @returns Formatted date string
 */
export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Formats time difference in human-readable format
 * 
 * @param days - Time difference in days
 * @param lang - Language ('zh' or 'en')
 * @returns Formatted time difference string
 */
export function formatTimeDiff(days: number, lang: 'zh' | 'en'): string {
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

/**
 * Calculates time difference in days between two dates
 * 
 * @param displayTime - The display time
 * @param realTime - The real time (current time)
 * @returns Time difference in days (positive for future, negative for past)
 */
export function calculateTimeDiff(displayTime: Date, realTime: Date | null): number {
  if (!realTime) return 0;
  return (displayTime.getTime() - realTime.getTime()) / (1000 * 60 * 60 * 24);
}

/**
 * Checks if precision warning should be shown
 * Shows warning when time difference exceeds 100 years
 * 
 * @param timeDiffDays - Time difference in days
 * @returns True if warning should be shown
 */
export function shouldShowPrecisionWarning(timeDiffDays: number): boolean {
  const PRECISION_THRESHOLD_DAYS = 36525; // 100 years
  return Math.abs(timeDiffDays) > PRECISION_THRESHOLD_DAYS;
}

/**
 * Creates a new date with updated date but preserving time
 * 
 * @param newDateString - New date string from date input
 * @param currentTime - Current time to preserve hours/minutes/seconds
 * @returns New date with updated date and preserved time, or null if invalid
 */
export function createDateWithPreservedTime(
  newDateString: string,
  currentTime: Date
): Date | null {
  const newDate = new Date(newDateString);
  if (isNaN(newDate.getTime())) {
    return null;
  }
  
  const hours = currentTime.getHours();
  const minutes = currentTime.getMinutes();
  const seconds = currentTime.getSeconds();
  newDate.setHours(hours, minutes, seconds);
  
  return newDate;
}
