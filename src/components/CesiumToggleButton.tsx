/**
 * CesiumToggleButton.tsx - Cesium 渲染切换按钮（明日方舟风格）
 *
 * @description 位于左下角，用于切换地球渲染模式（Planet 球体 / Cesium 瓦片地图）。
 *   按钮采用明日方舟游戏 UI 风格，具有切角外形、菱形装饰和状态指示灯。
 * @architecture UI 组件层 — 无状态切换按钮，通过回调向父组件传递状态变更
 * @dependencies React（useState）、Tailwind CSS 工具类
 */

'use client';

import { useState } from 'react';

/**
 * 明日方舟风格 UI 配置对象
 *
 * @description 集中管理按钮的布局位置、尺寸和配色方案，
 *   以便在不修改 JSX 结构的前提下统一调整视觉风格。
 *   配色以深色背景 + 蓝色高光为主，契合地球/宇宙主题。
 */
const ARKNIGHTS_CONFIG = {
  /** 按钮在视口中的定位（桌面端与移动端分别配置） */
  position: {
    bottom: '2rem',
    left: '2rem',
    // 移动端位置（避免与底部导航栏重叠）
    bottomMobile: '10rem',
    leftMobile: '1rem',
  },

  /** 按钮固定尺寸 */
  button: {
    width: '11rem',
    height: '3rem',
  },

  /** 按钮配色方案 */
  colors: {
    primary: '#ffffff',   // 主色：纯白，用于文字和装饰元素
    dark: '#0a0a0a',      // 深色背景（未激活状态）
    darkLight: '#1a1a1a', // 次深色（激活状态下的副文字颜色）
    border: '#333333',    // 默认边框色（未激活且未悬停）
    text: '#ffffff',      // 文字颜色
    textDim: '#999999',   // 暗淡文字（未激活状态的副标题）
    accent: '#4a9eff',    // 蓝色高光（地球/Cesium 主题强调色）
  },
};

/**
 * CesiumToggleButton 组件的 Props 接口
 */
interface CesiumToggleButtonProps {
  /** 切换回调：当按钮状态改变时触发，参数为新的启用状态 */
  onToggle?: (enabled: boolean) => void;
  /** 初始启用状态，默认为 false（Cesium 默认关闭） */
  initialEnabled?: boolean;
}

/**
 * Cesium 地球视图切换按钮组件
 *
 * 提供一个明日方舟风格的切角按钮，用于切换 Cesium 地球视图的显示/隐藏状态。
 * 按钮具有悬停高亮效果和状态指示（启用/禁用颜色变化）。
 *
 * @param props - 组件属性
 * @param props.onToggle - 切换回调，当按钮状态改变时触发，参数为新的启用状态
 * @param props.initialEnabled - 初始启用状态，默认为 false（Cesium 默认关闭）
 */
export default function CesiumToggleButton({ onToggle, initialEnabled = false }: CesiumToggleButtonProps) {
  /** 当前按钮的启用/禁用状态 */
  const [enabled, setEnabled] = useState(initialEnabled);
  /** 鼠标悬停状态，用于触发悬停样式（边框高亮、发光阴影） */
  const [isHovered, setIsHovered] = useState(false);

  /**
   * 处理按钮点击：翻转当前状态并通知父组件
   */
  const handleToggle = () => {
    const newState = !enabled;
    setEnabled(newState);
    onToggle?.(newState);
  };

  return (
    <>
      <button
        onClick={handleToggle}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          position: 'relative',
          display: 'block',
          width: ARKNIGHTS_CONFIG.button.width,
          height: ARKNIGHTS_CONFIG.button.height,
          background: enabled ? ARKNIGHTS_CONFIG.colors.accent : ARKNIGHTS_CONFIG.colors.dark,
          border: `2px solid ${isHovered ? ARKNIGHTS_CONFIG.colors.primary : (enabled ? ARKNIGHTS_CONFIG.colors.accent : ARKNIGHTS_CONFIG.colors.border)}`,
          // 明日方舟风格切角：左上角和右下角各裁去 12px 的三角形，形成六边形轮廓
          clipPath: 'polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)',
          transition: 'all 0.3s ease',
          boxShadow: isHovered ? `0 0 20px ${enabled ? ARKNIGHTS_CONFIG.colors.accent : ARKNIGHTS_CONFIG.colors.primary}80` : 'none',
          cursor: 'pointer',
        }}
        aria-label={enabled ? 'Disable Cesium' : 'Enable Cesium'}
      >
        {/* 左上角菱形装饰：填充切角留下的空白，强化明日方舟 UI 风格 */}
        <div
          className="absolute"
          style={{
            top: '-1px',
            left: '-1px',
            width: '12px',
            height: '12px',
            background: enabled ? ARKNIGHTS_CONFIG.colors.primary : ARKNIGHTS_CONFIG.colors.primary,
            clipPath: 'polygon(0 0, 100% 0, 0 100%)',
          }}
        />

        {/* 右下角菱形装饰：与左上角对称，完成切角装饰 */}
        <div
          className="absolute"
          style={{
            bottom: '-1px',
            right: '-1px',
            width: '12px',
            height: '12px',
            background: enabled ? ARKNIGHTS_CONFIG.colors.primary : ARKNIGHTS_CONFIG.colors.primary,
            clipPath: 'polygon(100% 0, 100% 100%, 0 100%)',
          }}
        />

        {/* 内容 */}
        <div className="flex items-center justify-center gap-2 h-full px-3">
          {/* 地球图标 */}
          <svg
            fill="none"
            stroke={enabled ? ARKNIGHTS_CONFIG.colors.dark : ARKNIGHTS_CONFIG.colors.primary}
            viewBox="0 0 24 24"
            style={{
              width: '1.25rem',
              height: '1.25rem',
              flexShrink: 0,
            }}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>

          {/* 文字 */}
          <div className="flex flex-col items-start">
            <span
              className="text-xs font-bold uppercase tracking-wider leading-tight"
              style={{
                color: enabled ? ARKNIGHTS_CONFIG.colors.dark : ARKNIGHTS_CONFIG.colors.primary,
              }}
            >
              CESIUM 地球
            </span>
            <span
              className="text-[10px] uppercase tracking-wide leading-tight"
              style={{
                color: enabled ? ARKNIGHTS_CONFIG.colors.darkLight : ARKNIGHTS_CONFIG.colors.textDim,
              }}
            >
              {enabled ? 'ENABLED' : 'DISABLED'}
            </span>
          </div>

          {/* 状态指示器：圆形指示灯，激活时熄灭（深色），未激活时亮起（蓝色） */}
          <div
            className="ml-auto"
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: enabled ? ARKNIGHTS_CONFIG.colors.dark : ARKNIGHTS_CONFIG.colors.accent,
              boxShadow: enabled ? `0 0 8px ${ARKNIGHTS_CONFIG.colors.dark}` : `0 0 8px ${ARKNIGHTS_CONFIG.colors.accent}`,
            }}
          />
        </div>
      </button>
    </>
  );
}
