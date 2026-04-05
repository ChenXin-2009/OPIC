/**
 * @module mods/flight-tracking/api/OpenSkyClient
 * @description OpenSky Network API 客户端
 *
 * 通过 /api/flights 代理路由请求，绕过浏览器 CORS 限制。
 */

import type { FlightState, BoundingBox, FlightPathPoint } from '../types';
import { OpenSkyError } from './errors';

const PROXY_BASE = '/api/flights';

export class OpenSkyClient {
  private credentials: { username: string; password: string } | null = null;

  setCredentials(username: string, password: string): void {
    this.credentials = { username, password };
  }

  clearCredentials(): void {
    this.credentials = null;
  }

  /**
   * 获取全球航班状态
   */
  async getAllStates(): Promise<FlightState[]> {
    const data = await this.fetchProxy({});
    return this.parseStates((data as Record<string, unknown[][]>).states || []);
  }

  /**
   * 按地理边界框获取航班状态
   */
  async getStatesByBoundingBox(bbox: BoundingBox): Promise<FlightState[]> {
    const data = await this.fetchProxy(bbox);
    return this.parseStates((data as Record<string, unknown[][]>).states || []);
  }

  /**
   * 获取单架飞机状态（通过全量数据过滤）
   */
  async getAircraftState(icao24: string): Promise<FlightState | null> {
    const states = await this.getAllStates();
    return states.find(s => s.icao24 === icao24) ?? null;
  }

  /**
   * 获取航班轨迹（需要认证，匿名时返回空）
   */
  async getFlightTrack(_icao24: string, _time?: number): Promise<FlightPathPoint[]> {
    // OpenSky 轨迹接口需要认证，暂不实现
    return [];
  }

  // ---- 私有方法 ----

  private async fetchProxy(bbox: Partial<BoundingBox>): Promise<unknown> {
    const params = new URLSearchParams();
    if (bbox.lamin !== undefined) params.set('lamin', String(bbox.lamin));
    if (bbox.lomin !== undefined) params.set('lomin', String(bbox.lomin));
    if (bbox.lamax !== undefined) params.set('lamax', String(bbox.lamax));
    if (bbox.lomax !== undefined) params.set('lomax', String(bbox.lomax));

    // 凭证通过 query 传给代理（代理在服务端处理，不暴露给第三方）
    if (this.credentials) {
      params.set('username', this.credentials.username);
      params.set('password', this.credentials.password);
    }

    const url = `${PROXY_BASE}${params.size ? `?${params}` : ''}`;

    const response = await fetch(url, {
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new OpenSkyError(response.status, text);
    }

    return response.json();
  }

  private parseStates(states: unknown[][]): FlightState[] {
    const result: FlightState[] = [];

    for (const s of states) {
      if (!Array.isArray(s) || s[5] === null || s[6] === null) continue;

      result.push({
        icao24: String(s[0] || ''),
        callsign: s[1] ? String(s[1]).trim() || null : null,
        originCountry: String(s[2] || ''),
        timePosition: s[3] != null ? Number(s[3]) : null,
        lastContact: Number(s[4] || 0),
        longitude: Number(s[5]),
        latitude: Number(s[6]),
        baroAltitude: s[7] != null ? Number(s[7]) : null,
        onGround: Boolean(s[8]),
        velocity: s[9] != null ? Number(s[9]) : null,
        trueTrack: s[10] != null ? Number(s[10]) : null,
        verticalRate: s[11] != null ? Number(s[11]) : null,
        squawk: s[14] != null ? String(s[14]) : null,
        spi: Boolean(s[15]),
        positionSource: Number(s[16] || 0),
        geoAltitude: s[13] != null ? Number(s[13]) : null,
      });
    }

    return result;
  }
}

// 单例
let _client: OpenSkyClient | null = null;

export function getOpenSkyClient(): OpenSkyClient {
  if (!_client) _client = new OpenSkyClient();
  return _client;
}
