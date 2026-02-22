/**
 * 卫星详情API路由
 * 
 * GET /api/satellites/[noradId]/details
 * 
 * 功能:
 * - 获取指定卫星的详细信息
 * - 返回基本信息、轨道参数、物理特性、发射信息和任务信息
 * - 实现缓存机制
 */

import { NextRequest, NextResponse } from 'next/server';
import { SatelliteDetailData, SatelliteCategory } from '@/lib/types/satellite';

// ============ 辅助函数 ============

/**
 * 根据类别生成任务类型
 */
function getMissionTypeByCategory(category: SatelliteCategory): string {
  const typeMap: Partial<Record<SatelliteCategory, string>> = {
    [SatelliteCategory.ACTIVE]: 'Active Satellite',
    [SatelliteCategory.GPS]: 'Navigation',
    [SatelliteCategory.COMMUNICATION]: 'Communication',
    [SatelliteCategory.WEATHER]: 'Weather Observation',
    [SatelliteCategory.ISS]: 'Space Station',
    [SatelliteCategory.SCIENCE]: 'Scientific Research',
    [SatelliteCategory.OTHER]: 'Other',
  };
  return typeMap[category] || 'Unknown';
}

/**
 * 根据类别生成任务目的
 */
function getMissionPurposeByCategory(category: SatelliteCategory): string {
  const purposeMap: Partial<Record<SatelliteCategory, string>> = {
    [SatelliteCategory.ACTIVE]: 'General satellite operations',
    [SatelliteCategory.GPS]: 'Global positioning and navigation',
    [SatelliteCategory.COMMUNICATION]: 'Communication and broadcasting',
    [SatelliteCategory.WEATHER]: 'Weather monitoring and forecasting',
    [SatelliteCategory.ISS]: 'International Space Station - Human spaceflight and research',
    [SatelliteCategory.SCIENCE]: 'Scientific research and experiments',
    [SatelliteCategory.OTHER]: 'Various purposes',
  };
  return purposeMap[category] || 'Unknown purpose';
}

/**
 * 动态生成卫星详情数据
 * 基于TLE数据和类别生成合理的详情信息
 */
function generateSatelliteDetails(
  noradId: number,
  name: string,
  category: SatelliteCategory,
  tle1: string,
  tle2: string
): SatelliteDetailData {
  // 从TLE解析基本信息
  const cosparId = tle1.substring(9, 17).trim();
  const launchYear = parseInt(tle1.substring(9, 11), 10);
  const fullLaunchYear = launchYear < 57 ? 2000 + launchYear : 1900 + launchYear;
  
  // 从TLE2解析轨道参数
  const inclination = parseFloat(tle2.substring(8, 16).trim());
  const raan = parseFloat(tle2.substring(17, 25).trim());
  const eccentricity = parseFloat('0.' + tle2.substring(26, 33).trim());
  const argOfPerigee = parseFloat(tle2.substring(34, 42).trim());
  const meanAnomaly = parseFloat(tle2.substring(43, 51).trim());
  const meanMotion = parseFloat(tle2.substring(52, 63).trim());
  
  // 计算轨道周期（分钟）
  const period = 1440 / meanMotion; // 1440分钟 = 1天
  
  // 估算半长轴（使用开普勒第三定律简化公式）
  // T^2 = (4π²/μ) * a³，其中μ = 398600.4418 km³/s² (地球引力常数)
  const mu = 398600.4418; // km³/s²
  const periodSeconds = period * 60;
  const semiMajorAxis = Math.pow((mu * periodSeconds * periodSeconds) / (4 * Math.PI * Math.PI), 1/3);
  
  // 计算近地点和远地点高度
  const earthRadius = 6371; // km
  const perigee = semiMajorAxis * (1 - eccentricity) - earthRadius;
  const apogee = semiMajorAxis * (1 + eccentricity) - earthRadius;

  return {
    noradId,
    basicInfo: {
      name,
      noradId,
      cosparId: cosparId || undefined,
      country: undefined, // 将从元数据获取
      owner: undefined, // 将从元数据获取
      category,
    },
    orbitalParameters: {
      semiMajorAxis,
      eccentricity,
      inclination,
      raan,
      argumentOfPerigee: argOfPerigee,
      meanAnomaly,
      period,
      apogee,
      perigee,
    },
    realTimeData: {
      latitude: 0,    // 需要实时计算
      longitude: 0,   // 需要实时计算
      altitude: (perigee + apogee) / 2, // 使用平均高度
      velocity: 0,    // 需要实时计算
      distance: 0,    // 需要实时计算
    },
    physicalProperties: {
      rcs: undefined, // 将从元数据获取
      mass: undefined, // 将从元数据获取
      size: undefined, // 将从元数据获取
    },
    launchInfo: {
      launchDate: `${fullLaunchYear}`, // 只能从TLE获取年份
      launchSite: undefined, // 将从元数据获取
      launchVehicle: undefined, // 将从元数据获取
    },
    missionInfo: {
      type: getMissionTypeByCategory(category),
      purpose: getMissionPurposeByCategory(category),
      operator: undefined, // 将从元数据获取
      expectedLifetime: undefined, // 将从元数据获取
    },
  };
}

