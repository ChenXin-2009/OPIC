import { RenderAPIImpl, getRenderAPI, resetRenderAPI } from '../RenderAPI';
import { resetEventBus } from '../../core/EventBus';

jest.mock('../../core/EventBus', () => {
  const actual = jest.requireActual('../../core/EventBus');
  return {
    ...actual,
    getEventBus: jest.fn(() => actual.getEventBus()),
  };
});

describe('RenderAPIImpl', () => {
  let api: RenderAPIImpl;

  beforeEach(() => {
    resetEventBus();
    resetRenderAPI();
    api = new RenderAPIImpl();
  });

  afterEach(() => {
    resetRenderAPI();
    resetEventBus();
  });

  describe('initialization', () => {
    it('should initialize with no renderers', () => {
      expect(api.getRendererIds()).toEqual([]);
    });

    it('should initialize with no cesium layers', () => {
      expect(api.getCesiumLayerIds()).toEqual([]);
    });
  });

  describe('getScene', () => {
    it('should throw if scene not set', () => {
      expect(() => api.getScene()).toThrow('场景未初始化');
    });

    it('should return scene after setting', () => {
      const scene = { add: jest.fn() };
      api._setThreeContext(scene, null, null);
      expect(api.getScene()).toBe(scene);
    });
  });

  describe('getCamera', () => {
    it('should throw if camera not set', () => {
      expect(() => api.getCamera()).toThrow('相机未初始化');
    });

    it('should return camera after setting', () => {
      const camera = {};
      api._setThreeContext(null, camera, null);
      expect(api.getCamera()).toBe(camera);
    });
  });

  describe('getRenderer', () => {
    it('should throw if renderer not set', () => {
      expect(() => api.getRenderer()).toThrow('渲染器未初始化');
    });

    it('should return renderer after setting', () => {
      const renderer = {};
      api._setThreeContext(null, null, renderer);
      expect(api.getRenderer()).toBe(renderer);
    });
  });

  describe('registerRenderer', () => {
    it('should register a renderer', () => {
      api._setCurrentModId('mod1');
      const factory = jest.fn(() => ({ type: 'mesh' }));
      api.registerRenderer('myRenderer', factory);
      expect(api.getRendererIds()).toContain('mod1:myRenderer');
    });

    it('should add object3D to scene', () => {
      const object3D = { type: 'mesh' };
      const scene = { add: jest.fn() };
      api._setThreeContext(scene, null, null);
      api._setCurrentModId('mod1');
      const factory = jest.fn(() => object3D);
      api.registerRenderer('r1', factory);
      expect(scene.add).toHaveBeenCalledWith(object3D);
    });

    it('should emit renderer:registered event', () => {
      const { getEventBus } = require('../../core/EventBus');
      const bus = getEventBus();
      const handler = jest.fn();
      bus.on('renderer:registered', handler);
      api._setCurrentModId('mod1');
      api.registerRenderer('r1', jest.fn());
      expect(handler).toHaveBeenCalledWith({ id: 'mod1:r1', modId: 'mod1' });
    });

    it('should not throw if factory throws', () => {
      const scene = { add: jest.fn() };
      api._setThreeContext(scene, null, null);
      api._setCurrentModId('mod1');
      const factory = jest.fn(() => { throw new Error('fail'); });
      expect(() => api.registerRenderer('r1', factory)).not.toThrow();
    });

    it('should warn on duplicate registration', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
      api._setCurrentModId('mod1');
      api.registerRenderer('r1', jest.fn());
      api.registerRenderer('r1', jest.fn());
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });
  });

  describe('unregisterRenderer', () => {
    it('should remove renderer', () => {
      api._setCurrentModId('mod1');
      api.registerRenderer('r1', jest.fn());
      api.unregisterRenderer('r1');
      expect(api.getRendererIds()).not.toContain('mod1:r1');
    });

    it('should emit renderer:unregistered event', () => {
      const { getEventBus } = require('../../core/EventBus');
      const bus = getEventBus();
      const handler = jest.fn();
      bus.on('renderer:unregistered', handler);
      api._setCurrentModId('mod1');
      api.registerRenderer('r1', jest.fn());
      api.unregisterRenderer('r1');
      expect(handler).toHaveBeenCalledWith({ id: 'mod1:r1' });
    });

    it('should remove object3D from scene and dispose', () => {
      const dispose = jest.fn();
      const object3D = { dispose };
      const scene = { add: jest.fn(), remove: jest.fn() };
      api._setThreeContext(scene, null, null);
      api._setCurrentModId('mod1');
      const factory = jest.fn(() => object3D);
      api.registerRenderer('r1', factory);
      api.unregisterRenderer('r1');
      expect(scene.remove).toHaveBeenCalledWith(object3D);
      expect(dispose).toHaveBeenCalled();
    });

    it('should handle unregister with full id', () => {
      api._setCurrentModId('mod1');
      api.registerRenderer('r1', jest.fn());
      api.unregisterRenderer('mod1:r1');
      expect(api.getRendererIds()).not.toContain('mod1:r1');
    });

    it('should handle unregister of non-existent renderer', () => {
      expect(() => api.unregisterRenderer('nonexistent')).not.toThrow();
    });
  });

  describe('registerCesiumLayer', () => {
    it('should register a cesium layer', () => {
      api.registerCesiumLayer({ id: 'layer1', type: 'imagery', url: 'http://example.com' });
      expect(api.getCesiumLayerIds()).toContain('layer1');
    });

    it('should emit cesium:layer-registered event', () => {
      const { getEventBus } = require('../../core/EventBus');
      const bus = getEventBus();
      const handler = jest.fn();
      bus.on('cesium:layer-registered', handler);
      const opts = { id: 'layer1', type: 'imagery' as const, url: 'http://example.com' };
      api.registerCesiumLayer(opts);
      expect(handler).toHaveBeenCalledWith(opts);
    });

    it('should warn on duplicate layer registration', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
      api.registerCesiumLayer({ id: 'layer1', type: 'imagery', url: 'a' });
      api.registerCesiumLayer({ id: 'layer1', type: 'imagery', url: 'b' });
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });
  });

  describe('unregisterCesiumLayer', () => {
    it('should remove cesium layer', () => {
      api.registerCesiumLayer({ id: 'layer1', type: 'imagery', url: 'a' });
      api.unregisterCesiumLayer('layer1');
      expect(api.getCesiumLayerIds()).not.toContain('layer1');
    });

    it('should emit cesium:layer-unregistered event', () => {
      const { getEventBus } = require('../../core/EventBus');
      const bus = getEventBus();
      const handler = jest.fn();
      bus.on('cesium:layer-unregistered', handler);
      api.registerCesiumLayer({ id: 'layer1', type: 'imagery', url: 'a' });
      api.unregisterCesiumLayer('layer1');
      expect(handler).toHaveBeenCalledWith({ id: 'layer1' });
    });

    it('should not emit event if layer not found', () => {
      const { getEventBus } = require('../../core/EventBus');
      const bus = getEventBus();
      const handler = jest.fn();
      bus.on('cesium:layer-unregistered', handler);
      api.unregisterCesiumLayer('nonexistent');
      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('onBeforeRender / onAfterRender', () => {
    it('should return unsubscribe function for onBeforeRender', () => {
      const cb = jest.fn();
      const unsub = api.onBeforeRender(cb);
      unsub();
      api._executeBeforeRender();
      expect(cb).not.toHaveBeenCalled();
    });

    it('should call before render callbacks', () => {
      const cb = jest.fn();
      api.onBeforeRender(cb);
      api._executeBeforeRender();
      expect(cb).toHaveBeenCalledTimes(1);
    });

    it('should call after render callbacks', () => {
      const cb = jest.fn();
      api.onAfterRender(cb);
      api._executeAfterRender();
      expect(cb).toHaveBeenCalledTimes(1);
    });

    it('should not throw if before render callback throws', () => {
      api.onBeforeRender(() => { throw new Error('boom'); });
      expect(() => api._executeBeforeRender()).not.toThrow();
    });

    it('should not throw if after render callback throws', () => {
      api.onAfterRender(() => { throw new Error('boom'); });
      expect(() => api._executeAfterRender()).not.toThrow();
    });

    it('should return unsubscribe function for onAfterRender', () => {
      const cb = jest.fn();
      const unsub = api.onAfterRender(cb);
      unsub();
      api._executeAfterRender();
      expect(cb).not.toHaveBeenCalled();
    });
  });

  describe('_cleanupMod', () => {
    it('should remove all renderers for a mod', () => {
      api._setCurrentModId('mod1');
      api.registerRenderer('r1', jest.fn());
      api.registerRenderer('r2', jest.fn());
      api._setCurrentModId('mod2');
      api.registerRenderer('r3', jest.fn());

      api._cleanupMod('mod1');
      const ids = api.getRendererIds();
      expect(ids).not.toContain('mod1:r1');
      expect(ids).not.toContain('mod1:r2');
      expect(ids).toContain('mod2:r3');
    });
  });
});

describe('RenderAPI singleton', () => {
  afterEach(() => {
    resetRenderAPI();
    resetEventBus();
  });

  it('should return same instance', () => {
    const a = getRenderAPI();
    const b = getRenderAPI();
    expect(a).toBe(b);
  });

  it('should reset singleton', () => {
    const a = getRenderAPI();
    resetRenderAPI();
    const b = getRenderAPI();
    expect(a).not.toBe(b);
  });
});
