import { ErrorLogger, getErrorLogger } from '../ErrorLogger';

describe('ErrorLogger', () => {
  let logger: ErrorLogger;

  beforeEach(() => {
    logger = new ErrorLogger();
  });

  it('should log an error', () => {
    logger.log('mod1', new Error('test error'));
    const logs = logger.getAllLogs();
    expect(logs).toHaveLength(1);
    expect(logs[0].modId).toBe('mod1');
  });

  it('should get logs by mod', () => {
    logger.log('mod1', new Error('err1'));
    logger.log('mod2', new Error('err2'));
    const mod1Logs = logger.getLogsByMod('mod1');
    expect(mod1Logs).toHaveLength(1);
  });

  it('should get logs by time range', () => {
    const now = new Date();
    logger.log('mod1', new Error('err'));
    const past = new Date(now.getTime() - 10000);
    const future = new Date(now.getTime() + 10000);
    const rangeLogs = logger.getLogsByTimeRange(past, future);
    expect(rangeLogs.length).toBeGreaterThanOrEqual(1);
  });

  it('should get recent logs', () => {
    logger.log('mod1', new Error('err1'));
    logger.log('mod2', new Error('err2'));
    logger.log('mod3', new Error('err3'));
    const recent = logger.getRecentLogs(2);
    expect(recent).toHaveLength(2);
  });

  it('should get stats', () => {
    logger.log('mod1', new Error('TypeError'));
    logger.log('mod1', new Error('TypeError'));
    const stats = logger.getStats();
    expect(stats.totalErrors).toBe(2);
    expect(stats.errorsByMod['mod1']).toBe(2);
  });

  it('should clear all logs', () => {
    logger.log('mod1', new Error('err'));
    logger.clear();
    expect(logger.getAllLogs()).toHaveLength(0);
  });

  it('should clear logs by mod', () => {
    logger.log('mod1', new Error('err1'));
    logger.log('mod2', new Error('err2'));
    logger.clear('mod1');
    expect(logger.getAllLogs()).toHaveLength(1);
  });

  it('should export as JSON', () => {
    logger.log('mod1', new Error('err'));
    const json = logger.exportAsJSON();
    expect(() => JSON.parse(json)).not.toThrow();
  });

  it('should export as text', () => {
    logger.log('mod1', new Error('err'));
    const text = logger.exportAsText();
    expect(text).toContain('mod1');
  });
});

describe('getErrorLogger', () => {
  it('should return a singleton instance', () => {
    const instance1 = getErrorLogger();
    const instance2 = getErrorLogger();
    expect(instance1).toBe(instance2);
  });
});