// ============ 特殊卫星详情数据库 ============

/**
 * 知名卫星的详细信息（手动维护）
 * 这些卫星有更完整的数据
 */
const knownSatellitesDB: Record<number, {
  basicInfo?: Partial<SatelliteDetailData['basicInfo']>;
  physicalProperties?: Partial<SatelliteDetailData['physicalProperties']>;
  launchInfo?: Partial<SatelliteDetailData['launchInfo']>;
  missionInfo?: Partial<SatelliteDetailData['missionInfo']>;
}> = {
  // 国际空间站
  25544: {
    basicInfo: {
      country: 'International',
      owner: 'NASA/ROSCOSMOS/ESA/JAXA/CSA',
    },
    physicalProperties: {
      rcs: 1000.0,
      mass: 419725,
      size: '109m x 73m x 20m',
    },
    launchInfo: {
      launchDate: '1998-11-20',
      launchSite: 'Baikonur Cosmodrome',
      launchVehicle: 'Proton-K',
    },
    missionInfo: {
      operator: 'NASA/ROSCOSMOS/ESA/JAXA/CSA',
      expectedLifetime: '2030+',
    },
  },
  // 哈勃太空望远镜
  20580: {
    basicInfo: {
      country: 'US',
      owner: 'NASA/ESA',
    },
    physicalProperties: {
      rcs: 100.0,
      mass: 11110,
      size: '13.2m x 4.2m',
    },
    launchInfo: {
      launchDate: '1990-04-24',
      launchSite: 'Kennedy Space Center',
      launchVehicle: 'Space Shuttle Discovery',
    },
    missionInfo: {
      operator: 'NASA/ESA',
      expectedLifetime: '2030-2040',
    },
  },
  // 天宫空间站核心舱
  48274: {
    basicInfo: {
      country: 'China',
      owner: 'CNSA',
    },
    physicalProperties: {
      mass: 22500,
      size: '16.6m x 4.2m',
    },
    launchInfo: {
      launchDate: '2021-04-29',
      launchSite: 'Wenchang',
      launchVehicle: 'Long March 5B',
    },
    missionInfo: {
      operator: 'CNSA',
      expectedLifetime: '2031+',
    },
  },
};

/**
 * 从元数据API获取卫星详细信息
 */
async function fetchSatelliteMetadata(noradId: number, origin: string): Promise<any> {
  try {
    const metadataResponse = await fetch(
      `${origin}/api/satellites/metadata?noradId=${noradId}`,
      {
        cache: 'force-cache',
        signal: AbortSignal.timeout(3000),
      }
    );

    if (metadataResponse.ok) {
      return await metadataResponse.json();
    }
  } catch (error) {
    console.warn(`[API] 无法获取卫星 ${noradId} 的元数据:`, error);
  }

  return null;
}

// ============ API处理器 ============

