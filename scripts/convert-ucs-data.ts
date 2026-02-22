/**
 * UCS卫星数据库自动下载和转换脚本
 * 
 * 功能:
 * 1. 自动从GitHub下载UCS数据库CSV文件
 * 2. 解析并转换为JSON格式
 * 3. 保存到public/data/satellite-metadata.json
 * 
 * 使用方法:
 * - 运行: npx tsx scripts/convert-ucs-data.ts
 * - 或: npm run convert-ucs-data
 */

import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';
import * as https from 'https';

// UCS数据库的备用地址
const UCS_DATA_URLS = [
  'https://www.ucsusa.org/media/11492/download',
  'https://raw.githubusercontent.com/planet4589/space-track-notebook/master/data/UCS-Satellite-Database-5-1-2023.txt',
  'https://raw.githubusercontent.com/planet4589/space-track-notebook/master/data/UCS-Satellite-Database-1-1-2023.txt',
];

// ============ 类型定义 ============

interface UCSRecord {
  'Name'?: string;
  'Country/Org of UN Registry'?: string;
  'Operator/Owner'?: string;
  'Users'?: string;
  'Purpose'?: string;
  'Class of Orbit'?: string;
  'Type of Orbit'?: string;
  'Perigee (km)'?: string;
  'Apogee (km)'?: string;
  'Eccentricity'?: string;
  'Inclination (degrees)'?: string;
  'Period (minutes)'?: string;
  'Launch Mass (kg)'?: string;
  'Dry Mass (kg)'?: string;
  'Power (watts)'?: string;
  'Date of Launch'?: string;
  'Expected Lifetime (years)'?: string;
  'Contractor'?: string;
  'Country of Contractor'?: string;
  'Launch Site'?: string;
  'Launch Vehicle'?: string;
  'COSPAR Number'?: string;
  'NORAD Number'?: string;
  'Comments'?: string;
  'Source'?: string;
}

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

// ============ 下载函数 ============

/**
 * 从URL下载文件(支持多个备用源)
 */
function downloadFile(urls: string[]): Promise<string> {
  return new Promise(async (resolve, reject) => {
    let lastError: Error | null = null;
    
    for (const url of urls) {
      try {
        console.log(`正在尝试: ${url}`);
        const data = await downloadFromURL(url);
        console.log(`下载完成: ${(data.length / 1024).toFixed(2)} KB`);
        resolve(data);
        return;
      } catch (error) {
        console.warn(`下载失败: ${error instanceof Error ? error.message : error}`);
        lastError = error instanceof Error ? error : new Error(String(error));
      }
    }
    
    reject(lastError || new Error('所有数据源均不可用'));
  });
}

/**
 * 从单个URL下载
 */
