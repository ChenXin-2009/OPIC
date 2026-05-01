/**
 * 配置管理器
 * 负责加载和验证审查配置
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  AuditConfig,
  EndpointConfig,
  DataSourceConfig,
} from '../models/config-models';

/**
 * 默认审查配置
 */
const DEFAULT_CONFIG: AuditConfig = {
  timeout: 5000,
  retries: 3,
  concurrency: 10,
  performanceThreshold: 5000,
  performanceIterations: 100,
  reportFormat: ['json', 'markdown'],
  outputPath: './reports',
  enabledChecks: {
    health: true,
    dataSources: true,
    cache: true,
    errors: true,
    rateLimit: true,
    performance: true,
    clientAPIs: true,
  },
};

/**
 * 配置管理器类
 */
export class ConfigManager {
  private config: AuditConfig;
  private endpoints: EndpointConfig[];
  private dataSources: DataSourceConfig[];

  constructor(configPath?: string) {
    this.config = this.loadAuditConfig(configPath);
    this.endpoints = this.loadEndpoints();
    this.dataSources = this.loadDataSources();
  }

  /**
   * 加载审查配置
   */
  private loadAuditConfig(configPath?: string): AuditConfig {
    try {
      const configFile = configPath || path.join(process.cwd(), 'config', 'audit-config.json');
      const configData = fs.readFileSync(configFile, 'utf-8');
      const loadedConfig = JSON.parse(configData) as Partial<AuditConfig>;

      // 合并默认配置和加载的配置
      return {
        ...DEFAULT_CONFIG,
        ...loadedConfig,
        enabledChecks: {
          ...DEFAULT_CONFIG.enabledChecks,
          ...loadedConfig.enabledChecks,
        },
      };
    } catch (error) {
      console.warn('无法加载配置文件，使用默认配置:', error);
      return DEFAULT_CONFIG;
    }
  }

  /**
   * 加载端点配置
   */
  private loadEndpoints(): EndpointConfig[] {
    try {
      const endpointsFile = path.join(process.cwd(), 'config', 'endpoints.json');
      const endpointsData = fs.readFileSync(endpointsFile, 'utf-8');
      const parsed = JSON.parse(endpointsData);
      return parsed.endpoints || [];
    } catch (error) {
      console.warn('无法加载端点配置文件:', error);
      return [];
    }
  }

  /**
   * 加载数据源配置
   */
  private loadDataSources(): DataSourceConfig[] {
    try {
      const dataSourcesFile = path.join(process.cwd(), 'config', 'data-sources.json');
      const dataSourcesData = fs.readFileSync(dataSourcesFile, 'utf-8');
      const parsed = JSON.parse(dataSourcesData);
      return parsed.dataSources || [];
    } catch (error) {
      console.warn('无法加载数据源配置文件:', error);
      return [];
    }
  }

  /**
   * 获取审查配置
   */
  public getAuditConfig(): AuditConfig {
    return this.config;
  }

  /**
   * 获取端点配置列表
   */
  public getEndpoints(): EndpointConfig[] {
    return this.endpoints;
  }

  /**
   * 获取数据源配置列表
   */
  public getDataSources(): DataSourceConfig[] {
    return this.dataSources;
  }

  /**
   * 根据类别获取数据源
   */
  public getDataSourcesByCategory(category: string): DataSourceConfig[] {
    return this.dataSources.filter(ds => ds.category === category);
  }

  /**
   * 验证配置有效性
   */
  public validateConfig(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // 验证超时时间
    if (this.config.timeout <= 0) {
      errors.push('超时时间必须大于0');
    }

    // 验证重试次数
    if (this.config.retries < 0) {
      errors.push('重试次数不能为负数');
    }

    // 验证并发数
    if (this.config.concurrency <= 0) {
      errors.push('并发数必须大于0');
    }

    // 验证性能阈值
    if (this.config.performanceThreshold <= 0) {
      errors.push('性能阈值必须大于0');
    }

    // 验证性能测试迭代次数
    if (this.config.performanceIterations <= 0) {
      errors.push('性能测试迭代次数必须大于0');
    }

    // 验证报告格式
    if (this.config.reportFormat.length === 0) {
      errors.push('至少需要指定一种报告格式');
    }

    // 验证输出路径
    if (!this.config.outputPath) {
      errors.push('必须指定报告输出路径');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * 应用环境变量覆盖
   */
  public applyEnvironmentOverrides(): void {
    if (process.env.AUDIT_TIMEOUT) {
      this.config.timeout = parseInt(process.env.AUDIT_TIMEOUT, 10);
    }

    if (process.env.AUDIT_RETRIES) {
      this.config.retries = parseInt(process.env.AUDIT_RETRIES, 10);
    }

    if (process.env.AUDIT_CONCURRENCY) {
      this.config.concurrency = parseInt(process.env.AUDIT_CONCURRENCY, 10);
    }

    if (process.env.AUDIT_PERFORMANCE_THRESHOLD) {
      this.config.performanceThreshold = parseInt(process.env.AUDIT_PERFORMANCE_THRESHOLD, 10);
    }

    if (process.env.AUDIT_OUTPUT_PATH) {
      this.config.outputPath = process.env.AUDIT_OUTPUT_PATH;
    }
  }
}
