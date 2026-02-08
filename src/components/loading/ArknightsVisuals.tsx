/**
 * ArknightsVisuals Component
 * 
 * Renders Arknights-style visual elements including geometric shapes,
 * decorative lines, and a central progress bar.
 * 
 * Design features:
 * - Black background (#000000)
 * - Blue accent color (sky-500: #0EA5E9)
 * - Geometric shapes: triangles, rectangles, diagonal lines
 * - Progress bar with animated fill
 * - Minimalist design with ample whitespace
 * - Responsive layout for different screen sizes
 * 
 * Requirements: 1.3, 1.4, 2.1, 2.2, 2.3, 9.3
 */

import { ArknightsVisualsProps } from './types';

/**
 * ArknightsVisuals - Visual container with Arknights-style geometric elements
 * 
 * @param isAnimating - Controls whether animations are playing
 * 
 * Visual elements:
 * - Large triangle in top-left corner (using CSS border technique)
 * - Rectangular border frame in bottom-right corner
 * - Diagonal line decorations
 * - Central progress bar with animated fill
 * - Blue accent color with varying opacity levels
 */
export default function ArknightsVisuals({ isAnimating }: ArknightsVisualsProps) {
  return (
    <div className="relative w-full h-full bg-black overflow-hidden">
      {/* Top-left large triangle - using CSS border technique */}
      <div 
        className="absolute top-0 left-0 w-0 h-0 
                   border-l-[120px] border-l-transparent border-t-[120px] border-t-sky-500/10
                   sm:border-l-[160px] sm:border-t-[160px]
                   md:border-l-[240px] md:border-t-[240px]
                   lg:border-l-[320px] lg:border-t-[320px]"
        aria-hidden="true"
      />
      
      {/* Top-left corner accent lines */}
      <div className="absolute top-4 left-4 sm:top-6 sm:left-6 md:top-10 md:left-10 lg:top-12 lg:left-12" aria-hidden="true">
        <div className="w-8 h-0.5 bg-sky-500/60 sm:w-10 md:w-14 lg:w-16" />
        <div className="w-0.5 h-8 bg-sky-500/60 sm:h-10 md:h-14 lg:h-16 mt-0" />
      </div>
      
      {/* Bottom-right rectangular border frame */}
      <div 
        className="absolute bottom-4 right-4 w-32 h-24 border-2 border-sky-500/30
                   sm:bottom-6 sm:right-6 sm:w-36 sm:h-26
                   md:bottom-10 md:right-10 md:w-44 md:h-30
                   lg:bottom-12 lg:right-12 lg:w-52 lg:h-34"
        aria-hidden="true"
      >
        {/* Inner corner accents */}
        <div className="absolute top-1.5 right-1.5 w-3 h-0.5 bg-sky-500/50 sm:top-2 sm:right-2 sm:w-4" />
        <div className="absolute top-1.5 right-1.5 w-0.5 h-3 bg-sky-500/50 sm:top-2 sm:right-2 sm:h-4" />
        <div className="absolute bottom-1.5 left-1.5 w-3 h-0.5 bg-sky-500/50 sm:bottom-2 sm:left-2 sm:w-4" />
        <div className="absolute bottom-1.5 left-1.5 w-0.5 h-3 bg-sky-500/50 sm:bottom-2 sm:left-2 sm:h-4" />
      </div>
      
      {/* Diagonal line decoration - top-right to center */}
      <div 
        className="absolute top-1/4 right-1/4 w-20 h-0.5 bg-sky-500/40 rotate-45 origin-center
                   sm:w-28 md:w-36 lg:w-44"
        aria-hidden="true"
      />
      
      {/* Diagonal line decoration - bottom-left */}
      <div 
        className="absolute bottom-1/3 left-1/4 w-16 h-0.5 bg-sky-500/30 -rotate-45 origin-center
                   sm:w-20 md:w-28 lg:w-36"
        aria-hidden="true"
      />
      
      {/* Additional decorative line - vertical accent */}
      <div 
        className="absolute top-1/2 left-1/3 w-0.5 h-12 bg-sky-500/25
                   sm:h-14 md:h-18 lg:h-22"
        aria-hidden="true"
      />
      
      {/* Additional decorative line - horizontal accent */}
      <div 
        className="absolute top-2/3 right-1/3 w-14 h-0.5 bg-sky-500/25
                   sm:w-16 md:w-20 lg:w-24"
        aria-hidden="true"
      />
      
      {/* Small geometric accent - top-right */}
      <div 
        className="absolute top-12 right-12 w-6 h-6 border border-sky-500/40 rotate-45
                   sm:top-14 sm:right-14 sm:w-7 sm:h-7
                   md:top-18 md:right-18 md:w-9 md:h-9
                   lg:top-20 lg:right-20 lg:w-11 lg:h-11"
        aria-hidden="true"
      />
      
      {/* Small triangle accent - bottom-left */}
      <div 
        className="absolute bottom-16 left-16 w-0 h-0 
                   border-l-[20px] border-l-transparent border-b-[20px] border-b-sky-500/20
                   sm:bottom-18 sm:left-18 sm:border-l-[25px] sm:border-b-[25px]
                   md:bottom-22 md:left-22 md:border-l-[35px] md:border-b-[35px]
                   lg:border-l-[40px] lg:border-b-[40px]"
        aria-hidden="true"
      />
      
      {/* Central progress bar - main focus */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-8 sm:px-12 md:px-16 lg:px-20">
        {/* Loading text */}
        <div className="text-sky-500/80 text-sm sm:text-base md:text-lg font-light tracking-wider">
          LOADING
        </div>
        
        {/* Progress bar container */}
        <div className="w-full max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg">
          {/* Progress bar background */}
          <div className="relative h-1 bg-sky-500/20 overflow-hidden">
            {/* Progress bar fill - animated */}
            {isAnimating && (
              <div 
                className="absolute inset-y-0 left-0 bg-sky-500 animate-progress"
                style={{
                  animation: 'progress 2s ease-in-out infinite'
                }}
              />
            )}
          </div>
          
          {/* Corner decorations for progress bar */}
          <div className="relative mt-2">
            <div className="absolute -top-3 left-0 w-2 h-0.5 bg-sky-500/60" />
            <div className="absolute -top-3 right-0 w-2 h-0.5 bg-sky-500/60" />
          </div>
        </div>
        
        {/* Loading percentage or dots */}
        <div className="flex gap-1.5 mt-2">
          <div className="w-1.5 h-1.5 rounded-full bg-sky-500/60 animate-pulse" style={{ animationDelay: '0ms' }} />
          <div className="w-1.5 h-1.5 rounded-full bg-sky-500/60 animate-pulse" style={{ animationDelay: '200ms' }} />
          <div className="w-1.5 h-1.5 rounded-full bg-sky-500/60 animate-pulse" style={{ animationDelay: '400ms' }} />
        </div>
      </div>
      
      {/* Subtle corner frame - top-right */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 md:top-10 md:right-10 lg:top-12 lg:right-12" aria-hidden="true">
        <div className="w-6 h-0.5 bg-sky-500/40 sm:w-8 md:w-9 lg:w-10" />
        <div className="w-0.5 h-6 bg-sky-500/40 sm:h-8 md:h-9 lg:h-10 ml-auto" />
      </div>
      
      {/* Subtle corner frame - bottom-left */}
      <div className="absolute bottom-4 left-4 sm:bottom-6 sm:left-6 md:bottom-10 md:left-10 lg:bottom-12 lg:left-12" aria-hidden="true">
        <div className="w-6 h-0.5 bg-sky-500/40 sm:w-8 md:w-9 lg:w-10" />
        <div className="w-0.5 h-6 bg-sky-500/40 sm:h-8 md:h-9 lg:h-10 mt-0" />
      </div>
    </div>
  );
}
