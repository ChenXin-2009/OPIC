/**
 * LoadingSpinner Component
 * 
 * A rotating loading spinner with Arknights-style design.
 * Features multiple concentric rings with rotation and pulse animations.
 * 
 * Requirements: 6.1, 6.3, 9.1, 9.5
 */

import { LoadingSpinnerProps } from './types';

/**
 * LoadingSpinner - Arknights-style rotating loading animation
 * 
 * @param isAnimating - Controls whether the animation is playing
 * @param size - Size of the spinner in pixels (default: 80)
 * 
 * Design features:
 * - Multi-layer concentric rings
 * - Blue (sky-500) color scheme with varying opacity
 * - Rotation animation on outer ring
 * - Pulse animation on inner ring
 * - GPU-accelerated transforms
 */
export default function LoadingSpinner({ 
  isAnimating,
  size = 80 
}: LoadingSpinnerProps) {
  return (
    <div 
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      {/* Outer ring - static background */}
      <div 
        className="absolute inset-0 rounded-full border-4 border-sky-500/20"
        style={{ 
          width: size, 
          height: size
        }}
      />
      
      {/* Rotating arc - main animation */}
      <div 
        className={`absolute inset-0 rounded-full border-4 border-transparent border-t-sky-500 
          ${isAnimating ? 'motion-safe:animate-spin' : ''} motion-reduce:animate-none`}
        style={{ 
          width: size, 
          height: size,
          willChange: isAnimating ? 'transform' : 'auto',
          animationDuration: '1s'
        }}
      />
      
      {/* Secondary rotating arc - offset for visual interest */}
      <div 
        className={`absolute inset-0 rounded-full border-4 border-transparent border-r-sky-500/60 
          ${isAnimating ? 'motion-safe:animate-spin' : ''} motion-reduce:animate-none`}
        style={{ 
          width: size, 
          height: size,
          willChange: isAnimating ? 'transform' : 'auto',
          animationDuration: '1.5s',
          animationDirection: 'reverse'
        }}
      />
      
      {/* Inner ring - pulsing animation */}
      <div 
        className={`absolute rounded-full border-2 border-sky-500/40 
          ${isAnimating ? 'motion-safe:animate-pulse' : ''} motion-reduce:animate-none`}
        style={{ 
          width: size * 0.6, 
          height: size * 0.6,
          willChange: isAnimating ? 'opacity' : 'auto'
        }}
      />
      
      {/* Center dot - static accent */}
      <div 
        className="absolute rounded-full bg-sky-500/60"
        style={{ 
          width: size * 0.15, 
          height: size * 0.15
        }}
      />
      
      {/* Decorative corner elements - Arknights style */}
      <div 
        className="absolute"
        style={{ 
          width: size * 0.3, 
          height: size * 0.3,
          top: 0,
          left: 0
        }}
      >
        <div className="absolute top-0 left-0 w-2 h-0.5 bg-sky-500/80" />
        <div className="absolute top-0 left-0 w-0.5 h-2 bg-sky-500/80" />
      </div>
      
      <div 
        className="absolute"
        style={{ 
          width: size * 0.3, 
          height: size * 0.3,
          bottom: 0,
          right: 0
        }}
      >
        <div className="absolute bottom-0 right-0 w-2 h-0.5 bg-sky-500/80" />
        <div className="absolute bottom-0 right-0 w-0.5 h-2 bg-sky-500/80" />
      </div>
    </div>
  );
}
