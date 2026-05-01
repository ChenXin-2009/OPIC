/**
 * 统计计算工具
 * 提供响应时间统计和数据质量评分功能
 */

/**
 * 统计指标
 */
export interface Statistics {
  /** 平均值 */
  avg: number;
  /** 最小值 */
  min: number;
  /** 最大值 */
  max: number;
  /** P95百分位数 */
  p95: number;
  /** P99百分位数 */
  p99: number;
  /** 样本数量 */
  count: number;
}

/**
 * 数据质量评估结果
 */
export interface DataQualityResult {
  /** 质量评分 (0-100) */
  score: number;
  /** 问题列表 */
  issues: string[];
  /** 是否通过质量检查 */
  passed: boolean;
}

/**
 * 计算平均值
 * @param values 数值数组
 * @returns 平均值
 */
export function avg(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  const sum = values.reduce((acc, val) => acc + val, 0);
  return sum / values.length;
}

/**
 * 计算最小值
 * @param values 数值数组
 * @returns 最小值
 */
export function min(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  return Math.min(...values);
}

/**
 * 计算最大值
 * @param values 数值数组
 * @returns 最大值
 */
export function max(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  return Math.max(...values);
}

/**
 * 计算百分位数
 * @param values 数值数组
 * @param percentile 百分位 (0-1)
 * @returns 百分位数值
 */
export function percentile(values: number[], percentile: number): number {
  if (values.length === 0) {
    return 0;
  }

  if (percentile < 0 || percentile > 1) {
    throw new Error('Percentile must be between 0 and 1');
  }

  // 复制并排序数组
  const sorted = [...values].sort((a, b) => a - b);
  const index = percentile * (sorted.length - 1);

  // 如果索引是整数,直接返回
  if (Number.isInteger(index)) {
    return sorted[index];
  }

  // 否则进行线性插值
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;

  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

/**
 * 计算P95百分位数
 * @param values 数值数组
 * @returns P95值
 */
export function p95(values: number[]): number {
  return percentile(values, 0.95);
}

/**
 * 计算P99百分位数
 * @param values 数值数组
 * @returns P99值
 */
export function p99(values: number[]): number {
  return percentile(values, 0.99);
}

/**
 * 计算完整的统计指标
 * @param values 数值数组
 * @returns 统计指标对象
 */
export function calculateStatistics(values: number[]): Statistics {
  return {
    avg: avg(values),
    min: min(values),
    max: max(values),
    p95: p95(values),
    p99: p99(values),
    count: values.length,
  };
}

/**
 * 检查数据是否为空
 * @param data 数据对象
 * @returns 是否为空
 */
function isEmptyData(data: any): boolean {
  if (data === null || data === undefined) {
    return true;
  }

  if (Array.isArray(data)) {
    return data.length === 0;
  }

  if (typeof data === 'object') {
    return Object.keys(data).length === 0;
  }

  return false;
}

/**
 * 检查必需字段是否存在
 * @param data 数据对象
 * @param requiredFields 必需字段列表
 * @returns 缺失的字段列表
 */
function checkRequiredFields(data: any, requiredFields: string[]): string[] {
  const missingFields: string[] = [];

  if (!data || typeof data !== 'object') {
    return requiredFields;
  }

  for (const field of requiredFields) {
    // 支持嵌套字段检查 (例如: "user.name")
    const fieldParts = field.split('.');
    let current = data;
    let found = true;

    for (const part of fieldParts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        found = false;
        break;
      }
    }

    if (!found) {
      missingFields.push(field);
    }
  }

  return missingFields;
}

/**
 * 评估数据质量
 * @param data 数据对象
 * @param requiredFields 必需字段列表(可选)
 * @param minRecordCount 最小记录数量(可选,仅用于数组数据)
 * @returns 数据质量评估结果
 */
export function assessDataQuality(
  data: any,
  requiredFields: string[] = [],
  minRecordCount: number = 1
): DataQualityResult {
  const issues: string[] = [];
  let score = 100;

  // 检查数据是否为空
  if (isEmptyData(data)) {
    issues.push('Data is empty or null');
    return {
      score: 0,
      issues,
      passed: false,
    };
  }

  // 如果是数组,检查记录数量
  if (Array.isArray(data)) {
    if (data.length < minRecordCount) {
      issues.push(`Insufficient records: expected at least ${minRecordCount}, got ${data.length}`);
      score -= 30;
    }

    // 检查数组中第一个元素的必需字段
    if (data.length > 0 && requiredFields.length > 0) {
      const sample = data[0];
      const missingFields = checkRequiredFields(sample, requiredFields);

      if (missingFields.length > 0) {
        issues.push(`Missing required fields: ${missingFields.join(', ')}`);
        score -= missingFields.length * 10;
      }

      // 检查数组中是否有null或undefined元素
      const nullCount = data.filter(item => item === null || item === undefined).length;
      if (nullCount > 0) {
        issues.push(`Found ${nullCount} null/undefined elements in array`);
        score -= Math.min(20, nullCount * 5);
      }
    }
  } else if (typeof data === 'object') {
    // 如果是对象,检查必需字段
    if (requiredFields.length > 0) {
      const missingFields = checkRequiredFields(data, requiredFields);

      if (missingFields.length > 0) {
        issues.push(`Missing required fields: ${missingFields.join(', ')}`);
        score -= missingFields.length * 10;
      }
    }
  }

  // 确保分数不低于0
  score = Math.max(0, score);

  return {
    score,
    issues,
    passed: score >= 70, // 70分以上视为通过
  };
}

/**
 * 计算改善百分比
 * @param before 改善前的值
 * @param after 改善后的值
 * @returns 改善百分比
 */
export function calculateImprovement(before: number, after: number): number {
  if (before === 0) {
    return 0;
  }
  return ((before - after) / before) * 100;
}

/**
 * 格式化统计数据为可读字符串
 * @param stats 统计指标
 * @param unit 单位(默认为'ms')
 * @returns 格式化的字符串
 */
export function formatStatistics(stats: Statistics, unit: string = 'ms'): string {
  return [
    `Count: ${stats.count}`,
    `Avg: ${stats.avg.toFixed(2)}${unit}`,
    `Min: ${stats.min.toFixed(2)}${unit}`,
    `Max: ${stats.max.toFixed(2)}${unit}`,
    `P95: ${stats.p95.toFixed(2)}${unit}`,
    `P99: ${stats.p99.toFixed(2)}${unit}`,
  ].join(', ');
}
