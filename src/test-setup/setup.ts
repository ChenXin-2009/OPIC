/**
 * Jest测试环境设置
 */

import '@testing-library/jest-dom';

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
    return (originalGetContext as any).apply(this, args);
  };
  HTMLCanvasElement.prototype.getContext = mockGetContext;
}
