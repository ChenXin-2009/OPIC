import { APIProxyFactory } from '../APIProxyFactory';
import { APICallLogger } from '../APICallLogger';

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
      fetchSatellites: jest.fn().mockResolvedValue([]),
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

// Mock the module-level singletons
jest.mock('@/lib/mod-manager/error/ErrorLogger', () => ({
  getErrorLogger: () => ({ log: jest.fn() }),
}));

jest.mock('@/lib/mod-manager/core/ModRegistry', () => ({
  getRegistry: () => ({ get: jest.fn() }),
}));

jest.mock('@/lib/mod-manager/core/ModLifecycle', () => ({
  getModLifecycle: () => ({ disable: jest.fn() }),
}));

describe('APIProxyFactory', () => {
  let factory: APIProxyFactory;
  let permissionSystem: ReturnType<typeof createMockPermissionSystem>;
  let sandbox: ReturnType<typeof createMockSandbox>;
  let coreAPIs: ReturnType<typeof createCoreAPIs>;

  beforeEach(() => {
    permissionSystem = createMockPermissionSystem();
    sandbox = createMockSandbox();
    coreAPIs = createCoreAPIs();
    factory = new APIProxyFactory(permissionSystem, sandbox, coreAPIs);
  });

  describe('createProxy', () => {
    it('should return proxy with all API namespaces', () => {
      const proxy = factory.createProxy('mod1');
      expect(proxy.time).toBeDefined();
      expect(proxy.camera).toBeDefined();
      expect(proxy.celestial).toBeDefined();
      expect(proxy.satellite).toBeDefined();
      expect(proxy.render).toBeDefined();
    });
  });

  describe('TimeAPI proxy', () => {
    it('should read currentTime with permission check', () => {
      const proxy = factory.createProxy('mod1');
      const value = proxy.time.currentTime;
      expect(permissionSystem.requirePermission).toHaveBeenCalledWith('mod1', 'time:read');
      expect(value).toBeInstanceOf(Date);
    });

    it('should call setCurrentTime with permission check', () => {
      const proxy = factory.createProxy('mod1');
      const date = new Date('2026-06-01');
      proxy.time.setCurrentTime(date);
      expect(permissionSystem.requirePermission).toHaveBeenCalledWith('mod1', 'time:write');
      expect(coreAPIs.time.setCurrentTime).toHaveBeenCalledWith(date);
    });

    it('should call togglePlayPause', () => {
      const proxy = factory.createProxy('mod1');
      proxy.time.togglePlayPause();
      expect(coreAPIs.time.togglePlayPause).toHaveBeenCalled();
    });

    it('should call setTimeSpeed', () => {
      const proxy = factory.createProxy('mod1');
      proxy.time.setTimeSpeed(10);
      expect(coreAPIs.time.setTimeSpeed).toHaveBeenCalledWith(10);
    });

    it('should set up time change listener with event tracking', () => {
      const proxy = factory.createProxy('mod1');
      const cb = jest.fn();
      const unsub = proxy.time.onTimeChange(cb);
      expect(sandbox.trackEventListener).toHaveBeenCalledWith('mod1');
      expect(coreAPIs.time.onTimeChange).toHaveBeenCalledWith(cb);

      unsub();
      expect(sandbox.untrackEventListener).toHaveBeenCalledWith('mod1');
    });

    it('should log API calls', () => {
      const proxy = factory.createProxy('mod1');
      proxy.time.togglePlayPause();
      expect(factory.getLogger().size).toBeGreaterThan(0);
    });
  });

  describe('CameraAPI proxy', () => {
    it('should read cameraDistance', () => {
      const proxy = factory.createProxy('mod1');
      expect(proxy.camera.cameraDistance).toBe(1000);
      expect(permissionSystem.requirePermission).toHaveBeenCalledWith('mod1', 'camera:read');
    });

    it('should call setCameraDistance', () => {
      const proxy = factory.createProxy('mod1');
      proxy.camera.setCameraDistance(2000);
      expect(coreAPIs.camera.setCameraDistance).toHaveBeenCalledWith(2000);
    });

    it('should call centerOnPlanet', () => {
      const proxy = factory.createProxy('mod1');
      proxy.camera.centerOnPlanet('Earth');
      expect(coreAPIs.camera.centerOnPlanet).toHaveBeenCalledWith('Earth');
    });
  });

  describe('CelestialAPI proxy', () => {
    it('should call getCelestialBodies', () => {
      const proxy = factory.createProxy('mod1');
      const bodies = proxy.celestial.getCelestialBodies();
      expect(bodies).toEqual([]);
    });

    it('should call getOrbitalElements', () => {
      const proxy = factory.createProxy('mod1');
      proxy.celestial.getOrbitalElements('Earth');
      expect(coreAPIs.celestial.getOrbitalElements).toHaveBeenCalledWith('Earth');
    });

    it('should access ORBITAL_ELEMENTS constant', () => {
      const proxy = factory.createProxy('mod1');
      expect(proxy.celestial.ORBITAL_ELEMENTS).toBeDefined();
    });
  });

  describe('SatelliteAPI proxy', () => {
    it('should read satellites', () => {
      const proxy = factory.createProxy('mod1');
      expect(proxy.satellite.satellites).toEqual([]);
      expect(permissionSystem.requirePermission).toHaveBeenCalledWith('mod1', 'satellite:read');
    });

    it('should call fetchSatellites', async () => {
      const proxy = factory.createProxy('mod1');
      await proxy.satellite.fetchSatellites('celestrak');
      expect(coreAPIs.satellite.fetchSatellites).toHaveBeenCalledWith('celestrak');
    });
  });

  describe('RenderAPI proxy', () => {
    it('should call registerRenderer', () => {
      const proxy = factory.createProxy('mod1');
      const factory_fn = jest.fn();
      proxy.render.registerRenderer('r1', factory_fn);
      expect(coreAPIs.render.registerRenderer).toHaveBeenCalledWith('r1', factory_fn);
      expect(sandbox.trackRenderObject).toHaveBeenCalledWith('mod1');
    });

    it('should call getScene', () => {
      const proxy = factory.createProxy('mod1');
      expect(proxy.render.getScene()).toEqual({});
    });

    it('should set up onBeforeRender listener', () => {
      const proxy = factory.createProxy('mod1');
      const cb = jest.fn();
      const unsub = proxy.render.onBeforeRender(cb);
      expect(sandbox.trackEventListener).toHaveBeenCalledWith('mod1');

      unsub();
      expect(sandbox.untrackEventListener).toHaveBeenCalledWith('mod1');
    });
  });

  describe('error handling', () => {
    it('should propagate permission errors', () => {
      permissionSystem.requirePermission.mockImplementation(() => {
        throw new Error('Permission denied');
      });

      const proxy = factory.createProxy('mod1');
      expect(() => proxy.time.currentTime).toThrow('Permission denied');
    });

    it('should log errors for failed calls', () => {
      coreAPIs.time.togglePlayPause.mockImplementation(() => {
        throw new Error('API error');
      });

      const proxy = factory.createProxy('mod1');
      expect(() => proxy.time.togglePlayPause()).toThrow('API error');
      expect(factory.getLogger().size).toBeGreaterThan(0);
    });

    it('should track error count', () => {
      coreAPIs.time.togglePlayPause.mockImplementation(() => {
        throw new Error('fail');
      });

      const proxy = factory.createProxy('mod1');
      expect(() => proxy.time.togglePlayPause()).toThrow();
      expect(factory.getErrorCount('mod1')).toBe(1);
    });

    it('should reset error count', () => {
      coreAPIs.time.togglePlayPause.mockImplementation(() => {
        throw new Error('fail');
      });

      const proxy = factory.createProxy('mod1');
      expect(() => proxy.time.togglePlayPause()).toThrow();
      factory.resetErrorCount('mod1');
      expect(factory.getErrorCount('mod1')).toBe(0);
    });
  });

  describe('quota check', () => {
    it('should check quota on API calls', () => {
      const proxy = factory.createProxy('mod1');
      proxy.time.togglePlayPause();
      expect(sandbox.checkQuota).toHaveBeenCalledWith('mod1', 'apiCallsLastSecond');
    });
  });

  describe('getLogger', () => {
    it('should return APICallLogger instance', () => {
      expect(factory.getLogger()).toBeInstanceOf(APICallLogger);
    });
  });
});
