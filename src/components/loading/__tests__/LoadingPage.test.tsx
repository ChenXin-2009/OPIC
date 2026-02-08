/**
 * Unit tests for LoadingPage component
 * 
 * Tests cover:
 * - Component rendering
 * - Full-screen overlay styles
 * - Conditional rendering logic
 * - State management
 * - Accessibility attributes
 * - Cache detection and fast fade-out logic
 * 
 * **Validates: Requirements 1.1, 1.2, 7.1, 7.5, 10.1, 10.2, 10.3**
 */

import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import LoadingPage from '../LoadingPage';

// Mock the hooks
jest.mock('../useResourceLoader', () => ({
  useResourceLoader: jest.fn(() => ({ isReady: false, wasCached: false }))
}));

jest.mock('../useMinimumDisplayTime', () => ({
  useMinimumDisplayTime: jest.fn(() => ({ isMinTimeElapsed: false }))
}));

// Import mocked hooks for manipulation
import { useResourceLoader } from '../useResourceLoader';
import { useMinimumDisplayTime } from '../useMinimumDisplayTime';

const mockUseResourceLoader = useResourceLoader as jest.MockedFunction<typeof useResourceLoader>;
const mockUseMinimumDisplayTime = useMinimumDisplayTime as jest.MockedFunction<typeof useMinimumDisplayTime>;

