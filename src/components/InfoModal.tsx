/**
 * 信息弹窗 (Info Modal)
 *
 * 模态对话框，展示关于页面（About）的内容。
 * 支持 ESC 键关闭和点击遮罩层关闭。
 */

'use client';

import { useEffect } from 'react';
import AboutContent from './AboutContent';

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
                OPIC
              </h2>
            </div>
            <div className="ml-4 pl-3 border-l border-white/20">
              <p className="text-sm text-white/50 tracking-wide">OPEN INTEGRATED COSMOS</p>
            </div>
          </div>
          
          <AboutContent />
        </div>
      </div>
    </div>
  );
}
