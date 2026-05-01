/**
 * 并发控制器
 * 负责管理并发任务执行，限制同时执行的任务数量
 */

/**
 * 并发控制器类
 */
export class ConcurrencyController {
  private maxConcurrency: number;

  constructor(maxConcurrency: number = 10) {
    this.maxConcurrency = maxConcurrency;
  }

  /**
   * 16.1 使用并发限制执行任务
   * 
   * @param tasks 任务函数数组
   * @returns 所有任务的执行结果
   */
  public async runWithLimit<T>(
    tasks: (() => Promise<T>)[]
  ): Promise<T[]> {
    const results: T[] = [];
    const executing: Promise<void>[] = [];

    for (const task of tasks) {
      // 创建任务Promise
      const promise = task().then(result => {
        results.push(result);
        // 任务完成后从执行队列中移除
        const index = executing.indexOf(promise);
        if (index !== -1) {
          executing.splice(index, 1);
        }
      });

      executing.push(promise);

      // 如果达到并发限制，等待至少一个任务完成
      if (executing.length >= this.maxConcurrency) {
        await Promise.race(executing);
      }
    }

    // 等待所有剩余任务完成
    await Promise.all(executing);
    
    return results;
  }

  /**
   * 批量执行任务（按批次）
   * 
   * @param tasks 任务函数数组
   * @param batchSize 每批次的任务数量
   * @returns 所有任务的执行结果
   */
  public async runInBatches<T>(
    tasks: (() => Promise<T>)[],
    batchSize?: number
  ): Promise<T[]> {
    const size = batchSize || this.maxConcurrency;
    const results: T[] = [];

    for (let i = 0; i < tasks.length; i += size) {
      const batch = tasks.slice(i, i + size);
      const batchResults = await Promise.all(batch.map(task => task()));
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * 执行任务并收集错误
   * 即使某些任务失败，也会继续执行其他任务
   * 
   * @param tasks 任务函数数组
   * @returns 成功的结果和失败的错误
   */
  public async runWithErrorHandling<T>(
    tasks: (() => Promise<T>)[]
  ): Promise<{
    results: T[];
    errors: Error[];
  }> {
    const results: T[] = [];
    const errors: Error[] = [];
    const executing: Promise<void>[] = [];

    for (const task of tasks) {
      const promise = task()
        .then(result => {
          results.push(result);
        })
        .catch(error => {
          errors.push(error instanceof Error ? error : new Error(String(error)));
        })
        .finally(() => {
          const index = executing.indexOf(promise);
          if (index !== -1) {
            executing.splice(index, 1);
          }
        });

      executing.push(promise);

      if (executing.length >= this.maxConcurrency) {
        await Promise.race(executing);
      }
    }

    await Promise.all(executing);

    return { results, errors };
  }

  /**
   * 设置最大并发数
   */
  public setMaxConcurrency(maxConcurrency: number): void {
    if (maxConcurrency <= 0) {
      throw new Error('最大并发数必须大于0');
    }
    this.maxConcurrency = maxConcurrency;
  }

  /**
   * 获取当前最大并发数
   */
  public getMaxConcurrency(): number {
    return this.maxConcurrency;
  }
}
