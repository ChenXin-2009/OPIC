/**
 * SatelliteGroundTrackOverlay - 卫星地面轨迹叠加层
 *
 * 在2D地图上显示选中卫星的地面轨迹、当前位置和覆盖圆
 * 使用Canvas绘制，叠加在Cesium地图上
 */

'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useSatelliteStore } from '@/lib/store/useSatelliteStore';
import type { GroundTrackResponse } from '@/app/api/satellites/groundtrack/route';

interface SatelliteGroundTrackOverlayProps {
  /** 地图容器宽度 */
  width?: number;
  /** 地图容器高度 */
  height?: number;
  lang?: 'zh' | 'en';
}

// 经纬度转Canvas坐标（等矩形投影）
function geoToCanvas(lat: number, lon: number, w: number, h: number): [number, number] {
  const x = ((lon + 180) / 360) * w;
  const y = ((90 - lat) / 180) * h;
  return [x, y];
}

const TRACK_COLOR_PAST = 'rgba(74, 158, 255, 0.4)';
const TRACK_COLOR_FUTURE = 'rgba(74, 158, 255, 0.9)';
const CURRENT_COLOR = '#4a9eff';
const COVERAGE_COLOR = 'rgba(74, 158, 255, 0.08)';

export function SatelliteGroundTrackOverlay({ width = 800, height = 400, lang: _lang = 'zh' }: SatelliteGroundTrackOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const trackDataRef = useRef<GroundTrackResponse | null>(null);
  const { selectedSatellite } = useSatelliteStore();

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const data = trackDataRef.current;
    if (!data || data.points.length === 0) return;

    const { points, currentIndex } = data;

    // 绘制过去轨迹
    if (currentIndex > 0) {
      ctx.beginPath();
      ctx.strokeStyle = TRACK_COLOR_PAST;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);

      let prevLon = points[0].lon;
      const [x0, y0] = geoToCanvas(points[0].lat, points[0].lon, w, h);
      ctx.moveTo(x0, y0);

      for (let i = 1; i <= currentIndex; i++) {
        const p = points[i];
        // 处理经度跨越±180°的断线
        if (Math.abs(p.lon - prevLon) > 180) {
          ctx.stroke();
          ctx.beginPath();
          const [nx, ny] = geoToCanvas(p.lat, p.lon, w, h);
          ctx.moveTo(nx, ny);
        } else {
          const [nx, ny] = geoToCanvas(p.lat, p.lon, w, h);
          ctx.lineTo(nx, ny);
        }
        prevLon = p.lon;
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // 绘制未来轨迹
    if (currentIndex < points.length - 1) {
      ctx.beginPath();
      ctx.strokeStyle = TRACK_COLOR_FUTURE;
      ctx.lineWidth = 2;

      let prevLon = points[currentIndex].lon;
      const [x0, y0] = geoToCanvas(points[currentIndex].lat, points[currentIndex].lon, w, h);
      ctx.moveTo(x0, y0);

      for (let i = currentIndex + 1; i < points.length; i++) {
        const p = points[i];
        if (Math.abs(p.lon - prevLon) > 180) {
          ctx.stroke();
          ctx.beginPath();
          const [nx, ny] = geoToCanvas(p.lat, p.lon, w, h);
          ctx.moveTo(nx, ny);
        } else {
          const [nx, ny] = geoToCanvas(p.lat, p.lon, w, h);
          ctx.lineTo(nx, ny);
        }
        prevLon = p.lon;
      }
      ctx.stroke();
    }

    // 绘制当前位置
    const cur = points[currentIndex];
    const [cx, cy] = geoToCanvas(cur.lat, cur.lon, w, h);

    // 覆盖圆（简化：LEO约2000km视野半径，约18度）
    const coverageRadiusDeg = 18;
    const coverageRadiusPx = (coverageRadiusDeg / 180) * h;
    ctx.beginPath();
    ctx.arc(cx, cy, coverageRadiusPx, 0, Math.PI * 2);
    ctx.fillStyle = COVERAGE_COLOR;
    ctx.fill();
    ctx.strokeStyle = 'rgba(74, 158, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // 当前位置点
    ctx.beginPath();
    ctx.arc(cx, cy, 5, 0, Math.PI * 2);
    ctx.fillStyle = CURRENT_COLOR;
    ctx.fill();

    // 脉冲圆
    ctx.beginPath();
    ctx.arc(cx, cy, 10, 0, Math.PI * 2);
    ctx.strokeStyle = `${CURRENT_COLOR}80`;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 标签
    ctx.font = 'bold 10px monospace';
    ctx.fillStyle = CURRENT_COLOR;
    ctx.fillText(
      `${cur.lat.toFixed(1)}°, ${cur.lon.toFixed(1)}°`,
      cx + 12, cy - 4
    );
    ctx.fillStyle = 'rgba(74, 158, 255, 0.7)';
    ctx.fillText(
      `${cur.alt.toFixed(0)}km  ${cur.velocity.toFixed(1)}km/s`,
      cx + 12, cy + 8
    );
  }, []);

  // 获取地面轨迹数据
  useEffect(() => {
    if (!selectedSatellite) {
      trackDataRef.current = null;
      draw();
      return;
    }

    let cancelled = false;

    const fetchTrack = async () => {
      try {
        const res = await fetch(
          `/api/satellites/groundtrack?noradId=${selectedSatellite}&duration=90&steps=180`
        );
        if (res.ok && !cancelled) {
          const data: GroundTrackResponse = await res.json();
          trackDataRef.current = data;
          draw();
        }
      } catch { /* ignore */ }
    };

    fetchTrack();
    const interval = setInterval(fetchTrack, 30000); // 每30秒刷新

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [selectedSatellite, draw]);

  // 重绘
  useEffect(() => {
    draw();
  }, [draw]);

  if (!selectedSatellite) return null;

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 10 }}
    />
  );
}
