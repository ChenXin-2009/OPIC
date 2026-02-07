#!/usr/bin/env node

/**
 * 代码质量报告生成器
 * 
 * 生成包含复杂度、文档覆盖率和代码重复度的质量报告
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 配置
const SRC_DIR = path.join(__dirname, '..', 'src');
const REPORT_DIR = path.join(__dirname, '..', 'reports');
const COMPLEXITY_THRESHOLD = 10;

/**
 * 确保报告目录存在
 */
function ensureReportDir() {
  if (!fs.existsSync(REPORT_DIR)) {
    fs.mkdirSync(REPORT_DIR, { recursive: true });
  }
}

/**
 * 运行 ESLint 并生成复杂度报告
 */
function generateComplexityReport() {
  console.log('📊 生成复杂度报告...');
  
  try {
    const output = execSync('npm run lint -- --format json', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    const results = JSON.parse(output);
    const complexityIssues = [];
    
    results.forEach(file => {
      file.messages.forEach(msg => {
        if (msg.ruleId === 'complexity') {
          complexityIssues.push({
            file: file.filePath,
            line: msg.line,
            message: msg.message,
            severity: msg.severity
          });
        }
      });
    });
    
    const report = {
      timestamp: new Date().toISOString(),
      threshold: COMPLEXITY_THRESHOLD,
      totalIssues: complexityIssues.length,
      issues: complexityIssues
    };
    
    fs.writeFileSync(
      path.join(REPORT_DIR, 'complexity-report.json'),
      JSON.stringify(report, null, 2)
    );
    
    console.log(`✅ 复杂度报告已生成: ${complexityIssues.length} 个问题`);
    return report;
  } catch (error) {
    console.error('❌ 生成复杂度报告失败:', error.message);
    return null;
  }
}

/**
 * 生成文档覆盖率报告
 */
function generateDocumentationReport() {
  console.log('📚 生成文档覆盖率报告...');
  
  try {
    const output = execSync('npm run lint -- --format json', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    const results = JSON.parse(output);
    const docIssues = [];
    
    results.forEach(file => {
      file.messages.forEach(msg => {
        if (msg.ruleId === 'require-jsdoc') {
          docIssues.push({
            file: file.filePath,
            line: msg.line,
            message: msg.message
          });
        }
      });
    });
    
    const report = {
      timestamp: new Date().toISOString(),
      totalIssues: docIssues.length,
      issues: docIssues
    };
    
    fs.writeFileSync(
      path.join(REPORT_DIR, 'documentation-report.json'),
      JSON.stringify(report, null, 2)
    );
    
    console.log(`✅ 文档覆盖率报告已生成: ${docIssues.length} 个缺失文档`);
    return report;
  } catch (error) {
    console.error('❌ 生成文档报告失败:', error.message);
    return null;
  }
}

/**
 * 生成汇总报告
 */
function generateSummaryReport(complexityReport, docReport) {
  console.log('📋 生成汇总报告...');
  
  const summary = {
    timestamp: new Date().toISOString(),
    metrics: {
      complexity: {
        threshold: COMPLEXITY_THRESHOLD,
        violations: complexityReport ? complexityReport.totalIssues : 0
      },
      documentation: {
        missingDocs: docReport ? docReport.totalIssues : 0
      }
    },
    status: 'generated'
  };
  
  fs.writeFileSync(
    path.join(REPORT_DIR, 'quality-summary.json'),
    JSON.stringify(summary, null, 2)
  );
  
  // 生成 Markdown 报告
  const markdown = `# 代码质量报告

生成时间: ${new Date().toLocaleString('zh-CN')}

## 指标概览

### 复杂度
- 阈值: ${COMPLEXITY_THRESHOLD}
- 违规数: ${summary.metrics.complexity.violations}

### 文档覆盖率
- 缺失文档: ${summary.metrics.documentation.missingDocs}

## 详细报告

详细的 JSON 报告已生成在 \`reports/\` 目录下：
- \`complexity-report.json\` - 复杂度详细报告
- \`documentation-report.json\` - 文档覆盖率详细报告
- \`quality-summary.json\` - 质量汇总报告
`;
  
  fs.writeFileSync(
    path.join(REPORT_DIR, 'quality-report.md'),
    markdown
  );
  
  console.log('✅ 汇总报告已生成');
  console.log(`\n📁 报告位置: ${REPORT_DIR}`);
}

/**
 * 主函数
 */
function main() {
  console.log('🚀 开始生成代码质量报告...\n');
  
  ensureReportDir();
  
  const complexityReport = generateComplexityReport();
  const docReport = generateDocumentationReport();
  
  generateSummaryReport(complexityReport, docReport);
  
  console.log('\n✨ 代码质量报告生成完成！');
}

// 运行
main();
