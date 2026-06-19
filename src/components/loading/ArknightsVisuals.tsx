/**
 * ArknightsVisuals Component - 明日方舟风格加载页面视觉元素
 * 
 * 设计特点：
 * - 黑色背景 (#000000)
 * - 冷钢蓝/电子蓝主题配色
 * - 极简几何装饰元素
 * - 中央进度条 + 黑色圆形 + 蓝色光晕
 * - 响应式布局
 */

import { ArknightsVisualsProps } from './types';
import HalftoneGradient from './HalftoneGradient';

/** 明日方舟风格加载页面主视觉组件 — 组合背景、进度条、装饰元素 */
export default function ArknightsVisuals({ isAnimating, isComplete = false }: ArknightsVisualsProps) {
  // ==================== 配色方案 ====================
  // 冷钢蓝色系 - 从浅到深的9个层次
  // 注意：使用纯hex颜色（不带透明度），避免与黑色背景叠加后变暗
  const colors = {
    lightest: '#dbf3fe',   // 最浅 - 接近白色的浅蓝
    lighter: '#bddde7',    // 较浅
    light: '#9dc3d0',      // 浅蓝
    medium: '#7ca9b9',     // 中浅
    standard: '#488296',   // 标准蓝（主色调）
    dark: '#3c7384',       // 深蓝
    darker: '#2e5f6e',     // 较深
    darkest: '#214c59',    // 最深
    deepest: '#0f3642',    // 极深 - 接近黑色的深蓝
  };

  return (
    <div className="relative w-full h-full overflow-hidden pointer-events-none">
      
      {/* ==================== 底部半色调网点渐变（Canvas实现） ==================== */}
      <HalftoneGradient colors={colors} isComplete={isComplete} />
      
      {/* ==================== 装饰性几何元素 ==================== */}
      
      {/* 左上角大三角形 - 使用CSS border技巧绘制 */}
      <div 
        className="absolute top-0 left-0 w-0 h-0"
        style={{
          borderLeft: '120px solid transparent',
          borderTop: `120px solid ${colors.lightest}20`,  // 20 = 12.5%透明度
        }}
        aria-hidden="true"
      />
      
      {/* 左上角装饰线 - L形 */}
      <div className="absolute top-4 left-4" aria-hidden="true">
        <div className="w-8 h-0.5" style={{ backgroundColor: `${colors.standard}cc` }} />  {/* 横线 */}
        <div className="w-0.5 h-8" style={{ backgroundColor: `${colors.standard}cc` }} />  {/* 竖线 */}
      </div>
      
      
      {/* ==================== 中央主要元素 ==================== */}
      
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-8">
        
        {/* ========== 背景光晕效果（z-index: 0，在后半轨道前面，前半轨道后面） ========== */}
        {/* 光晕容器 - 占满整个屏幕，不限制大小 */}
        <div 
          className="absolute inset-0"
          style={{ 
            zIndex: 0,
          }}
        >
          {/* 纯黑色圆形主体 + 光晕 - 居中定位 */}
          <div 
            className="absolute rounded-full"
            style={{
              top: '50%',
              left: '50%',
              transform: isComplete ? 'translate(-50%, -50%) scale(0)' : 'translate(-50%, -50%)',
              transition: isComplete ? 'transform 1500ms cubic-bezier(0.32, 0, 0.67, 0), opacity 1500ms cubic-bezier(0.32, 0, 0.67, 0)' : 'none',
              width: '900px',
              height: '900px',
              backgroundColor: '#000000',
              opacity: isComplete ? 0 : 1,
              boxShadow: `
                0 0 60px 30px rgba(222, 244, 233, 0.9),
                0 0 120px 60px ${colors.lightest}dd,
                0 0 200px 100px ${colors.light}aa,
                0 0 280px 140px ${colors.standard}77,
                0 0 550px 180px ${colors.dark}44,
                0 0 660px 220px ${colors.darker}22,
                0 0 1000px 260px ${colors.darkest}11,
                inset 0 0 80px rgba(0, 0, 0, 0.95)
              `,
            }}
          >
            {/* 日食效果 - 黑色圆边缘的亮环，柔化边缘 */}
            <div
              className="absolute inset-0 rounded-full"
              style={{
                boxShadow: `
                  inset 0 0 10px 20px rgba(222, 244, 233, 0.9),
                  inset 0 0 13px 35px ${colors.lightest}99,
                  inset 0 0 25px 50px ${colors.light}77,
                  inset 0 0 25px 65px ${colors.standard}55,
                  inset 0 0 30px 80px ${colors.dark}33
                `,
              }}
            />
            
            {/* 黑色圆内部的噪点层 */}
            <svg 
              width="900" 
              height="900" 
              className="absolute inset-0"
              style={{ 
                opacity: isComplete ? 0 : 0.15,
                borderRadius: '50%',
                transition: 'opacity 1500ms cubic-bezier(0.32, 0, 0.67, 0)',
              }}
            >
              <defs>
                <filter id="centerNoise">
                  <feTurbulence 
                    type="fractalNoise" 
                    baseFrequency="1.2"
                    numOctaves="4"
                    seed="2"
                  />
                  <feColorMatrix type="saturate" values="0"/>
                  <feComponentTransfer>
                    <feFuncA type="linear" slope="0.8"/>
                  </feComponentTransfer>
                  {/* 添加深蓝色色调 */}
                  <feColorMatrix type="matrix" values="
                    0.3 0.3 0.3 0 0
                    0.4 0.4 0.4 0 0
                    0.6 0.6 0.6 0 0.15
                    0   0   0   1 0
                  "/>
                </filter>
                <clipPath id="circleClip">
                  <circle cx="450" cy="450" r="450"/>
                </clipPath>
              </defs>
              <circle 
                cx="450" 
                cy="450" 
                r="450" 
                filter="url(#centerNoise)" 
                fill={colors.standard}
                clipPath="url(#circleClip)"
              />
            </svg>
          </div>
          
          {/* 光晕区域的噪点层 - 覆盖整个光晕范围 */}
          <div 
            className="absolute pointer-events-none"
            style={{
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '1600px',
              height: '1600px',
            }}
          >
            <svg 
              width="1600" 
              height="1600" 
              className="absolute"
              style={{ 
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                opacity: isComplete ? 0 : 0.35,
                mixBlendMode: 'screen',
                transition: 'opacity 1500ms cubic-bezier(0.32, 0, 0.67, 0)',
              }}
            >
              <defs>
                {/* 光晕噪点滤镜 - 蓝色调 */}
                <filter id="glowNoise">
                  <feTurbulence 
                    type="fractalNoise" 
                    baseFrequency="0.9"
                    numOctaves="4"
                    seed="1"
                  />
                  <feColorMatrix type="saturate" values="0"/>
                  <feComponentTransfer>
                    <feFuncR type="linear" slope="2.0" intercept="-0.5"/>
                    <feFuncG type="linear" slope="2.0" intercept="-0.5"/>
                    <feFuncB type="linear" slope="2.0" intercept="-0.5"/>
                    <feFuncA type="linear" slope="1.0"/>
                  </feComponentTransfer>
                  {/* 添加蓝色色调 */}
                  <feColorMatrix type="matrix" values="
                    0.5 0.5 0.5 0 0
                    0.7 0.7 0.7 0 0
                    1.0 1.0 1.0 0 0.3
                    0   0   0   1 0
                  "/>
                </filter>
                {/* 径向渐变遮罩 - 边缘淡出 */}
                <radialGradient id="fadeGradient">
                  <stop offset="0%" stopColor="white" stopOpacity="0"/>
                  <stop offset="28%" stopColor="white" stopOpacity="0"/>
                  <stop offset="35%" stopColor="white" stopOpacity="1"/>
                  <stop offset="85%" stopColor="white" stopOpacity="1"/>
                  <stop offset="100%" stopColor="white" stopOpacity="0"/>
                </radialGradient>
                <mask id="glowMask">
                  <circle cx="800" cy="800" r="800" fill="url(#fadeGradient)"/>
                </mask>
              </defs>
              {/* 应用噪点滤镜的圆形 */}
              <circle 
                cx="800" 
                cy="800" 
                r="800" 
                filter="url(#glowNoise)" 
                fill="white"
                mask="url(#glowMask)"
              />
            </svg>
          </div>
        </div>

        {/* ========== LOADING文字 ========== */}
        <div 
          className="text-sm font-light tracking-wider relative z-10"
          style={{ 
            color: colors.standard,
            opacity: isComplete ? 0 : 1,
            transition: 'opacity 1500ms cubic-bezier(0.32, 0, 0.67, 0)',
          }}
        >
          LOADING
        </div>
        
        {/* ========== 进度条 ========== */}
        <div 
          className="w-full max-w-xs relative z-10"
          style={{
            opacity: isComplete ? 0 : 1,
            transition: 'opacity 1500ms cubic-bezier(0.32, 0, 0.67, 0)',
          }}
        >
          {/* 进度条背景轨道 */}
          <div 
            className="relative h-1 overflow-hidden"
            style={{ 
              backgroundColor: colors.darkest,
              opacity: 0.6,
            }}
          >
            {/* 进度条填充动画 */}
            {isAnimating && (
              <div 
                className="absolute inset-y-0 left-0"
                style={{
                  backgroundColor: colors.standard,
                  animation: 'progress 2s ease-in-out infinite',
                  boxShadow: `0 0 15px ${colors.standard}, 0 0 30px ${colors.standard}80`,
                }}
              />
            )}
          </div>
          
          {/* 进度条两端装饰线 */}
          <div className="relative mt-2">
            <div className="absolute -top-3 left-0 w-2 h-0.5" style={{ backgroundColor: colors.standard }} />
            <div className="absolute -top-3 right-0 w-2 h-0.5" style={{ backgroundColor: colors.standard }} />
          </div>
        </div>
        
        {/* ========== 加载动画点 ========== */}
        <div 
          className="flex gap-1.5 mt-2 relative z-10"
          style={{
            opacity: isComplete ? 0 : 1,
            transition: 'opacity 1500ms cubic-bezier(0.32, 0, 0.67, 0)',
          }}
        >
          <div 
            className="w-1.5 h-1.5 rounded-full animate-pulse" 
            style={{ 
              backgroundColor: colors.standard,
              animationDelay: '0ms',
              boxShadow: `0 0 6px ${colors.standard}`,
            }} 
          />
          <div 
            className="w-1.5 h-1.5 rounded-full animate-pulse" 
            style={{ 
              backgroundColor: colors.standard,
              animationDelay: '200ms',
              boxShadow: `0 0 6px ${colors.standard}`,
            }} 
          />
          <div 
            className="w-1.5 h-1.5 rounded-full animate-pulse" 
            style={{ 
              backgroundColor: colors.standard,
              animationDelay: '400ms',
              boxShadow: `0 0 6px ${colors.standard}`,
            }} 
          />
        </div>
      </div>
    </div>
  );
}
