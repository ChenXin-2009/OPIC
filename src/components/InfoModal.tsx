'use client';

import { useEffect } from 'react';

interface InfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function InfoModal({ isOpen, onClose }: InfoModalProps) {
  // ESC键关闭弹窗
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center"
      onClick={onClose}
    >
      {/* 背景遮罩 */}
      <div className="absolute inset-0 bg-black/80" />
      
      {/* 弹窗内容 - 明日方舟风格 */}
      <div
        className="relative bg-black max-w-3xl w-full mx-4 max-h-[85vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        style={{
          border: '1px solid rgba(255, 255, 255, 0.3)',
          clipPath: 'polygon(0 0, calc(100% - 20px) 0, 100% 20px, 100% 100%, 20px 100%, 0 calc(100% - 20px))',
        }}
      >
        {/* 左上角装饰 */}
        <div className="absolute top-0 left-0 w-16 h-16 border-l-2 border-t-2 border-white/50" style={{ clipPath: 'polygon(0 0, 100% 0, 100% 2px, 2px 2px, 2px 100%, 0 100%)' }} />
        <div className="absolute top-3 left-3 w-8 h-0.5 bg-white/40" />
        <div className="absolute top-3 left-3 w-0.5 h-8 bg-white/40" />
        
        {/* 右上角装饰 */}
        <div className="absolute top-0 right-0 w-12 h-12 border-r-2 border-t-2 border-white/30" style={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%, calc(100% - 2px) 100%, calc(100% - 2px) 2px, 0 2px)' }} />
        
        {/* 右下角装饰 */}
        <div className="absolute bottom-0 right-0 w-16 h-16 border-r-2 border-b-2 border-white/50" style={{ clipPath: 'polygon(100% 0, 100% 100%, 0 100%, 0 calc(100% - 2px), calc(100% - 2px) calc(100% - 2px), calc(100% - 2px) 0)' }} />
        <div className="absolute bottom-3 right-3 w-8 h-0.5 bg-white/40" />
        <div className="absolute bottom-3 right-3 w-0.5 h-8 bg-white/40" />
        
        {/* 左下角装饰 */}
        <div className="absolute bottom-0 left-0 w-12 h-12 border-l-2 border-b-2 border-white/30" style={{ clipPath: 'polygon(0 0, 2px 0, 2px calc(100% - 2px), 100% calc(100% - 2px), 100% 100%, 0 100%)' }} />

        {/* 关闭按钮 - 明日方舟风格 */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 text-white/60 hover:text-white transition-colors z-10"
          style={{
            width: '32px',
            height: '32px',
            border: '1px solid rgba(255, 255, 255, 0.25)',
            clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px))',
          }}
          aria-label="关闭"
        >
          <svg
            className="w-4 h-4 mx-auto"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="square"
              strokeLinejoin="miter"
              strokeWidth={1.5}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        {/* 内容区域 */}
        <div className="p-10 overflow-y-auto max-h-[85vh]" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255, 255, 255, 0.3) transparent' }}>
          {/* 标题区域 */}
          <div className="mb-8 relative">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-1 h-8 bg-white/80" />
              <h2 className="text-3xl font-light text-white tracking-wider" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
                SOLMAP
              </h2>
            </div>
            <div className="ml-4 pl-3 border-l border-white/20">
              <p className="text-sm text-white/50 tracking-wide">SOLAR SYSTEM VISUALIZATION</p>
            </div>
          </div>
          
          <div className="space-y-8 text-gray-300 leading-relaxed">
            {/* 项目简介 */}
            <section className="relative pl-4 border-l border-white/15">
              <h3 className="text-lg font-light text-white/80 mb-3 tracking-wide">项目简介</h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                SOLMAP 是一个交互式太阳系可视化应用，使用 Three.js 和 Next.js 构建。
                通过真实的天文数据和精确的轨道计算，为您呈现太阳系的动态模拟。
              </p>
            </section>

            {/* 主要功能 */}
            <section className="relative pl-4 border-l border-white/15">
              <h3 className="text-lg font-light text-white/80 mb-3 tracking-wide">主要功能</h3>
              <div className="space-y-2 text-sm text-gray-400">
                <div className="flex items-start gap-2">
                  <span className="text-white/50 mt-1">▸</span>
                  <span>实时 3D 太阳系模拟</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-white/50 mt-1">▸</span>
                  <span>精确的行星轨道计算</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-white/50 mt-1">▸</span>
                  <span>时间控制和快进功能</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-white/50 mt-1">▸</span>
                  <span>交互式相机控制</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-white/50 mt-1">▸</span>
                  <span>银河系背景和恒星渲染</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-white/50 mt-1">▸</span>
                  <span>行星纹理和真实比例</span>
                </div>
              </div>
            </section>

            {/* 宇宙尺度 */}
            <section className="relative pl-4 border-l border-white/15">
              <h3 className="text-lg font-light text-white/80 mb-3 tracking-wide">宇宙尺度可视化</h3>
              <p className="text-sm text-gray-400 leading-relaxed mb-3">
                通过缩放视图，您可以探索从太阳系到可观测宇宙的多个尺度层次。
                所有宇宙尺度数据均基于真实天文观测，不使用模拟数据。
              </p>
              <div className="space-y-2 text-sm text-gray-400">
                <div className="flex items-start gap-2">
                  <span className="text-white/50 mt-1">▸</span>
                  <span>本星系群（来自 McConnachie 2012 目录）</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-white/50 mt-1">▸</span>
                  <span>近邻星系群（来自 Karachentsev et al. 2013 目录）</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-white/50 mt-1">▸</span>
                  <span>室女座超星系团（来自 2MRS 巡天数据）</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-white/50 mt-1">▸</span>
                  <span>拉尼亚凯亚超星系团（来自 Cosmicflows-3 数据集）</span>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-3 leading-relaxed">
                坐标系统：超银道坐标系（Supergalactic Coordinate System）
              </p>
            </section>

            {/* 操作指南 */}
            <section className="relative pl-4 border-l border-white/15">
              <h3 className="text-lg font-light text-white/80 mb-3 tracking-wide">操作指南</h3>
              <div className="space-y-2 text-sm text-gray-400">
                <div className="flex items-start gap-2">
                  <span className="text-white/60 font-mono text-xs mt-0.5">[鼠标拖拽]</span>
                  <span>旋转视角</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-white/60 font-mono text-xs mt-0.5">[滚轮]</span>
                  <span>缩放视图</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-white/60 font-mono text-xs mt-0.5">[点击行星]</span>
                  <span>聚焦目标</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-white/60 font-mono text-xs mt-0.5">[时间控制]</span>
                  <span>调整模拟速度和日期</span>
                </div>
              </div>
            </section>

            {/* 技术栈 */}
            <section className="relative pl-4 border-l border-white/15">
              <h3 className="text-lg font-light text-white/80 mb-3 tracking-wide">技术栈</h3>
              <p className="text-xs text-gray-500 font-mono tracking-wider">
                Next.js 15 / React 19 / Three.js / TypeScript / Tailwind CSS
              </p>
            </section>

            {/* 分隔线 */}
            <div className="relative h-px bg-gradient-to-r from-transparent via-white/20 to-transparent my-6" />

            {/* 数据来源 */}
            <section className="relative pl-4 border-l border-white/15">
              <h3 className="text-lg font-light text-white/80 mb-3 tracking-wide">数据来源</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-gray-500">行星轨道数据：</span>
                  <a 
                    href="https://ssd.jpl.nasa.gov/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-white/70 hover:text-white ml-2 transition-colors"
                  >
                    NASA JPL Solar System Dynamics
                  </a>
                </div>
                <div>
                  <span className="text-gray-500">恒星数据：</span>
                  <a 
                    href="https://www.cosmos.esa.int/web/gaia" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-white/70 hover:text-white ml-2 transition-colors"
                  >
                    ESA Gaia Mission (DR3)
                  </a>
                </div>
                <div>
                  <span className="text-gray-500">本星系群：</span>
                  <span className="text-white/70 ml-2">
                    McConnachie (2012) Local Group Catalog
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">近邻星系群：</span>
                  <span className="text-white/70 ml-2">
                    Karachentsev et al. (2013) Nearby Galaxies Catalog
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">室女座超星系团：</span>
                  <span className="text-white/70 ml-2">
                    2MRS Survey Data
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">拉尼亚凯亚超星系团：</span>
                  <span className="text-white/70 ml-2">
                    Cosmicflows-3 Dataset
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">行星纹理：</span>
                  <a 
                    href="https://www.solarsystemscope.com/textures/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-white/70 hover:text-white ml-2 transition-colors"
                  >
                    Solar System Scope
                  </a>
                </div>
                <div>
                  <span className="text-gray-500">银河系图像：</span>
                  <a 
                    href="https://www.esa.int/ESA_Multimedia/Images" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-white/70 hover:text-white ml-2 transition-colors"
                  >
                    ESA/Gaia
                  </a>
                </div>
              </div>
            </section>

            {/* 分隔线 */}
            <div className="relative h-px bg-gradient-to-r from-transparent via-white/20 to-transparent my-6" />

            {/* 免责声明 */}
            <section className="relative pl-4 border-l border-white/15">
              <h3 className="text-lg font-light text-white/80 mb-3 tracking-wide">免责声明</h3>
              <div className="text-xs text-gray-500 space-y-2 leading-relaxed">
                <p>
                  本应用仅供教育和娱乐目的使用。虽然我们努力确保数据的准确性，
                  但不保证所有天文数据和计算结果的绝对精确性。
                </p>
                <p>
                  行星位置基于简化的轨道模型计算，可能与实际天体位置存在偏差。
                  如需精确的天文数据，请参考专业天文机构的官方资料。
                </p>
                <p>
                  本项目使用的所有第三方数据和资源均遵循其原始许可协议。
                  纹理和图像资源版权归原作者所有。
                </p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
