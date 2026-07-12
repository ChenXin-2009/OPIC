import { create } from 'zustand';
import { createTimeSlice } from '../timeSlice';
import type { TimeSlice } from '../timeSlice';

type TestStore = TimeSlice & { celestialBodies: any[] };

jest.mock('../astronomy/orbit', () => ({
  getCelestialBodies: jest.fn().mockResolvedValue([{ name: 'Earth', x: 0, y: 0 }]),
}));

describe('createTimeSlice', () => {
  const createTestStore = () => create<TestStore>()((...a) => ({
    ...createTimeSlice(...a),
    celestialBodies: [],
  }));

  it('has initial state', () => {
    const store = createTestStore();
    expect(store.getState().isPlaying).toBe(true);
    expect(store.getState().timeSpeed).toBe(1 / 86400);
    expect(store.getState().playDirection).toBe('forward');
  });

  it('togglePlayPause toggles isPlaying', () => {
    const store = createTestStore();
    store.getState().togglePlayPause();
    expect(store.getState().isPlaying).toBe(false);
    store.getState().togglePlayPause();
    expect(store.getState().isPlaying).toBe(true);
  });

  it('setTimeSpeed clamps speed between 0.1 and 365', () => {
    const store = createTestStore();
    store.getState().setTimeSpeed(0.01);
    expect(store.getState().timeSpeed).toBe(0.1);
    store.getState().setTimeSpeed(1000);
    expect(store.getState().timeSpeed).toBe(365);
    store.getState().setTimeSpeed(50);
    expect(store.getState().timeSpeed).toBe(50);
  });

  it('setPlayDirection sets direction', () => {
    const store = createTestStore();
    store.getState().setPlayDirection('backward');
    expect(store.getState().playDirection).toBe('backward');
  });

  it('startPlaying sets speed, direction, and playing', () => {
    const store = createTestStore();
    store.getState().startPlaying(100, 'backward');
    expect(store.getState().isPlaying).toBe(true);
    expect(store.getState().timeSpeed).toBe(100);
    expect(store.getState().playDirection).toBe('backward');
  });

  it('startPlaying clamps speed between 1/86400 and 1095', () => {
    const store = createTestStore();
    store.getState().startPlaying(0.00001, 'forward');
    expect(store.getState().timeSpeed).toBe(1 / 86400);
    store.getState().startPlaying(5000, 'forward');
    expect(store.getState().timeSpeed).toBe(1095);
  });

  it('tick does nothing when paused', () => {
    const store = createTestStore();
    const initialTime = store.getState().currentTime;
    store.getState().togglePlayPause();
    store.getState().tick(1);
    expect(store.getState().currentTime.getTime()).toBe(initialTime.getTime());
  });

  it('tick advances time forward', () => {
    const store = createTestStore();
    const initialTime = store.getState().currentTime;
    store.getState().tick(86400); // 1 day at 1/86400 speed = 1 simulated day
    const newTime = store.getState().currentTime;
    expect(newTime.getTime()).toBeGreaterThan(initialTime.getTime());
  });

  it('resetToNow sets currentTime and pauses', async () => {
    const store = createTestStore();
    store.getState().resetToNow();
    const state = store.getState();
    expect(state.isPlaying).toBe(false);
    expect(state.currentTime).toBeDefined();
  });
});
