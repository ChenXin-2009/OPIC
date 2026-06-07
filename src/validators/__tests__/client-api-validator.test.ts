import { ClientAPIValidator } from '../client-api-validator';

describe('ClientAPIValidator', () => {
  const validator = new ClientAPIValidator();

  it('should return API configs', () => {
    const configs = validator.getClientAPIConfigs();
    expect(configs.length).toBeGreaterThan(0);
    expect(configs[0].name).toBeDefined();
  });

  it('should validate all APIs (may fail in test env but should not throw)', async () => {
    const results = await validator.validateAllAPIs();
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBe(5);
    results.forEach(r => {
      expect(r.name).toBeDefined();
      expect(r.timestamp).toBeInstanceOf(Date);
    });
  });
});
