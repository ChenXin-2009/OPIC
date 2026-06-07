/**
 * Accessibility utilities module
 * 
 * Provides comprehensive accessibility support including:
 * - Keyboard navigation and shortcuts
 * - Focus management and traps
 * - ARIA attributes and live regions
 * - Screen reader announcements
 * - High contrast mode (WCAG AAA)
 * - Reduced motion mode
 */

// Keyboard navigation
export { KeyboardNavigationManager } from './keyboard-nav';
export type { KeyboardShortcut } from './keyboard-nav';

// Focus management
export {
  createFocusTrap,
  FocusTrapManager,
  getFocusTrapManager,
  FocusStore,
  getFocusableElements,
  getFirstFocusable,
  getLastFocusable,
  focusElement,
  focusNext,
  focusPrevious,
  focusFirst,
  focusLast,
} from './focus-management';

export type {
  FocusTrap,
  FocusTrapOptions,
} from './focus-management';

// ARIA utilities
export {
  addAriaLabel,
  addAriaLabelledBy,
  addAriaDescribedBy,
  addAriaRole,
  setAriaExpanded,
  setAriaChecked,
  setAriaPressed,
  setAriaSelected,
  setAriaDisabled,
  setAriaHidden,
  setAriaCurrent,
  createLiveRegion,
  announceToScreenReader,
  createAndLinkDescription,
  makeAccessibleButton,
  makeAccessibleToggle,
  makeAccessibleCheckbox,
  setProgressAttributes,
  announceRouteChange,
  announceLoading,
  announceError,
  announceSuccess,
} from './aria-utils';

export type {
  AriaPoliteness,
  AriaRole,
} from './aria-utils';

// High contrast mode
export {
  enableHighContrastMode,
  disableHighContrastMode,
  toggleHighContrastMode,
  isHighContrastEnabled,
  initializeHighContrastMode,
  WCAG_AAA_THEME,
} from './high-contrast';

export type { HighContrastTheme } from './high-contrast';

// Reduced motion mode
export {
  enableReducedMotion,
  disableReducedMotion,
  toggleReducedMotion,
  isReducedMotionEnabled,
  prefersReducedMotion,
  initializeReducedMotion,
  getAnimationDuration,
  shouldAnimate,
} from './reduced-motion';
