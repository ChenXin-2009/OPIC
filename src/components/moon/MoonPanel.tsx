/**
 * MoonPanel.tsx — 月球数据面板
 *
 * MOD 窗口内容组件，展示天文计算实时数据。
 * 无 emoji，纯文本数值显示。
 *
 * 数据流：
 *   useSolarSystemAnimation → useLunarStore.update(simTime)
 *   MoonPanel → useLunarStore.subscribe → 实时刷新
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import { useLunarStore, type LunarStateData } from '@/lib/store/LunarState';
import { ALL_LANDING_SITES, type LunarSite } from '@/lib/astronomy/lunar-sites';

interface MoonPanelProps {
  lang?: 'zh' | 'en';
  asWindowContent?: boolean;
}

type TabId = 'phase' | 'sites';

function fmt(n: number, digits: number = 1): string {
  return n.toFixed(digits);
}

function fmtKm(km: number): string {
  return km.toLocaleString('zh-CN', { maximumFractionDigits: 0 });
}

function phaseLabel(angle: number, lang: 'zh' | 'en'): string {
  const a = ((angle % 360) + 360) % 360;
  const labels: Record<string, string> = {
    zh: a <= 45 ? '蛾眉月' : a <= 90 ? '上弦月' : a <= 135 ? '盈凸月' : a <= 180 ? '满月' : a <= 225 ? '亏凸月' : a <= 270 ? '下弦月' : a <= 315 ? '残月' : '新月',
    en: a <= 45 ? 'Waxing Crescent' : a <= 90 ? 'First Quarter' : a <= 135 ? 'Waxing Gibbous' : a <= 180 ? 'Full Moon' : a <= 225 ? 'Waning Gibbous' : a <= 270 ? 'Third Quarter' : a <= 315 ? 'Waning Crescent' : 'New Moon',
  };
  return labels[lang] || labels['zh'];
}

const TABS: TabId[] = ['phase', 'sites'];

export function MoonPanel({ lang = 'zh', asWindowContent = false }: MoonPanelProps) {
  const [data, setData] = useState<LunarStateData | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('phase');
  const [siteFilter, setSiteFilter] = useState<'all' | 'landing' | 'crater' | 'mare'>('all');

  useEffect(() => {
    // 首次：如果 store 为空，触发一次初始化
    const store = useLunarStore.getState();
    if (!store.data) {
      store.update(new Date());
    }
    setData(store.data);

    const unsub = useLunarStore.subscribe((s) => {
      if (s.data) setData(s.data);
    });
    return unsub;
  }, []);

  if (!data) {
    return (
      <div className="flex items-center justify-center h-full text-white/40 text-sm">
        {lang === 'zh' ? '计算中...' : 'Computing...'}
      </div>
    );
  }

  const { phase, libration, distanceKm, illumination, subSolar, subEarth } = data;

  const filteredSites = siteFilter === 'all'
    ? ALL_LANDING_SITES
    : ALL_LANDING_SITES.filter(s => s.type === siteFilter);

  return (
    <div className="flex flex-col h-full text-white/85 text-xs" style={{ fontFamily: "'SF Mono', 'Fira Code', Consolas, monospace" }}>
      {/* Tabs */}
      <div className="flex border-b border-white/10 shrink-0">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 text-center text-xs transition-colors ${
              activeTab === tab
                ? 'text-white border-b-2 border-blue-400 font-medium'
                : 'text-white/40 hover:text-white/70'
            }`}
          >
            {tab === 'phase' ? (lang === 'zh' ? '月相数据' : 'Phase Data')
             : (lang === 'zh' ? '着陆点' : 'Landing Sites')}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {activeTab === 'phase' ? (
          <>
            {/* Phase name + angle */}
            <div className="flex justify-between items-center py-1">
              <span className="text-sm font-medium text-blue-200">
                {phaseLabel(phase.angle, lang)}
              </span>
              <span className="text-white/40">{fmt(phase.angle)} deg</span>
            </div>

            {/* Phase bar */}
            <div className="h-1.5 bg-white/8 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-slate-500 to-blue-400 transition-all duration-300"
                style={{ width: `${illumination.phase_fraction * 100}%` }}
              />
            </div>

            {/* Data grid */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 pt-2">
              <Row label={lang === 'zh' ? '照亮比' : 'Illumination'} value={`${fmt(illumination.phase_fraction * 100)}%`} />
              <Row label={lang === 'zh' ? '相位角' : 'Phase Angle'} value={`${fmt(illumination.phase_angle)} deg`} />
              <Row label={lang === 'zh' ? '地月距' : 'Distance'} value={`${fmtKm(distanceKm)} km`} />
              <Row label={lang === 'zh' ? '视星等' : 'Magnitude'} value={fmt(illumination.magnitude, 1)} />
              <Row label={lang === 'zh' ? '视直径' : 'App. Diameter'} value={`${fmt(libration.diam_deg, 3)} deg`} />
              <Row label={lang === 'zh' ? '经度天平动' : 'Libration lon'} value={`${fmt(libration.elon, 3)} deg`} />
              <Row label={lang === 'zh' ? '纬度天平动' : 'Libration lat'} value={`${fmt(libration.elat, 3)} deg`} />
              <Row label={lang === 'zh' ? '日下点' : 'Sub-Solar'} value={`${fmt(subSolar.lon)} deg, ${fmt(subSolar.lat)} deg`} />
              <Row label={lang === 'zh' ? '面心点' : 'Sub-Earth'} value={`${fmt(subEarth.lon)} deg, ${fmt(subEarth.lat)} deg`} />
            </div>

            {/* Status bar */}
            <div className="text-white/25 text-[10px] pt-2 border-t border-white/5 flex justify-between">
              <span>astronomy-engine v2</span>
              <span className="w-1.5 h-1.5 rounded-full bg-green-500/80" title="Active" />
            </div>
          </>
        ) : (
          <>
            {/* Site filter */}
            <div className="flex gap-1.5 flex-wrap">
              {(['all', 'landing', 'crater', 'mare'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setSiteFilter(f)}
                  className={`px-2.5 py-1 rounded text-[11px] transition-colors ${
                    siteFilter === f
                      ? 'bg-blue-500/20 text-blue-300'
                      : 'bg-white/5 text-white/40 hover:text-white/70'
                  }`}
                >
                  {f === 'all' ? (lang === 'zh' ? '全部' : 'All') : ''}
                  {f === 'landing' ? (lang === 'zh' ? '着陆' : 'Landing') : ''}
                  {f === 'crater' ? (lang === 'zh' ? '环形山' : 'Craters') : ''}
                  {f === 'mare' ? (lang === 'zh' ? '月海' : 'Maria') : ''}
                </button>
              ))}
            </div>

            {/* Sites list */}
            <div className="space-y-0.5">
              {filteredSites.map(site => (
                <SiteRow key={site.name} site={site} lang={lang} />
              ))}
            </div>

            {/* Count */}
            <div className="text-white/25 text-[10px] pt-2 border-t border-white/5">
              {filteredSites.length} {lang === 'zh' ? '个特征' : 'features'}
              {siteFilter !== 'all' && ` (${lang === 'zh' ? '已筛选' : 'filtered'})`}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-white/40">{label}</span>
      <span className="text-white/80">{value}</span>
    </div>
  );
}

function SiteRow({ site, lang }: { site: LunarSite; lang: 'zh' | 'en' }) {
  const colors: Record<string, string> = {
    landing: 'bg-blue-500/60',
    crater: 'bg-amber-500/50',
    mare: 'bg-emerald-500/40',
    mountain: 'bg-stone-400/50',
    other: 'bg-slate-500/40',
  };
  return (
    <div className="flex items-center gap-2 py-1 border-b border-white/[0.03] last:border-0">
      <span className={`inline-block w-1.5 h-1.5 rounded-full shrink-0 ${colors[site.type] || colors.other}`} />
      <span className="flex-1 text-white/80 truncate text-[11px]">{site.name}</span>
      <span className="text-white/30 text-[10px] shrink-0">
        {site.lon > 0 ? 'E' : 'W'}{fmt(Math.abs(site.lon), 1)} /
        {site.lat > 0 ? 'N' : 'S'}{fmt(Math.abs(site.lat), 1)}
      </span>
      {site.year && (
        <span className="text-white/20 text-[10px] shrink-0">{site.year}</span>
      )}
    </div>
  );
}
