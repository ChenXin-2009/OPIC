/**
 * SuggestionList.tsx - 天体搜索建议列表（明日方舟风格）
 * 
 * 功能：
 * - 显示搜索建议列表
 * - 明日方舟风格列表项设计
 * - 悬停高亮效果
 * - 选中状态显示
 * - 类型标签颜色编码
 * - 距离信息显示
 * - 完整的无障碍支持
 * 
 * 需求：3.7, 9.2
 */

'use client';

import { useEffect, useRef, memo } from 'react';
import type { CelestialType } from '@/lib/search/SearchIndex';
import type { UniverseScale } from '@/lib/types/universeTypes';
import * as THREE from 'three';

// ==================== 明日方舟风格配置 ====================

const ARKNIGHTS_COLORS = {
  primary: '#ffffff',      // 白色主色
  secondary: '#e0e0e0',    // 浅灰
  accent: '#f0f0f0',       // 亮白
  dark: '#0a0a0a',         // 纯黑背景
  darkLight: '#1a1a1a',    // 深灰
  border: '#333333',       // 边框灰
  text: '#ffffff',         // 白色文字
  textDim: '#999999',      // 暗淡文字
};

/**
 * 天体类型颜色映射
 * 用于类型标签的颜色编码
 */
const CELESTIAL_TYPE_COLORS: Record<CelestialType, string> = {
  sun: '#ffaa00',
  planet: '#4488ff',
  satellite: '#88ccff',
  galaxy: '#88ccff',
  group: '#ffaa88',
  cluster: '#ffcc66',
  supercluster: '#ff88cc',
};

/**
 * 天体类型显示名称（中英文）
 */
const CELESTIAL_TYPE_NAMES: Record<CelestialType, { zh: string; en: string }> = {
  sun: { zh: '恒星', en: 'Star' },
  planet: { zh: '行星', en: 'Planet' },
  satellite: { zh: '卫星', en: 'Satellite' },
  galaxy: { zh: '星系', en: 'Galaxy' },
  group: { zh: '星系群', en: 'Group' },
  cluster: { zh: '星系团', en: 'Cluster' },
  supercluster: { zh: '超星系团', en: 'Supercluster' },
};

// ==================== 接口定义 ====================

/**
 * 搜索结果接口
 */
export interface SearchResult {
  /** 唯一标识符 */
  id: string;
  /** 天体名称（当前语言） */
  name: string;
  /** 英文名称 */
  nameEn: string;
  /** 中文名称 */
  nameZh: string;
  /** 天体类型 */
  type: CelestialType;
  /** 宇宙尺度 */
  scale: UniverseScale;
  /** 3D 位置 */
  position: THREE.Vector3;
  /** 距离（AU 或 Mpc，可选） */
  distance?: number;
  /** 相关性评分（用于排序） */
  relevance: number;
}

/**
 * SuggestionList 组件属性
 */
export interface SuggestionListProps {
  /** 搜索建议列表 */
  suggestions: SearchResult[];
  /** 当前选中的建议索引 */
  selectedIndex: number;
  /** 选择建议回调 */
  onSelect: (result: SearchResult) => void;
  /** 悬停建议回调 */
  onHover: (index: number) => void;
  /** 当前语言 */
  lang?: 'zh' | 'en';
}

// ==================== SuggestionList 组件 ====================

/**
 * SuggestionList - 天体搜索建议列表
 * 
 * 采用明日方舟风格设计：
 * - 黑色背景 (#0a0a0a)
 * - 白色边框 (#333333)
 * - 菱形切角（clip-path）
 * - 悬停时高亮效果
 * - 类型标签颜色编码
 * - 平滑滚动动画
 * 
 * 无障碍支持：
 * - role="listbox" 语义化
 * - aria-activedescendant 指示当前选中项
 * - 键盘导航支持
 */
