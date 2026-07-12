import { rendererStore } from '../rendererStore';

describe('rendererStore', () => {
  it('should start with null renderers', () => {
    expect(rendererStore.getSpaceLaunchesRenderer()).toBeNull();
    expect(rendererStore.getGlobalTrafficRenderer()).toBeNull();
    expect(rendererStore.getWeatherDisasterRenderer()).toBeNull();
    expect(rendererStore.getSpaceFlightRenderer()).toBeNull();
    expect(rendererStore.getGravityGridRenderer()).toBeNull();
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

  it('should set and get space flight renderer', () => {
    const mockRenderer = { sync: jest.fn(), getGroup: jest.fn() } as any;
    rendererStore.setSpaceFlightRenderer(mockRenderer);
    expect(rendererStore.getSpaceFlightRenderer()).toBe(mockRenderer);
    rendererStore.setSpaceFlightRenderer(null);
    expect(rendererStore.getSpaceFlightRenderer()).toBeNull();
  });

  it('should set and get gravity grid renderer', () => {
    const mockRenderer = { update: jest.fn(), group: {} } as any;
    rendererStore.setGravityGridRenderer(mockRenderer);
    expect(rendererStore.getGravityGridRenderer()).toBe(mockRenderer);
    rendererStore.setGravityGridRenderer(null);
    expect(rendererStore.getGravityGridRenderer()).toBeNull();
  });

  it('each renderer slot is independent', () => {
    const mockA = { id: 'a' } as any;
    const mockB = { id: 'b' } as any;
    rendererStore.setSpaceFlightRenderer(mockA);
    rendererStore.setGravityGridRenderer(mockB);
    expect(rendererStore.getSpaceFlightRenderer()).toBe(mockA);
    expect(rendererStore.getGravityGridRenderer()).toBe(mockB);
    expect(rendererStore.getSpaceLaunchesRenderer()).toBeNull();
    rendererStore.setSpaceFlightRenderer(null);
    rendererStore.setGravityGridRenderer(null);
  });
});