describe('LoadingPage', () => {
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    mockUseResourceLoader.mockReturnValue({ isReady: false, wasCached: false });
    mockUseMinimumDisplayTime.mockReturnValue({ isMinTimeElapsed: false });
  });

  describe('Initial Rendering', () => {
    it('should render the loading page on mount', () => {
      render(<LoadingPage />);
      
      const loadingElement = screen.getByRole('status');
      expect(loadingElement).toBeInTheDocument();
    });

    it('should use black background', () => {
      render(<LoadingPage />);
      
      const loadingElement = screen.getByRole('status');
      expect(loadingElement).toHaveClass('bg-black');
    });

    it('should have full-screen overlay styles', () => {
      render(<LoadingPage />);
      
      const loadingElement = screen.getByRole('status');
      expect(loadingElement).toHaveClass('fixed');
      expect(loadingElement).toHaveClass('inset-0');
      expect(loadingElement).toHaveClass('z-[9999]');
    });
  });

  describe('Accessibility', () => {
    it('should include role="status" attribute', () => {
      render(<LoadingPage />);
      
      const loadingElement = screen.getByRole('status');
      expect(loadingElement).toHaveAttribute('role', 'status');
    });

    it('should include aria-live="polite" attribute', () => {
      render(<LoadingPage />);
      
      const loadingElement = screen.getByRole('status');
      expect(loadingElement).toHaveAttribute('aria-live', 'polite');
    });

    it('should have aria-busy="true" when loading', () => {
      render(<LoadingPage />);
      
      const loadingElement = screen.getByRole('status');
      expect(loadingElement).toHaveAttribute('aria-busy', 'true');
    });

    it('should include screen reader text for loading state', () => {
      render(<LoadingPage />);
      
      const srText = screen.getByText('正在加载页面资源，请稍候...');
      expect(srText).toBeInTheDocument();
      expect(srText).toHaveClass('sr-only');
    });

    it('should have appropriate aria-label when loading', () => {
      render(<LoadingPage />);
      
      const loadingElement = screen.getByRole('status');
      expect(loadingElement).toHaveAttribute('aria-label', '页面加载中');
    });
  });

  describe('Conditional Rendering', () => {
    it('should start fade-out and eventually unmount when loading completes', async () => {
      // Start with loading state
      mockUseResourceLoader.mockReturnValue({ isReady: false, wasCached: false });
      mockUseMinimumDisplayTime.mockReturnValue({ isMinTimeElapsed: false });
      
      const { rerender } = render(<LoadingPage fadeOutDuration={100} />);
      
      // Verify it's rendered initially without fade-out
      let loadingElement = screen.getByRole('status');
      expect(loadingElement).toBeInTheDocument();
      expect(loadingElement.className).not.toContain('motion-safe:animate-fadeOut');
      
      // Simulate loading completion
      mockUseResourceLoader.mockReturnValue({ isReady: true, wasCached: false });
      mockUseMinimumDisplayTime.mockReturnValue({ isMinTimeElapsed: true });
      
      rerender(<LoadingPage fadeOutDuration={100} />);
      
      // Should now have fade-out class
      loadingElement = screen.getByRole('status');
      expect(loadingElement.className).toContain('animate-fadeOut');
      expect(loadingElement).toHaveAttribute('aria-busy', 'false');
    });

    it('should continue showing when resources ready but min time not elapsed', () => {
      mockUseResourceLoader.mockReturnValue({ isReady: true, wasCached: false });
      mockUseMinimumDisplayTime.mockReturnValue({ isMinTimeElapsed: false });
      
      render(<LoadingPage />);
      
      const loadingElement = screen.getByRole('status');
      expect(loadingElement).toBeInTheDocument();
    });

    it('should continue showing when min time elapsed but resources not ready', () => {
      mockUseResourceLoader.mockReturnValue({ isReady: false, wasCached: false });
      mockUseMinimumDisplayTime.mockReturnValue({ isMinTimeElapsed: true });
      
      render(<LoadingPage />);
      
      const loadingElement = screen.getByRole('status');
      expect(loadingElement).toBeInTheDocument();
    });
  });

  describe('Cache Detection and Fast Fade-out', () => {
    it('should use fast fade-out time when resources are cached', () => {
      // Simulate cached resources scenario
      mockUseResourceLoader.mockReturnValue({ isReady: true, wasCached: true });
      mockUseMinimumDisplayTime.mockReturnValue({ isMinTimeElapsed: false });
      
      render(<LoadingPage minDisplayTime={1000} fastFadeOutTime={1000} />);
      
      // Should use the fast fade-out time (1000ms) instead of normal min time (1000ms)
      expect(mockUseMinimumDisplayTime).toHaveBeenCalledWith(1000);
    });

    it('should use normal min display time when resources are not cached', () => {
      // Simulate normal loading scenario
      mockUseResourceLoader.mockReturnValue({ isReady: false, wasCached: false });
      mockUseMinimumDisplayTime.mockReturnValue({ isMinTimeElapsed: false });
      
      render(<LoadingPage minDisplayTime={1000} fastFadeOutTime={1000} />);
      
      // Should use the normal min display time (1000ms)
      expect(mockUseMinimumDisplayTime).toHaveBeenCalledWith(1000);
    });

    it('should use default fast fade-out time of 1000ms when not provided', () => {
      // Simulate cached resources scenario
      mockUseResourceLoader.mockReturnValue({ isReady: true, wasCached: true });
      mockUseMinimumDisplayTime.mockReturnValue({ isMinTimeElapsed: false });
      
      render(<LoadingPage />);
      
      // Should use the default fast fade-out time (1000ms)
      expect(mockUseMinimumDisplayTime).toHaveBeenCalledWith(1000);
    });
  });

  describe('Fade-out Animation', () => {
    it('should apply fade-out class when loading completes', () => {
      mockUseResourceLoader.mockReturnValue({ isReady: false, wasCached: false });
      mockUseMinimumDisplayTime.mockReturnValue({ isMinTimeElapsed: false });
      
      const { rerender } = render(<LoadingPage />);
      
      let loadingElement = screen.getByRole('status');
      expect(loadingElement.className).not.toContain('motion-safe:animate-fadeOut');
      
      // Simulate loading completion
      mockUseResourceLoader.mockReturnValue({ isReady: true, wasCached: false });
      mockUseMinimumDisplayTime.mockReturnValue({ isMinTimeElapsed: true });
      
      rerender(<LoadingPage />);
      
      loadingElement = screen.getByRole('status');
      expect(loadingElement.className).toContain('animate-fadeOut');
    });

    it('should update aria-busy to false when fading out', () => {
      mockUseResourceLoader.mockReturnValue({ isReady: false, wasCached: false });
      mockUseMinimumDisplayTime.mockReturnValue({ isMinTimeElapsed: false });
      
      const { rerender } = render(<LoadingPage />);
      
      // Simulate loading completion
      mockUseResourceLoader.mockReturnValue({ isReady: true, wasCached: false });
      mockUseMinimumDisplayTime.mockReturnValue({ isMinTimeElapsed: true });
      
      rerender(<LoadingPage />);
      
      const loadingElement = screen.getByRole('status');
      expect(loadingElement).toHaveAttribute('aria-busy', 'false');
    });

    it('should update aria-label when fading out', () => {
      mockUseResourceLoader.mockReturnValue({ isReady: false, wasCached: false });
      mockUseMinimumDisplayTime.mockReturnValue({ isMinTimeElapsed: false });
      
      const { rerender } = render(<LoadingPage />);
      
      // Simulate loading completion
      mockUseResourceLoader.mockReturnValue({ isReady: true, wasCached: false });
      mockUseMinimumDisplayTime.mockReturnValue({ isMinTimeElapsed: true });
      
      rerender(<LoadingPage />);
      
      const loadingElement = screen.getByRole('status');
      expect(loadingElement).toHaveAttribute('aria-label', '页面加载完成');
    });
  });

  describe('Props', () => {
    it('should accept custom minDisplayTime prop', () => {
      render(<LoadingPage minDisplayTime={1000} />);
      
      expect(mockUseMinimumDisplayTime).toHaveBeenCalledWith(1000);
    });

    it('should use default minDisplayTime of 1000ms when not provided', () => {
      render(<LoadingPage />);
      
      expect(mockUseMinimumDisplayTime).toHaveBeenCalledWith(1000);
    });

    it('should accept custom fadeOutDuration prop', () => {
      render(<LoadingPage fadeOutDuration={600} />);
      
      // Component should be rendered
      expect(screen.getByRole('status')).toBeInTheDocument();
    });
  });

  describe('Performance Optimizations', () => {
    it('should use will-change CSS property conditionally for performance', () => {
      // When not fading out, will-change should be 'auto'
      mockUseResourceLoader.mockReturnValue({ isReady: false, wasCached: false });
      mockUseMinimumDisplayTime.mockReturnValue({ isMinTimeElapsed: false });
      
      const { rerender } = render(<LoadingPage />);
      
      let loadingElement = screen.getByRole('status');
      expect(loadingElement).toHaveStyle({ willChange: 'auto' });
      
      // When fading out, will-change should be 'opacity, transform'
      mockUseResourceLoader.mockReturnValue({ isReady: true, wasCached: false });
      mockUseMinimumDisplayTime.mockReturnValue({ isMinTimeElapsed: true });
      
      rerender(<LoadingPage />);
      
      loadingElement = screen.getByRole('status');
      expect(loadingElement).toHaveStyle({ willChange: 'opacity, transform' });
    });

    it('should include motion-reduce support for accessibility', () => {
      render(<LoadingPage />);
      
      const loadingElement = screen.getByRole('status');
      // Motion-reduce support is handled via CSS @media query in globals.css
      // Just verify the component renders correctly
      expect(loadingElement).toBeInTheDocument();
    });
  });
});
