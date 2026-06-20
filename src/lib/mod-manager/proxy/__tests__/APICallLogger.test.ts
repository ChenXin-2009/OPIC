import { APICallLogger } from '../APICallLogger';
import type { APICallLog } from '../types';

function makeLog(overrides: Partial<APICallLog> = {}): APICallLog {
  return {
    modId: 'mod1',
    api: 'time',
    method: 'setCurrentTime',
    timestamp: new Date('2026-01-01T00:00:00Z'),
    duration: 5.5,
    success: true,
    ...overrides,
  };
}

describe('APICallLogger', () => {
  let logger: APICallLogger;

  beforeEach(() => {
    logger = new APICallLogger();
  });

  describe('log and size', () => {
    it('should log entries and track size', () => {
      expect(logger.size).toBe(0);
      logger.log(makeLog());
      expect(logger.size).toBe(1);
      logger.log(makeLog());
      expect(logger.size).toBe(2);
    });

    it('should respect maxLogs limit', () => {
      const small = new APICallLogger(3);
      small.log(makeLog({ timestamp: new Date('1') }));
      small.log(makeLog({ timestamp: new Date('2') }));
      small.log(makeLog({ timestamp: new Date('3') }));
      small.log(makeLog({ timestamp: new Date('4') }));

      expect(small.size).toBe(3);
      const logs = small.getRecentLogs(3);
      expect(logs[0].timestamp).toEqual(new Date('2'));
    });
  });

  describe('getLogsForMod', () => {
    it('should filter by modId', () => {
      logger.log(makeLog({ modId: 'mod1' }));
      logger.log(makeLog({ modId: 'mod2' }));
      logger.log(makeLog({ modId: 'mod1' }));

      expect(logger.getLogsForMod('mod1').length).toBe(2);
      expect(logger.getLogsForMod('mod2').length).toBe(1);
    });
  });

  describe('getLogsForAPI', () => {
    it('should filter by api name', () => {
      logger.log(makeLog({ api: 'time' }));
      logger.log(makeLog({ api: 'camera' }));

      expect(logger.getLogsForAPI('time').length).toBe(1);
      expect(logger.getLogsForAPI('camera').length).toBe(1);
    });
  });

  describe('getLogsForMethod', () => {
    it('should filter by api and method', () => {
      logger.log(makeLog({ api: 'time', method: 'setCurrentTime' }));
      logger.log(makeLog({ api: 'time', method: 'togglePlayPause' }));
      logger.log(makeLog({ api: 'camera', method: 'setZoom' }));

      expect(logger.getLogsForMethod('time', 'setCurrentTime').length).toBe(1);
      expect(logger.getLogsForMethod('time', 'togglePlayPause').length).toBe(1);
      expect(logger.getLogsForMethod('camera', 'setZoom').length).toBe(1);
    });
  });

  describe('getStats', () => {
    it('should compute stats for a mod', () => {
      logger.log(makeLog({ modId: 'mod1', success: true, duration: 10 }));
      logger.log(makeLog({ modId: 'mod1', success: false, duration: 20 }));
      logger.log(makeLog({ modId: 'mod1', success: true, duration: 30 }));

      const stats = logger.getStats('mod1');
      expect(stats.totalCalls).toBe(3);
      expect(stats.successfulCalls).toBe(2);
      expect(stats.failedCalls).toBe(1);
      expect(stats.averageDuration).toBeCloseTo(20);
      expect(stats.callsByAPI['time.setCurrentTime']).toBe(3);
    });

    it('should return zero stats for unknown mod', () => {
      const stats = logger.getStats('unknown');
      expect(stats.totalCalls).toBe(0);
      expect(stats.successfulCalls).toBe(0);
      expect(stats.failedCalls).toBe(0);
      expect(stats.averageDuration).toBe(0);
    });
  });

  describe('getGlobalStats', () => {
    it('should compute global stats', () => {
      logger.log(makeLog({ modId: 'mod1', success: true, duration: 10 }));
      logger.log(makeLog({ modId: 'mod2', success: false, duration: 5 }));

      const stats = logger.getGlobalStats();
      expect(stats.totalCalls).toBe(2);
      expect(stats.successfulCalls).toBe(1);
      expect(stats.failedCalls).toBe(1);
      expect(stats.averageDuration).toBeCloseTo(7.5);
    });

    it('should return zero stats when empty', () => {
      const stats = logger.getGlobalStats();
      expect(stats.totalCalls).toBe(0);
    });
  });

  describe('getRecentLogs', () => {
    it('should return last N logs', () => {
      logger.log(makeLog({ timestamp: new Date('1') }));
      logger.log(makeLog({ timestamp: new Date('2') }));
      logger.log(makeLog({ timestamp: new Date('3') }));

      const recent = logger.getRecentLogs(2);
      expect(recent.length).toBe(2);
      expect(recent[0].timestamp).toEqual(new Date('2'));
    });
  });

  describe('getFailedCalls', () => {
    it('should return only failed calls', () => {
      logger.log(makeLog({ success: true }));
      logger.log(makeLog({ success: false, modId: 'mod1' }));
      logger.log(makeLog({ success: false, modId: 'mod2' }));

      expect(logger.getFailedCalls().length).toBe(2);
      expect(logger.getFailedCalls('mod1').length).toBe(1);
    });
  });

  describe('getSlowCalls', () => {
    it('should return calls exceeding threshold', () => {
      logger.log(makeLog({ duration: 10 }));
      logger.log(makeLog({ duration: 100 }));
      logger.log(makeLog({ duration: 500 }));

      expect(logger.getSlowCalls(200).length).toBe(1);
      expect(logger.getSlowCalls(50).length).toBe(2);
    });

    it('should filter by modId when provided', () => {
      logger.log(makeLog({ duration: 500, modId: 'mod1' }));
      logger.log(makeLog({ duration: 500, modId: 'mod2' }));

      expect(logger.getSlowCalls(200, 'mod1').length).toBe(1);
    });
  });

  describe('clear', () => {
    it('should clear all logs', () => {
      logger.log(makeLog());
      logger.log(makeLog());
      logger.clear();
      expect(logger.size).toBe(0);
    });

    it('should clear only logs for a specific mod', () => {
      logger.log(makeLog({ modId: 'mod1' }));
      logger.log(makeLog({ modId: 'mod2' }));
      logger.clear('mod1');
      expect(logger.size).toBe(1);
      expect(logger.getLogsForMod('mod2').length).toBe(1);
    });
  });

  describe('setMaxLogs', () => {
    it('should trim existing logs when lowering limit', () => {
      const l = new APICallLogger(100);
      for (let i = 0; i < 50; i++) {
        l.log(makeLog({ timestamp: new Date(i) }));
      }
      expect(l.size).toBe(50);

      l.setMaxLogs(10);
      expect(l.size).toBe(10);
    });
  });

  describe('exportToJSON', () => {
    it('should export all logs as JSON string', () => {
      logger.log(makeLog());
      const json = logger.exportToJSON();
      const parsed = JSON.parse(json);
      expect(parsed.length).toBe(1);
    });

    it('should export only mod logs when modId provided', () => {
      logger.log(makeLog({ modId: 'mod1' }));
      logger.log(makeLog({ modId: 'mod2' }));
      const json = logger.exportToJSON('mod1');
      const parsed = JSON.parse(json);
      expect(parsed.length).toBe(1);
      expect(parsed[0].modId).toBe('mod1');
    });
  });

  describe('getLogsByTimeRange', () => {
    it('should filter logs by time range', () => {
      logger.log(makeLog({ timestamp: new Date('2026-01-01') }));
      logger.log(makeLog({ timestamp: new Date('2026-06-01') }));
      logger.log(makeLog({ timestamp: new Date('2026-12-01') }));

      const logs = logger.getLogsByTimeRange(
        new Date('2026-03-01'),
        new Date('2026-09-01')
      );
      expect(logs.length).toBe(1);
      expect(logs[0].timestamp).toEqual(new Date('2026-06-01'));
    });

    it('should filter by modId within time range', () => {
      logger.log(makeLog({ timestamp: new Date('2026-06-01'), modId: 'mod1' }));
      logger.log(makeLog({ timestamp: new Date('2026-06-01'), modId: 'mod2' }));

      const logs = logger.getLogsByTimeRange(
        new Date('2026-01-01'),
        new Date('2026-12-01'),
        'mod1'
      );
      expect(logs.length).toBe(1);
    });
  });
});
