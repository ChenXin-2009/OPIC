'use client';

/**
 * 商业航天发射追踪 - 悬浮面板
 * fixed 定位，不遮挡 3D 场景
 */

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { DATA_SOURCES } from './dataSources';
import { useLaunchData } from './useLaunchData';
import { ORBIT_LABELS, STATUS_LABELS, type DataSourceId, type LaunchEvent } from './types';
import type { LaunchRenderer, LaunchPoint } from '@/lib/mods/space-launches/LaunchRenderer';
import { useSolarSystemStore } from '@/lib/state';

/** 发射追踪面板属性：渲染器、语言、配置回调等 */
interface Props {
  renderer?: LaunchRenderer | null;
  onClose?: () => void;
  lang?: 'zh' | 'en';
  initialConfig?: { enabledSources?: DataSourceId[]; opacity?: number; useAllSources?: boolean } | null;
  onConfigChange?: (cfg: Record<string, unknown>) => void;
  asWindowContent?: boolean; // 是否作为窗口内容显示(macOS风格)
}

/** 所有可用数据源的 ID 列表（启用"全部数据源"时使用） */
const ALL_SOURCE_IDS: DataSourceId[] = [
  'launch_library2', 'spacex_api', 'rocketlaunch_live', 'thespacedevs', 'nextspaceflight',
];

/** 格式化发射倒计时：返回"T-2h30m"或"3天前"等可读文本 */
function formatCountdown(net: string, lang: 'zh' | 'en'): string {
  const diff = new Date(net).getTime() - Date.now();
  if (diff < 0) {
    const abs = Math.abs(diff);
    const d = Math.floor(abs / 86400000);
    const h = Math.floor((abs % 86400000) / 3600000);
    const m = Math.floor((abs % 3600000) / 60000);
    if (d > 0) return lang === 'zh' ? `${d}天前` : `${d}d ago`;
    if (h > 0) return lang === 'zh' ? `${h}h前` : `${h}h ago`;
    return lang === 'zh' ? `${m}m前` : `${m}m ago`;
  }
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  if (d > 0) return lang === 'zh' ? `T-${d}d${h}h` : `T-${d}d ${h}h`;
  if (h > 0) return lang === 'zh' ? `T-${h}h${m}m` : `T-${h}h ${m}m`;
  return lang === 'zh' ? `T-${m}m${s}s` : `T-${m}m ${s}s`;
}

/** 格式化发射时间为本地化日期字符串 */
function formatDate(iso: string, lang: 'zh' | 'en'): string {
  try {
    return new Date(iso).toLocaleString(lang === 'zh' ? 'zh-CN' : 'en-US', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZoneName: 'short',
    });
  } catch { return iso; }
}

function toLaunchPoints(launches: LaunchEvent[]): LaunchPoint[] {
  return launches
    .filter(l => l.site.lat !== 0 || l.site.lon !== 0)
    .map(l => ({
      id: l.id,
      name: l.name,
      siteName: l.site.name,
      lat: l.site.lat,
      lon: l.site.lon,
      status: l.status,
      net: l.net,
      vehicleName: l.vehicle.name,
      orbitType: l.mission?.orbit,
      orbitAltitude: l.mission?.orbitAltitude,
      orbitInclination: l.mission?.orbitInclination,
      isPast: new Date(l.net).getTime() < Date.now(),
    }));
}

// ── Launch row (compact) ──────────────────────────────────────────────────────

