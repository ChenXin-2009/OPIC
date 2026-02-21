// src/app/page.tsx 或 src/app/solar-system/page.tsx
'use client';

import { useState } from "react";
import SolarSystemCanvas3D from "@/components/canvas/3d/SolarSystemCanvas3D";
import TimeControl from "@/components/TimeControl";
import InfoModal from "@/components/InfoModal";
import { SatelliteMenu } from "@/components/satellite";
import { HEADER_CONFIG } from "@/lib/config/visualConfig";

/**
 * Info button component for top-right corner.
 * Arknights-style design matching the settings button.
 */
function InfoButton({ onClick }: { onClick: () => void }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="fixed"
      style={{
        top: '2rem',
        right: '2rem',
        zIndex: 1001,
        background: '#0a0a0a',
        border: `2px solid ${isHovered ? '#ffffff' : '#333333'}`,
        cursor: 'pointer',
        padding: '8px 16px',
        transition: 'all 0.3s ease',
        color: '#ffffff',
        fontSize: '13px',
        fontWeight: 700,
        letterSpacing: '1.5px',
        textTransform: 'uppercase',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        clipPath: 'polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)',
        boxShadow: isHovered ? '0 0 20px rgba(255, 255, 255, 0.5)' : 'none',
      }}
      aria-label="关于"
    >
      {/* 左上角菱形装饰 */}
      <div 
        style={{
          position: 'absolute',
          top: '-1px',
          left: '-1px',
          width: '12px',
          height: '12px',
          background: '#ffffff',
          clipPath: 'polygon(0 0, 100% 0, 0 100%)',
        }}
      />
      
      {/* 右下角菱形装饰 */}
      <div 
        style={{
          position: 'absolute',
          bottom: '-1px',
          right: '-1px',
          width: '12px',
          height: '12px',
          background: '#ffffff',
          clipPath: 'polygon(100% 0, 100% 100%, 0 100%)',
        }}
      />
      
      关于
    </button>
  );
}

export default function SolarSystemPage() {
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);

  // 计算顶部偏移（Header高度）- 漂浮模式下不需要预留空间
  const headerHeight = (HEADER_CONFIG.enabled && !HEADER_CONFIG.floatingMode) ? HEADER_CONFIG.height : 0;

  return (
    <div 
      className="w-screen flex flex-col overflow-hidden relative"
      style={{ 
        height: '100vh',
        // 使用 dvh 适配移动端动态视口
        // @ts-ignore - dvh 是较新的 CSS 单位
        height: '100dvh',
      }}
    >
      <InfoButton onClick={() => setIsInfoModalOpen(true)} />
      <InfoModal isOpen={isInfoModalOpen} onClose={() => setIsInfoModalOpen(false)} />
      
      {/* 卫星菜单按钮 */}
      <SatelliteMenu lang="zh" />
      
      {/* 主容器，漂浮模式下不需要留出Header高度空间 */}
      <div 
        className="flex-1 relative min-h-0 flex flex-col"
        style={{ 
          marginTop: `${headerHeight}px`,
          isolation: 'isolate',
          // 确保不超出父容器
          maxHeight: '100%',
        }}
      >
        <div className="flex-1 relative min-h-0" style={{ isolation: 'isolate', maxHeight: '100%' }}>
          <SolarSystemCanvas3D />
        </div>
        <TimeControl />
      </div>
    </div>
  );
}
