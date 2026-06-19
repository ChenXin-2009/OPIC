/**
 * HalftoneGradient Component - 半色调网点渐变效果
 * 
 * 使用Canvas动态绘制实现真正平滑的网点大小和颜色渐变
 * - 底部：大网点 + 浅蓝色
 * - 顶部：小网点 + 深蓝色 + 淡出
 */

'use client';

import { useEffect, useRef } from 'react';

interface HalftoneGradientProps {
  colors: {
    light: string;
    standard: string;
    dark: string;
    darker: string;
    darkest: string;
    deepest: string;
  };
  isComplete?: boolean;
}

/** 半色调网点渐变背景 — 使用 Canvas 绘制网点大小和颜色渐变 */
export default function HalftoneGradient({ colors, isComplete = false }: HalftoneGradientProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = 600;

    const hexToRgb = (hex: string): [number, number, number] => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)] : [0, 0, 0];
    };

    const interpolateColor = (ratio: number): string => {
      const colorStops: Array<{ pos: number; color: [number, number, number] }> = [
        { pos: 0, color: hexToRgb(colors.light) },
        { pos: 0.2, color: hexToRgb(colors.standard) },
        { pos: 0.4, color: hexToRgb(colors.dark) },
        { pos: 0.6, color: hexToRgb(colors.darker) },
        { pos: 0.8, color: hexToRgb(colors.darkest) },
        { pos: 1, color: hexToRgb(colors.deepest) },
      ];

      let startStop = colorStops[0];
      let endStop = colorStops[1];

      for (let i = 0; i < colorStops.length - 1; i++) {
        if (ratio >= colorStops[i].pos && ratio <= colorStops[i + 1].pos) {
          startStop = colorStops[i];
          endStop = colorStops[i + 1];
          break;
        }
      }

      const segmentRatio = (ratio - startStop.pos) / (endStop.pos - startStop.pos);
      const r = Math.round(startStop.color[0] + (endStop.color[0] - startStop.color[0]) * segmentRatio);
      const g = Math.round(startStop.color[1] + (endStop.color[1] - startStop.color[1]) * segmentRatio);
      const b = Math.round(startStop.color[2] + (endStop.color[2] - startStop.color[2]) * segmentRatio);
      const alpha = 1.0 - ratio * 0.7;

      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const spacing = 15;
      const rows = Math.ceil(canvas.height / spacing);
      const cols = Math.ceil(canvas.width / spacing);

      for (let row = 0; row < rows; row++) {
        const y = canvas.height - row * spacing;
        const ratio = row / rows;
        const maxRadius = 10;
        const minRadius = 1;
        const radius = maxRadius - (maxRadius - minRadius) * ratio;
        const color = interpolateColor(ratio);

        for (let col = 0; col < cols; col++) {
          const x = col * spacing + spacing / 2;
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(x, y, radius, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    };

    draw();

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = 600;
      draw();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [colors]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute bottom-0 left-0 pointer-events-none"
      style={{ 
        zIndex: -2,
        opacity: isComplete ? 0 : 1,
        transition: 'opacity 1500ms cubic-bezier(0.32, 0, 0.67, 0)',
      }}
    />
  );
}
