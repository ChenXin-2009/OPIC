/**
 * sgp4.worker.js - SGP4卫星轨道计算 Web Worker
 * 
 * 在后台线程执行SGP4算法计算卫星位置，避免阻塞主线程
 * 使用satellite.js库进行轨道传播计算
 */

// 导入satellite.js库
// 注意: 在Worker中需要使用importScripts加载外部库
importScripts('https://unpkg.com/satellite.js@6.0.2/dist/satellite.min.js');

/**
 * 将Date对象转换为Julian日期
 * @param {Date} date - JavaScript Date对象
 * @returns {number} Julian日期
 */
function dateToJulianDate(date) {
  return date.getTime() / 86400000 + 2440587.5;
}

/**
 * 将Julian日期转换为Date对象
 * @param {number} julianDate - Julian日期
 * @returns {Date} JavaScript Date对象
 */
function julianDateToDate(julianDate) {
  return new Date((julianDate - 2440587.5) * 86400000);
}

/**
 * 使用SGP4算法计算单颗卫星的位置和速度
 * @param {Object} tle - TLE数据对象
 * @param {number} julianDate - Julian日期
 * @returns {Object} 计算结果 {position, velocity, error}
 */
function calculateSatellitePosition(tle, julianDate) {
  try {
    // 解析TLE数据创建卫星记录
    const satrec = satellite.twoline2satrec(tle.line1, tle.line2);
    
    // 检查TLE解析是否成功
    if (satrec.error) {
      return {
        position: null,
        velocity: null,
        error: `TLE解析失败: ${satrec.error}`
      };
    }
    
    // 将Julian日期转换为Date对象
    const date = julianDateToDate(julianDate);
    
    // 使用SGP4算法传播轨道
    const positionAndVelocity = satellite.propagate(satrec, date);
    
    // 检查传播是否成功
    if (positionAndVelocity.error) {
      return {
        position: null,
        velocity: null,
        error: `轨道传播失败: ${positionAndVelocity.error}`
      };
    }
    
    // 检查位置和速度是否有效
    if (!positionAndVelocity.position || !positionAndVelocity.velocity) {
      return {
        position: null,
        velocity: null,
        error: '计算结果无效'
      };
    }
    
    // 返回ECI坐标系的位置和速度
    return {
      position: {
        x: positionAndVelocity.position.x,
        y: positionAndVelocity.position.y,
        z: positionAndVelocity.position.z
      },
      velocity: {
        x: positionAndVelocity.velocity.x,
        y: positionAndVelocity.velocity.y,
        z: positionAndVelocity.velocity.z
      },
      error: null
    };
  } catch (error) {
    return {
      position: null,
      velocity: null,
      error: `计算异常: ${error.message}`
    };
  }
}

/**
 * 批量计算多颗卫星的位置
 * @param {Array} tles - TLE数据数组
 * @param {number} julianDate - Julian日期
 * @returns {Array} 计算结果数组
 */
function calculateBatchPositions(tles, julianDate) {
  const results = [];
  const errors = [];
  
  for (let i = 0; i < tles.length; i++) {
    const tle = tles[i];
    const result = calculateSatellitePosition(tle, julianDate);
    
    results.push({
      noradId: tle.noradId,
      position: result.position,
      velocity: result.velocity,
      error: result.error
    });
    
    // 收集错误信息
    if (result.error) {
      errors.push(`卫星 ${tle.name} (${tle.noradId}): ${result.error}`);
    }
  }
  
  return { results, errors };
}

/**
 * 计算卫星轨道轨迹
 * @param {Object} tle - TLE数据对象
 * @param {number} startJulianDate - 起始Julian日期
 * @param {number} steps - 计算步数
 * @param {number} stepInterval - 步长间隔(分钟)
 * @returns {Array} 轨道点数组
 */
function calculateOrbitTrajectory(tle, startJulianDate, steps, stepInterval) {
  const points = [];
  const errors = [];
  
  // 解析TLE数据
  const satrec = satellite.twoline2satrec(tle.line1, tle.line2);
  
  if (satrec.error) {
    return {
      points: [],
      errors: [`TLE解析失败: ${satrec.error}`]
    };
  }
  
  // 计算每个时间点的位置
  for (let i = 0; i < steps; i++) {
    // 计算当前时间点的Julian日期
    const currentJulianDate = startJulianDate + (i * stepInterval) / 1440; // 1440分钟 = 1天
    const date = julianDateToDate(currentJulianDate);
    
    // 传播轨道
    const positionAndVelocity = satellite.propagate(satrec, date);
    
    if (positionAndVelocity.position && !positionAndVelocity.error) {
      points.push({
        x: positionAndVelocity.position.x,
        y: positionAndVelocity.position.y,
        z: positionAndVelocity.position.z
      });
    } else {
      errors.push(`步骤 ${i}: 计算失败`);
    }
  }
  
  return { points, errors };
}

/**
 * 监听主线程消息
 */
self.onmessage = function(e) {
  try {
    const { type, payload } = e.data;
    
    if (type === 'calculate') {
      // 批量位置计算
      const { tles, julianDate } = payload;
      
      if (!tles || !Array.isArray(tles)) {
        throw new Error('无效的TLE数据');
      }
      
      if (typeof julianDate !== 'number') {
        throw new Error('无效的Julian日期');
      }
      
      const { results, errors } = calculateBatchPositions(tles, julianDate);
      
      // 发送结果
      self.postMessage({
        type: 'result',
        payload: {
          positions: results,
          errors: errors.length > 0 ? errors : undefined
        }
      });
      
    } else if (type === 'orbit') {
      // 轨道轨迹计算
      const { tles, julianDate, steps } = payload;
      
      if (!tles || !Array.isArray(tles) || tles.length === 0) {
        throw new Error('无效的TLE数据');
      }
      
      if (typeof julianDate !== 'number') {
        throw new Error('无效的Julian日期');
      }
      
      const stepsCount = steps || 100;
      
      // 计算轨道周期(从TLE的平均运动推算)
      const tle = tles[0];
      const satrec = satellite.twoline2satrec(tle.line1, tle.line2);
      
      // 平均运动单位是圈/天，转换为分钟/圈
      const meanMotion = satrec.no * 1440 / (2 * Math.PI); // 转换为圈/天
      const period = 1440 / meanMotion; // 轨道周期(分钟)
      const stepInterval = period / stepsCount; // 每步的时间间隔
      
      const { points, errors } = calculateOrbitTrajectory(
        tle,
        julianDate,
        stepsCount,
        stepInterval
      );
      
      // 发送结果
      self.postMessage({
        type: 'result',
        payload: {
          positions: points,
          errors: errors.length > 0 ? errors : undefined
        }
      });
      
    } else {
      throw new Error(`未知的消息类型: ${type}`);
    }
    
  } catch (error) {
    // 发送错误消息
    self.postMessage({
      type: 'error',
      payload: {
        positions: [],
        errors: [error.message]
      }
    });
  }
};

// Worker就绪通知
self.postMessage({
  type: 'ready',
  payload: {
    message: 'SGP4 Worker已就绪'
  }
});
