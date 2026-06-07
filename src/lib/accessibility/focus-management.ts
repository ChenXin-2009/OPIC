/**
 * Focus Management Utilities
 * 
 * Provides utilities for managing focus in modals, dialogs, and interactive components.
 * Implements focus traps and focus restoration patterns.
 * 
 * **Features:**
 * - Modal focus trap (wrap Tab navigation)
 * - Focus restoration on modal close
 * - Focusable element queries
 * - First/last element focusing
 * 
 * **Usage:**
 * ```typescript
 * const modal = document.getElementById('my-modal');
 * const trap = createFocusTrap(modal);
 * 
 * // Enable trap when modal opens
 * trap.activate();
 * 
 * // Disable trap when modal closes
 * trap.deactivate();
 * ```
 * 
 * @see Requirements 6.9, 6.10, 6.11, 6.12
 */

import { logger } from '@/utils/logger';

/**
 * Selector for focusable elements
 */
const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
].join(', ');

/**
 * Focus trap instance
 */
export interface FocusTrap {
  /** Activate the focus trap */
  activate(): void;
  
  /** Deactivate the focus trap */
  deactivate(): void;
  
  /** Check if trap is active */
  isActive(): boolean;
  
  /** Get trapped element */
  getElement(): HTMLElement;
}

/**
 * Focus trap options
 */
export interface FocusTrapOptions {
  /** Element to receive focus on activation */
  initialFocus?: HTMLElement | null;
  
  /** Element to restore focus to on deactivation */
  returnFocusTo?: HTMLElement | null;
  
  /** Allow clicking outside to deactivate */
  clickOutsideDeactivates?: boolean;
  
  /** Callback when trap is activated */
  onActivate?: () => void;
  
  /** Callback when trap is deactivated */
  onDeactivate?: () => void;
}

/**
 * Get all focusable elements within a container
 */
export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const elements = container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
  return Array.from(elements).filter((el) => {
    // Filter out hidden or disabled elements
    return (
      el.offsetParent !== null && // Not hidden via display:none or visibility:hidden
      !el.hasAttribute('disabled') &&
      el.tabIndex >= 0
    );
  });
}

/**
 * Get first focusable element in container
 */
export function getFirstFocusable(container: HTMLElement): HTMLElement | null {
  const elements = getFocusableElements(container);
  return elements[0] || null;
}

/**
 * Get last focusable element in container
 */
export function getLastFocusable(container: HTMLElement): HTMLElement | null {
  const elements = getFocusableElements(container);
  return elements[elements.length - 1] || null;
}

/**
 * Focus an element and scroll it into view if needed
 */
export function focusElement(element: HTMLElement | null): void {
  if (!element) return;
  
  element.focus();
  
  // Scroll into view if needed
  if (element.scrollIntoView) {
    element.scrollIntoView({
      block: 'nearest',
      inline: 'nearest',
      behavior: 'smooth',
    });
  }
}

/**
 * Store and restore focus
 */
export class FocusStore {
  private storedElement: HTMLElement | null = null;
  
  /**
   * Store current focused element
   */
  public store(): void {
    this.storedElement = document.activeElement as HTMLElement;
  }
  
  /**
   * Restore previously stored focus
   */
  public restore(): void {
    if (this.storedElement && typeof this.storedElement.focus === 'function') {
      focusElement(this.storedElement);
    }
    this.storedElement = null;
  }
  
  /**
   * Get stored element
   */
  public getStoredElement(): HTMLElement | null {
    return this.storedElement;
  }
  
  /**
   * Set stored element
   */
  public setStoredElement(el: HTMLElement | null): void {
    this.storedElement = el;
  }

  /**
   * Clear stored element
   */
  public clear(): void {
    this.storedElement = null;
  }
}

/**
 * Create a focus trap for a modal or dialog
 */
