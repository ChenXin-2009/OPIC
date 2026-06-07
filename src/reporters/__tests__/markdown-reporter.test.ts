import { MarkdownReporter } from '../markdown-reporter';
import { AuditReport } from '../../models/audit-results';

function createMockReport(overrides?: Partial<AuditReport>): AuditReport {
  return {
    version: '1.0.0',
    timestamp: new Date('2024-01-15T10:30:00'),
    healthScore: 85,
    summary: {
      totalEndpoints: 3,
      healthyEndpoints: 2,
      totalDataSources: 2,
      availableDataSources: 1,
      cacheHitRate: 50,
      avgResponseTime: 150.5,
    },
    results: {
      endpoints: [
        { url: '/api/ok', status: 200, responseTime: 100, healthy: true, timestamp: new Date() },
        { url: '/api/bad', status: 500, responseTime: 0, healthy: false, timestamp: new Date() },
        { url: '/api/slow', status: 200, responseTime: 300, healthy: true, timestamp: new Date() },
      ],
      dataSources: [
        { source: 'ds1', available: true, responseTime: 50, quality: { score: 95, issues: [] }, timestamp: new Date() },
        { source: 'ds2', available: false, timestamp: new Date() },
      ],
      cache: [
        { endpoint: '/api/ok', cacheHit: true, firstRequestTime: 200, secondRequestTime: 50, improvement: 150, improvementPercent: 75, timestamp: new Date() },
      ],
      errors: [
        { scenario: 'bad-request', passed: true, expectedStatus: 400, actualStatus: 400, hasErrorMessage: true, timestamp: new Date() },
      ],
      rateLimit: {
        endpoint: '/api', limit: 100, requestsSent: 50, rateLimitedCount: 5,
        rateLimitWorking: true, hasRetryAfter: true, timestamp: new Date(),
      },
      performance: [
        { endpoint: '/api/slow', iterations: 5, avg: 2000, min: 500, max: 5000, p95: 4500, p99: 5000, hasPerformanceIssue: false, timestamp: new Date() },
      ],
      clientAPIs: [
        { name: 'API1', available: true, isSingleton: true, missingMethods: [], hasTypeDefinitions: true, timestamp: new Date() },
      ],
      timestamp: new Date(),
    },
    issues: [
      { severity: 'high', category: 'HTTP端点', description: '端点 /api/bad 不健康', affectedComponent: '/api/bad', recommendation: '修复' },
    ],
    recommendations: ['处理高优先级问题', '定期审查'],
    ...overrides,
  };
}

describe('MarkdownReporter', () => {
  let reporter: MarkdownReporter;

  beforeEach(() => {
    reporter = new MarkdownReporter();
  });

  describe('exportReport', () => {
    it('should generate markdown without saving to file', () => {
      const report = createMockReport();
      const md = reporter.exportReport(report);
      expect(md).toContain('# API审查报告');
      expect(md).toContain('85/100');
    });

    it('should include executive summary', () => {
      const report = createMockReport();
      const md = reporter.exportReport(report);
      expect(md).toContain('## 执行摘要');
      expect(md).toContain('HTTP端点总数');
    });

    it('should include endpoint section', () => {
      const report = createMockReport();
      const md = reporter.exportReport(report);
      expect(md).toContain('/api/ok');
      expect(md).toContain('/api/bad');
    });

    it('should include data sources section', () => {
      const report = createMockReport();
      const md = reporter.exportReport(report);
      expect(md).toContain('ds1');
      expect(md).toContain('ds2');
    });

    it('should include cache section', () => {
      const report = createMockReport();
      const md = reporter.exportReport(report);
      expect(md).toContain('缓存命中');
      expect(md).toContain('75.0%');
    });

    it('should include error handling section', () => {
      const report = createMockReport();
      const md = reporter.exportReport(report);
      expect(md).toContain('bad-request');
    });

    it('should include rate limit section', () => {
      const report = createMockReport();
      const md = reporter.exportReport(report);
      expect(md).toContain('速率限制评估');
      expect(md).toContain('100次/分钟');
    });

    it('should include performance section', () => {
      const report = createMockReport();
      const md = reporter.exportReport(report);
      expect(md).toContain('/api/slow');
    });

    it('should include client API section', () => {
      const report = createMockReport();
      const md = reporter.exportReport(report);
      expect(md).toContain('API1');
    });

    it('should include issues section', () => {
      const report = createMockReport();
      const md = reporter.exportReport(report);
      expect(md).toContain('## 问题列表');
      expect(md).toContain('HTTP端点');
    });

    it('should show no issues when empty', () => {
      const report = createMockReport({ issues: [] });
      const md = reporter.exportReport(report);
      expect(md).toContain('未发现问题');
    });

    it('should include recommendations section', () => {
      const report = createMockReport();
      const md = reporter.exportReport(report);
      expect(md).toContain('## 改进建议');
      expect(md).toContain('处理高优先级问题');
    });

    it('should include multiple severity groups in issues', () => {
      const report = createMockReport({
        issues: [
          { severity: 'critical', category: 'Critical', description: 'critical issue', affectedComponent: 'x', recommendation: 'fix' },
          { severity: 'high', category: 'High', description: 'high issue', affectedComponent: 'y', recommendation: 'fix' },
          { severity: 'medium', category: 'Medium', description: 'medium issue', affectedComponent: 'z', recommendation: 'fix' },
          { severity: 'low', category: 'Low', description: 'low issue', affectedComponent: 'w', recommendation: 'fix' },
        ],
      });
      const md = reporter.exportReport(report);
      expect(md).toContain('严重问题');
      expect(md).toContain('高优先级问题');
      expect(md).toContain('中等问题');
      expect(md).toContain('低优先级问题');
    });
  });

  describe('generateFileName', () => {
    it('should generate a filename with timestamp', () => {
      const name = reporter.generateFileName('/reports');
      expect(name).toContain('audit-report-');
      expect(name).toMatch(/\.md$/);
    });
  });
});
