/**
 * 解析器和格式化器模块
 * 
 * 提供数据解析和格式化功能，确保数据的往返转换（round-trip）完整性
 * 
 * 功能：
 * - TLE (Two-Line Element) 数据解析和格式化
 * - MOD Manifest 解析和格式化
 * - 配置文件解析和格式化
 * - 错误处理和验证
 * 
 * 设计原则：
 * - 每个解析器都有对应的格式化器
 * - 支持往返转换: parse(format(data)) === data
 * - 详细的错误信息（包含行号、列号、预期值）
 * - 类型安全和验证
 */

export * from './tle-formatter';
export * from './mod-manifest-formatter';
export * from './config-formatter';
