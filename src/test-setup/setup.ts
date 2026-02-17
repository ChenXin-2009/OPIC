/**
 * Jest Test Setup
 *
 * Global test configuration and utilities for the Space-Time Foundation tests.
 */

import { TextEncoder, TextDecoder } from 'util';

// Polyfill TextEncoder/TextDecoder for Node.js test environment
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder as typeof global.TextDecoder;

// Extend Jest matchers if needed
declare global {
  namespace jest {
    interface Matchers<R> {
      // Custom matchers can be added here
    }
  }
}

// Global test timeout for property-based tests
jest.setTimeout(30000);

export {};
