/**
 * @module mods/flight-tracking/api/errors
 * @description 航班追踪 MOD 错误类型
 */

/**
 * OpenSky API 错误
 */
export class OpenSkyError extends Error {
  constructor(
    public statusCode: number,
    message: string
  ) {
    super(`OpenSky API Error (${statusCode}): ${message}`);
    this.name = 'OpenSkyError';
  }

  get isRateLimited(): boolean {
    return this.statusCode === 429;
  }

  get isUnauthorized(): boolean {
    return this.statusCode === 401;
  }

  get isServerError(): boolean {
    return this.statusCode >= 500;
  }
}

/**
 * 数据解析错误
 */
export class DataParseError extends Error {
  constructor(message: string, public data?: unknown) {
    super(message);
    this.name = 'DataParseError';
  }
}

/**
 * 渲染错误
 */
export class FlightRenderError extends Error {
  constructor(message: string, public override cause?: Error) {
    super(message);
    this.name = 'FlightRenderError';
  }
}
