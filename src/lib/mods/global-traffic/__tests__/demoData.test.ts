import { DEMO_TRADE_ROUTES, DEMO_AIR_ROUTES, MAJOR_PORTS, MAJOR_AIRPORTS } from '../demoData';

describe('global-traffic demo data', () => {
  it('exports trade routes', () => {
    expect(DEMO_TRADE_ROUTES.length).toBeGreaterThan(0);
  });

  it('every trade route has required fields', () => {
    for (const route of DEMO_TRADE_ROUTES) {
      expect(route.id).toBeTruthy();
      expect(route.name).toBeTruthy();
      expect(route.type).toMatch(/^(sea|air)$/);
      expect(route.waypoints.length).toBeGreaterThan(1);
      expect(route.color).toMatch(/^#/);
    }
  });

  it('exports air routes', () => {
    expect(DEMO_AIR_ROUTES.length).toBeGreaterThan(0);
  });

  it('exports major ports', () => {
    expect(MAJOR_PORTS.length).toBeGreaterThan(0);
  });

  it('every port has required fields', () => {
    for (const port of MAJOR_PORTS) {
      expect(port.id).toBeTruthy();
      expect(port.name).toBeTruthy();
      expect(port.lat).toBeGreaterThanOrEqual(-90);
      expect(port.lat).toBeLessThanOrEqual(90);
      expect(port.lon).toBeGreaterThanOrEqual(-180);
      expect(port.lon).toBeLessThanOrEqual(180);
    }
  });

  it('exports major airports', () => {
    expect(MAJOR_AIRPORTS.length).toBeGreaterThan(0);
  });
});
