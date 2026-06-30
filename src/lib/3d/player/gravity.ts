/**
 * 天体引力参数查询 (Celestial Gravity Lookup)
 *
 * 提供太阳系主要天体的标准引力参数（GM = G × M）查询。
 * GM 值用于自由飞行模式下的引力加速计算。
 *
 * 数据单位：
 * - GM_KM3_S2: km³/s²（千米立方每平方秒）
 * - GM_AU3_S2: AU³/s²（天文单位立方每平方秒，自动换算）
 *
 * 数据来源：NASA JPL Planetary Fact Sheet
 */

import { AU_IN_KM } from '@/lib/astronomy/utils/constants';

const AU_KM_CUBED = AU_IN_KM * AU_IN_KM * AU_IN_KM;

const GM_KM3_S2: Record<string, number> = {
  sun: 1.32712440018e11,
  mercury: 2.2032e4,
  venus: 3.24859e5,
  earth: 3.986004418e5,
  moon: 4.902800066e3,
  mars: 4.282837e4,
  jupiter: 1.26686534e8,
  saturn: 3.7931187e7,
  uranus: 5.793939e6,
  neptune: 6.836529e6,
  // Jupiter satellites (JPL SSD)
  io: 5.959916033e3,
  europa: 3.202738774e3,
  ganymede: 9.887834453e3,
  callisto: 7.179289361e3,
  // Saturn satellites (JPL SSD)
  titan: 8.978138813e3,
  enceladus: 7.210364086e0,
  // Uranus satellites (JPL SSD)
  miranda: 4.319516899e0,
  ariel: 8.346344431e1,
  umbriel: 1.200093840e1,
  titania: 2.292652987e2,
};

const GM_AU3_S2: Record<string, number> = Object.fromEntries(
  Object.entries(GM_KM3_S2).map(([name, mu]) => [name, mu / AU_KM_CUBED])
);

/**
 * 获取天体的标准引力参数 (GM)，单位 AU³/s²。
 * 返回 null 表示该天体不在查询表中。
 */
export function getGravitationalParameterAU(name: string): number | null {
  const key = name.toLowerCase();
  return GM_AU3_S2[key] ?? null;
}
