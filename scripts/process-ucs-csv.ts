/**
 * 处理UCS CSV数据并转换为JSON格式
 * 
 * 使用方法: npx tsx scripts/process-ucs-csv.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';

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

function cleanString(value: string | undefined): string | undefined {
  if (!value || value.trim() === '' || value.trim() === 'N/A' || value.trim() === 'NR') {
    return undefined;
  }
  return value.trim();
}

function parseNumber(value: string | undefined): number | undefined {
  if (!value || value.trim() === '' || value.trim() === 'N/A') {
    return undefined;
  }
  const num = parseFloat(value.replace(/,/g, ''));
  return isNaN(num) ? undefined : num;
}

async function main() {
  console.log('=== UCS CSV数据处理工具 ===\n');

  const inputPath = path.join(__dirname, '..', 'temp-ucs-data', 'UCS data', 'csv files', 'UCS_Satellite_Database-5-1-22.csv');
  const outputPath = path.join(__dirname, '..', 'public', 'data', 'satellite-metadata.json');

  // 读取CSV文件
  console.log('读取CSV文件...');
  const csvContent = fs.readFileSync(inputPath, 'utf-8');

  // 解析CSV
  console.log('解析CSV数据...');
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true, // 允许列数不一致
  });

  console.log(`解析完成: ${records.length} 条记录\n`);

  // 转换数据
  const metadata: Record<number, SatelliteMetadata> = {};
  let successCount = 0;
  let skipCount = 0;

  for (const record of records) {
    const noradIdStr = record['NORAD Number'];
    if (!noradIdStr) {
      skipCount++;
      continue;
    }

    const noradId = parseInt(noradIdStr, 10);
    if (isNaN(noradId)) {
      skipCount++;
      continue;
    }

    const name = cleanString(record['Current Official Name of Satellite'] || record['Name of Satellite, Alternate Names']);
    if (!name) {
      skipCount++;
      continue;
    }

    metadata[noradId] = {
      noradId,
      name,
      country: cleanString(record['Country/Org of UN Registry']),
      owner: cleanString(record['Operator/Owner']),
      operator: cleanString(record['Country of Operator/Owner']),
      users: cleanString(record['Users']),
      purpose: cleanString(record['Purpose']),
      launchDate: cleanString(record['Date of Launch']),
      launchSite: cleanString(record['Launch Site']),
      launchVehicle: cleanString(record['Launch Vehicle']),
      launchMass: parseNumber(record['Launch Mass (kg.)']),
      dryMass: parseNumber(record['Dry Mass (kg.) ']),
      power: parseNumber(record['Power (watts)']),
      expectedLifetime: cleanString(record['Expected Lifetime']),
      contractor: cleanString(record['Contractor']),
      contractorCountry: cleanString(record['Country of Contractor']),
      cosparId: cleanString(record['COSPAR Number']),
      orbitClass: cleanString(record['Class of Orbit']),
      orbitType: cleanString(record['Type of Orbit']),
    };

    successCount++;
  }

  console.log(`转换完成:`);
  console.log(`  - 成功: ${successCount} 颗卫星`);
  console.log(`  - 跳过: ${skipCount} 条记录\n`);

  // 统计信息
  const countryCounts: Record<string, number> = {};
  for (const sat of Object.values(metadata)) {
    if (sat.country) {
      countryCounts[sat.country] = (countryCounts[sat.country] || 0) + 1;
    }
  }

  const topCountries = Object.entries(countryCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  console.log('前10个国家/组织:');
  topCountries.forEach(([country, count]) => {
    console.log(`  ${country}: ${count}`);
  });

  // 保存JSON文件
  console.log(`\n保存到: ${outputPath}`);
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(outputPath, JSON.stringify(metadata, null, 2), 'utf-8');

  const fileSize = fs.statSync(outputPath).size;
  console.log(`文件大小: ${(fileSize / 1024).toFixed(2)} KB`);
  console.log('\n处理完成!');
}

main().catch(error => {
  console.error('处理失败:', error);
  process.exit(1);
});
