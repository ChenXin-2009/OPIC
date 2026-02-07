/**
 * Sub-components for TimeSlider
 */

import React from 'react';
import { TIME_SLIDER_CONFIG } from '@/lib/config/visualConfig';

interface ArcTrackProps {
  width: number;
  height: number;
  arcPath: string;
  speed: number;
  direction: 'forward' | 'backward';
  cfg: typeof TIME_SLIDER_CONFIG;
}

export function ArcTrack({ width, height, arcPath, speed, direction, cfg }: ArcTrackProps) {
  return (
    <svg
      width={width}
      height={height}
      style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
    >
      <defs>
        <linearGradient id="arcGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={cfg.trackColorEnd} />
          <stop offset="50%" stopColor={cfg.trackColorCenter} />
          <stop offset="100%" stopColor={cfg.trackColorEnd} />
        </linearGradient>
        <linearGradient id="arcGradientActive" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={direction === 'forward' ? cfg.forwardColorEnd : cfg.backwardColorEnd} />
          <stop offset="50%" stopColor={direction === 'forward' ? cfg.forwardColorCenter : cfg.backwardColorCenter} />
          <stop offset="100%" stopColor={direction === 'forward' ? cfg.forwardColorEnd : cfg.backwardColorEnd} />
        </linearGradient>
      </defs>
      
      <path
        d={arcPath}
        stroke="url(#arcGradient)"
        strokeWidth={cfg.trackMaxWidth}
        strokeLinecap="round"
        fill="none"
      />
      
      {speed > 0 && (
        <path
          d={arcPath}
          stroke="url(#arcGradientActive)"
          strokeWidth={cfg.trackMaxWidth}
          strokeLinecap="round"
          fill="none"
          style={{
            opacity: Math.min(1, speed / TIME_SLIDER_CONFIG.maxSpeed),
          }}
        />
      )}
    </svg>
  );
}

interface SliderKnobProps {
  sliderX: number;
  sliderY: number;
  sliderRadius: number;
  isDragging: boolean;
  direction: 'forward' | 'backward';
  cfg: typeof TIME_SLIDER_CONFIG;
}

export function SliderKnob({ sliderX, sliderY, sliderRadius, isDragging, direction, cfg }: SliderKnobProps) {
  return (
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
        transition: isDragging ? 'none' : 'left 0.2s ease-out, top 0.2s ease-out, border-color 0.2s',
        pointerEvents: 'none',
      }}
    />
  );
}

interface SpeedDisplayProps {
  speed: number;
  direction: 'forward' | 'backward';
  speedLabel: string;
  cfg: typeof TIME_SLIDER_CONFIG;
}

export function SpeedDisplay({ speed, direction, speedLabel, cfg }: SpeedDisplayProps) {
  if (speed <= 0) return null;
  
  return (
    <div
      style={{
        position: 'absolute',
        left: '50%',
        bottom: `${cfg.speedTextBottom}px`,
        transform: 'translateX(-50%)',
        color: direction === 'forward' ? cfg.speedTextForwardColor : cfg.speedTextBackwardColor,
        fontSize: `${cfg.speedTextSize}px`,
        fontWeight: 'bold',
        whiteSpace: 'nowrap',
        pointerEvents: 'none',
      }}
    >
      {direction === 'backward' ? '◀ ' : ''}{speedLabel}{direction === 'forward' ? ' ▶' : ''}
    </div>
  );
}
