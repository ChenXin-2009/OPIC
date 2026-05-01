/**
 * API审查系统主入口
 * 导出所有公共接口和类
 */

// 导出数据模型
export * from './models';

// 导出配置管理器
export { ConfigManager } from './core/config';

// 版本信息
export const VERSION = '1.0.0';
