/**
 * SatelliteRealtimePanel - 卫星实时数据增强面板
 *
 * 显示选中卫星的实时位置、地面轨迹、过境预测等丰富信息
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSatelliteStore } from '@/lib/store/useSatelliteStore';
import { OrbitType } from '@/lib/types/satellite';
import type { RealtimePosition } from '@/app/api/satellites/realtime/route';
import type { PassEvent } from '@/app/api/satellites/passes/route';

/** 暗色主题配色常量 */
const C = {
  dark: '#0a0a0a',
  darkLight: '#141414',
  border: '#2a2a2a',
  text: '#e8e8e8',
  dim: '#666666',
  accent: '#4a9eff',
  green: '#00d4aa',
  yellow: '#ffd700',
  red: '#ff4444',
  leo: '#00aaff',
  meo: '#00ff88',
  geo: '#ff6644',
  heo: '#cc88ff',
};

/** 根据轨道类型返回对应配色 */
function orbitColor(type: string) {
  switch (type) {
    case 'LEO': return C.leo;
    case 'MEO': return C.meo;
    case 'GEO': return C.geo;
    case 'HEO': return C.heo;
    default: return C.text;
  }
}

/** 格式化秒数为 m s 格式 */
function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

/** 格式化 ISO 时间为 HH:MM:SS */
function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

/** 格式化 ISO 时间为 MM/DD */
function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
}

/** 将方位角（度）转换为方向标签（N/NE/E/SE/S/SW/W/NW） */
function azimuthLabel(az: number): string {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return dirs[Math.round(az / 45) % 8];
}

interface InfoRowProps {
  label: string;
  value: string;
  color?: string;
  mono?: boolean;
}

function InfoRow({ label, value, color, mono }: InfoRowProps) {
  return (
    <div className="flex justify-between items-center text-xs py-0.5">
      <span style={{ color: C.dim }}>{label}</span>
      <span
        className={mono ? 'font-mono' : ''}
        style={{ color: color || C.text }}
      >
        {value}
      </span>
    </div>
  );
}

interface SectionProps {
  title: string;
  color?: string;
  children: React.ReactNode;
}

function Section({ title, color, children }: SectionProps) {
  return (
    <div className="mb-3">
      <div
        className="flex items-center gap-1.5 mb-1.5"
        style={{ borderBottom: `1px solid ${C.border}`, paddingBottom: '4px' }}
      >
        <div style={{ width: 3, height: 10, background: color || C.accent }} />
        <span className="text-xs uppercase tracking-wider font-bold" style={{ color: C.dim }}>
          {title}
        </span>
      </div>
      {children}
    </div>
  );
}

interface SatelliteRealtimePanelProps {
  lang?: 'zh' | 'en';
}

