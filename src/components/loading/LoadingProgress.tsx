/**
 * 加载进度条 (Loading Progress)
 *
 * 显示加载进度百分比、阶段信息和动态动画效果。
 * 支持自定义颜色、大小和动画样式。
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { logger } from '@/utils/logger';

/**
 * Props for LoadingProgress component
 */
export interface LoadingProgressProps {
  /** Progress percentage (0-100) */
  progress: number;
  
  /** Current loading stage description */
  stage: string;
  
  /** Optional cancel operation handler */
  onCancel?: () => void;
  
  /** Show percentage number */
  showPercentage?: boolean;
  
  /** Show stage description */
  showStage?: boolean;
  
  /** Show timeout warning (after 30 seconds) */
  timeoutWarning?: boolean;
  
  /** Custom className for styling */
  className?: string;
  
  /** Estimated completion time (milliseconds from now) */
  estimatedCompletion?: number;
}

/**
 * LoadingProgress
 * 
 * Enhanced loading progress component with cancel support, timeout warnings,
 * and debounced updates for smooth visual experience.
 * 
 * **Features:**
 * - Progress bar (0-100%)
 * - Stage descriptions
 * - Cancel operation support
 * - Timeout warning display (30+ seconds)
 * - Minimum 200ms update interval (debounced)
 * - Estimated completion time
 * - Accessible ARIA attributes
 * 
 * **Usage:**
 * ```tsx
 * const [progress, setProgress] = useState(0);
 * const [stage, setStage] = useState('Initializing...');
 * const abortController = new AbortController();
 * 
 * <LoadingProgress
 *   progress={progress}
 *   stage={stage}
 *   onCancel={() => abortController.abort()}
 *   timeoutWarning={elapsed > 30000}
 *   estimatedCompletion={5000}
 * />
 * ```
 * 
 * @see Requirements 4.3, 4.4, 4.5, 4.6, 4.7, 4.10
 */
export function LoadingProgress({
  progress,
  stage,
  onCancel,
  showPercentage = true,
  showStage = true,
  timeoutWarning = false,
  className = '',
  estimatedCompletion,
}: LoadingProgressProps) {
  // Debounced progress to prevent rapid updates
  const [debouncedProgress, setDebouncedProgress] = useState(progress);
  const [debouncedStage, setDebouncedStage] = useState(stage);
  const lastUpdateTime = useRef(Date.now());
  const updateTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Minimum update interval: 200ms
  const MIN_UPDATE_INTERVAL = 200;
  
  /**
   * Debounce progress updates to maintain minimum 200ms interval
   */
  useEffect(() => {
    const now = Date.now();
    const timeSinceLastUpdate = now - lastUpdateTime.current;
    
    if (timeSinceLastUpdate >= MIN_UPDATE_INTERVAL) {
      // Update immediately if enough time has passed
      setDebouncedProgress(progress);
      setDebouncedStage(stage);
      lastUpdateTime.current = now;
    } else {
      // Schedule update for later
      if (updateTimerRef.current) {
        clearTimeout(updateTimerRef.current);
      }
      
      const delay = MIN_UPDATE_INTERVAL - timeSinceLastUpdate;
      updateTimerRef.current = setTimeout(() => {
        setDebouncedProgress(progress);
        setDebouncedStage(stage);
        lastUpdateTime.current = Date.now();
      }, delay);
    }
    
    return () => {
      if (updateTimerRef.current) {
        clearTimeout(updateTimerRef.current);
      }
    };
  }, [progress, stage]);
  
  /**
   * Handle cancel button click
   */
  const handleCancel = useCallback(() => {
    if (onCancel) {
      logger.debug('[LoadingProgress] User cancelled operation');
      onCancel();
    }
  }, [onCancel]);
  
  /**
   * Format estimated completion time
   */
  const formatEstimatedTime = (ms: number): string => {
    if (ms < 1000) {
      return 'less than a second';
    }
    
    const seconds = Math.ceil(ms / 1000);
    
    if (seconds < 60) {
      return `${seconds} second${seconds !== 1 ? 's' : ''}`;
    }
    
    const minutes = Math.ceil(seconds / 60);
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  };
  
  // Clamp progress to 0-100 range
  const clampedProgress = Math.max(0, Math.min(100, debouncedProgress));
  
  return (
    <div
      className={`loading-progress ${className}`}
      role="progressbar"
      aria-valuenow={clampedProgress}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`Loading progress: ${clampedProgress}%`}
      style={{
        width: '100%',
        maxWidth: '500px',
        padding: '1.5rem',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: '8px',
        backdropFilter: 'blur(10px)',
      }}
    >
      {/* Header Section */}
      <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {showStage && (
          <div
            style={{
              fontSize: '0.875rem',
              color: '#e5e7eb',
              fontWeight: 500,
              flex: 1,
            }}
            aria-live="polite"
            aria-atomic="true"
          >
            {debouncedStage}
          </div>
        )}
        
        {showPercentage && (
          <div
            style={{
              fontSize: '1rem',
              color: '#fff',
              fontWeight: 600,
              marginLeft: '1rem',
            }}
            aria-hidden="true"
          >
            {clampedProgress}%
          </div>
        )}
      </div>
      
      {/* Progress Bar */}
      <div
        style={{
          width: '100%',
          height: '8px',
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          borderRadius: '4px',
          overflow: 'hidden',
          marginBottom: '1rem',
        }}
      >
        <div
          style={{
            width: `${clampedProgress}%`,
            height: '100%',
            backgroundColor: '#3b82f6',
            borderRadius: '4px',
            transition: 'width 0.3s ease-out',
            boxShadow: '0 0 10px rgba(59, 130, 246, 0.5)',
          }}
          aria-hidden="true"
        />
      </div>
      
      {/* Estimated Completion */}
      {estimatedCompletion && estimatedCompletion > 0 && (
        <div
          style={{
            fontSize: '0.75rem',
            color: '#9ca3af',
            marginBottom: '1rem',
          }}
          aria-live="polite"
        >
          Estimated time remaining: {formatEstimatedTime(estimatedCompletion)}
        </div>
      )}
      
      {/* Timeout Warning */}
      {timeoutWarning && (
        <div
          role="alert"
          aria-live="assertive"
          style={{
            padding: '0.75rem',
            backgroundColor: 'rgba(251, 191, 36, 0.1)',
            border: '1px solid rgba(251, 191, 36, 0.3)',
            borderRadius: '4px',
            marginBottom: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#fbbf24"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.875rem', color: '#fbbf24', fontWeight: 600 }}>
                Loading is taking longer than expected
              </div>
              <div style={{ fontSize: '0.75rem', color: '#d1d5db', marginTop: '0.25rem' }}>
                This may indicate a slow network connection or server issues.
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Cancel Button */}
      {onCancel && (
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={handleCancel}
            style={{
              padding: '0.5rem 1rem',
              fontSize: '0.875rem',
              fontWeight: 500,
              color: '#e5e7eb',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '4px',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.15)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
            }}
            aria-label="Cancel loading operation"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
