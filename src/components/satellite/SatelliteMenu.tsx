/**
 * SatelliteMenu - 卫星控制菜单
 * 负责：类别切换、搜索、轨道分布统计、刷新
 * 卫星详情由 SatelliteDetailModal 负责
 *
 * 架构层级：UI 组件层 → 卫星控制
 * 主要依赖：useSatelliteStore、SatelliteCategory
 */
'use client';

import { useEffect, useRef, useState } from 'react';
import { useSatelliteStore } from '@/lib/store/useSatelliteStore';
import { OrbitType, SatelliteCategory } from '@/lib/types/satellite';

const C = {
  dark: '#0a0a0a', darkLight: '#141414', border: '#2a2a2a',
  text: '#e8e8e8', dim: '#555555', accent: '#4a9eff',
  leo: '#00aaff', meo: '#00ff88', geo: '#ff6644', heo: '#cc88ff',
};

const CATEGORIES = [
  { id: SatelliteCategory.ACTIVE,        zh: '活跃',   en: 'Active',   icon: '●' },
  { id: SatelliteCategory.ISS,           zh: '空间站', en: 'Stations', icon: '🛸' },
  { id: SatelliteCategory.GPS,           zh: 'GPS',    en: 'GPS',      icon: '📡' },
  { id: SatelliteCategory.COMMUNICATION, zh: '通信',   en: 'Comm',     icon: '📶' },
  { id: SatelliteCategory.WEATHER,       zh: '气象',   en: 'Weather',  icon: '🌤' },
  { id: SatelliteCategory.SCIENCE,       zh: '科学',   en: 'Science',  icon: '🔭' },
];

const ORBIT_TYPES = [
  { id: OrbitType.LEO, label: 'LEO', color: C.leo },
  { id: OrbitType.MEO, label: 'MEO', color: C.meo },
  { id: OrbitType.GEO, label: 'GEO', color: C.geo },
  { id: OrbitType.HEO, label: 'HEO', color: C.heo },
];

interface SatelliteMenuProps { lang?: 'zh' | 'en'; }

