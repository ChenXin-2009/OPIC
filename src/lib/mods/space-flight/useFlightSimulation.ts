/**
 * @module space-flight/useFlightSimulation
 * @description 飞行仿真 React Hook
 *
 * 将物理积分器接入 UI，提供实时遥测和飞行控制。
 * 仿真循环由纯函数核心 `simulation-core.ts` 驱动：
 * - 1× 时间加速 = 1× 真实秒数，不再额外快 10 倍
 * - 自动分级时会正确丢弃已分离级的干质量
 * - 触地后会立即钳制到地表，避免穿地后数值爆炸
 * - 键盘输入通过 PlayerInput + flight-controller 适配层接入
 */

'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { PlayerInput } from '@/lib/3d/player/PlayerInput';
import { type FlightState } from '@/lib/flight-dynamics';
import {
  computeVehicleSummary,
  type VehicleConfig,
} from '@/lib/data/rocket-parts';
import { launchSiteToInitialState, type LaunchSite } from '@/lib/data/launch-sites';
import {
  type SimulationTelemetry,
  computeMissionBodyRadius,
  defaultPlayerInputState,
  extractStageEngines,
  separateStage as separateFlightStage,
  simulateFlightFrame,
  type StageEngine,
} from './simulation-core';
import {
  clearFlightRenderSnapshot,
  setFlightRenderSnapshot,
} from './flight-runtime-store';
import { getTimeAPI } from '@/lib/mod-manager/api/TimeAPI';
import { getFlightCameraController, type FlightCameraMode } from './FlightCameraController';
import { useSolarSystemStore } from '@/lib/state';

/** 遥测数据（UI 显示用） */
export interface Telemetry extends SimulationTelemetry {
  launched: boolean;
  ended: boolean;
  endReason?: string;
}

/** 默认遥测 */
const EMPTY_TELEMETRY: Telemetry = {
  launched: false,
  ended: false,
  altitudeKm: 0,
  speedMs: 0,
  apogeeKm: 0,
  perigeeKm: 0,
  fuelPercent: 100,
  currentStage: 0,
  currentStageName: '-',
  stageBurnTimeRemaining: 0,
  missionTime: 0,
  maxQ: 0,
  massKg: 0,
};

/** UI 更新间隔 (ms) */
const UI_INTERVAL = 100;

