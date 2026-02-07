/**
 * Custom hooks for TimeSlider component
 */

import { useEffect, useCallback } from 'react';
import { useSolarSystemStore } from '@/lib/state';
import { calculateSpeed } from './TimeSlider.helpers';

/**
 * Hook to manage playback state based on slider position
 * 
 * @param isDragging - Whether slider is being dragged
 * @param sliderPosition - Current slider position (0-1)
 */
export function usePlaybackControl(isDragging: boolean, sliderPosition: number): void {
  const startPlaying = useSolarSystemStore((state) => state.startPlaying);
  
  useEffect(() => {
    if (isDragging) {
      const { speed, direction } = calculateSpeed(sliderPosition);
      if (speed > 0) {
        startPlaying(speed, direction);
      } else {
        useSolarSystemStore.setState({ isPlaying: false });
      }
    }
  }, [isDragging, sliderPosition, startPlaying]);
}

/**
 * Hook to manage drag event listeners
 * 
 * @param isDragging - Whether slider is being dragged
 * @param handleDragMove - Drag move handler
 * @param handleDragEnd - Drag end handler
 */
export function useDragListeners(
  isDragging: boolean,
  handleDragMove: (clientX: number) => void,
  handleDragEnd: () => void
): void {
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      handleDragMove(e.clientX);
    };

    const handleMouseUp = () => {
      handleDragEnd();
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0 && e.touches[0]) {
        handleDragMove(e.touches[0].clientX);
      }
    };

    const handleTouchEnd = () => {
      handleDragEnd();
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('touchend', handleTouchEnd);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging, handleDragMove, handleDragEnd]);
}