/**
 * GET /api/satellites/[noradId]/details
 * 
 * 路径参数:
 * - noradId: 卫星NORAD ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ noradId: string }> }
) {
  try {
    // 1. 解析和验证参数 (Next.js 15+ params是Promise)
    const { noradId: noradIdStr } = await params;
    const noradId = parseInt(noradIdStr, 10);

    if (isNaN(noradId) || noradId <= 0) {
      return NextResponse.json(
        {
          error: 'INVALID_PARAMETER',
          message: '无效的NORAD ID',
          statusCode: 400,
        },
        { status: 400 }
      );
    }

    console.log(`[API] 获取卫星详情: NORAD ID=${noradId}`);

    // 2. 从主卫星API获取TLE数据
    // 优化: 使用并行请求而不是串行,并设置合理的超时
    let tleData;
    try {
      const categories = ['active', 'stations', 'gps-ops', 'geo', 'weather', 'science'];
      
      // 并行请求所有类别,取第一个成功的
      const requests = categories.map(async (category) => {
        try {
          const tleResponse = await fetch(
            `${request.nextUrl.origin}/api/satellites?category=${category}`,
            { 
              cache: 'default', // 使用缓存
              signal: AbortSignal.timeout(3000),
            }
          );
          
          if (tleResponse.ok) {
            const tleResult = await tleResponse.json();
            const found = tleResult.satellites?.find((sat: any) => sat.noradId === noradId);
            if (found) {
              return { found, category };
            }
          }
        } catch (err) {
          // 忽略单个请求的错误
          return null;
        }
        return null;
      });
      
      // 等待第一个成功的结果
      const results = await Promise.all(requests);
      const successResult = results.find(r => r !== null);
      
      if (successResult) {
        tleData = successResult.found;
        console.log(`[API] 找到卫星数据: ${tleData.name} (类别: ${successResult.category})`);
      }
    } catch (err) {
      console.warn('[API] 无法获取TLE数据:', err);
    }

    if (!tleData) {
      console.log(`[API] 卫星不存在: NORAD ID=${noradId}`);
      
      return NextResponse.json(
        {
          error: 'NOT_FOUND',
          message: '卫星不存在',
          statusCode: 404,
        },
        { status: 404 }
      );
    }

    // 3. 生成详情数据
    const generatedDetails = generateSatelliteDetails(
      noradId,
      tleData.name,
      tleData.category,
      tleData.line1,
      tleData.line2
    );

    // 4. 从元数据API获取详细信息
    const metadata = await fetchSatelliteMetadata(noradId, request.nextUrl.origin);

    // 5. 合并元数据
    if (metadata) {
      // 合并基本信息
      if (metadata.country) generatedDetails.basicInfo.country = metadata.country;
      if (metadata.owner) generatedDetails.basicInfo.owner = metadata.owner;
      if (metadata.cosparId) generatedDetails.basicInfo.cosparId = metadata.cosparId;

      // 合并物理特性
      if (metadata.launchMass) {
        generatedDetails.physicalProperties = generatedDetails.physicalProperties || {};
        generatedDetails.physicalProperties.mass = metadata.launchMass;
      }

      // 合并发射信息
      if (metadata.launchDate) generatedDetails.launchInfo!.launchDate = metadata.launchDate;
      if (metadata.launchSite) generatedDetails.launchInfo!.launchSite = metadata.launchSite;
      if (metadata.launchVehicle) generatedDetails.launchInfo!.launchVehicle = metadata.launchVehicle;

      // 合并任务信息
      if (metadata.operator) generatedDetails.missionInfo!.operator = metadata.operator;
      if (metadata.purpose) generatedDetails.missionInfo!.purpose = metadata.purpose;
      if (metadata.expectedLifetime) {
        generatedDetails.missionInfo!.expectedLifetime = metadata.expectedLifetime;
      }
    } else {
      // 如果没有metadata,尝试从COSPAR ID推断发射年份
      const cosparId = generatedDetails.basicInfo.cosparId;
      if (cosparId && cosparId.length >= 2) {
        const year = parseInt(cosparId.substring(0, 2), 10);
        const fullYear = year < 57 ? 2000 + year : 1900 + year;
        generatedDetails.launchInfo!.launchDate = `${fullYear}`;
      }
    }

    // 6. 合并知名卫星的额外信息
    const knownDetails = knownSatellitesDB[noradId];
    const detailData: SatelliteDetailData = {
      ...generatedDetails,
      basicInfo: {
        ...generatedDetails.basicInfo,
        ...knownDetails?.basicInfo,
      },
      physicalProperties: {
        ...generatedDetails.physicalProperties,
        ...knownDetails?.physicalProperties,
      },
      launchInfo: {
        ...generatedDetails.launchInfo,
        ...knownDetails?.launchInfo,
      },
      missionInfo: {
        ...generatedDetails.missionInfo,
        ...knownDetails?.missionInfo,
      },
    };

    console.log(`[API] 成功生成卫星详情: ${detailData.basicInfo.name}`);

    // 7. 返回详情数据
    return NextResponse.json(detailData, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600', // 缓存1小时
      },
    });

  } catch (error) {
    console.error('[API] 获取卫星详情失败:', error);

    const errorMessage = error instanceof Error ? error.message : '未知错误';

    return NextResponse.json(
      {
        error: 'INTERNAL_SERVER_ERROR',
        message: `获取卫星详情失败: ${errorMessage}`,
        statusCode: 500,
      },
      { status: 500 }
    );
  }
}
