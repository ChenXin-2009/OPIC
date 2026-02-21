/**
 * Celestrak API客户端
 * 
 * 负责从Celestrak获取TLE(Two-Line Element)数据,解析和验证数据
 * 支持多种卫星类别,并实现错误重试机制
 */

import { TLEData, SatelliteCategory } from '../types/satellite';

/**
 * Celestrak API基础URL
 */
const CELESTRAK_BASE_URL = 'https://celestrak.org/NORAD/elements/gp.php';

/**
 * 类别到Celestrak API参数的映射
 */
const CATEGORY_MAP: Record<SatelliteCategory, string> = {
  [SatelliteCategory.ACTIVE]: 'active',
  [SatelliteCategory.ISS]: 'stations',
  [SatelliteCategory.GPS]: 'gps-ops',
  [SatelliteCategory.COMMUNICATION]: 'geo',
  [SatelliteCategory.WEATHER]: 'weather',
  [SatelliteCategory.SCIENCE]: 'science',
  [SatelliteCategory.OTHER]: 'active', // 默认使用active
};

/**
 * TLE行的正则表达式验证
 * TLE第一行格式: 1 NNNNNC NNNNNAAA NNNNN.NNNNNNNN +.NNNNNNNN +NNNNN-N +NNNNN-N N NNNNN
 * TLE第二行格式: 2 NNNNN NNN.NNNN NNN.NNNN NNNNNNN NNN.NNNN NNN.NNNN NN.NNNNNNNNNNNNNN
 * 
 * 注意: 使用更宽松的验证，只检查基本格式和长度
 */
const TLE_LINE1_REGEX = /^1 /;
const TLE_LINE2_REGEX = /^2 /;

/**
 * Celestrak API客户端类
 */
export class CelestrakClient {
  private maxRetries: number;
  private retryDelay: number;

  /**
   * 创建Celestrak客户端实例
   * @param maxRetries 最大重试次数,默认3次
   * @param retryDelay 重试延迟(毫秒),默认1000ms
   */
  constructor(maxRetries: number = 3, retryDelay: number = 1000) {
    this.maxRetries = maxRetries;
    this.retryDelay = retryDelay;
  }

