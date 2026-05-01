/**
 * 日志工具
 * 提供结构化日志记录功能,支持不同日志级别
 */

/**
 * 日志级别
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  SILENT = 4,
}

/**
 * 日志级别名称映射
 */
const LOG_LEVEL_NAMES: Record<LogLevel, string> = {
  [LogLevel.DEBUG]: 'DEBUG',
  [LogLevel.INFO]: 'INFO',
  [LogLevel.WARN]: 'WARN',
  [LogLevel.ERROR]: 'ERROR',
  [LogLevel.SILENT]: 'SILENT',
};

/**
 * 日志条目
 */
export interface LogEntry {
  /** 时间戳 */
  timestamp: string;
  /** 日志级别 */
  level: string;
  /** 日志消息 */
  message: string;
  /** 上下文数据 */
  context?: Record<string, any>;
  /** 错误对象 */
  error?: Error;
}

/**
 * 日志配置
 */
export interface LoggerConfig {
  /** 最小日志级别 */
  level: LogLevel;
  /** 是否启用彩色输出 */
  colorize?: boolean;
  /** 是否输出JSON格式 */
  json?: boolean;
  /** 日志前缀 */
  prefix?: string;
}

/**
 * ANSI颜色代码
 */
const COLORS = {
  reset: '\x1b[0m',
  debug: '\x1b[36m', // 青色
  info: '\x1b[32m',  // 绿色
  warn: '\x1b[33m',  // 黄色
  error: '\x1b[31m', // 红色
  gray: '\x1b[90m',  // 灰色
};

/**
 * 日志记录器类
 */
export class Logger {
  private config: Required<LoggerConfig>;

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      level: config.level ?? LogLevel.INFO,
      colorize: config.colorize ?? true,
      json: config.json ?? false,
      prefix: config.prefix ?? '',
    };
  }

  /**
   * 设置日志级别
   */
  setLevel(level: LogLevel): void {
    this.config.level = level;
  }

  /**
   * 获取当前日志级别
   */
  getLevel(): LogLevel {
    return this.config.level;
  }

  /**
   * 格式化时间戳
   */
  private formatTimestamp(): string {
    return new Date().toISOString();
  }

  /**
   * 应用颜色
   */
  private colorize(text: string, color: string): string {
    if (!this.config.colorize) {
      return text;
    }
    return `${color}${text}${COLORS.reset}`;
  }

  /**
   * 格式化日志条目
   */
  private formatLogEntry(entry: LogEntry): string {
    if (this.config.json) {
      return JSON.stringify(entry);
    }

    const parts: string[] = [];

    // 时间戳
    parts.push(this.colorize(entry.timestamp, COLORS.gray));

    // 日志级别
    const levelColor = {
      DEBUG: COLORS.debug,
      INFO: COLORS.info,
      WARN: COLORS.warn,
      ERROR: COLORS.error,
    }[entry.level] || COLORS.reset;
    parts.push(this.colorize(`[${entry.level}]`, levelColor));

    // 前缀
    if (this.config.prefix) {
      parts.push(this.colorize(`[${this.config.prefix}]`, COLORS.gray));
    }

    // 消息
    parts.push(entry.message);

    // 上下文数据
    if (entry.context && Object.keys(entry.context).length > 0) {
      parts.push(this.colorize(JSON.stringify(entry.context), COLORS.gray));
    }

    // 错误堆栈
    if (entry.error) {
      parts.push('\n' + this.colorize(entry.error.stack || entry.error.message, COLORS.error));
    }

    return parts.join(' ');
  }

  /**
   * 记录日志
   */
  private log(
    level: LogLevel,
    message: string,
    context?: Record<string, any>,
    error?: Error
  ): void {
    // 检查日志级别
    if (level < this.config.level) {
      return;
    }

    const entry: LogEntry = {
      timestamp: this.formatTimestamp(),
      level: LOG_LEVEL_NAMES[level],
      message,
      context,
      error,
    };

    const formatted = this.formatLogEntry(entry);

    // 根据级别选择输出流
    if (level >= LogLevel.ERROR) {
      console.error(formatted);
    } else if (level >= LogLevel.WARN) {
      console.warn(formatted);
    } else {
      console.log(formatted);
    }
  }

  /**
   * 调试日志
   */
  debug(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  /**
   * 信息日志
   */
  info(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.INFO, message, context);
  }

  /**
   * 警告日志
   */
  warn(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.WARN, message, context);
  }

  /**
   * 错误日志
   */
  error(message: string, error?: Error, context?: Record<string, any>): void {
    this.log(LogLevel.ERROR, message, context, error);
  }

  /**
   * 创建子日志记录器(带前缀)
   */
  child(prefix: string): Logger {
    return new Logger({
      ...this.config,
      prefix: this.config.prefix ? `${this.config.prefix}:${prefix}` : prefix,
    });
  }
}

/**
 * 默认日志记录器实例
 */
export const logger = new Logger({
  level: process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG,
  colorize: process.env.NODE_ENV !== 'production',
  json: false,
});

/**
 * 从环境变量解析日志级别
 */
export function parseLogLevel(level: string): LogLevel {
  const normalized = level.toUpperCase();
  switch (normalized) {
    case 'DEBUG':
      return LogLevel.DEBUG;
    case 'INFO':
      return LogLevel.INFO;
    case 'WARN':
    case 'WARNING':
      return LogLevel.WARN;
    case 'ERROR':
      return LogLevel.ERROR;
    case 'SILENT':
    case 'NONE':
      return LogLevel.SILENT;
    default:
      return LogLevel.INFO;
  }
}

/**
 * 从环境变量配置日志记录器
 */
export function configureLoggerFromEnv(): void {
  const logLevel = process.env.AUDIT_LOG_LEVEL || process.env.LOG_LEVEL;
  if (logLevel) {
    logger.setLevel(parseLogLevel(logLevel));
  }
}
