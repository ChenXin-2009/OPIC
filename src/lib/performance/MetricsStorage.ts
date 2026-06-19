/**
 * 性能指标存储 (Metrics Storage)
 *
 * 将性能指标持久化到 localStorage，支持历史数据查询和清理。
 * 每条记录包含时间戳和完整的性能指标快照。
 */

import type { PerformanceMetrics } from './performance-types';

interface StoredMetricsEntry {
  timestamp: number;
  metrics: Omit<PerformanceMetrics, 'customMetrics'> & {
    customMetrics: Record<string, number>;
  };
}

/**
 * 性能指标存储 — 将性能快照持久化到 localStorage。
 */
export class MetricsStorage {
  private readonly STORAGE_KEY = 'opic_performance_metrics';
  private readonly RETENTION_DAYS = 7;
  private readonly MAX_STORAGE_MB = 10;
  private metricsHistory: StoredMetricsEntry[] = [];

  loadFromStorage(): void {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;

    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        this.metricsHistory = JSON.parse(stored);
      }
    } catch (error) {
      console.error('加载性能指标失败:', error);
      this.metricsHistory = [];
    }
  }

  saveToStorage(): void {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;

    try {
      const dataStr = JSON.stringify(this.metricsHistory);
      const sizeInMB = new Blob([dataStr]).size / (1024 * 1024);

      while (sizeInMB > this.MAX_STORAGE_MB && this.metricsHistory.length > 0) {
        this.metricsHistory.shift();
      }

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.metricsHistory));
    } catch (error) {
      console.error('保存性能指标失败:', error);

      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        this.metricsHistory = this.metricsHistory.slice(Math.floor(this.metricsHistory.length / 2));
        try {
          localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.metricsHistory));
        } catch (retryError) {
          console.error('重试保存性能指标失败:', retryError);
        }
      }
    }
  }

  cleanOldMetrics(): void {
    const cutoffTime = Date.now() - (this.RETENTION_DAYS * 24 * 60 * 60 * 1000);
    this.metricsHistory = this.metricsHistory.filter(entry => entry.timestamp > cutoffTime);
    this.saveToStorage();
  }

  addEntry(metrics: PerformanceMetrics): void {
    const { customMetrics, ...metricsWithoutMap } = metrics;
    this.metricsHistory.push({
      timestamp: metrics.timestamp,
      metrics: {
        ...metricsWithoutMap,
        customMetrics: Object.fromEntries(customMetrics),
      },
    });
  }

  getHistory(durationMs?: number): StoredMetricsEntry[] {
    if (!durationMs) return [...this.metricsHistory];
    const cutoffTime = Date.now() - durationMs;
    return this.metricsHistory.filter(entry => entry.timestamp > cutoffTime);
  }

  clearOld(retentionDays: number): void {
    const cutoffTime = Date.now() - (retentionDays * 24 * 60 * 60 * 1000);
    this.metricsHistory = this.metricsHistory.filter(entry => entry.timestamp > cutoffTime);
    this.saveToStorage();
  }

  reset(): void {
    this.metricsHistory = [];
  }
}
