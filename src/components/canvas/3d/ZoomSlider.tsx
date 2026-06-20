'use client';

/**
 * ZoomSlider.tsx - 竖向相机缩放速度滑块
 *
 * 参考时间滑块逻辑：
 * - 滑块位置决定缩放速度，中间 = 停止
 * - 向上拖动 → 加速放大（靠近焦点）
 * - 向下拖动 → 加速缩小（远离焦点）
 * - 松手后滑块惯性回弹到中心，速度归零
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { CameraController } from '@/lib/3d/CameraController';

interface ZoomSliderProps {
  cameraController: CameraController | null;
}

const TRACK_HEIGHT = 140;   // 轨道总高度（px）
const THUMB_SIZE = 12;      // 滑块直径（px）
const DEAD_ZONE = 0.06;     // 死区比例（中心附近视为停止）
const MAX_ZOOM_DELTA = 2.5; // 最大每帧 zoom delta（对应滑块在最边缘时）
const SPEED_EXPONENT = 2.2; // 速度曲线指数（越大越非线性）

/** 根据归一化偏移量（-1~1）计算 zoom delta，正值放大，负值缩小 */
function calcZoomDelta(normalizedOffset: number): number {
  const abs = Math.abs(normalizedOffset);
  if (abs < DEAD_ZONE) return 0;
  // 死区外的有效范围映射到 0~1
  const effective = (abs - DEAD_ZONE) / (1 - DEAD_ZONE);
  const speed = effective ** SPEED_EXPONENT * MAX_ZOOM_DELTA;
  return normalizedOffset < 0 ? speed : -speed; // 向上（负偏移）→ 正delta → 放大
}

export default function ZoomSlider({ cameraController }: ZoomSliderProps) {
  // thumbOffset: 相对轨道中心的像素偏移，负值向上（放大），正值向下（缩小）
  const [thumbOffset, setThumbOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const dragStartY = useRef(0);
  const dragStartOffset = useRef(0);
  const rafRef = useRef<number | null>(null);
  const isDraggingRef = useRef(false);
  const thumbOffsetRef = useRef(0);

  // 同步 ref，供 rAF 回调读取

  // 主循环：拖动期间每帧根据滑块位置调用 zoom
  useEffect(() => {
    if (!isDragging || !cameraController) return;

    let animId: number;
    const loop = () => {
      if (!isDraggingRef.current) return;
      const maxOffset = (TRACK_HEIGHT - THUMB_SIZE) / 2;
      const normalized = thumbOffsetRef.current / maxOffset; // -1 ~ 1
      const delta = calcZoomDelta(normalized);
      if (Math.abs(delta) > 0.001) {
        cameraController.zoom(delta);
      }
      animId = requestAnimationFrame(loop);
    };
    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [isDragging, cameraController]);

  // 松手后惯性回弹到中心
  const animateReturn = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const step = () => {
      setThumbOffset(prev => {
        const next = prev * 0.78;
        if (Math.abs(next) < 0.5) return 0;
        rafRef.current = requestAnimationFrame(step);
        return next;
      });
    };
    rafRef.current = requestAnimationFrame(step);
  }, []);

  useEffect(() => () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); }, []);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragStartY.current = e.clientY;
    dragStartOffset.current = thumbOffset;
    setIsDragging(true);
  }, [thumbOffset]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    const dy = e.clientY - dragStartY.current;
    const maxOffset = (TRACK_HEIGHT - THUMB_SIZE) / 2;
    const newOffset = Math.max(-maxOffset, Math.min(maxOffset, dragStartOffset.current + dy));
    setThumbOffset(newOffset);
  }, [isDragging]);

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    if (!isDragging) return;
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    setIsDragging(false);
    animateReturn();
  }, [isDragging, animateReturn]);

  // 计算滑块 top 位置
  const maxOffset = (TRACK_HEIGHT - THUMB_SIZE) / 2;
  const thumbTop = maxOffset + thumbOffset - THUMB_SIZE / 2;

  // 根据偏移量计算速度指示（用于轨道高亮）
  const normalized = thumbOffset / maxOffset;
  const inDeadZone = Math.abs(normalized) < DEAD_ZONE;

  const accentColor = 'rgba(255,255,255,0.8)';
  const trackColor = 'rgba(255,255,255,0.15)';

  // 激活段高亮：从中心到滑块位置
  const highlightHeight = Math.abs(thumbOffset);
  const highlightTop = thumbOffset < 0
    ? maxOffset + thumbOffset  // 向上：从滑块到中心
    : maxOffset;               // 向下：从中心到滑块

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', pointerEvents: 'none', userSelect: 'none' }}>
      {/* 放大标识 */}
      <div style={{ fontSize: '9px', color: accentColor, opacity: 0.5, marginBottom: '2px', lineHeight: 1, letterSpacing: '0.05em' }}>
        ＋
      </div>

      {/* 轨道区域 */}
      <div
        style={{
          position: 'relative',
          width: `${THUMB_SIZE + 12}px`,
          height: `${TRACK_HEIGHT}px`,
          pointerEvents: 'auto',
          cursor: isDragging ? 'grabbing' : 'ns-resize',
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {/* 背景轨道线 */}
        <div style={{
          position: 'absolute',
          left: '50%',
          top: 0,
          transform: 'translateX(-50%)',
          width: '1px',
          height: '100%',
          background: trackColor,
          transition: 'background 0.3s',
        }} />

        {/* 激活段高亮 */}
        {!inDeadZone && highlightHeight > 2 && (
          <div style={{
            position: 'absolute',
            left: '50%',
            top: `${highlightTop}px`,
            transform: 'translateX(-50%)',
            width: '1px',
            height: `${highlightHeight}px`,
            background: thumbOffset < 0 ? 'rgba(255,255,255,0.6)' : 'rgba(255,180,80,0.6)',
            transition: isDragging ? 'none' : 'height 0.05s, top 0.05s',
          }} />
        )}

        {/* 中心刻度 */}
        <div style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          width: '7px',
          height: '1px',
          background: inDeadZone ? accentColor : 'rgba(255,255,255,0.4)',
          transition: 'background 0.2s',
        }} />

        {/* 滑块 */}
        <div style={{
          position: 'absolute',
          left: '50%',
          top: `${thumbTop}px`,
          transform: 'translateX(-50%)',
          width: `${THUMB_SIZE}px`,
          height: `${THUMB_SIZE}px`,
          borderRadius: '50%',
          border: `1.5px solid ${accentColor}`,
          background: isDragging && !inDeadZone ? 'rgba(255,255,255,0.1)' : 'transparent',
          boxShadow: !inDeadZone ? `0 0 5px ${accentColor}` : 'none',
          transition: isDragging ? 'none' : 'top 0.05s linear, box-shadow 0.2s, border-color 0.3s',
          pointerEvents: 'none',
        }} />
      </div>

      {/* 缩小标识 */}
      <div style={{ fontSize: '9px', color: accentColor, opacity: 0.5, marginTop: '2px', lineHeight: 1, letterSpacing: '0.05em' }}>
        －
      </div>
    </div>
  );
}
