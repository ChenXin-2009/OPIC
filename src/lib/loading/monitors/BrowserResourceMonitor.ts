/**
 * Browser Resource Monitor
 * 
 * Monitors browser resource loading (window.load event and fonts).
 * This is a refactored version of the existing useResourceLoader logic.
 * 
 * Requirements: 3.1, 3.5, 7.5
 */

import type { ResourceMonitor } from '../types';

/**
 * Browser Resource Monitor
 * 
 * Monitors window.load event and document.fonts.ready to determine
 * when all browser resources (HTML, CSS, JS, fonts) are loaded.
 * 
 * Also detects if resources were cached for optimization.
 * 
 * Requirements: 3.1, 3.5, 7.5
 */
export class BrowserResourceMonitor implements ResourceMonitor {
  readonly name = 'browser';
  readonly weight = 1; // Baseline weight
  
  private ready = false;
  private cached = false;
  private callbacks: Set<() => void> = new Set();
  
  constructor() {
    this.initialize();
  }
  
  /**
   * Initialize resource monitoring
   * 
   * Requirements: 3.1
   */
  private async initialize(): Promise<void> {
    // Check if resources are already loaded (cached scenario)
    if (document.readyState === 'complete') {
      this.cached = true;
      await this.checkFontsReady();
      this.setReady();
      return;
    }
    
    // Listen for load event
    const handleLoad = async () => {
      await this.checkFontsReady();
      this.setReady();
    };
    
    window.addEventListener('load', handleLoad, { once: true });
  }
  
  /**
   * Check if fonts are ready
   * 
   * Requirements: 3.1
   */
  private async checkFontsReady(): Promise<void> {
    if (typeof document !== 'undefined' && 'fonts' in document && document.fonts) {
      try {
        await document.fonts.ready;
      } catch (error) {
        console.warn('Font loading failed:', error);
      }
    } else {
      // Fallback for browsers without document.fonts support
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  /**
   * Mark as ready and notify callbacks
   */
  private setReady(): void {
    this.ready = true;
    this.callbacks.forEach(callback => callback());
  }
  
  /**
   * Check if browser resources are ready
   * 
   * @returns true if all browser resources are loaded
   */
  isReady(): boolean {
    return this.ready;
  }
  
  /**
   * Get loading progress
   * 
   * @returns 0 if not ready, 1 if ready
   */
  getProgress(): number {
    return this.ready ? 1 : 0;
  }
  
  /**
   * Check if resources were cached
   * 
   * Requirements: 7.5
   * 
   * @returns true if resources were already loaded when monitor was created
   */
  wasCached(): boolean {
    return this.cached;
  }
  
  /**
   * Register a callback to be called when resources are ready
   * 
   * @param callback - Function to call when ready
   * @returns Unsubscribe function
   */
  onReady(callback: () => void): () => void {
    this.callbacks.add(callback);
    
    // If already ready, call immediately
    if (this.ready) {
      callback();
    }
    
    return () => this.callbacks.delete(callback);
  }
  
  /**
   * Clean up callbacks
   * 
   * Requirements: 3.5
   */
  dispose(): void {
    this.callbacks.clear();
  }
}
