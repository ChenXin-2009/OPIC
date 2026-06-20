/**
 * Lighthouse 性能审计脚本
 *
 * 在生产环境 Next.js 服务器上运行 Lighthouse 审计，
 * 生成性能、可访问性、SEO 等维度的报告。
 *
 * 用法:
 *   npm run perf:lighthouse          # 构建 + 启动服务器 + 运行审计
 *   npm run perf:lighthouse -- --url https://example.com  # 对已部署站点审计
 *
 * 依赖:
 *   lighthouse (安装: npm i -D lighthouse)
 */

import { execSync, spawn } from 'child_process';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

const REPORTS_DIR = join(__dirname, '..', 'reports', 'lighthouse');
const PORT = 4173;

async function waitForServer(url: string, timeoutMs = 60000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const resp = await fetch(url);
      if (resp.ok) return;
    } catch { /* server not ready yet */ }
    await new Promise(r => setTimeout(r, 1000));
  }
  throw new Error(`Server at ${url} did not start within ${timeoutMs}ms`);
}

async function main() {
  const urlIndex = process.argv.indexOf('--url');
  let targetUrl: string;

  if (!checkLighthouse()) return;

  if (urlIndex !== -1 && process.argv[urlIndex + 1]) {
    targetUrl = process.argv[urlIndex + 1];
    console.log(`\n🔍 审计已部署站点: ${targetUrl}\n`);

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const lighthouse = require('lighthouse');
    await runAudit(lighthouse, targetUrl, undefined);
  } else {
    // 本地构建并启动
    console.log('📦 构建生产版本...\n');
    execSync('npm run build', { cwd: join(__dirname, '..'), stdio: 'inherit' });

    console.log(`\n🚀 启动生产服务器 (端口 ${PORT})...\n`);
    const serverProcess = spawn('npx', ['next', 'start', '-p', String(PORT)], {
      cwd: join(__dirname, '..'),
      stdio: 'pipe',
      shell: true,
    });

    serverProcess.stderr?.on('data', (d: Buffer) => process.stderr.write(d));

    targetUrl = `http://localhost:${PORT}`;
    try {
      await waitForServer(targetUrl);
    } catch (e) {
      serverProcess.kill();
      throw e;
    }

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const lighthouse = require('lighthouse');
    await runAudit(lighthouse, targetUrl, serverProcess);
  }
}

async function runAudit(lighthouse: any, targetUrl: string, serverProcess: any) {
  console.log(`\n🔍 运行 Lighthouse 审计: ${targetUrl}\n`);

  const report = await lighthouse(targetUrl, {
    port: PORT,
    output: ['html', 'json'],
    onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
    preset: 'desktop',
  });

  if (!report) {
    throw new Error('Lighthouse 审计未产生报告');
  }

  if (!existsSync(REPORTS_DIR)) {
    mkdirSync(REPORTS_DIR, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const htmlPath = join(REPORTS_DIR, `report-${timestamp}.html`);
  const jsonPath = join(REPORTS_DIR, `report-${timestamp}.json`);

  const htmlReport = Array.isArray(report.report) ? report.report[0] : report.report;
  const jsonReport = Array.isArray(report.report) ? report.report[1] : JSON.stringify(report.lhr, null, 2);

  writeFileSync(htmlPath, htmlReport);
  writeFileSync(jsonPath, jsonReport);

  const lhr = report.lhr;
  const scores = {
    performance: lhr.categories.performance?.score ?? 0,
    accessibility: lhr.categories.accessibility?.score ?? 0,
    'best-practices': lhr.categories['best-practices']?.score ?? 0,
    seo: lhr.categories.seo?.score ?? 0,
  };

  console.log('\n📊 Lighthouse 审计结果:\n');
  for (const [category, score] of Object.entries(scores)) {
    const pct = Math.round((score as number) * 100);
    const bar = '█'.repeat(Math.round(pct / 10)) + '░'.repeat(10 - Math.round(pct / 10));
    console.log(`  ${category.padEnd(16)} ${pct.toString().padStart(3)}/100  ${bar}`);
  }

  console.log(`\n📁 HTML 报告: ${htmlPath}`);
  console.log(`📁 JSON 报告: ${jsonPath}`);

  const baselinePath = join(REPORTS_DIR, 'baseline.json');
  const baseline = existsSync(baselinePath) ? JSON.parse(require('fs').readFileSync(baselinePath, 'utf-8')) : {};
  baseline[timestamp] = scores;
  writeFileSync(baselinePath, JSON.stringify(baseline, null, 2));
  console.log(`📁 基线已更新: ${baselinePath}\n`);

  if (serverProcess) serverProcess.kill();
}

function checkLighthouse() {
  try {
    require.resolve('lighthouse');
    return true;
  } catch {
    console.warn('\n⚠️  未安装 lighthouse，跳过性能审计');
    console.warn('   运行: npm install -D lighthouse\n');
    return false;
  }
}

main().catch((err) => {
  console.error('\n❌ Lighthouse 审计失败:', err);
  process.exit(1);
});
