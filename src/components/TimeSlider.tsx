/**
 * TimeSlider.tsx - 坐标轴式时间滑块组件
 */

'use client';

import React, { useRef, useState, useCallback } from 'react';
import { useSolarSystemStore } from '@/lib/state';
import { TIME_SLIDER_CONFIG } from '@/lib/config/visualConfig';
import { usePlaybackControl, useDragListeners } from './TimeSlider.hooks';
import {
  calculateSpeed,
  formatSpeedLabel,
  normalizePosition,
} from './TimeSlider.helpers';

interface TimeSliderProps {
  width?: number;
  height?: number;
}

export default function TimeSlider({ 
  width = TIME_SLIDER_CONFIG.width, 
  height = TIME_SLIDER_CONFIG.height 
}: TimeSliderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [sliderPosition, setSliderPosition] = useState(0.5);
  const [isAnimating, setIsAnimating] = useState(false);
  const [mouseDownPos, setMouseDownPos] = useState<{ x: number; y: number } | null>(null);
  
  const lang = useSolarSystemStore((state) => state.lang);

  const cfg = TIME_SLIDER_CONFIG;
  const sliderRadius = cfg.sliderRadius;
  const trackPadding = cfg.trackPadding;
  const trackWidth = width - trackPadding * 2;
  const centerY = height / 2;
  
  // 计算滑块在弧线上的 Y 位置
  const getSliderY = (position: number) => {
    // 二次贝塞尔曲线：P(t) = (1-t)²P0 + 2(1-t)tP1 + t²P2
    // P0 = (lineStartX, centerY - 10), P1 = (中点, centerY), P2 = (lineEndX, centerY - 10)
    // 我们只需要 Y 坐标：Y(t) = (1-t)²(centerY - 10) + 2(1-t)t(centerY) + t²(centerY - 10)
    const t = position; // position 已经是 0 到 1
    const y0 = centerY - 10; // 起点 Y
    const y1 = centerY;      // 控制点 Y
    const y2 = centerY - 10; // 终点 Y
    
    const y = (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * y1 + t * t * y2;
    return y;
  };
  
  const sliderX = trackPadding + sliderPosition * trackWidth;
  const sliderY = getSliderY(sliderPosition);

  const { speed, direction } = calculateSpeed(sliderPosition);
  const speedLabel = formatSpeedLabel(speed, lang);

  const arrowSize = 8;
  const arrowWidth = 1.5;
  const lineStartX = trackPadding;
  const lineEndX = width - trackPadding - arrowSize - 5;

  const handleDragMove = useCallback((clientX: number) => {
    if (!isDragging || !containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const normalizedX = normalizePosition(clientX, rect, trackPadding, trackWidth);
    
    setSliderPosition(normalizedX);
  }, [isDragging, trackPadding, trackWidth]);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
    setMouseDownPos(null);
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setMouseDownPos({ x: e.clientX, y: e.clientY });
  };
  
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!mouseDownPos) return;
    
    // 检测是否移动了足够的距离来判定为拖动
    const dx = e.clientX - mouseDownPos.x;
    const dy = e.clientY - mouseDownPos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance > 3 && !isDragging) {
      // 开始拖动
      setIsDragging(true);
      setIsAnimating(false);
    }
    
    if (isDragging) {
      handleDragMove(e.clientX);
    }
  }, [mouseDownPos, isDragging, handleDragMove]);
  
  const handleMouseUp = useCallback((e: MouseEvent) => {
    if (!mouseDownPos) return;
    
    const dx = e.clientX - mouseDownPos.x;
    const dy = e.clientY - mouseDownPos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance <= 3 && !isDragging) {
      // 这是一个点击，不是拖动
      handleTrackClick(e.clientX);
    }
    
    setIsDragging(false);
    setMouseDownPos(null);
  }, [mouseDownPos, isDragging]);

  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    if (e.touches.length > 0 && e.touches[0]) {
      setMouseDownPos({ x: e.touches[0].clientX, y: e.touches[0].clientY });
    }
  };
  
  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!mouseDownPos || e.touches.length === 0 || !e.touches[0]) return;
    
    const touch = e.touches[0];
    const dx = touch.clientX - mouseDownPos.x;
    const dy = touch.clientY - mouseDownPos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance > 3 && !isDragging) {
      setIsDragging(true);
      setIsAnimating(false);
    }
    
    if (isDragging) {
      handleDragMove(touch.clientX);
    }
  }, [mouseDownPos, isDragging, handleDragMove]);
  
  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (!mouseDownPos) return;
    
    const changedTouch = e.changedTouches[0];
    if (!changedTouch) return;
    
    const dx = changedTouch.clientX - mouseDownPos.x;
    const dy = changedTouch.clientY - mouseDownPos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance <= 3 && !isDragging) {
      handleTrackClick(changedTouch.clientX);
    }
    
    setIsDragging(false);
    setMouseDownPos(null);
  }, [mouseDownPos, isDragging]);
  
  // 点击轨道时的缓动动画
  const handleTrackClick = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const normalizedX = normalizePosition(clientX, rect, trackPadding, trackWidth);
    
    // 启动缓动动画
    setIsAnimating(true);
    const startPosition = sliderPosition;
    const targetPosition = normalizedX;
    const duration = 300; // 动画持续时间（毫秒）
    const startTime = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // 使用 easeOutCubic 缓动函数
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      
      const newPosition = startPosition + (targetPosition - startPosition) * easeProgress;
      setSliderPosition(newPosition);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setIsAnimating(false);
      }
    };
    
    requestAnimationFrame(animate);
  }, [sliderPosition, trackPadding, trackWidth]);
  
  // 监听全局鼠标/触摸事件
  React.useEffect(() => {
    if (!mouseDownPos) return;
    
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('touchend', handleTouchEnd);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [mouseDownPos, handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd]);

  usePlaybackControl(isDragging || isAnimating, sliderPosition);
  useDragListeners(isDragging, handleDragMove, handleDragEnd);

  return (
    <div
      ref={containerRef}
      style={{
        width: `${width}px`,
        height: `${height}px`,
        position: 'relative',
        cursor: isDragging ? 'grabbing' : 'grab',
        touchAction: 'none',
        userSelect: 'none',
      }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
    >
      <svg
        width={width}
        height={height}
        style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
      >
        <defs>
          <linearGradient id="axisGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={cfg.trackColorCenter} stopOpacity="1" />
            <stop offset="50%" stopColor={cfg.trackColorCenter} stopOpacity="1" />
            <stop offset="100%" stopColor={cfg.trackColorCenter} stopOpacity="1" />
          </linearGradient>
          <linearGradient id="axisGradientActive" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={direction === 'forward' ? cfg.forwardColorCenter : cfg.backwardColorCenter} stopOpacity="1" />
            <stop offset="50%" stopColor={direction === 'forward' ? cfg.forwardColorCenter : cfg.backwardColorCenter} stopOpacity="1" />
            <stop offset="100%" stopColor={direction === 'forward' ? cfg.forwardColorCenter : cfg.backwardColorCenter} stopOpacity="1" />
          </linearGradient>
        </defs>
        
        {/* 坐标轴弧线 - 两端向上弯曲 */}
        <path
          d={`M ${lineStartX} ${centerY - 10} Q ${lineStartX + trackWidth / 2} ${centerY} ${lineEndX} ${centerY - 10}`}
          stroke="rgba(255, 255, 255, 0.8)"
          strokeWidth={cfg.trackMaxWidth}
          fill="none"
          strokeLinecap="round"
        />
        
        {/* 坐标轴箭头 - 向右 */}
        <g>
          {/* 箭头主线（延伸到最右边） */}
          <line
            x1={lineEndX}
            y1={centerY - 10}
            x2={width - trackPadding}
            y2={centerY - 10}
            stroke="rgba(255, 255, 255, 0.8)"
            strokeWidth={cfg.trackMaxWidth}
            strokeLinecap="butt"
          />
          {/* 箭头上半部分 - 90度夹角 */}
          <line
            x1={width - trackPadding}
            y1={centerY - 10}
            x2={width - trackPadding - arrowSize}
            y2={centerY - 10 - arrowSize}
            stroke="rgba(255, 255, 255, 0.8)"
            strokeWidth={arrowWidth}
            strokeLinecap="butt"
          />
          {/* 箭头下半部分 - 90度夹角 */}
          <line
            x1={width - trackPadding}
            y1={centerY - 10}
            x2={width - trackPadding - arrowSize}
            y2={centerY - 10 + arrowSize}
            stroke="rgba(255, 255, 255, 0.8)"
            strokeWidth={arrowWidth}
            strokeLinecap="butt"
          />
        </g>
      </svg>

      {/* 滑块 */}
      <div
        style={{
          position: 'absolute',
          left: `${sliderX - sliderRadius}px`,
          top: `${sliderY - sliderRadius}px`,
          width: `${sliderRadius * 2}px`,
          height: `${sliderRadius * 2}px`,
          borderRadius: '50%',
          backgroundColor: 'transparent',
          border: `${cfg.sliderBorderWidth}px solid ${isDragging 
            ? (direction === 'forward' ? cfg.sliderForwardColor : cfg.sliderBackwardColor)
            : cfg.sliderBorderColor}`,
          boxShadow: isDragging 
            ? `0 0 ${cfg.sliderGlowRadius}px ${direction === 'forward' ? cfg.sliderForwardColor : cfg.sliderBackwardColor}`
            : 'none',
          transition: (isDragging || isAnimating) ? 'none' : 'border-color 0.2s',
          pointerEvents: 'none',
        }}
      />

      {/* 速度标签（显示在箭头右侧） */}
      <div
        style={{
          position: 'absolute',
          left: `${width - trackPadding + 15}px`,
          top: `${centerY - 10 - 8}px`,
          color: speed > 0 
            ? (direction === 'forward' ? cfg.speedTextForwardColor : cfg.speedTextBackwardColor)
            : cfg.trackColorCenter,
          fontSize: `${cfg.speedTextSize}px`,
          fontWeight: 'bold',
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
          opacity: speed > 0 ? 1 : 0.5,
        }}
      >
        {speed > 0 ? speedLabel : (lang === 'zh' ? '暂停' : 'Paused')}
      </div>
    </div>
  );
}
