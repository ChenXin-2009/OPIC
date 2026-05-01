#!/usr/bin/env node
/**
 * API审查系统命令行接口
 * 提供命令行方式触发审查任务
 */

import { ConfigManager } from './core/config';
import { VERSION } from './index';

/**
 * 显示帮助信息
 */
function showHelp(): void {
  console.log(`
API审查系统 v${VERSION}

用法:
  npm run audit                              执行完整审查
  npm run audit -- --targets=health,cache    执行选择性审查
  npm run audit -- --config=./custom.json    使用自定义配置文件
  npm run audit -- --format=json             指定报告格式
  npm run audit -- --output=./reports        指定输出路径
  npm run audit -- --help                    显示帮助信息

参数:
  --targets     指定审查目标 (health,dataSources,cache,errors,rateLimit,performance,clientAPIs)
  --config      指定配置文件路径
  --format      指定报告格式 (json,markdown)
  --output      指定报告输出路径
  --help        显示帮助信息

示例:
  npm run audit -- --targets=health,performance --format=json
  npm run audit -- --config=./config/custom-audit-config.json
  npm run audit -- --output=./custom-reports

环境变量:
  AUDIT_TIMEOUT                请求超时时间(毫秒)
  AUDIT_RETRIES                重试次数
  AUDIT_CONCURRENCY            并发数
  AUDIT_PERFORMANCE_THRESHOLD  性能阈值(毫秒)
  AUDIT_OUTPUT_PATH            报告输出路径
  `);
}

/**
 * 解析命令行参数
 */
function parseArgs(): {
  targets?: string[];
  config?: string;
  format?: string[];
  output?: string;
  help: boolean;
} {
  const args = process.argv.slice(2);
  const result: {
    targets?: string[];
    config?: string;
    format?: string[];
    output?: string;
    help: boolean;
  } = {
    help: false,
  };

  for (const arg of args) {
    if (arg === '--help' || arg === '-h') {
      result.help = true;
    } else if (arg.startsWith('--targets=')) {
      result.targets = arg.substring('--targets='.length).split(',');
    } else if (arg.startsWith('--config=')) {
      result.config = arg.substring('--config='.length);
    } else if (arg.startsWith('--format=')) {
      result.format = arg.substring('--format='.length).split(',');
    } else if (arg.startsWith('--output=')) {
      result.output = arg.substring('--output='.length);
    }
  }

  return result;
}

/**
 * 主函数
 */
async function main(): Promise<void> {
  const args = parseArgs();

  // 显示帮助信息
  if (args.help) {
    showHelp();
    process.exit(0);
  }

  console.log(`API审查系统 v${VERSION}`);
  console.log('正在初始化...\n');

  // 加载配置
  const configManager = new ConfigManager(args.config);
  configManager.applyEnvironmentOverrides();

  // 验证配置
  const validation = configManager.validateConfig();
  if (!validation.valid) {
    console.error('配置验证失败:');
    validation.errors.forEach(error => console.error(`  - ${error}`));
    process.exit(1);
  }

  const config = configManager.getAuditConfig();
  const endpoints = configManager.getEndpoints();
  const dataSources = configManager.getDataSources();

  console.log('配置加载成功:');
  console.log(`  - 端点数量: ${endpoints.length}`);
  console.log(`  - 数据源数量: ${dataSources.length}`);
  console.log(`  - 超时时间: ${config.timeout}ms`);
  console.log(`  - 并发数: ${config.concurrency}`);
  console.log(`  - 报告格式: ${config.reportFormat.join(', ')}`);
  console.log(`  - 输出路径: ${config.outputPath}\n`);

  // TODO: 实现审查编排器并执行审查
  console.log('审查编排器尚未实现，将在后续任务中完成。');
}

// 执行主函数
main().catch(error => {
  console.error('执行失败:', error);
  process.exit(1);
});