/** 卫星实时数据面板：显示位置、轨道、过境预测等 */
export function SatelliteRealtimePanel({ lang = 'zh' }: SatelliteRealtimePanelProps) {
  const { selectedSatellite, satellites, showOrbits, selectSatellite, toggleOrbit } = useSatelliteStore();

  // 实时位置数据（来自后端实时计算）
  const [realtime, setRealtime] = useState<RealtimePosition | null>(null);
  // 过境预测事件列表
  const [passes, setPasses] = useState<PassEvent[]>([]);
  // 实时数据加载状态
  const [loadingRealtime, setLoadingRealtime] = useState(false);
  // 过境预测加载状态
  const [loadingPasses, setLoadingPasses] = useState(false);
  // 当前激活的标签页
  const [activeTab, setActiveTab] = useState<'info' | 'passes' | 'orbit'>('info');
  // 过境观测者纬度（默认北京）
  const [observerLat, setObserverLat] = useState(39.9);
  // 过境观测者经度（默认北京）
  const [observerLon, setObserverLon] = useState(116.4);
  // 是否显示观测点配置面板
  const [showPassConfig, setShowPassConfig] = useState(false);

  const satellite = selectedSatellite ? satellites.get(selectedSatellite) : null;

  // 获取卫星实时位置（API 调用）
  const fetchRealtime = useCallback(async () => {
    if (!selectedSatellite) return;
    setLoadingRealtime(true);
    try {
      const res = await fetch(`/api/satellites/realtime?noradId=${selectedSatellite}`);
      if (res.ok) {
        const data = await res.json();
        setRealtime(data);
      }
    } catch { /* ignore */ } finally {
      setLoadingRealtime(false);
    }
  }, [selectedSatellite]);

  // 获取卫星过境预测（API 调用，基于观测者经纬度）
  const fetchPasses = useCallback(async () => {
    if (!selectedSatellite) return;
    setLoadingPasses(true);
    try {
      const res = await fetch(
        `/api/satellites/passes?noradId=${selectedSatellite}&lat=${observerLat}&lon=${observerLon}&days=3`
      );
      if (res.ok) {
        const data = await res.json();
        setPasses(data.passes || []);
      }
    } catch { /* ignore */ } finally {
      setLoadingPasses(false);
    }
  }, [selectedSatellite, observerLat, observerLon]);

  // 初始加载
  useEffect(() => {
    if (!selectedSatellite) return;
    setRealtime(null);
    setPasses([]);
    fetchRealtime();
  }, [selectedSatellite, fetchRealtime]);

  // 实时刷新(每5秒)
  useEffect(() => {
    if (!selectedSatellite) return;
    const timer = setInterval(fetchRealtime, 5000);
    return () => clearInterval(timer);
  }, [selectedSatellite, fetchRealtime]);

  // 切换到过境tab时加载
  useEffect(() => {
    if (activeTab === 'passes' && passes.length === 0) {
      fetchPasses();
    }
  }, [activeTab, passes.length, fetchPasses]);

  if (!selectedSatellite || !satellite) return null;

  const oc = orbitColor(realtime?.orbitType || satellite.orbitType);
  const isOrbitVisible = showOrbits.has(selectedSatellite);

  const tabs = [
    { id: 'info' as const, label: lang === 'zh' ? '实时' : 'LIVE' },
    { id: 'orbit' as const, label: lang === 'zh' ? '轨道' : 'ORBIT' },
    { id: 'passes' as const, label: lang === 'zh' ? '过境' : 'PASSES' },
  ];

  return (
    <div
      className="fixed z-40 flex flex-col"
      style={{
        top: '5rem',
        right: '1rem',
        width: '22rem',
        maxHeight: 'calc(100vh - 7rem)',
        background: C.dark,
        border: `1px solid ${C.border}`,
        clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)',
      }}
    >
      {/* 角装饰 */}
      <div className="absolute" style={{ top: -1, left: -1, width: 10, height: 10, background: oc, clipPath: 'polygon(0 0, 100% 0, 0 100%)' }} />
      <div className="absolute" style={{ bottom: -1, right: -1, width: 10, height: 10, background: oc, clipPath: 'polygon(100% 0, 100% 100%, 0 100%)' }} />

      {/* 标题栏 */}
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: `1px solid ${C.border}` }}>
        <div className="flex items-center gap-2 min-w-0">
          <div style={{ width: 3, height: 14, background: oc, flexShrink: 0 }} />
          <span className="text-xs font-bold truncate" style={{ color: C.text }}>
            {satellite.name}
          </span>
          <span
            className="text-xs px-1.5 py-0.5 font-bold uppercase tracking-wide flex-shrink-0"
            style={{ background: `${oc}20`, color: oc, border: `1px solid ${oc}40` }}
          >
            {realtime?.orbitType || satellite.orbitType}
          </span>
        </div>
        <button
          onClick={() => selectSatellite(null)}
          className="text-xs ml-2 flex-shrink-0 hover:opacity-70 transition-opacity"
          style={{ color: C.dim }}
        >
          ✕
        </button>
      </div>

      {/* Tab栏 */}
      <div className="flex" style={{ borderBottom: `1px solid ${C.border}` }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="flex-1 py-2 text-xs font-bold uppercase tracking-wide transition-all"
            style={{
              color: activeTab === tab.id ? oc : C.dim,
              borderBottom: activeTab === tab.id ? `2px solid ${oc}` : '2px solid transparent',
              background: 'transparent',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 内容区 */}
      <div className="overflow-y-auto flex-1 p-4" style={{ scrollbarWidth: 'thin', scrollbarColor: `${C.border} transparent` }}>

        {/* 实时信息 Tab */}
        {activeTab === 'info' && (
          <>
            {loadingRealtime && !realtime && (
              <div className="text-xs text-center py-4" style={{ color: C.dim }}>
                {lang === 'zh' ? '计算中...' : 'Computing...'}
              </div>
            )}

            {realtime && (
              <>
                <Section title={lang === 'zh' ? '当前位置' : 'POSITION'} color={C.green}>
                  <InfoRow label={lang === 'zh' ? '纬度' : 'LAT'} value={`${realtime.latitude.toFixed(4)}°`} mono color={C.green} />
                  <InfoRow label={lang === 'zh' ? '经度' : 'LON'} value={`${realtime.longitude.toFixed(4)}°`} mono color={C.green} />
                  <InfoRow label={lang === 'zh' ? '高度' : 'ALT'} value={`${realtime.altitude.toFixed(1)} km`} mono />
                </Section>

                <Section title={lang === 'zh' ? '运动状态' : 'MOTION'} color={C.yellow}>
                  <InfoRow label={lang === 'zh' ? '速度' : 'SPEED'} value={`${realtime.velocity.toFixed(2)} km/s`} mono color={C.yellow} />
                  <InfoRow label={lang === 'zh' ? '速度 Vx' : 'Vx'} value={`${realtime.velocityVector.x.toFixed(2)} km/s`} mono />
                  <InfoRow label={lang === 'zh' ? '速度 Vy' : 'Vy'} value={`${realtime.velocityVector.y.toFixed(2)} km/s`} mono />
                  <InfoRow label={lang === 'zh' ? '速度 Vz' : 'Vz'} value={`${realtime.velocityVector.z.toFixed(2)} km/s`} mono />
                  <InfoRow label={lang === 'zh' ? '方位角' : 'AZIMUTH'} value={`${realtime.azimuth.toFixed(1)}° (${azimuthLabel(realtime.azimuth)})`} mono />
                </Section>

                <Section title={lang === 'zh' ? '轨道参数' : 'ORBITAL'} color={oc}>
                  <InfoRow label={lang === 'zh' ? '倾角' : 'INCL'} value={`${realtime.inclination.toFixed(2)}°`} mono />
                  <InfoRow label={lang === 'zh' ? '周期' : 'PERIOD'} value={`${realtime.period.toFixed(1)} min`} mono />
                  <InfoRow label={lang === 'zh' ? '偏心率' : 'ECC'} value={satellite.orbitalElements.eccentricity.toFixed(5)} mono />
                  <InfoRow label={lang === 'zh' ? '半长轴' : 'SMA'} value={`${satellite.orbitalElements.semiMajorAxis.toFixed(0)} km`} mono />
                  <InfoRow label={lang === 'zh' ? '近地点' : 'PERIGEE'} value={`${satellite.orbitalElements.perigee.toFixed(0)} km`} mono />
                  <InfoRow label={lang === 'zh' ? '远地点' : 'APOGEE'} value={`${satellite.orbitalElements.apogee.toFixed(0)} km`} mono />
                </Section>

                <div className="text-xs text-right mt-1" style={{ color: C.dim }}>
                  {lang === 'zh' ? '更新于' : 'Updated'} {formatTime(realtime.timestamp)}
                </div>
              </>
            )}

            {/* 轨道显示按钮 */}
            <button
              onClick={() => toggleOrbit(selectedSatellite)}
              className="w-full py-2 mt-3 text-xs font-bold uppercase tracking-wide transition-all"
              style={{
                background: isOrbitVisible ? `${oc}20` : C.darkLight,
                color: isOrbitVisible ? oc : C.text,
                border: `1px solid ${isOrbitVisible ? oc : C.border}`,
                clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)',
              }}
            >
              {isOrbitVisible
                ? (lang === 'zh' ? '隐藏轨道' : 'HIDE ORBIT')
                : (lang === 'zh' ? '显示轨道' : 'SHOW ORBIT')}
            </button>
          </>
        )}

        {/* 轨道详情 Tab */}
        {activeTab === 'orbit' && (
          <>
            <Section title={lang === 'zh' ? '轨道要素' : 'ELEMENTS'} color={oc}>
              <InfoRow label="NORAD ID" value={String(satellite.noradId)} mono />
              <InfoRow label={lang === 'zh' ? '轨道类型' : 'TYPE'} value={realtime?.orbitType || satellite.orbitType} color={oc} />
              <InfoRow label={lang === 'zh' ? '倾角' : 'INCLINATION'} value={`${satellite.orbitalElements.inclination.toFixed(4)}°`} mono />
              <InfoRow label={lang === 'zh' ? '偏心率' : 'ECCENTRICITY'} value={satellite.orbitalElements.eccentricity.toFixed(7)} mono />
              <InfoRow label={lang === 'zh' ? '平均运动' : 'MEAN MOTION'} value={`${satellite.orbitalElements.meanMotion.toFixed(8)} rev/day`} mono />
              <InfoRow label={lang === 'zh' ? '半长轴' : 'SEMI-MAJOR AXIS'} value={`${satellite.orbitalElements.semiMajorAxis.toFixed(2)} km`} mono />
              <InfoRow label={lang === 'zh' ? '轨道周期' : 'PERIOD'} value={`${satellite.orbitalElements.period.toFixed(4)} min`} mono />
              <InfoRow label={lang === 'zh' ? '近地点高度' : 'PERIGEE'} value={`${satellite.orbitalElements.perigee.toFixed(2)} km`} mono />
              <InfoRow label={lang === 'zh' ? '远地点高度' : 'APOGEE'} value={`${satellite.orbitalElements.apogee.toFixed(2)} km`} mono />
            </Section>

            <Section title={lang === 'zh' ? '轨道可视化' : 'VISUALIZATION'} color={C.accent}>
              <div className="text-xs mb-2" style={{ color: C.dim }}>
                {lang === 'zh' ? '在3D视图中显示轨道轨迹' : 'Show orbit trajectory in 3D view'}
              </div>
              <button
                onClick={() => toggleOrbit(selectedSatellite)}
                className="w-full py-2 text-xs font-bold uppercase tracking-wide transition-all"
                style={{
                  background: isOrbitVisible ? `${oc}20` : C.darkLight,
                  color: isOrbitVisible ? oc : C.text,
                  border: `1px solid ${isOrbitVisible ? oc : C.border}`,
                  clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)',
                }}
              >
                {isOrbitVisible
                  ? (lang === 'zh' ? '✓ 轨道显示中' : '✓ ORBIT VISIBLE')
                  : (lang === 'zh' ? '显示轨道' : 'SHOW ORBIT')}
              </button>
            </Section>

            {/* 轨道高度可视化条 */}
            <Section title={lang === 'zh' ? '轨道高度分布' : 'ALTITUDE RANGE'} color={C.yellow}>
              <div className="relative h-6 rounded overflow-hidden mt-1" style={{ background: C.darkLight }}>
                {/* LEO区域 */}
                <div className="absolute top-0 bottom-0" style={{ left: '0%', width: '20%', background: `${C.leo}30` }} />
                {/* MEO区域 */}
                <div className="absolute top-0 bottom-0" style={{ left: '20%', width: '35%', background: `${C.meo}20` }} />
                {/* GEO区域 */}
                <div className="absolute top-0 bottom-0" style={{ left: '55%', width: '45%', background: `${C.geo}20` }} />
                {/* 当前位置指示器 */}
                {realtime && (() => {
                  const maxAlt = 40000;
                  const pct = Math.min(realtime.altitude / maxAlt * 100, 100);
                  return (
                    <div
                      className="absolute top-0 bottom-0 w-0.5"
                      style={{ left: `${pct}%`, background: oc }}
                    />
                  );
                })()}
              </div>
              <div className="flex justify-between text-xs mt-1" style={{ color: C.dim }}>
                <span>0</span>
                <span style={{ color: C.leo }}>LEO</span>
                <span style={{ color: C.meo }}>MEO</span>
                <span style={{ color: C.geo }}>GEO 36k km</span>
              </div>
            </Section>
          </>
        )}

        {/* 过境预测 Tab */}
        {activeTab === 'passes' && (
          <>
            {/* 观测者位置配置 */}
            <div className="mb-3">
              <button
                onClick={() => setShowPassConfig(!showPassConfig)}
                className="w-full flex items-center justify-between text-xs py-1.5 px-2"
                style={{ background: C.darkLight, border: `1px solid ${C.border}`, color: C.dim }}
              >
                <span>{lang === 'zh' ? `观测点: ${observerLat.toFixed(1)}°N, ${observerLon.toFixed(1)}°E` : `Observer: ${observerLat.toFixed(1)}°N, ${observerLon.toFixed(1)}°E`}</span>
                <span>{showPassConfig ? '▲' : '▼'}</span>
              </button>
              {showPassConfig && (
                <div className="p-2 space-y-2" style={{ background: C.darkLight, border: `1px solid ${C.border}`, borderTop: 'none' }}>
                  <div className="flex items-center gap-2">
                    <label className="text-xs w-8" style={{ color: C.dim }}>LAT</label>
                    <input
                      type="number"
                      value={observerLat}
                      onChange={e => setObserverLat(parseFloat(e.target.value) || 0)}
                      className="flex-1 px-2 py-1 text-xs font-mono"
                      style={{ background: C.dark, border: `1px solid ${C.border}`, color: C.text, outline: 'none' }}
                      step="0.1" min="-90" max="90"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs w-8" style={{ color: C.dim }}>LON</label>
                    <input
                      type="number"
                      value={observerLon}
                      onChange={e => setObserverLon(parseFloat(e.target.value) || 0)}
                      className="flex-1 px-2 py-1 text-xs font-mono"
                      style={{ background: C.dark, border: `1px solid ${C.border}`, color: C.text, outline: 'none' }}
                      step="0.1" min="-180" max="180"
                    />
                  </div>
                  <button
                    onClick={() => { fetchPasses(); setShowPassConfig(false); }}
                    className="w-full py-1.5 text-xs font-bold uppercase"
                    style={{ background: C.accent, color: C.dark }}
                  >
                    {lang === 'zh' ? '计算过境' : 'COMPUTE'}
                  </button>
                </div>
              )}
            </div>

            {loadingPasses && (
              <div className="text-xs text-center py-4" style={{ color: C.dim }}>
                {lang === 'zh' ? '计算过境预测中...' : 'Computing passes...'}
              </div>
            )}

            {!loadingPasses && passes.length === 0 && (
              <div className="text-xs text-center py-4" style={{ color: C.dim }}>
                {lang === 'zh' ? '未来3天内无可见过境' : 'No visible passes in 3 days'}
              </div>
            )}

            {passes.map((pass, i) => (
              <div
                key={i}
                className="mb-2 p-2"
                style={{ background: C.darkLight, border: `1px solid ${C.border}` }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold" style={{ color: C.text }}>
                    {formatDate(pass.startTime)} {formatTime(pass.startTime)}
                  </span>
                  <span
                    className="text-xs font-bold px-1.5 py-0.5"
                    style={{
                      color: pass.maxElevation > 60 ? C.green : pass.maxElevation > 30 ? C.yellow : C.dim,
                      border: `1px solid currentColor`,
                    }}
                  >
                    {pass.maxElevation.toFixed(1)}°
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1 text-xs">
                  <div style={{ color: C.dim }}>
                    <div>{lang === 'zh' ? '升起' : 'Rise'}</div>
                    <div className="font-mono" style={{ color: C.text }}>{azimuthLabel(pass.startAzimuth)} {pass.startAzimuth}°</div>
                  </div>
                  <div className="text-center" style={{ color: C.dim }}>
                    <div>{lang === 'zh' ? '持续' : 'Dur'}</div>
                    <div className="font-mono" style={{ color: C.accent }}>{formatDuration(pass.duration)}</div>
                  </div>
                  <div className="text-right" style={{ color: C.dim }}>
                    <div>{lang === 'zh' ? '落下' : 'Set'}</div>
                    <div className="font-mono" style={{ color: C.text }}>{azimuthLabel(pass.endAzimuth)} {pass.endAzimuth}°</div>
                  </div>
                </div>
              </div>
            ))}

            {!loadingPasses && passes.length > 0 && (
              <button
                onClick={fetchPasses}
                className="w-full py-1.5 mt-1 text-xs uppercase tracking-wide"
                style={{ color: C.dim, border: `1px solid ${C.border}` }}
              >
                {lang === 'zh' ? '刷新' : 'REFRESH'}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
