/**
 * 全球货运与贸易路线 - 内置演示数据
 *
 * 提供无需外部 API 即可展示的离线演示数据集，包含：
 * - DEMO_TRADE_ROUTES：主要全球海运贸易走廊（跨太平洋、跨大西洋、欧亚苏伊士等 8 条）
 * - DEMO_AIR_ROUTES：主要全球航空货运航线（跨太平洋、跨大西洋、欧亚 3 条）
 * - MAJOR_PORTS：全球主要海港（22 个）
 * - MAJOR_AIRPORTS：全球主要机场（16 个）
 *
 * 所有数据均为静态示例，经纬度基于真实世界坐标。
 */

import type { TradeRoute, Port } from './types';

/** 主要全球海运贸易走廊 */
export const DEMO_TRADE_ROUTES: TradeRoute[] = [
  {
    id: 'transpacific',
    name: 'Trans-Pacific Route',
    nameZh: '跨太平洋航线',
    type: 'sea',
    color: '#00aaff',
    description: 'Asia - North America major container route',
    waypoints: [
      { lat: 31.23, lon: 121.47 },  // Shanghai
      { lat: 35.45, lon: 139.63 },  // Tokyo Bay
      { lat: 37.78, lon: 155.0 },   // Mid Pacific
      { lat: 40.0,  lon: 175.0 },   // North Pacific
      { lat: 47.6,  lon: -122.33 }, // Seattle
      { lat: 37.77, lon: -122.42 }, // San Francisco
      { lat: 33.74, lon: -118.27 }, // Los Angeles
    ],
  },
  {
    id: 'transatlantic',
    name: 'Trans-Atlantic Route',
    nameZh: '跨大西洋航线',
    type: 'sea',
    color: '#4488ff',
    description: 'Europe - North America trade route',
    waypoints: [
      { lat: 51.9,  lon: 4.48 },    // Rotterdam
      { lat: 53.55, lon: -3.0 },    // Liverpool
      { lat: 52.0,  lon: -15.0 },   // West of Ireland
      { lat: 48.0,  lon: -30.0 },   // Mid Atlantic
      { lat: 43.0,  lon: -50.0 },   // West Atlantic
      { lat: 40.69, lon: -74.04 },  // New York
      { lat: 36.85, lon: -76.29 },  // Norfolk
    ],
  },
  {
    id: 'europe_asia',
    name: 'Europe-Asia (Suez)',
    nameZh: '欧亚航线（苏伊士）',
    type: 'sea',
    color: '#ff8800',
    description: 'Europe to Asia via Suez Canal',
    waypoints: [
      { lat: 51.9,  lon: 4.48 },    // Rotterdam
      { lat: 36.14, lon: -5.35 },   // Gibraltar
      { lat: 37.0,  lon: 10.0 },    // Mediterranean
      { lat: 31.26, lon: 32.31 },   // Suez Canal
      { lat: 27.0,  lon: 34.0 },    // Red Sea
      { lat: 12.5,  lon: 43.5 },    // Gulf of Aden
      { lat: 11.0,  lon: 51.0 },    // Arabian Sea
      { lat: 1.35,  lon: 103.82 },  // Singapore
      { lat: 22.3,  lon: 114.17 },  // Hong Kong
      { lat: 31.23, lon: 121.47 },  // Shanghai
    ],
  },
  {
    id: 'cape_of_good_hope',
    name: 'Cape of Good Hope Route',
    nameZh: '好望角航线',
    type: 'sea',
    color: '#ff4444',
    description: 'Alternative Europe-Asia route via Cape of Good Hope',
    waypoints: [
      { lat: 51.9,  lon: 4.48 },    // Rotterdam
      { lat: 36.14, lon: -5.35 },   // Gibraltar
      { lat: 15.0,  lon: -17.0 },   // West Africa
      { lat: -5.0,  lon: 5.0 },     // Gulf of Guinea
      { lat: -34.36, lon: 18.47 },  // Cape of Good Hope
      { lat: -20.0, lon: 40.0 },    // Mozambique Channel
      { lat: -10.0, lon: 50.0 },    // Indian Ocean
      { lat: 1.35,  lon: 103.82 },  // Singapore
    ],
  },
  {
    id: 'indian_ocean',
    name: 'Indian Ocean Route',
    nameZh: '印度洋航线',
    type: 'sea',
    color: '#00ccaa',
    description: 'Middle East oil tanker routes',
    waypoints: [
      { lat: 26.19, lon: 50.63 },   // Persian Gulf
      { lat: 24.0,  lon: 58.0 },    // Gulf of Oman
      { lat: 12.5,  lon: 43.5 },    // Gulf of Aden
      { lat: 5.0,   lon: 60.0 },    // Arabian Sea
      { lat: -5.0,  lon: 75.0 },    // Indian Ocean
      { lat: 1.35,  lon: 103.82 },  // Singapore
      { lat: 22.3,  lon: 114.17 },  // Hong Kong
    ],
  },
  {
    id: 'south_america_europe',
    name: 'South America - Europe',
    nameZh: '南美-欧洲航线',
    type: 'sea',
    color: '#cc44ff',
    description: 'South American commodities to Europe',
    waypoints: [
      { lat: -23.0, lon: -43.17 },  // Rio de Janeiro
      { lat: -34.6, lon: -58.37 },  // Buenos Aires
      { lat: -40.0, lon: -50.0 },   // South Atlantic
      { lat: -20.0, lon: -30.0 },   // Mid Atlantic
      { lat: 0.0,   lon: -20.0 },   // Equatorial Atlantic
      { lat: 20.0,  lon: -15.0 },   // North Atlantic
      { lat: 36.14, lon: -5.35 },   // Gibraltar
      { lat: 51.9,  lon: 4.48 },    // Rotterdam
    ],
  },
  {
    id: 'asia_australia',
    name: 'Asia - Australia',
    nameZh: '亚澳航线',
    type: 'sea',
    color: '#ffcc00',
    description: 'Asia to Australia trade route',
    waypoints: [
      { lat: 31.23, lon: 121.47 },  // Shanghai
      { lat: 22.3,  lon: 114.17 },  // Hong Kong
      { lat: 1.35,  lon: 103.82 },  // Singapore
      { lat: -8.0,  lon: 115.0 },   // Bali Strait
      { lat: -20.0, lon: 120.0 },   // NW Australia
      { lat: -31.95, lon: 115.86 }, // Perth
      { lat: -33.87, lon: 151.21 }, // Sydney
    ],
  },
  {
    id: 'northwest_passage',
    name: 'Northern Sea Route',
    nameZh: '北方海路',
    type: 'sea',
    color: '#aaddff',
    description: 'Arctic shipping route (seasonal)',
    waypoints: [
      { lat: 51.9,  lon: 4.48 },    // Rotterdam
      { lat: 60.0,  lon: 5.0 },     // Norway
      { lat: 70.0,  lon: 25.0 },    // Barents Sea
      { lat: 75.0,  lon: 60.0 },    // Kara Sea
      { lat: 73.0,  lon: 100.0 },   // Laptev Sea
      { lat: 70.0,  lon: 140.0 },   // East Siberian Sea
      { lat: 65.0,  lon: 170.0 },   // Bering Strait
      { lat: 52.0,  lon: -175.0 },  // North Pacific
      { lat: 35.45, lon: 139.63 },  // Tokyo
    ],
  },
];

