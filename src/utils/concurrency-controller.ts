/**
 * 并发控制器 (Concurrency Controller)
 * 
 * 核心职责：
 * - 限制同时执行的异步任务数量
 * - 防止资源耗尽和系统过载
 * - 提供多种并发执行策略
 * - 优雅地处理任务失败
 * 
 * 使用场景：
 * - API批量请求（避免触发速率限制）
 * - 文件批量处理（限制I/O压力）
 * - 数据库批量操作（控制连接池使用）
 * - 爬虫并发控制（礼貌爬取）
 * 
 * 核心算法（滑动窗口）：
 * 1. 维护一个executing数组存放正在执行的任务
 * 2. 启动新任务前检查executing.length
 * 3. 如果达到maxConcurrency，使用Promise.race等待
 * 4. 任何任务完成后，自动从executing中移除
 * 5. 重复直到所有任务完成
 * 
 * 性能特点：
 * - 内存占用：O(maxConcurrency)
 * - 时间复杂度：O(n) - n为任务总数
 * - 不会创建所有Promise（按需创建）
 * - 任务完成即启动下一个（无空闲期）
 * 
 * @example
 * ```typescript
 * const controller = new ConcurrencyController(5);
 * 
 * // 批量请求API
 * const tasks = urls.map(url => () => fetch(url).then(r => r.json()));
 * const results = await controller.runWithLimit(tasks);
 * 
 * // 带错误处理
 * const { results, errors } = await controller.runWithErrorHandling(tasks);
 * console.log(`成功: ${results.length}, 失败: ${errors.length}`);
 * ```
 */

/**
 * 并发控制器类
 * 
 * 提供灵活的并发任务执行策略。
 * 
 * 实例化：
 * ```typescript
 * const controller = new ConcurrencyController(10); // 最多10个并发
 * ```
 * 
 * 注意事项：
 * - 任务是惰性执行的（传入函数而非Promise）
 * - 任务按顺序启动，但完成顺序不确定
 * - 默认并发数为10
 */
export class ConcurrencyController {
  /** 最大并发任务数 */
  private maxConcurrency: number;

  /**
   * 构造函数
   * 
   * @param maxConcurrency - 最大并发数，默认10
   * @throws 如果maxConcurrency <= 0
   */
  constructor(maxConcurrency: number = 10) {
    this.maxConcurrency = maxConcurrency;
  }

  /**
   * 使用并发限制执行任务（滑动窗口算法）
   * 
   * 这是核心方法，实现了高效的并发控制。
   * 
   * 算法详解：
   * 1. 遍历任务数组
   * 2. 启动任务并将Promise加入executing数组
   * 3. 任务完成时：
   *    - 将结果加入results数组
   *    - 从executing数组中移除自己
   * 4. 如果executing达到maxConcurrency：
   *    - 使用Promise.race等待任意一个任务完成
   *    - 完成后继续启动下一个任务
   * 5. 所有任务启动后，等待剩余任务完成
   * 
   * 关键特性：
   * - **滑动窗口**：始终保持maxConcurrency个任务在执行
   * - **按需创建**：不会一次性创建所有Promise
   * - **无空闲期**：任务完成立即启动下一个
   * - **顺序保证**：results数组按任务完成顺序排列
   * 
   * 性能分析：
   * - 空间复杂度：O(maxConcurrency) - 只存储执行中的任务
   * - 时间复杂度：O(n/c) - n为任务总数，c为并发数
   * 
   * 使用建议：
   * - 适合大量同构任务（如批量API请求）
   * - 任务间无依赖关系
   * - 需要控制资源使用（网络、CPU、内存）
   * 
   * 注意事项：
   * - 结果顺序与任务启动顺序不一致（按完成顺序）
   * - 如果需要保持顺序，考虑使用runInBatches
   * - 任务失败会导致整个Promise.all失败
   * 
   * @param tasks - 任务函数数组，每个函数返回Promise<T>
   * @returns Promise，解析为所有任务结果的数组
   * @throws 如果任何任务失败
   * 
   * @example
   * ```typescript
   * // 批量下载文件，最多5个并发
   * const controller = new ConcurrencyController(5);
   * const downloadTasks = fileUrls.map(url => 
   *   () => fetch(url).then(r => r.blob())
   * );
   * const files = await controller.runWithLimit(downloadTasks);
   * ```
   */
  public async runWithLimit<T>(
    tasks: (() => Promise<T>)[]
  ): Promise<T[]> {
    const results: T[] = [];
    const executing: Promise<void>[] = [];

    for (const task of tasks) {
      // 创建任务Promise
      const promise = task().then(result => {
        // 任务成功，保存结果
        results.push(result);
        
        // 任务完成后从执行队列中移除
        // 这使得executing数组始终只包含正在执行的任务
        const index = executing.indexOf(promise);
        if (index !== -1) {
          executing.splice(index, 1);
        }
      });

      // 将新任务加入执行队列
      executing.push(promise);

      // 如果达到并发限制，等待至少一个任务完成
      // Promise.race会在任何一个Promise完成时resolve
      // 这样就为下一个任务腾出了"槽位"
      if (executing.length >= this.maxConcurrency) {
        await Promise.race(executing);
      }
    }

    // 等待所有剩余任务完成
    // 此时可能还有 < maxConcurrency 个任务在执行
    await Promise.all(executing);
    
    return results;
  }

