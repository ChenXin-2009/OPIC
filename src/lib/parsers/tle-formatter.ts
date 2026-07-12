/**
 * TLE (Two-Line Element) 格式化器
 * 
 * 将 TLE 数据对象格式化为标准 TLE 字符串格式
 * 
 * TLE 格式规范:
 * - 第 0 行: 卫星名称
 * - 第 1 行: 69 个字符，以 "1 " 开头
 * - 第 2 行: 69 个字符，以 "2 " 开头
 * 
 * @example
 * ```typescript
 * const tleData: TLEData = {
 *   name: 'ISS (ZARYA)',
 *   noradId: 25544,
 *   line1: '1 25544U 98067A   ...',
 *   line2: '2 25544  51.6400 ...',
 *   category: SatelliteCategory.ISS,
 *   epoch: new Date('2024-01-01')
 * };
 * 
 * const formatted = formatTLE(tleData);
 * // ISS (ZARYA)
 * // 1 25544U 98067A   ...
 * // 2 25544  51.6400 ...
 * ```
 */

import { TLEData, SatelliteCategory } from '@/lib/types/satellite';

/**
 * TLE 格式化错误类
 *
 * 在 TLE 格式化/验证过程中抛出，携带错误字段与原始值以便调试。
 */
export class TLEFormatterError extends Error {
  /**
   * @param message - 错误描述
   * @param field - 导致错误的字段名（可选）
   * @param value - 导致错误的原始值（可选）
   */
  constructor(
    message: string,
    public readonly field?: string,
    public readonly value?: unknown
  ) {
    super(message);
    this.name = 'TLEFormatterError';
  }
}

/**
 * 格式化单个 TLE 数据为三行字符串
 * 
 * @param data - TLE 数据对象
 * @returns 格式化的 TLE 字符串（三行）
 * @throws TLEFormatterError 如果数据无效
 */
export function formatTLE(data: TLEData): string {
  try {
    // 验证必需字段
    if (!data.name || typeof data.name !== 'string') {
      throw new TLEFormatterError('Missing or invalid name field', 'name', data.name);
    }

    if (!data.line1 || typeof data.line1 !== 'string') {
      throw new TLEFormatterError('Missing or invalid line1 field', 'line1', data.line1);
    }

    if (!data.line2 || typeof data.line2 !== 'string') {
      throw new TLEFormatterError('Missing or invalid line2 field', 'line2', data.line2);
    }

    // 验证行长度
    if (data.line1.length !== 69) {
      throw new TLEFormatterError(
        `Invalid line1 length: expected 69, got ${data.line1.length}`,
        'line1',
        data.line1
      );
    }

    if (data.line2.length !== 69) {
      throw new TLEFormatterError(
        `Invalid line2 length: expected 69, got ${data.line2.length}`,
        'line2',
        data.line2
      );
    }

    // 验证行前缀
    if (!data.line1.startsWith('1 ')) {
      throw new TLEFormatterError(
        'Invalid line1 format: must start with "1 "',
        'line1',
        data.line1
      );
    }

    if (!data.line2.startsWith('2 ')) {
      throw new TLEFormatterError(
        'Invalid line2 format: must start with "2 "',
        'line2',
        data.line2
      );
    }

    // 格式化为三行字符串
    return `${data.name.trim()}\n${data.line1}\n${data.line2}`;
  } catch (error) {
    if (error instanceof TLEFormatterError) {
      throw error;
    }
    throw new TLEFormatterError(
      `Failed to format TLE: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * 格式化多个 TLE 数据为完整的 TLE 文件内容
 * 
 * @param dataArray - TLE 数据对象数组
 * @returns 格式化的 TLE 文件内容
 */
export function formatTLEBatch(dataArray: TLEData[]): string {
  if (!Array.isArray(dataArray)) {
    throw new TLEFormatterError('Input must be an array', 'dataArray', dataArray);
  }

  if (dataArray.length === 0) {
    return '';
  }

  const formatted = dataArray.map((data, index) => {
    try {
      return formatTLE(data);
    } catch (error) {
      if (error instanceof TLEFormatterError) {
        throw new TLEFormatterError(
          `Error formatting TLE at index ${index}: ${error.message}`,
          error.field,
          error.value
        );
      }
      throw error;
    }
  });

  return formatted.join('\n');
}

/**
 * 格式化 TLE 数据并按类别分组
 * 
 * @param dataArray - TLE 数据对象数组
 * @returns 按类别分组的格式化 TLE 内容映射
 */
export function formatTLEByCategory(dataArray: TLEData[]): Map<SatelliteCategory, string> {
  const grouped = new Map<SatelliteCategory, TLEData[]>();

  // 按类别分组
  for (const data of dataArray) {
    const category = data.category || SatelliteCategory.ACTIVE;
    if (!grouped.has(category)) {
      grouped.set(category, []);
    }
    grouped.get(category)!.push(data);
  }

  // 格式化每个分组
  const result = new Map<SatelliteCategory, string>();
  for (const [category, data] of grouped.entries()) {
    result.set(category, formatTLEBatch(data));
  }

  return result;
}

/**
 * 验证格式化后的 TLE 字符串
 * 
 * @param formatted - 格式化的 TLE 字符串
 * @returns 是否有效
 */
export function validateFormattedTLE(formatted: string): boolean {
  if (!formatted || typeof formatted !== 'string') {
    return false;
  }

  const lines = formatted.split('\n').filter(line => line.trim().length > 0);
  
  // TLE 必须是 3 的倍数行
  if (lines.length % 3 !== 0) {
    return false;
  }

  // 验证每组 TLE
  for (let i = 0; i < lines.length; i += 3) {
    const name = lines[i];
    const line1 = lines[i + 1];
    const line2 = lines[i + 2];

    // 验证名称
    if (!name || name.trim().length === 0) {
      return false;
    }

    // 验证第一行
    if (!line1 || line1.length !== 69 || !line1.startsWith('1 ')) {
      return false;
    }

    // 验证第二行
    if (!line2 || line2.length !== 69 || !line2.startsWith('2 ')) {
      return false;
    }
  }

  return true;
}
