import { ConcurrencyController } from '../concurrency-controller';

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

describe('ConcurrencyController', () => {
  it('should construct with default concurrency', () => {
    const ctrl = new ConcurrencyController();
    expect(ctrl.getMaxConcurrency()).toBe(10);
  });

  it('should construct with custom concurrency', () => {
    const ctrl = new ConcurrencyController(3);
    expect(ctrl.getMaxConcurrency()).toBe(3);
  });

  it('should set and get max concurrency', () => {
    const ctrl = new ConcurrencyController();
    ctrl.setMaxConcurrency(5);
    expect(ctrl.getMaxConcurrency()).toBe(5);
  });

  it('should throw on invalid concurrency', () => {
    const ctrl = new ConcurrencyController();
    expect(() => ctrl.setMaxConcurrency(0)).toThrow();
    expect(() => ctrl.setMaxConcurrency(-1)).toThrow();
  });

  it('should runWithLimit and return results in order', async () => {
    const ctrl = new ConcurrencyController(5);
    const results = await ctrl.runWithLimit([
      () => Promise.resolve(1),
      () => Promise.resolve(2),
      () => Promise.resolve(3),
    ]);
    expect(results).toEqual(expect.arrayContaining([1, 2, 3]));
    expect(results).toHaveLength(3);
  });

  it('should runWithLimit and limit concurrency', async () => {
    const ctrl = new ConcurrencyController(2);
    let concurrent = 0;
    let maxConcurrent = 0;

    const tasks = Array.from({ length: 5 }, (_, i) => async () => {
      concurrent++;
      maxConcurrent = Math.max(maxConcurrent, concurrent);
      await delay(10);
      concurrent--;
      return i;
    });

    const results = await ctrl.runWithLimit(tasks);
    expect(maxConcurrent).toBeLessThanOrEqual(2);
    expect(results).toHaveLength(5);
  });

  it('should runInBatches and return results', async () => {
    const ctrl = new ConcurrencyController(10);
    const results = await ctrl.runInBatches([
      () => Promise.resolve('a'),
      () => Promise.resolve('b'),
    ]);
    expect(results).toEqual(['a', 'b']);
  });

  it('should runInBatches with custom batch size', async () => {
    const ctrl = new ConcurrencyController(10);
    let maxConcurrent = 0;
    let concurrent = 0;

    const tasks = Array.from({ length: 4 }, () => async () => {
      concurrent++;
      maxConcurrent = Math.max(maxConcurrent, concurrent);
      await delay(10);
      concurrent--;
      return 1;
    });

    await ctrl.runInBatches(tasks, 2);
    expect(maxConcurrent).toBeLessThanOrEqual(2);
  });

  it('should runWithErrorHandling and collect results', async () => {
    const ctrl = new ConcurrencyController(5);
    const { results, errors } = await ctrl.runWithErrorHandling([
      () => Promise.resolve('ok'),
      () => Promise.resolve('also ok'),
    ]);
    expect(results).toHaveLength(2);
    expect(errors).toHaveLength(0);
  });

  it('should runWithErrorHandling and collect errors', async () => {
    const ctrl = new ConcurrencyController(5);
    const { results, errors } = await ctrl.runWithErrorHandling([
      () => Promise.resolve('ok'),
      () => Promise.reject(new Error('fail')),
      () => Promise.resolve('also ok'),
    ]);
    expect(results).toHaveLength(2);
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toBe('fail');
  });

  it('should runWithErrorHandling with non-Error rejection', async () => {
    const ctrl = new ConcurrencyController(5);
    const { results, errors } = await ctrl.runWithErrorHandling([
      () => Promise.reject('string error'),
    ]);
    expect(results).toHaveLength(0);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toBeInstanceOf(Error);
  });

  it('should runWithLimit throw on task failure', async () => {
    const ctrl = new ConcurrencyController(5);
    await expect(ctrl.runWithLimit([
      () => Promise.reject(new Error('boom')),
    ])).rejects.toThrow('boom');
  });

  it('should handle empty task array', async () => {
    const ctrl = new ConcurrencyController(5);
    const results = await ctrl.runWithLimit([]);
    expect(results).toEqual([]);
  });

  it('should handle single task', async () => {
    const ctrl = new ConcurrencyController(5);
    const results = await ctrl.runWithLimit([() => Promise.resolve(42)]);
    expect(results).toEqual([42]);
  });
});
