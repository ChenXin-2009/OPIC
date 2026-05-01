/**
 * JSON报告器
 * 负责将审查报告导出为JSON格式
 */

import * as fs from 'fs';
import * as path from 'path';
import { AuditReport } from '../models/audit-results';

/**
 * JSON报告器类
 */
export class JSONReporter {
  /**
   * 13.1 将审查报告导出为JSON格式
   */
  public exportReport(report: AuditReport, outputPath?: string): string {
    // 序列化为JSON，使用2空格缩进以提高可读性
    const jsonContent = JSON.stringify(report, this.jsonReplacer, 2);

    // 如果指定了输出路径，保存到文件
    if (outputPath) {
      this.saveToFile(jsonContent, outputPath);
    }

    return jsonContent;
  }

  /**
   * JSON序列化替换器
   * 处理特殊类型（如Date）的序列化
   */
  private jsonReplacer(key: string, value: any): any {
    // 将Date对象转换为ISO字符串
    if (value instanceof Date) {
      return value.toISOString();
    }
    return value;
  }

  /**
   * 保存JSON内容到文件
   */
  private saveToFile(content: string, outputPath: string): void {
    try {
      // 确保输出目录存在
      const dir = path.dirname(outputPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // 写入文件
      fs.writeFileSync(outputPath, content, 'utf-8');
      console.log(`JSON报告已保存到: ${outputPath}`);
    } catch (error) {
      console.error('保存JSON报告失败:', error);
      throw error;
    }
  }

  /**
   * 生成默认的输出文件名
   */
  public generateFileName(basePath: string): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `audit-report-${timestamp}.json`;
    return path.join(basePath, fileName);
  }

  /**
   * 验证JSON格式
   */
  public validateJSON(jsonContent: string): boolean {
    try {
      JSON.parse(jsonContent);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * 从JSON文件加载报告
   */
  public loadReport(filePath: string): AuditReport {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const report = JSON.parse(content) as AuditReport;
      
      // 将ISO字符串转换回Date对象
      report.timestamp = new Date(report.timestamp);
      report.results.timestamp = new Date(report.results.timestamp);
      
      return report;
    } catch (error) {
      console.error('加载JSON报告失败:', error);
      throw error;
    }
  }
}
