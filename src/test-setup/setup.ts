/**
 * Jest测试环境设置
 */

import '@testing-library/jest-dom';

// Polyfill TextDecoder/TextEncoder for jsdom
if (typeof globalThis.TextDecoder === 'undefined') {
  try {
    const { TextDecoder, TextEncoder } = require('util');
    globalThis.TextDecoder = TextDecoder;
    globalThis.TextEncoder = TextEncoder;
  } catch {
    // ignore if util is not available
  }
}

// Mock global fetch for tests that don't mock it themselves
if (typeof globalThis.fetch !== 'function') {
  globalThis.fetch = async () => {
    throw new Error('fetch is not mocked - use jest.mock() or jest.spyOn() in your test');
  };
}

// Mock ResizeObserver
if (typeof ResizeObserver === 'undefined') {
  class ResizeObserverMock {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  globalThis.ResizeObserver = ResizeObserverMock as any;
}

// Mock matchMedia
if (typeof window !== 'undefined' && typeof window.matchMedia !== 'function') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

// Mock HTMLCanvasElement.getContext for Three.js/Cesium canvas operations
if (typeof HTMLCanvasElement !== 'undefined') {
  const originalGetContext = HTMLCanvasElement.prototype.getContext;
  const mockGetContext: any = function (this: HTMLCanvasElement, ...args: any[]) {
    if (args[0] === 'webgl' || args[0] === 'webgl2') {
      return null;
    }
    // For 2d context, provide a mock if jsdom returns null
    const ctx = (originalGetContext as any).apply(this, args);
    if (args[0] === '2d' && ctx === null) {
      return {
        fillStyle: '',
        strokeStyle: '',
        lineWidth: 1,
        fillRect: () => {},
        strokeRect: () => {},
        clearRect: () => {},
        beginPath: () => {},
        closePath: () => {},
        moveTo: () => {},
        lineTo: () => {},
        arc: () => {},
        fill: () => {},
        stroke: () => {},
        createRadialGradient: () => ({
          addColorStop: () => {},
        }),
        createLinearGradient: () => ({
          addColorStop: () => {},
        }),
        measureText: () => ({ width: 0 }),
        save: () => {},
        restore: () => {},
        translate: () => {},
        rotate: () => {},
        scale: () => {},
        drawImage: () => {},
        getImageData: () => ({ data: new Uint8ClampedArray(0) }),
        putImageData: () => {},
        canvas: this,
      };
    }
    return ctx;
  };
  HTMLCanvasElement.prototype.getContext = mockGetContext;
}
