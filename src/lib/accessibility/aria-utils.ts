/**
 * ARIA Utilities
 * 
 * Helper functions for adding ARIA attributes and creating accessible components.
 * Supports screen reader announcements and live regions.
 * 
 * **Features:**
 * - Add ARIA labels and descriptions
 * - Create live regions (polite/assertive)
 * - Screen reader announcements
 * - ARIA role management
 * 
 * **Usage:**
 * ```typescript
 * // Add ARIA label
 * addAriaLabel(button, 'Open menu');
 * 
 * // Create live region
 * const liveRegion = createLiveRegion('polite');
 * document.body.appendChild(liveRegion);
 * 
 * // Announce to screen reader
 * announceToScreenReader('Data loaded successfully', 'polite');
 * ```
 * 
 * @see Requirements 6.13, 6.14, 6.15, 6.16, 6.17
 */

import { logger } from '@/utils/logger';

/**
 * ARIA live region politeness level
 */
export type AriaPoliteness = 'polite' | 'assertive' | 'off';

/**
 * ARIA role type
 */
export type AriaRole =
  | 'alert'
  | 'alertdialog'
  | 'button'
  | 'checkbox'
  | 'dialog'
  | 'gridcell'
  | 'link'
  | 'log'
  | 'marquee'
  | 'menuitem'
  | 'menuitemcheckbox'
  | 'menuitemradio'
  | 'option'
  | 'progressbar'
  | 'radio'
  | 'scrollbar'
  | 'searchbox'
  | 'slider'
  | 'spinbutton'
  | 'status'
  | 'switch'
  | 'tab'
  | 'tabpanel'
  | 'textbox'
  | 'timer'
  | 'tooltip'
  | 'treeitem';

/**
 * Add aria-label attribute to an element
 */
export function addAriaLabel(element: HTMLElement, label: string): void {
  element.setAttribute('aria-label', label);
}

/**
 * Add aria-labelledby attribute to an element
 */
export function addAriaLabelledBy(element: HTMLElement, labelId: string): void {
  element.setAttribute('aria-labelledby', labelId);
}

/**
 * Add aria-describedby attribute to an element
 */
export function addAriaDescribedBy(element: HTMLElement, descriptionId: string): void {
  element.setAttribute('aria-describedby', descriptionId);
}

/**
 * Add ARIA role to an element
 */
export function addAriaRole(element: HTMLElement, role: AriaRole): void {
  element.setAttribute('role', role);
}

/**
 * Set aria-expanded state
 */
export function setAriaExpanded(element: HTMLElement, expanded: boolean): void {
  element.setAttribute('aria-expanded', String(expanded));
}

/**
 * Set aria-checked state
 */
export function setAriaChecked(element: HTMLElement, checked: boolean | 'mixed'): void {
  element.setAttribute('aria-checked', String(checked));
}

/**
 * Set aria-pressed state (for toggle buttons)
 */
export function setAriaPressed(element: HTMLElement, pressed: boolean | 'mixed'): void {
  element.setAttribute('aria-pressed', String(pressed));
}

/**
 * Set aria-selected state
 */
export function setAriaSelected(element: HTMLElement, selected: boolean): void {
  element.setAttribute('aria-selected', String(selected));
}

/**
 * Set aria-disabled state
 */
export function setAriaDisabled(element: HTMLElement, disabled: boolean): void {
  element.setAttribute('aria-disabled', String(disabled));
}

/**
 * Set aria-hidden state
 */
export function setAriaHidden(element: HTMLElement, hidden: boolean): void {
  element.setAttribute('aria-hidden', String(hidden));
}

/**
 * Set aria-current attribute
 */
export function setAriaCurrent(
  element: HTMLElement,
  current: boolean | 'page' | 'step' | 'location' | 'date' | 'time'
): void {
  if (current === false) {
    element.removeAttribute('aria-current');
  } else {
    element.setAttribute('aria-current', current === true ? 'true' : current);
  }
}

/**
 * Create a live region for screen reader announcements
 */
export function createLiveRegion(
  politeness: AriaPoliteness = 'polite',
  atomic: boolean = true
): HTMLDivElement {
  const region = document.createElement('div');
  
  region.setAttribute('aria-live', politeness);
  region.setAttribute('aria-atomic', String(atomic));
  region.setAttribute('role', 'status');
  
  // Screen reader only (visually hidden)
  region.className = 'sr-only';
  region.style.cssText = `
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border-width: 0;
  `;
  
  return region;
}

/**
 * Global announcer instance
 */
let globalAnnouncer: HTMLDivElement | null = null;

/**
 * Get or create global announcer element
 */
