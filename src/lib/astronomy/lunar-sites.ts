/**
 * 月球地表特征坐标数据 (Lunar Surface Sites)
 *
 * 定义 Apollo 着陆点、主要环形山、月海的精确坐标。
 * 所有坐标均来自 NASA/LRO 官方数据，AI 可通过坐标对比验证。
 *
 * 坐标系：月面经纬度 (Selenographic)
 * - 纬度：±90°，正北
 * - 经度：±180°，正东
 *
 * 数据来源：
 * - Apollo: NASA LRO QuickMap (https://quickmap.lroc.asu.edu)
 * - 环形山: IAU Gazetteer of Planetary Nomenclature
 */

/** 月面坐标 */
export interface LunarSite {
  /** 站点/特征名称 */
  name: string;
  /** 经度 (°)，正东 */
  lon: number;
  /** 纬度 (°)，正北 */
  lat: number;
  /** 特征类型 */
  type: 'landing' | 'crater' | 'mare' | 'mountain' | 'other';
  /** 可选描述 */
  desc?: string;
  /** 着陆任务名（仅着陆点） */
  mission?: string;
  /** 着陆年份（仅着陆点） */
  year?: number;
}

// ---------------------------------------------------------------------------
// Apollo 着陆点 (Apollo Landing Sites)
// ---------------------------------------------------------------------------

export const APOLLO_LANDING_SITES: LunarSite[] = [
  {
    name: 'Apollo 11',
    type: 'landing',
    lat: 0.67408,       // Mare Tranquillitatis
    lon: 23.47297,
    mission: 'Apollo 11',
    year: 1969,
    desc: '人类首次登月 — Neil Armstrong, Buzz Aldrin',
  },
  {
    name: 'Apollo 12',
    type: 'landing',
    lat: -2.990,
    lon: -23.390,
    mission: 'Apollo 12',
    year: 1969,
    desc: 'Oceanus Procellarum — Pete Conrad, Alan Bean',
  },
  {
    name: 'Apollo 14',
    type: 'landing',
    lat: -3.645,
    lon: -17.471,
    mission: 'Apollo 14',
    year: 1971,
    desc: 'Fra Mauro — Alan Shepard, Edgar Mitchell',
  },
  {
    name: 'Apollo 15',
    type: 'landing',
    lat: 26.132,
    lon: 3.634,
    mission: 'Apollo 15',
    year: 1971,
    desc: 'Hadley Rille — David Scott, James Irwin',
  },
  {
    name: 'Apollo 16',
    type: 'landing',
    lat: -8.973,
    lon: 15.500,
    mission: 'Apollo 16',
    year: 1972,
    desc: 'Descartes Highlands — John Young, Charles Duke',
  },
  {
    name: 'Apollo 17',
    type: 'landing',
    lat: 20.191,
    lon: 30.772,
    mission: 'Apollo 17',
    year: 1972,
    desc: 'Taurus-Littrow — Gene Cernan, Harrison Schmitt (最后一次登月)',
  },
];

// ---------------------------------------------------------------------------
// 其他人类探测器着陆/撞击点
// ---------------------------------------------------------------------------

export const OTHER_LANDING_SITES: LunarSite[] = [
  {
    name: 'Surveyor 1',
    type: 'landing',
    lat: -2.474,
    lon: -43.339,
    mission: 'Surveyor 1',
    year: 1966,
    desc: '美国首个软着陆探测器',
  },
  {
    name: 'Surveyor 3',
    type: 'landing',
    lat: -3.016,
    lon: -23.418,
    mission: 'Surveyor 3',
    year: 1967,
    desc: 'Apollo 12 着陆点附近',
  },
  {
    name: 'Luna 9',
    type: 'landing',
    lat: 7.080,
    lon: -64.370,
    mission: 'Luna 9 (USSR)',
    year: 1966,
    desc: '人类首个月球软着陆',
  },
  {
    name: 'Chang\'e 3',
    type: 'landing',
    lat: 44.126,
    lon: -19.501,
    mission: '嫦娥三号',
    year: 2013,
    desc: '中国首次月球软着陆',
  },
  {
    name: 'Chang\'e 4',
    type: 'landing',
    lat: -45.457,
    lon: 177.589,
    mission: '嫦娥四号',
    year: 2019,
    desc: '人类首次月球背面软着陆 (Von Kármán 环形山)',
  },
  {
    name: 'Chang\'e 5',
    type: 'landing',
    lat: 43.058,
    lon: -51.916,
    mission: '嫦娥五号',
    year: 2020,
    desc: '中国首次月球采样返回',
  },
  {
    name: 'Chandrayaan-3',
    type: 'landing',
    lat: -69.373,
    lon: 32.319,
    mission: '月船三号 (India)',
    year: 2023,
    desc: '印度首次月球南极着陆',
  },
];

// ---------------------------------------------------------------------------
// 主要环形山 (Major Craters)
// ---------------------------------------------------------------------------

