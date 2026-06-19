/**
 * DataStreamPanel Component
 * 
 * 显示右侧数据流面板，模拟二进制/十六进制数据加载
 * 提供科幻感的数据可视化效果
 */

'use client';

import { useEffect, useRef, useState } from 'react';

interface DataStreamProps {
  isAnimating: boolean;
}

interface DataLine {
  id: number;
  address: string;
  hex: string;
  ascii: string;
}

/**
 * 生成随机十六进制字节
 */
const randomHexByte = (): string => {
  return Math.floor(Math.random() * 256).toString(16).padStart(2, '0').toUpperCase();
};

/**
 * 生成随机ASCII字符（可打印字符或点）
 */
const randomAscii = (): string => {
  const code = Math.floor(Math.random() * 256);
  // 可打印ASCII字符范围：32-126
  if (code >= 32 && code <= 126) {
    return String.fromCharCode(code);
  }
  return '.';
};

/**
 * 生成一行十六进制数据（16字节）
 */
const generateDataLine = (address: number): DataLine => {
  const hexBytes: string[] = [];
  const asciiChars: string[] = [];
  
  for (let i = 0; i < 16; i++) {
    const byte = randomHexByte();
    hexBytes.push(byte);
    asciiChars.push(randomAscii());
  }
  
  // 格式化为 8字节 空格 8字节
  const hex = `${hexBytes.slice(0, 8).join(' ')}  ${hexBytes.slice(8).join(' ')}`;
  const ascii = asciiChars.join('');
  
  return {
    id: address,
    address: address.toString(16).padStart(8, '0').toUpperCase(),
    hex,
    ascii,
  };
};

/** 右侧数据流面板 — 模拟二进制/十六进制数据滚动效果 */
export default function DataStreamPanel({ isAnimating }: DataStreamProps) {
  const [dataLines, setDataLines] = useState<DataLine[]>([]);
  const lineIdCounter = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isAnimating) return;

    const interval = setInterval(() => {
      const newLine = generateDataLine(lineIdCounter.current * 16);
      lineIdCounter.current++;

      setDataLines((prev) => {
        // 保持最多40行数据
        const updated = [...prev, newLine];
        return updated.slice(-40);
      });

      // 自动滚动到底部
      if (containerRef.current) {
        containerRef.current.scrollTop = containerRef.current.scrollHeight;
      }
    }, 30); // 每30ms添加一行，快速刷屏

    return () => clearInterval(interval);
  }, [isAnimating]);

  return (
    <div
      ref={containerRef}
      className="absolute top-0 right-0 bottom-0 w-[45%] overflow-hidden pointer-events-none scrollbar-hide"
      style={{
        fontFamily: 'Consolas, Monaco, "Courier New", monospace',
        fontSize: '10px',
        lineHeight: '1.5',
        padding: '30px 40px 30px 20px',
        overflowY: 'auto',
        textAlign: 'right',
        direction: 'rtl', // 右对齐
      }}
    >
      {/* 数据流内容 */}
      <div className="space-y-0.5" style={{ direction: 'ltr' }}>
        {dataLines.map((line, index) => (
          <div
            key={line.id}
            className="flex items-start gap-3 justify-end transition-opacity duration-200"
            style={{
              color: 'rgba(72, 130, 150, 0.4)', // #488296 - 标准钢蓝
              opacity: 0,
              animation: `fadeInData 0.1s ease-out ${index * 0.01}s forwards`,
            }}
          >
            {/* 地址 */}
            <span
              className="flex-shrink-0"
              style={{
                color: 'rgba(99, 149, 167, 0.5)', // #6395a7 - 中钢蓝
                fontWeight: 300,
              }}
            >
              {line.address}
            </span>

            {/* 十六进制数据 */}
            <span
              className="flex-shrink-0"
              style={{
                color: 'rgba(72, 130, 150, 0.4)', // #488296 - 标准钢蓝
                fontWeight: 300,
                letterSpacing: '0.05em',
              }}
            >
              {line.hex}
            </span>

            {/* ASCII表示 */}
            <span
              className="flex-shrink-0"
              style={{
                color: 'rgba(157, 195, 208, 0.3)', // #9dc3d0 - 浅钢蓝
                fontWeight: 300,
              }}
            >
              |{line.ascii}|
            </span>
          </div>
        ))}
      </div>

      {/* CSS动画定义 */}
      <style jsx>{`
        @keyframes fadeInData {
          from {
            opacity: 0;
            transform: translateX(10px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  );
}