/** 主要全球航空货运航线 */
export const DEMO_AIR_ROUTES: TradeRoute[] = [
  {
    id: 'air_transpacific',
    name: 'Trans-Pacific Air',
    nameZh: '跨太平洋空运',
    type: 'air',
    color: '#ffaa44',
    waypoints: [
      { lat: 31.23, lon: 121.47 },
      { lat: 35.55, lon: 139.78 },
      { lat: 51.5,  lon: -0.12 },   // Great circle via north
      { lat: 37.77, lon: -122.42 },
    ],
  },
  {
    id: 'air_transatlantic',
    name: 'Trans-Atlantic Air',
    nameZh: '跨大西洋空运',
    type: 'air',
    color: '#ff6644',
    waypoints: [
      { lat: 51.5,  lon: -0.12 },   // London
      { lat: 55.0,  lon: -20.0 },   // North Atlantic
      { lat: 50.0,  lon: -40.0 },
      { lat: 45.0,  lon: -60.0 },
      { lat: 40.69, lon: -74.04 },  // New York
    ],
  },
  {
    id: 'air_europe_asia',
    name: 'Europe-Asia Air',
    nameZh: '欧亚空运',
    type: 'air',
    color: '#ff4488',
    waypoints: [
      { lat: 51.5,  lon: -0.12 },   // London
      { lat: 55.0,  lon: 37.62 },   // Moscow
      { lat: 55.0,  lon: 80.0 },    // Siberia
      { lat: 43.0,  lon: 110.0 },   // Mongolia
      { lat: 31.23, lon: 121.47 },  // Shanghai
    ],
  },
];

