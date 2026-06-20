/**
 * Bundle 分析脚本
 * 
 * 使用 @next/bundle-analyzer 分析打包体积，识别大依赖。
 * 
 * 用法: npm run analyze
 * 
 * 该脚本会:
 * 1. 设置 ANALYZE=true 环境变量
 * 2. 运行 next build
 * 3. 自动打开浏览器显示交互式 treemap
 * 4. 在 .next/analyze/ 目录生成 HTML + JSON 报告
 */

import { execSync } from 'child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const NEXT_DIR = join(__dirname, '..', '.next');
const ANALYZE_DIR = join(__dirname, '..', '.next', 'analyze');

// 确保分析输出目录存在
if (!existsSync(ANALYZE_DIR)) {
  mkdirSync(ANALYZE_DIR, { recursive: true });
}

console.log('📦 开始分析 OPIC bundle 体积...\n');

try {
  // 运行 next build with ANALYZE=true
  execSync('ANALYZE=true npx next build', {
    cwd: join(__dirname, '..'),
    stdio: 'inherit',
    env: { ...process.env, ANALYZE: 'true' },
  });

  // 收集 bundle 统计信息
  const statsPath = join(NEXT_DIR, 'server', 'pages-manifest.json');
  if (existsSync(statsPath)) {
    const pagesManifest = JSON.parse(readFileSync(statsPath, 'utf-8'));
    
    // 生成分析报告
    const report = {
      timestamp: new Date().toISOString(),
      pages: Object.keys(pagesManifest),
      note: 'Bundle 分析报告已生成，详情请查看浏览器中的交互式 treemap。',
    };

    writeFileSync(
      join(ANALYZE_DIR, 'bundle-report.json'),
      JSON.stringify(report, null, 2)
    );

    console.log('\n✅ Bundle 分析完成！');
    console.log(`📊 报告已生成到: ${ANALYZE_DIR}`);
    console.log('💡 交互式 treemap 已在浏览器中打开');
  } else {
    console.warn('\n⚠️  未找到 pages-manifest.json，请检查构建输出');
  }
} catch (error) {
  console.error('\n❌ Bundle 分析失败:', (error as Error).message);
  process.exit(1);
}
