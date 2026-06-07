import { JSONReporter } from '../json-reporter';
import type { AuditReport } from '../../models/audit-results';

jest.mock('fs', () => {
  const fs: any = {};
  fs.existsSync = jest.fn().mockReturnValue(true);
  fs.mkdirSync = jest.fn();
  fs.writeFileSync = jest.fn();
  fs.readFileSync = jest.fn();
  return fs;
});

jest.mock('path', () => {
  const path: any = {};
  path.dirname = jest.fn().mockReturnValue('/mock/dir');
  path.join = jest.fn().mockImplementation((...args: string[]) => args.join('/'));
  return path;
});

const mockReport: AuditReport = {
  version: '1.0',
  timestamp: new Date('2024-06-01T12:00:00Z'),
  healthScore: 85,
  summary: {
    totalEndpoints: 10,
    healthyEndpoints: 8,
    totalDataSources: 5,
    availableDataSources: 4,
    cacheHitRate: 0.75,
    avgResponseTime: 250,
  },
  results: {
    endpoints: [],
    dataSources: [],
    cache: [],
    errors: [],
    rateLimit: {
      endpoint: '/api/test',
      limits: { maxRequests: 100, windowMs: 60000 },
      passed: true,
      actualLimit: 95,
    },
    performance: [],
    clientAPIs: [],
    timestamp: new Date('2024-06-01T12:00:00Z'),
  },
  issues: [],
  recommendations: ['Increase cache TTL for static data'],
};

describe('JSONReporter', () => {
  let reporter: JSONReporter;

  beforeEach(() => {
    reporter = new JSONReporter();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('exportReport', () => {
    it('should return valid JSON string', () => {
      const json = reporter.exportReport(mockReport);
      expect(typeof json).toBe('string');
      const parsed = JSON.parse(json);
      expect(parsed.version).toBe('1.0');
      expect(parsed.healthScore).toBe(85);
    });

    it('should serialize Date objects to ISO strings', () => {
      const json = reporter.exportReport(mockReport);
      const parsed = JSON.parse(json);
      expect(typeof parsed.timestamp).toBe('string');
      expect(parsed.timestamp).toBe('2024-06-01T12:00:00.000Z');
    });

    it('should produce pretty-printed JSON', () => {
      const json = reporter.exportReport(mockReport);
      const lines = json.split('\n');
      expect(lines.some(l => l.includes('  '))).toBe(true);
    });
  });

  describe('validateJSON', () => {
    it('should return true for valid JSON', () => {
      expect(reporter.validateJSON('{"key": "value"}')).toBe(true);
    });

    it('should return false for invalid JSON', () => {
      expect(reporter.validateJSON('not json')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(reporter.validateJSON('')).toBe(false);
    });
  });

  describe('generateFileName', () => {
    it('should generate a filename with timestamp', () => {
      const filename = reporter.generateFileName('/reports');
      expect(filename).toContain('audit-report-');
      expect(filename).toContain('.json');
    });

    it('should include basePath in the result', () => {
      const filename = reporter.generateFileName('/reports');
      expect(filename).toContain('/reports/');
    });
  });

  describe('loadReport', () => {
    it('should parse JSON and convert dates', () => {
      const fs = require('fs');
      const testData = JSON.stringify({
        version: '1.0',
        timestamp: '2024-06-01T12:00:00.000Z',
        healthScore: 85,
        summary: {
          totalEndpoints: 10,
          healthyEndpoints: 8,
          totalDataSources: 5,
          availableDataSources: 4,
          cacheHitRate: 0.75,
          avgResponseTime: 250,
        },
        results: {
          endpoints: [],
          dataSources: [],
          cache: [],
          errors: [],
          rateLimit: {
            endpoint: '/api/test',
            limits: { maxRequests: 100, windowMs: 60000 },
            passed: true,
            actualLimit: 95,
          },
          performance: [],
          clientAPIs: [],
          timestamp: '2024-06-01T12:00:00.000Z',
        },
        issues: [],
        recommendations: [],
      });
      fs.readFileSync.mockReturnValue(testData);

      const report = reporter.loadReport('/reports/test.json');
      expect(report.version).toBe('1.0');
      expect(report.healthScore).toBe(85);
      expect(report.timestamp).toBeInstanceOf(Date);
      expect(report.results.timestamp).toBeInstanceOf(Date);
    });

    it('should throw on invalid file', () => {
      const fs = require('fs');
      fs.readFileSync.mockImplementation(() => { throw new Error('File not found'); });
      expect(() => reporter.loadReport('/nonexistent.json')).toThrow();
    });
  });
});
