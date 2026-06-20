/**
 * SatelliteEnhancedControls - 增强版卫星控制面板
 *
 * 提供类别筛选、轨道类型筛选、搜索和数据刷新功能
 */

'use client';

import { useEffect, useState } from 'react';
import { useSatelliteStore } from '@/lib/store/useSatelliteStore';
import { SatelliteCategory, OrbitType } from '@/lib/types/satellite';

const C = {
  dark: '#0a0a0a',
  darkLight: '#141414',
  border: '#2a2a2a',
  text: '#e8e8e8',
  dim: '#555555',
  accent: '#4a9eff',
  leo: '#00aaff',
  meo: '#00ff88',
  geo: '#ff6644',
  heo: '#cc88ff',
};

const CATEGORIES: { id: SatelliteCategory; labelZh: string; labelEn: string; icon: string }[] = [
  { id: SatelliteCategory.ACTIVE, labelZh: '活跃', labelEn: 'Active', icon: '●' },
  { id: SatelliteCategory.ISS, labelZh: '空间站', labelEn: 'Stations', icon: '🛸' },
  { id: SatelliteCategory.GPS, labelZh: 'GPS', labelEn: 'GPS', icon: '📡' },
  { id: SatelliteCategory.COMMUNICATION, labelZh: '通信', labelEn: 'Comm', icon: '📶' },
  { id: SatelliteCategory.WEATHER, labelZh: '气象', labelEn: 'Weather', icon: '🌤' },
  { id: SatelliteCategory.SCIENCE, labelZh: '科学', labelEn: 'Science', icon: '🔭' },
];

const ORBIT_TYPES: { id: OrbitType; label: string; color: string }[] = [
  { id: OrbitType.LEO, label: 'LEO', color: C.leo },
  { id: OrbitType.MEO, label: 'MEO', color: C.meo },
  { id: OrbitType.GEO, label: 'GEO', color: C.geo },
  { id: OrbitType.HEO, label: 'HEO', color: C.heo },
];

interface SatelliteEnhancedControlsProps {
  lang?: 'zh' | 'en';
}

