/**
 * DecorativeOrbits Component - 装饰性轨道线条
 * 
 * 加载页面的装饰元素，模拟轨道视觉效果
 * - 3条不同角度的椭圆轨道线条，围绕中心恒星
 * - 白色细线轨道
 * - 前半部分实线（不被遮挡）
 * - 后半部分虚线（被恒星遮挡）
 */

'use client';

import { useEffect, useState } from 'react';

interface DecorativeOrbitsProps {
  color?: string;
}

/** 装饰性轨道线条 — 围绕中心恒星的椭圆轨道动画 */
export default function DecorativeOrbits({ color = '#ffffff' }: DecorativeOrbitsProps) {
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setRotation(prev => (prev + 0.3) % 360);
    }, 50);

    return () => clearInterval(interval);
  }, []);

  // 3条轨道配置，参考SVG中的3条椭圆
  const orbits = [
    { 
      rx: 600,  // 水平半径
      ry: 200,  // 垂直半径（扁平）
      rotate: 30, // 旋转角度
      speed: 1 
    },
    { 
      rx: 650, 
      ry: 180, 
      rotate: 90, 
      speed: 0.8 
    },
    { 
      rx: 700, 
      ry: 220, 
      rotate: 150, 
      speed: 0.6 
    },
  ];

  return (
    <>
      {/* 后半部分轨道（虚线，在恒星后面） */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ zIndex: -1 }}>
        <svg
          width="1800"
          height="1800"
          viewBox="-900 -900 1800 1800"
          className="absolute"
        >
          {orbits.map((orbit, index) => (
            <g key={`back-${index}`} transform={`rotate(${orbit.rotate})`}>
              {/* 后半部分：从90度到270度（下半圆） */}
              <path
                d={`M ${orbit.rx * Math.cos(Math.PI / 2)},${orbit.ry * Math.sin(Math.PI / 2)}
                   A ${orbit.rx},${orbit.ry} 0 0 1 ${orbit.rx * Math.cos(3 * Math.PI / 2)},${orbit.ry * Math.sin(3 * Math.PI / 2)}`}
                fill="none"
                stroke={color}
                strokeWidth="1.5"
                strokeDasharray="8 4"
                opacity="0.3"
              />
            </g>
          ))}
        </svg>
      </div>

      {/* 前半部分轨道（实线，在恒星前面） */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ zIndex: 1 }}>
        <svg
          width="1800"
          height="1800"
          viewBox="-900 -900 1800 1800"
          className="absolute"
        >
          <defs>
            {/* 箭头标记 */}
            <marker
              id="orbit-arrow"
              markerWidth="8"
              markerHeight="8"
              refX="6"
              refY="3"
              orient="auto"
            >
              <polygon
                points="0 0, 8 3, 0 6"
                fill={color}
                opacity="0.7"
              />
            </marker>
          </defs>

          {orbits.map((orbit, index) => {
            // 计算圆圈在轨道上的位置
            const angle = ((rotation * orbit.speed) * Math.PI / 180);
            const circleX = orbit.rx * Math.cos(angle);
            const circleY = orbit.ry * Math.sin(angle);
            
            // 判断圆圈是否在前半部分（y < 0）
            const isCircleFront = circleY < 0;

            return (
              <g key={`front-${index}`} transform={`rotate(${orbit.rotate})`}>
                {/* 前半部分：从-90度到90度（上半圆） */}
                <path
                  d={`M ${orbit.rx * Math.cos(-Math.PI / 2)},${orbit.ry * Math.sin(-Math.PI / 2)}
                     A ${orbit.rx},${orbit.ry} 0 0 1 ${orbit.rx * Math.cos(Math.PI / 2)},${orbit.ry * Math.sin(Math.PI / 2)}`}
                  fill="none"
                  stroke={color}
                  strokeWidth="1.5"
                  opacity="0.6"
                />

                {/* 箭头（在轨道的几个位置） */}
                {[-60, -30, 0, 30, 60].map((arrowAngle, i) => {
                  const rad = arrowAngle * Math.PI / 180;
                  const x1 = orbit.rx * Math.cos(rad);
                  const y1 = orbit.ry * Math.sin(rad);
                  const rad2 = (arrowAngle + 5) * Math.PI / 180;
                  const x2 = orbit.rx * Math.cos(rad2);
                  const y2 = orbit.ry * Math.sin(rad2);

                  return (
                    <line
                      key={i}
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      stroke={color}
                      strokeWidth="1.5"
                      markerEnd="url(#orbit-arrow)"
                      opacity="0.6"
                    />
                  );
                })}

                {/* 旋转的圆圈标记（只在前半部分显示） */}
                {isCircleFront && (
                  <>
                    <circle
                      cx={circleX}
                      cy={circleY}
                      r="6"
                      fill="none"
                      stroke={color}
                      strokeWidth="1.5"
                      opacity="0.8"
                    />
                    <circle
                      cx={circleX}
                      cy={circleY}
                      r="2"
                      fill={color}
                      opacity="0.6"
                    />
                  </>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </>
  );
}
