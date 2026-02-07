/**
 * TimeSlider.tsx - 弧形时间滑块组件
 */

'use client';

import React, { useRef, useState, useCallback } from 'react';
import { useSolarSystemStore } from '@/lib/state';
import { TIME_SLIDER_CONFIG } from '@/lib/config/visualConfig';
import { usePlaybackControl, useDragListeners } from './TimeSlider.hooks';
import {
  getArcY,
  calculateSpeed,
  formatSpeedLabel,
  generateArcPath,
  normalizePosition,
} from './TimeSlider.helpers';
import { ArcTrack, SliderKnob, SpeedDisplay } from './TimeSlider.components';

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
  
  const lang = useSolarSystemStore((state) => state.lang);

  const cfg = TIME_SLIDER_CONFIG;
  const arcDepth = height * cfg.arcDepthRatio;
  const sliderRadius = cfg.sliderRadius;
  const trackPadding = cfg.trackPadding;
  const trackWidth = width - trackPadding * 2;
  
  const sliderX = trackPadding + sliderPosition * trackWidth;
  const sliderY = getArcY(sliderPosition, arcDepth, trackPadding);

  const { speed, direction } = calculateSpeed(sliderPosition);
  const speedLabel = formatSpeedLabel(speed, lang);

  const arcPath = generateArcPath(trackPadding, trackWidth, arcDepth);

  const handleDragStart = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const normalizedX = normalizePosition(clientX, rect, trackPadding, trackWidth);
    
    setSliderPosition(normalizedX);
    setIsDragging(true);
  }, [trackPadding, trackWidth]);

  const handleDragMove = useCallback((clientX: number) => {
    if (!isDragging || !containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const normalizedX = normalizePosition(clientX, rect, trackPadding, trackWidth);
    
    setSliderPosition(normalizedX);
  }, [isDragging, trackPadding, trackWidth]);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    handleDragStart(e.clientX);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    if (e.touches.length > 0 && e.touches[0]) {
      handleDragStart(e.touches[0].clientX);
    }
  };

  usePlaybackControl(isDragging, sliderPosition);
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
      <ArcTrack 
        width={width} 
        height={height} 
        arcPath={arcPath} 
        speed={speed} 
        direction={direction} 
        cfg={cfg} 
      />
      
      <SliderKnob 
        sliderX={sliderX} 
        sliderY={sliderY} 
        sliderRadius={sliderRadius} 
        isDragging={isDragging} 
        direction={direction} 
        cfg={cfg} 
      />
      
      <SpeedDisplay 
        speed={speed} 
        direction={direction} 
        speedLabel={speedLabel} 
        cfg={cfg} 
      />
    </div>
  );
}
