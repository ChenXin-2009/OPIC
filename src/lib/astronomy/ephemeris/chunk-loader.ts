/**
 * Chunk loader with LRU caching for ephemeris data
 * 
 * This module handles loading ephemeris chunks with automatic
 * cache management using LRU (Least Recently Used) eviction strategy.
 */

import { EphemerisChunk } from './types';
import { EphemerisDataLoader } from './loader';

/**
 * LRU cache entry
 */
interface CacheEntry {
  key: string;
  chunk: EphemerisChunk;
  size: number;
  lastAccess: number;
}

/**
 * Chunk loader with LRU caching
 */
export class ChunkLoader {
  private cache: Map<string, CacheEntry> = new Map();
  private currentMemoryUsage: number = 0;
  private maxMemoryUsage: number = 10 * 1024 * 1024; // 10 MB
  private loader: EphemerisDataLoader;

  constructor(maxMemoryMB: number = 10) {
    this.maxMemoryUsage = maxMemoryMB * 1024 * 1024;
    this.loader = new EphemerisDataLoader();
  }

  /**
   * Load ephemeris chunk from URL
   * 
   * @param url - URL to chunk file
   * @returns Parsed ephemeris chunk
   */
  async loadChunk(url: string): Promise<EphemerisChunk> {
    // Check cache first
    const cached = this.getCached(url);
    if (cached) {
      return cached;
    }

    // Load from network
    const chunk = await this.loader.loadChunk(url);
    const chunkSize = this.estimateSize(chunk);

    // Evict old chunks if necessary
    while (this.currentMemoryUsage + chunkSize > this.maxMemoryUsage) {
      const evicted = this.evictLRU();
      if (!evicted) break; // Cannot evict more
    }

    // Add to cache
    const entry: CacheEntry = {
      key: url,
      chunk,
      size: chunkSize,
      lastAccess: Date.now()
    };

    this.cache.set(url, entry);
    this.currentMemoryUsage += chunkSize;

    return chunk;
  }

  /**
   * Get chunk from cache
   * 
   * @param key - Cache key (URL)
   * @returns Cached chunk or null
   */
  getCached(key: string): EphemerisChunk | null {
    const entry = this.cache.get(key);
    if (entry) {
      entry.lastAccess = Date.now();
      return entry.chunk;
    }
    return null;
  }

  /**
   * Evict least recently used chunk
   * 
   * @returns True if a chunk was evicted
   */
  evictLRU(): boolean {
    if (this.cache.size === 0) return false;

    // Find LRU entry
    let lruKey: string | null = null;
    let lruTime = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccess < lruTime) {
        lruTime = entry.lastAccess;
        lruKey = key;
      }
    }

    if (lruKey) {
      const entry = this.cache.get(lruKey)!;
      this.cache.delete(lruKey);
      this.currentMemoryUsage -= entry.size;
      return true;
    }

    return false;
  }

  /**
   * Evict old chunks to free memory
   */
  evictOldChunks(): void {
    while (this.currentMemoryUsage > this.maxMemoryUsage * 0.8) {
      if (!this.evictLRU()) break;
    }
  }

  /**
   * Estimate memory size of a chunk
   * 
   * @param chunk - Ephemeris chunk
   * @returns Estimated size in bytes
   */
  private estimateSize(chunk: EphemerisChunk): number {
    // Base size: metadata + arrays
    let size = 1000; // Base overhead

    // Estimate segment sizes
    for (const segment of chunk.segments) {
      if (segment.type === 'chebyshev') {
        // 3 coefficient arrays * (order+1) * 8 bytes
        size += 3 * (segment.order + 1) * 8;
      } else {
        // 4 vectors * 3 components * 8 bytes
        size += 4 * 3 * 8;
      }
      // Add overhead for segment object
      size += 100;
    }

    return size;
  }

  /**
   * Get current cache size
   * 
   * @returns Current memory usage in bytes
   */
  getCacheSize(): number {
    return this.currentMemoryUsage;
  }

  /**
   * Clear all cached chunks
   */
  clear(): void {
    this.cache.clear();
    this.currentMemoryUsage = 0;
  }

  /**
   * Get number of cached chunks
   * 
   * @returns Number of chunks in cache
   */
  getCacheCount(): number {
    return this.cache.size;
  }
}
