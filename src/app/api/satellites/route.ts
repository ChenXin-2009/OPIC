/**
 * 卫星数据API路由
 * 
 * GET /api/satellites?category={category}
 * 
 * 功能:
 * - 从Celestrak获取TLE数据
 * - 实现2小时缓存机制
 * - 实现速率限制(每IP每分钟10次请求)
 * - 错误降级(返回缓存数据)
 */

import { NextRequest, NextResponse } from 'next/server';
import { celestrakClient } from '@/lib/server/celestrakClient';
import { SatelliteCategory, SatelliteAPIResponse, TLEData } from '@/lib/types/satellite';

// ============ 缓存配置 ============

/**
 * 缓存时间: 2小时
 */
const CACHE_DURATION = 2 * 60 * 60 * 1000; // 2小时(毫秒)

/**
 * 数据缓存
 * 键: category, 值: { data, timestamp }
 */
interface CacheEntry {
  data: TLEData[];
  timestamp: number;
  lastModified: string;
}

const dataCache = new Map<string, CacheEntry>();

// ============ 速率限制配置 ============

/**
 * 速率限制: 每IP每分钟10次请求
 */
const RATE_LIMIT_WINDOW = 60 * 1000; // 1分钟(毫秒)
const RATE_LIMIT_MAX_REQUESTS = 10;

/**
 * 速率限制记录
 * 键: IP地址, 值: 请求时间戳数组
 */
const rateLimitMap = new Map<string, number[]>();

/**
 * 清理过期的速率限制记录(每5分钟)
 */
setInterval(() => {
  const now = Date.now();
  for (const [ip, timestamps] of rateLimitMap.entries()) {
    const validTimestamps = timestamps.filter(t => now - t < RATE_LIMIT_WINDOW);
    if (validTimestamps.length === 0) {
      rateLimitMap.delete(ip);
    } else {
      rateLimitMap.set(ip, validTimestamps);
    }
  }
}, 5 * 60 * 1000);

// ============ 辅助函数 ============

/**
 * 获取客户端IP地址
 */
function getClientIP(request: NextRequest): string {
  // 尝试从各种头部获取真实IP
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  const realIP = request.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }

  // 开发环境默认IP
  return '127.0.0.1';
}

/**
 * 检查速率限制
 * @returns true表示超过限制
 */
function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const timestamps = rateLimitMap.get(ip) || [];

  // 过滤掉窗口外的请求
  const validTimestamps = timestamps.filter(t => now - t < RATE_LIMIT_WINDOW);

  // 检查是否超过限制
  if (validTimestamps.length >= RATE_LIMIT_MAX_REQUESTS) {
    return true; // 超过限制
  }

  // 记录本次请求
  validTimestamps.push(now);
  rateLimitMap.set(ip, validTimestamps);

  return false; // 未超过限制
}

/**
 * 检查缓存是否有效
 */
function isCacheValid(cacheEntry: CacheEntry | undefined): boolean {
  if (!cacheEntry) {
    return false;
  }

  const now = Date.now();
  return now - cacheEntry.timestamp < CACHE_DURATION;
}

/**
 * 验证类别参数
 */
function validateCategory(category: string | null): SatelliteCategory {
  if (!category) {
    return SatelliteCategory.ACTIVE; // 默认类别
  }

  // 检查是否是有效的类别
  const validCategories = Object.values(SatelliteCategory);
  if (validCategories.includes(category as SatelliteCategory)) {
    return category as SatelliteCategory;
  }

  return SatelliteCategory.ACTIVE; // 无效类别使用默认值
}

// ============ API处理器 ============

/**
 * GET /api/satellites
 * 
 * 查询参数:
 * - category: 卫星类别(可选,默认为'active')
 */
export async function GET(request: NextRequest) {
  try {
    // 1. 获取客户端IP
    const clientIP = getClientIP(request);

    // 2. 检查速率限制
    if (checkRateLimit(clientIP)) {
      console.warn(`[API] 速率限制: IP ${clientIP} 超过限制`);
      return NextResponse.json(
        {
          error: 'RATE_LIMIT_EXCEEDED',
          message: '请求过于频繁,请稍后再试',
          statusCode: 429,
        },
        {
          status: 429,
          headers: {
            'Retry-After': '60', // 建议60秒后重试
          },
        }
      );
    }

    // 3. 解析和验证参数
    const { searchParams } = new URL(request.url);
    const category = validateCategory(searchParams.get('category'));

    console.log(`[API] 收到请求: category=${category}, IP=${clientIP}`);

    // 4. 检查缓存
    const cacheKey = category;
    const cachedEntry = dataCache.get(cacheKey);

    if (isCacheValid(cachedEntry)) {
      console.log(`[API] 返回缓存数据: ${cachedEntry!.data.length} 颗卫星`);

      const response: SatelliteAPIResponse = {
        satellites: cachedEntry!.data,
        count: cachedEntry!.data.length,
        category,
        lastUpdate: cachedEntry!.lastModified,
        cacheExpiry: new Date(cachedEntry!.timestamp + CACHE_DURATION).toISOString(),
      };

      return NextResponse.json(response, {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': `public, max-age=${Math.floor(CACHE_DURATION / 1000)}`,
          'Last-Modified': cachedEntry!.lastModified,
        },
      });
    }

    // 5. 从Celestrak获取新数据
    console.log(`[API] 缓存过期或不存在,从Celestrak获取数据...`);

    try {
      const satellites = await celestrakClient.fetchTLE(category);
      const now = Date.now();
      const lastModified = new Date(now).toUTCString();

      // 6. 更新缓存
      dataCache.set(cacheKey, {
        data: satellites,
        timestamp: now,
        lastModified,
      });

      console.log(`[API] 成功获取并缓存 ${satellites.length} 颗卫星数据`);

      const response: SatelliteAPIResponse = {
        satellites,
        count: satellites.length,
        category,
        lastUpdate: new Date(now).toISOString(),
        cacheExpiry: new Date(now + CACHE_DURATION).toISOString(),
      };

      return NextResponse.json(response, {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': `public, max-age=${Math.floor(CACHE_DURATION / 1000)}`,
          'Last-Modified': lastModified,
        },
      });

    } catch (fetchError) {
      // 7. 错误降级: 如果有旧缓存,返回旧缓存
      if (cachedEntry) {
        console.error(`[API] Celestrak请求失败,返回过期缓存数据`, fetchError);

        const response: SatelliteAPIResponse = {
          satellites: cachedEntry.data,
          count: cachedEntry.data.length,
          category,
          lastUpdate: cachedEntry.lastModified,
          cacheExpiry: new Date(cachedEntry.timestamp + CACHE_DURATION).toISOString(),
        };

        return NextResponse.json(response, {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': `public, max-age=${Math.floor(CACHE_DURATION / 1000)}`,
            'Last-Modified': cachedEntry.lastModified,
            'X-Cache-Status': 'stale', // 标记为过期缓存
            'X-Error': 'upstream-failed', // 标记上游失败
          },
        });
      }

      // 8. 没有缓存可用,返回错误
      throw fetchError;
    }

  } catch (error) {
    // 9. 全局错误处理
    console.error('[API] 请求处理失败:', error);

    const errorMessage = error instanceof Error ? error.message : '未知错误';

    return NextResponse.json(
      {
        error: 'INTERNAL_SERVER_ERROR',
        message: `获取卫星数据失败: ${errorMessage}`,
        statusCode: 500,
      },
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
}
