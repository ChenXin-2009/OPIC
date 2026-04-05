'use client';

/**
 * 航班追踪面板
 * 显示当前航班统计和选中航班详情
 */

import React from 'react';
import { useFlightStore } from '@/lib/mods/flight-tracking/store/flightStore';
import { msToKmh, metersToFeet } from '@/lib/mods/flight-tracking/utils/dataParser';

interface FlightPanelProps {
  lang?: 'zh' | 'en';
}

function getT(lang: 'zh' | 'en') {
  return {
    title: lang === 'zh' ? '航班追踪' : 'Flight Tracking',
    total: lang === 'zh' ? '总计' : 'Total',
    inAir: lang === 'zh' ? '在飞' : 'In Air',
    onGround: lang === 'zh' ? '地面' : 'On Ground',
    loading: lang === 'zh' ? '加载中...' : 'Loading...',
    error: lang === 'zh' ? '获取失败' : 'Fetch failed',
    lastUpdate: lang === 'zh' ? '更新' : 'Updated',
    callsign: lang === 'zh' ? '呼号' : 'Callsign',
    altitude: lang === 'zh' ? '高度' : 'Altitude',
    speed: lang === 'zh' ? '速度' : 'Speed',
    country: lang === 'zh' ? '国家' : 'Country',
    heading: lang === 'zh' ? '航向' : 'Heading',
    close: lang === 'zh' ? '关闭' : 'Close',
    noData: lang === 'zh' ? '暂无数据' : 'No data',
  };
}

export const FlightPanel: React.FC<FlightPanelProps> = ({ lang = 'zh' }) => {
  const t = getT(lang);
  const stats = useFlightStore(s => s.stats);
  const fetchStatus = useFlightStore(s => s.fetchStatus);
  const selectedIcao24 = useFlightStore(s => s.selectedIcao24);
  const flights = useFlightStore(s => s.flights);
  const selectFlight = useFlightStore(s => s.selectFlight);

  const selectedFlight = selectedIcao24 ? flights.get(selectedIcao24) : null;

  const lastUpdateStr = fetchStatus.lastUpdate
    ? new Date(fetchStatus.lastUpdate).toLocaleTimeString()
    : '--';

  return (
    <div
      style={{
        position: 'fixed',
        left: '1rem',
        bottom: '5rem',
        zIndex: 1000,
        background: 'rgba(10,10,10,0.92)',
        border: '1px solid #333',
        borderRadius: '4px',
        padding: '10px 14px',
        color: '#fff',
        fontSize: '12px',
        minWidth: '160px',
        maxWidth: '220px',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      {/* 标题 + 状态 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontWeight: 700, letterSpacing: 1 }}>{t.title}</span>
        {fetchStatus.loading && (
          <span style={{ color: '#aaa', fontSize: 10 }}>{t.loading}</span>
        )}
        {fetchStatus.error && (
          <span style={{ color: '#f66', fontSize: 10 }}>{t.error}</span>
        )}
      </div>

      {/* 统计 */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 6 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: '#aaa', fontSize: 10 }}>{t.total}</div>
          <div style={{ fontWeight: 600 }}>{stats.total}</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: '#aaa', fontSize: 10 }}>{t.inAir}</div>
          <div style={{ fontWeight: 600, color: '#4cf' }}>{stats.inAir}</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: '#aaa', fontSize: 10 }}>{t.onGround}</div>
          <div style={{ fontWeight: 600, color: '#fa4' }}>{stats.onGround}</div>
        </div>
      </div>

      {/* 更新时间 */}
      <div style={{ color: '#555', fontSize: 10, marginBottom: selectedFlight ? 8 : 0 }}>
        {t.lastUpdate}: {lastUpdateStr}
      </div>

      {/* 选中航班详情 */}
      {selectedFlight && (
        <div style={{ borderTop: '1px solid #333', paddingTop: 8, marginTop: 4 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontWeight: 700, color: '#4cf' }}>
              {selectedFlight.callsign || selectedFlight.icao24}
            </span>
            <button
              onClick={() => selectFlight(null)}
              style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: 12 }}
            >
              ✕
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px 8px', fontSize: 11 }}>
            <span style={{ color: '#888' }}>{t.altitude}</span>
            <span>{selectedFlight.position ? `${metersToFeet(selectedFlight.position.altitude).toLocaleString()} ft` : '--'}</span>
            <span style={{ color: '#888' }}>{t.speed}</span>
            <span>{selectedFlight.velocity ? `${msToKmh(selectedFlight.velocity)} km/h` : '--'}</span>
            <span style={{ color: '#888' }}>{t.heading}</span>
            <span>{selectedFlight.trueTrack != null ? `${Math.round(selectedFlight.trueTrack)}°` : '--'}</span>
            <span style={{ color: '#888' }}>{t.country}</span>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {selectedFlight.originCountry}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default FlightPanel;