export function SatelliteEnhancedControls({ lang = 'zh' }: SatelliteEnhancedControlsProps) {
  const {
    searchQuery,
    showSatellites,
    visibleSatellites,
    satellites,
    lastUpdate,
    loading,
    setSearchQuery,
    setShowSatellites,
    fetchSatellites,
    clearAllOrbits,
    showOrbits,
  } = useSatelliteStore();

  const [localSearch, setLocalSearch] = useState(searchQuery);
  const [selectedCategory, setSelectedCategory] = useState<SatelliteCategory>(SatelliteCategory.ACTIVE);
  const [selectedOrbitTypes, setSelectedOrbitTypes] = useState<Set<OrbitType>>(new Set());
  const [collapsed, setCollapsed] = useState(false);

  // 搜索防抖
  useEffect(() => {
    const t = setTimeout(() => setSearchQuery(localSearch), 300);
    return () => clearTimeout(t);
  }, [localSearch, setSearchQuery]);

  // 切换轨道类型筛选
  const toggleOrbitType = (type: OrbitType) => {
    setSelectedOrbitTypes(prev => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };

  // 加载指定类别
  const loadCategory = (cat: SatelliteCategory) => {
    setSelectedCategory(cat);
    fetchSatellites(cat);
  };

  // 统计各轨道类型数量
  const orbitCounts = { LEO: 0, MEO: 0, GEO: 0, HEO: 0 };
  satellites.forEach(sat => {
    if (sat.orbitType in orbitCounts) {
      orbitCounts[sat.orbitType as keyof typeof orbitCounts]++;
    }
  });

  const formatTime = (date: Date | null) => {
    if (!date) return lang === 'zh' ? '未更新' : 'N/A';
    const diff = Date.now() - date.getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return lang === 'zh' ? '刚刚' : 'Just now';
    if (m < 60) return lang === 'zh' ? `${m}分钟前` : `${m}m ago`;
    return lang === 'zh' ? `${Math.floor(m / 60)}小时前` : `${Math.floor(m / 60)}h ago`;
  };

  return (
    <div
      className="fixed z-40"
      style={{
        top: '5rem',
        left: '1rem',
        width: '18rem',
        background: C.dark,
        border: `1px solid ${C.border}`,
        clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)',
      }}
    >
      {/* 角装饰 */}
      <div className="absolute" style={{ top: -1, left: -1, width: 10, height: 10, background: C.accent, clipPath: 'polygon(0 0, 100% 0, 0 100%)' }} />
      <div className="absolute" style={{ bottom: -1, right: -1, width: 10, height: 10, background: C.accent, clipPath: 'polygon(100% 0, 100% 100%, 0 100%)' }} />

      {/* 标题栏 */}
      <div
        className="flex items-center justify-between px-3 py-2.5 cursor-pointer"
        style={{ borderBottom: `1px solid ${C.border}` }}
        onClick={() => setCollapsed(!collapsed)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setCollapsed(!collapsed); } }}
      >
        <div className="flex items-center gap-2">
          <div style={{ width: 3, height: 12, background: C.accent }} />
          <span className="text-xs font-bold uppercase tracking-wider" style={{ color: C.text }}>
            {lang === 'zh' ? '卫星追踪' : 'SAT TRACK'}
          </span>
          <span
            className="text-xs font-mono px-1.5 py-0.5"
            style={{ background: `${C.accent}20`, color: C.accent, border: `1px solid ${C.accent}40` }}
          >
            {visibleSatellites.size}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={e => { e.stopPropagation(); setShowSatellites(!showSatellites); }}
            className="text-xs px-2 py-0.5 font-bold uppercase"
            style={{
              background: showSatellites ? `${C.accent}20` : 'transparent',
              color: showSatellites ? C.accent : C.dim,
              border: `1px solid ${showSatellites ? C.accent : C.border}`,
            }}
          >
            {showSatellites ? (lang === 'zh' ? '显示' : 'ON') : (lang === 'zh' ? '隐藏' : 'OFF')}
          </button>
          <span style={{ color: C.dim, fontSize: 10 }}>{collapsed ? '▼' : '▲'}</span>
        </div>
      </div>

      {!collapsed && (
        <div className="p-3 space-y-3">
          {/* 搜索 */}
          <div>
            <input
              type="text"
              value={localSearch}
              onChange={e => setLocalSearch(e.target.value)}
              placeholder={lang === 'zh' ? '搜索名称或NORAD ID...' : 'Search name or NORAD ID...'}
              aria-label={lang === 'zh' ? '搜索卫星' : 'Search satellites'}
              className="w-full px-2.5 py-1.5 text-xs font-mono"
              style={{
                background: C.darkLight,
                color: C.text,
                border: `1px solid ${C.border}`,
                clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)',
              }}
            />
          </div>

          {/* 类别选择 */}
          <div>
            <div className="text-xs uppercase tracking-wide mb-1.5" style={{ color: C.dim }}>
              {lang === 'zh' ? '数据类别' : 'CATEGORY'}
            </div>
            <div className="grid grid-cols-3 gap-1">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => loadCategory(cat.id)}
                  className="py-1 text-xs font-bold transition-all"
                  style={{
                    background: selectedCategory === cat.id ? `${C.accent}20` : C.darkLight,
                    color: selectedCategory === cat.id ? C.accent : C.dim,
                    border: `1px solid ${selectedCategory === cat.id ? C.accent : C.border}`,
                  }}
                >
                  <span className="mr-0.5">{cat.icon}</span>
                  {lang === 'zh' ? cat.labelZh : cat.labelEn}
                </button>
              ))}
            </div>
          </div>

          {/* 轨道类型筛选 */}
          <div>
            <div className="text-xs uppercase tracking-wide mb-1.5" style={{ color: C.dim }}>
              {lang === 'zh' ? '轨道类型' : 'ORBIT TYPE'}
            </div>
            <div className="grid grid-cols-4 gap-1">
              {ORBIT_TYPES.map(ot => {
                const count = orbitCounts[ot.id as keyof typeof orbitCounts];
                const active = selectedOrbitTypes.has(ot.id);
                return (
                  <button
                    key={ot.id}
                    onClick={() => toggleOrbitType(ot.id)}
                    className="py-1 text-xs font-bold transition-all"
                    style={{
                      background: active ? `${ot.color}20` : C.darkLight,
                      color: active ? ot.color : C.dim,
                      border: `1px solid ${active ? ot.color : C.border}`,
                    }}
                    title={`${count} satellites`}
                  >
                    {ot.label}
                  </button>
                );
              })}
            </div>
            {/* 轨道类型统计 */}
            <div className="grid grid-cols-4 gap-1 mt-1">
              {ORBIT_TYPES.map(ot => (
                <div key={ot.id} className="text-center">
                  <span className="text-xs font-mono" style={{ color: ot.color }}>
                    {orbitCounts[ot.id as keyof typeof orbitCounts]}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 数据状态 */}
          <div
            className="p-2 space-y-1.5"
            style={{ background: C.darkLight, border: `1px solid ${C.border}` }}
          >
            <div className="flex justify-between text-xs">
              <span style={{ color: C.dim }}>{lang === 'zh' ? '总卫星数' : 'TOTAL'}</span>
              <span className="font-mono" style={{ color: C.text }}>{satellites.size}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span style={{ color: C.dim }}>{lang === 'zh' ? '可见' : 'VISIBLE'}</span>
              <span className="font-mono" style={{ color: C.accent }}>{visibleSatellites.size}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span style={{ color: C.dim }}>{lang === 'zh' ? '显示轨道' : 'ORBITS'}</span>
              <span className="font-mono" style={{ color: C.text }}>{showOrbits.size}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span style={{ color: C.dim }}>{lang === 'zh' ? '更新时间' : 'UPDATED'}</span>
              <span className="font-mono" style={{ color: C.dim }}>{formatTime(lastUpdate)}</span>
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={() => fetchSatellites(selectedCategory)}
              disabled={loading}
              className="py-1.5 text-xs font-bold uppercase tracking-wide transition-all"
              style={{
                background: loading ? C.darkLight : C.dark,
                color: loading ? C.dim : C.text,
                border: `1px solid ${loading ? C.border : C.accent}`,
                clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)',
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? (lang === 'zh' ? '加载中' : 'LOADING') : (lang === 'zh' ? '刷新' : 'REFRESH')}
            </button>
            <button
              onClick={clearAllOrbits}
              disabled={showOrbits.size === 0}
              className="py-1.5 text-xs font-bold uppercase tracking-wide transition-all"
              style={{
                background: C.darkLight,
                color: showOrbits.size > 0 ? C.text : C.dim,
                border: `1px solid ${C.border}`,
                clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)',
                cursor: showOrbits.size > 0 ? 'pointer' : 'not-allowed',
              }}
            >
              {lang === 'zh' ? '清除轨道' : 'CLR ORBITS'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
