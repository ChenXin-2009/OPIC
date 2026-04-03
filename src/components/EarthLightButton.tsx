/**
 * EarthLightButton.tsx - 地球光照开关按钮（明日方舟风格）
 *
 * @description 控制 Cesium 地球的昼夜光照效果。
 *   启用时模拟真实太阳光照（昼夜分界线），禁用时地球全天候均匀照亮。
 *   按钮采用明日方舟游戏 UI 风格，具有切角外形、菱形装饰和状态指示灯。
 * @architecture UI 组件层 — 无状态切换按钮，通过回调向父组件传递状态变更
 * @dependencies React（useState）、Tailwind CSS 工具类
 */

'use client';

import { useState } from 'react';

/**
 * 地球光照按钮的样式配置对象
 *
 * @description 集中管理按钮的配色方案，以便统一调整视觉风格。
 *   配色以深色背景 + 黄色高光为主，契合灯光/光照主题。
 */
const CONFIG = {
  /** 按钮配色方案 */
  colors: {
    primary: '#ffffff',   // 主色：纯白，用于文字和装饰元素
    dark: '#0a0a0a',      // 深色背景（未激活状态）
    darkLight: '#1a1a1a', // 次深色（激活状态下的副文字颜色）
    border: '#333333',    // 默认边框色（未激活且未悬停）
    text: '#ffffff',      // 文字颜色
    textDim: '#999999',   // 暗淡文字（未激活状态的副标题）
    accent: '#fbbf24',    // 黄色高光（灯光/光照主题强调色）
  },
};

/**
 * EarthLightButton 组件的 Props 接口
 */
interface EarthLightButtonProps {
  /** 切换回调：当按钮状态改变时触发，参数为新的启用状态（true = 光照开启） */
  onToggle?: (enabled: boolean) => void;
  /** 初始启用状态，默认为 true（地球光照默认开启） */
  initialEnabled?: boolean;
}

/**
 * 地球光照切换按钮组件
 *
 * 提供一个明日方舟风格的切角按钮，用于切换地球光照效果的开启/关闭状态。
 * 按钮具有悬停高亮效果和状态指示（启用/禁用颜色变化）。
 *
 * @param props - 组件属性
 * @param props.onToggle - 切换回调，当按钮状态改变时触发，参数为新的启用状态（true = 光照开启）
 * @param props.initialEnabled - 初始启用状态，默认为 true（地球光照默认开启）
 */
export default function EarthLightButton({ onToggle, initialEnabled = true }: EarthLightButtonProps) {
  /** 当前光照的启用/禁用状态 */
  const [enabled, setEnabled] = useState(initialEnabled);
  /** 鼠标悬停状态，用于触发悬停样式（边框高亮、发光阴影） */
  const [isHovered, setIsHovered] = useState(false);

  /**
   * 处理按钮点击：翻转当前光照状态并通知父组件
   */
  const handleToggle = () => {
    const newState = !enabled;
    setEnabled(newState);
    onToggle?.(newState);
  };

  return (
    <button
      onClick={handleToggle}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        position: 'relative',
        display: 'block',
        width: '11rem',
        height: '3rem',
        background: enabled ? CONFIG.colors.accent : CONFIG.colors.dark,
        border: `2px solid ${isHovered ? CONFIG.colors.primary : (enabled ? CONFIG.colors.accent : CONFIG.colors.border)}`,
        // 明日方舟风格切角：左上角和右下角各裁去 12px 的三角形，形成六边形轮廓
        clipPath: 'polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)',
        transition: 'all 0.3s ease',
        boxShadow: isHovered ? `0 0 20px ${enabled ? CONFIG.colors.accent : CONFIG.colors.primary}80` : 'none',
        cursor: 'pointer',
      }}
      aria-label={enabled ? '关闭地球光照' : '开启地球光照'}
    >
      {/* 左上角菱形装饰：填充切角留下的空白，强化明日方舟 UI 风格 */}
      <div className="absolute" style={{ top: '-1px', left: '-1px', width: '12px', height: '12px', background: CONFIG.colors.primary, clipPath: 'polygon(0 0, 100% 0, 0 100%)' }} />
      {/* 右下角菱形装饰：与左上角对称，完成切角装饰 */}
      <div className="absolute" style={{ bottom: '-1px', right: '-1px', width: '12px', height: '12px', background: CONFIG.colors.primary, clipPath: 'polygon(100% 0, 100% 100%, 0 100%)' }} />

      <div className="flex items-center justify-center gap-2 h-full px-3">
        {/* 灯泡图标：根据光照状态切换实心灯泡（开启）和带斜线灯泡（关闭） */}
        <svg fill="none" stroke={enabled ? CONFIG.colors.dark : CONFIG.colors.primary} viewBox="0 0 24 24"
          style={{ width: '1.25rem', height: '1.25rem', flexShrink: 0 }}>
          {enabled ? (
            // 亮灯：实心灯泡，表示光照已开启
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          ) : (
            // 暗灯：带斜线的灯泡，表示光照已关闭
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547zM3 3l18 18" />
          )}
        </svg>

        <div className="flex flex-col items-start">
          <span className="text-xs font-bold uppercase tracking-wider leading-tight"
            style={{ color: enabled ? CONFIG.colors.dark : CONFIG.colors.primary }}>
            地球光照
          </span>
          {/* 副标题：DAY/NIGHT 表示昼夜模式，ALL DAY 表示全天均匀照亮 */}
          <span className="text-[10px] uppercase tracking-wide leading-tight"
            style={{ color: enabled ? CONFIG.colors.darkLight : CONFIG.colors.textDim }}>
            {enabled ? 'DAY/NIGHT' : 'ALL DAY'}
          </span>
        </div>

        {/* 状态指示器：圆形指示灯，激活时熄灭（深色），未激活时亮起（黄色） */}
        <div className="ml-auto" style={{
          width: '8px', height: '8px', borderRadius: '50%',
          background: enabled ? CONFIG.colors.dark : CONFIG.colors.accent,
          boxShadow: `0 0 8px ${enabled ? CONFIG.colors.dark : CONFIG.colors.accent}`,
        }} />
      </div>
    </button>
  );
}
