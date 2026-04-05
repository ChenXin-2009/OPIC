/**
 * @module mods/flight-tracking/controller/FlightController
 * @description 航班数据控制器，负责数据轮询和错误恢复
 */

import type { ModContext } from '@/lib/mod-manager/types';
import { getOpenSkyClient } from '../api/OpenSkyClient';
import { OpenSkyError } from '../api/errors';
import { useFlightStore } from '../store/flightStore';
import type { BoundingBox } from '../types';

const MAX_RETRIES = 5;
const BASE_RETRY_DELAY = 3000;

export class FlightController {
  private context: ModContext;
  private timerId: number | null = null;
  private disposed = false;

  constructor(context: ModContext) {
    this.context = context;
  }

  /**
   * 启动数据轮询
   */
  start(): void {
    this.disposed = false;
    this.fetchAndSchedule();
  }

  /**
   * 停止数据轮询
   */
  stop(): void {
    this.disposed = true;
    if (this.timerId !== null) {
      this.context.clearTimeout(this.timerId);
      this.timerId = null;
    }
  }

  /**
   * 手动触发刷新
   */
  async refresh(): Promise<void> {
    await this.fetchFlights();
  }

  // ---- 私有方法 ----

  private fetchAndSchedule(): void {
    this.fetchFlights().finally(() => {
      if (this.disposed) return;
      const { config } = useFlightStore.getState();
      this.timerId = this.context.setTimeout(
        () => this.fetchAndSchedule(),
        config.updateInterval
      );
    });
  }

  private async fetchFlights(): Promise<void> {
    if (this.disposed) return;

    const store = useFlightStore.getState();
    const { config } = store;

    store.setLoading(true);
    store.setError(null);

    try {
      const client = getOpenSkyClient();

      // 设置凭证
      if (config.openSkyUsername && config.openSkyPassword) {
        client.setCredentials(config.openSkyUsername, config.openSkyPassword);
      }

      const bbox = config.boundingBox ?? this.getCameraViewBbox();
      const states = bbox
        ? await client.getStatesByBoundingBox(bbox)
        : await client.getAllStates();

      if (this.disposed) return;

      store.setFlights(states);
      store.setLastUpdate(Date.now());
      store.resetRetry();

      this.context.logger.debug(
        `[FlightTracking] 获取到 ${states.length} 架飞机`
      );
    } catch (error) {
      if (this.disposed) return;

      const msg = error instanceof OpenSkyError
        ? `API 错误 (${error.statusCode})`
        : error instanceof Error
          ? error.message
          : '未知错误';

      store.setError(msg);
      store.incrementRetry();

      const { retryCount } = store.fetchStatus;
      this.context.logger.warn(`[FlightTracking] 数据获取失败: ${msg}，重试次数: ${retryCount}`);

      if (retryCount >= MAX_RETRIES) {
        this.context.logger.error('[FlightTracking] 连续失败次数过多，暂停获取');
      }
    } finally {
      if (!this.disposed) {
        store.setLoading(false);
      }
    }
  }

  /**
   * 根据相机视野计算 bounding box（简化实现）
   */
  private getCameraViewBbox(): BoundingBox | null {
    try {
      const distance = this.context.camera.cameraDistance;
      // 距离较远时返回 null（全球模式）
      if (distance > 0.1) return null;

      // 近距离时基于视图偏移估算范围
      const offset = this.context.camera.viewOffset;
      const range = 20; // 度
      return {
        lamin: Math.max(-90, offset.y - range),
        lomin: Math.max(-180, offset.x - range),
        lamax: Math.min(90, offset.y + range),
        lomax: Math.min(180, offset.x + range),
      };
    } catch {
      return null;
    }
  }
}
