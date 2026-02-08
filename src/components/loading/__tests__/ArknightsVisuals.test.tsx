/**
 * Unit tests for ArknightsVisuals component
 * 
 * Tests the Arknights-style visual elements including:
 * - Component rendering
 * - Background color
 * - Geometric shapes (triangles, rectangles, lines)
 * - LoadingSpinner integration
 * - Responsive layout
 * 
 * **Validates: Requirements 1.3, 1.4, 2.3**
 */

import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import ArknightsVisuals from '../ArknightsVisuals';

describe('ArknightsVisuals', () => {
  describe('Component rendering', () => {
    it('should render without crashing', () => {
      const { container } = render(<ArknightsVisuals isAnimating={true} />);
      expect(container.firstChild).toBeInTheDocument();
    });

    it('should render a full-width and full-height container', () => {
      const { container } = render(<ArknightsVisuals isAnimating={true} />);
      const wrapper = container.firstChild as HTMLElement;
      
      expect(wrapper).toHaveClass('w-full');
      expect(wrapper).toHaveClass('h-full');
    });

    it('should have overflow-hidden to prevent scrolling', () => {
      const { container } = render(<ArknightsVisuals isAnimating={true} />);
      const wrapper = container.firstChild as HTMLElement;
      
      expect(wrapper).toHaveClass('overflow-hidden');
    });
  });

  describe('Background color', () => {
    it('should use black background color', () => {
      const { container } = render(<ArknightsVisuals isAnimating={true} />);
      const wrapper = container.firstChild as HTMLElement;
      
      expect(wrapper).toHaveClass('bg-black');
    });
  });

  describe('Geometric shapes', () => {
    it('should render top-left triangle using CSS border technique', () => {
      const { container } = render(<ArknightsVisuals isAnimating={true} />);
      
      // Look for element with border-t and border-l classes (triangle)
      const html = container.innerHTML;
      expect(html).toContain('border-t-');
      expect(html).toContain('border-l-');
      expect(html).toContain('border-l-transparent');
    });

    it('should render bottom-right rectangular border frame', () => {
      const { container } = render(<ArknightsVisuals isAnimating={true} />);
      
      // Look for element with border-2 class positioned at bottom-right
      const html = container.innerHTML;
      expect(html).toContain('bottom-');
      expect(html).toContain('right-');
      expect(html).toContain('border-2');
    });

    it('should render diagonal line decorations', () => {
      const { container } = render(<ArknightsVisuals isAnimating={true} />);
      
      // Look for rotated elements (diagonal lines)
      const html = container.innerHTML;
      expect(html).toContain('rotate-45');
      expect(html).toContain('-rotate-45');
    });

    it('should render multiple decorative elements', () => {
      const { container } = render(<ArknightsVisuals isAnimating={true} />);
      
      // Count elements with aria-hidden (decorative elements)
      const decorativeElements = container.querySelectorAll('[aria-hidden="true"]');
      expect(decorativeElements.length).toBeGreaterThan(5); // Multiple decorative elements
    });
  });

  describe('Color scheme', () => {
    it('should use sky-500 as accent color', () => {
      const { container } = render(<ArknightsVisuals isAnimating={true} />);
      
      const html = container.innerHTML;
      expect(html).toContain('sky-500');
    });

    it('should use varying opacity levels for depth effect', () => {
      const { container } = render(<ArknightsVisuals isAnimating={true} />);
      
      // Check for multiple opacity variations
      const html = container.innerHTML;
      expect(html).toMatch(/sky-500\/10/);
      expect(html).toMatch(/sky-500\/\d+/);
    });

    it('should have elements with different opacity levels', () => {
      const { container } = render(<ArknightsVisuals isAnimating={true} />);
      
      const html = container.innerHTML;
      // Should have at least 3 different opacity levels
      const opacityMatches = html.match(/sky-500\/\d+/g);
      expect(opacityMatches).not.toBeNull();
      expect(opacityMatches!.length).toBeGreaterThan(3);
    });
  });

  describe('LoadingSpinner integration', () => {
    it('should render LoadingSpinner component', () => {
      const { container } = render(<ArknightsVisuals isAnimating={true} />);
      
      // LoadingSpinner has rounded-full elements
      const spinnerElements = container.querySelectorAll('.rounded-full');
      expect(spinnerElements.length).toBeGreaterThan(0);
    });

    it('should center the LoadingSpinner', () => {
      const { container } = render(<ArknightsVisuals isAnimating={true} />);
      
      // Look for centered container
      const html = container.innerHTML;
      expect(html).toContain('items-center');
      expect(html).toContain('justify-center');
    });

    it('should show progress bar when animating', () => {
      const { container: animatingContainer } = render(<ArknightsVisuals isAnimating={true} />);
      const { container: staticContainer } = render(<ArknightsVisuals isAnimating={false} />);
      
      // When animating, should have progress bar with animation
      const animatingProgress = animatingContainer.querySelector('.animate-progress');
      expect(animatingProgress).toBeInTheDocument();
      
      // When not animating, should not have animated progress bar
      const staticProgress = staticContainer.querySelector('.animate-progress');
      expect(staticProgress).not.toBeInTheDocument();
    });
  });

  describe('Responsive design', () => {
    it('should include responsive classes for small screens', () => {
      const { container } = render(<ArknightsVisuals isAnimating={true} />);
      
      const html = container.innerHTML;
      expect(html).toContain('sm:');
    });

    it('should include responsive classes for medium screens', () => {
      const { container } = render(<ArknightsVisuals isAnimating={true} />);
      
      const html = container.innerHTML;
      expect(html).toContain('md:');
    });

    it('should include responsive classes for large screens', () => {
      const { container } = render(<ArknightsVisuals isAnimating={true} />);
      
      const html = container.innerHTML;
      expect(html).toContain('lg:');
    });

    it('should scale geometric shapes responsively', () => {
      const { container } = render(<ArknightsVisuals isAnimating={true} />);
      
      const html = container.innerHTML;
      // Triangle should have responsive border sizes
      expect(html).toMatch(/md:border-[lt]-\[\d+px\]/);
      expect(html).toMatch(/lg:border-[lt]-\[\d+px\]/);
    });

    it('should adjust spacing for different screen sizes', () => {
      const { container } = render(<ArknightsVisuals isAnimating={true} />);
      
      const html = container.innerHTML;
      // Should have responsive top/bottom/left/right spacing
      expect(html).toMatch(/md:(top|bottom|left|right)-\d+/);
    });

    it('should render progress bar with responsive sizing', () => {
      const { container } = render(<ArknightsVisuals isAnimating={true} />);
      
      // Should have responsive max-width classes for progress bar
      const html = container.innerHTML;
      expect(html).toContain('max-w-xs'); // Mobile
      expect(html).toContain('sm:max-w-sm'); // Small
      expect(html).toContain('md:max-w-md'); // Medium
      expect(html).toContain('lg:max-w-lg'); // Large
    });

    it('should have responsive text sizing', () => {
      const { container } = render(<ArknightsVisuals isAnimating={true} />);
      
      const html = container.innerHTML;
      // Loading text should have responsive sizing
      expect(html).toContain('text-sm');
      expect(html).toContain('sm:text-base');
      expect(html).toContain('md:text-lg');
    });
  });

  describe('Whitespace and layout', () => {
    it('should have ample whitespace with absolute positioning', () => {
      const { container } = render(<ArknightsVisuals isAnimating={true} />);
      
      // All decorative elements should be absolutely positioned
      const absoluteElements = container.querySelectorAll('.absolute');
      expect(absoluteElements.length).toBeGreaterThan(5);
    });

    it('should position elements at various locations for balance', () => {
      const { container } = render(<ArknightsVisuals isAnimating={true} />);
      
      const html = container.innerHTML;
      // Should have elements in different corners and positions
      expect(html).toContain('top-');
      expect(html).toContain('bottom-');
      expect(html).toContain('left-');
      expect(html).toContain('right-');
    });
  });

  describe('Accessibility', () => {
    it('should mark decorative elements with aria-hidden', () => {
      const { container } = render(<ArknightsVisuals isAnimating={true} />);
      
      const decorativeElements = container.querySelectorAll('[aria-hidden="true"]');
      expect(decorativeElements.length).toBeGreaterThan(0);
    });

    it('should not interfere with LoadingSpinner accessibility', () => {
      const { container } = render(<ArknightsVisuals isAnimating={true} />);
      
      // LoadingSpinner itself should have aria-hidden on its root element
      // With responsive design, there are multiple spinners for different screen sizes
      const spinnerElements = container.querySelectorAll('[aria-hidden="true"]');
      
      // Should have multiple aria-hidden elements (decorative shapes + spinners)
      expect(spinnerElements.length).toBeGreaterThan(10);
    });
  });

  describe('Visual consistency', () => {
    it('should maintain consistent styling between renders', () => {
      const { container: firstRender } = render(<ArknightsVisuals isAnimating={true} />);
      const { container: secondRender } = render(<ArknightsVisuals isAnimating={true} />);
      
      expect(firstRender.innerHTML).toBe(secondRender.innerHTML);
    });

    it('should only differ in animation state when isAnimating changes', () => {
      const { container: animating } = render(<ArknightsVisuals isAnimating={true} />);
      const { container: notAnimating } = render(<ArknightsVisuals isAnimating={false} />);
      
      // The main difference should be in animation classes
      const animatingHtml = animating.innerHTML;
      const notAnimatingHtml = notAnimating.innerHTML;
      
      // Both should have the same structure
      expect(animatingHtml).toContain('bg-black');
      expect(notAnimatingHtml).toContain('bg-black');
      
      // But different animation states - progress bar should only animate when isAnimating is true
      expect(animatingHtml).toContain('animate-progress');
      expect(notAnimatingHtml).not.toContain('animate-progress');
    });
  });
});
