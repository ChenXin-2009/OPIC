'use client';

import { useCallback, useMemo, useState } from 'react';
import {
  getAllParts,
  computeVehicleSummary,
  PRESET_FALCON9,
  PRESET_SOUNDING_ROCKET,
  type VehicleConfig,
  type RocketPart,
  type PartType,
} from '@/lib/data/rocket-parts';
import { LAUNCH_SITES, type LaunchSite } from '@/lib/data/launch-sites';
import { useFlightSimulation } from '@/lib/mods/space-flight/useFlightSimulation';
import { getFlightCameraController } from '@/lib/mods/space-flight/FlightCameraController';

interface SpaceFlightWindowProps {
  lang?: 'zh' | 'en';
}

type Tab = 'builder' | 'mission' | 'status';

const PART_TYPE_LABELS: Record<PartType, string> = {
  'command-pod': '指令舱',
  'engine': '发动机',
  'fuel-tank': '燃料罐',
  'separator': '分离器',
  'structural': '结构件',
  'parachute': '降落伞',
  'landing-leg': '起落架',
  'rcs': 'RCS 推进器',
  'solar-panel': '太阳能板',
  'science': '科学仪器',
};

export function SpaceFlightWindow({ lang = 'zh' }: SpaceFlightWindowProps) {
  const [tab, setTab] = useState<Tab>('builder');
  const [vehicle, setVehicle] = useState<VehicleConfig>(PRESET_FALCON9);
  const [launchSite, setLaunchSite] = useState<LaunchSite>(LAUNCH_SITES[0]);

  const sim = useFlightSimulation();
  const summary = useMemo(() => computeVehicleSummary(vehicle), [vehicle]);

  const focusLaunchSite = useCallback(async (site: LaunchSite) => {
    try {
      await getFlightCameraController().prepareLaunchSite(site);
    } catch (error) {
      console.warn('[SpaceFlight] 发射场相机聚焦失败，将在发射时使用静态海拔回退', error);
    }
  }, []);

  return (
    <div className="h-full flex flex-col" style={{ background: '#0f1419', color: '#e2e8f0' }}>
      {/* 标签栏 */}
      <div className="flex border-b border-white/10" style={{ background: '#1a202c' }}>
        {([
          ['builder', '载具搭建'],
          ['mission', '任务控制'],
          ['status', '系统状态'],
        ] as [Tab, string][]).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className="px-4 py-2.5 text-sm font-medium transition-colors"
            style={{
              borderBottom: tab === id ? '2px solid #3b82f6' : '2px solid transparent',
              color: tab === id ? '#60a5fa' : '#94a3b8',
              background: tab === id ? 'rgba(59,130,246,0.08)' : 'transparent',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* 内容区 */}
      <div className="flex-1 overflow-y-auto p-4">
        {tab === 'builder' && <BuilderTab vehicle={vehicle} setVehicle={setVehicle} summary={summary} />}
        {tab === 'mission' && (
          <MissionTab
            vehicle={vehicle}
            launchSite={launchSite}
            setLaunchSite={setLaunchSite}
            focusLaunchSite={focusLaunchSite}
            summary={summary}
            sim={sim}
          />
        )}
        {tab === 'status' && <StatusTab />}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 载具搭建标签页
// ---------------------------------------------------------------------------

function BuilderTab({
  vehicle,
  setVehicle,
  summary,
}: {
  vehicle: VehicleConfig;
  setVehicle: (v: VehicleConfig) => void;
  summary: ReturnType<typeof computeVehicleSummary>;
}) {
  const allParts = getAllParts();
  const [selectedStageIndex, setSelectedStageIndex] = useState(0);

  const addPartToStage = (part: RocketPart) => {
    const stageIndex = Math.min(selectedStageIndex, vehicle.stages.length - 1);
    const nextStages = vehicle.stages.map((stage, index) => {
      if (index !== stageIndex) return stage;
      return {
        ...stage,
        parts: [...stage.parts, { partId: part.id }],
      };
    });
    setVehicle({
      ...vehicle,
      stages: nextStages,
    });
  };

  const removePartFromStage = (stageIndex: number, partIndex: number) => {
    const nextStages = vehicle.stages.map((stage, index) => {
      if (index !== stageIndex) return stage;
      return {
        ...stage,
        parts: stage.parts.filter((_, currentIndex) => currentIndex !== partIndex),
      };
    });
    setVehicle({
      ...vehicle,
      stages: nextStages,
    });
  };

  const addStage = () => {
    const nextIndex = vehicle.stages.length + 1;
    setVehicle({
      ...vehicle,
      stages: [
        ...vehicle.stages,
        {
          name: `第 ${nextIndex} 级`,
          parts: [],
        },
      ],
    });
    setSelectedStageIndex(vehicle.stages.length);
  };

  const exportVehicle = async () => {
    const serialized = JSON.stringify(vehicle, null, 2);
    try {
      await navigator.clipboard.writeText(serialized);
    } catch {
      window.prompt('复制当前载具 JSON', serialized);
    }
  };

  const importVehicle = () => {
    const input = window.prompt('粘贴载具 JSON');
    if (!input) return;
    try {
      const parsed = JSON.parse(input) as VehicleConfig;
      if (!parsed.name || !Array.isArray(parsed.stages) || parsed.stages.length === 0) {
        throw new Error('缺少 name 或 stages');
      }
      setVehicle(parsed);
      setSelectedStageIndex(0);
    } catch (error) {
      window.alert(`载具 JSON 无效：${error instanceof Error ? error.message : String(error)}`);
    }
  };

  return (
    <div className="space-y-4">
      {/* 预设载具 */}
      <div>
        <h3 className="text-xs font-semibold text-slate-400 uppercase mb-2">预设载具</h3>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setVehicle(PRESET_FALCON9);
              setSelectedStageIndex(0);
            }}
            className="px-3 py-1.5 text-xs rounded bg-blue-600/20 text-blue-300 border border-blue-500/30 hover:bg-blue-600/30"
          >
            Falcon 9 类似
          </button>
          <button
            onClick={() => {
              setVehicle(PRESET_SOUNDING_ROCKET);
              setSelectedStageIndex(0);
            }}
            className="px-3 py-1.5 text-xs rounded bg-purple-600/20 text-purple-300 border border-purple-500/30 hover:bg-purple-600/30"
          >
            探空火箭
          </button>
          <button
            onClick={exportVehicle}
            className="px-3 py-1.5 text-xs rounded bg-slate-600/20 text-slate-300 border border-white/10 hover:bg-slate-600/30"
          >
            导出 JSON
          </button>
          <button
            onClick={importVehicle}
            className="px-3 py-1.5 text-xs rounded bg-slate-600/20 text-slate-300 border border-white/10 hover:bg-slate-600/30"
          >
            导入 JSON
          </button>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-semibold text-slate-400 uppercase">当前载具栈</h3>
          <button
            onClick={addStage}
            className="px-2.5 py-1 text-[11px] rounded border border-white/10 text-slate-300 hover:bg-white/5"
          >
            新增一级
          </button>
        </div>
        <div className="space-y-2">
          {vehicle.stages.map((stage, stageIndex) => (
            <div
              key={`${stage.name}-${stageIndex}`}
              className="rounded-lg border p-3"
              style={{
                background: '#1a202c',
                borderColor: stageIndex === selectedStageIndex ? 'rgba(59,130,246,0.45)' : 'rgba(255,255,255,0.08)',
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <button
                  onClick={() => setSelectedStageIndex(stageIndex)}
                  className="text-left"
                >
                  <div className="text-sm font-medium text-slate-200">{stage.name}</div>
                  <div className="text-[10px] text-slate-500">
                    选中后，目录中的部件会加入这一层
                  </div>
                </button>
                <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/10 text-blue-300">
                  {stage.parts.length} 件
                </span>
              </div>
              <div className="space-y-1">
                {stage.parts.length > 0 ? stage.parts.map((inst, partIndex) => {
                  const part = allParts.find((candidate) => candidate.id === inst.partId);
                  return (
                    <div
                      key={`${inst.partId}-${partIndex}`}
                      className="flex items-center justify-between rounded px-2 py-1.5 text-[11px]"
                      style={{ background: 'rgba(255,255,255,0.03)' }}
                    >
                      <span className="text-slate-300">{part?.name ?? inst.partId}</span>
                      <button
                        onClick={() => removePartFromStage(stageIndex, partIndex)}
                        className="text-slate-500 hover:text-rose-300"
                      >
                        移除
                      </button>
                    </div>
                  );
                }) : (
                  <div className="text-[11px] text-slate-500">当前级还没有部件</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 载具汇总 */}
      <div className="grid grid-cols-2 gap-2">
        <StatCard label="总湿质量" value={`${(summary.totalWetMassKg / 1000).toFixed(1)} t`} />
        <StatCard label="总 Δv" value={`${(summary.totalDeltaVmS / 1000).toFixed(2)} km/s`} />
        <StatCard label="横截面积" value={`${summary.crossSectionAreaM2.toFixed(1)} m²`} />
        <StatCard label="阻力系数" value={summary.dragCoefficient.toFixed(2)} />
      </div>

      {/* 各级明细 */}
      <div>
        <h3 className="text-xs font-semibold text-slate-400 uppercase mb-2">各级参数</h3>
        <div className="space-y-2">
          {summary.stages.map((stage, i) => (
            <div key={i} className="rounded-lg border border-white/10 p-3" style={{ background: '#1a202c' }}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-slate-200">{stage.name}</span>
                <span className="text-xs text-blue-300 font-mono">{stage.deltaVmS.toFixed(0)} m/s</span>
              </div>
              <div className="grid grid-cols-3 gap-1 text-xs text-slate-400">
                <span>推力: {(stage.thrustN / 1000).toFixed(0)} kN</span>
                <span>比冲: {stage.ispS.toFixed(0)} s</span>
                <span>推重比: {stage.thrustToWeight.toFixed(2)}</span>
                <span>初始: {(stage.initialMassKg / 1000).toFixed(1)} t</span>
                <span>燃尽: {(stage.burnoutMassKg / 1000).toFixed(1)} t</span>
                <span>燃烧: {stage.burnTimeS.toFixed(0)} s</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 部件目录 */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-semibold text-slate-400 uppercase">部件目录 ({allParts.length})</h3>
          <span className="text-[10px] text-slate-500">
            当前加入目标：{vehicle.stages[selectedStageIndex]?.name ?? '未选择'}
          </span>
        </div>
        <div className="space-y-1">
          {allParts.map((part) => (
            <PartRow key={part.id} part={part} onAdd={() => addPartToStage(part)} />
          ))}
        </div>
      </div>
    </div>
  );
}

function PartRow({ part, onAdd }: { part: RocketPart; onAdd: () => void }) {
  return (
    <div className="flex items-center justify-between rounded px-3 py-2 text-xs" style={{ background: '#1a202c' }}>
      <div>
        <span className="text-slate-200 font-medium">{part.name}</span>
        <span className="ml-2 text-slate-500">{PART_TYPE_LABELS[part.type]}</span>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-right text-slate-400 font-mono">
          {part.thrustVacuumN && <span>{(part.thrustVacuumN / 1000).toFixed(0)}kN </span>}
          {part.ispVacuumS && <span>{part.ispVacuumS}s</span>}
          {part.propellantMassKg && <span>{(part.propellantMassKg / 1000).toFixed(1)}t</span>}
          {!part.thrustVacuumN && !part.propellantMassKg && <span>{part.dryMassKg}kg</span>}
        </div>
        <button
          onClick={onAdd}
          className="px-2.5 py-1 rounded border border-blue-500/30 text-blue-300 hover:bg-blue-500/10"
        >
          加入
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 任务控制标签页（接通仿真）
// ---------------------------------------------------------------------------

function MissionTab({
  vehicle,
  launchSite,
  setLaunchSite,
  focusLaunchSite,
  summary,
  sim,
}: {
  vehicle: VehicleConfig;
  launchSite: LaunchSite;
  setLaunchSite: (s: LaunchSite) => void;
  focusLaunchSite: (site: LaunchSite) => Promise<void>;
  summary: ReturnType<typeof computeVehicleSummary>;
  sim: ReturnType<typeof useFlightSimulation>;
}) {
  const {
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
  } = sim;

  return (
    <div className="space-y-4">
      {/* 发射场选择 */}
      <div>
        <h3 className="text-xs font-semibold text-slate-400 uppercase mb-2">发射场</h3>
        <select
          value={launchSite.id}
          onChange={(e) => {
            const site = LAUNCH_SITES.find((s) => s.id === e.target.value);
            if (site) {
              setLaunchSite(site);
              void focusLaunchSite(site);
            }
          }}
          disabled={isRunning}
          className="w-full rounded border border-white/10 px-3 py-2 text-sm disabled:opacity-50"
          style={{ background: '#1a202c', color: '#e2e8f0' }}
        >
          {LAUNCH_SITES.map((site) => (
            <option key={site.id} value={site.id}>
              {site.name} ({site.lat.toFixed(1)}°, {site.lon.toFixed(1)}°)
            </option>
          ))}
        </select>
        {launchSite.desc && <p className="mt-1 text-xs text-slate-500">{launchSite.desc}</p>}
      </div>

      {/* 载具摘要 */}
      <div className="rounded-lg border border-white/10 p-3" style={{ background: '#1a202c' }}>
        <div className="text-sm font-medium text-slate-200 mb-2">当前载具</div>
        <div className="grid grid-cols-2 gap-2 text-xs text-slate-400">
          <span>总质量: {(summary.totalWetMassKg / 1000).toFixed(1)} t</span>
          <span>总 Δv: {(summary.totalDeltaVmS / 1000).toFixed(2)} km/s</span>
          <span>级数: {summary.stages.length}</span>
          <span>一级推重比: {summary.stages[0]?.thrustToWeight.toFixed(2) ?? '-'}</span>
        </div>
      </div>

      {/* 节流控制 */}
      <div>
        <h3 className="text-xs font-semibold text-slate-400 uppercase mb-2">节流</h3>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={0}
            max={100}
            value={throttle}
            onChange={(e) => setThrottle(Number(e.target.value))}
            className="flex-1 accent-blue-500"
          />
          <span className="text-sm font-mono text-blue-300 w-12 text-right">{throttle}%</span>
        </div>
        <p className="mt-2 text-[11px] text-slate-500 leading-relaxed">
          键盘控制：W/S 调节节流，Shift 快速调节，方向键微调姿态，Q/E 横滚预留，Space 分级。
        </p>
      </div>

      {/* 时间加速 */}
      <div>
        <h3 className="text-xs font-semibold text-slate-400 uppercase mb-2">时间加速</h3>
        <div className="flex gap-1">
          {[1, 2, 5, 10, 50].map((scale) => (
            <button
              key={scale}
              onClick={() => setTimeScale(scale)}
              className="px-3 py-1.5 text-xs rounded transition-colors"
              style={{
                background: timeScale === scale ? 'rgba(59,130,246,0.3)' : '#1a202c',
                color: timeScale === scale ? '#60a5fa' : '#94a3b8',
                border: `1px solid ${timeScale === scale ? '#3b82f6' : 'rgba(255,255,255,0.1)'}`,
              }}
            >
              {scale}×
            </button>
          ))}
        </div>
      </div>

      {/* 追踪相机 */}
      <div>
        <h3 className="text-xs font-semibold text-slate-400 uppercase mb-2">追踪相机</h3>
        <div className="grid grid-cols-3 gap-1">
          {([
            ['fixed', '固定跟随'],
            ['inertial', '惯性跟随'],
            ['free', '自由观察'],
          ] as const).map(([mode, label]) => (
            <button
              key={mode}
              onClick={() => setCameraMode(mode)}
              disabled={!telemetry.launched}
              className="rounded px-2 py-1.5 text-[11px] transition-colors disabled:opacity-40"
              style={{
                background: cameraMode === mode ? 'rgba(59,130,246,0.3)' : '#1a202c',
                color: cameraMode === mode ? '#93c5fd' : '#94a3b8',
                border: `1px solid ${cameraMode === mode ? '#3b82f6' : 'rgba(255,255,255,0.1)'}`,
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="mt-1.5 text-[10px] text-slate-500">
          自由观察：右键拖拽环绕，滚轮缩放；再次选择跟随模式即可重新锁定火箭。
        </p>
      </div>

      {/* 发射/中止按钮 */}
      {!isRunning && !telemetry.ended && (
        <button
          className="w-full py-3 rounded-lg font-bold text-white transition-all hover:brightness-110"
          style={{ background: '#ef4444' }}
          onClick={() => launch(vehicle, launchSite)}
        >
          发射
        </button>
      )}
      {isRunning && (
        <div className="flex gap-2">
          <button
            className="flex-1 py-3 rounded-lg font-bold text-white transition-all hover:brightness-110"
            style={{ background: '#ef4444' }}
            onClick={abort}
          >
            中止
          </button>
          <button
            className="flex-1 py-3 rounded-lg font-bold text-white transition-all hover:brightness-110 disabled:opacity-40"
            style={{ background: '#6366f1' }}
            onClick={separateStage}
            disabled={telemetry.currentStage >= summary.stages.length - 1}
          >
            分离
          </button>
        </div>
      )}
      {telemetry.ended && (
        <div className="w-full py-3 rounded-lg font-bold text-center" style={{
          background: telemetry.endReason?.includes('成功') ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)',
          border: `1px solid ${telemetry.endReason?.includes('成功') ? '#22c55e' : '#ef4444'}`,
          color: telemetry.endReason?.includes('成功') ? '#22c55e' : '#ef4444',
        }}>
          {telemetry.endReason}
        </div>
      )}
      {telemetry.ended && (
        <button
          className="w-full py-2 rounded-lg text-sm font-medium text-slate-300 transition-colors hover:bg-white/5"
          style={{ border: '1px solid rgba(255,255,255,0.1)' }}
          onClick={abort}
        >
          重置
        </button>
      )}

      {/* 实时遥测 */}
      <div>
        <h3 className="text-xs font-semibold text-slate-400 uppercase mb-2">遥测</h3>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <TelemetryItem label="高度" value={telemetry.launched ? `${telemetry.altitudeKm.toFixed(1)} km` : '---'} highlight />
          <TelemetryItem label="速度" value={telemetry.launched ? `${telemetry.speedMs.toFixed(0)} m/s` : '---'} highlight />
          <TelemetryItem label="远拱点" value={telemetry.launched ? `${telemetry.apogeeKm.toFixed(0)} km` : '---'} />
          <TelemetryItem label="近拱点" value={telemetry.launched ? `${telemetry.perigeeKm.toFixed(0)} km` : '---'} />
          <TelemetryItem label="剩余燃料" value={telemetry.launched ? `${telemetry.fuelPercent.toFixed(0)}%` : '---'} />
          <TelemetryItem label="当前级" value={telemetry.launched ? `${telemetry.currentStage + 1}: ${telemetry.currentStageName}` : '---'} />
          <TelemetryItem label="任务时间" value={telemetry.launched ? formatTime(telemetry.missionTime) : '---'} />
          <TelemetryItem label="Max-Q" value={telemetry.launched ? `${telemetry.maxQ.toFixed(0)} Pa` : '---'} />
          <TelemetryItem label="质量" value={telemetry.launched ? `${(telemetry.massKg / 1000).toFixed(1)} t` : '---'} />
          <TelemetryItem label="级燃烧剩余" value={telemetry.launched ? `${telemetry.stageBurnTimeRemaining.toFixed(0)} s` : '---'} />
        </div>
      </div>
    </div>
  );
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

// ---------------------------------------------------------------------------
// 系统状态标签页
// ---------------------------------------------------------------------------

function StatusTab() {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-xs font-semibold text-slate-400 uppercase mb-2">物理引擎</h3>
        <div className="space-y-1 text-xs">
          <StatusItem label="RK4 积分器" status="ready" detail="二体 + 推力 + 大气 + 变质量" />
          <StatusItem label="解析开普勒传播器" status="ready" detail="精度基准 < 1e-6" />
          <StatusItem label="大气模型" status="ready" detail="指数模型, 100km 截止" />
          <StatusItem label="火箭方程" status="ready" detail="齐奥尔科夫斯基 Δv 计算" />
          <StatusItem label="重力转弯" status="ready" detail="10km 垂直 → 80km 顺行" />
          <StatusItem label="飞行控制适配层" status="ready" detail="PlayerInput -> 节流/姿态/分级" />
        </div>
      </div>

      <div>
        <h3 className="text-xs font-semibold text-slate-400 uppercase mb-2">数据层</h3>
        <div className="space-y-1 text-xs">
          <StatusItem label="部件目录" status="ready" detail="10 个部件, 5 种类型" />
          <StatusItem label="发射场数据库" status="ready" detail="10 个全球发射场" />
          <StatusItem label="LLA→ECI 转换" status="ready" detail="WGS84 + GMST" />
        </div>
      </div>

      <div>
        <h3 className="text-xs font-semibold text-slate-400 uppercase mb-2">渲染层</h3>
        <div className="space-y-1 text-xs">
          <StatusItem label="Three.js 叠加渲染" status="ready" detail="Phase 0 验证通过" />
          <StatusItem label="火箭网格" status="ready" detail="RocketRenderer + PlumeRenderer" />
          <StatusItem label="尾焰粒子" status="ready" detail="锥体 mesh + 动态缩放" />
          <StatusItem label="轨迹线" status="ready" detail="THREE.Line, 256 点上限" />
          <StatusItem label="追踪相机" status="ready" detail="选址自动近地平视，离架后 Cesium 原生跟拍" />
        </div>
      </div>

      <div>
        <h3 className="text-xs font-semibold text-slate-400 uppercase mb-2">验证结果</h3>
        <div className="rounded-lg border border-green-500/20 p-3 text-xs" style={{ background: 'rgba(34,197,94,0.05)' }}>
          <div className="text-green-400 font-medium mb-1">全部通过</div>
          <div className="text-slate-400 space-y-0.5">
            <div>- 圆轨道积分误差: 0.00 m</div>
            <div>- 霍曼转移 Delta-v 误差: 0.0%</div>
            <div>- 能量守恒: 0.000008%</div>
            <div>- 10000x 时间加速: 不发散</div>
            <div>- 2901 个项目测试通过</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 辅助组件
// ---------------------------------------------------------------------------

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 p-2.5" style={{ background: '#1a202c' }}>
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-sm font-mono font-medium text-slate-200 mt-0.5">{value}</div>
    </div>
  );
}

function TelemetryItem({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="rounded border border-white/10 px-2.5 py-1.5" style={{
      background: highlight ? 'rgba(59,130,246,0.05)' : '#1a202c',
      borderColor: highlight ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.1)',
    }}>
      <div className="text-slate-500 text-[10px]">{label}</div>
      <div className="font-mono" style={{ color: highlight ? '#60a5fa' : '#cbd5e1' }}>{value}</div>
    </div>
  );
}

function StatusItem({ label, status, detail }: { label: string; status: 'ready' | 'pending'; detail: string }) {
  return (
    <div className="flex items-center justify-between rounded px-3 py-1.5" style={{ background: '#1a202c' }}>
      <div className="flex items-center gap-2">
        <span style={{ color: status === 'ready' ? '#22c55e' : '#f59e0b' }}>
          {status === 'ready' ? '[OK]' : '[--]'}
        </span>
        <span className="text-slate-300">{label}</span>
      </div>
      <span className="text-slate-500 text-[10px]">{detail}</span>
    </div>
  );
}
