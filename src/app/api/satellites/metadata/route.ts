/**
 * 卫星元数据API路由
 * 
 * GET /api/satellites/metadata
 * GET /api/satellites/metadata?noradId={noradId}
 * 
 * 功能:
 * - 提供卫星详细信息(国家、所有者、发射场等)
 * - 数据来源: UCS卫星数据库
 * - 实现缓存机制
 */

import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import { parse } from 'csv-parse/sync';

// UCS数据库URL - 使用多个备用源
const UCS_DATA_URLS = [
  // 备用源1: 直接从UCS网站下载(需要检查最新URL)
  'https://www.ucsusa.org/media/11492/download',
  // 备用源2: GitHub镜像
  'https://raw.githubusercontent.com/planet4589/space-track-notebook/master/data/UCS-Satellite-Database-5-1-2023.txt',
  // 备用源3: 旧版本作为fallback
  'https://raw.githubusercontent.com/planet4589/space-track-notebook/master/data/UCS-Satellite-Database-1-1-2023.txt',
];

// 更新间隔: 30天
const UPDATE_INTERVAL = 30 * 24 * 60 * 60 * 1000;

// ============ 类型定义 ============

interface SatelliteMetadata {
  noradId: number;
  name: string;
  country?: string;
  owner?: string;
  operator?: string;
  users?: string;
  purpose?: string;
  launchDate?: string;
  launchSite?: string;
  launchVehicle?: string;
  launchMass?: number;
  dryMass?: number;
  power?: number;
  expectedLifetime?: string;
  contractor?: string;
  contractorCountry?: string;
  cosparId?: string;
  orbitClass?: string;
  orbitType?: string;
}

type MetadataMap = Record<number, SatelliteMetadata>;

// ============ 缓存 ============

let metadataCache: MetadataMap | null = null;
let cacheLoadTime: number = 0;
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24小时

// 自动更新标志
let isUpdating = false;
let lastUpdateCheck = 0;

// ============ 辅助函数 ============

/**
 * 下载UCS数据(支持多个备用源)
 */
async function downloadUCSData(): Promise<string> {
  let lastError: Error | null = null;
  
  // 尝试所有备用源
  for (const url of UCS_DATA_URLS) {
    try {
      console.log(`[Metadata API] 尝试下载: ${url}`);
      const data = await downloadFromURL(url);
      console.log(`[Metadata API] 下载成功: ${url}`);
      return data;
    } catch (error) {
      console.warn(`[Metadata API] 下载失败: ${url}`, error);
      lastError = error instanceof Error ? error : new Error(String(error));
    }
  }
  
  // 所有源都失败
  throw lastError || new Error('所有数据源均不可用');
}

/**
 * 从单个URL下载文件
 */
