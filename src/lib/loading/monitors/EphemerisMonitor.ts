/**
 * Ephemeris Monitor
 * 
 * Monitors ephemeris data loading and celestial body calculation.
 * This is the most critical monitor for preventing black screen issues,
 * as the scene cannot initialize until celestial bodies are ready.
 * 
 * Requirements: 3.1, 3.2, 3.3
 */

import type { ResourceMonitor, EphemerisLoadEvent } from '../types';

/**
 * Ephemeris Monitor
 * 
 * Listens to ephemeris loading events and tracks progress through
 * four stages:
 * 1. Initialization started (25%)
 * 2. Manifest loaded (50%)
 * 3. Data loaded (75%)
 * 4. Celestial bodies ready (100%)
 * 
 * Requirements: 3.1, 3.2, 3.3
 */
export class EphemerisMonitor implements ResourceMonitor {
  readonly name = 'ephemeris';
  readonly weight = 2; // High priority - blocks scene initialization
  
  private ready = false;
  private progress = 0;
  private callbacks: Set<() => void> = new Set();
  
  constructor() {
    this.initialize();
  }
  
  /**
   * Initialize event listeners
   * 
   * Requirements: 3.2
   */
  private initialize(): void {
    // Listen for ephemeris initialization start
    window.addEventListener('ephemeris:init:start', this.handleInitStart as EventListener);
    
    // Listen for manifest loaded
    window.addEventListener('ephemeris:manifest:loaded', this.handleManifestLoaded as EventListener);
    
    // Listen for data loaded
    window.addEventListener('ephemeris:data:loaded', this.handleDataLoaded as EventListener);
    
    // Listen for celestial bodies ready
    window.addEventListener('ephemeris:bodies:ready', this.handleBodiesReady as EventListener);
  }
  
  /**
   * Handle initialization start event
   * 
   * Requirements: 3.2, 3.3
   */
  private handleInitStart = (event: Event): void => {
    const customEvent = event as EphemerisLoadEvent;
    if (customEvent.detail?.stage === 'start') {
      this.progress = 0.25;
    }
  };
  
  /**
   * Handle manifest loaded event
   * 
   * Requirements: 3.2, 3.3
   */
  private handleManifestLoaded = (event: Event): void => {
    const customEvent = event as EphemerisLoadEvent;
    if (customEvent.detail?.stage === 'manifest') {
      this.progress = 0.5;
    }
  };
  
  /**
   * Handle data loaded event
   * 
   * Requirements: 3.2, 3.3
   */
  private handleDataLoaded = (event: Event): void => {
    const customEvent = event as EphemerisLoadEvent;
    if (customEvent.detail?.stage === 'data') {
      this.progress = 0.75;
    }
  };
  
  /**
   * Handle celestial bodies ready event
   * 
   * Requirements: 3.2, 3.3, 3.4
   */
  private handleBodiesReady = (event: Event): void => {
    const customEvent = event as EphemerisLoadEvent;
    if (customEvent.detail?.stage === 'bodies') {
      this.progress = 1.0;
      this.ready = true;
      
      // Notify all callbacks
      this.callbacks.forEach(callback => callback());
    }
  };
  
  /**
   * Check if ephemeris data is ready
   * 
   * Requirements: 3.4
   * 
   * @returns true if celestial bodies are ready
   */
  isReady(): boolean {
    return this.ready;
  }
  
  /**
   * Get loading progress
   * 
   * Requirements: 3.3
   * 
   * @returns Progress value between 0 and 1
   */
  getProgress(): number {
    return this.progress;
  }
  
  /**
   * Register a callback to be called when ephemeris data is ready
   * 
   * Requirements: 3.4
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
   * Clean up event listeners and callbacks
   * 
   * Requirements: 3.5
   */
  dispose(): void {
    // Remove event listeners
    window.removeEventListener('ephemeris:init:start', this.handleInitStart as EventListener);
    window.removeEventListener('ephemeris:manifest:loaded', this.handleManifestLoaded as EventListener);
    window.removeEventListener('ephemeris:data:loaded', this.handleDataLoaded as EventListener);
    window.removeEventListener('ephemeris:bodies:ready', this.handleBodiesReady as EventListener);
    
    // Clear callbacks
    this.callbacks.clear();
  }
}
