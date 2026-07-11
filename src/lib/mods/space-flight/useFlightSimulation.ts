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

  useEffect(() => { throttleRef.current = throttle; }, [throttle]);
  useEffect(() => { timeScaleRef.current = timeScale; }, [timeScale]);

  /** 停止仿真 */
  const stopSimulation = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    playerInputRef.current?.setEnabled(false);
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

    if (result.ended) {
      stopSimulation();
    }
  }, [stopSimulation]);

  /** 启动仿真 */
  const launch = useCallback((vehicle: VehicleConfig, site: LaunchSite) => {
    if (isRunning) return;

    // 初始化发动机参数
    const engines = extractStageEngines(vehicle);
    enginesRef.current = engines;
    currentStageRef.current = 0;
    maxQRef.current = 0;

    // 计算初始质量
    const summary = computeVehicleSummary(vehicle);
    const initialMass = summary.totalWetMassKg;

    // 从发射场获取初始位置和速度
    const date = new Date();
    const initialState = launchSiteToInitialState(site, date);
    bodyRadiusRef.current = computeMissionBodyRadius(
      initialState.position as [number, number, number],
      site.altitude,
    );

    // 创建飞行状态
    flightStateRef.current = {
      position: [...initialState.position] as [number, number, number],
      velocity: [...initialState.velocity] as [number, number, number],
      mass: initialMass,
      time: 0,
    };

    vehicleConfigRef.current = vehicle;
    launchSiteRef.current = site;
    setIsRunning(true);
    lastTickAtRef.current = Date.now();
    stagePressedRef.current = false;
    playerInputRef.current?.setEnabled(true);
    setTelemetry({
      ...EMPTY_TELEMETRY,
      launched: true,
      altitudeKm: site.altitude / 1000,
      massKg: initialMass,
      currentStageName: engines[0]?.name ?? '-',
    });

    // 启动仿真循环
    intervalRef.current = setInterval(tick, UI_INTERVAL);
  }, [isRunning, tick]);

  /** 中止任务 */
  const abort = useCallback(() => {
    stopSimulation();
    flightStateRef.current = null;
    lastTickAtRef.current = null;
    setTelemetry(EMPTY_TELEMETRY);
  }, [stopSimulation]);

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
    };
  }, []);

  return {
    telemetry,
    throttle,
    setThrottle,
    timeScale,
    setTimeScale,
    isRunning,
    launch,
    abort,
    separateStage,
  };
}
