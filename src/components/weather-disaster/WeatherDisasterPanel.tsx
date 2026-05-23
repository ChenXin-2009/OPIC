'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { DisasterRenderer } from '@/lib/mods/weather-disaster/DisasterRenderer';
import { useDisasterData } from '@/lib/mods/weather-disaster/useDisasterData';
import type { DataSourceId } from '@/lib/mods/weather-disaster/useDisasterData';
import type { DisasterPoint } from '@/lib/mods/weather-disaster/DisasterRenderer';

// ── 数据源 & 类别定义 ─────────────────────────────────────────────────────────

/** 数据源配置项：标识符、名称、描述、分类、颜色、图标和刷新间隔 */
interface SrcDef { id: DataSourceId; name: string; desc: string; cat: string; color: string; icon: string; interval: number }

const SOURCES: SrcDef[] = [
  { id: 'gdacs',           name: 'GDACS 全球灾害预警',  desc: '联合国/欧盟全球灾害预警协调系统，覆盖地震、台风、洪水、火山等', cat: 'multi',      color: '#00ff88', icon: '🌐', interval: 300  },
  { id: 'reliefweb',       name: 'ReliefWeb 灾害报告',  desc: '联合国人道主义事务协调厅持续更新的在线灾害报告',               cat: 'multi',      color: '#00ccaa', icon: '🆘', interval: 3600 },
  { id: 'usgs_earthquake', name: 'USGS 地震监测',       desc: '美国地质调查局实时全球地震数据，M2.5+ 过去7天',               cat: 'earthquake', color: '#ff6600', icon: '🌋', interval: 60   },
  { id: 'emsc_earthquake', name: 'EMSC 欧洲地震中心',   desc: '欧洲地中海地震中心实时地震事件，M3.0+',                       cat: 'earthquake', color: '#ff8833', icon: '📡', interval: 120  },
  { id: 'nasa_firms',      name: 'NASA FIRMS 火点',     desc: 'NASA VIIRS/MODIS卫星实时全球活跃火点，每日更新',              cat: 'wildfire',   color: '#ff2200', icon: '🔥', interval: 600  },
  { id: 'noaa_weather',    name: 'NOAA 气象预警',       desc: 'NOAA美国国家气象局活跃气象预警（美国区域）',                  cat: 'storm',      color: '#ffdd00', icon: '⛈️', interval: 300  },
  { id: 'noaa_tsunami',    name: 'NOAA 海啸事件库',     desc: 'NOAA国家环境信息中心2020年以来海啸历史事件',                  cat: 'tsunami',    color: '#00ccff', icon: '🌊', interval: 3600 },
];

/** 灾害类别元数据：中文名称、配色和图标 */
const CAT: Record<string, { zh: string; color: string; icon: string }> = {
  multi:      { zh: '综合',  color: '#00ff88', icon: '🌐' },
  earthquake: { zh: '地震',  color: '#ff6600', icon: '🌋' },
  wildfire:   { zh: '野火',  color: '#ff2200', icon: '🔥' },
  storm:      { zh: '气象',  color: '#ffdd00', icon: '⛈️' },
  tsunami:    { zh: '海啸',  color: '#00ccff', icon: '🌊' },
  typhoon:    { zh: '台风',  color: '#dd44ff', icon: '🌀' },
  flood:      { zh: '洪水',  color: '#0088ff', icon: '💧' },
  volcano:    { zh: '火山',  color: '#ff0044', icon: '🌋' },
  drought:    { zh: '干旱',  color: '#cc8800', icon: '☀️' },
};

/** 严重程度等级配色 */
const SEV_COLOR: Record<string, string> = { extreme: '#ff2222', high: '#ff8800', medium: '#ffcc00', low: '#44cc44' };
/** 严重程度中文标签 */
const SEV_ZH:    Record<string, string> = { extreme: '极端',    high: '高',      medium: '中',      low: '低'      };
/** 严重程度排序（从高到低） */
const SEV_ORDER = ['extreme', 'high', 'medium', 'low'];

/** 格式化刷新间隔：将秒数转换为可读的 s/m/h 格式 */
const fmtInterval = (s: number) => s < 60 ? `${s}s` : s < 3600 ? `${Math.round(s/60)}m` : `${Math.round(s/3600)}h`;

// ── 子组件 ────────────────────────────────────────────────────────────────────

