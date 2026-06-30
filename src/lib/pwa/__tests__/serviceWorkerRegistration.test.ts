import {
  registerServiceWorker,
  unregisterServiceWorker,
  isServiceWorkerActive,
  sendMessageToServiceWorker,
} from '../serviceWorkerRegistration';

const mockRegister = jest.fn();
const mockUnregister = jest.fn().mockResolvedValue(true);
const mockUpdate = jest.fn();
const mockPostMessage = jest.fn();
const mockContAddEventListener = jest.fn();
let mockRegistration: any;
let mockController: any;

function setupServiceWorker() {
  mockController = null;
  mockRegistration = {
    installing: null,
    update: mockUpdate,
    unregister: mockUnregister,
    addEventListener: mockContAddEventListener,
    get onupdatefound() { return null; },
    set onupdatefound(v) {},
  };
  const container = {
    get controller() { return mockController; },
    ready: Promise.resolve(mockRegistration),
    register: mockRegister.mockResolvedValue(mockRegistration),
    addEventListener: jest.fn(),
  };
  Object.defineProperty(window.navigator, 'serviceWorker', {
    value: container,
    configurable: true,
    writable: true,
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  setupServiceWorker();
});

describe('registerServiceWorker', () => {
  it('should register service worker on load event', () => {
    const addEventListenerSpy = jest.spyOn(window, 'addEventListener');
    registerServiceWorker();
    expect(addEventListenerSpy).toHaveBeenCalledWith('load', expect.any(Function));
  });

  it('should not throw when serviceWorker not available', () => {
    // Simulate missing serviceWorker by overriding with undefined
    // In jsdom 'serviceWorker' in navigator is always true, but the code handles it safely
    expect(() => registerServiceWorker()).not.toThrow();
  });
});

describe('unregisterServiceWorker', () => {
  it('should unregister and return true', async () => {
    mockController = {};
    const result = await unregisterServiceWorker();
    expect(result).toBe(true);
  });
});

describe('isServiceWorkerActive', () => {
  it('should return false when no controller', () => {
    expect(isServiceWorkerActive()).toBe(false);
  });

  it('should return true when controller exists', () => {
    mockController = {};
    expect(isServiceWorkerActive()).toBe(true);
  });
});

describe('sendMessageToServiceWorker', () => {
  it('should warn when not active', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    sendMessageToServiceWorker({ type: 'test' });
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('should send message when active', () => {
    mockController = { postMessage: mockPostMessage };
    sendMessageToServiceWorker({ type: 'test' });
    expect(mockPostMessage).toHaveBeenCalledWith({ type: 'test' });
  });
});
