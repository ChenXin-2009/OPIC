import { ReportGenerator } from '../report-generator';
import { AuditResults } from '../../models/audit-results';

function createMockResults(overrides?: Partial<AuditResults>): AuditResults {
  return {
    endpoints: [],
    dataSources: [],
    cache: [],
    errors: [],
    rateLimit: {
      endpoint: 'http://test/api',
      limit: 100,
      requestsSent: 0,
      rateLimitedCount: 0,
      rateLimitWorking: true,
      hasRetryAfter: true,
      timestamp: new Date(),
    },
    performance: [],
    clientAPIs: [],
    timestamp: new Date(),
    ...overrides,
  };
}

describe('ReportGenerator', () => {
  let generator: ReportGenerator;

  beforeEach(() => {
    generator = new ReportGenerator();
  });

  describe('calculateHealthScore', () => {
    it('should return 100 when no issues', () => {
      const score = generator.calculateHealthScore(createMockResults());
      expect(score).toBe(100);
    });

    it('should deduct points for unhealthy endpoints', () => {
      const results = createMockResults({
        endpoints: [
          { url: '/api/a', status: 200, responseTime: 100, healthy: true, timestamp: new Date() },
          { url: '/api/b', status: 500, responseTime: 0, healthy: false, timestamp: new Date() },
        ],
      });
      const score = generator.calculateHealthScore(results);
      expect(score).toBe(85);
    });

    it('should deduct points for unavailable data sources', () => {
      const results = createMockResults({
        dataSources: [
          { source: 'ds1', available: false, timestamp: new Date() },
          { source: 'ds2', available: true, timestamp: new Date() },
        ],
      });
      const score = generator.calculateHealthScore(results);
      expect(score).toBeLessThan(100);
    });

    it('should deduct points for cache misses', () => {
      const results = createMockResults({
        cache: [
          { endpoint: '/api/a', cacheHit: false, firstRequestTime: 200, secondRequestTime: 200, improvement: 0, improvementPercent: 0, timestamp: new Date() },
        ],
      });
      const score = generator.calculateHealthScore(results);
      expect(score).toBe(85);
    });

    it('should deduct points for rate limit not working', () => {
      const results = createMockResults({
        rateLimit: { endpoint: '/api', limit: 100, requestsSent: 10, rateLimitedCount: 0, rateLimitWorking: false, hasRetryAfter: false, timestamp: new Date() },
      });
      const score = generator.calculateHealthScore(results);
      expect(score).toBe(90);
    });

    it('should clamp score to 0', () => {
      const results = createMockResults({
        endpoints: [
          { url: '/api/a', status: 500, responseTime: 0, healthy: false, timestamp: new Date() },
        ],
        dataSources: [
          { source: 'ds1', available: false, timestamp: new Date() },
        ],
        cache: [
          { endpoint: '/api/a', cacheHit: false, firstRequestTime: 200, secondRequestTime: 200, improvement: 0, improvementPercent: 0, timestamp: new Date() },
        ],
        errors: [
          { scenario: 'error', passed: false, expectedStatus: 500, actualStatus: 200, hasErrorMessage: false, timestamp: new Date() },
        ],
        rateLimit: { endpoint: '/api', limit: 100, requestsSent: 10, rateLimitedCount: 0, rateLimitWorking: false, hasRetryAfter: false, timestamp: new Date() },
        performance: [
          { endpoint: '/api/a', iterations: 5, avg: 6000, min: 1000, max: 10000, p95: 9000, p99: 10000, hasPerformanceIssue: true, timestamp: new Date() },
        ],
      });
      const score = generator.calculateHealthScore(results);
      expect(score).toBe(0);
    });
  });

  describe('categorizeIssues', () => {
    it('should return empty array when no issues', () => {
      const issues = generator.categorizeIssues(createMockResults());
      expect(issues).toEqual([]);
    });

    it('should categorize endpoint issues', () => {
      const results = createMockResults({
        endpoints: [
          { url: '/api/bad', status: 500, responseTime: 0, healthy: false, timestamp: new Date() },
        ],
      });
      const issues = generator.categorizeIssues(results);
      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0].category).toBe('HTTP端点');
    });

    it('should categorize data source issues', () => {
      const results = createMockResults({
        dataSources: [
          { source: 'ds1', available: false, timestamp: new Date() },
        ],
      });
      const issues = generator.categorizeIssues(results);
      expect(issues.some(i => i.category === '数据源')).toBe(true);
    });

    it('should categorize cache issues', () => {
      const results = createMockResults({
        cache: [
          { endpoint: '/api/a', cacheHit: false, firstRequestTime: 200, secondRequestTime: 200, improvement: 0, improvementPercent: 0, timestamp: new Date() },
        ],
      });
      const issues = generator.categorizeIssues(results);
      expect(issues.some(i => i.category === '缓存机制')).toBe(true);
    });

    it('should categorize error handling issues', () => {
      const results = createMockResults({
        errors: [
          { scenario: 'bad-request', passed: false, expectedStatus: 400, actualStatus: 200, hasErrorMessage: false, timestamp: new Date() },
        ],
      });
      const issues = generator.categorizeIssues(results);
      expect(issues.some(i => i.category === '错误处理')).toBe(true);
    });

    it('should categorize rate limit issues', () => {
      const results = createMockResults({
        rateLimit: { endpoint: '/api', limit: 100, requestsSent: 10, rateLimitedCount: 0, rateLimitWorking: false, hasRetryAfter: false, timestamp: new Date() },
      });
      const issues = generator.categorizeIssues(results);
      expect(issues.some(i => i.category === '速率限制')).toBe(true);
    });

    it('should categorize performance issues', () => {
      const results = createMockResults({
        performance: [
          { endpoint: '/api/slow', iterations: 5, avg: 6000, min: 5000, max: 7000, p95: 6500, p99: 7000, hasPerformanceIssue: true, timestamp: new Date() },
        ],
      });
      const issues = generator.categorizeIssues(results);
      expect(issues.some(i => i.category === '性能')).toBe(true);
    });

    it('should sort issues by severity', () => {
      const results = createMockResults({
        endpoints: [
          { url: '/api/critical', status: 0, responseTime: 0, healthy: false, timestamp: new Date() },
        ],
        dataSources: [
          { source: 'ds1', available: false, timestamp: new Date() },
        ],
      });
      const issues = generator.categorizeIssues(results);
      expect(issues[0].severity).toBe('critical');
      expect(issues[issues.length - 1].severity).toBe('high');
    });
  });

  describe('generateReport', () => {
    it('should generate a complete report', () => {
      const results = createMockResults();
      const report = generator.generateReport(results);
      expect(report.version).toBe('1.0.0');
      expect(report.timestamp).toBeInstanceOf(Date);
      expect(report.healthScore).toBe(100);
      expect(report.summary).toBeDefined();
      expect(report.issues).toEqual([]);
      expect(report.recommendations.length).toBeGreaterThan(0);
    });

    it('should include recommendations for critical issues', () => {
      const results = createMockResults({
        endpoints: [
          { url: '/api/bad', status: 500, responseTime: 0, healthy: false, timestamp: new Date() },
        ],
      });
      const report = generator.generateReport(results);
      expect(report.recommendations.length).toBeGreaterThan(0);
    });
  });
});
