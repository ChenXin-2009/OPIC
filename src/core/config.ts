/**
 * 配置管理器 (Config Manager)
 * 
 * 核心职责：
 * - 加载和管理审查配置
 * - 整合端点和数据源配置
 * - 应用环境变量覆盖
 * - 验证配置的有效性
 * 
 * 配置层次结构：
 * 1. 默认配置（DEFAULT_CONFIG）
 * 2. 文件配置（JSON文件）
 * 3. 环境变量覆盖
 * 
 * 配置文件位置：
 * - audit-config.json: 审查主配置
 * - endpoints.json: API端点列表
 * - data-sources.json: 数据源配置
 * 
 * 优先级：
 * 环境变量 > 文件配置 > 默认配置
 * 
 * @example
 * ```typescript
 * // 使用默认配置路径
 * const configManager = new ConfigManager();
 * 
 * // 使用自定义配置路径
 * const configManager = new ConfigManager('./custom-config.json');
 * 
 * // 应用环境变量
 * configManager.applyEnvironmentOverrides();
 * 
 * // 获取配置
 * const config = configManager.getAuditConfig();
 * const endpoints = configManager.getEndpoints();
 * ```
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
 * 
 * 当配置文件不存在或加载失败时使用。
 * 
 * 配置说明：
 * - timeout: 5000ms - 单个请求超时时间
 * - retries: 3 - 失败重试次数
 * - concurrency: 10 - 最大并发请求数
 * - performanceThreshold: 5000ms - 性能警告阈值
 * - performanceIterations: 100 - 性能测试迭代次数
 * - reportFormat: ['json', 'markdown'] - 输出格式
 * - outputPath: './reports' - 报告输出目录
 * - enabledChecks: 所有检查项默认启用
 */
const DEFAULT_CONFIG: AuditConfig = {
  timeout: 5000,                      // 5秒超时
  retries: 3,                         // 失败重试3次
  concurrency: 10,                    // 最多10个并发请求
  performanceThreshold: 5000,         // 5秒性能阈值
  performanceIterations: 100,         // 性能测试100次迭代
  reportFormat: ['json', 'markdown'], // 同时输出JSON和Markdown
  outputPath: './reports',            // 报告保存到./reports目录
  enabledChecks: {
    health: true,                     // 启用健康检查
    dataSources: true,                // 启用数据源验证
    cache: true,                      // 启用缓存验证
    errors: true,                     // 启用错误处理验证
    rateLimit: true,                  // 启用速率限制验证
    performance: true,                // 启用性能监控
    clientAPIs: true,                 // 启用客户端API验证
  },
};

/**
 * 配置管理器类
 * 
 * 负责集中管理所有审查相关的配置。
 * 
 * 配置来源：
 * 1. 硬编码的默认配置
 * 2. JSON配置文件
 * 3. 环境变量
 * 
 * 配置类型：
 * - config: 审查主配置（超时、重试、并发等）
 * - endpoints: API端点配置列表
 * - dataSources: 数据源配置列表
 */
export class ConfigManager {
  /** 审查主配置 */
  private config: AuditConfig;
  
  /** API端点配置列表 */
  private endpoints: EndpointConfig[];
  
  /** 数据源配置列表 */
  private dataSources: DataSourceConfig[];

  /**
   * 构造函数
   * 
   * 初始化时加载所有配置文件。如果文件不存在或格式错误，
   * 会记录警告但使用默认配置继续运行。
   * 
   * @param configPath - 可选的审查配置文件路径，不提供则使用默认路径
   */
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
   * 
   * 检查所有配置值是否在合理范围内。
   * 
   * 验证规则：
   * - 数值类型必须 > 0
   * - 数组类型不能为空
   * - 字符串类型不能为空
   * 
   * 使用场景：
   * - 配置加载后验证
   * - 运行时配置修改后验证
   * - 配置界面的实时验证
   * 
   * @returns 包含验证结果和错误列表的对象
   * 
   * @example
   * ```typescript
   * const { valid, errors } = configManager.validateConfig();
   * if (!valid) {
   *   console.error('配置无效:', errors);
   *   // 处理错误...
   * }
   * ```
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
   * 
   * 读取环境变量并覆盖配置文件中的对应设置。
   * 这允许在不修改配置文件的情况下调整配置。
   * 
   * 支持的环境变量：
   * - AUDIT_TIMEOUT: 超时时间（毫秒）
   * - AUDIT_RETRIES: 重试次数
   * - AUDIT_CONCURRENCY: 并发数
   * - AUDIT_PERFORMANCE_THRESHOLD: 性能阈值（毫秒）
   * - AUDIT_OUTPUT_PATH: 输出路径
   * 
   * 使用场景：
   * - CI/CD环境中动态调整配置
   * - Docker容器配置
   * - 不同环境使用不同设置
   * 
   * 注意：
   * - 环境变量优先级最高
   * - 无效的环境变量值会被parseInt转换为NaN
   * - 建议在应用配置前先验证
   * 
   * @example
   * ```bash
   * # 设置环境变量
   * export AUDIT_TIMEOUT=10000
   * export AUDIT_CONCURRENCY=20
   * 
   * # 运行审查
   * node audit.js
   * ```
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
