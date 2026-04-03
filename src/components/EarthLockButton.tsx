/**
 * EarthLockButton.tsx - 地球锁定相机模式切换按钮（明日方舟风格）
 *
 * @description 位于 Cesium 切换按钮上方，用于锁定相机相对于地球表面的位置。
 *   启用时相机随地球自转保持固定的地表相对位置；禁用时相机在惯性空间中自由移动。
 *   按钮采用明日方舟游戏 UI 风格，具有切角外形、菱形装饰和状态指示灯。
 * @architecture UI 组件层 — 无状态切换按钮，通过回调向父组件传递状态变更
 * @dependencies React（useState）、Tailwind CSS 工具类
 */

'use client';

import { useState } from 'react';

/**
 * 地球锁定按钮的样式配置对象
 *
 * @description 集中管理按钮的配色方案，以便统一调整视觉风格。
 *   配色以深色背景 + 橙色高光为主，契合地球锁定/固定主题。
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
    accent: '#f5a623',    // 橙色高光（地球锁定主题强调色）
  },
};

/**
 * EarthLockButton 组件的 Props 接口
 */
interface EarthLockButtonProps {
  /** 切换回调：当按钮状态改变时触发，参数为新的启用状态（true = 相机已锁定到地球） */
  onToggle?: (enabled: boolean) => void;
  /** 初始启用状态，默认为 false（相机默认自由移动，不锁定地球） */
  initialEnabled?: boolean;
}

export default function EarthLockButton({ onToggle, initialEnabled = false }: EarthLockButtonProps) {
  /** 当前锁定的启用/禁用状态 */
  const [enabled, setEnabled] = useState(initialEnabled);
  /** 鼠标悬停状态，用于触发悬停样式（边框高亮、发光阴影） */
  const [isHovered, setIsHovered] = useState(false);

  /**
   * 处理按钮点击：翻转当前锁定状态并通知父组件
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
      aria-label={enabled ? '解除地球锁定' : '锁定相机到地球'}
    >
      {/* 左上角菱形装饰：填充切角留下的空白，强化明日方舟 UI 风格 */}
      <div
        className="absolute"
        style={{
          top: '-1px', left: '-1px',
          width: '12px', height: '12px',
          background: CONFIG.colors.primary,
          clipPath: 'polygon(0 0, 100% 0, 0 100%)',
        }}
      />
      {/* 右下角菱形装饰：与左上角对称，完成切角装饰 */}
      <div
        className="absolute"
        style={{
          bottom: '-1px', right: '-1px',
          width: '12px', height: '12px',
          background: CONFIG.colors.primary,
          clipPath: 'polygon(100% 0, 100% 100%, 0 100%)',
        }}
      />

      <div className="flex items-center justify-center gap-2 h-full px-3">
        {/* 锁定图标：根据锁定状态切换闭合锁（已锁定）和开锁（未锁定） */}
        <svg
          fill="none"
          stroke={enabled ? CONFIG.colors.dark : CONFIG.colors.primary}
          viewBox="0 0 24 24"
          style={{ width: '1.25rem', height: '1.25rem', flexShrink: 0 }}
        >
          {enabled ? (
            // 锁定状态：闭合锁，表示相机已固定到地球表面
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          ) : (
            // 未锁定状态：开锁，表示相机可在惯性空间中自由移动
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
          )}
        </svg>

        <div className="flex flex-col items-start">
          <span
            className="text-xs font-bold uppercase tracking-wider leading-tight"
            style={{ color: enabled ? CONFIG.colors.dark : CONFIG.colors.primary }}
          >
            地球锁定
          </span>
          {/* 副标题：LOCKED 表示已锁定地球，FREE 表示自由相机模式 */}
          <span
            className="text-[10px] uppercase tracking-wide leading-tight"
            style={{ color: enabled ? CONFIG.colors.darkLight : CONFIG.colors.textDim }}
          >
            {enabled ? 'LOCKED' : 'FREE'}
          </span>
        </div>

        {/* 状态指示器：圆形指示灯，激活时熄灭（深色），未激活时亮起（橙色） */}
        <div
          className="ml-auto"
          style={{
            width: '8px', height: '8px',
            borderRadius: '50%',
            background: enabled ? CONFIG.colors.dark : CONFIG.colors.accent,
            boxShadow: `0 0 8px ${enabled ? CONFIG.colors.dark : CONFIG.colors.accent}`,
          }}
        />
      </div>
    </button>
  );
}
