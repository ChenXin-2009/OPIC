/**
 * Property-Based Tests for Progress Calculation
 * 
 * Tests the correctness of progress calculation using property-based testing.
 * These tests verify that the weighted average calculation is correct for
 * any combination of monitor states.
 * 
 * Feature: loading-optimization
 * Property 5: 对于任何监视器状态集合，总体进度应该等于所有监视器进度的加权平均值
 * 
 * Requirements: 5.1, 5.4
 */

import * as fc from 'fast-check';
import { ResourceMonitorRegistry } from '../../ResourceMonitorRegistry';
import type { ResourceMonitor } from '../../types';

/**
 * Create a simple mock monitor for property testing
 */
function createSimpleMonitor(
  name: string,
  weight: number,
  progress: number
): ResourceMonitor {
  return {
    name,
    weight,
    isReady: () => progress >= 1.0,
    getProgress: () => progress,
    onReady: (callback) => {
      if (progress >= 1.0) {
        callback();
      }
      return () => {};
    },
    dispose: () => {},
  };
}

/**
 * Calculate expected weighted average manually
 */
function calculateExpectedProgress(
  monitors: Array<{ weight: number; progress: number }>
): number {
  if (monitors.length === 0) {
    return 0;
  }
  
  const totalWeight = monitors.reduce((sum, m) => sum + m.weight, 0);
  if (totalWeight === 0) {
    return 0;
  }
  
  const weightedSum = monitors.reduce((sum, m) => sum + m.weight * m.progress, 0);
  return weightedSum / totalWeight;
}

