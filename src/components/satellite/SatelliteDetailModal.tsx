'use client';

import { useEffect, useCallback, memo, useRef } from 'react';
import { useSatelliteStore } from '@/lib/store/useSatelliteStore';
import { useSatelliteDetail } from './hooks/useSatelliteDetail';
import SatelliteDetailSkeleton from './SatelliteDetailSkeleton';
import SatelliteDetailContent from './SatelliteDetailContent';

interface SatelliteDetailModalProps {
  /** 语言设置 */
  lang?: 'zh' | 'en';
}

/**
 * 卫星详情模态框组件
 * 
 * 功能:
 * - 显示选中卫星的详细信息
 * - 支持ESC键和背景点击关闭
 * - 明日方舟视觉风格
 */
function SatelliteDetailModal({ lang = 'zh' }: SatelliteDetailModalProps) {
  const selectedSatellite = useSatelliteStore((state) => state.selectedSatellite);
  const selectSatellite = useSatelliteStore((state) => state.selectSatellite);
  const toggleOrbit = useSatelliteStore((state) => state.toggleOrbit);
  const showOrbits = useSatelliteStore((state) => state.showOrbits);
  
  // 焦点管理引用
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // 使用Hook获取卫星详情数据
  const { detailData, loading, error, retry } = useSatelliteDetail(selectedSatellite);

  // 模态框是否显示
  const isOpen = selectedSatellite !== null;

  // 当前卫星的轨道是否显示
  const isOrbitVisible = selectedSatellite ? showOrbits.has(selectedSatellite) : false;

  // 当模态框打开时，自动显示轨道
  useEffect(() => {
    if (selectedSatellite && !isOrbitVisible) {
      toggleOrbit(selectedSatellite);
    }
  }, [selectedSatellite, isOrbitVisible, toggleOrbit]);

  // ESC键关闭
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        selectSatellite(null);
      }
    };

    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, selectSatellite]);

  // 焦点管理 - Focus Trap
  useEffect(() => {
    if (!isOpen || !modalRef.current) return;

    // 模态框显示时,将焦点移到关闭按钮
    if (closeButtonRef.current) {
      closeButtonRef.current.focus();
    }

    // 获取模态框内所有可聚焦元素
    const getFocusableElements = () => {
      if (!modalRef.current) return [];
      
      const focusableSelectors = [
        'button:not([disabled])',
        'a[href]',
        'input:not([disabled])',
        'select:not([disabled])',
        'textarea:not([disabled])',
        '[tabindex]:not([tabindex="-1"])',
      ].join(', ');
      
      return Array.from(
        modalRef.current.querySelectorAll<HTMLElement>(focusableSelectors)
      ).filter(el => {
        // 过滤掉不可见的元素
        const style = window.getComputedStyle(el);
        return style.display !== 'none' && style.visibility !== 'hidden';
      });
    };

    // 处理Tab键循环导航
    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      const focusableElements = getFocusableElements();
      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (e.shiftKey) {
        // Shift+Tab: 反向导航
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        // Tab: 正向导航
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    // 阻止焦点移到模态框外部
    const handleFocusOut = (e: FocusEvent) => {
      if (!modalRef.current) return;
      
      const target = e.relatedTarget as HTMLElement;
      
      // 如果焦点移到模态框外部,将其拉回
      if (target && !modalRef.current.contains(target)) {
        e.preventDefault();
        if (closeButtonRef.current) {
          closeButtonRef.current.focus();
        }
      }
    };

    window.addEventListener('keydown', handleTab);
    modalRef.current.addEventListener('focusout', handleFocusOut);

    return () => {
      window.removeEventListener('keydown', handleTab);
      if (modalRef.current) {
        modalRef.current.removeEventListener('focusout', handleFocusOut);
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // 关闭模态框 - 使用useCallback缓存
  const handleClose = useCallback(() => {
    selectSatellite(null);
  }, [selectSatellite]);

  // 点击背景关闭 - 使用useCallback缓存
  const handleBackdropClick = useCallback(() => {
    handleClose();
  }, [handleClose]);

  // 点击模态框内容不关闭 - 使用useCallback缓存
  const handleModalClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  return (
    <div
      className="fixed inset-0 z-[2000] pointer-events-none"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="satellite-detail-title"
      aria-describedby="satellite-detail-description"
    >
      {/* 右侧面板容器 - 明日方舟风格 */}
      <article
        ref={modalRef}
        className="relative bg-black/95 backdrop-blur-md overflow-hidden animate-slideInRight pointer-events-auto
                   w-[400px] max-w-[90vw] shadow-2xl"
        onClick={handleModalClick}
        style={{
          position: 'fixed',
          top: '140px',
          right: '20px',
          bottom: '80px',
          maxHeight: 'calc(100vh - 220px)',
          border: '2px solid rgba(255, 255, 255, 0.3)',
          clipPath: 'polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)',
        }}
      >
        {/* 左上角装饰 */}
        <div 
          className="absolute"
          style={{
            top: '-1px',
            left: '-1px',
            width: '12px',
            height: '12px',
            background: '#ffffff',
            clipPath: 'polygon(0 0, 100% 0, 0 100%)',
            zIndex: 20,
          }}
        />

        {/* 左下角装饰 */}
        <div 
          className="absolute"
          style={{
            bottom: '-1px',
            left: '-1px',
            width: '12px',
            height: '12px',
            background: '#ffffff',
            clipPath: 'polygon(0 0, 0 100%, 100% 100%)',
            zIndex: 20,
          }}
        />

        {/* 关闭按钮 - 明日方舟风格 */}
        <button
          ref={closeButtonRef}
          onClick={handleClose}
          className="absolute top-4 right-4 text-white/60 hover:text-white transition-colors"
          style={{
            width: '32px',
            height: '32px',
            border: '1px solid rgba(255, 255, 255, 0.25)',
            clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px))',
            zIndex: 30,
            background: '#0a0a0a',
          }}
          aria-label={lang === 'zh' ? '关闭' : 'Close'}
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
        <section
          className="p-6 overflow-y-auto h-full satellite-menu-scrollbar"
          id="satellite-detail-description"
        >
          {/* 加载状态 */}
          {loading && <SatelliteDetailSkeleton />}

          {/* 错误状态 */}
          {error && !loading && (
            <div className="text-center py-8">
              <div className="text-red-400 mb-4">
                <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p className="text-sm">{error.message}</p>
              </div>
              <button
                onClick={retry}
                className="px-4 py-2 text-sm text-white/80 hover:text-white border border-white/30 hover:border-white/50 transition-colors"
                style={{
                  clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)',
                }}
              >
                {lang === 'zh' ? '重试' : 'Retry'}
              </button>
            </div>
          )}

          {/* 数据内容 */}
          {detailData && !loading && !error && (
            <SatelliteDetailContent data={detailData} lang={lang} />
          )}
        </section>
      </article>
    </div>
  );
}

// 使用memo优化，避免不必要的重渲染
export default memo(SatelliteDetailModal);
