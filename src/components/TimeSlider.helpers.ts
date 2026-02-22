/**
 * Helper functions for TimeSlider component
 */

import { TIME_SLIDER_CONFIG } from '@/lib/config/visualConfig';

/**
 * Speed calculation result
 */
export interface SpeedResult {
  speed: number;
  direction: 'forward' | 'backward';
}

/**
 * Speed zone configuration interface
 */
interface SpeedZone {
  name: string;
  start: number;
  end: number;
  maxSpeed: number;
  exponent: number;
  unit: { zh: string; en: string };
}

/**
 * Validates speed zone configuration
 * 
 * Checks:
 * 1. Zone boundaries are continuous (adjacent zones connect)
 * 2. All speed values are non-negative
 * 3. All exponent values are positive
 * 4. Zones are ordered by start position
 * 
 * @param zones - Speed zone configuration array
 * @param deadZone - Dead zone radius
 * @returns Validation result with error messages
 */
export function validateSpeedZoneConfig(
  zones: readonly SpeedZone[],
  deadZone: number
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // 检查死区有效性
  if (deadZone < 0 || deadZone >= 0.5) {
    errors.push(`死区半径无效: ${deadZone}，应在 [0, 0.5) 范围内`);
  }
  
  // 检查区域数组非空
  if (zones.length === 0) {
    errors.push('速度区域配置为空');
    return { valid: false, errors };
  }
  
  // 检查第一个区域从死区边界开始
  const firstZone = zones[0] as SpeedZone;
  if (Math.abs(firstZone.start - deadZone) > 0.0001) {
    errors.push(`第一个区域起始位置 ${firstZone.start} 应该等于死区半径 ${deadZone}`);
  }
  
  // 检查每个区域
  for (let i = 0; i < zones.length; i++) {
    const zone = zones[i] as SpeedZone;
    
    // 检查区域边界有效性
    if (zone.start < 0 || zone.end > 1) {
      errors.push(`区域 ${i} (${zone.name}): 边界超出范围 [0, 1]`);
    }
    
    if (zone.start >= zone.end) {
      errors.push(`区域 ${i} (${zone.name}): 起始位置 ${zone.start} 应小于结束位置 ${zone.end}`);
    }
    
    // 检查速度值非负
    if (zone.maxSpeed < 0) {
      errors.push(`区域 ${i} (${zone.name}): 最大速度 ${zone.maxSpeed} 不能为负数`);
    }
    
    // 检查指数值为正
    if (zone.exponent <= 0) {
      errors.push(`区域 ${i} (${zone.name}): 指数 ${zone.exponent} 必须为正数`);
    }
    
    // 检查与下一个区域的连续性
    if (i < zones.length - 1) {
      const nextZone = zones[i + 1] as SpeedZone;
      const gap = Math.abs(zone.end - nextZone.start);
      if (gap > 0.0001) {
        errors.push(
          `区域 ${i} (${zone.name}) 和区域 ${i + 1} (${nextZone.name}) 不连续: ` +
          `${zone.end} != ${nextZone.start} (差值: ${gap})`
        );
      }
    }
  }
  
  // 检查最后一个区域到达边界
  const lastZone = zones[zones.length - 1] as SpeedZone;
  if (Math.abs(lastZone.end - 1.0) > 0.0001) {
    errors.push(`最后一个区域结束位置 ${lastZone.end} 应该等于 1.0`);
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Calculates playback speed based on slider position using segmented speed zones
 * 
 * Algorithm:
 * 1. Convert position to normalized offset (-1 to 1)
 * 2. Check if in dead zone (return speed 0)
 * 3. Find the speed zone based on |offset|
 * 4. Calculate speed within the zone using exponential interpolation
 * 5. Ensure continuity at zone boundaries
 * 
 * @param position - Slider position (0-1, 0.5 = center)
 * @returns Speed and direction
 */
export function calculateSpeed(position: number): SpeedResult {
  // 开发环境下验证配置（仅首次调用）
  if (process.env.NODE_ENV === 'development' && !calculateSpeed.configValidated) {
    const validation = validateSpeedZoneConfig(
      TIME_SLIDER_CONFIG.speedZones,
      TIME_SLIDER_CONFIG.deadZone
    );
    if (!validation.valid) {
      console.error('时间滑块配置验证失败:');
      validation.errors.forEach(err => console.error(`  - ${err}`));
    }
    calculateSpeed.configValidated = true;
  }
  
  // 输入验证：钳制position到[0, 1]范围
  const clampedPosition = Math.max(0, Math.min(1, position));
  
  // 1. 转换为归一化偏移量：-1到1，0为中心
  const offset = clampedPosition - 0.5; // -0.5 to 0.5
  const normalizedOffset = offset * 2; // -1 to 1
  
  // 2. 死区检测
  const deadZone = TIME_SLIDER_CONFIG.deadZone;
  const absOffset = Math.abs(normalizedOffset);
  if (absOffset < deadZone) {
    return { speed: 0, direction: 'forward' };
  }
  
  // 3. 确定方向
  const direction = normalizedOffset > 0 ? 'forward' : 'backward';
  
  // 4. 查找所在速度区域并计算速度
  // 性能优化：缓存zones引用，避免重复访问配置
  const zones = TIME_SLIDER_CONFIG.speedZones;
  const zoneCount = zones.length;
  let speed = 0;
  let foundZone = false;
  
  // 性能优化：边界容差常量
  const BOUNDARY_TOLERANCE = 0.0001;
  
  for (let i = 0; i < zoneCount; i++) {
    const zone = zones[i] as SpeedZone;
    
    if (absOffset >= zone.start && absOffset <= zone.end) {
      // 在当前区域内，计算速度
      foundZone = true;
      
      // 获取前一个区域的最大速度作为当前区域的最小速度（保证连续性）
      // 特殊处理：第一个区域（秒）的最小速度设为 1秒/秒，而不是0
      let minSpeed: number;
      if (i === 0) {
        // 第一个区域（秒区域）：最小速度为 1秒/秒
        minSpeed = 1 / 86400;  // 1秒/秒 = 1/86400天/秒
      } else {
        // 其他区域：使用前一个区域的最大速度
        minSpeed = (zones[i - 1] as SpeedZone).maxSpeed;
      }
      const maxSpeed = zone.maxSpeed;
      
      // 边界处理：在边界附近直接使用边界速度值，确保精确连续
      const startDiff = absOffset - zone.start;
      const endDiff = zone.end - absOffset;
      
      if (startDiff < BOUNDARY_TOLERANCE) {
        // 在区域起始边界
        speed = minSpeed;
      } else if (endDiff < BOUNDARY_TOLERANCE) {
        // 在区域结束边界
        speed = maxSpeed;
      } else {
        // 在区域内部，使用指数曲线插值
        const zoneWidth = zone.end - zone.start;
        const zoneProgress = startDiff / zoneWidth;
        const speedRange = maxSpeed - minSpeed;
        const exponentialProgress = Math.pow(zoneProgress, zone.exponent);
        speed = minSpeed + speedRange * exponentialProgress;
      }
      
      break;
    }
  }
  
  // 5. 如果未找到任何区域（理论上不应该发生），使用最大速度
  if (!foundZone && absOffset > deadZone) {
    speed = TIME_SLIDER_CONFIG.maxSpeed;
  }
  
  return { speed, direction };
}

// 静态属性：标记配置是否已验证
calculateSpeed.configValidated = false;

/**
 * Formats speed for display with intelligent unit selection
 * 
 * Automatically selects the most appropriate time unit based on speed value.
 * Supports: seconds, minutes, hours, days, months, years
 * 
 * @param speed - Speed in days/second (internal unit)
 * @param lang - Language ('zh' or 'en')
 * @returns Formatted speed string
 */
export function formatSpeedLabel(speed: number, lang: 'zh' | 'en'): string {
  // 输入验证：语言参数
  const validLang = (lang === 'zh' || lang === 'en') ? lang : 'en';
  if (validLang !== lang && process.env.NODE_ENV === 'development') {
    console.warn(`formatSpeedLabel: 无效的语言参数 "${lang}"，使用默认值 "en"`);
  }
  
  // 处理特殊值
  if (isNaN(speed)) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('formatSpeedLabel: 速度值为 NaN');
    }
    return '--';
  }
  
  if (!isFinite(speed)) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(`formatSpeedLabel: 速度值为 ${speed > 0 ? 'Infinity' : '-Infinity'}`);
    }
    return '--';
  }
  
  if (speed <= 0) {
    return '';
  }
  
  // 转换阈值（天/秒）
  const SECOND_PER_DAY = 86400;
  const MINUTE_PER_DAY = 1440;
  const HOUR_PER_DAY = 24;
  const MONTH_DAYS = 30;
  const YEAR_DAYS = 365;
  
  // 根据速度值选择合适的单位
  if (speed >= YEAR_DAYS) {
    // 年/秒
    const years = speed / YEAR_DAYS;
    return `${years.toFixed(1)}${validLang === 'zh' ? '年/秒' : 'y/s'}`;
  } else if (speed >= MONTH_DAYS) {
    // 月/秒
    const months = speed / MONTH_DAYS;
    return `${months.toFixed(1)}${validLang === 'zh' ? '月/秒' : 'm/s'}`;
  } else if (speed >= 1) {
    // 天/秒
    return `${speed.toFixed(1)}${validLang === 'zh' ? '天/秒' : 'd/s'}`;
  } else if (speed >= 1 / HOUR_PER_DAY) {
    // 时/秒
    const hours = speed * HOUR_PER_DAY;
    return `${hours.toFixed(1)}${validLang === 'zh' ? '时/秒' : 'h/s'}`;
  } else if (speed >= 1 / MINUTE_PER_DAY) {
    // 分/秒
    const minutes = speed * MINUTE_PER_DAY;
    return `${minutes.toFixed(1)}${validLang === 'zh' ? '分/秒' : 'min/s'}`;
  } else {
    // 秒/秒 - 显示为整数
    const seconds = speed * SECOND_PER_DAY;
    return `${Math.round(seconds)}${validLang === 'zh' ? '秒/秒' : 's/s'}`;
  }
}

/**
 * Normalizes client X coordinate to slider position (0-1)
 * 
 * @param clientX - Client X coordinate
 * @param containerRect - Container bounding rect
 * @param trackPadding - Padding from edges
 * @param trackWidth - Width of the track
 * @returns Normalized position (0-1)
 */
export function normalizePosition(
  clientX: number,
  containerRect: DOMRect,
  trackPadding: number,
  trackWidth: number
): number {
  const x = clientX - containerRect.left;
  return Math.max(0, Math.min(1, (x - trackPadding) / trackWidth));
}