function LaunchRow({ launch, lang, selected, onClick }: {
  launch: LaunchEvent; lang: 'zh' | 'en'; selected: boolean; onClick: () => void;
}) {
  const status = STATUS_LABELS[launch.status] ?? STATUS_LABELS.tbd;
  const orbit  = launch.mission?.orbit ? ORBIT_LABELS[launch.mission.orbit] : null;
  const isPast = new Date(launch.net).getTime() < Date.now();

  return (
    <div
      onClick={onClick}
      style={{
        padding: '8px 10px',
        background: selected ? '#161616' : 'transparent',
        borderLeft: `2px solid ${selected ? status.color : 'transparent'}`,
        cursor: 'pointer',
        borderBottom: '1px solid #1a1a1a',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#ddd', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {launch.name}
          </div>
          <div style={{ fontSize: 10, color: '#666', marginTop: 2 }}>
            🚀 {launch.vehicle.name}
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: isPast ? '#555' : '#fff', fontFamily: 'monospace' }}>
            {formatCountdown(launch.net, lang)}
          </div>
          <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end', marginTop: 2 }}>
            <span style={{ fontSize: 9, color: status.color }}>{status.icon}</span>
            {orbit && <span style={{ fontSize: 9, color: orbit.color }}>{lang === 'zh' ? orbit.zh : orbit.en}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Detail drawer (slides in from right inside panel) ─────────────────────────

function LaunchDetail({ launch, lang, onClose, onJumpToTime }: {
  launch: LaunchEvent; lang: 'zh' | 'en'; onClose: () => void;
  onJumpToTime?: (d: Date) => void;
}) {
  const status = STATUS_LABELS[launch.status] ?? STATUS_LABELS.tbd;
  const orbit  = launch.mission?.orbit ? ORBIT_LABELS[launch.mission.orbit] : null;

  const row = (label: string, value: React.ReactNode) => (
    <div style={{ display: 'flex', gap: 6, marginBottom: 6, fontSize: 11 }}>
      <span style={{ color: '#555', minWidth: 80, flexShrink: 0 }}>{label}</span>
      <span style={{ color: '#bbb', wordBreak: 'break-word' }}>{value}</span>
    </div>
  );

  return (
    <div style={{ padding: '10px 12px', overflowY: 'auto', flex: 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#fff' }}>{lang === 'zh' ? '任务详情' : 'Details'}</span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: 14, lineHeight: 1 }}>✕</button>
      </div>

      <div style={{ fontSize: 12, fontWeight: 700, color: '#fff', marginBottom: 6, lineHeight: 1.3 }}>{launch.name}</div>
      <div style={{ fontSize: 10, color: status.color, marginBottom: 10 }}>{status.icon} {lang === 'zh' ? status.zh : status.en}</div>

      {/* Time block */}
      <div style={{ background: '#111', border: '1px solid #222', padding: '8px 10px', marginBottom: 10 }}>
        <div style={{ fontSize: 10, color: '#555', marginBottom: 3 }}>{lang === 'zh' ? '发射时间 (NET)' : 'Launch Time (NET)'}</div>
        <div style={{ fontSize: 11, color: '#ccc', fontFamily: 'monospace' }}>{formatDate(launch.net, lang)}</div>
        <div style={{ fontSize: 16, fontWeight: 900, color: '#fff', fontFamily: 'monospace', marginTop: 4 }}>
          {formatCountdown(launch.net, lang)}
        </div>
        {onJumpToTime && (
          <button
            onClick={() => onJumpToTime(new Date(launch.net))}
            style={{ marginTop: 8, background: '#0a1a0a', border: '1px solid #44ff44', color: '#44ff44', cursor: 'pointer', padding: '3px 10px', fontSize: 10 }}
          >
            ⏱ {lang === 'zh' ? '跳转到发射时间' : 'Jump to Launch Time'}
          </button>
        )}
      </div>

      {/* Vehicle */}
      <div style={{ fontSize: 10, color: '#555', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>{lang === 'zh' ? '运载火箭' : 'Vehicle'}</div>
      {row(lang === 'zh' ? '型号' : 'Name', launch.vehicle.name)}
      {launch.vehicle.manufacturer && row(lang === 'zh' ? '制造商' : 'Maker', launch.vehicle.manufacturer)}
      {launch.vehicle.reusable !== undefined && row(lang === 'zh' ? '可复用' : 'Reusable', launch.vehicle.reusable ? '✓' : '✗')}
      {launch.vehicle.payloadLEO && row('LEO', `${launch.vehicle.payloadLEO.toLocaleString()} kg`)}
      {launch.vehicle.payloadGTO && row('GTO', `${launch.vehicle.payloadGTO.toLocaleString()} kg`)}

      {/* Site */}
      <div style={{ fontSize: 10, color: '#555', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6, marginTop: 10 }}>{lang === 'zh' ? '发射场' : 'Launch Site'}</div>
      {row(lang === 'zh' ? '发射台' : 'Pad', launch.site.name)}
      {launch.site.location && row(lang === 'zh' ? '位置' : 'Location', launch.site.location)}
      {(launch.site.lat !== 0 || launch.site.lon !== 0) && row(lang === 'zh' ? '坐标' : 'Coords', `${launch.site.lat.toFixed(2)}°, ${launch.site.lon.toFixed(2)}°`)}

      {/* Mission */}
      {launch.mission && (
        <>
          <div style={{ fontSize: 10, color: '#555', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6, marginTop: 10 }}>{lang === 'zh' ? '任务' : 'Mission'}</div>
          {orbit && row(lang === 'zh' ? '目标轨道' : 'Orbit', <span style={{ color: orbit.color }}>{lang === 'zh' ? orbit.zh : orbit.en}</span>)}
          {launch.mission.orbitAltitude && row(lang === 'zh' ? '高度' : 'Alt', `${launch.mission.orbitAltitude} km`)}
          {launch.mission.orbitInclination && row(lang === 'zh' ? '倾角' : 'Inc', `${launch.mission.orbitInclination}°`)}
          {launch.mission.type && row(lang === 'zh' ? '类型' : 'Type', launch.mission.type)}
          {launch.mission.description && (
            <div style={{ fontSize: 10, color: '#666', marginTop: 6, lineHeight: 1.5, borderLeft: '2px solid #222', paddingLeft: 8 }}>
              {launch.mission.description.slice(0, 200)}{launch.mission.description.length > 200 ? '…' : ''}
            </div>
          )}
        </>
      )}

      {/* Links */}
      <div style={{ display: 'flex', gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
        {launch.url && (
          <a href={launch.url} target="_blank" rel="noopener noreferrer"
            style={{ fontSize: 10, color: '#4488ff', border: '1px solid #224488', padding: '3px 8px', textDecoration: 'none' }}>
            {lang === 'zh' ? '详情' : 'Details'}
          </a>
        )}
        {launch.livestreamUrl && (
          <a href={launch.livestreamUrl} target="_blank" rel="noopener noreferrer"
            style={{ fontSize: 10, color: '#ff4444', border: '1px solid #882222', padding: '3px 8px', textDecoration: 'none' }}>
            🔴 {lang === 'zh' ? '直播' : 'Live'}
          </a>
        )}
      </div>
    </div>
  );
}

// ── Sources tab ───────────────────────────────────────────────────────────────

function SourcesTab({ useAllSources, setUseAllSources, enabledSources, toggleSource, states, opacity, setOpacity, renderer, lang }: {
  useAllSources: boolean; setUseAllSources: (v: boolean) => void;
  enabledSources: DataSourceId[]; toggleSource: (id: DataSourceId) => void;
  states: Record<string, any>; opacity: number; setOpacity: (v: number) => void;
  renderer: LaunchRenderer | null | undefined; lang: 'zh' | 'en';
}) {
  return (
    <div style={{ padding: '10px 12px', overflowY: 'auto', flex: 1 }}>
      {/* 3D opacity */}
      {renderer && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, padding: '6px 8px', background: '#0d0d0d', border: '1px solid #1a1a1a' }}>
          <span style={{ fontSize: 10, color: '#555', whiteSpace: 'nowrap' }}>
            {lang === 'zh' ? '3D透明度' : '3D Opacity'}
          </span>
          <input type="range" min={0} max={1} step={0.05} value={opacity}
            onChange={e => setOpacity(parseFloat(e.target.value))}
            style={{ flex: 1, accentColor: '#4488ff', height: 2 }} />
          <span style={{ fontSize: 10, color: '#555', minWidth: 28 }}>{Math.round(opacity * 100)}%</span>
        </div>
      )}

      {/* All sources toggle */}
      <div
        onClick={() => setUseAllSources(true)}
        style={{
          padding: '8px 10px', marginBottom: 8, cursor: 'pointer',
          background: useAllSources ? '#0d1a0d' : 'transparent',
          border: `1px solid ${useAllSources ? '#4488ff' : '#222'}`,
          display: 'flex', alignItems: 'center', gap: 8,
        }}
      >
        <div style={{ width: 14, height: 14, border: `2px solid ${useAllSources ? '#4488ff' : '#444'}`, background: useAllSources ? '#4488ff' : 'transparent', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {useAllSources && <span style={{ fontSize: 9, color: '#000', fontWeight: 900 }}>✓</span>}
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: useAllSources ? '#4488ff' : '#888' }}>
            {lang === 'zh' ? '整合全部数据源' : 'All Sources (Merged)'}
          </div>
          <div style={{ fontSize: 10, color: '#555' }}>
            {lang === 'zh' ? '自动合并去重' : 'Auto-merge & deduplicate'}
          </div>
        </div>
      </div>

      {/* Individual sources */}
      {DATA_SOURCES.map(source => {
        const isActive = useAllSources || enabledSources.includes(source.id);
        const state = states[source.id];
        return (
          <div
            key={source.id}
            onClick={() => { setUseAllSources(false); toggleSource(source.id); }}
            style={{
              padding: '7px 10px', marginBottom: 4, cursor: 'pointer',
              background: (!useAllSources && enabledSources.includes(source.id)) ? '#0d0d0d' : 'transparent',
              border: `1px solid ${(!useAllSources && enabledSources.includes(source.id)) ? source.color : '#1a1a1a'}`,
              opacity: useAllSources ? 0.5 : 1,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: 12 }}>{source.icon}</span>
                <span style={{ fontSize: 11, color: isActive ? '#ccc' : '#666', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {lang === 'zh' ? source.nameZh : source.name}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexShrink: 0 }}>
                {state?.loading && <span style={{ fontSize: 9, color: '#888' }}>⟳</span>}
                {state?.error && <span style={{ fontSize: 9, color: '#ff4444' }}>⚠</span>}
                {state?.launches?.length > 0 && (
                  <span style={{ fontSize: 9, color: source.color }}>{state.launches.length}</span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Main Panel ────────────────────────────────────────────────────────────────

export default function SpaceLaunchPanel({ renderer, onClose, lang = 'zh', initialConfig, onConfigChange, asWindowContent = false }: Props) {
  const [useAllSources, setUseAllSources] = useState(initialConfig?.useAllSources ?? true);
  const [enabledSources, setEnabledSources] = useState<DataSourceId[]>(initialConfig?.enabledSources ?? ['launch_library2']);
  const [opacity, setOpacity] = useState(initialConfig?.opacity ?? 0.9);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'recent' | 'sources'>('upcoming');
  const [selectedLaunch, setSelectedLaunch] = useState<LaunchEvent | null>(null);
  const [minimized, setMinimized] = useState(false);

  const setCurrentTime = useSolarSystemStore(s => s.setCurrentTime);
  const isPlaying = useSolarSystemStore(s => s.isPlaying);
  const togglePlayPause = useSolarSystemStore(s => s.togglePlayPause);

  const activeSources = useAllSources ? ALL_SOURCE_IDS : enabledSources;
  const { states, allLaunches, totalLoading } = useLaunchData(activeSources);

  // Push to 3D renderer
  useEffect(() => {
    if (!renderer) return;
    renderer.updatePoints(toLaunchPoints(allLaunches), opacity);
  }, [renderer, allLaunches, opacity]);

  // Persist config
  useEffect(() => {
    onConfigChange?.({ enabledSources, opacity, useAllSources });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabledSources, opacity, useAllSources]);

  const toggleSource = (id: DataSourceId) =>
    setEnabledSources(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);

  const handleJumpToTime = useCallback((date: Date) => {
    if (isPlaying) togglePlayPause();
    setCurrentTime(date);
  }, [isPlaying, togglePlayPause, setCurrentTime]);

  const now = Date.now();
  const upcoming = useMemo(() =>
    allLaunches
      .filter(l => new Date(l.net).getTime() >= now - 3600000)
      .sort((a, b) => new Date(a.net).getTime() - new Date(b.net).getTime()),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [allLaunches]);

  const recent = useMemo(() =>
    allLaunches
      .filter(l => new Date(l.net).getTime() < now - 3600000)
      .sort((a, b) => new Date(b.net).getTime() - new Date(a.net).getTime())
      .slice(0, 20),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [allLaunches]);

  const t = {
    title: lang === 'zh' ? '航天发射' : 'Space Launches',
    upcoming: lang === 'zh' ? '即将' : 'Upcoming',
    recent: lang === 'zh' ? '近期' : 'Recent',
    sources: lang === 'zh' ? '数据源' : 'Sources',
    noData: lang === 'zh' ? '暂无数据' : 'No data',
  };

  return (
    <div
      className={asWindowContent ? "h-full flex flex-col bg-transparent text-white select-none" : "fixed z-[1500] flex flex-col bg-[#0a0a0a] border border-[#333] text-white select-none"}
      style={asWindowContent ? {} : {
        bottom: '1rem',
        left: '1rem',
        width: selectedLaunch ? 620 : 300,
        maxHeight: minimized ? 'auto' : '75vh',
        transition: 'width 0.2s ease',
        clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)',
      }}
    >
      {/* Corner decorations - 仅在非窗口模式显示 */}
      {!asWindowContent && (
        <>
          <div style={{ position: 'absolute', top: -1, left: -1, width: 10, height: 10, background: '#4488ff', clipPath: 'polygon(0 0, 100% 0, 0 100%)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: -1, right: -1, width: 10, height: 10, background: '#4488ff', clipPath: 'polygon(100% 0, 100% 100%, 0 100%)', pointerEvents: 'none' }} />
        </>
      )}

      {/* Header */}
      <div
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderBottom: '1px solid #1a1a1a', flexShrink: 0, cursor: 'pointer' }}
        onClick={() => setMinimized(m => !m)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14 }}>🚀</span>
          <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: '#4488ff' }}>{t.title}</span>
          {totalLoading && <span style={{ fontSize: 10, color: '#888' }}>⟳</span>}
          {!minimized && renderer && (
            <span style={{ fontSize: 9, color: '#44ff44', border: '1px solid #44ff4433', padding: '1px 5px' }}>3D</span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 10, color: '#555' }}>{allLaunches.length}</span>
          <span style={{ fontSize: 12, color: '#555' }}>{minimized ? '▲' : '▼'}</span>
          {onClose && (
            <button
              onClick={e => { e.stopPropagation(); onClose(); }}
              style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: 14, lineHeight: 1, padding: 0 }}
            >✕</button>
          )}
        </div>
      </div>

      {!minimized && (
        <>
          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid #1a1a1a', flexShrink: 0 }}>
            {(['upcoming', 'recent', 'sources'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} style={{
                flex: 1, padding: '6px 4px', background: activeTab === tab ? '#111' : 'transparent',
                border: 'none', borderBottom: activeTab === tab ? '2px solid #4488ff' : '2px solid transparent',
                color: activeTab === tab ? '#fff' : '#555', cursor: 'pointer', fontSize: 10,
                fontWeight: activeTab === tab ? 700 : 400, letterSpacing: 0.5, textTransform: 'uppercase',
              }}>
                {tab === 'upcoming' ? `${t.upcoming} (${upcoming.length})` : tab === 'recent' ? `${t.recent} (${recent.length})` : t.sources}
              </button>
            ))}
          </div>

          {/* Content area — list + optional detail side-by-side */}
          <div style={{ flex: 1, overflow: 'hidden', display: 'flex', minHeight: 0 }}>

            {/* List column */}
            <div style={{ width: selectedLaunch ? 300 : '100%', flexShrink: 0, overflowY: 'auto', borderRight: selectedLaunch ? '1px solid #1a1a1a' : 'none' }}>
              {activeTab === 'sources' ? (
                <SourcesTab
                  useAllSources={useAllSources} setUseAllSources={setUseAllSources}
                  enabledSources={enabledSources} toggleSource={toggleSource}
                  states={states} opacity={opacity} setOpacity={setOpacity}
                  renderer={renderer} lang={lang}
                />
              ) : (
                <>
                  {(activeTab === 'upcoming' ? upcoming : recent).length === 0 ? (
                    <div style={{ padding: '20px', textAlign: 'center', color: '#555', fontSize: 11 }}>{t.noData}</div>
                  ) : (
                    (activeTab === 'upcoming' ? upcoming : recent).map(launch => (
                      <LaunchRow
                        key={launch.id} launch={launch} lang={lang}
                        selected={selectedLaunch?.id === launch.id}
                        onClick={() => setSelectedLaunch(prev => prev?.id === launch.id ? null : launch)}
                      />
                    ))
                  )}
                </>
              )}
            </div>

            {/* Detail column */}
            {selectedLaunch && (
              <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <LaunchDetail
                  launch={selectedLaunch} lang={lang}
                  onClose={() => setSelectedLaunch(null)}
                  onJumpToTime={handleJumpToTime}
                />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