function getGlobalAnnouncer(): HTMLDivElement {
  if (!globalAnnouncer || !document.body.contains(globalAnnouncer)) {
    globalAnnouncer = createLiveRegion('polite');
    globalAnnouncer.id = 'aria-announcer-global';
    document.body.appendChild(globalAnnouncer);
  }
  return globalAnnouncer;
}

/**
 * Announce message to screen readers
 * 
 * Uses a global live region to announce messages. Messages are cleared after announcement
 * to allow the same message to be announced multiple times.
 */
export function announceToScreenReader(
  message: string,
  politeness: AriaPoliteness = 'polite'
): void {
  if (!message) return;
  
  const announcer = getGlobalAnnouncer();
  
  // Update politeness level
  announcer.setAttribute('aria-live', politeness);
  
  // Clear previous message
  announcer.textContent = '';
  
  // Set new message after a brief delay to ensure screen readers detect the change
  setTimeout(() => {
    announcer.textContent = message;
    
    // Clear message after announcement (3 seconds)
    setTimeout(() => {
      announcer.textContent = '';
    }, 3000);
  }, 100);
  
  logger.debug(`[ARIA] Announced (${politeness}): ${message}`);
}

/**
 * Create a description element and link it to a target
 */
export function createAndLinkDescription(
  target: HTMLElement,
  description: string,
  descriptionId?: string
): HTMLElement {
  const id = descriptionId || `desc-${Math.random().toString(36).substr(2, 9)}`;
  
  const descElement = document.createElement('div');
  descElement.id = id;
  descElement.className = 'sr-only';
  descElement.textContent = description;
  descElement.style.cssText = `
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border-width: 0;
  `;
  
  // Insert description element near target
  target.parentNode?.insertBefore(descElement, target.nextSibling);
  
  // Link target to description
  addAriaDescribedBy(target, id);
  
  return descElement;
}

/**
 * Create an accessible button (non-semantic element)
 */
export function makeAccessibleButton(
  element: HTMLElement,
  label: string,
  onClick: () => void
): void {
  addAriaRole(element, 'button');
  addAriaLabel(element, label);
  element.tabIndex = 0;
  
  // Handle click
  element.addEventListener('click', onClick);
  
  // Handle Enter and Space keys
  element.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick();
    }
  });
}

/**
 * Create an accessible toggle button
 */
export function makeAccessibleToggle(
  element: HTMLElement,
  label: string,
  initialState: boolean,
  onToggle: (pressed: boolean) => void
): void {
  let pressed = initialState;
  
  addAriaRole(element, 'button');
  addAriaLabel(element, label);
  setAriaPressed(element, pressed);
  element.tabIndex = 0;
  
  const toggle = () => {
    pressed = !pressed;
    setAriaPressed(element, pressed);
    onToggle(pressed);
  };
  
  element.addEventListener('click', toggle);
  element.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggle();
    }
  });
}

/**
 * Create an accessible checkbox (non-semantic element)
 */
export function makeAccessibleCheckbox(
  element: HTMLElement,
  label: string,
  initialState: boolean,
  onChange: (checked: boolean) => void
): void {
  let checked = initialState;
  
  addAriaRole(element, 'checkbox');
  addAriaLabel(element, label);
  setAriaChecked(element, checked);
  element.tabIndex = 0;
  
  const toggle = () => {
    checked = !checked;
    setAriaChecked(element, checked);
    onChange(checked);
  };
  
  element.addEventListener('click', toggle);
  element.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggle();
    }
  });
}

/**
 * Set ARIA attributes for a progress indicator
 */
export function setProgressAttributes(
  element: HTMLElement,
  value: number,
  min: number = 0,
  max: number = 100,
  label?: string
): void {
  addAriaRole(element, 'progressbar');
  element.setAttribute('aria-valuenow', String(value));
  element.setAttribute('aria-valuemin', String(min));
  element.setAttribute('aria-valuemax', String(max));
  
  if (label) {
    addAriaLabel(element, label);
  }
  
  // Calculate percentage for value text
  const percentage = Math.round(((value - min) / (max - min)) * 100);
  element.setAttribute('aria-valuetext', `${percentage}%`);
}

/**
 * Announce route change to screen readers (for SPA navigation)
 */
export function announceRouteChange(routeName: string): void {
  announceToScreenReader(`Navigated to ${routeName}`, 'polite');
}

/**
 * Announce loading state
 */
export function announceLoading(message: string = 'Loading'): void {
  announceToScreenReader(message, 'polite');
}

/**
 * Announce error
 */
export function announceError(message: string): void {
  announceToScreenReader(`Error: ${message}`, 'assertive');
}

/**
 * Announce success
 */
export function announceSuccess(message: string): void {
  announceToScreenReader(message, 'polite');
}