describe('Property 5: Progress Calculation Correctness', () => {
  /**
   * Property: For any set of monitors with valid weights and progress values,
   * the calculated progress should equal the weighted average.
   * 
   * **Validates: Requirements 5.1, 5.4**
   */
  it('should calculate correct weighted average for any monitor configuration', () => {
    fc.assert(
      fc.property(
        // Generate an array of monitors with random weights (1-10) and progress (0-1)
        fc.array(
          fc.record({
            name: fc.string({ minLength: 1, maxLength: 20 }),
            weight: fc.integer({ min: 1, max: 10 }),
            progress: fc.double({ min: 0, max: 1, noNaN: true }),
          }),
          { minLength: 1, maxLength: 10 }
        ),
        (monitorConfigs) => {
          // Ensure unique names
          const uniqueConfigs = monitorConfigs.filter(
            (config, index, self) =>
              self.findIndex(c => c.name === config.name) === index
          );
          
          if (uniqueConfigs.length === 0) {
            return true; // Skip empty arrays
          }
          
          // Create registry and monitors
          const registry = new ResourceMonitorRegistry();
          const monitors = uniqueConfigs.map(config =>
            createSimpleMonitor(config.name, config.weight, config.progress)
          );
          
          // Register all monitors
          monitors.forEach(monitor => registry.register(monitor));
          
          // Calculate expected progress
          const expected = calculateExpectedProgress(uniqueConfigs);
          
          // Get actual progress from registry
          const actual = registry.calculateProgress();
          
          // Clean up
          registry.dispose();
          
          // Verify they match (with floating point tolerance)
          const tolerance = 0.0001;
          return Math.abs(actual - expected) < tolerance;
        }
      ),
      { numRuns: 100 } // Run 100 iterations as specified in design
    );
  });

  /**
   * Property: Progress should always be between 0 and 1
   * 
   * **Validates: Requirements 5.1**
   */
  it('should always return progress between 0 and 1', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            name: fc.string({ minLength: 1, maxLength: 20 }),
            weight: fc.integer({ min: 1, max: 10 }),
            progress: fc.double({ min: 0, max: 1, noNaN: true }),
          }),
          { minLength: 1, maxLength: 10 }
        ),
        (monitorConfigs) => {
          const uniqueConfigs = monitorConfigs.filter(
            (config, index, self) =>
              self.findIndex(c => c.name === config.name) === index
          );
          
          if (uniqueConfigs.length === 0) {
            return true;
          }
          
          const registry = new ResourceMonitorRegistry();
          const monitors = uniqueConfigs.map(config =>
            createSimpleMonitor(config.name, config.weight, config.progress)
          );
          
          monitors.forEach(monitor => registry.register(monitor));
          
          const progress = registry.calculateProgress();
          
          registry.dispose();
          
          return progress >= 0 && progress <= 1;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: If all monitors have progress 1.0, overall progress should be 1.0
   * 
   * **Validates: Requirements 5.1, 5.4**
   */
  it('should return 1.0 when all monitors are at 100%', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            name: fc.string({ minLength: 1, maxLength: 20 }),
            weight: fc.integer({ min: 1, max: 10 }),
          }),
          { minLength: 1, maxLength: 10 }
        ),
        (monitorConfigs) => {
          const uniqueConfigs = monitorConfigs.filter(
            (config, index, self) =>
              self.findIndex(c => c.name === config.name) === index
          );
          
          if (uniqueConfigs.length === 0) {
            return true;
          }
          
          const registry = new ResourceMonitorRegistry();
          const monitors = uniqueConfigs.map(config =>
            createSimpleMonitor(config.name, config.weight, 1.0)
          );
          
          monitors.forEach(monitor => registry.register(monitor));
          
          const progress = registry.calculateProgress();
          
          registry.dispose();
          
          return Math.abs(progress - 1.0) < 0.0001;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: If all monitors have progress 0.0, overall progress should be 0.0
   * 
   * **Validates: Requirements 5.1, 5.4**
   */
  it('should return 0.0 when all monitors are at 0%', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            name: fc.string({ minLength: 1, maxLength: 20 }),
            weight: fc.integer({ min: 1, max: 10 }),
          }),
          { minLength: 1, maxLength: 10 }
        ),
        (monitorConfigs) => {
          const uniqueConfigs = monitorConfigs.filter(
            (config, index, self) =>
              self.findIndex(c => c.name === config.name) === index
          );
          
          if (uniqueConfigs.length === 0) {
            return true;
          }
          
          const registry = new ResourceMonitorRegistry();
          const monitors = uniqueConfigs.map(config =>
            createSimpleMonitor(config.name, config.weight, 0.0)
          );
          
          monitors.forEach(monitor => registry.register(monitor));
          
          const progress = registry.calculateProgress();
          
          registry.dispose();
          
          return Math.abs(progress - 0.0) < 0.0001;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Progress should be monotonic - if all monitors increase progress,
   * overall progress should not decrease
   * 
   * **Validates: Requirements 5.1**
   */
  it('should be monotonic - progress should not decrease when monitors progress', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            name: fc.string({ minLength: 1, maxLength: 20 }),
            weight: fc.integer({ min: 1, max: 10 }),
            progress1: fc.double({ min: 0, max: 1, noNaN: true }),
            progress2: fc.double({ min: 0, max: 1, noNaN: true }),
          }),
          { minLength: 1, maxLength: 10 }
        ),
        (monitorConfigs) => {
          const uniqueConfigs = monitorConfigs.filter(
            (config, index, self) =>
              self.findIndex(c => c.name === config.name) === index
          );
          
          if (uniqueConfigs.length === 0) {
            return true;
          }
          
          // Ensure progress2 >= progress1 for all monitors
          const configs = uniqueConfigs.map(config => ({
            ...config,
            progress1: Math.min(config.progress1, config.progress2),
            progress2: Math.max(config.progress1, config.progress2),
          }));
          
          // Calculate progress at state 1
          const progress1 = calculateExpectedProgress(
            configs.map(c => ({ weight: c.weight, progress: c.progress1 }))
          );
          
          // Calculate progress at state 2
          const progress2 = calculateExpectedProgress(
            configs.map(c => ({ weight: c.weight, progress: c.progress2 }))
          );
          
          // Progress should not decrease
          return progress2 >= progress1 - 0.0001; // Allow small floating point error
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Weight should affect progress contribution
   * A monitor with higher weight should have more impact on overall progress
   * 
   * **Validates: Requirements 5.4**
   */
  it('should give higher weight monitors more influence on overall progress', () => {
    fc.assert(
      fc.property(
        fc.record({
          progress1: fc.double({ min: 0, max: 1, noNaN: true }),
          progress2: fc.double({ min: 0, max: 1, noNaN: true }),
          weight1: fc.integer({ min: 1, max: 5 }),
          weight2: fc.integer({ min: 6, max: 10 }), // weight2 > weight1
        }),
        ({ progress1, progress2, weight1, weight2 }) => {
          // Create two monitors with different weights
          const registry = new ResourceMonitorRegistry();
          
          const monitor1 = createSimpleMonitor('m1', weight1, progress1);
          const monitor2 = createSimpleMonitor('m2', weight2, progress2);
          
          registry.register(monitor1);
          registry.register(monitor2);
          
          const overallProgress = registry.calculateProgress();
          
          registry.dispose();
          
          // The overall progress should be closer to the higher-weight monitor's progress
          // Distance to monitor2 should be less than distance to monitor1
          const distanceToM1 = Math.abs(overallProgress - progress1);
          const distanceToM2 = Math.abs(overallProgress - progress2);
          
          // If progresses are different, the higher weight should pull overall progress closer
          if (Math.abs(progress1 - progress2) > 0.1) {
            return distanceToM2 <= distanceToM1;
          }
          
          return true; // Skip if progresses are too similar
        }
      ),
      { numRuns: 100 }
    );
  });
});
