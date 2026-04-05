/**
 * @module mods/flight-tracking/FlightTrackingMod
 * @description 航班追踪 MOD 核心实现
 */

import * as Cesium from 'cesium';
import type { ModLifecycleHooks, ModContext } from '@/lib/mod-manager/types';
import { FlightController } from './controller/FlightController';
import { AircraftRenderer } from './renderer/AircraftRenderer';
import { FlightPathRenderer } from './renderer/FlightPathRenderer';
import { useFlightStore } from './store/flightStore';
import { getOpenSkyClient } from './api/OpenSkyClient';

/**
 * MOD 运行时状态
 */
interface FlightModState {
  controller: FlightController | null;
  aircraftRenderer: AircraftRenderer | null;
  pathRenderer: FlightPathRenderer | null;
  storeUnsubscribe: (() => void) | null;
  viewerReadyListener: (() => void) | null;
}

const state: FlightModState = {
  controller: null,
  aircraftRenderer: null,
  pathRenderer: null,
  storeUnsubscribe: null,
  viewerReadyListener: null,
};

/**
 * 获取 Cesium Viewer 实例
 */
function getCesiumViewer(): Cesium.Viewer | null {
  return (window as unknown as Record<string, unknown>).__cesiumViewer as Cesium.Viewer ?? null;
}

/**
 * 尝试初始化渲染器（viewer 就绪时调用）
 */
function tryInitRenderers(context: ModContext): void {
  const viewer = getCesiumViewer();
  if (!viewer) {
    context.logger.warn('[FlightTracking] Cesium Viewer 未就绪，渲染器暂未初始化');
    return;
  }

  const { config } = useFlightStore.getState();

  const aircraftRenderer = new AircraftRenderer(config.altitudeColors);
  aircraftRenderer.initialize(viewer);
  aircraftRenderer.onAircraftClick = (icao24) => {
    useFlightStore.getState().selectFlight(icao24);
    context.emit('flight:selected', { icao24 });
  };
  state.aircraftRenderer = aircraftRenderer;

  const pathRenderer = new FlightPathRenderer();
  pathRenderer.initialize(viewer);
  state.pathRenderer = pathRenderer;

  // 立即渲染当前已有数据
  const flights = Array.from(useFlightStore.getState().flights.values());
  if (flights.length > 0) aircraftRenderer.update(flights);
}

export const flightTrackingHooks: ModLifecycleHooks = {
  onLoad: async (context: ModContext) => {
    context.logger.info('[FlightTracking] MOD 加载中...');

    // 从 MOD 配置恢复设置
    const savedConfig = context.config as Record<string, unknown>;
    if (savedConfig && Object.keys(savedConfig).length > 0) {
      useFlightStore.getState().setConfig(savedConfig as never);
    }

    context.logger.info('[FlightTracking] MOD 加载完成');
  },

  onEnable: async (context: ModContext) => {
    context.logger.info('[FlightTracking] MOD 启用中...');

    const store = useFlightStore.getState();
    const { config } = store;

    // 初始化 OpenSky 客户端凭证
    if (config.openSkyUsername && config.openSkyPassword) {
      getOpenSkyClient().setCredentials(config.openSkyUsername, config.openSkyPassword);
    }

    // 尝试初始化渲染器（Cesium 可能尚未就绪）
    tryInitRenderers(context);

    // 监听 Cesium viewer 就绪事件，延迟初始化渲染器
    const onViewerReady = () => {
      if (!state.aircraftRenderer) {
        context.logger.info('[FlightTracking] Cesium Viewer 就绪，初始化渲染器');
        tryInitRenderers(context);
      }
    };
    window.addEventListener('cesium:viewer-ready', onViewerReady);
    state.viewerReadyListener = onViewerReady;

    // 订阅 store 变化，同步渲染
    state.storeUnsubscribe = useFlightStore.subscribe((s) => {
      if (state.aircraftRenderer) {
        const flights = Array.from(s.flights.values());
        state.aircraftRenderer.update(flights);
        state.aircraftRenderer.selectAircraft(s.selectedIcao24);
      }
    });

    // 启动数据控制器
    const controller = new FlightController(context);
    state.controller = controller;
    controller.start();

    context.logger.info('[FlightTracking] MOD 启用完成');
  },

  onDisable: async (context: ModContext) => {
    context.logger.info('[FlightTracking] MOD 禁用中...');

    // 移除 viewer 就绪监听
    if (state.viewerReadyListener) {
      window.removeEventListener('cesium:viewer-ready', state.viewerReadyListener);
      state.viewerReadyListener = null;
    }

    // 停止数据轮询
    state.controller?.stop();
    state.controller = null;

    // 取消 store 订阅
    state.storeUnsubscribe?.();
    state.storeUnsubscribe = null;

    // 清理渲染器
    state.aircraftRenderer?.dispose();
    state.aircraftRenderer = null;

    state.pathRenderer?.dispose();
    state.pathRenderer = null;

    // 清空数据
    useFlightStore.getState().clearFlights();

    context.logger.info('[FlightTracking] MOD 禁用完成');
  },

  onUnload: async (context: ModContext) => {
    context.logger.info('[FlightTracking] MOD 卸载');
  },

  onError: (error: Error, context: ModContext) => {
    context.logger.error('[FlightTracking] MOD 错误:', error.message);
  },
};

/**
 * 获取航班追踪 MOD 配置
 */
export function getFlightTrackingMod() {
  // 延迟导入避免循环依赖
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { flightTrackingManifest } = require('./manifest') as typeof import('./manifest');
  return {
    manifest: flightTrackingManifest,
    hooks: flightTrackingHooks,
  };
}