/** 主要全球港口 */
export const MAJOR_PORTS: Port[] = [
  { id: 'shanghai',    name: 'Shanghai',       country: 'CN', lat: 31.23,  lon: 121.47, type: 'sea', size: 'mega',   annualTEU: 47300000, locode: 'CNSHA' },
  { id: 'singapore',  name: 'Singapore',      country: 'SG', lat: 1.35,   lon: 103.82, type: 'sea', size: 'mega',   annualTEU: 37200000, locode: 'SGSIN' },
  { id: 'ningbo',     name: 'Ningbo-Zhoushan',country: 'CN', lat: 29.87,  lon: 121.55, type: 'sea', size: 'mega',   annualTEU: 33400000, locode: 'CNNGB' },
  { id: 'shenzhen',   name: 'Shenzhen',       country: 'CN', lat: 22.54,  lon: 114.06, type: 'sea', size: 'mega',   annualTEU: 30000000, locode: 'CNSZX' },
  { id: 'guangzhou',  name: 'Guangzhou',      country: 'CN', lat: 23.13,  lon: 113.26, type: 'sea', size: 'large',  annualTEU: 24000000, locode: 'CNGZH' },
  { id: 'qingdao',    name: 'Qingdao',        country: 'CN', lat: 36.07,  lon: 120.38, type: 'sea', size: 'large',  annualTEU: 22000000, locode: 'CNTAO' },
  { id: 'busan',      name: 'Busan',          country: 'KR', lat: 35.1,   lon: 129.04, type: 'sea', size: 'large',  annualTEU: 21700000, locode: 'KRPUS' },
  { id: 'hongkong',   name: 'Hong Kong',      country: 'HK', lat: 22.3,   lon: 114.17, type: 'sea', size: 'large',  annualTEU: 18000000, locode: 'HKHKG' },
  { id: 'rotterdam',  name: 'Rotterdam',      country: 'NL', lat: 51.9,   lon: 4.48,   type: 'sea', size: 'mega',   annualTEU: 15300000, locode: 'NLRTM' },
  { id: 'dubai',      name: 'Jebel Ali',      country: 'AE', lat: 24.98,  lon: 55.06,  type: 'sea', size: 'large',  annualTEU: 14000000, locode: 'AEJEA' },
  { id: 'antwerp',    name: 'Antwerp',        country: 'BE', lat: 51.22,  lon: 4.4,    type: 'sea', size: 'large',  annualTEU: 12000000, locode: 'BEANR' },
  { id: 'losangeles', name: 'Los Angeles',    country: 'US', lat: 33.74,  lon: -118.27,type: 'sea', size: 'large',  annualTEU: 10700000, locode: 'USLAX' },
  { id: 'hamburg',    name: 'Hamburg',        country: 'DE', lat: 53.55,  lon: 9.99,   type: 'sea', size: 'large',  annualTEU: 8700000,  locode: 'DEHAM' },
  { id: 'tanjung',    name: 'Tanjung Pelepas',country: 'MY', lat: 1.36,   lon: 103.55, type: 'sea', size: 'large',  annualTEU: 9000000,  locode: 'MYTPP' },
  { id: 'kaohsiung',  name: 'Kaohsiung',      country: 'TW', lat: 22.62,  lon: 120.27, type: 'sea', size: 'large',  annualTEU: 10400000, locode: 'TWKHH' },
  { id: 'newyork',    name: 'New York/NJ',    country: 'US', lat: 40.69,  lon: -74.04, type: 'sea', size: 'large',  annualTEU: 9500000,  locode: 'USNYC' },
  { id: 'longbeach',  name: 'Long Beach',     country: 'US', lat: 33.77,  lon: -118.19,type: 'sea', size: 'large',  annualTEU: 9400000,  locode: 'USLGB' },
  { id: 'tianjin',    name: 'Tianjin',        country: 'CN', lat: 39.0,   lon: 117.72, type: 'sea', size: 'large',  annualTEU: 21000000, locode: 'CNTXG' },
  { id: 'colombo',    name: 'Colombo',        country: 'LK', lat: 6.93,   lon: 79.85,  type: 'sea', size: 'medium', annualTEU: 7200000,  locode: 'LKCMB' },
  { id: 'felixstowe', name: 'Felixstowe',     country: 'GB', lat: 51.96,  lon: 1.35,   type: 'sea', size: 'medium', annualTEU: 4000000,  locode: 'GBFXT' },
];