function downloadFromURL(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        // 处理重定向
        const redirectUrl = response.headers.location;
        if (redirectUrl) {
          console.log(`重定向到: ${redirectUrl}`);
          downloadFromURL(redirectUrl).then(resolve).catch(reject);
          return;
        }
      }

      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}`));
        return;
      }

      let data = '';
      response.on('data', (chunk) => {
        data += chunk;
      });

      response.on('end', () => {
        resolve(data);
      });
    }).on('error', (error) => {
      reject(error);
    });
  });
}

// ============ 辅助函数 ============

/**
 * 解析数字字段
 */
function parseNumber(value: string | undefined): number | undefined {
  if (!value || value.trim() === '' || value.trim() === 'N/A') {
    return undefined;
  }
  const num = parseFloat(value.replace(/,/g, ''));
  return isNaN(num) ? undefined : num;
}

/**
 * 清理字符串字段
 */
function cleanString(value: string | undefined): string | undefined {
  if (!value || value.trim() === '' || value.trim() === 'N/A') {
    return undefined;
  }
  return value.trim();
}

/**
 * 转换UCS记录为元数据格式
 */
function convertRecord(record: UCSRecord): SatelliteMetadata | null {
  const noradIdStr = record['NORAD Number'];
  if (!noradIdStr) {
    return null;
  }

  const noradId = parseInt(noradIdStr, 10);
  if (isNaN(noradId)) {
    return null;
  }

  const name = cleanString(record['Name']);
  if (!name) {
    return null;
  }

  return {
    noradId,
    name,
    country: cleanString(record['Country/Org of UN Registry']),
    owner: cleanString(record['Operator/Owner']),
    operator: cleanString(record['Operator/Owner']),
    users: cleanString(record['Users']),
    purpose: cleanString(record['Purpose']),
    launchDate: cleanString(record['Date of Launch']),
    launchSite: cleanString(record['Launch Site']),
    launchVehicle: cleanString(record['Launch Vehicle']),
    launchMass: parseNumber(record['Launch Mass (kg)']),
    dryMass: parseNumber(record['Dry Mass (kg)']),
    power: parseNumber(record['Power (watts)']),
    expectedLifetime: cleanString(record['Expected Lifetime (years)']),
    contractor: cleanString(record['Contractor']),
    contractorCountry: cleanString(record['Country of Contractor']),
    cosparId: cleanString(record['COSPAR Number']),
    orbitClass: cleanString(record['Class of Orbit']),
    orbitType: cleanString(record['Type of Orbit']),
  };
}

// ============ 主函数 ============

async function main() {
  console.log('=== UCS卫星数据库自动下载和转换工具 ===\n');

  // 1. 下载CSV文件
  let csvContent: string;
  try {
    csvContent = await downloadFile(UCS_DATA_URLS);
  } catch (error) {
    console.error('下载失败:', error);
    console.error('\n备选方案: 手动下载UCS数据库');
    console.error('1. 访问: https://www.ucs.org/resources/satellite-database');
    console.error('2. 下载CSV文件');
    console.error('3. 保存到: scripts/data/ucs-satellite-database.csv');
    console.error('4. 重新运行此脚本');
    process.exit(1);
  }

  console.log('\n开始解析数据...');

  // 2. 解析CSV
  let records: UCSRecord[];
  try {
    records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      delimiter: '\t', // UCS使用制表符分隔
    });
    console.log(`解析成功: ${records.length} 条记录\n`);
  } catch (error) {
    console.error('CSV解析失败:', error);
    process.exit(1);
  }

  // 3. 转换数据
  const metadata: SatelliteMetadata[] = [];
  const errors: string[] = [];

  for (const record of records) {
    try {
      const converted = convertRecord(record);
      if (converted) {
        metadata.push(converted);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      errors.push(`转换失败 (${record['Name']}): ${errorMsg}`);
    }
  }

  console.log(`转换完成: ${metadata.length} 颗卫星`);
  if (errors.length > 0) {
    console.warn(`警告: ${errors.length} 条记录转换失败`);
    errors.slice(0, 5).forEach(err => console.warn(`  - ${err}`));
    if (errors.length > 5) {
      console.warn(`  ... 还有 ${errors.length - 5} 个错误`);
    }
  }

  // 5. 创建索引(按NORAD ID)
  const metadataMap: Record<number, SatelliteMetadata> = {};
  for (const item of metadata) {
    metadataMap[item.noradId] = item;
  }

  // 6. 输出统计信息
  console.log('\n=== 数据统计 ===');
  console.log(`总卫星数: ${metadata.length}`);
  
  const countryCounts: Record<string, number> = {};
  for (const item of metadata) {
    if (item.country) {
      countryCounts[item.country] = (countryCounts[item.country] || 0) + 1;
    }
  }
  
  const topCountries = Object.entries(countryCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  
  console.log('\n前10个国家/组织:');
  topCountries.forEach(([country, count]) => {
    console.log(`  ${country}: ${count}`);
  });

  // 7. 保存JSON文件
  const outputDir = path.join(__dirname, '..', 'public', 'data');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = path.join(outputDir, 'satellite-metadata.json');
  fs.writeFileSync(
    outputPath,
    JSON.stringify(metadataMap, null, 2),
    'utf-8'
  );

  console.log(`\n输出文件: ${outputPath}`);
  console.log(`文件大小: ${(fs.statSync(outputPath).size / 1024).toFixed(2)} KB`);
  console.log('\n转换完成!');
}

// 运行主函数
main().catch(error => {
  console.error('执行失败:', error);
  process.exit(1);
});
