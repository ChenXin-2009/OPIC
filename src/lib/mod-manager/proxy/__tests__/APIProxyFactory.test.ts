import { APIProxyFactory } from '../APIProxyFactory';
import { APICallLogger } from '../APICallLogger';

// ============ Mock Helpers ============

function createMockPermissionSystem() {
  return {
    requirePermission: jest.fn(),
  } as any;
}

function createMockSandbox() {
  return {
    trackEventListener: jest.fn(),
    untrackEventListener: jest.fn(),
    trackRenderObject: jest.fn(),
    untrackRenderObject: jest.fn(),
    trackTimer: jest.fn(),
    untrackTimer: jest.fn(),
    checkQuota: jest.fn(),
  } as any;
}

function createCoreAPIs() {
  return {
    time: {
      currentTime: new Date('2026-01-01'),
      isPlaying: false,
      timeSpeed: 1,
      playDirection: 'forward' as const,
      setCurrentTime: jest.fn(),
      togglePlayPause: jest.fn(),
      setTimeSpeed: jest.fn(),
      setPlayDirection: jest.fn(),
      onTimeChange: jest.fn().mockReturnValue(jest.fn()),
    },
    camera: {
      cameraDistance: 1000,
      viewOffset: { x: 0, y: 0 },
      zoom: 1,
      setCameraDistance: jest.fn(),
      setViewOffset: jest.fn(),
      setZoom: jest.fn(),
      centerOnPlanet: jest.fn(),
      onCameraChange: jest.fn().mockReturnValue(jest.fn()),
    },
    celestial: {
      getCelestialBodies: jest.fn().mockReturnValue([]),
      getOrbitalElements: jest.fn().mockReturnValue({}),
      calculatePosition: jest.fn().mockReturnValue({ x: 0, y: 0, z: 0 }),
      ORBITAL_ELEMENTS: {},
      CELESTIAL_BODIES: {},
      dateToJulianDay: jest.fn().mockReturnValue(2451545),
      julianDayToDate: jest.fn().mockReturnValue(new Date()),
      onBodiesUpdate: jest.fn().mockReturnValue(jest.fn()),
    },
    satellite: {
      satellites: [],
      visibleSatellites: [],
      fetchSatellites: jest.fn().mockResolvedValue(undefined),
      selectSatellite: jest.fn(),
      calculateSatellitePosition: jest.fn().mockReturnValue({ x: 0, y: 0, z: 0 }),
      onSatellitesUpdate: jest.fn().mockReturnValue(jest.fn()),
    },
    render: {
      registerRenderer: jest.fn(),
      unregisterRenderer: jest.fn(),
      getScene: jest.fn().mockReturnValue({}),
      getCamera: jest.fn().mockReturnValue({}),
      getRenderer: jest.fn().mockReturnValue({}),
      registerCesiumLayer: jest.fn(),
      unregisterCesiumLayer: jest.fn(),
      onBeforeRender: jest.fn().mockReturnValue(jest.fn()),
      onAfterRender: jest.fn().mockReturnValue(jest.fn()),
    },
  };
}

// Mock module-level singletons
jest.mock('@/lib/mod-manager/error/ErrorLogger', () => ({
  getErrorLogger: () => ({ log: jest.fn() }),
}));

jest.mock('@/lib/mod-manager/core/ModRegistry', () => ({
  getRegistry: () => ({ get: jest.fn() }),
}));

jest.mock('@/lib/mod-manager/core/ModLifecycle', () => ({
  getModLifecycle: () => ({ disable: jest.fn().mockResolvedValue(undefined) }),
}));

// ============ Tests ============