export function useFlightSimulation() {
  const [telemetry, setTelemetry] = useState<Telemetry>(EMPTY_TELEMETRY);
  const [throttle, setThrottle] = useState(100);
  const [timeScale, setTimeScale] = useState(1);
  const [isRunning, setIsRunning] = useState(false);
  const [cameraMode, setCameraModeState] = useState<FlightCameraMode>('inertial');

  // 仿真状态（ref，避免重渲染）
  const flightStateRef = useRef<FlightState | null>(null);
  const enginesRef = useRef<StageEngine[]>([]);
  const currentStageRef = useRef(0);
  const vehicleConfigRef = useRef<VehicleConfig | null>(null);
  const launchSiteRef = useRef<LaunchSite | null>(null);
  const throttleRef = useRef(100);
  const timeScaleRef = useRef(1);
  const maxQRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastTickAtRef = useRef<number | null>(null);
  const bodyRadiusRef = useRef<number>(0);
  const playerInputRef = useRef<PlayerInput | null>(null);
  const stagePressedRef = useRef(false);
  const launchEpochMsRef = useRef<number | null>(null);
  const isLaunchingRef = useRef(false);

  useEffect(() => { throttleRef.current = throttle; }, [throttle]);
  useEffect(() => { timeScaleRef.current = timeScale; }, [timeScale]);

  // 将飞行时间倍率同步到全局 TimeAPI
  // timeScale (纯倍率) → TimeAPI timeSpeed (天/秒)
  useEffect(() => {
    getTimeAPI().setTimeSpeed(timeScale / 86400);
  }, [timeScale]);

  /** 停止仿真 */
  const stopSimulation = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    playerInputRef.current?.setEnabled(false);
    getTimeAPI().setTimeSpeed(1 / 86400); // 重置为实时速度
    // 释放相机锁定但保留高空标志，使终止后天空盒保持可见、用户可自由缩放
    getFlightCameraController().releaseOnSimulationEnd();
    setIsRunning(false);
  }, []);

  /** 仿真循环（每 100ms 执行一次） */
  const tick = useCallback(() => {
    const state = flightStateRef.current;
    const engines = enginesRef.current;
    if (!state || engines.length === 0) return;
    const now = Date.now();
    const lastTickAt = lastTickAtRef.current;
    const elapsedMs = lastTickAt ? Math.max(1, now - lastTickAt) : UI_INTERVAL;
    lastTickAtRef.current = now;

    const playerInput = playerInputRef.current?.getState() ?? defaultPlayerInputState();
    const stagePressed = playerInput.stage;
    const stageRequested = stagePressed && !stagePressedRef.current;
    stagePressedRef.current = stagePressed;

    let workingState = state;
    let workingStageIdx = currentStageRef.current;
    if (stageRequested) {
      const separated = separateFlightStage(workingState, engines, workingStageIdx);
      workingState = separated.state;
      workingStageIdx = separated.stageIndex;
    }

    const result = simulateFlightFrame({
      state: workingState,
      engines,
      stageIndex: workingStageIdx,
      throttlePercent: throttleRef.current,
      timeScale: timeScaleRef.current,
      realElapsedMs: elapsedMs,
      maxQ: maxQRef.current,
      bodyRadiusM: bodyRadiusRef.current,
      playerInput: {
        ...playerInput,
        stage: false,
      },
    });

    flightStateRef.current = result.state;
    enginesRef.current = result.engines;
    currentStageRef.current = result.stageIndex;
    maxQRef.current = result.maxQ;
    throttleRef.current = result.throttlePercent;

    const roundedThrottle = Math.round(result.throttlePercent);
    setThrottle((prev) => (prev === roundedThrottle ? prev : roundedThrottle));

    setTelemetry({
      ...result.telemetry,
      launched: true,
      ended: result.ended,
      endReason: result.endReason,
    });
    if (launchEpochMsRef.current !== null) {
      setFlightRenderSnapshot({
        active: true,
        ended: result.ended,
        positionEci: [...result.state.position] as [number, number, number],
        velocityEci: [...result.state.velocity] as [number, number, number],
        thrustDirectionEci: [...result.thrustDirectionEci] as [number, number, number],
        throttlePercent: result.throttlePercent,
        plumeActive: result.plumeActive,
        stageIndex: result.stageIndex,
        missionTimeS: result.state.time,
        absoluteTimeMs: launchEpochMsRef.current + result.state.time * 1000,
      });
    }

    if (result.ended) {
      stopSimulation();
    }
  }, [stopSimulation]);

  /** 启动仿真 */
  const launch = useCallback(async (vehicle: VehicleConfig, site: LaunchSite) => {
    if (isRunning || isLaunchingRef.current) return;
    isLaunchingRef.current = true;

    try {
    // 将 TerrainProvider 的椭球高同时用于物理初值和相机，确保火箭从真正
    // 发射架地面起飞，而不是从数据库中的近似海拔起飞。
    const launchSurface = await getFlightCameraController().getLaunchSurfaceHeight(site);
    const resolvedSite = launchSurface.terrainResolved
      ? { ...site, altitude: launchSurface.surfaceHeightM }
      : site;

    // 初始化发动机参数
    const engines = extractStageEngines(vehicle);
    enginesRef.current = engines;
    currentStageRef.current = 0;
    maxQRef.current = 0;

    // 计算初始质量
    const summary = computeVehicleSummary(vehicle);
    const initialMass = summary.totalWetMassKg;

    // 从太阳系 store 获取仿真时间，确保与 Cesium 时钟（驱动地球自转）使用
    // 同一时间基准。若使用挂钟时间 new Date()，GMST 计算会与 Cesium 地球自转
    // 不一致，导致火箭 ECEF 位置偏离发射架数千公里。
    const simTime = useSolarSystemStore.getState().currentTime;
    const date = simTime ? new Date(simTime.getTime()) : new Date();
    const initialState = launchSiteToInitialState(resolvedSite, date);
    launchEpochMsRef.current = date.getTime();
    bodyRadiusRef.current = computeMissionBodyRadius(
      initialState.position as [number, number, number],
      resolvedSite.altitude,
    );

    // 创建飞行状态
    flightStateRef.current = {
      position: [...initialState.position] as [number, number, number],
      velocity: [...initialState.velocity] as [number, number, number],
      mass: initialMass,
      time: 0,
    };

    vehicleConfigRef.current = vehicle;
    launchSiteRef.current = resolvedSite;
    getFlightCameraController().startTracking(resolvedSite);
    setIsRunning(true);
    lastTickAtRef.current = Date.now();
    stagePressedRef.current = false;
    playerInputRef.current?.setEnabled(true);
    setTelemetry({
      ...EMPTY_TELEMETRY,
      launched: true,
      altitudeKm: resolvedSite.altitude / 1000,
      massKg: initialMass,
      currentStageName: engines[0]?.name ?? '-',
    });
    setFlightRenderSnapshot({
      active: true,
      ended: false,
      positionEci: [...initialState.position] as [number, number, number],
      velocityEci: [...initialState.velocity] as [number, number, number],
      thrustDirectionEci: [1, 0, 0],
      throttlePercent: throttleRef.current,
      plumeActive: false,
      stageIndex: 0,
      missionTimeS: 0,
      absoluteTimeMs: date.getTime(),
    });

    // 启动仿真循环
    intervalRef.current = setInterval(tick, UI_INTERVAL);
    } finally {
      isLaunchingRef.current = false;
    }
  }, [isRunning, tick]);

  /** 中止任务 */
  const abort = useCallback(() => {
    stopSimulation();
    flightStateRef.current = null;
    lastTickAtRef.current = null;
    launchEpochMsRef.current = null;
    clearFlightRenderSnapshot();
    getFlightCameraController().stopTracking();
    setTelemetry(EMPTY_TELEMETRY);
    setCameraModeState('inertial');
  }, [stopSimulation]);

  const setCameraMode = useCallback((mode: FlightCameraMode) => {
    setCameraModeState(mode);
    getFlightCameraController().setMode(mode);
  }, []);

  /** 手动分级分离 */
  const separateStage = useCallback(() => {
    const engines = enginesRef.current;
    const stageIdx = currentStageRef.current;
    const state = flightStateRef.current;
    if (state && stageIdx < engines.length - 1) {
      const separated = separateFlightStage(state, engines, stageIdx);
      flightStateRef.current = separated.state;
      currentStageRef.current = separated.stageIndex;
    }
  }, []);

  // 清理
  useEffect(() => {
    playerInputRef.current = new PlayerInput();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      playerInputRef.current?.dispose();
      playerInputRef.current = null;
      clearFlightRenderSnapshot();
      getFlightCameraController().stopTracking();
      getTimeAPI().setTimeSpeed(1 / 86400); // 卸载时重置时间速度
    };
  }, []);

  return {
    telemetry,
    throttle,
    setThrottle,
    timeScale,
    setTimeScale,
    isRunning,
    cameraMode,
    setCameraMode,
    launch,
    abort,
    separateStage,
  };
}
