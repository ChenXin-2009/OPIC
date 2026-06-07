/**
 * 配置文件格式化器
 * 
 * 将配置对象格式化为 JSON 字符串
 * 
 * @example
 * ```typescript
 * const config = {
 *   apiUrl: 'https://api.example.com',
 *   timeout: 5000,
 *   features: {
 *     enableMods: true,
 *     enablePerformanceMonitor: false
 *   }
 * };
 * 
 * const formatted = formatConfig(config);
 * ```
 */

/**
 * 格式化错误类
 */
export class ConfigFormatterError extends Error {
  constructor(
    message: string,
    public readonly field?: string,
    public readonly value?: unknown
  ) {
    super(message);
    this.name = 'ConfigFormatterError';
  }
}

/**
 * 格式化配置对象为 JSON 字符串
 * 
 * @param config - 配置对象
 * @param pretty - 是否格式化输出（带缩进）
 * @returns 格式化的 JSON 字符串
 * @throws ConfigFormatterError 如果数据无效
 */
export function formatConfig(config: Record<string, unknown>, pretty: boolean = true): string {
  try {
    if (!config || typeof config !== 'object') {
      throw new ConfigFormatterError('Config must be an object', 'config', config);
    }

    // 深度验证配置对象（检查循环引用）
    validateConfigObject(config);

    // 格式化为 JSON
    return pretty 
      ? JSON.stringify(config, null, 2) 
      : JSON.stringify(config);
  } catch (error) {
    if (error instanceof ConfigFormatterError) {
      throw error;
    }
    if (error instanceof TypeError && error.message.includes('circular')) {
      throw new ConfigFormatterError('Config contains circular references');
    }
    throw new ConfigFormatterError(
      `Failed to format config: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * 验证配置对象（检查循环引用和无效值）
 * 
 * @param obj - 要验证的对象
 * @param seen - 已访问的对象集合（用于检测循环引用）
 * @param path - 当前路径（用于错误信息）
 */
function validateConfigObject(
  obj: unknown, 
  seen: WeakSet<object> = new WeakSet(), 
  path: string = 'root'
): void {
  if (obj === null || obj === undefined) {
    return;
  }

  // 检查原始类型
  const type = typeof obj;
  if (type === 'string' || type === 'number' || type === 'boolean') {
    return;
  }

  // 检查函数（不允许在配置中）
  if (type === 'function') {
    throw new ConfigFormatterError(
      `Config cannot contain functions at path: ${path}`,
      path,
      obj
    );
  }

  // 检查对象和数组
  if (type === 'object') {
    // 检查循环引用
    if (seen.has(obj as object)) {
      throw new ConfigFormatterError(
        `Config contains circular reference at path: ${path}`,
        path,
        obj
      );
    }

    seen.add(obj as object);

    // 递归验证
    if (Array.isArray(obj)) {
      obj.forEach((item, index) => {
        validateConfigObject(item, seen, `${path}[${index}]`);
      });
    } else {
      const record = obj as Record<string, unknown>;
      for (const [key, value] of Object.entries(record)) {
        validateConfigObject(value, seen, `${path}.${key}`);
      }
    }
  }
}

/**
 * 验证格式化后的配置 JSON 字符串
 * 
 * @param formatted - 格式化的 JSON 字符串
 * @returns 是否有效
 */
export function validateFormattedConfig(formatted: string): boolean {
  try {
    const parsed = JSON.parse(formatted);
    return typeof parsed === 'object' && parsed !== null;
  } catch {
    return false;
  }
}

/**
 * 格式化配置对象并添加注释（作为特殊字段）
 * 
 * @param config - 配置对象
 * @param comments - 字段注释映射
 * @param pretty - 是否格式化输出
 * @returns 格式化的 JSON 字符串
 */
export function formatConfigWithComments(
  config: Record<string, unknown>,
  comments: Record<string, string>,
  pretty: boolean = true
): string {
  // 创建带注释的配置对象
  const withComments: Record<string, unknown> = {
    _comments: comments,
    ...config,
  };

  return formatConfig(withComments, pretty);
}

/**
 * 比较两个配置对象，返回差异
 * 
 * @param config1 - 第一个配置对象
 * @param config2 - 第二个配置对象
 * @returns 差异对象
 */
export function compareConfigs(
  config1: Record<string, unknown>,
  config2: Record<string, unknown>
): {
  added: string[];
  removed: string[];
  modified: string[];
} {
  const keys1 = new Set(Object.keys(config1));
  const keys2 = new Set(Object.keys(config2));

  const added: string[] = [];
  const removed: string[] = [];
  const modified: string[] = [];

  // 检查新增的键
  for (const key of keys2) {
    if (!keys1.has(key)) {
      added.push(key);
    }
  }

  // 检查删除的键和修改的键
  for (const key of keys1) {
    if (!keys2.has(key)) {
      removed.push(key);
    } else if (JSON.stringify(config1[key]) !== JSON.stringify(config2[key])) {
      modified.push(key);
    }
  }

  return { added, removed, modified };
}
