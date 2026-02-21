// src/app/page.tsx 或 src/app/solar-system/page.tsx
'use client';

import { useState } from "react";
import SolarSystemCanvas3D from "@/components/canvas/3d/SolarSystemCanvas3D";
import TimeControl from "@/components/TimeControl";
import InfoModal from "@/components/InfoModal";
import { SatelliteVisualization } from "@/components/satellite";
import { HEADER_CONFIG } from "@/lib/config/visualConfig";

/**
 * Info button component for top-right corner.
 * Arknights-style design with geometric elements.
 */
function InfoButton({ onClick }: { onClick: () => void }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: 1001,
        backgroundColor: 'transparent',
        border: '1px solid rgba(255, 255, 255, 0.3)',
        cursor: 'pointer',
        padding: '8px 16px',
        transition: 'all 200ms ease',
        color: isHovered ? '#ffffff' : 'rgba(255, 255, 255, 0.6)',
        fontSize: '13px',
        fontWeight: 300,
        letterSpacing: '1.5px',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))',
      }}
      aria-label="关于"
    >
      {/* 左上角装饰 */}
      <span style={{
        position: 'absolute',
        top: '-1px',
        left: '-1px',
        width: '6px',
        height: '1px',
        backgroundColor: isHovered ? '#ffffff' : 'rgba(255, 255, 255, 0.5)',
        transition: 'all 200ms ease',
      }} />
      <span style={{
        position: 'absolute',
        top: '-1px',
        left: '-1px',
        width: '1px',
        height: '6px',
        backgroundColor: isHovered ? '#ffffff' : 'rgba(255, 255, 255, 0.5)',
        transition: 'all 200ms ease',
      }} />
      
      {/* 右下角装饰 */}
      <span style={{
        position: 'absolute',
        bottom: '-1px',
        right: '-1px',
        width: '6px',
        height: '1px',
        backgroundColor: isHovered ? '#ffffff' : 'rgba(255, 255, 255, 0.5)',
        transition: 'all 200ms ease',
      }} />
      <span style={{
        position: 'absolute',
        bottom: '-1px',
        right: '-1px',
        width: '1px',
        height: '6px',
        backgroundColor: isHovered ? '#ffffff' : 'rgba(255, 255, 255, 0.5)',
        transition: 'all 200ms ease',
      }} />
      
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
      
      {/* 卫星可视化UI组件 */}
      <div style={{ 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        zIndex: 9999,
        pointerEvents: 'auto'
      }}>
        <SatelliteVisualization lang="zh" />
      </div>
      
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