  /**
   * 批量执行任务（按批次串行执行）
   * 
   * 与runWithLimit的区别：
   * - runWithLimit：滑动窗口，任务完成立即启动下一个
   * - runInBatches：批次执行，整个批次完成后再执行下一批
   * 
   * 优点：
   * - 结果分批返回，可以部分处理
   * - 内存占用更可控（批次间可释放）
   * - 更容易实现进度追踪
   * 
   * 缺点：
   * - 批次间有空闲期（等待最慢的任务）
   * - 总体执行时间可能略长
   * 
   * 使用场景：
   * - 需要批次间执行额外操作（如保存中间结果）
   * - 任务执行时间差异较大
   * - 需要精确的进度反馈
   * 
   * @param tasks - 任务函数数组
   * @param batchSize - 每批次的任务数量，默认使用maxConcurrency
   * @returns Promise，解析为所有任务结果的数组
   * 
   * @example
   * ```typescript
   * // 处理10000个任务，每批100个
   * const results = await controller.runInBatches(tasks, 100);
   * // 结果会分100批返回，每批处理完成才开始下一批
   * ```
   */
  public async runInBatches<T>(
    tasks: (() => Promise<T>)[],
    batchSize?: number
  ): Promise<T[]> {
    const size = batchSize || this.maxConcurrency;
    const results: T[] = [];

    // 将任务分成多个批次
    for (let i = 0; i < tasks.length; i += size) {
      // 提取当前批次的任务
      const batch = tasks.slice(i, i + size);
      
      // 并发执行当前批次，等待全部完成
      const batchResults = await Promise.all(batch.map(task => task()));
      
      // 将批次结果追加到总结果中
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * 执行任务并收集错误（容错执行）
   * 
   * 即使某些任务失败，也会继续执行其他任务，最后统一返回成功和失败的结果。
   * 
   * 容错策略：
   * - 任务失败不会中断其他任务
   * - 收集所有成功的结果
   * - 收集所有失败的错误
   * - 所有任务（成功或失败）都会被执行
   * 
   * 错误处理：
   * - 捕获所有异常并转换为Error对象
   * - 非Error类型的异常会被包装
   * - 保持错误的原始信息
   * 
   * 使用场景：
   * - 批量操作中允许部分失败
   * - 需要收集所有错误进行分析
   * - 数据迁移或同步任务
   * - 批量验证或检查
   * 
   * @param tasks - 任务函数数组
   * @returns Promise，解析为包含results和errors的对象
   * 
   * @example
   * ```typescript
   * const { results, errors } = await controller.runWithErrorHandling(tasks);
   * 
   * console.log(`成功: ${results.length}/${tasks.length}`);
   * console.log(`失败: ${errors.length}/${tasks.length}`);
   * 
   * // 处理失败的任务
   * errors.forEach((error, index) => {
   *   console.error(`任务失败:`, error.message);
   * });
   * 
   * // 处理成功的结果
   * processResults(results);
   * ```
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
          // 任务成功，保存结果
          results.push(result);
        })
        .catch(error => {
          // 任务失败，收集错误
          // 确保错误是Error类型，如果不是则包装
          errors.push(error instanceof Error ? error : new Error(String(error)));
        })
        .finally(() => {
          // 无论成功还是失败，都从执行队列中移除
          const index = executing.indexOf(promise);
          if (index !== -1) {
            executing.splice(index, 1);
          }
        });

      executing.push(promise);

      // 达到并发限制时等待
      if (executing.length >= this.maxConcurrency) {
        await Promise.race(executing);
      }
    }

    // 等待所有剩余任务完成
    await Promise.all(executing);

    return { results, errors };
  }

  /**
   * 设置最大并发数
   * 
   * 动态调整并发限制，影响后续的任务执行。
   * 
   * 使用场景：
   * - 根据系统负载动态调整
   * - 响应速率限制变化
   * - 用户配置更新
   * 
   * 注意：不影响正在执行的任务
   * 
   * @param maxConcurrency - 新的最大并发数
   * @throws 如果maxConcurrency <= 0
   */
  public setMaxConcurrency(maxConcurrency: number): void {
    if (maxConcurrency <= 0) {
      throw new Error('最大并发数必须大于0');
    }
    this.maxConcurrency = maxConcurrency;
  }

  /**
   * 获取当前最大并发数
   * 
   * @returns 当前的最大并发数设置
   */
  public getMaxConcurrency(): number {
    return this.maxConcurrency;
  }
}
