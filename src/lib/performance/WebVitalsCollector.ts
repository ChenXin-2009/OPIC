import type { WebVitalsMetrics } from './performance-types';

export class WebVitalsCollector {
  private webVitals: WebVitalsMetrics = {};

  async initialize(): Promise<void> {
    if (typeof window === 'undefined') return;

    try {
      const { onCLS, onFCP, onINP, onLCP, onTTFB } = await import('web-vitals');

      onCLS((metric) => { this.webVitals.CLS = metric.value; });
      onFCP((metric) => { this.webVitals.FCP = metric.value; });
      onINP((metric) => { this.webVitals.INP = metric.value; });
      onLCP((metric) => { this.webVitals.LCP = metric.value; });
      onTTFB((metric) => { this.webVitals.TTFB = metric.value; });
    } catch (error) {
      console.warn('Web Vitals 初始化失败:', error);
    }
  }

  getMetrics(): WebVitalsMetrics {
    return { ...this.webVitals };
  }

  reset(): void {
    this.webVitals = {};
  }
}
