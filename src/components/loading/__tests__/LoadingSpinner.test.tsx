/**
 * Unit tests for LoadingSpinner component
 * 
 * Tests the loading spinner functionality including:
 * - Component rendering
 * - Animation class application
 * - Size prop handling
 * - isAnimating prop behavior
 * 
 * **Validates: Requirements 6.1, 6.3**
 */

import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import LoadingSpinner from '../LoadingSpinner';

describe('LoadingSpinner', () => {
  describe('Component rendering', () => {
    it('should render without crashing', () => {
      const { container } = render(<LoadingSpinner isAnimating={true} />);
      expect(container.firstChild).toBeInTheDocument();
    });

    it('should render all ring elements', () => {
      const { container } = render(<LoadingSpinner isAnimating={true} />);
      
      // Check for multiple ring elements (outer ring, rotating arcs, inner ring)
      const rings = container.querySelectorAll('.rounded-full');
      expect(rings.length).toBeGreaterThanOrEqual(4); // At least 4 circular elements
    });

    it('should have aria-hidden attribute for accessibility', () => {
      const { container } = render(<LoadingSpinner isAnimating={true} />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveAttribute('aria-hidden', 'true');
    });
  });

  describe('Animation behavior', () => {
    it('should apply animate-spin class when isAnimating is true', () => {
      const { container } = render(<LoadingSpinner isAnimating={true} />);
      
      // Check for spinning elements with motion-safe prefix
      const spinningElements = container.querySelectorAll('[class*="motion-safe:animate-spin"]');
      expect(spinningElements.length).toBeGreaterThan(0);
    });

    it('should not apply animate-spin class when isAnimating is false', () => {
      const { container } = render(<LoadingSpinner isAnimating={false} />);
      
      // Check that no elements have motion-safe:animate-spin class
      const spinningElements = container.querySelectorAll('[class*="motion-safe:animate-spin"]');
      expect(spinningElements.length).toBe(0);
    });

    it('should apply animate-pulse class to inner ring when isAnimating is true', () => {
      const { container } = render(<LoadingSpinner isAnimating={true} />);
      
      // Check for pulsing elements with motion-safe prefix
      const pulsingElements = container.querySelectorAll('[class*="motion-safe:animate-pulse"]');
      expect(pulsingElements.length).toBeGreaterThan(0);
    });

    it('should not apply animate-pulse class when isAnimating is false', () => {
      const { container } = render(<LoadingSpinner isAnimating={false} />);
      
      // Check that no elements have motion-safe:animate-pulse class
      const pulsingElements = container.querySelectorAll('[class*="motion-safe:animate-pulse"]');
      expect(pulsingElements.length).toBe(0);
    });
  });

  describe('Size prop', () => {
    it('should use default size of 80px when size prop is not provided', () => {
      const { container } = render(<LoadingSpinner isAnimating={true} />);
      const wrapper = container.firstChild as HTMLElement;
      
      expect(wrapper.style.width).toBe('80px');
      expect(wrapper.style.height).toBe('80px');
    });

    it('should apply custom size when size prop is provided', () => {
      const customSize = 120;
      const { container } = render(<LoadingSpinner isAnimating={true} size={customSize} />);
      const wrapper = container.firstChild as HTMLElement;
      
      expect(wrapper.style.width).toBe(`${customSize}px`);
      expect(wrapper.style.height).toBe(`${customSize}px`);
    });

    it('should scale inner elements proportionally to size', () => {
      const customSize = 100;
      const { container } = render(<LoadingSpinner isAnimating={true} size={customSize} />);
      
      // Find the outer ring (first rounded-full element)
      const outerRing = container.querySelector('.rounded-full') as HTMLElement;
      expect(outerRing.style.width).toBe(`${customSize}px`);
      expect(outerRing.style.height).toBe(`${customSize}px`);
    });
  });

  describe('Visual styling', () => {
    it('should use sky-500 color scheme', () => {
      const { container } = render(<LoadingSpinner isAnimating={true} />);
      
      // Check for sky-500 color classes
      const html = container.innerHTML;
      expect(html).toContain('sky-500');
    });

    it('should use varying opacity levels for depth effect', () => {
      const { container } = render(<LoadingSpinner isAnimating={true} />);
      
      // Check for opacity variations (e.g., /20, /40, /60, /80)
      const html = container.innerHTML;
      expect(html).toMatch(/sky-500\/\d+/);
    });

    it('should include decorative corner elements for Arknights style', () => {
      const { container } = render(<LoadingSpinner isAnimating={true} />);
      
      // Check for decorative elements (small lines at corners)
      const decorativeElements = container.querySelectorAll('.bg-sky-500\\/80');
      expect(decorativeElements.length).toBeGreaterThan(0);
    });
  });

  describe('Performance optimization', () => {
    it('should use will-change CSS property for GPU acceleration', () => {
      const { container } = render(<LoadingSpinner isAnimating={true} />);
      
      // Check for will-change in inline styles
      const elementsWithWillChange = Array.from(container.querySelectorAll('[style*="will-change"]'));
      expect(elementsWithWillChange.length).toBeGreaterThan(0);
    });

    it('should use transform-based animations', () => {
      const { container } = render(<LoadingSpinner isAnimating={true} />);
      
      // Check for motion-safe:animate-spin which uses transform: rotate()
      const spinningElements = container.querySelectorAll('[class*="motion-safe:animate-spin"]');
      expect(spinningElements.length).toBeGreaterThan(0);
    });

    it('should include motion-reduce support for accessibility', () => {
      const { container } = render(<LoadingSpinner isAnimating={true} />);
      
      // Check for motion-reduce:animate-none class
      const elementsWithMotionReduce = container.querySelectorAll('[class*="motion-reduce:animate-none"]');
      expect(elementsWithMotionReduce.length).toBeGreaterThan(0);
    });
  });
});