/** 标签页切换按钮：文字大写、底部活动指示条 */
function Tab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="flex-1 py-2 text-[11px] font-bold uppercase transition-all"
      style={{
        color: active ? '#fff' : '#555',
        borderBottom: active ? '2px solid #fff' : '2px solid transparent',
        background: active ? '#111' : 'transparent',
        letterSpacing: '0.08em',
      }}
    >
      {children}
    </button>
  );
}

/** 严重程度徽章：根据等级显示对应颜色和文字 */
function SevBadge({ sev }: { sev: string }) {
  const color = SEV_COLOR[sev] || '#888';
  return (
    <span className="text-[9px] font-bold px-1.5 py-0.5 flex-shrink-0"
      style={{ color, border: `1px solid ${color}55`, background: `${color}11` }}>
      {SEV_ZH[sev] || sev}
    </span>
  );
}

/** 数据源卡片：显示名称、描述、状态，点击切换启用/禁用 */
function SourceCard({ src, enabled, state, onToggle }: {
  src: SrcDef;
  enabled: boolean;
  state?: { loading: boolean; error: string | null; count: number; lastUpdated: number | null };
  onToggle: () => void;
}) {
  return (
    <div
      onClick={onToggle}
      className="flex items-start gap-2.5 p-2.5 cursor-pointer transition-all"
      style={{
        background: enabled ? '#111' : '#0d0d0d',
        border: `1px solid ${enabled ? src.color + '55' : '#1e1e1e'}`,
        opacity: enabled ? 1 : 0.55,
      }}
    >
      <div className="w-0.5 self-stretch flex-shrink-0" style={{ background: enabled ? src.color : '#333' }} />
      <span className="text-base flex-shrink-0 mt-0.5">{src.icon}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
          <span className="text-[11px] font-bold text-white">{src.name}</span>
          <span className="text-[9px] px-1 py-0.5" style={{ color:'#44cc44', border:'1px solid #1a3a1a', background:'#0a1a0a' }}>免费</span>
          <span className="text-[9px] px-1 py-0.5 text-gray-500" style={{ border:'1px solid #222' }}>⟳ {fmtInterval(src.interval)}</span>
        </div>
        <p className="text-[10px] leading-tight" style={{ color:'#555' }}>{src.desc}</p>
        {enabled && state && (
          <div className="mt-1 flex items-center gap-2">
            {state.loading && <span className="text-[10px] text-yellow-400 animate-pulse">● 获取中</span>}
            {state.error  && <span className="text-[10px] text-red-400 truncate">⚠ {state.error}</span>}
            {!state.loading && !state.error && state.lastUpdated && (
              <span className="text-[10px]" style={{ color: src.color }}>✓ {state.count} 个事件</span>
            )}
          </div>
        )}
      </div>
      <div className="flex-shrink-0 w-4 h-4 mt-0.5 flex items-center justify-center"
        style={{ border: `1.5px solid ${enabled ? src.color : '#333'}`, background: enabled ? src.color + '22' : 'transparent' }}>
        {enabled && <span style={{ color: src.color, fontSize: 10, fontWeight: 900 }}>✓</span>}
      </div>
    </div>
  );
}

