/**
 * 相机跟随 Hook (useCameraFollow)
 *
 * 实现相机自动跟随指定卫星的功能。
 * 当卫星在视野中时，相机自动聚焦并保持跟踪。
 */

import { useEffect } from 'react';
import { useSatelliteStore } from '@/lib/store/useSatelliteStore';

/**
 * useCameraFollow Hook选项
 */
export interface UseCameraFollowOptions {
  /** 目标卫星NORAD ID */
  targetNoradId: number | null;
  /** 是否启用跟随 */
  enabled: boolean;
}

/**
 * useCameraFollow Hook返回值
 */
export interface UseCameraFollowReturn {
  /** 是否正在跟随 */
  isFollowing: boolean;
}

/**
 * 相机跟随Hook
 * 
 * 通过Store设置相机跟随目标，由3D Canvas组件监听并执行实际的相机控制
 * 
 * @param options 跟随选项
 * @returns 跟随状态
 */
export function useCameraFollow(options: UseCameraFollowOptions): UseCameraFollowReturn {
  const { targetNoradId, enabled } = options;
  const setCameraFollowTarget = useSatelliteStore((state) => state.setCameraFollowTarget);
  const cameraFollowTarget = useSatelliteStore((state) => state.cameraFollowTarget);

  useEffect(() => {
    if (enabled && targetNoradId) {
      setCameraFollowTarget(targetNoradId);
    } else {
      setCameraFollowTarget(null);
    }

    return () => {
      // 清理：停止跟随
      if (enabled && targetNoradId) {
        setCameraFollowTarget(null);
      }
    };
  }, [targetNoradId, enabled, setCameraFollowTarget]);

  return {
    isFollowing: cameraFollowTarget === targetNoradId && enabled,
  };
}
