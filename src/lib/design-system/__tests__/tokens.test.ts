import { getThemeColor, designTokens, colors, spacing, zIndex } from '../tokens';

describe('design-tokens', () => {
  describe('constants', () => {
    it('exports designTokens with all categories', () => {
      expect(designTokens.colors).toBeDefined();
      expect(designTokens.spacing).toBeDefined();
      expect(designTokens.zIndex).toBeDefined();
    });

    it('has spacing values', () => {
      expect(spacing.md).toBe('16px');
      expect(spacing.xl).toBe('32px');
    });

    it('has z-index values', () => {
      expect(zIndex.modal).toBe(1400);
      expect(zIndex.tooltip).toBe(1600);
    });

    it('has primary colors', () => {
      expect(colors.primary.light).toBe('#007AFF');
    });
  });

  describe('getThemeColor', () => {
    it('returns light theme color', () => {
      expect(getThemeColor('light', 'primary.light')).toBe('#007AFF');
    });

    it('returns dark theme color', () => {
      expect(getThemeColor('dark', 'primary.dark')).toBe('#0A84FF');
    });

    it('returns empty string for unknown color path', () => {
      expect(getThemeColor('light', 'nonexistent.path')).toBe('');
    });

    it('reads window-controls color directly', () => {
      expect(getThemeColor('light', 'windowControls.close')).toBe('#FF5F57');
    });
  });
});
