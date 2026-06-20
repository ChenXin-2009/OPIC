#!/usr/bin/env node

/**
 * MOD注册表自动生成脚本
 * 
 * 这个脚本会扫描 src/lib/mods/ 目录，自动发现所有MOD
 * 并生成 auto-registry.ts 文件
 * 
 * 使用方法：
 * - 开发时：npm run generate-mods
 * - 构建时：自动在 prebuild 阶段运行
 */

const fs = require('fs');
const path = require('path');

const MODS_DIR = path.join(__dirname, '../src/lib/mods');
const OUTPUT_FILE = path.join(MODS_DIR, 'auto-registry.ts');

/**
 * 检查目录是否是有效的MOD
 */
function isValidMod(modPath) {
  const indexFile = path.join(modPath, 'index.ts');
  const manifestFile = path.join(modPath, 'manifest.ts');
  
  return fs.existsSync(indexFile) && fs.existsSync(manifestFile);
}

/**
 * 从MOD名称生成函数名
 * 例如: satellite-tracking -> getSatelliteTrackingMod
 */
function generateFunctionName(modName) {
  const camelCase = modName
    .split('-')
    .map((word, index) => {
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join('');
  
  return `get${camelCase}Mod`;
}

/**
 * 扫描MOD目录
 */
function scanModsDirectory() {
  const mods = [];
  const seen = new Set();

  if (!fs.existsSync(MODS_DIR)) {
    console.warn(`\n⚠️  MOD目录不存在: ${MODS_DIR}`);
    return mods;
  }

  let entries;
  try {
    entries = fs.readdirSync(MODS_DIR, { withFileTypes: true });
  } catch (err) {
    console.error(`\n❌ 读取MOD目录失败: ${err.message}`);
    return mods;
  }
  
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    
    const modPath = path.join(MODS_DIR, entry.name);
    
    if (entry.name.startsWith('.') || entry.name === 'node_modules') {
      continue;
    }
    
    if (isValidMod(modPath)) {
      if (seen.has(entry.name)) {
        console.warn(`⚠️  重复MOD名称: ${entry.name}，已跳过`);
        continue;
      }
      seen.add(entry.name);
      mods.push({
        name: entry.name,
        functionName: generateFunctionName(entry.name),
      });
      console.log(`✓ 发现MOD: ${entry.name}`);
    }
  }
  
  return mods;
}

/**
 * 生成注册表文件内容
 */
function generateRegistryContent(mods) {
  const imports = mods
    .map(mod => `import { ${mod.functionName} } from './${mod.name}';`)
    .join('\n');
  
  const registryArray = mods
    .map(mod => `  ${mod.functionName},`)
    .join('\n');
  
  return `/**
 * MOD自动注册表
 * 
 * ⚠️ 此文件由脚本自动生成，请勿手动编辑！
 * 
 * 生成时间: ${new Date().toISOString()}
 * MOD数量: ${mods.length}
 * 
 * 要重新生成此文件，运行: npm run generate-mods
 */

// 自动导入所有MOD
${imports}

/**
 * MOD注册表
 * 所有可用的MOD都在这里注册
 */
export const MOD_REGISTRY = [
${registryArray}
] as const;

/**
 * 获取所有注册的MOD
 */
export function getAllRegisteredMods() {
  return MOD_REGISTRY.map(getModFn => {
    try {
      return getModFn();
    } catch (error) {
      console.error('[Auto Registry] 加载MOD失败:', error);
      return null;
    }
  }).filter(mod => mod !== null);
}

/**
 * 获取MOD数量
 */
export function getModCount(): number {
  return MOD_REGISTRY.length;
}

/**
 * 获取MOD列表信息
 */
export function getModList() {
  return getAllRegisteredMods().map(mod => ({
    id: mod.manifest.id,
    name: mod.manifest.name,
    nameZh: mod.manifest.nameZh,
    version: mod.manifest.version,
    description: mod.manifest.description,
  }));
}
`;
}

/**
 * 主函数
 */
function main() {
  console.log('🔍 扫描MOD目录...');
  console.log(`📁 目录: ${MODS_DIR}\n`);
  
  const mods = scanModsDirectory();
  
  if (mods.length === 0) {
    console.warn('\n⚠️  未发现任何MOD');
    return;
  }
  
  console.log(`\n✅ 发现 ${mods.length} 个MOD`);
  console.log('📝 生成注册表文件...');
  
  const content = generateRegistryContent(mods);
  try {
    fs.writeFileSync(OUTPUT_FILE, content, 'utf-8');
  } catch (err) {
    console.error(`\n❌ 写入注册表文件失败: ${err.message}`);
    process.exit(1);
  }
  
  console.log(`✅ 注册表已生成: ${OUTPUT_FILE}`);
  console.log('\n已注册的MOD:');
  mods.forEach((mod, index) => {
    console.log(`  ${index + 1}. ${mod.name}`);
  });
}

// 运行脚本
try {
  main();
} catch (error) {
  console.error('❌ 生成失败:', error);
  process.exit(1);
}