const SuggestionList = memo(function SuggestionList({
  suggestions,
  selectedIndex,
  onSelect,
  onHover,
  lang = 'zh',
}: SuggestionListProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const selectedItemRef = useRef<HTMLDivElement>(null);
  const isScrollingRef = useRef<boolean>(false);

  // 当选中项变化时，滚动到可见区域
  useEffect(() => {
    // 防止在滚动过程中重复触发
    if (isScrollingRef.current) {
      return;
    }

    if (selectedItemRef.current && listRef.current) {
      const listRect = listRef.current.getBoundingClientRect();
      const itemRect = selectedItemRef.current.getBoundingClientRect();

      // 如果选中项不在可见区域内，滚动到可见位置
      if (itemRect.top < listRect.top || itemRect.bottom > listRect.bottom) {
        isScrollingRef.current = true;
        
        selectedItemRef.current.scrollIntoView({ 
          block: 'nearest', 
          behavior: 'smooth' 
        });

        // 滚动完成后重置标志（平滑滚动大约需要 300ms）
        setTimeout(() => {
          isScrollingRef.current = false;
        }, 350);
      }
    }
  }, [selectedIndex]);

  // 如果没有建议，显示空状态提示
  if (suggestions.length === 0) {
    return (
      <div
        className="w-full max-w-2xl mx-auto mt-2"
        style={{
          background: ARKNIGHTS_COLORS.dark,
          border: `2px solid ${ARKNIGHTS_COLORS.border}`,
          clipPath: 'polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)',
          padding: '2rem',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            color: ARKNIGHTS_COLORS.textDim,
            fontSize: '14px',
          }}
        >
          {lang === 'zh' ? '未找到匹配的天体' : 'No matching celestial objects found'}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={listRef}
      role="listbox"
      aria-activedescendant={selectedIndex >= 0 ? `suggestion-${selectedIndex}` : undefined}
      className="w-full max-w-2xl mx-auto mt-2 overflow-y-auto"
      style={{
        maxHeight: window.innerWidth <= 768 ? '300px' : '400px', // 移动端降低高度
        background: ARKNIGHTS_COLORS.dark,
        border: `2px solid ${ARKNIGHTS_COLORS.border}`,
        clipPath: 'polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)',
        animation: 'fadeIn 0.3s ease-out',
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
          background: ARKNIGHTS_COLORS.border,
          clipPath: 'polygon(0 0, 100% 0, 0 100%)',
        }}
        aria-hidden="true"
      />

      {/* 右下角装饰 */}
      <div
        className="absolute"
        style={{
          bottom: '-1px',
          right: '-1px',
          width: '12px',
          height: '12px',
          background: ARKNIGHTS_COLORS.border,
          clipPath: 'polygon(100% 0, 100% 100%, 0 100%)',
        }}
        aria-hidden="true"
      />

      {/* 建议列表 */}
      <div className="relative">
        {suggestions.map((suggestion, index) => {
          const isSelected = index === selectedIndex;
          const typeColor = CELESTIAL_TYPE_COLORS[suggestion.type];
          const typeName = CELESTIAL_TYPE_NAMES[suggestion.type];

          return (
            <div
              key={suggestion.id}
              id={`suggestion-${index}`}
              ref={isSelected ? selectedItemRef : null}
              role="option"
              aria-selected={isSelected}
              onClick={() => onSelect(suggestion)}
              onMouseEnter={() => onHover(index)}
              className="relative cursor-pointer transition-all duration-200"
              style={{
                padding: window.innerWidth <= 768 ? '0.5rem 0.75rem' : '0.75rem 1rem', // 移动端减小内边距
                background: isSelected ? ARKNIGHTS_COLORS.darkLight : 'transparent',
                borderLeft: isSelected ? `3px solid ${ARKNIGHTS_COLORS.primary}` : '3px solid transparent',
                borderBottom: `1px solid ${ARKNIGHTS_COLORS.border}`,
              }}
            >
              {/* 天体名称和类型 */}
              <div className="flex items-center justify-between gap-3">
                {/* 左侧：名称 */}
                <div className="flex-1 min-w-0">
                  <div
                    className="text-sm font-medium truncate"
                    style={{
                      color: isSelected ? ARKNIGHTS_COLORS.primary : ARKNIGHTS_COLORS.text,
                    }}
                  >
                    {suggestion.name}
                  </div>
                  {/* 如果中英文名称不同，显示另一种语言的名称 */}
                  {suggestion.nameEn !== suggestion.nameZh && (
                    <div
                      className="text-xs truncate mt-0.5"
                      style={{
                        color: ARKNIGHTS_COLORS.textDim,
                      }}
                    >
                      {lang === 'zh' ? suggestion.nameEn : suggestion.nameZh}
                    </div>
                  )}
                </div>

                {/* 右侧：类型标签和距离 */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {/* 距离信息（如果有） */}
                  {suggestion.distance !== undefined && (
                    <div
                      className="text-xs font-mono"
                      style={{
                        color: ARKNIGHTS_COLORS.textDim,
                      }}
                    >
                      {formatDistance(suggestion.distance, suggestion.scale)}
                    </div>
                  )}

                  {/* 类型标签 */}
                  <div
                    className="px-2 py-0.5 text-xs font-bold uppercase tracking-wide"
                    style={{
                      background: `${typeColor}20`,
                      color: typeColor,
                      border: `1px solid ${typeColor}`,
                      clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)',
                    }}
                  >
                    {lang === 'zh' ? typeName.zh : typeName.en}
                  </div>
                </div>
              </div>

              {/* 选中指示器（右侧箭头） */}
              {isSelected && (
                <div
                  className="absolute right-2 top-1/2"
                  style={{
                    transform: 'translateY(-50%)',
                    width: '0',
                    height: '0',
                    borderTop: '4px solid transparent',
                    borderBottom: '4px solid transparent',
                    borderLeft: `6px solid ${ARKNIGHTS_COLORS.primary}`,
                  }}
                  aria-hidden="true"
                />
              )}
            </div>
          );
        })}
      </div>

      {/* 动画样式 */}
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
});

export default SuggestionList;

// ==================== 辅助函数 ====================

/**
 * 格式化距离显示
 * @param distance - 距离值
 * @param scale - 宇宙尺度
 * @returns 格式化的距离字符串
 */
function formatDistance(distance: number, scale: UniverseScale): string {
  // 太阳系尺度：使用 AU（天文单位）
  if (scale === 'solar-system') {
    if (distance < 0.01) {
      return `${(distance * 149597870.7).toFixed(0)} km`;
    }
    return `${distance.toFixed(2)} AU`;
  }

  // 宇宙尺度：使用 Mpc（百万秒差距）
  if (distance < 0.001) {
    return `${(distance * 1000).toFixed(2)} kpc`;
  }
  if (distance < 1) {
    return `${(distance * 1000).toFixed(1)} kpc`;
  }
  return `${distance.toFixed(2)} Mpc`;
}