describe('APIProxyFactory', () => {
  let factory: APIProxyFactory;
  let permissionSystem: ReturnType<typeof createMockPermissionSystem>;
  let sandbox: ReturnType<typeof createMockSandbox>;
  let coreAPIs: ReturnType<typeof createCoreAPIs>;

  beforeEach(() => {
    jest.clearAllMocks();
    permissionSystem = createMockPermissionSystem();
    sandbox = createMockSandbox();
    coreAPIs = createCoreAPIs();
    factory = new APIProxyFactory(permissionSystem, sandbox, coreAPIs);
  });

  // ==================== createProxy ====================

  describe('createProxy', () => {
    it('should return proxy with all 5 API namespaces', () => {
      const proxy = factory.createProxy('mod1');
      expect(proxy).toHaveProperty('time');
      expect(proxy).toHaveProperty('camera');
      expect(proxy).toHaveProperty('celestial');
      expect(proxy).toHaveProperty('satellite');
      expect(proxy).toHaveProperty('render');
    });

    it('should return distinct proxies for different modIds', () => {
      const proxyA = factory.createProxy('modA');
      const proxyB = factory.createProxy('modB');
      expect(proxyA).not.toBe(proxyB);
    });
  });

  // ==================== TimeAPI proxy ====================

  describe('TimeAPI proxy', () => {
    it('should read currentTime with permission check', () => {
      const proxy = factory.createProxy('mod1');
      const value = proxy.time.currentTime;
      expect(permissionSystem.requirePermission).toHaveBeenCalledWith('mod1', 'time:read');
      expect(value).toEqual(new Date('2026-01-01'));
    });

    it('should read isPlaying with permission check', () => {
      const proxy = factory.createProxy('mod1');
      const value = proxy.time.isPlaying;
      expect(permissionSystem.requirePermission).toHaveBeenCalledWith('mod1', 'time:read');
      expect(value).toBe(false);
    });

    it('should read timeSpeed with permission check', () => {
      const proxy = factory.createProxy('mod1');
      const value = proxy.time.timeSpeed;
      expect(permissionSystem.requirePermission).toHaveBeenCalledWith('mod1', 'time:read');
      expect(value).toBe(1);
    });

    it('should read playDirection with permission check', () => {
      const proxy = factory.createProxy('mod1');
      const value = proxy.time.playDirection;
      expect(permissionSystem.requirePermission).toHaveBeenCalledWith('mod1', 'time:read');
      expect(value).toBe('forward');
    });

    it('should call setCurrentTime with permission and quota check', () => {
      const proxy = factory.createProxy('mod1');
      const date = new Date('2026-06-01');
      proxy.time.setCurrentTime(date);
      expect(permissionSystem.requirePermission).toHaveBeenCalledWith('mod1', 'time:write');
      expect(sandbox.checkQuota).toHaveBeenCalledWith('mod1', 'apiCallsLastSecond');
      expect(coreAPIs.time.setCurrentTime).toHaveBeenCalledWith(date);
    });

    it('should forward togglePlayPause to core API', () => {
      const proxy = factory.createProxy('mod1');
      proxy.time.togglePlayPause();
      expect(permissionSystem.requirePermission).toHaveBeenCalledWith('mod1', 'time:write');
      expect(coreAPIs.time.togglePlayPause).toHaveBeenCalled();
    });

    it('should forward setTimeSpeed with argument', () => {
      const proxy = factory.createProxy('mod1');
      proxy.time.setTimeSpeed(10);
      expect(coreAPIs.time.setTimeSpeed).toHaveBeenCalledWith(10);
    });

    it('should forward setPlayDirection with argument', () => {
      const proxy = factory.createProxy('mod1');
      proxy.time.setPlayDirection('backward');
      expect(permissionSystem.requirePermission).toHaveBeenCalledWith('mod1', 'time:write');
      expect(coreAPIs.time.setPlayDirection).toHaveBeenCalledWith('backward');
    });

    it('should set up onTimeChange listener with event tracking', () => {
      const proxy = factory.createProxy('mod1');
      const cb = jest.fn();
      const unsub = proxy.time.onTimeChange(cb);
      expect(permissionSystem.requirePermission).toHaveBeenCalledWith('mod1', 'time:read');
      expect(sandbox.trackEventListener).toHaveBeenCalledWith('mod1');
      expect(coreAPIs.time.onTimeChange).toHaveBeenCalledWith(cb);

      unsub();
      expect(sandbox.untrackEventListener).toHaveBeenCalledWith('mod1');
    });

    it('should log API calls on successful method', () => {
      const proxy = factory.createProxy('mod1');
      proxy.time.togglePlayPause();
      expect(factory.getLogger().size).toBe(1);
    });
  });

  // ==================== CameraAPI proxy ====================

  describe('CameraAPI proxy', () => {
    it('should read cameraDistance with permission check', () => {
      const proxy = factory.createProxy('mod1');
      expect(proxy.camera.cameraDistance).toBe(1000);
      expect(permissionSystem.requirePermission).toHaveBeenCalledWith('mod1', 'camera:read');
    });

    it('should read viewOffset with permission check', () => {
      const proxy = factory.createProxy('mod1');
      expect(proxy.camera.viewOffset).toEqual({ x: 0, y: 0 });
      expect(permissionSystem.requirePermission).toHaveBeenCalledWith('mod1', 'camera:read');
    });

    it('should read zoom with permission check', () => {
      const proxy = factory.createProxy('mod1');
      expect(proxy.camera.zoom).toBe(1);
      expect(permissionSystem.requirePermission).toHaveBeenCalledWith('mod1', 'camera:read');
    });

    it('should call setCameraDistance', () => {
      const proxy = factory.createProxy('mod1');
      proxy.camera.setCameraDistance(2000);
      expect(permissionSystem.requirePermission).toHaveBeenCalledWith('mod1', 'camera:write');
      expect(coreAPIs.camera.setCameraDistance).toHaveBeenCalledWith(2000);
    });

    it('should call setViewOffset', () => {
      const proxy = factory.createProxy('mod1');
      const offset = { x: 1.5, y: -0.5 };
      proxy.camera.setViewOffset(offset);
      expect(permissionSystem.requirePermission).toHaveBeenCalledWith('mod1', 'camera:write');
      expect(coreAPIs.camera.setViewOffset).toHaveBeenCalledWith(offset);
    });

    it('should call setZoom', () => {
      const proxy = factory.createProxy('mod1');
      proxy.camera.setZoom(50);
      expect(permissionSystem.requirePermission).toHaveBeenCalledWith('mod1', 'camera:write');
      expect(coreAPIs.camera.setZoom).toHaveBeenCalledWith(50);
    });

    it('should call centerOnPlanet', () => {
      const proxy = factory.createProxy('mod1');
      proxy.camera.centerOnPlanet('Earth');
      expect(permissionSystem.requirePermission).toHaveBeenCalledWith('mod1', 'camera:write');
      expect(coreAPIs.camera.centerOnPlanet).toHaveBeenCalledWith('Earth');
    });

    it('should set up onCameraChange listener with event tracking', () => {
      const proxy = factory.createProxy('mod1');
      const cb = jest.fn();
      const unsub = proxy.camera.onCameraChange(cb);
      expect(permissionSystem.requirePermission).toHaveBeenCalledWith('mod1', 'camera:read');
      expect(sandbox.trackEventListener).toHaveBeenCalledWith('mod1');
      expect(coreAPIs.camera.onCameraChange).toHaveBeenCalledWith(cb);

      unsub();
      expect(sandbox.untrackEventListener).toHaveBeenCalledWith('mod1');
    });
  });

  // ==================== CelestialAPI proxy ====================

  describe('CelestialAPI proxy', () => {
    it('should call getCelestialBodies', () => {
      const proxy = factory.createProxy('mod1');
      const bodies = proxy.celestial.getCelestialBodies();
      expect(permissionSystem.requirePermission).toHaveBeenCalledWith('mod1', 'celestial:read');
      expect(bodies).toEqual([]);
    });

    it('should call getOrbitalElements', () => {
      const proxy = factory.createProxy('mod1');
      proxy.celestial.getOrbitalElements('Earth');
      expect(permissionSystem.requirePermission).toHaveBeenCalledWith('mod1', 'celestial:read');
      expect(coreAPIs.celestial.getOrbitalElements).toHaveBeenCalledWith('Earth');
    });

    it('should call calculatePosition', () => {
      const proxy = factory.createProxy('mod1');
      const elements = { a: 1, e: 0, i: 0, L: 0, w_bar: 0, O: 0 };
      const result = proxy.celestial.calculatePosition(elements, 2451545);
      expect(permissionSystem.requirePermission).toHaveBeenCalledWith('mod1', 'celestial:execute');
      expect(coreAPIs.celestial.calculatePosition).toHaveBeenCalledWith(elements, 2451545);
      expect(result).toEqual({ x: 0, y: 0, z: 0 });
    });

    it('should access ORBITAL_ELEMENTS constant with permission', () => {
      const proxy = factory.createProxy('mod1');
      expect(proxy.celestial.ORBITAL_ELEMENTS).toBeDefined();
      expect(permissionSystem.requirePermission).toHaveBeenCalledWith('mod1', 'celestial:read');
    });

    it('should access CELESTIAL_BODIES constant with permission', () => {
      const proxy = factory.createProxy('mod1');
      expect(proxy.celestial.CELESTIAL_BODIES).toBeDefined();
      expect(permissionSystem.requirePermission).toHaveBeenCalledWith('mod1', 'celestial:read');
    });

    it('should call dateToJulianDay', () => {
      const proxy = factory.createProxy('mod1');
      const date = new Date('2026-01-01');
      const result = proxy.celestial.dateToJulianDay(date);
      expect(permissionSystem.requirePermission).toHaveBeenCalledWith('mod1', 'celestial:execute');
      expect(coreAPIs.celestial.dateToJulianDay).toHaveBeenCalledWith(date);
      expect(result).toBe(2451545);
    });

    it('should call julianDayToDate', () => {
      const proxy = factory.createProxy('mod1');
      const result = proxy.celestial.julianDayToDate(2451545);
      expect(permissionSystem.requirePermission).toHaveBeenCalledWith('mod1', 'celestial:execute');
      expect(coreAPIs.celestial.julianDayToDate).toHaveBeenCalledWith(2451545);
      expect(result).toBeInstanceOf(Date);
    });

    it('should set up onBodiesUpdate listener with event tracking', () => {
      const proxy = factory.createProxy('mod1');
      const cb = jest.fn();
      const unsub = proxy.celestial.onBodiesUpdate(cb);
      expect(permissionSystem.requirePermission).toHaveBeenCalledWith('mod1', 'celestial:read');
      expect(sandbox.trackEventListener).toHaveBeenCalledWith('mod1');
      expect(coreAPIs.celestial.onBodiesUpdate).toHaveBeenCalledWith(cb);

      unsub();
      expect(sandbox.untrackEventListener).toHaveBeenCalledWith('mod1');
    });
  });

  // ==================== SatelliteAPI proxy ====================

  describe('SatelliteAPI proxy', () => {
    it('should read satellites with permission', () => {
      const proxy = factory.createProxy('mod1');
      expect(proxy.satellite.satellites).toEqual([]);
      expect(permissionSystem.requirePermission).toHaveBeenCalledWith('mod1', 'satellite:read');
    });

    it('should read visibleSatellites with permission', () => {
      const proxy = factory.createProxy('mod1');
      expect(proxy.satellite.visibleSatellites).toEqual([]);
      expect(permissionSystem.requirePermission).toHaveBeenCalledWith('mod1', 'satellite:read');
    });

    it('should call fetchSatellites', async () => {
      const proxy = factory.createProxy('mod1');
      await proxy.satellite.fetchSatellites('celestrak');
      expect(permissionSystem.requirePermission).toHaveBeenCalledWith('mod1', 'satellite:write');
      expect(coreAPIs.satellite.fetchSatellites).toHaveBeenCalledWith('celestrak');
    });

    it('should call selectSatellite', () => {
      const proxy = factory.createProxy('mod1');
      proxy.satellite.selectSatellite(25544);
      expect(permissionSystem.requirePermission).toHaveBeenCalledWith('mod1', 'satellite:read');
      expect(coreAPIs.satellite.selectSatellite).toHaveBeenCalledWith(25544);
    });

    it('should call calculateSatellitePosition', () => {
      const proxy = factory.createProxy('mod1');
      const date = new Date();
      proxy.satellite.calculateSatellitePosition(25544, date);
      expect(permissionSystem.requirePermission).toHaveBeenCalledWith('mod1', 'satellite:execute');
      expect(coreAPIs.satellite.calculateSatellitePosition).toHaveBeenCalledWith(25544, date);
    });

    it('should set up onSatellitesUpdate listener with event tracking', () => {
      const proxy = factory.createProxy('mod1');
      const cb = jest.fn();
      const unsub = proxy.satellite.onSatellitesUpdate(cb);
      expect(permissionSystem.requirePermission).toHaveBeenCalledWith('mod1', 'satellite:read');
      expect(sandbox.trackEventListener).toHaveBeenCalledWith('mod1');
      expect(coreAPIs.satellite.onSatellitesUpdate).toHaveBeenCalledWith(cb);

      unsub();
      expect(sandbox.untrackEventListener).toHaveBeenCalledWith('mod1');
    });
  });

  // ==================== RenderAPI proxy ====================

  describe('RenderAPI proxy', () => {
    it('should call registerRenderer with render object tracking', () => {
      const proxy = factory.createProxy('mod1');
      const factoryFn = jest.fn();
      proxy.render.registerRenderer('r1', factoryFn);
      expect(permissionSystem.requirePermission).toHaveBeenCalledWith('mod1', 'render:write');
      expect(sandbox.trackRenderObject).toHaveBeenCalledWith('mod1');
      expect(coreAPIs.render.registerRenderer).toHaveBeenCalledWith('r1', factoryFn);
    });

    it('should call unregisterRenderer with untrack render object', () => {
      const proxy = factory.createProxy('mod1');
      proxy.render.unregisterRenderer('r1');
      expect(permissionSystem.requirePermission).toHaveBeenCalledWith('mod1', 'render:write');
      expect(sandbox.untrackRenderObject).toHaveBeenCalledWith('mod1');
      expect(coreAPIs.render.unregisterRenderer).toHaveBeenCalledWith('r1');
    });

    it('should call getScene', () => {
      const proxy = factory.createProxy('mod1');
      const scene = proxy.render.getScene();
      expect(permissionSystem.requirePermission).toHaveBeenCalledWith('mod1', 'render:read');
      expect(coreAPIs.render.getScene).toHaveBeenCalled();
      expect(scene).toEqual({});
    });

    it('should call getCamera', () => {
      const proxy = factory.createProxy('mod1');
      const cam = proxy.render.getCamera();
      expect(permissionSystem.requirePermission).toHaveBeenCalledWith('mod1', 'render:read');
      expect(coreAPIs.render.getCamera).toHaveBeenCalled();
      expect(cam).toEqual({});
    });

    it('should call getRenderer', () => {
      const proxy = factory.createProxy('mod1');
      const r = proxy.render.getRenderer();
      expect(permissionSystem.requirePermission).toHaveBeenCalledWith('mod1', 'render:read');
      expect(coreAPIs.render.getRenderer).toHaveBeenCalled();
      expect(r).toEqual({});
    });

    it('should call registerCesiumLayer', () => {
      const proxy = factory.createProxy('mod1');
      const opts = { id: 'test', type: 'imagery' as const, url: 'http://test.com' };
      proxy.render.registerCesiumLayer(opts);
      expect(permissionSystem.requirePermission).toHaveBeenCalledWith('mod1', 'render:write');
      expect(coreAPIs.render.registerCesiumLayer).toHaveBeenCalledWith(opts);
    });

    it('should call unregisterCesiumLayer', () => {
      const proxy = factory.createProxy('mod1');
      proxy.render.unregisterCesiumLayer('test-layer');
      expect(permissionSystem.requirePermission).toHaveBeenCalledWith('mod1', 'render:write');
      expect(coreAPIs.render.unregisterCesiumLayer).toHaveBeenCalledWith('test-layer');
    });

    it('should set up onBeforeRender listener with event tracking', () => {
      const proxy = factory.createProxy('mod1');
      const cb = jest.fn();
      const unsub = proxy.render.onBeforeRender(cb);
      expect(permissionSystem.requirePermission).toHaveBeenCalledWith('mod1', 'render:execute');
      expect(sandbox.trackEventListener).toHaveBeenCalledWith('mod1');
      expect(coreAPIs.render.onBeforeRender).toHaveBeenCalledWith(cb);

      unsub();
      expect(sandbox.untrackEventListener).toHaveBeenCalledWith('mod1');
    });

    it('should set up onAfterRender listener with event tracking', () => {
      const proxy = factory.createProxy('mod1');
      const cb = jest.fn();
      const unsub = proxy.render.onAfterRender(cb);
      expect(permissionSystem.requirePermission).toHaveBeenCalledWith('mod1', 'render:execute');
      expect(sandbox.trackEventListener).toHaveBeenCalledWith('mod1');
      expect(coreAPIs.render.onAfterRender).toHaveBeenCalledWith(cb);

      unsub();
      expect(sandbox.untrackEventListener).toHaveBeenCalledWith('mod1');
    });
  });

  // ==================== Permission check ====================

  describe('checkPermission', () => {
    it('should succeed when requirePermission passes', () => {
      permissionSystem.requirePermission.mockReturnValue(undefined);
      const proxy = factory.createProxy('mod1');
      expect(() => { proxy.time.currentTime; }).not.toThrow();
    });

    it('should throw and log when permission is denied on a getter', () => {
      permissionSystem.requirePermission.mockImplementation(() => {
        throw new Error('Permission denied: time:read');
      });

      const proxy = factory.createProxy('mod1');
      expect(() => proxy.time.currentTime).toThrow('Permission denied: time:read');
      expect(permissionSystem.requirePermission).toHaveBeenCalledWith('mod1', 'time:read');
    });

    it('should throw and increment error count when permission is denied on a wrapAPICall method', () => {
      permissionSystem.requirePermission.mockImplementation(() => {
        throw new Error('Permission denied: time:write');
      });

      const proxy = factory.createProxy('mod1');
      expect(() => proxy.time.togglePlayPause()).toThrow('Permission denied: time:write');
      expect(factory.getErrorCount('mod1')).toBe(1);
    });
  });

  // ==================== wrapAPICall ====================

  describe('wrapAPICall', () => {
    it('should execute successfully and log', () => {
      const proxy = factory.createProxy('mod1');
      proxy.time.togglePlayPause();
      const stats = factory.getLogger().getStats('mod1');
      expect(stats.totalCalls).toBe(1);
      expect(stats.successfulCalls).toBe(1);
    });

    it('should re-throw error from core API and still log', () => {
      coreAPIs.time.togglePlayPause.mockImplementation(() => {
        throw new Error('API error');
      });

      const proxy = factory.createProxy('mod1');
      expect(() => proxy.time.togglePlayPause()).toThrow('API error');

      const stats = factory.getLogger().getStats('mod1');
      expect(stats.totalCalls).toBe(1);
      expect(stats.failedCalls).toBe(1);
    });

    it('should re-throw error from quota check', () => {
      sandbox.checkQuota.mockImplementation(() => {
        throw new Error('Quota exceeded');
      });

      const proxy = factory.createProxy('mod1');
      expect(() => proxy.time.togglePlayPause()).toThrow('Quota exceeded');
    });

    it('should log duration info in finally block', () => {
      const proxy = factory.createProxy('mod1');
      proxy.time.setTimeSpeed(5);
      const logs = factory.getLogger().getLogsForMod('mod1');
      expect(logs[0].duration).toBeGreaterThanOrEqual(0);
      expect(logs[0].success).toBe(true);
      expect(logs[0].api).toBe('time');
      expect(logs[0].method).toBe('setTimeSpeed');
    });

    it('should log error details on failure', () => {
      coreAPIs.time.setTimeSpeed.mockImplementation(() => {
        throw new Error('bad speed');
      });

      const proxy = factory.createProxy('mod1');
      expect(() => proxy.time.setTimeSpeed(-1)).toThrow('bad speed');

      const logs = factory.getLogger().getLogsForMod('mod1');
      expect(logs[0].success).toBe(false);
      expect(logs[0].error).toBe('bad speed');
    });
  });

  // ==================== recordError ====================

  describe('recordError', () => {
    it('should start count at 1 for first error', () => {
      coreAPIs.time.togglePlayPause.mockImplementation(() => { throw new Error('err'); });
      const proxy = factory.createProxy('mod1');
      expect(() => proxy.time.togglePlayPause()).toThrow();
      expect(factory.getErrorCount('mod1')).toBe(1);
    });

    it('should increment count for repeated errors within window', () => {
      coreAPIs.time.togglePlayPause.mockImplementation(() => { throw new Error('err'); });
      const proxy = factory.createProxy('mod1');
      for (let i = 0; i < 5; i++) {
        expect(() => proxy.time.togglePlayPause()).toThrow();
      }
      expect(factory.getErrorCount('mod1')).toBe(5);
    });

    it('should reset count when error window elapses', () => {
      jest.useFakeTimers();
      coreAPIs.time.togglePlayPause.mockImplementation(() => { throw new Error('err'); });
      const proxy = factory.createProxy('mod1');
      expect(() => proxy.time.togglePlayPause()).toThrow();
      expect(factory.getErrorCount('mod1')).toBe(1);

      // Advance past the 60s window
      jest.advanceTimersByTime(60001);

      expect(() => proxy.time.togglePlayPause()).toThrow();
      expect(factory.getErrorCount('mod1')).toBe(1); // reset to 1

      jest.useRealTimers();
    });
  });

  // ==================== checkErrorThreshold ====================

  describe('checkErrorThreshold', () => {
    it('should not disable mod when errors are below threshold', () => {
      coreAPIs.time.togglePlayPause.mockImplementation(() => { throw new Error('err'); });
      const proxy = factory.createProxy('mod1');
      for (let i = 0; i < 9; i++) {
        expect(() => proxy.time.togglePlayPause()).toThrow();
      }
      expect(factory.getErrorCount('mod1')).toBe(9);
    });

    it('should trigger disableMod when error count reaches threshold', () => {
      // We need to test that checkErrorThreshold internally calls disableMod.
      // disableMod does a dynamic import, which is mocked above.
      // We can verify by checking the mod lifecycle's disable was called.
      // But since checkErrorThreshold is private, we trigger it through repeated wrapAPICall failures.

      // Mock the dynamic import path — we need the actual mock to work.
      // The disableMod method calls: getRegistry(); const { getModLifecycle } = await import('../core/ModLifecycle');

      // To actually test this properly, we need to ensure the async import resolves to our mock.
      // jest.mock is already hoisted for ModLifecycle.

      coreAPIs.time.togglePlayPause.mockImplementation(() => { throw new Error('err'); });
      const proxy = factory.createProxy('mod1');

      // Trigger 10 errors to hit the threshold
      for (let i = 0; i < 10; i++) {
        expect(() => proxy.time.togglePlayPause()).toThrow();
      }

      // After threshold, error count should be reset (deleted from map)
      expect(factory.getErrorCount('mod1')).toBe(0);
    });
  });

  // ==================== disableMod ====================

  describe('disableMod', () => {
    it('should call disable on ModLifecycle', async () => {
      // Access the private method via any cast
      const disableSpy = jest.fn().mockResolvedValue(undefined);
      // Temporarily replace the mock to capture the call
      const modLifecycleModule = require('@/lib/mod-manager/core/ModLifecycle');
      modLifecycleModule.getModLifecycle = () => ({ disable: disableSpy });

      coreAPIs.time.togglePlayPause.mockImplementation(() => { throw new Error('err'); });
      const proxy = factory.createProxy('mod1');

      for (let i = 0; i < 10; i++) {
        expect(() => proxy.time.togglePlayPause()).toThrow();
      }

      // Wait for async disableMod to complete
      await new Promise(process.nextTick);

      expect(disableSpy).toHaveBeenCalledWith('mod1');
    });
  });

  // ==================== resetErrorCount / getErrorCount ====================

  describe('resetErrorCount / getErrorCount', () => {
    it('should return 0 for mod with no errors', () => {
      const proxy = factory.createProxy('mod1');
      expect(factory.getErrorCount('mod1')).toBe(0);
    });

    it('should return 0 for unknown mod', () => {
      expect(factory.getErrorCount('nonexistent')).toBe(0);
    });

    it('should reset error count to 0', () => {
      coreAPIs.time.togglePlayPause.mockImplementation(() => { throw new Error('err'); });
      const proxy = factory.createProxy('mod1');
      expect(() => proxy.time.togglePlayPause()).toThrow();
      expect(factory.getErrorCount('mod1')).toBe(1);

      factory.resetErrorCount('mod1');
      expect(factory.getErrorCount('mod1')).toBe(0);
    });

    it('should not throw when resetting unknown mod', () => {
      expect(() => factory.resetErrorCount('unknown')).not.toThrow();
    });

    it('should track errors independently per mod', () => {
      coreAPIs.time.togglePlayPause.mockImplementation(() => { throw new Error('err'); });
      const proxyA = factory.createProxy('modA');
      const proxyB = factory.createProxy('modB');

      expect(() => proxyA.time.togglePlayPause()).toThrow();
      expect(factory.getErrorCount('modA')).toBe(1);
      expect(factory.getErrorCount('modB')).toBe(0);

      expect(() => proxyB.time.togglePlayPause()).toThrow();
      expect(factory.getErrorCount('modA')).toBe(1);
      expect(factory.getErrorCount('modB')).toBe(1);

      factory.resetErrorCount('modA');
      expect(factory.getErrorCount('modA')).toBe(0);
      expect(factory.getErrorCount('modB')).toBe(1);
    });
  });

  // ==================== getLogger ====================

  describe('getLogger', () => {
    it('should return an APICallLogger instance', () => {
      expect(factory.getLogger()).toBeInstanceOf(APICallLogger);
    });

    it('should return the same instance across calls', () => {
      const logger1 = factory.getLogger();
      const logger2 = factory.getLogger();
      expect(logger1).toBe(logger2);
    });
  });
});