/** 事件行：左侧严重程度色条、图标、标题、时间和分类 */
function EventRow({ e }: { e: DisasterPoint }) {
  const catInfo = CAT[e.category] || { zh: e.category, color: '#888', icon: '📊' };
  const sevColor = SEV_COLOR[e.severity] || '#888';
  return (
    <div className="flex items-start gap-2 px-3 py-2 border-b border-[#0f0f0f] hover:bg-[#0d0d0d] transition-colors">
      <div className="w-0.5 self-stretch flex-shrink-0" style={{ background: sevColor }} />
      <span className="text-sm flex-shrink-0 mt-0.5">{catInfo.icon}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
          <span className="text-[11px] font-medium text-white truncate max-w-[170px]">{e.title}</span>
          <SevBadge sev={e.severity} />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] text-gray-600">
            {new Date(e.time).toLocaleString('zh-CN', { month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit' })}
          </span>
          <span className="text-[10px] font-medium" style={{ color: catInfo.color }}>{catInfo.zh}</span>
          {e.description && (
            <span className="text-[10px] text-gray-600 truncate max-w-[150px]">{e.description}</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── 主面板 ────────────────────────────────────────────────────────────────────

interface Props {
  renderer: DisasterRenderer | null;
  onClose?: () => void;
  onConfigChange?: (cfg: { enabledSources: DataSourceId[]; opacity: number; hiddenCategories: string[] }) => void;
  initialConfig?: { enabledSources?: DataSourceId[]; opacity?: number; hiddenCategories?: string[] };
  asWindowContent?: boolean; // 是否作为窗口内容显示(macOS风格)
  lang?: 'zh' | 'en';
}

export const WeatherDisasterPanel: React.FC<Props> = ({ renderer, onClose, onConfigChange, initialConfig, asWindowContent = false, lang = 'zh' }) => {
  // 已启用的数据源列表
  const [enabledSources, setEnabledSources] = useState<DataSourceId[]>(
    initialConfig?.enabledSources ?? ['usgs_earthquake', 'gdacs']
  );
  // 3D 图层透明度
  const [opacity, setOpacity]       = useState(initialConfig?.opacity ?? 0.9);
  // 隐藏的灾害类别（为空的类别显示）
  const [hiddenCats, setHiddenCats] = useState<string[]>(initialConfig?.hiddenCategories ?? []);
  // 当前激活的标签页
  const [tab, setTab]               = useState<'sources' | 'layers' | 'events'>('sources');
  // 严重程度筛选：all 或具体等级
  const [sevFilter, setSevFilter]   = useState('all');

  // 获取所有启用的数据源状态和灾害事件点
  const { states, allPoints, totalLoading, totalCount, refetch } = useDisasterData(enabledSources);

  // 将未被隐藏的事件点同步到 3D 渲染器
  useEffect(() => {
    if (!renderer) return;
    renderer.updatePoints(allPoints.filter(p => !hiddenCats.includes(p.category)), opacity);
  }, [renderer, allPoints, hiddenCats, opacity]);

  // 合并配置变更并向上通知父组件
  const pushConfig = useCallback((patch: Partial<{ enabledSources: DataSourceId[]; opacity: number; hiddenCategories: string[] }>) => {
    onConfigChange?.({
      enabledSources:   patch.enabledSources   ?? enabledSources,
      opacity:          patch.opacity          ?? opacity,
      hiddenCategories: patch.hiddenCategories ?? hiddenCats,
    });
  }, [enabledSources, opacity, hiddenCats, onConfigChange]);

  // 切换单个数据源的启用状态
  const toggleSrc = (id: DataSourceId) => {
    const next = enabledSources.includes(id) ? enabledSources.filter(s => s !== id) : [...enabledSources, id];
    setEnabledSources(next);
    pushConfig({ enabledSources: next });
  };

  // 切换灾害类别的显示/隐藏
  const toggleCat = (cat: string) => {
    const next = hiddenCats.includes(cat) ? hiddenCats.filter(c => c !== cat) : [...hiddenCats, cat];
    setHiddenCats(next);
    pushConfig({ hiddenCategories: next });
    renderer?.setLayerVisible(cat, hiddenCats.includes(cat));
  };

  // 将数据源按灾害类别分组
  const grouped = useMemo(() => {
    const m = new Map<string, SrcDef[]>();
    SOURCES.forEach(s => { if (!m.has(s.cat)) m.set(s.cat, []); m.get(s.cat)!.push(s); });
    return m;
  }, []);

  // 筛选并排序后的事件列表（按严重程度过滤、按时间降序、最多 300 条）
  const events = useMemo(() =>
    allPoints
      .filter(e => (sevFilter === 'all' || e.severity === sevFilter) && !hiddenCats.includes(e.category))
      .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
      .slice(0, 300),
    [allPoints, sevFilter, hiddenCats]
  );

  // 各灾害类别的事件计数
  const catCounts = useMemo(() => {
    const m: Record<string, number> = {};
    allPoints.forEach(p => { m[p.category] = (m[p.category] || 0) + 1; });
    return m;
  }, [allPoints]);

  // 各严重程度的事件计数
  const sevCounts = useMemo(() => {
    const m: Record<string, number> = {};
    allPoints.forEach(p => { m[p.severity] = (m[p.severity] || 0) + 1; });
    return m;
  }, [allPoints]);

  return (
    <div
      className={asWindowContent ? "h-full flex flex-col bg-transparent text-white" : "fixed bottom-4 left-4 z-[1500] flex flex-col"}
      style={asWindowContent ? {
        fontFamily: 'system-ui, -apple-system, sans-serif',
      } : {
        width: 360,
        maxHeight: '82vh',
        background: '#0a0a0a',
        border: '1px solid #2a2a2a',
        color: '#fff',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        boxShadow: '0 8px 32px rgba(0,0,0,0.8)',
      }}
    >
      {/* 左上角装饰线 */}
      <div style={{ position:'absolute', top:0, left:0, width:12, height:12, borderTop:'2px solid #ff6600', borderLeft:'2px solid #ff6600', pointerEvents:'none' }} />
      {/* 右下角装饰线 */}
      <div style={{ position:'absolute', bottom:0, right:0, width:12, height:12, borderBottom:'2px solid #ff6600', borderRight:'2px solid #ff6600', pointerEvents:'none' }} />

      {/* ── 头部 ── */}
      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0" style={{ borderBottom: '1px solid #1e1e1e' }}>
        <div className="flex items-center gap-2.5">
          <div className="w-1 h-5" style={{ background: 'linear-gradient(to bottom, #ff6600, #ff2200)' }} />
          <span className="text-[13px] font-bold uppercase" style={{ letterSpacing: '0.1em' }}>气象灾害监测</span>
          {totalLoading && <span className="text-[10px] text-yellow-400 animate-pulse font-mono">LIVE</span>}
        </div>
        <div className="flex items-center gap-3">
          {totalCount > 0 && <span className="text-[11px] font-mono" style={{ color: '#ff6600' }}>{totalCount}</span>}
          {onClose && (
            <button onClick={onClose} className="text-gray-600 hover:text-white transition-colors text-base leading-none">✕</button>
          )}
        </div>
      </div>

      {/* ── 严重程度快速统计 ── */}
      {totalCount > 0 && (
        <div className="flex items-center px-4 py-2 gap-3 flex-shrink-0" style={{ borderBottom: '1px solid #1a1a1a', background: '#080808' }}>
          {SEV_ORDER.map(sev => {
            const cnt = sevCounts[sev] || 0;
            if (!cnt) return null;
            return (
              <button key={sev} onClick={() => setSevFilter(sevFilter === sev ? 'all' : sev)}
                className="flex items-center gap-1 transition-all"
                style={{ opacity: sevFilter !== 'all' && sevFilter !== sev ? 0.3 : 1 }}>
                <div className="w-2 h-2 rounded-full" style={{ background: SEV_COLOR[sev] }} />
                <span className="text-[10px] font-mono" style={{ color: SEV_COLOR[sev] }}>{cnt}</span>
                <span className="text-[10px] text-gray-600">{SEV_ZH[sev]}</span>
              </button>
            );
          })}
          {sevFilter !== 'all' && (
            <button onClick={() => setSevFilter('all')} className="text-[10px] text-gray-600 hover:text-white ml-auto">全部</button>
          )}
        </div>
      )}

      {/* ── 标签页 ── */}
      <div className="flex flex-shrink-0" style={{ borderBottom: '1px solid #1e1e1e' }}>
        <Tab active={tab === 'sources'} onClick={() => setTab('sources')}>数据源</Tab>
        <Tab active={tab === 'layers'}  onClick={() => setTab('layers')}>图层</Tab>
        <Tab active={tab === 'events'}  onClick={() => setTab('events')}>
          事件{totalCount > 0 ? ` · ${totalCount}` : ''}
        </Tab>
      </div>

      {/* ── 内容区 ── */}
      <div className="flex-1 overflow-y-auto min-h-0" style={{ scrollbarWidth: 'thin', scrollbarColor: '#333 transparent' }}>

        {/* 数据源 */}
        {tab === 'sources' && (
          <div className="p-3 space-y-4">
            <p className="text-[10px] text-gray-600">点击卡片启用/禁用数据源，所有接口均为公开免费</p>
            {Array.from(grouped.entries()).map(([cat, srcs]) => {
              const catInfo = CAT[cat] || { zh: cat, color: '#888', icon: '📊' };
              return (
                <div key={cat}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs">{catInfo.icon}</span>
                    <span className="text-[10px] font-bold uppercase" style={{ color: catInfo.color, letterSpacing: '0.1em' }}>{catInfo.zh}</span>
                    <div className="flex-1 h-px" style={{ background: catInfo.color + '22' }} />
                  </div>
                  <div className="space-y-1.5">
                    {srcs.map(src => (
                      <SourceCard key={src.id} src={src} enabled={enabledSources.includes(src.id)} state={states[src.id]} onToggle={() => toggleSrc(src.id)} />
                    ))}
                  </div>
                </div>
              );
            })}
            <button
              onClick={() => enabledSources.forEach(id => refetch(id))}
              className="w-full py-2 text-[11px] font-bold uppercase transition-all hover:bg-[#1a1a1a]"
              style={{ border: '1px solid #2a2a2a', color: '#555', letterSpacing: '0.1em' }}
            >
              ↺ 刷新所有数据源
            </button>
          </div>
        )}

        {/* 图层控制 */}
        {tab === 'layers' && (
          <div className="p-3 space-y-4">
            <div>
              <div className="text-[10px] font-bold uppercase text-gray-600 mb-2" style={{ letterSpacing: '0.1em' }}>灾害类别</div>
              <div className="space-y-1.5">
                {Object.entries(CAT).map(([cat, info]) => {
                  const cnt = catCounts[cat] || 0;
                  if (!cnt) return null;
                  const visible = !hiddenCats.includes(cat);
                  return (
                    <div key={cat} onClick={() => toggleCat(cat)}
                      className="flex items-center justify-between px-3 py-2 cursor-pointer transition-all"
                      style={{ background: visible ? '#111' : '#0a0a0a', border: `1px solid ${visible ? info.color + '33' : '#1a1a1a'}` }}>
                      <div className="flex items-center gap-2.5">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ background: visible ? info.color : '#333' }} />
                        <span className="text-xs" style={{ color: visible ? info.color : '#444' }}>{info.icon} {info.zh}</span>
                        <span className="text-[10px] font-mono" style={{ color: '#444' }}>{cnt}</span>
                      </div>
                      <div className="w-8 h-4 rounded-full relative"
                        style={{ background: visible ? info.color + '44' : '#1a1a1a', border: `1px solid ${visible ? info.color + '66' : '#333'}` }}>
                        <div className="absolute top-0.5 w-3 h-3 rounded-full transition-transform"
                          style={{ background: visible ? info.color : '#333', transform: visible ? 'translateX(17px)' : 'translateX(1px)' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[10px] mb-2">
                <span className="font-bold uppercase text-gray-600" style={{ letterSpacing: '0.1em' }}>透明度</span>
                <span className="font-mono" style={{ color: '#ff6600' }}>{Math.round(opacity * 100)}%</span>
              </div>
              <input type="range" min="0.1" max="1" step="0.05" value={opacity}
                onChange={e => { const v = parseFloat(e.target.value); setOpacity(v); pushConfig({ opacity: v }); }}
                className="w-full cursor-pointer" style={{ accentColor: '#ff6600' }} />
            </div>

            <div>
              <div className="text-[10px] font-bold uppercase text-gray-600 mb-2" style={{ letterSpacing: '0.1em' }}>严重程度图例</div>
              <div className="grid grid-cols-2 gap-1.5">
                {SEV_ORDER.map(sev => (
                  <div key={sev} className="flex items-center gap-2 px-2 py-1.5" style={{ background:'#0d0d0d', border:'1px solid #1a1a1a' }}>
                    <div className="w-3 h-3 rounded-full" style={{ background: SEV_COLOR[sev] }} />
                    <span className="text-[10px]" style={{ color: SEV_COLOR[sev] }}>{SEV_ZH[sev]}</span>
                    <span className="text-[10px] font-mono text-gray-600 ml-auto">{sevCounts[sev] || 0}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 事件列表 */}
        {tab === 'events' && (
          <div className="flex flex-col" style={{ minHeight: 0 }}>
            <div className="flex items-center gap-2 px-3 py-2 flex-shrink-0" style={{ borderBottom: '1px solid #141414', background: '#080808' }}>
              <span className="text-[10px] text-gray-600">严重程度</span>
              <div className="flex gap-1">
                {['all', ...SEV_ORDER].map(s => (
                  <button key={s} onClick={() => setSevFilter(s)}
                    className="text-[10px] px-1.5 py-0.5 transition-all"
                    style={{
                      color: sevFilter === s ? (s === 'all' ? '#fff' : SEV_COLOR[s]) : '#444',
                      border: `1px solid ${sevFilter === s ? (s === 'all' ? '#444' : SEV_COLOR[s] + '66') : '#1e1e1e'}`,
                      background: sevFilter === s ? (s === 'all' ? '#1a1a1a' : SEV_COLOR[s] + '11') : 'transparent',
                    }}>
                    {s === 'all' ? '全部' : SEV_ZH[s]}
                  </button>
                ))}
              </div>
              <span className="text-[10px] font-mono text-gray-600 ml-auto">{events.length}</span>
            </div>

            {events.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2">
                <span className="text-2xl opacity-20">🌍</span>
                <span className="text-[11px] text-gray-600">
                  {enabledSources.length === 0 ? '请先在「数据源」标签页启用数据源' : '暂无符合条件的事件'}
                </span>
              </div>
            ) : (
              <div>
                {events.map((e, i) => <EventRow key={`${e.id}-${i}`} e={e} />)}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default WeatherDisasterPanel;
