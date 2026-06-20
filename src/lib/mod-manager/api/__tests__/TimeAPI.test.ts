import { TimeAPIImpl, getTimeAPI, resetTimeAPI } from '../TimeAPI';
import { resetEventBus } from '../../core/EventBus';
import { TIME_SPEED_BOUNDS } from '../../types';

jest.mock('../../core/EventBus', () => {
  const actual = jest.requireActual('../../core/EventBus');
  return {
    ...actual,
    getEventBus: jest.fn(() => actual.getEventBus()),
  };
});

describe('TimeAPIImpl', () => {
  let api: TimeAPIImpl;

  beforeEach(() => {
    resetEventBus();
    resetTimeAPI();
    api = new TimeAPIImpl();
  });

  afterEach(() => {
    resetTimeAPI();
    resetEventBus();
  });

  describe('initialization', () => {
    it('should initialize with default values', () => {
      expect(api.currentTime).toBeInstanceOf(Date);
      expect(api.isPlaying).toBe(true);
      expect(api.timeSpeed).toBe(1);
      expect(api.playDirection).toBe('forward');
    });

    it('should return a copy of currentTime', () => {
      const t1 = api.currentTime;
      t1.setFullYear(2000);
      const t2 = api.currentTime;
      expect(t2.getFullYear()).not.toBe(2000);
    });
  });

  describe('setCurrentTime', () => {
    it('should set current time', () => {
      const date = new Date(Date.UTC(2023, 0, 1));
      api.setCurrentTime(date);
      expect(api.currentTime.getUTCFullYear()).toBe(2023);
      expect(api.currentTime.getUTCMonth()).toBe(0);
    });

    it('should store a copy', () => {
      const date = new Date(Date.UTC(2023, 0, 1));
      api.setCurrentTime(date);
      date.setFullYear(2000);
      expect(api.currentTime.getUTCFullYear()).toBe(2023);
    });

    it('should emit time:change event', () => {
      const { getEventBus } = require('../../core/EventBus');
      const bus = getEventBus();
      const handler = jest.fn();
      bus.on('time:change', handler);
      const date = new Date(Date.UTC(2023, 0, 1));
      api.setCurrentTime(date);
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(expect.objectContaining({ time: expect.any(Date) }));
    });
  });

  describe('togglePlayPause', () => {
    it('should toggle from playing to paused', () => {
      expect(api.isPlaying).toBe(true);
      api.togglePlayPause();
      expect(api.isPlaying).toBe(false);
    });

    it('should toggle from paused to playing', () => {
      api.togglePlayPause();
      expect(api.isPlaying).toBe(false);
      api.togglePlayPause();
      expect(api.isPlaying).toBe(true);
    });

    it('should emit time:play-state-change event', () => {
      const { getEventBus } = require('../../core/EventBus');
      const bus = getEventBus();
      const handler = jest.fn();
      bus.on('time:play-state-change', handler);
      api.togglePlayPause();
      expect(handler).toHaveBeenCalledWith({ isPlaying: false });
    });
  });

  describe('setTimeSpeed', () => {
    it('should set time speed within bounds', () => {
      api.setTimeSpeed(10);
      expect(api.timeSpeed).toBe(10);
    });

    it('should clamp speed to minimum', () => {
      api.setTimeSpeed(-1);
      expect(api.timeSpeed).toBe(TIME_SPEED_BOUNDS.MIN);
    });

    it('should clamp speed to maximum', () => {
      api.setTimeSpeed(9999);
      expect(api.timeSpeed).toBe(TIME_SPEED_BOUNDS.MAX);
    });

    it('should accept boundary values', () => {
      api.setTimeSpeed(TIME_SPEED_BOUNDS.MIN);
      expect(api.timeSpeed).toBe(TIME_SPEED_BOUNDS.MIN);
      api.setTimeSpeed(TIME_SPEED_BOUNDS.MAX);
      expect(api.timeSpeed).toBe(TIME_SPEED_BOUNDS.MAX);
    });

    it('should emit time:speed-change event', () => {
      const { getEventBus } = require('../../core/EventBus');
      const bus = getEventBus();
      const handler = jest.fn();
      bus.on('time:speed-change', handler);
      api.setTimeSpeed(5);
      expect(handler).toHaveBeenCalledWith({ speed: 5 });
    });
  });

  describe('setPlayDirection', () => {
    it('should set forward direction', () => {
      api.setPlayDirection('forward');
      expect(api.playDirection).toBe('forward');
    });

    it('should set backward direction', () => {
      api.setPlayDirection('backward');
      expect(api.playDirection).toBe('backward');
    });

    it('should emit time:direction-change event', () => {
      const { getEventBus } = require('../../core/EventBus');
      const bus = getEventBus();
      const handler = jest.fn();
      bus.on('time:direction-change', handler);
      api.setPlayDirection('backward');
      expect(handler).toHaveBeenCalledWith({ direction: 'backward' });
    });
  });

  describe('onTimeChange', () => {
    it('should call callback on time change', () => {
      const cb = jest.fn();
      api.onTimeChange(cb);
      api.setCurrentTime(new Date(Date.UTC(2023, 0, 1)));
      expect(cb).toHaveBeenCalledTimes(1);
    });

    it('should return unsubscribe function', () => {
      const cb = jest.fn();
      const unsub = api.onTimeChange(cb);
      unsub();
      api.setCurrentTime(new Date(Date.UTC(2023, 0, 1)));
      expect(cb).not.toHaveBeenCalled();
    });

    it('should not throw if callback throws', () => {
      const badCb = jest.fn(() => { throw new Error('boom'); });
      const goodCb = jest.fn();
      api.onTimeChange(badCb);
      api.onTimeChange(goodCb);
      expect(() => api.setCurrentTime(new Date())).not.toThrow();
      expect(goodCb).toHaveBeenCalled();
    });
  });

  describe('_updateTime', () => {
    it('should update time', () => {
      const date = new Date(Date.UTC(2025, 6, 4));
      api._updateTime(date);
      expect(api.currentTime.getUTCFullYear()).toBe(2025);
    });

    it('should store a copy', () => {
      const date = new Date(Date.UTC(2025, 6, 4));
      api._updateTime(date);
      date.setFullYear(2000);
      expect(api.currentTime.getUTCFullYear()).toBe(2025);
    });

    it('should emit time:change event', () => {
      const { getEventBus } = require('../../core/EventBus');
      const bus = getEventBus();
      const handler = jest.fn();
      bus.on('time:change', handler);
      api._updateTime(new Date());
      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  describe('_setPlaying', () => {
    it('should set playing state', () => {
      api._setPlaying(false);
      expect(api.isPlaying).toBe(false);
    });

    it('should set playing to true', () => {
      api._setPlaying(false);
      api._setPlaying(true);
      expect(api.isPlaying).toBe(true);
    });
  });
});

describe('TimeAPI singleton', () => {
  afterEach(() => {
    resetTimeAPI();
    resetEventBus();
  });

  it('should return same instance', () => {
    const a = getTimeAPI();
    const b = getTimeAPI();
    expect(a).toBe(b);
  });

  it('should reset singleton', () => {
    const a = getTimeAPI();
    resetTimeAPI();
    const b = getTimeAPI();
    expect(a).not.toBe(b);
  });
});
