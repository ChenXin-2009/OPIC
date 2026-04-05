/**
 * 航班数据 API 代理路由
 *
 * GET /api/flights?lamin=&lomin=&lamax=&lomax=
 *
 * 功能:
 * - 代理 OpenSky Network API，绕过浏览器 CORS 限制
 * - 服务端缓存（默认 15 秒，与 OpenSky 匿名限制对齐）
 * - 支持 bounding box 过滤
 */

import { NextRequest, NextResponse } from 'next/server';

const OPENSKY_BASE = 'https://opensky-network.org/api';

// 匿名用户最短请求间隔 10s，缓存 15s 留余量
const CACHE_TTL = 15 * 1000;

interface CacheEntry {
  data: unknown;
  timestamp: number;
}

// 简单内存缓存（按 bbox key 分组）
const cache = new Map<string, CacheEntry>();

function isCacheValid(entry: CacheEntry | undefined): boolean {
  return !!entry && Date.now() - entry.timestamp < CACHE_TTL;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const lamin = searchParams.get('lamin');
  const lomin = searchParams.get('lomin');
  const lamax = searchParams.get('lamax');
  const lomax = searchParams.get('lomax');
  const username = searchParams.get('username');
  const password = searchParams.get('password');

  // 构建 OpenSky 请求 URL
  const params = new URLSearchParams();
  if (lamin) params.set('lamin', lamin);
  if (lomin) params.set('lomin', lomin);
  if (lamax) params.set('lamax', lamax);
  if (lomax) params.set('lomax', lomax);

  const cacheKey = params.toString() || 'global';
  const cached = cache.get(cacheKey);

  if (isCacheValid(cached)) {
    return NextResponse.json(cached!.data, {
      headers: { 'X-Cache': 'HIT' },
    });
  }

  try {
    const url = `${OPENSKY_BASE}/states/all${params.size ? `?${params}` : ''}`;

    const headers: HeadersInit = {
      'User-Agent': 'CXIC/1.0',
    };

    // 如果提供了凭证，使用 Basic Auth
    if (username && password) {
      headers['Authorization'] = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
    }

    const response = await fetch(url, {
      headers,
      // 服务端 fetch 超时 8 秒
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `OpenSky API error: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();

    // 写入缓存
    cache.set(cacheKey, { data, timestamp: Date.now() });

    // 定期清理过期缓存
    if (cache.size > 50) {
      for (const [key, entry] of cache) {
        if (!isCacheValid(entry)) cache.delete(key);
      }
    }

    return NextResponse.json(data, {
      headers: { 'X-Cache': 'MISS' },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[API/flights] fetch failed:', msg);

    // 如果有过期缓存，降级返回
    if (cached) {
      return NextResponse.json(cached.data, {
        headers: { 'X-Cache': 'STALE' },
      });
    }

    return NextResponse.json(
      { error: `获取航班数据失败: ${msg}` },
      { status: 502 }
    );
  }
}