  /**
   * 从Celestrak获取指定类别的TLE数据
   * @param category 卫星类别
   * @returns TLE数据数组
   * @throws 如果所有重试都失败则抛出错误
   */
  async fetchTLE(category: SatelliteCategory): Promise<TLEData[]> {
    const categoryParam = CATEGORY_MAP[category];
    const url = `${CELESTRAK_BASE_URL}?GROUP=${categoryParam}&FORMAT=TLE`;

    let lastError: Error | null = null;

    // 实现重试机制
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        console.log(`[CelestrakClient] 尝试获取 ${category} 数据 (尝试 ${attempt + 1}/${this.maxRetries + 1})`);

        const response = await fetch(url, {
          headers: {
            'User-Agent': 'SatelliteVisualization/1.0',
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP错误: ${response.status} ${response.statusText}`);
        }

        const rawData = await response.text();

        if (!rawData || rawData.trim().length === 0) {
          throw new Error('Celestrak返回空数据');
        }

        // 解析TLE数据
        const tleData = this.parseTLE(rawData, category);

        console.log(`[CelestrakClient] 成功获取 ${tleData.length} 颗卫星数据`);
        return tleData;

      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.error(`[CelestrakClient] 尝试 ${attempt + 1} 失败:`, lastError.message);

        // 如果不是最后一次尝试,等待后重试
        if (attempt < this.maxRetries) {
          await this.sleep(this.retryDelay * (attempt + 1)); // 指数退避
        }
      }
    }

    // 所有重试都失败
    throw new Error(
      `获取Celestrak数据失败,已重试${this.maxRetries}次: ${lastError?.message || '未知错误'}`
    );
  }

  /**
   * 解析TLE格式的原始数据
   * @param rawData 原始TLE文本数据
   * @param category 卫星类别
   * @returns 解析后的TLE数据数组
   */
  parseTLE(rawData: string, category: SatelliteCategory): TLEData[] {
    const lines = rawData.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    const tleData: TLEData[] = [];
    const errors: string[] = [];

    // TLE格式是三行一组: 名称、第一行、第二行
    for (let i = 0; i < lines.length; i += 3) {
      if (i + 2 >= lines.length) {
        break; // 不完整的TLE组
      }

      const name = lines[i];
      const line1 = lines[i + 1];
      const line2 = lines[i + 2];

      try {
        // 验证TLE数据
        if (!this.validateTLE({ name, line1, line2 })) {
          errors.push(`无效的TLE数据: ${name}`);
          continue;
        }

        // 提取NORAD ID(从第一行的第3-7列)
        const noradId = parseInt(line1.substring(2, 7).trim(), 10);

        if (isNaN(noradId)) {
          errors.push(`无效的NORAD ID: ${name}`);
          continue;
        }

        // 提取历元时间(从第一行的第19-32列)
        // 格式: YYDDD.DDDDDDDD (年份+一年中的第几天)
        const epochStr = line1.substring(18, 32).trim();
        const epoch = this.parseEpoch(epochStr);

        tleData.push({
          name: name.trim(),
          noradId,
          line1,
          line2,
          category,
          epoch,
        });

      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        errors.push(`解析TLE失败 (${name}): ${errorMsg}`);
      }
    }

    // 记录警告
    if (errors.length > 0) {
      console.warn(`[CelestrakClient] 过滤了 ${errors.length} 个无效TLE条目`);
      errors.slice(0, 5).forEach(err => console.warn(`  - ${err}`));
      if (errors.length > 5) {
        console.warn(`  ... 还有 ${errors.length - 5} 个错误`);
      }
    }

    return tleData;
  }

  /**
   * 验证TLE数据的有效性
   * @param tle TLE数据对象(包含name, line1, line2)
   * @returns 是否有效
   */
  validateTLE(tle: { name: string; line1: string; line2: string }): boolean {
    // 检查名称
    if (!tle.name || tle.name.trim().length === 0) {
      return false;
    }

    // 检查第一行
    if (!tle.line1 || tle.line1.length !== 69) {
      return false;
    }

    if (!tle.line1.startsWith('1 ')) {
      return false;
    }

    // 检查第二行
    if (!tle.line2 || tle.line2.length !== 69) {
      return false;
    }

    if (!tle.line2.startsWith('2 ')) {
      return false;
    }

    // 验证格式(使用正则表达式)
    if (!TLE_LINE1_REGEX.test(tle.line1)) {
      return false;
    }

    if (!TLE_LINE2_REGEX.test(tle.line2)) {
      return false;
    }

    // 验证校验和
    if (!this.validateChecksum(tle.line1) || !this.validateChecksum(tle.line2)) {
      return false;
    }

    return true;
  }

  /**
   * 验证TLE行的校验和
   * 校验和是每行最后一位数字,等于前68个字符的校验和模10
   * @param line TLE行
   * @returns 校验和是否正确
   */
  private validateChecksum(line: string): boolean {
    if (line.length !== 69) {
      return false;
    }

    let checksum = 0;
    for (let i = 0; i < 68; i++) {
      const char = line[i];
      if (char >= '0' && char <= '9') {
        checksum += parseInt(char, 10);
      } else if (char === '-') {
        checksum += 1;
      }
      // 其他字符(包括空格、字母、+)不计入校验和
    }

    const expectedChecksum = parseInt(line[68], 10);
    return (checksum % 10) === expectedChecksum;
  }

  /**
   * 解析TLE历元时间
   * @param epochStr 历元字符串,格式: YYDDD.DDDDDDDD
   * @returns Date对象
   */
  private parseEpoch(epochStr: string): Date {
    // 提取年份(YY)和一年中的第几天(DDD.DDDDDDDD)
    const year = parseInt(epochStr.substring(0, 2), 10);
    const dayOfYear = parseFloat(epochStr.substring(2));

    // 转换为完整年份(假设00-56为2000-2056,57-99为1957-1999)
    const fullYear = year < 57 ? 2000 + year : 1900 + year;

    // 计算日期
    const startOfYear = new Date(Date.UTC(fullYear, 0, 1));
    const milliseconds = (dayOfYear - 1) * 24 * 60 * 60 * 1000;
    const epoch = new Date(startOfYear.getTime() + milliseconds);

    return epoch;
  }

  /**
   * 延迟函数
   * @param ms 延迟毫秒数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * 默认的Celestrak客户端实例
 */
export const celestrakClient = new CelestrakClient();