/** 主要全球机场 */
export const MAJOR_AIRPORTS: Port[] = [
  { id: 'hkg', name: 'Hong Kong Intl',      country: 'HK', lat: 22.31,  lon: 113.91, type: 'air', size: 'mega',  iata: 'HKG' },
  { id: 'pvg', name: 'Shanghai Pudong',     country: 'CN', lat: 31.14,  lon: 121.8,  type: 'air', size: 'mega',  iata: 'PVG' },
  { id: 'icn', name: 'Seoul Incheon',       country: 'KR', lat: 37.46,  lon: 126.44, type: 'air', size: 'mega',  iata: 'ICN' },
  { id: 'dxb', name: 'Dubai Intl',          country: 'AE', lat: 25.25,  lon: 55.36,  type: 'air', size: 'mega',  iata: 'DXB' },
  { id: 'fra', name: 'Frankfurt',           country: 'DE', lat: 50.03,  lon: 8.57,   type: 'air', size: 'mega',  iata: 'FRA' },
  { id: 'ord', name: "Chicago O'Hare",      country: 'US', lat: 41.98,  lon: -87.9,  type: 'air', size: 'mega',  iata: 'ORD' },
  { id: 'lax', name: 'Los Angeles Intl',    country: 'US', lat: 33.94,  lon: -118.41,type: 'air', size: 'mega',  iata: 'LAX' },
  { id: 'jfk', name: 'New York JFK',        country: 'US', lat: 40.64,  lon: -73.78, type: 'air', size: 'mega',  iata: 'JFK' },
  { id: 'lhr', name: 'London Heathrow',     country: 'GB', lat: 51.48,  lon: -0.45,  type: 'air', size: 'mega',  iata: 'LHR' },
  { id: 'sin', name: 'Singapore Changi',    country: 'SG', lat: 1.36,   lon: 103.99, type: 'air', size: 'mega',  iata: 'SIN' },
  { id: 'nrt', name: 'Tokyo Narita',        country: 'JP', lat: 35.77,  lon: 140.39, type: 'air', size: 'large', iata: 'NRT' },
  { id: 'cdg', name: 'Paris CDG',           country: 'FR', lat: 49.01,  lon: 2.55,   type: 'air', size: 'large', iata: 'CDG' },
  { id: 'ams', name: 'Amsterdam Schiphol',  country: 'NL', lat: 52.31,  lon: 4.77,   type: 'air', size: 'large', iata: 'AMS' },
  { id: 'mia', name: 'Miami Intl',          country: 'US', lat: 25.8,   lon: -80.29, type: 'air', size: 'large', iata: 'MIA' },
  { id: 'anc', name: 'Anchorage',           country: 'US', lat: 61.17,  lon: -149.99,type: 'air', size: 'large', iata: 'ANC' },
  { id: 'mel', name: 'Melbourne',           country: 'AU', lat: -37.67, lon: 144.84, type: 'air', size: 'large', iata: 'MEL' },
];
