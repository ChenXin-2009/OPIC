/**
 * SatelliteWindow.tsx - macOS 风格卫星追踪窗口
 * 
 * 重新实现卫星追踪功能,采用 macOS 风格设计
 */

'use client';

import { useEffect, useState } from 'react';
import { useSatelliteStore } from '@/lib/store/useSatelliteStore';
import { SatelliteCategory, OrbitType } from '@/lib/types/satellite';

interface SatelliteWindowProps {
  lang?: 'zh' | 'en';
}

const CATEGORIES = [
  { id: SatelliteCategory.ACTIVE, zh: '活跃卫星', en: 'Active', icon: '●' },
  { id: SatelliteCategory.ISS, zh: '空间站', en: 'Stations', icon: '🛸' },
  { id: SatelliteCategory.GPS, zh: 'GPS', en: 'GPS', icon: '📡' },
  { id: SatelliteCategory.COMMUNICATION, zh: '通信', en: 'Communication', icon: '📶' },
  { id: SatelliteCategory.WEATHER, zh: '气象', en: 'Weather', icon: '🌤' },
  { id: SatelliteCategory.SCIENCE, zh: '科学', en: 'Science', icon: '🔭' },
];

const ORBIT_COLORS = {
  [OrbitType.LEO]: '#00aaff',
  [OrbitType.MEO]: '#00ff88',
  [OrbitType.GEO]: '#ff6644',
  [OrbitType.HEO]: '#cc88ff',
};

export function SatelliteWindow({ lang = 'zh' }: SatelliteWindowProps) {
  const [localSearch, setLocalSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<SatelliteCategory>(SatelliteCategory.ACTIVE);

  const {
    showSatellites,
    visibleSatellites,
    satellites,
    lastUpdate,
    loading,
    setSearchQuery,
    setShowSatellites,
    fetchSatellites,
  } = useSatelliteStore();

  // 搜索防抖
  useEffect(() => {
    const timer = setTimeout(() => setSearchQuery(localSearch), 300);
    return () => clearTimeout(timer);
  }, [localSearch, setSearchQuery]);

  // 首次加载
  useEffect(() => {
    const state = useSatelliteStore.getState();
    if (state.tleData.size === 0 && !state.loading) {
      fetchSatellites();
    }
  }, [fetchSatellites]);

  // 轨道类型统计
  const orbitCounts = { LEO: 0, MEO: 0, GEO: 0, HEO: 0 };
  const satellitesArray = Array.from(satellites.values());
  satellitesArray.forEach(s => {
    if (s.orbitType in orbitCounts) {
      orbitCounts[s.orbitType as keyof typeof orbitCounts]++;
    }
  });

  const formatUpdate = (date: Date | null) => {
    if (!date) return lang === 'zh' ? '未更新' : 'N/A';
    const minutes = Math.floor((Date.now() - date.getTime()) / 60000);
    if (minutes < 1) return lang === 'zh' ? '刚刚' : 'Just now';
    if (minutes < 60) return `${minutes}${lang === 'zh' ? '分钟前' : 'm ago'}`;
    return `${Math.floor(minutes / 60)}${lang === 'zh' ? '小时前' : 'h ago'}`;
  };

  return (
    <div className="h-full flex flex-col bg-white/5">
      {/* 顶部控制栏 */}
      <div className="p-4 border-b border-white/10">
        {/* 搜索框 */}
        <div className="mb-4">
          <input
            type="text"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder={lang === 'zh' ? '搜索卫星...' : 'Search satellites...'}
            className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* 类别选择 */}
        <div className="flex flex-wrap gap-2 mb-4">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                selectedCategory === cat.id
                  ? 'bg-blue-500 text-white shadow-lg'
                  : 'bg-white/10 text-white/70 hover:bg-white/20'
              }`}
            >
              <span className="mr-1">{cat.icon}</span>
              {lang === 'zh' ? cat.zh : cat.en}
            </button>
          ))}
        </div>

        {/* 显示控制 */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowSatellites(!showSatellites)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              showSatellites
                ? 'bg-green-500 text-white'
                : 'bg-white/10 text-white/70 hover:bg-white/20'
            }`}
          >
            {showSatellites
              ? (lang === 'zh' ? '✓ 显示卫星' : '✓ Show Satellites')
              : (lang === 'zh' ? '显示卫星' : 'Show Satellites')}
          </button>

          <button
            onClick={() => fetchSatellites()}
            disabled={loading}
            className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg text-sm font-medium transition-all disabled:opacity-50"
          >
            {loading ? '⟳' : '🔄'} {lang === 'zh' ? '刷新' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* 统计信息 */}
      <div className="p-4 border-b border-white/10">
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-white/5 rounded-lg">
            <div className="text-xs text-white/60 mb-1">
              {lang === 'zh' ? '可见卫星' : 'Visible'}
            </div>
            <div className="text-2xl font-bold text-white">{visibleSatellites.size}</div>
          </div>
          <div className="p-3 bg-white/5 rounded-lg">
            <div className="text-xs text-white/60 mb-1">
              {lang === 'zh' ? '总数' : 'Total'}
            </div>
            <div className="text-2xl font-bold text-white">{satellitesArray.length}</div>
          </div>
        </div>

        {/* 轨道类型分布 */}
        <div className="mt-3 grid grid-cols-4 gap-2">
          {(Object.entries(orbitCounts) as [OrbitType, number][]).map(([type, count]) => (
            <div key={type} className="p-2 bg-white/5 rounded-lg text-center">
              <div
                className="text-xs font-medium mb-1"
                style={{ color: ORBIT_COLORS[type] }}
              >
                {type}
              </div>
              <div className="text-sm font-bold text-white">{count}</div>
            </div>
          ))}
        </div>

        {/* 更新时间 */}
        <div className="mt-3 text-xs text-white/40 text-center">
          {lang === 'zh' ? '更新于' : 'Updated'}: {formatUpdate(lastUpdate)}
        </div>
      </div>

      {/* 卫星列表 */}
      <div className="flex-1 overflow-auto p-4">
        {loading ? (
          <div className="text-center text-white/60 py-8">
            {lang === 'zh' ? '加载中...' : 'Loading...'}
          </div>
        ) : satellitesArray.length === 0 ? (
          <div className="text-center text-white/60 py-8">
            {lang === 'zh' ? '暂无卫星数据' : 'No satellite data'}
          </div>
        ) : (
          <div className="space-y-2">
            {satellitesArray.slice(0, 50).map((sat) => (
              <div
                key={sat.noradId}
                className="p-3 bg-white/5 hover:bg-white/10 rounded-lg transition-all cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="font-medium text-white">{sat.name}</div>
                    <div className="text-xs text-white/60 mt-1">
                      ID: {sat.noradId} • {sat.category}
                    </div>
                  </div>
                  <div
                    className="px-2 py-1 rounded text-xs font-medium"
                    style={{
                      backgroundColor: `${ORBIT_COLORS[sat.orbitType]}20`,
                      color: ORBIT_COLORS[sat.orbitType],
                    }}
                  >
                    {sat.orbitType}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

