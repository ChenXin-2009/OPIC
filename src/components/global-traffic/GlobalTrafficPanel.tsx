'use client';

/**
 * 全球货运与贸易路线 - 主面板组件
 * 开启 MOD 后显示，提供数据源选择和实时数据展示
 */

import React, { useState, useEffect, useCallback } from 'react';
import { TRAFFIC_DATA_SOURCES, CATEGORY_LABELS } from '@/lib/mods/global-traffic/dataSources';
import { useTrafficData } from '@/lib/mods/global-traffic/useTrafficData';
import { TrafficRenderer } from '@/lib/mods/global-traffic/TrafficRenderer';
import { DEMO_TRADE_ROUTES, DEMO_AIR_ROUTES, MAJOR_PORTS, MAJOR_AIRPORTS } from '@/lib/mods/global-traffic/demoData';
import { DEFAULT_CONFIG, type DataSourceId, type GlobalTrafficConfig } from '@/lib/mods/global-traffic/types';

/** 面板属性：渲染器、语言、配置回调、窗口模式等 */
interface GlobalTrafficPanelProps {
  renderer: TrafficRenderer | null;
  lang?: 'zh' | 'en';
  onClose?: () => void;
  initialConfig?: Partial<GlobalTrafficConfig>;
  onConfigChange?: (config: GlobalTrafficConfig) => void;
  asWindowContent?: boolean; // 是否作为窗口内容显示(macOS风格)
}

/** 中/英文界面文本映射 */
const T = {
  zh: {
    title: '全球货运与贸易路线',
    dataSources: '数据源',
    layers: '图层控制',
    stats: '实时统计',
    vessels: '船舶',
    flights: '航班',
    routes: '贸易路线',
    ports: '港口/机场',
    enabled: '已启用',
    disabled: '已禁用',
    loading: '加载中...',
    error: '错误',
    free: '免费',
    apiKey: '需API Key',
    global: '全球',
    regional: '区域',
    lastUpdate: '最后更新',
    count: '数量',
    opacity: '透明度',
    refresh: '刷新',
    noData: '暂无数据',
    selectSources: '选择数据源以开始追踪',
    vessel_types: '船舶类型',
    cargo: '货船',
    tanker: '油轮',
    container: '集装箱船',
    bulk: '散货船',
    passenger: '客船',
    fishing: '渔船',
  },
  en: {
    title: 'Global Traffic & Trade Routes',
    dataSources: 'Data Sources',
    layers: 'Layer Control',
    stats: 'Live Stats',
    vessels: 'Vessels',
    flights: 'Flights',
    routes: 'Trade Routes',
    ports: 'Ports/Airports',
    enabled: 'Enabled',
    disabled: 'Disabled',
    loading: 'Loading...',
    error: 'Error',
    free: 'Free',
    apiKey: 'API Key',
    global: 'Global',
    regional: 'Regional',
    lastUpdate: 'Last Update',
    count: 'Count',
    opacity: 'Opacity',
    refresh: 'Refresh',
    noData: 'No data',
    selectSources: 'Select data sources to start tracking',
    vessel_types: 'Vessel Types',
    cargo: 'Cargo',
    tanker: 'Tanker',
    container: 'Container',
    bulk: 'Bulk Carrier',
    passenger: 'Passenger',
    fishing: 'Fishing',
  },
};

