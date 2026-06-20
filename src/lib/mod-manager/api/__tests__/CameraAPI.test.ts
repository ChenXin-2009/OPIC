import { CameraAPIImpl, getCameraAPI, resetCameraAPI } from '../CameraAPI';
import { resetEventBus } from '../../core/EventBus';
import { ZOOM_BOUNDS } from '../../types';

jest.mock('../../core/EventBus', () => {
  const actual = jest.requireActual('../../core/EventBus');
  return {
    ...actual,
    getEventBus: jest.fn(() => actual.getEventBus()),
  };
});

describe('CameraAPIImpl', () => {
  let api: CameraAPIImpl;

  beforeEach(() => {
    resetEventBus();
    resetCameraAPI();
    api = new CameraAPIImpl();
  });

  afterEach(() => {
    resetCameraAPI();
    resetEventBus();
  });

  describe('initialization', () => {
    it('should initialize with default values', () => {
      expect(api.cameraDistance).toBe(50);
      expect(api.viewOffset).toEqual({ x: 0, y: 0 });
      expect(api.zoom).toBe(100);
    });

    it('should return a copy of viewOffset', () => {
      const offset = api.viewOffset;
      offset.x = 999;
      expect(api.viewOffset.x).toBe(0);
    });
  });

  describe('setCameraDistance', () => {
    it('should set camera distance', () => {
      api.setCameraDistance(100);
      expect(api.cameraDistance).toBe(100);
    });

    it('should clamp distance to minimum 0.1', () => {
      api.setCameraDistance(-5);
      expect(api.cameraDistance).toBe(0.1);
    });

    it('should clamp distance to minimum 0.1 for zero', () => {
      api.setCameraDistance(0);
      expect(api.cameraDistance).toBe(0.1);
    });

    it('should emit camera:change event', () => {
      const { getEventBus } = require('../../core/EventBus');
      const bus = getEventBus();
      const handler = jest.fn();
      bus.on('camera:change', handler);
      api.setCameraDistance(200);
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(expect.objectContaining({ distance: 200 }));
    });
  });

  describe('setViewOffset', () => {
    it('should set view offset', () => {
      api.setViewOffset({ x: 10, y: 20 });
      expect(api.viewOffset).toEqual({ x: 10, y: 20 });
    });

    it('should store a copy of the offset', () => {
      const offset = { x: 5, y: 10 };
      api.setViewOffset(offset);
      offset.x = 999;
      expect(api.viewOffset.x).toBe(5);
    });
  });

  describe('setZoom', () => {
    it('should set zoom within bounds', () => {
      api.setZoom(150);
      expect(api.zoom).toBe(150);
    });

    it('should clamp zoom to minimum', () => {
      api.setZoom(0);
      expect(api.zoom).toBe(ZOOM_BOUNDS.MIN);
    });

    it('should clamp zoom to maximum', () => {
      api.setZoom(500);
      expect(api.zoom).toBe(ZOOM_BOUNDS.MAX);
    });

    it('should accept boundary values', () => {
      api.setZoom(ZOOM_BOUNDS.MIN);
      expect(api.zoom).toBe(ZOOM_BOUNDS.MIN);
      api.setZoom(ZOOM_BOUNDS.MAX);
      expect(api.zoom).toBe(ZOOM_BOUNDS.MAX);
    });
  });

  describe('centerOnPlanet', () => {
    it('should return true', () => {
      expect(api.centerOnPlanet('Earth')).toBe(true);
    });

    it('should emit camera:focus event', () => {
      const { getEventBus } = require('../../core/EventBus');
      const bus = getEventBus();
      const handler = jest.fn();
      bus.on('camera:focus', handler);
      api.centerOnPlanet('Mars');
      expect(handler).toHaveBeenCalledWith({ planet: 'Mars' });
    });
  });

  describe('onCameraChange', () => {
    it('should call callback on camera change', () => {
      const cb = jest.fn();
      api.onCameraChange(cb);
      api.setCameraDistance(75);
      expect(cb).toHaveBeenCalledTimes(1);
      expect(cb).toHaveBeenCalledWith(
        expect.objectContaining({ distance: 75 })
      );
    });

    it('should return unsubscribe function', () => {
      const cb = jest.fn();
      const unsub = api.onCameraChange(cb);
      unsub();
      api.setCameraDistance(75);
      expect(cb).not.toHaveBeenCalled();
    });

    it('should not throw if callback throws', () => {
      const badCb = jest.fn(() => { throw new Error('boom'); });
      const goodCb = jest.fn();
      api.onCameraChange(badCb);
      api.onCameraChange(goodCb);
      expect(() => api.setCameraDistance(10)).not.toThrow();
      expect(goodCb).toHaveBeenCalled();
    });
  });

  describe('_updateState', () => {
    it('should update distance', () => {
      api._updateState({ distance: 300 });
      expect(api.cameraDistance).toBe(300);
    });

    it('should update offset', () => {
      api._updateState({ offset: { x: 5, y: 6 } });
      expect(api.viewOffset).toEqual({ x: 5, y: 6 });
    });

    it('should update zoom', () => {
      api._updateState({ zoom: 50 });
      expect(api.zoom).toBe(50);
    });

    it('should not overwrite fields not in partial', () => {
      api._updateState({ distance: 200 });
      expect(api.cameraDistance).toBe(200);
      expect(api.zoom).toBe(100);
    });
  });
});

describe('CameraAPI singleton', () => {
  afterEach(() => {
    resetCameraAPI();
    resetEventBus();
  });

  it('should return same instance', () => {
    const a = getCameraAPI();
    const b = getCameraAPI();
    expect(a).toBe(b);
  });

  it('should reset singleton', () => {
    const a = getCameraAPI();
    resetCameraAPI();
    const b = getCameraAPI();
    expect(a).not.toBe(b);
  });
});
