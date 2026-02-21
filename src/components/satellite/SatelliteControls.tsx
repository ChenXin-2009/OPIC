/**
 * SatelliteControls - 卫星控制面板（明日方舟风格）
 * 
 * 提供卫星筛选、搜索和可见性控制功能
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSatelliteStore } from '@/lib/store/useSatelliteStore';
import { SatelliteCategory } from '@/lib/types/satellite';

// 明日方舟风格配置
const ARKNIGHTS_CONFIG = {
  colors: {
    primary: '#ffffff',
    secondary: '#e0e0e0',
    accent: '#f0f0f0',
    dark: '#0a0a0a',
    darkLight: '#1a1a1a',
    border: '#333333',
    text: '#ffffff',
    textDim: '#999999',
  },
};

// 类别选项配置
const CATEGORY_OPTIONS = [
  { value: SatelliteCategory.ACTIVE, label: { zh: '活跃卫星', en: 'Active' } },
  { value: SatelliteCategory.ISS, label: { zh: '空间站', en: 'ISS' } },
  { value: SatelliteCategory.GPS, label: { zh: 'GPS', en: 'GPS' } },
  { value: SatelliteCategory.COMMUNICATION, label: { zh: '通信', en: 'Comm' } },
  { value: SatelliteCategory.WEATHER, label: { zh: '气象', en: 'Weather' } },
  { value: SatelliteCategory.SCIENCE, label: { zh: '科学', en: 'Science' } },
];

interface SatelliteControlsProps {
  lang?: 'zh' | 'en';
}

export function SatelliteControls({ lang = 'zh' }: SatelliteControlsProps) {
  const {
    selectedCategories,
    searchQuery,
    showSatellites,
    visibleSatellites,
    lastUpdate,
    loading,
    setSelectedCategories,
    setSearchQuery,
    setShowSatellites,
    fetchSatellites,
  } = useSatelliteStore();

  const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery);

  // 搜索防抖 (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(localSearchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [localSearchQuery, setSearchQuery]);

  // 切换类别选择
  const toggleCategory = useCallback((category: SatelliteCategory) => {
    const newCategories = new Set(selectedCategories);
    if (newCategories.has(category)) {
      // 至少保留一个类别
      if (newCategories.size > 1) {
        newCategories.delete(category);
      }
    } else {
      newCategories.add(category);
    }
    setSelectedCategories(newCategories);
  }, [selectedCategories, setSelectedCategories]);

  // 格式化更新时间
  const formatUpdateTime = (date: Date | null) => {
    if (!date) return lang === 'zh' ? '未更新' : 'Not updated';
    
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return lang === 'zh' ? '刚刚' : 'Just now';
    if (minutes < 60) return lang === 'zh' ? `${minutes}分钟前` : `${minutes}m ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return lang === 'zh' ? `${hours}小时前` : `${hours}h ago`;
    
    const days = Math.floor(hours / 24);
    return lang === 'zh' ? `${days}天前` : `${days}d ago`;
  };

  return (
    <div
      className="fixed z-40"
      style={{
        top: '5rem',
        left: '1rem',
        width: '20rem',
        background: ARKNIGHTS_CONFIG.colors.dark,
        border: `2px solid ${ARKNIGHTS_CONFIG.colors.border}`,
        clipPath: 'polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)',
      }}
    >
      {/* 左上角装饰 */}
      <div
        className="absolute"
        style={{
          top: '-1px',
          left: '-1px',
          width: '12px',
          height: '12px',
          background: ARKNIGHTS_CONFIG.colors.primary,
          clipPath: 'polygon(0 0, 100% 0, 0 100%)',
        }}
      />

      {/* 右下角装饰 */}
      <div
        className="absolute"
        style={{
          bottom: '-1px',
          right: '-1px',
          width: '12px',
          height: '12px',
          background: ARKNIGHTS_CONFIG.colors.primary,
          clipPath: 'polygon(100% 0, 100% 100%, 0 100%)',
        }}
      />

      <div className="p-4">
        {/* 标题 */}
        <div
          className="flex items-center gap-2 pb-3 mb-4"
          style={{
            borderBottom: `1px solid ${ARKNIGHTS_CONFIG.colors.border}`,
          }}
        >
          <div
            style={{
              width: '4px',
              height: '16px',
              background: ARKNIGHTS_CONFIG.colors.primary,
            }}
          />
          <span
            className="text-xs font-bold uppercase tracking-wider"
            style={{ color: ARKNIGHTS_CONFIG.colors.text }}
          >
            {lang === 'zh' ? '卫星控制' : 'SATELLITE CONTROL'}
          </span>
        </div>

        {/* 可见性开关 */}
        <div className="mb-4">
          <button
            onClick={() => setShowSatellites(!showSatellites)}
            className="w-full py-2 text-xs font-bold uppercase tracking-wide transition-all duration-200"
            style={{
              background: showSatellites
                ? ARKNIGHTS_CONFIG.colors.primary
                : ARKNIGHTS_CONFIG.colors.darkLight,
              color: showSatellites
                ? ARKNIGHTS_CONFIG.colors.dark
                : ARKNIGHTS_CONFIG.colors.textDim,
              border: `1px solid ${
                showSatellites
                  ? ARKNIGHTS_CONFIG.colors.primary
                  : ARKNIGHTS_CONFIG.colors.border
              }`,
              clipPath:
                'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)',
            }}
          >
            {showSatellites
              ? lang === 'zh'
                ? '显示卫星'
                : 'SHOW SATELLITES'
              : lang === 'zh'
              ? '隐藏卫星'
              : 'HIDE SATELLITES'}
          </button>
        </div>

        {/* 搜索栏 */}
        <div className="mb-4">
          <label
            className="text-xs uppercase tracking-wide block mb-2"
            style={{ color: ARKNIGHTS_CONFIG.colors.textDim }}
          >
            {lang === 'zh' ? '搜索' : 'SEARCH'}
          </label>
          <input
            type="text"
            value={localSearchQuery}
            onChange={(e) => setLocalSearchQuery(e.target.value)}
            placeholder={
              lang === 'zh' ? '名称或NORAD ID...' : 'Name or NORAD ID...'
            }
            className="w-full px-3 py-2 text-xs font-mono"
            style={{
              background: ARKNIGHTS_CONFIG.colors.darkLight,
              color: ARKNIGHTS_CONFIG.colors.text,
              border: `1px solid ${ARKNIGHTS_CONFIG.colors.border}`,
              clipPath:
                'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)',
              outline: 'none',
            }}
          />
        </div>

        {/* 类别筛选 */}
        <div className="mb-4">
          <label
            className="text-xs uppercase tracking-wide block mb-2"
            style={{ color: ARKNIGHTS_CONFIG.colors.textDim }}
          >
            {lang === 'zh' ? '类别' : 'CATEGORIES'}
          </label>
          <div className="grid grid-cols-2 gap-2">
            {CATEGORY_OPTIONS.map((option) => {
              const isSelected = selectedCategories.has(option.value);
              return (
                <button
                  key={option.value}
                  onClick={() => toggleCategory(option.value)}
                  className="py-1.5 text-xs font-bold uppercase tracking-wide transition-all duration-200"
                  style={{
                    background: isSelected
                      ? ARKNIGHTS_CONFIG.colors.primary
                      : ARKNIGHTS_CONFIG.colors.darkLight,
                    color: isSelected
                      ? ARKNIGHTS_CONFIG.colors.dark
                      : ARKNIGHTS_CONFIG.colors.textDim,
                    border: `1px solid ${
                      isSelected
                        ? ARKNIGHTS_CONFIG.colors.primary
                        : ARKNIGHTS_CONFIG.colors.border
                    }`,
                    clipPath:
                      'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)',
                  }}
                >
                  {option.label[lang]}
                </button>
              );
            })}
          </div>
        </div>

        {/* 数据状态 */}
        <div
          className="p-3"
          style={{
            background: ARKNIGHTS_CONFIG.colors.darkLight,
            border: `1px solid ${ARKNIGHTS_CONFIG.colors.border}`,
            clipPath:
              'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)',
          }}
        >
          <div className="flex justify-between items-center mb-2">
            <span
              className="text-xs uppercase tracking-wide"
              style={{ color: ARKNIGHTS_CONFIG.colors.textDim }}
            >
              {lang === 'zh' ? '可见卫星' : 'VISIBLE'}
            </span>
            <span
              className="text-sm font-bold font-mono"
              style={{ color: ARKNIGHTS_CONFIG.colors.primary }}
            >
              {visibleSatellites.size}
            </span>
          </div>

          <div className="flex justify-between items-center mb-3">
            <span
              className="text-xs uppercase tracking-wide"
              style={{ color: ARKNIGHTS_CONFIG.colors.textDim }}
            >
              {lang === 'zh' ? '更新时间' : 'UPDATED'}
            </span>
            <span
              className="text-xs font-mono"
              style={{ color: ARKNIGHTS_CONFIG.colors.secondary }}
            >
              {formatUpdateTime(lastUpdate)}
            </span>
          </div>

          <button
            onClick={() => fetchSatellites()}
            disabled={loading}
            className="w-full py-2 text-xs font-bold uppercase tracking-wide transition-all duration-200"
            style={{
              background: loading
                ? ARKNIGHTS_CONFIG.colors.darkLight
                : ARKNIGHTS_CONFIG.colors.dark,
              color: loading
                ? ARKNIGHTS_CONFIG.colors.textDim
                : ARKNIGHTS_CONFIG.colors.text,
              border: `1px solid ${ARKNIGHTS_CONFIG.colors.border}`,
              clipPath:
                'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading
              ? lang === 'zh'
                ? '刷新中...'
                : 'REFRESHING...'
              : lang === 'zh'
              ? '刷新数据'
              : 'REFRESH DATA'}
          </button>
        </div>
      </div>
    </div>
  );
}
