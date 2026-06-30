import {
  enableReducedMotion,
  disableReducedMotion,
  toggleReducedMotion,
  isReducedMotionEnabled,
  prefersReducedMotion,
  initializeReducedMotion,
  getAnimationDuration,
  shouldAnimate,
  watchSystemPreference,
} from '../reduced-motion';

beforeEach(() => {
  document.documentElement.classList.remove('reduce-motion');
  try { localStorage.removeItem('opic_reduced_motion_enabled'); } catch {}
});

describe('enableReducedMotion', () => {
  it('should add CSS class and persist', () => {
    enableReducedMotion();
    expect(document.documentElement.classList.contains('reduce-motion')).toBe(true);
    expect(localStorage.getItem('opic_reduced_motion_enabled')).toBe('true');
  });
});

describe('disableReducedMotion', () => {
  it('should remove CSS class and persist', () => {
    enableReducedMotion();
    disableReducedMotion();
    expect(document.documentElement.classList.contains('reduce-motion')).toBe(false);
    expect(localStorage.getItem('opic_reduced_motion_enabled')).toBe('false');
  });
});

describe('toggleReducedMotion', () => {
  it('should toggle on and off', () => {
    expect(toggleReducedMotion()).toBe(true);
    expect(isReducedMotionEnabled()).toBe(true);
    expect(toggleReducedMotion()).toBe(false);
    expect(isReducedMotionEnabled()).toBe(false);
  });
});

describe('isReducedMotionEnabled', () => {
  it('should return correct state', () => {
    expect(isReducedMotionEnabled()).toBe(false);
    enableReducedMotion();
    expect(isReducedMotionEnabled()).toBe(true);
  });
});

describe('prefersReducedMotion', () => {
  it('should return false by default (mocked)', () => {
    expect(prefersReducedMotion()).toBe(false);
  });
});

describe('initializeReducedMotion', () => {
  it('should enable from localStorage true', () => {
    localStorage.setItem('opic_reduced_motion_enabled', 'true');
    initializeReducedMotion();
    expect(isReducedMotionEnabled()).toBe(true);
  });

  it('should not enable from localStorage false', () => {
    localStorage.setItem('opic_reduced_motion_enabled', 'false');
    initializeReducedMotion();
    expect(isReducedMotionEnabled()).toBe(false);
  });
});

describe('getAnimationDuration', () => {
  it('should return 0 when reduced motion enabled', () => {
    enableReducedMotion();
    expect(getAnimationDuration(500)).toBe(0);
  });

  it('should return duration when not enabled', () => {
    expect(getAnimationDuration(500)).toBe(500);
  });
});

describe('shouldAnimate', () => {
  it('should return false when reduced motion enabled', () => {
    enableReducedMotion();
    expect(shouldAnimate()).toBe(false);
  });

  it('should return true when not enabled', () => {
    expect(shouldAnimate()).toBe(true);
  });
});

describe('watchSystemPreference', () => {
  it('should return cleanup function', () => {
    const cleanup = watchSystemPreference();
    expect(cleanup).toBeInstanceOf(Function);
    cleanup();
  });
});
