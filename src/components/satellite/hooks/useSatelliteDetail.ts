import { useState, useEffect, useCallback, useRef } from 'react';
import { useSatelliteStore } from '@/lib/store/useSatelliteStore';
import { TLEData, SatelliteDetailData, SatelliteCategory } from '@/lib/types/satellite';

/**
 * 从TLE数据生成详情
 */
function generateDetailsFromTLE(noradId: number, tleData: TLEData): SatelliteDetailData {
  const { name, line1, line2, category } = tleData;
  
  // 从TLE解析基本信息
  const cosparId = line1.substring(9, 17).trim();
  const launchYear = parseInt(line1.substring(9, 11), 10);
  const fullLaunchYear = launchYear < 57 ? 2000 + launchYear : 1900 + launchYear;
  
  // 从TLE2解析轨道参数
  const inclination = parseFloat(line2.substring(8, 16).trim());
  const raan = parseFloat(line2.substring(17, 25).trim());
  const eccentricity = parseFloat('0.' + line2.substring(26, 33).trim());
  const argOfPerigee = parseFloat(line2.substring(34, 42).trim());
  const meanAnomaly = parseFloat(line2.substring(43, 51).trim());
  const meanMotion = parseFloat(line2.substring(52, 63).trim());
  
  // 计算轨道周期（分钟）
  const period = 1440 / meanMotion;
  
  // 估算半长轴
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
      latitude: 0,
      longitude: 0,
      altitude: (perigee + apogee) / 2,
      velocity: 0,
      distance: 0,
    },
    physicalProperties: {},
    launchInfo: {
      launchDate: `${fullLaunchYear}`,
    },
    missionInfo: {
      type: getCategoryType(category),
      purpose: getCategoryPurpose(category),
    },
  };
}

/**
 * 合并元数据
 */
function mergeMetadata(details: SatelliteDetailData, metadata: any): SatelliteDetailData {
  if (!metadata) return details;

  return {
    ...details,
    basicInfo: {
      ...details.basicInfo,
      country: metadata.country,
      owner: metadata.owner,
    },
    physicalProperties: {
      ...details.physicalProperties,
      mass: metadata.launchMass,
    },
    launchInfo: {
      ...details.launchInfo,
      launchDate: metadata.launchDate || details.launchInfo?.launchDate,
      launchSite: metadata.launchSite,
      launchVehicle: metadata.launchVehicle,
    },
    missionInfo: {
      ...details.missionInfo,
      operator: metadata.operator,
      purpose: metadata.purpose || details.missionInfo?.purpose,
      expectedLifetime: metadata.expectedLifetime,
    },
  };
}

function getCategoryType(category: SatelliteCategory): string {
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

function getCategoryPurpose(category: SatelliteCategory): string {
  const purposeMap: Partial<Record<SatelliteCategory, string>> = {
    [SatelliteCategory.ACTIVE]: 'General satellite operations',
    [SatelliteCategory.GPS]: 'Global positioning and navigation',
    [SatelliteCategory.COMMUNICATION]: 'Communication and broadcasting',
    [SatelliteCategory.WEATHER]: 'Weather monitoring and forecasting',
    [SatelliteCategory.ISS]: 'International Space Station',
    [SatelliteCategory.SCIENCE]: 'Scientific research',
    [SatelliteCategory.OTHER]: 'Various purposes',
  };
  return purposeMap[category] || 'Unknown purpose';
}

/**
 * useSatelliteDetail Hook返回值
 */
export interface UseSatelliteDetailReturn {
  /** 基本TLE数据 */
  tleData: TLEData | null;
  /** 扩展详情数据 */
  detailData: SatelliteDetailData | null;
  /** 加载状态 */
  loading: boolean;
  /** 错误信息 */
  error: Error | null;
  /** 重试加载 */
  retry: () => void;
}

/**
 * 卫星详情数据Hook
 * 
 * 功能:
 * - 从Store获取TLE数据
 * - 异步加载扩展详情数据
 * - 处理加载错误和重试
 * - 管理AbortController取消请求
 * 
 * @param noradId 卫星NORAD ID
 * @returns 卫星详情数据和状态
 */
export function useSatelliteDetail(noradId: number | null): UseSatelliteDetailReturn {
  const [detailData, setDetailData] = useState<SatelliteDetailData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  // 从Store获取TLE数据
  const tleData = useSatelliteStore((state) => 
    noradId ? state.tleData.get(noradId) || null : null
  );

  // 使用ref存储AbortController以便取消请求
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * 加载详情数据
   */
  const loadDetailData = useCallback(async (id: number) => {
    // 取消之前的请求
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // 创建新的AbortController
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      console.log(`[useSatelliteDetail] 加载详情数据: NORAD ID=${id}`);

      // 优化: 直接从store获取TLE数据,不需要通过API查询
      const satelliteState = useSatelliteStore.getState().satellites.get(id);
      const storeTleData = useSatelliteStore.getState().tleData.get(id);
      
      if (!storeTleData) {
        throw new Error('卫星TLE数据不存在');
      }

      // 从TLE生成基本详情
      const generatedDetails = generateDetailsFromTLE(id, storeTleData);

      // 并行获取元数据
      const metadataPromise = fetch(`/api/satellites/metadata?noradId=${id}`, {
        signal: controller.signal,
      }).then(res => res.ok ? res.json() : null).catch(() => null);

      const metadata = await metadataPromise;

      // 检查是否被取消
      if (controller.signal.aborted) {
        return;
      }

      // 合并元数据
      const detailData = mergeMetadata(generatedDetails, metadata);

      console.log(`[useSatelliteDetail] 成功加载详情数据: ${detailData.basicInfo?.name}`);

      setDetailData(detailData);
      setLoading(false);
    } catch (err) {
      // 忽略取消错误
      if (err instanceof Error && err.name === 'AbortError') {
        console.log(`[useSatelliteDetail] 请求被取消`);
        return;
      }

      console.error('[useSatelliteDetail] 加载详情数据失败:', err);

      const errorObj = err instanceof Error ? err : new Error('未知错误');
      setError(errorObj);
      setLoading(false);
    }
  }, []);

  /**
   * 重试加载
   */
  const retry = useCallback(() => {
    if (noradId) {
      loadDetailData(noradId);
    }
  }, [noradId, loadDetailData]);

  /**
   * 当noradId变化时加载数据
   */
  useEffect(() => {
    if (noradId) {
      loadDetailData(noradId);
    } else {
      // 清空数据
      setDetailData(null);
      setError(null);
      setLoading(false);
    }

    // 清理函数：取消请求
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, [noradId, loadDetailData]);

  return {
    tleData,
    detailData,
    loading,
    error,
    retry,
  };
}
