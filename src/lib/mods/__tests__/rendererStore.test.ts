import { rendererStore } from '../rendererStore';

describe('rendererStore', () => {
  it('should start with null renderers', () => {
    expect(rendererStore.getSpaceLaunchesRenderer()).toBeNull();
    expect(rendererStore.getGlobalTrafficRenderer()).toBeNull();
    expect(rendererStore.getWeatherDisasterRenderer()).toBeNull();
  });

  it('should set and get space launches renderer', () => {
    const mockRenderer = { launch: jest.fn() } as any;
    rendererStore.setSpaceLaunchesRenderer(mockRenderer);
    expect(rendererStore.getSpaceLaunchesRenderer()).toBe(mockRenderer);
    rendererStore.setSpaceLaunchesRenderer(null);
    expect(rendererStore.getSpaceLaunchesRenderer()).toBeNull();
  });

  it('should set and get global traffic renderer', () => {
    const mockRenderer = { update: jest.fn() } as any;
    rendererStore.setGlobalTrafficRenderer(mockRenderer);
    expect(rendererStore.getGlobalTrafficRenderer()).toBe(mockRenderer);
    rendererStore.setGlobalTrafficRenderer(null);
    expect(rendererStore.getGlobalTrafficRenderer()).toBeNull();
  });

  it('should set and get weather disaster renderer', () => {
    const mockRenderer = { alert: jest.fn() } as any;
    rendererStore.setWeatherDisasterRenderer(mockRenderer);
    expect(rendererStore.getWeatherDisasterRenderer()).toBe(mockRenderer);
    rendererStore.setWeatherDisasterRenderer(null);
    expect(rendererStore.getWeatherDisasterRenderer()).toBeNull();
  });
});