export const MAJOR_CRATERS: LunarSite[] = [
  { name: '第谷 (Tycho)', type: 'crater', lat: -43.300, lon: -11.220, desc: '直径85km，最著名的辐射纹环形山' },
  { name: '哥白尼 (Copernicus)', type: 'crater', lat: 9.620, lon: -20.080, desc: '直径93km，大型辐射纹环形山' },
  { name: '开普勒 (Kepler)', type: 'crater', lat: 8.100, lon: -38.000, desc: '直径32km，高反照率环形山' },
  { name: '柏拉图 (Plato)', type: 'crater', lat: 51.600, lon: -9.300, desc: '直径101km，暗色平原环形山' },
  { name: '阿里斯塔克 (Aristarchus)', type: 'crater', lat: 23.700, lon: -47.400, desc: '直径40km，月球上最亮的环形山之一' },
  { name: '阿方索 (Alphonsus)', type: 'crater', lat: -13.400, lon: -2.800, desc: '直径119km，有暗色halo' },
  { name: '克拉维 (Clavius)', type: 'crater', lat: -58.400, lon: -14.400, desc: '直径231km，月球正面最大环形山之一' },
  { name: '朗格伦 (Langrenus)', type: 'crater', lat: -8.900, lon: 61.040, desc: '直径132km' },
  { name: '格里马第 (Grimaldi)', type: 'crater', lat: -5.200, lon: -68.600, desc: '直径222km，暗色平原环形山' },
  { name: '皮塔图斯 (Pitatus)', type: 'crater', lat: -29.800, lon: -13.500, desc: '直径101km' },
  { name: '赫歇耳环形山 (Herschel)', type: 'crater', lat: -5.700, lon: -2.100, desc: '直径41km' },
  { name: '阿尔巴泰尼 (Albategnius)', type: 'crater', lat: -11.200, lon: 4.100, desc: '直径136km' },
];

// ---------------------------------------------------------------------------
// 主要月海 (Major Maria)
// ---------------------------------------------------------------------------

export const MAJOR_MARIA: LunarSite[] = [
  { name: '雨海 (Mare Imbrium)', type: 'mare', lat: 32.800, lon: -15.600, desc: '直径约1,123km' },
  { name: '静海 (Mare Tranquillitatis)', type: 'mare', lat: 8.500, lon: 31.400, desc: '直径约873km，Apollo 11着陆区' },
  { name: '风暴洋 (Oceanus Procellarum)', type: 'mare', lat: 18.400, lon: -57.400, desc: '月球最大月海，约2,500km' },
  { name: '澄海 (Mare Serenitatis)', type: 'mare', lat: 28.000, lon: 17.500, desc: '直径约707km' },
  { name: '冷海 (Mare Frigoris)', type: 'mare', lat: 56.000, lon: 1.400, desc: '直径约1,596km，狭长月海' },
  { name: '丰富海 (Mare Fecunditatis)', type: 'mare', lat: -7.800, lon: 51.300, desc: '直径约909km' },
  { name: '危海 (Mare Crisium)', type: 'mare', lat: 17.000, lon: 59.100, desc: '直径约418km，独立圆形月海' },
  { name: '云海 (Mare Nubium)', type: 'mare', lat: -21.300, lon: -16.600, desc: '直径约715km' },
  { name: '酒海 (Mare Nectaris)', type: 'mare', lat: -15.200, lon: 35.500, desc: '直径约333km' },
  { name: '湿海 (Mare Humorum)', type: 'mare', lat: -24.400, lon: -38.600, desc: '直径约389km' },
  { name: '汽海 (Mare Vaporum)', type: 'mare', lat: 13.300, lon: 3.600, desc: '直径约245km，位于雨海和澄海之间' },
];

// ---------------------------------------------------------------------------
// 聚合访问
// ---------------------------------------------------------------------------

/** 所有着陆点（Apollo + 其他） */
export const ALL_LANDING_SITES: LunarSite[] = [...APOLLO_LANDING_SITES, ...OTHER_LANDING_SITES];

/** 所有显要特征 */
export const ALL_LUNAR_SITES: LunarSite[] = [
  ...APOLLO_LANDING_SITES,
  ...OTHER_LANDING_SITES,
  ...MAJOR_CRATERS,
  ...MAJOR_MARIA,
];

/**
 * 将所有坐标转换为笛卡尔坐标。
 * 月球半径: 1737.4 km
 * lon/lat → xyz (单位: km)，y 轴朝北，z 轴朝上（月心北极）
 */
export function lunarCoordToCartesian(lon: number, lat: number, radius: number = 1737.4): { x: number; y: number; z: number } {
  const lonRad = (lon * Math.PI) / 180;
  const latRad = (lat * Math.PI) / 180;
  const cosLat = Math.cos(latRad);
  return {
    x: radius * cosLat * Math.cos(-lonRad),  // 经度正东，Cesium/Three.js 的 x 轴
    y: radius * Math.sin(latRad),             // y 轴朝北（纬度）
    z: radius * cosLat * Math.sin(-lonRad),   // z 轴
  };
}

/**
 * AI 可验证：检查所有坐标是否在有效范围内
 */
export function validateSites(sites: LunarSite[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  for (const site of sites) {
    if (site.lat < -90 || site.lat > 90) {
      errors.push(`${site.name}: latitude ${site.lat} out of range [-90, 90]`);
    }
    if (site.lon < -180 || site.lon > 180) {
      errors.push(`${site.name}: longitude ${site.lon} out of range [-180, 180]`);
    }
  }
  return { valid: errors.length === 0, errors };
}