/** 卫星菜单组件，提供按类别筛选卫星的下拉菜单 */
export function SatelliteMenu({ lang = 'zh' }: SatelliteMenuProps) {
  const [isOpen, setIsOpen]           = useState(false);
  const [isHovered, setIsHovered]     = useState(false);
  const [localSearch, setLocalSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<SatelliteCategory>(SatelliteCategory.ACTIVE);
  const menuRef   = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const {
    showSatellites, visibleSatellites, satellites, lastUpdate, loading,
    showOrbits, setSearchQuery, setShowSatellites, fetchSatellites, clearAllOrbits,
  } = useSatelliteStore();

  // 搜索防抖
  useEffect(() => {
    const t = setTimeout(() => setSearchQuery(localSearch), 300);
    return () => clearTimeout(t);
  }, [localSearch, setSearchQuery]);

  // 首次挂载自动加载（只触发一次，不依赖 loading）
  useEffect(() => {
    const s = useSatelliteStore.getState();
    if (s.tleData.size === 0 && !s.loading) fetchSatellites();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 点击外部关闭
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (menuRef.current && buttonRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        !buttonRef.current.contains(e.target as Node)) setIsOpen(false);
    };
    if (isOpen) document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [isOpen]);

  // 轨道类型统计
  const orbitCounts = { LEO: 0, MEO: 0, GEO: 0, HEO: 0 };
  satellites.forEach(s => {
    if (s.orbitType in orbitCounts)
      orbitCounts[s.orbitType as keyof typeof orbitCounts]++;
  });

  const fmtUpdate = (d: Date | null) => {
    if (!d) return lang === 'zh' ? '未更新' : 'N/A';
    const m = Math.floor((Date.now() - d.getTime()) / 60000);
    if (m < 1) return lang === 'zh' ? '刚刚' : 'Just now';
    if (m < 60) return `${m}${lang === 'zh' ? '分钟前' : 'm ago'}`;
    return `${Math.floor(m / 60)}${lang === 'zh' ? '小时前' : 'h ago'}`;
  };

  return (
    <div style={{ position: 'relative' }}>
      {/* 触发按钮 */}
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          position: 'relative', display: 'block', width: '11rem', height: '3rem',
          background: C.dark,
          border: `2px solid ${isHovered ? '#ffffff' : '#333333'}`,
          cursor: 'pointer', transition: 'all 0.3s ease', color: C.text,
          clipPath: 'polygon(12px 0,100% 0,100% calc(100% - 12px),calc(100% - 12px) 100%,0 100%,0 12px)',
          boxShadow: isHovered ? '0 0 20px rgba(255,255,255,0.5)' : 'none',
        }}
        aria-label={lang === 'zh' ? '地球卫星' : 'Earth Satellites'}
      >
        <div className="absolute" style={{ top:-1,left:-1,width:12,height:12,background:'#fff',clipPath:'polygon(0 0,100% 0,0 100%)' }} />
        <div className="absolute" style={{ bottom:-1,right:-1,width:12,height:12,background:'#fff',clipPath:'polygon(100% 0,100% 100%,0 100%)' }} />
        <div className="flex items-center justify-center gap-2 h-full px-3">
          <svg fill="none" stroke="#fff" viewBox="0 0 24 24" style={{ width:'1.25rem',height:'1.25rem',flexShrink:0 }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="flex flex-col items-start">
            <span className="text-xs font-bold uppercase tracking-wider leading-tight" style={{ color:'#fff' }}>
              {lang === 'zh' ? '地球卫星' : 'SATELLITES'}
            </span>
            <span className="text-[10px] uppercase tracking-wide leading-tight" style={{ color:'#999' }}>
              {visibleSatellites.size} {lang === 'zh' ? '颗' : 'sats'}
            </span>
          </div>
          <div className="ml-auto" style={{ width:8,height:8,borderRadius:'50%',background:isOpen?'#fff':C.accent,boxShadow:`0 0 8px ${isOpen?'#fff':C.accent}` }} />
        </div>
      </button>

      {/* 控制面板 */}
      {isOpen && (
        <div
          ref={menuRef}
          className="satellite-menu-scrollbar"
          style={{
            position: 'fixed',
            right: 'calc(1.5rem + 11rem + 0.75rem)',
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 1050,
            width: '20rem',
            maxHeight: 'calc(100vh - 6rem)',
            background: C.dark,
            border: `1px solid ${C.border}`,
            clipPath: 'polygon(12px 0,100% 0,100% calc(100% - 12px),calc(100% - 12px) 100%,0 100%,0 12px)',
            animation: 'slideIn 0.3s ease-out',
            overflowY: 'auto', overflowX: 'hidden',
          }}
        >
          <div className="absolute" style={{ top:-1,left:-1,width:12,height:12,background:C.accent,clipPath:'polygon(0 0,100% 0,0 100%)' }} />
          <div className="absolute" style={{ bottom:-1,right:-1,width:12,height:12,background:C.accent,clipPath:'polygon(100% 0,100% 100%,0 100%)' }} />

          {/* 标题 */}
          <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom:`1px solid ${C.border}` }}>
            <div style={{ width:3,height:14,background:C.accent }} />
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color:C.text }}>
              {lang === 'zh' ? '卫星控制' : 'SAT CONTROL'}
            </span>
            <span className="ml-auto text-xs font-mono px-1.5 py-0.5"
              style={{ background:`${C.accent}20`,color:C.accent,border:`1px solid ${C.accent}40` }}>
              {visibleSatellites.size}
            </span>
          </div>

          <div className="p-3 space-y-3">
            {/* 显示开关 */}
            <button onClick={() => setShowSatellites(!showSatellites)}
              className="w-full py-2 text-xs font-bold uppercase tracking-wide transition-all"
              style={{
                background: showSatellites ? '#fff' : C.darkLight,
                color: showSatellites ? C.dark : C.dim,
                border: `1px solid ${showSatellites ? '#fff' : C.border}`,
                clipPath: 'polygon(8px 0,100% 0,100% calc(100% - 8px),calc(100% - 8px) 100%,0 100%,0 8px)',
              }}>
              {showSatellites
                ? (lang === 'zh' ? '隐藏卫星' : 'HIDE SATS')
                : (lang === 'zh' ? '显示卫星' : 'SHOW SATS')}
            </button>

            {/* 搜索 */}
            <input type="text" value={localSearch} onChange={e => setLocalSearch(e.target.value)}
              placeholder={lang === 'zh' ? '搜索名称或NORAD ID...' : 'Name or NORAD ID...'}
              className="w-full px-3 py-2 text-xs font-mono"
              style={{
                background:C.darkLight, color:C.text, border:`1px solid ${C.border}`, outline:'none',
                clipPath:'polygon(6px 0,100% 0,100% calc(100% - 6px),calc(100% - 6px) 100%,0 100%,0 6px)',
              }} />

            {/* 类别选择 */}
            <div>
              <div className="text-xs uppercase tracking-wide mb-1.5" style={{ color:C.dim }}>
                {lang === 'zh' ? '数据类别' : 'CATEGORY'}
              </div>
              <div className="grid grid-cols-3 gap-1">
                {CATEGORIES.map(cat => (
                  <button key={cat.id}
                    onClick={() => { setSelectedCategory(cat.id); fetchSatellites(cat.id); }}
                    className="py-1 text-xs font-bold transition-all"
                    style={{
                      background: selectedCategory === cat.id ? `${C.accent}20` : C.darkLight,
                      color: selectedCategory === cat.id ? C.accent : C.dim,
                      border: `1px solid ${selectedCategory === cat.id ? C.accent : C.border}`,
                    }}>
                    {cat.icon} {lang === 'zh' ? cat.zh : cat.en}
                  </button>
                ))}
              </div>
            </div>

            {/* 轨道分布 */}
            <div>
              <div className="text-xs uppercase tracking-wide mb-1.5" style={{ color:C.dim }}>
                {lang === 'zh' ? '轨道分布' : 'ORBIT DIST'}
              </div>
              <div className="grid grid-cols-4 gap-1">
                {ORBIT_TYPES.map(ot => (
                  <div key={ot.id} className="text-center py-1.5"
                    style={{ background:C.darkLight, border:`1px solid ${C.border}` }}>
                    <div className="text-xs font-bold" style={{ color:ot.color }}>{ot.label}</div>
                    <div className="text-xs font-mono" style={{ color:C.text }}>
                      {orbitCounts[ot.id as keyof typeof orbitCounts]}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 状态 */}
            <div className="p-2.5 space-y-1.5" style={{ background:C.darkLight, border:`1px solid ${C.border}` }}>
              {[
                [lang==='zh'?'总卫星':'TOTAL',    String(satellites.size)],
                [lang==='zh'?'可见':'VISIBLE',    String(visibleSatellites.size)],
                [lang==='zh'?'显示轨道':'ORBITS', String(showOrbits.size)],
                [lang==='zh'?'更新':'UPDATED',    fmtUpdate(lastUpdate)],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between text-xs">
                  <span style={{ color:C.dim }}>{label}</span>
                  <span className="font-mono" style={{ color:C.text }}>{value}</span>
                </div>
              ))}
            </div>

            {/* 操作按钮 */}
            <div className="grid grid-cols-2 gap-1.5">
              <button onClick={() => fetchSatellites(selectedCategory)} disabled={loading}
                className="py-1.5 text-xs font-bold uppercase transition-all"
                style={{
                  background:C.dark, color:loading?C.dim:C.text,
                  border:`1px solid ${loading?C.border:C.accent}`,
                  cursor:loading?'not-allowed':'pointer',
                  clipPath:'polygon(4px 0,100% 0,100% calc(100% - 4px),calc(100% - 4px) 100%,0 100%,0 4px)',
                }}>
                {loading ? (lang==='zh'?'加载中':'LOADING') : (lang==='zh'?'刷新':'REFRESH')}
              </button>
              <button onClick={clearAllOrbits} disabled={showOrbits.size===0}
                className="py-1.5 text-xs font-bold uppercase transition-all"
                style={{
                  background:C.darkLight, color:showOrbits.size>0?C.text:C.dim,
                  border:`1px solid ${C.border}`,
                  cursor:showOrbits.size>0?'pointer':'not-allowed',
                  clipPath:'polygon(4px 0,100% 0,100% calc(100% - 4px),calc(100% - 4px) 100%,0 100%,0 4px)',
                }}>
                {lang==='zh'?'清除轨道':'CLR ORBITS'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
