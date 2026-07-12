import { ClientAPIValidator } from '../client-api-validator';

describe('ClientAPIValidator', () => {
  const validator = new ClientAPIValidator();

  it('should return API configs', () => {
    const configs = validator.getClientAPIConfigs();
    expect(configs.length).toBeGreaterThan(0);
    expect(configs[0].name).toBeDefined();
  });

  it('should validate all APIs without throwing', async () => {
    const results = await validator.validateAllAPIs();
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBe(5);
    results.forEach(r => {
      expect(r.name).toBeDefined();
      expect(r.timestamp).toBeInstanceOf(Date);
    });
  });

  it('validateSingletonPattern detects getInstance', () => {
    const v = validator as any;
    expect(v.validateSingletonPattern({ getInstance: () => {} })).toBe(true);
  });

  it('validateSingletonPattern returns true for class without getInstance', () => {
    const v = validator as any;
    expect(v.validateSingletonPattern(class {})).toBe(false);
  });

  it('validateSingletonPattern detects exported instance', () => {
    const v = validator as any;
    const instance = { foo: 'bar' };
    expect(v.validateSingletonPattern(instance)).toBe(true);
  });

  it('validateSingletonPattern detects instance property on constructor', () => {
    const v = validator as any;
    const Ctor = function() {} as any;
    Ctor.instance = {};
    expect(v.validateSingletonPattern(Ctor)).toBe(true);
  });

  it('validateAPIMethods finds missing methods', () => {
    const v = validator as any;
    const mod = { methodA: () => {} };
    const missing = v.validateAPIMethods(mod, ['methodA', 'methodB', 'methodC']);
    expect(missing).toEqual(['methodB', 'methodC']);
  });

  it('validateAPIMethods finds methods on prototype', () => {
    const v = validator as any;
    class MyClass { methodA() {} methodB() {} }
    const missing = v.validateAPIMethods(MyClass, ['methodA', 'methodB', 'methodC']);
    expect(missing).toEqual(['methodC']);
  });

  it('validateAPIMethods returns empty when all methods present', () => {
    const v = validator as any;
    const mod = { a: () => {}, b: () => {}, c: () => {} };
    expect(v.validateAPIMethods(mod, ['a', 'b', 'c'])).toEqual([]);
  });

  it('validateTypeDefinitions returns false when fs is unavailable', () => {
    const v = validator as any;
    const result = v.validateTypeDefinitions('@/lib/api/TimeAPI');
    expect(result).toBe(false);
  });

  it('loadAPIModule returns null for non-existent module', async () => {
    const v = validator as any;
    const result = await v.loadAPIModule('nonexistent/module');
    expect(result).toBeNull();
  });
});