export const GlobalTrafficPanel: React.FC<GlobalTrafficPanelProps> = ({
  renderer,
  lang = 'zh',
  onClose,
  initialConfig,
  onConfigChange,
  asWindowContent = false,
}) => {
  const t = T[lang];
  const [config, setConfig] = useState<GlobalTrafficConfig>({ ...DEFAULT_CONFIG, ...initialConfig });
  const [activeTab, setActiveTab] = useState<'sources' | 'layers' | 'stats'>('sources');

  const { states, vessels, flights, totalLoading, refetch } = useTrafficData(config.enabledSources);

  // 数据变化时同步到 3D 渲染器：船舶图层
  useEffect(() => {
    if (!renderer) return;
    if (config.showVessels) renderer.updateVessels(vessels, config.opacity);
    else renderer.setLayerVisible('vessels', false);
  }, [vessels, renderer, config.showVessels, config.opacity]);

  // 数据变化时同步到 3D 渲染器：航班图层（限制最大数量）
  useEffect(() => {
    if (!renderer) return;
    if (config.showFlights) renderer.updateFlights(flights.slice(0, config.maxFlights), config.opacity);
    else renderer.setLayerVisible('flights', false);
  }, [flights, renderer, config.showFlights, config.maxFlights, config.opacity]);

  // 数据变化时同步到 3D 渲染器：贸易路线
  useEffect(() => {
    if (!renderer) return;
    const routes = config.showTradeRoutes ? [...DEMO_TRADE_ROUTES, ...DEMO_AIR_ROUTES] : [];
    renderer.updateTradeRoutes(routes, config.opacity);
  }, [renderer, config.showTradeRoutes, config.opacity]);

  // 数据变化时同步到 3D 渲染器：港口/机场标记
  useEffect(() => {
    if (!renderer) return;
    const ports = config.showPorts ? [...MAJOR_PORTS, ...MAJOR_AIRPORTS] : [];
    renderer.updatePorts(ports, config.opacity);
  }, [renderer, config.showPorts, config.opacity]);

  // 合并配置变更并向上通知父组件
  const updateConfig = useCallback((patch: Partial<GlobalTrafficConfig>) => {
    setConfig(prev => {
      const next = { ...prev, ...patch };
      onConfigChange?.(next);
      return next;
    });
  }, [onConfigChange]);

  // 切换单个数据源的启用状态
  const toggleSource = (id: DataSourceId) => {
    const enabled = config.enabledSources.includes(id);
    updateConfig({
      enabledSources: enabled
        ? config.enabledSources.filter(s => s !== id)
        : [...config.enabledSources, id],
    });
  };

  // Group sources by category
  const grouped = TRAFFIC_DATA_SOURCES.reduce<Record<string, typeof TRAFFIC_DATA_SOURCES>>((acc, src) => {
    const cat = src.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(src);
    return acc;
  }, {});

  const totalVessels = vessels.length;
  const totalFlights = flights.length;

  return (
    <div
      className={asWindowContent ? "h-full flex flex-col bg-transparent text-white" : "fixed bottom-4 left-4 z-[1500] flex flex-col bg-[#0a0a0a] border border-[#333] text-white"}
      style={asWindowContent ? {} : {
        width: 360,
        maxHeight: '80vh',
        clipPath: 'polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#333] flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-lg">🌐</span>
          <span className="text-sm font-bold tracking-wider uppercase text-white">{t.title}</span>
        </div>
        <div className="flex items-center gap-2">
          {totalLoading && (
            <span className="text-xs text-yellow-400 animate-pulse">{t.loading}</span>
          )}
          {onClose && (
            <button onClick={onClose} className="text-gray-500 hover:text-white text-lg leading-none">✕</button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#333] flex-shrink-0">
        {(['sources', 'layers', 'stats'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 text-xs font-medium transition-colors ${
              activeTab === tab ? 'text-white border-b-2 border-white bg-[#111]' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {tab === 'sources' ? t.dataSources : tab === 'layers' ? t.layers : t.stats}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'sources' && (
          <div className="p-3 space-y-4">
            {Object.entries(grouped).map(([cat, sources]) => {
              const catInfo = CATEGORY_LABELS[cat];
              return (
                <div key={cat}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm">{catInfo?.icon}</span>
                    <span className="text-xs font-bold uppercase tracking-wider" style={{ color: catInfo?.color }}>
                      {lang === 'zh' ? catInfo?.zh : catInfo?.en}
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {sources.map(src => {
                      const isEnabled = config.enabledSources.includes(src.id);
                      const state = states[src.id];
                      return (
                        <div
                          key={src.id}
                          onClick={() => toggleSource(src.id)}
                          className={`flex items-start gap-2 p-2 rounded cursor-pointer transition-all border ${
                            isEnabled ? 'border-[#444] bg-[#111]' : 'border-[#222] bg-[#0d0d0d] opacity-60'
                          } hover:border-[#555]`}
                        >
                          {/* Toggle dot */}
                          <div className={`mt-0.5 w-2.5 h-2.5 rounded-full flex-shrink-0 ${isEnabled ? 'bg-green-400' : 'bg-gray-600'}`} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-medium text-white truncate">
                                {lang === 'zh' ? src.nameZh : src.name}
                              </span>
                              {src.free && (
                                <span className="text-[10px] px-1 py-0.5 rounded bg-green-900 text-green-300">{t.free}</span>
                              )}
                              {src.requiresApiKey && (
                                <span className="text-[10px] px-1 py-0.5 rounded bg-yellow-900 text-yellow-300">{t.apiKey}</span>
                              )}
                              <span className="text-[10px] px-1 py-0.5 rounded bg-[#222] text-gray-400">
                                {src.coverage === 'global' ? t.global : t.regional}
                              </span>
                            </div>
                            <p className="text-[10px] text-gray-500 mt-0.5 leading-tight">
                              {lang === 'zh' ? src.descriptionZh : src.description}
                            </p>
                            {isEnabled && state && (
                              <div className="flex items-center gap-2 mt-1">
                                {state.loading && <span className="text-[10px] text-yellow-400 animate-pulse">{t.loading}</span>}
                                {state.error && <span className="text-[10px] text-red-400 truncate">{t.error}: {state.error}</span>}
                                {!state.loading && !state.error && state.lastUpdated && state.count > 0 && (
                                  <span className="text-[10px] text-green-400">{t.count}: {state.count}</span>
                                )}
                                {!state.loading && !state.error && state.lastUpdated && state.count === 0 && (
                                  <span className="text-[10px] text-blue-400">
                                    {lang === 'zh' ? '静态数据' : 'Static data'}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'layers' && (
          <div className="p-3 space-y-4">
            {/* Layer toggles */}
            <div className="space-y-2">
              {[
                { key: 'showVessels',     label: t.vessels,  icon: '🚢', color: '#00aaff' },
                { key: 'showFlights',     label: t.flights,  icon: '✈️', color: '#ffcc44' },
                { key: 'showTradeRoutes', label: t.routes,   icon: '🗺️', color: '#4488ff' },
                { key: 'showPorts',       label: t.ports,    icon: '⚓', color: '#00ffcc' },
              ].map(({ key, label, icon, color }) => (
                <div key={key} className="flex items-center justify-between p-2 bg-[#111] rounded border border-[#333]">
                  <div className="flex items-center gap-2">
                    <span>{icon}</span>
                    <span className="text-sm" style={{ color }}>{label}</span>
                  </div>
                  <button
                    onClick={() => updateConfig({ [key]: !config[key as keyof GlobalTrafficConfig] })}
                    className={`w-10 h-5 rounded-full transition-colors relative ${
                      config[key as keyof GlobalTrafficConfig] ? 'bg-green-600' : 'bg-gray-700'
                    }`}
                  >
                    <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                      config[key as keyof GlobalTrafficConfig] ? 'translate-x-5' : 'translate-x-0.5'
                    }`} />
                  </button>
                </div>
              ))}
            </div>

            {/* Opacity */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-gray-400">
                <span>{t.opacity}</span>
                <span>{Math.round(config.opacity * 100)}%</span>
              </div>
              <input
                type="range" min="0.1" max="1" step="0.05"
                value={config.opacity}
                onChange={e => updateConfig({ opacity: parseFloat(e.target.value) })}
                className="w-full accent-blue-500"
              />
            </div>

            {/* Max flights */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-gray-400">
                <span>{lang === 'zh' ? '最大航班数' : 'Max Flights'}</span>
                <span>{config.maxFlights}</span>
              </div>
              <input
                type="range" min="100" max="3000" step="100"
                value={config.maxFlights}
                onChange={e => updateConfig({ maxFlights: parseInt(e.target.value) })}
                className="w-full accent-yellow-500"
              />
            </div>
          </div>
        )}

        {activeTab === 'stats' && (
          <div className="p-3 space-y-3">
            {/* Summary cards */}
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: t.vessels,  value: totalVessels, icon: '🚢', color: '#00aaff' },
                { label: t.flights,  value: totalFlights, icon: '✈️', color: '#ffcc44' },
                { label: t.routes,   value: DEMO_TRADE_ROUTES.length + DEMO_AIR_ROUTES.length, icon: '🗺️', color: '#4488ff' },
                { label: t.ports,    value: MAJOR_PORTS.length + MAJOR_AIRPORTS.length, icon: '⚓', color: '#00ffcc' },
              ].map(({ label, value, icon, color }) => (
                <div key={label} className="p-3 bg-[#111] rounded border border-[#333] text-center">
                  <div className="text-xl mb-1">{icon}</div>
                  <div className="text-xl font-bold" style={{ color }}>{value.toLocaleString()}</div>
                  <div className="text-[10px] text-gray-500 uppercase tracking-wider">{label}</div>
                </div>
              ))}
            </div>

            {/* Per-source status */}
            <div className="space-y-1">
              <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">
                {lang === 'zh' ? '数据源状态' : 'Source Status'}
              </div>
              {config.enabledSources.length === 0 ? (
                <p className="text-xs text-gray-600 text-center py-4">{t.selectSources}</p>
              ) : (
                config.enabledSources.map(id => {
                  const src = TRAFFIC_DATA_SOURCES.find(s => s.id === id);
                  const state = states[id];
                  return (
                    <div key={id} className="flex items-center justify-between text-xs py-1 border-b border-[#1a1a1a]">
                      <span className="text-gray-300 truncate flex-1">
                        {src ? (lang === 'zh' ? src.nameZh : src.name) : id}
                      </span>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {state?.loading && <span className="text-yellow-400 animate-pulse">●</span>}
                        {state?.error && <span className="text-red-400" title={state.error}>✗</span>}
                        {state && !state.loading && !state.error && (
                          <span className="text-green-400">{state.count}</span>
                        )}
                        {!state && <span className="text-gray-600">—</span>}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Refresh button */}
            <button
              onClick={() => config.enabledSources.forEach(id => refetch(id))}
              className="w-full py-2 text-xs bg-[#1a1a1a] hover:bg-[#222] border border-[#333] rounded transition-colors"
            >
              {t.refresh}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default GlobalTrafficPanel;
