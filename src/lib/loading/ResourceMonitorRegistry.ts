/**
 * Resource Monitor Registry
 * 
 * Manages all resource monitors and calculates overall loading progress.
 * This class is the central coordinator for the loading system.
 * 
 * Requirements: 9.1, 9.2, 9.3, 5.1, 5.4
 */

import type {
  ResourceMonitor,
  MonitorCallback,
  ProgressCallback,
  UnsubscribeFunction,
  MonitorState,
} from './types';

/**
 * Resource Monitor Registry
 * 
 * Manages registration of resource monitors, tracks their state,
 * and calculates overall loading progress.
 * 
 * Requirements: 9.1, 9.2, 9.3
 */
export class ResourceMonitorRegistry {
  /**
   * Map of registered monitors (name -> monitor)
   */
  private monitors: Map<string, ResourceMonitor> = new Map();
  
  /**
   * Callbacks to call when all monitors are ready
   */
  private readyCallbacks: Set<MonitorCallback> = new Set();
  
  /**
   * Callbacks to call when progress changes
   */
  private progressCallbacks: Set<ProgressCallback> = new Set();
  
  /**
   * Unsubscribe functions for monitor ready callbacks
   */
  private monitorUnsubscribers: Map<string, UnsubscribeFunction> = new Map();
  
  /**
   * Register a resource monitor
   * 
   * The monitor will be tracked and its progress will contribute to
   * the overall loading progress based on its weight.
   * 
   * Requirements: 9.1
   * 
   * @param monitor - The monitor to register
   * @throws Error if a monitor with the same name is already registered
   */
  register(monitor: ResourceMonitor): void {
    if (this.monitors.has(monitor.name)) {
      throw new Error(`Monitor "${monitor.name}" is already registered`);
    }
    
    this.monitors.set(monitor.name, monitor);
    
    // Listen for the monitor's ready event
    const unsubscribe = monitor.onReady(() => {
      this.checkAllReady();
      this.notifyProgress();
    });
    
    this.monitorUnsubscribers.set(monitor.name, unsubscribe);
    
    // Notify progress immediately in case the monitor is already ready
    this.notifyProgress();
  }
  
  /**
   * Unregister a resource monitor
   * 
   * Requirements: 9.1
   * 
   * @param name - Name of the monitor to unregister
   */
  unregister(name: string): void {
    const monitor = this.monitors.get(name);
    if (!monitor) {
      return;
    }
    
    // Unsubscribe from the monitor's ready event
    const unsubscribe = this.monitorUnsubscribers.get(name);
    if (unsubscribe) {
      unsubscribe();
      this.monitorUnsubscribers.delete(name);
    }
    
    // Dispose the monitor
    monitor.dispose();
    
    // Remove from registry
    this.monitors.delete(name);
  }
  
  /**
   * Check if all monitors are ready and notify callbacks
   * 
   * Requirements: 9.3
   */
  private checkAllReady(): void {
    if (this.isAllReady()) {
      this.readyCallbacks.forEach(callback => callback());
    }
  }
  
  /**
   * Notify all progress callbacks with the current progress
   */
  private notifyProgress(): void {
    const progress = this.calculateProgress();
    this.progressCallbacks.forEach(callback => callback(progress));
  }
  
  /**
   * Calculate overall loading progress (weighted average)
   * 
   * The progress is calculated as:
   * progress = Σ(monitor.progress * monitor.weight) / Σ(monitor.weight)
   * 
   * Requirements: 5.1, 5.4
   * 
   * @returns Progress value between 0 and 1
   */
  calculateProgress(): number {
    if (this.monitors.size === 0) {
      return 0;
    }
    
    let totalWeight = 0;
    let weightedProgress = 0;
    
    this.monitors.forEach(monitor => {
      totalWeight += monitor.weight;
      weightedProgress += monitor.getProgress() * monitor.weight;
    });
    
    return totalWeight > 0 ? weightedProgress / totalWeight : 0;
  }
  
  /**
   * Check if all monitors are ready
   * 
   * Requirements: 9.3
   * 
   * @returns true if all monitors report ready, false otherwise
   */
  isAllReady(): boolean {
    if (this.monitors.size === 0) {
      return false;
    }
    
    return Array.from(this.monitors.values()).every(monitor => monitor.isReady());
  }
  
  /**
   * Register a callback to be called when all monitors are ready
   * 
   * If all monitors are already ready, the callback will be called immediately.
   * 
   * Requirements: 9.2
   * 
   * @param callback - Function to call when all monitors are ready
   * @returns Unsubscribe function to remove the callback
   */
  onReady(callback: MonitorCallback): UnsubscribeFunction {
    this.readyCallbacks.add(callback);
    
    // If already ready, call immediately
    if (this.isAllReady()) {
      callback();
    }
    
    return () => this.readyCallbacks.delete(callback);
  }
  
  /**
   * Register a callback to be called when progress changes
   * 
   * The callback will be called immediately with the current progress,
   * and then whenever any monitor's progress changes.
   * 
   * Requirements: 5.1
   * 
   * @param callback - Function to call with progress value (0-1)
   * @returns Unsubscribe function to remove the callback
   */
  onProgress(callback: ProgressCallback): UnsubscribeFunction {
    this.progressCallbacks.add(callback);
    
    // Call immediately with current progress
    callback(this.calculateProgress());
    
    return () => this.progressCallbacks.delete(callback);
  }
  
  /**
   * Get the current state of all monitors
   * 
   * Useful for debugging and monitoring.
   * 
   * @returns Array of monitor states
   */
  getMonitorStates(): MonitorState[] {
    return Array.from(this.monitors.values()).map(monitor => ({
      name: monitor.name,
      ready: monitor.isReady(),
      progress: monitor.getProgress(),
      weight: monitor.weight,
    }));
  }
  
  /**
   * Get a specific monitor by name
   * 
   * @param name - Name of the monitor
   * @returns The monitor, or undefined if not found
   */
  getMonitor(name: string): ResourceMonitor | undefined {
    return this.monitors.get(name);
  }
  
  /**
   * Get the number of registered monitors
   * 
   * @returns Number of monitors
   */
  getMonitorCount(): number {
    return this.monitors.size;
  }
  
  /**
   * Clean up all monitors and callbacks
   * 
   * This should be called when the registry is no longer needed
   * to prevent memory leaks.
   * 
   * Requirements: 9.4
   */
  dispose(): void {
    // Unsubscribe from all monitor ready events
    this.monitorUnsubscribers.forEach(unsubscribe => unsubscribe());
    this.monitorUnsubscribers.clear();
    
    // Dispose all monitors
    this.monitors.forEach(monitor => monitor.dispose());
    this.monitors.clear();
    
    // Clear all callbacks
    this.readyCallbacks.clear();
    this.progressCallbacks.clear();
  }
}