export function createFocusTrap(
  element: HTMLElement,
  options: FocusTrapOptions = {}
): FocusTrap {
  let isActive = false;
  const focusStore = new FocusStore();
  let handleKeyDown: ((e: KeyboardEvent) => void) | null = null;
  let handleClickOutside: ((e: MouseEvent) => void) | null = null;
  
  /**
   * Handle Tab key to trap focus within element
   */
  function createKeyDownHandler(): (e: KeyboardEvent) => void {
    return (e: KeyboardEvent) => {
      if (!isActive || e.key !== 'Tab') return;
      
      const focusableElements = getFocusableElements(element);
      if (focusableElements.length === 0) return;
      
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      
      // Shift+Tab on first element → focus last element
      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        focusElement(lastElement);
      }
      // Tab on last element → focus first element
      else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        focusElement(firstElement);
      }
    };
  }
  
  /**
   * Handle click outside to deactivate trap
   */
  function createClickOutsideHandler(): (e: MouseEvent) => void {
    return (e: MouseEvent) => {
      if (!isActive || !options.clickOutsideDeactivates) return;
      
      const target = e.target as Node;
      if (!element.contains(target)) {
        trap.deactivate();
      }
    };
  }
  
  const trap: FocusTrap = {
    activate() {
      if (isActive) return;
      
      isActive = true;
      
      // Store current focus
      if (options.returnFocusTo !== undefined) {
        // Use explicitly provided element
        focusStore.setStoredElement(options.returnFocusTo);
      } else {
        // Auto-store current focus
        focusStore.store();
      }
      
      // Set initial focus
      const initialFocusElement = options.initialFocus || getFirstFocusable(element);
      if (initialFocusElement) {
        // Use setTimeout to ensure element is visible/rendered
        setTimeout(() => focusElement(initialFocusElement), 0);
      }
      
      // Attach event listeners
      handleKeyDown = createKeyDownHandler();
      element.addEventListener('keydown', handleKeyDown);
      
      if (options.clickOutsideDeactivates) {
        handleClickOutside = createClickOutsideHandler();
        // Use capture phase to catch clicks before they bubble
        document.addEventListener('mousedown', handleClickOutside, true);
      }
      
      // Call activation callback
      options.onActivate?.();
      
      logger.debug('[FocusTrap] Activated');
    },
    
    deactivate() {
      if (!isActive) return;
      
      isActive = false;
      
      // Remove event listeners
      if (handleKeyDown) {
        element.removeEventListener('keydown', handleKeyDown);
        handleKeyDown = null;
      }
      
      if (handleClickOutside) {
        document.removeEventListener('mousedown', handleClickOutside, true);
        handleClickOutside = null;
      }
      
      // Restore focus
      focusStore.restore();
      
      // Call deactivation callback
      options.onDeactivate?.();
      
      logger.debug('[FocusTrap] Deactivated');
    },
    
    isActive() {
      return isActive;
    },
    
    getElement() {
      return element;
    },
  };
  
  return trap;
}

/**
 * Focus trap manager for multiple traps
 */
export class FocusTrapManager {
  private traps: Map<string, FocusTrap> = new Map();
  private activeTraps: Set<string> = new Set();
  
  /**
   * Register a focus trap
   */
  public register(id: string, trap: FocusTrap): void {
    this.traps.set(id, trap);
  }
  
  /**
   * Unregister a focus trap
   */
  public unregister(id: string): void {
    const trap = this.traps.get(id);
    if (trap?.isActive()) {
      trap.deactivate();
    }
    this.traps.delete(id);
    this.activeTraps.delete(id);
  }
  
  /**
   * Activate a trap by ID
   */
  public activate(id: string): void {
    const trap = this.traps.get(id);
    if (trap) {
      trap.activate();
      this.activeTraps.add(id);
    }
  }
  
  /**
   * Deactivate a trap by ID
   */
  public deactivate(id: string): void {
    const trap = this.traps.get(id);
    if (trap) {
      trap.deactivate();
      this.activeTraps.delete(id);
    }
  }
  
  /**
   * Deactivate all traps
   */
  public deactivateAll(): void {
    this.activeTraps.forEach((id) => {
      this.deactivate(id);
    });
  }
  
  /**
   * Get active trap IDs
   */
  public getActiveTraps(): string[] {
    return Array.from(this.activeTraps);
  }
}

/**
 * Global focus trap manager instance
 */
let globalManager: FocusTrapManager | null = null;

/**
 * Get global focus trap manager
 */
export function getFocusTrapManager(): FocusTrapManager {
  if (!globalManager) {
    globalManager = new FocusTrapManager();
  }
  return globalManager;
}

/**
 * Focus next focusable element in container
 */
export function focusNext(container: HTMLElement = document.body): void {
  const elements = getFocusableElements(container);
  const currentIndex = elements.findIndex((el) => el === document.activeElement);
  
  if (currentIndex < elements.length - 1) {
    focusElement(elements[currentIndex + 1]);
  } else {
    // Wrap to first element
    focusElement(elements[0]);
  }
}

/**
 * Focus previous focusable element in container
 */
export function focusPrevious(container: HTMLElement = document.body): void {
  const elements = getFocusableElements(container);
  const currentIndex = elements.findIndex((el) => el === document.activeElement);
  
  if (currentIndex > 0) {
    focusElement(elements[currentIndex - 1]);
  } else {
    // Wrap to last element
    focusElement(elements[elements.length - 1]);
  }
}

/**
 * Focus first focusable element in container
 */
export function focusFirst(container: HTMLElement = document.body): void {
  const first = getFirstFocusable(container);
  focusElement(first);
}

/**
 * Focus last focusable element in container
 */
export function focusLast(container: HTMLElement = document.body): void {
  const last = getLastFocusable(container);
  focusElement(last);
}