function downloadFromURL(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        const redirectUrl = response.headers.location;
        if (redirectUrl) {
          downloadFromURL(redirectUrl).then(resolve).catch(reject);
          return;
        }
      }

      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}`));
        return;
      }

      let data = '';
      response.on('data', (chunk) => { data += chunk; });
      response.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

/**
 * 解析UCS CSV数据
 */
function parseUCSData(csvContent: string): MetadataMap {
  interface UCSRecord {
    'Name'?: string;
    'Country/Org of UN Registry'?: string;
    'Operator/Owner'?: string;
    'Users'?: string;
    'Purpose'?: string;
    'Date of Launch'?: string;
    'Launch Site'?: string;
    'Launch Vehicle'?: string;
    'Launch Mass (kg)'?: string;
    'Expected Lifetime (years)'?: string;
    'Contractor'?: string;
    'Country of Contractor'?: string;
    'COSPAR Number'?: string;
    'NORAD Number'?: string;
  }

  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    delimiter: '\t',
  }) as UCSRecord[];

  const metadata: MetadataMap = {};

  for (const record of records) {
    const noradIdStr = record['NORAD Number'];
    if (!noradIdStr) continue;

    const noradId = parseInt(noradIdStr, 10);
    if (isNaN(noradId)) continue;

    const name = record['Name']?.trim();
    if (!name) continue;

    metadata[noradId] = {
      noradId,
      name,
      country: record['Country/Org of UN Registry']?.trim() || undefined,
      owner: record['Operator/Owner']?.trim() || undefined,
      operator: record['Operator/Owner']?.trim() || undefined,
      users: record['Users']?.trim() || undefined,
      purpose: record['Purpose']?.trim() || undefined,
      launchDate: record['Date of Launch']?.trim() || undefined,
      launchSite: record['Launch Site']?.trim() || undefined,
      launchVehicle: record['Launch Vehicle']?.trim() || undefined,
      launchMass: parseFloat(record['Launch Mass (kg)']?.replace(/,/g, '') || '') || undefined,
      expectedLifetime: record['Expected Lifetime (years)']?.trim() || undefined,
      contractor: record['Contractor']?.trim() || undefined,
      contractorCountry: record['Country of Contractor']?.trim() || undefined,
      cosparId: record['COSPAR Number']?.trim() || undefined,
    };
  }

  return metadata;
}

/**
 * 自动更新元数据
 */
async function autoUpdateMetadata(): Promise<void> {
  if (isUpdating) return;

  const now = Date.now();
  if (now - lastUpdateCheck < UPDATE_INTERVAL) return;

  isUpdating = true;
  lastUpdateCheck = now;

  try {
    console.log('[Metadata API] 开始更新UCS数据...');
    
    const csvContent = await downloadUCSData();
    const metadata = parseUCSData(csvContent);
    
    // 更新内存缓存
    metadataCache = metadata;
    cacheLoadTime = now;
    
    console.log(`[Metadata API] 更新完成: ${Object.keys(metadata).length} 颗卫星`);
    
    // 尝试保存到文件(仅开发环境)
    try {
      const filePath = path.join(process.cwd(), 'public', 'data', 'satellite-metadata.json');
      const dir = path.dirname(filePath);
      
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      fs.writeFileSync(filePath, JSON.stringify(metadata, null, 2), 'utf-8');
      console.log('[Metadata API] 已保存到文件(仅开发环境)');
    } catch (writeError) {
      // 生产环境无法写入,忽略
      console.log('[Metadata API] 无法写入文件(生产环境正常)');
    }
  } catch (error) {
    console.error('[Metadata API] 自动更新失败:', error);
  } finally {
    isUpdating = false;
  }
}

/**
 * 加载元数据
 */
async function loadMetadata(): Promise<MetadataMap> {
  // 开发环境:每次都重新读取文件
  if (process.env.NODE_ENV === 'development') {
    const filePath = path.join(process.cwd(), 'public', 'data', 'satellite-metadata.json');
    
    if (fs.existsSync(filePath)) {
      try {
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const data = JSON.parse(fileContent) as MetadataMap;
        console.log(`[Metadata API] 从文件加载元数据: ${Object.keys(data).length} 颗卫星`);
        return data;
      } catch (error) {
        console.error('[Metadata API] 文件加载失败:', error);
      }
    }
  }
  
  // 生产环境:检查内存缓存
  if (metadataCache && Date.now() - cacheLoadTime < CACHE_DURATION) {
    return metadataCache;
  }

  // 尝试从文件加载(仅开发环境)
  const filePath = path.join(process.cwd(), 'public', 'data', 'satellite-metadata.json');
  
  if (fs.existsSync(filePath)) {
    try {
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(fileContent) as MetadataMap;
      
      metadataCache = data;
      cacheLoadTime = Date.now();
      
      console.log(`[Metadata API] 从文件加载元数据: ${Object.keys(data).length} 颗卫星`);
      
      // 后台检查更新(仅在缓存过期时)
      if (Date.now() - lastUpdateCheck > UPDATE_INTERVAL) {
        autoUpdateMetadata().catch(err => {
          console.error('[Metadata API] 后台更新失败:', err);
        });
      }
      
      return data;
    } catch (error) {
      console.error('[Metadata API] 文件加载失败,尝试下载:', error);
    }
  }

  // 文件不存在或加载失败,从网络下载
  console.log('[Metadata API] 从网络下载UCS数据...');
  
  try {
    const csvContent = await downloadUCSData();
    const data = parseUCSData(csvContent);
    
    metadataCache = data;
    cacheLoadTime = Date.now();
    lastUpdateCheck = Date.now();
    
    console.log(`[Metadata API] 下载完成: ${Object.keys(data).length} 颗卫星`);
    
    // 尝试保存到文件(仅开发环境,生产环境会失败但不影响功能)
    try {
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
      console.log('[Metadata API] 已保存到文件(仅开发环境)');
    } catch (writeError) {
      // 生产环境(Vercel)无法写入文件,忽略错误
      console.log('[Metadata API] 无法写入文件(生产环境正常)');
    }
    
    return data;
  } catch (error) {
    console.error('[Metadata API] 下载失败:', error);
    
    // 返回空数据,不阻塞服务
    return {};
  }
}

// ============ API处理器 ============

/**
 * GET /api/satellites/metadata
 * 
 * 查询参数:
 * - noradId: 卫星NORAD ID(可选)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const noradIdParam = searchParams.get('noradId');

    // 加载元数据
    const metadata = await loadMetadata();

    // 如果指定了noradId,返回单个卫星的元数据
    if (noradIdParam) {
      const noradId = parseInt(noradIdParam, 10);
      
      if (isNaN(noradId)) {
        return NextResponse.json(
          {
            error: 'INVALID_PARAMETER',
            message: '无效的NORAD ID',
            statusCode: 400,
          },
          { status: 400 }
        );
      }

      const satelliteMetadata = metadata[noradId];
      
      if (!satelliteMetadata) {
        return NextResponse.json(
          {
            error: 'NOT_FOUND',
            message: '未找到卫星元数据',
            statusCode: 404,
          },
          { status: 404 }
        );
      }

      return NextResponse.json(satelliteMetadata, {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=86400', // 缓存24小时
        },
      });
    }

    // 返回所有元数据
    return NextResponse.json(
      {
        count: Object.keys(metadata).length,
        metadata,
      },
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=86400', // 缓存24小时
        },
      }
    );

  } catch (error) {
    console.error('[Metadata API] 请求处理失败:', error);

    const errorMessage = error instanceof Error ? error.message : '未知错误';

    return NextResponse.json(
      {
        error: 'INTERNAL_SERVER_ERROR',
        message: `获取元数据失败: ${errorMessage}`,
        statusCode: 500,
      },
      { status: 500 }
    );
  }
}
