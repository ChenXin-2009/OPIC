/**
 * units.ts - 统一的单位转换常量
 * 
 * 集中管理所有天文单位转换常量
 */

// ==================== 基础单位转换 ====================

/** 光年转天文单位 (AU) */
export const LIGHT_YEAR_TO_AU = 63241.077;

/** 秒差距转光年 */
export const PARSEC_TO_LIGHT_YEAR = 3.26156;

/** 秒差距转天文单位 (AU) */
export const PARSEC_TO_AU = 206265;

// ==================== 大尺度单位转换 ====================

/** 百万秒差距 (Mpc) 转天文单位 (AU) */
export const MEGAPARSEC_TO_AU = PARSEC_TO_AU * 1e6;

/** 十亿秒差距 (Gpc) 转天文单位 (AU) */
export const GIGAPARSEC_TO_AU = PARSEC_TO_AU * 1e9;

// ==================== 便捷转换函数 ====================

/**
 * 光年转天文单位
 */
export function lightYearsToAU(lightYears: number): number {
  return lightYears * LIGHT_YEAR_TO_AU;
}

/**
 * 秒差距转天文单位
 */
export function parsecsToAU(parsecs: number): number {
  return parsecs * PARSEC_TO_AU;
}

/**
 * 百万秒差距转天文单位
 */
export function megaparsecsToAU(megaparsecs: number): number {
  return megaparsecs * MEGAPARSEC_TO_AU;
}

/**
 * 天文单位转光年
 */
export function auToLightYears(au: number): number {
  return au / LIGHT_YEAR_TO_AU;
}

/**
 * 天文单位转秒差距
 */
export function auToParsecs(au: number): number {
  return au / PARSEC_TO_AU;
}

/**
 * 天文单位转百万秒差距
 */
export function auToMegaparsecs(au: number): number {
  return au / MEGAPARSEC_TO_AU;
}
