/**
 * 系外行星系统面板 (Exoplanet System Panel)
 *
 * 显示选中系外行星系统的详细信息，包括宿主恒星和行星列表。
 * 支持行星选择、悬停高亮和轨道参数展示。
 */

'use client';

import { memo } from 'react';
import { formatMaybe } from '@/lib/exoplanets/coordinates';
import { useExoplanetStore } from '@/lib/store/useExoplanetStore';
import {
  ExoplanetPlanet,
  ExoplanetSelection,
  ExoplanetSystemDetails,
} from '@/lib/types/exoplanet';

interface ExoplanetSystemPanelProps {
  lang?: 'zh' | 'en';
}

const PANEL_COLORS = {
  background: 'rgba(5, 8, 14, 0.96)',
  border: 'rgba(255, 255, 255, 0.28)',
  text: '#f8fbff',
  dim: 'rgba(220, 230, 245, 0.62)',
  accent: '#9dd8ff',
};

const UI_TEXT = {
  zh: {
    hostTitle: '主恒星',
    planetTitle: '当前行星',
    planetList: '行星列表',
    name: '名称',
    distance: '距离',
    stars: '恒星数量',
    planets: '行星数量',
    spectralType: '光谱型',
    temperature: '有效温度',
    radius: '半径',
    mass: '质量',
    luminosity: '光度',
    age: '年龄',
    discovery: '发现方法',
    discoveryYear: '发现年份',
    period: '轨道周期',
    semiMajorAxis: '半长轴',
    equilibriumTemp: '平衡温度',
    eccentricity: '偏心率',
    inclination: '轨道倾角',
    insolation: '入射通量',
    loading: '正在从 NASA TAP 服务加载系统详情...',
    close: '关闭系外行星面板',
    hostSubtitle: '恒星系统参数',
    planetSubtitle: '行星参数',
  },
  en: {
    hostTitle: 'Host Star',
    planetTitle: 'Selected Planet',
    planetList: 'Planets',
    name: 'Name',
    distance: 'Distance',
    stars: 'Stars',
    planets: 'Planets',
    spectralType: 'Spectral Type',
    temperature: 'Temperature',
    radius: 'Radius',
    mass: 'Mass',
    luminosity: 'Luminosity',
    age: 'Age',
    discovery: 'Discovery',
    discoveryYear: 'Year',
    period: 'Period',
    semiMajorAxis: 'Semi-major Axis',
    equilibriumTemp: 'Equilibrium Temp',
    eccentricity: 'Eccentricity',
    inclination: 'Inclination',
    insolation: 'Insolation',
    loading: 'Loading system details from NASA TAP...',
    close: 'Close exoplanet panel',
    hostSubtitle: 'Host system parameters',
    planetSubtitle: 'Planet parameters',
  },
} as const;

type TextBundle = (typeof UI_TEXT)[keyof typeof UI_TEXT];

function LabelValue({ label, value }: { label: string; value: string | number }): React.ReactElement {
  return (
    <div className="flex justify-between gap-4 border-b border-white/5 py-1.5 text-xs">
      <span style={{ color: PANEL_COLORS.dim }}>{label}</span>
      <span className="font-mono text-right" style={{ color: PANEL_COLORS.text }}>{value}</span>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }): React.ReactElement {
  return (
    <div className="mb-2 mt-4 flex items-center gap-2 text-xs uppercase tracking-wider" style={{ color: PANEL_COLORS.dim }}>
      <span className="h-3 w-1" style={{ background: PANEL_COLORS.accent }} />
      {children}
    </div>
  );
}

function StatusBox({ tone, children }: { tone: 'loading' | 'error'; children: React.ReactNode }): React.ReactElement {
  const errorStyle = tone === 'error'
    ? 'border-red-400/30 bg-red-950/30 text-red-200'
    : 'border-white/10 text-white/70';

  return (
    <div className={`mt-8 border p-4 text-sm ${errorStyle}`}>
      {children}
    </div>
  );
}

function planetSummary(planet: ExoplanetPlanet, lang: 'zh' | 'en'): string {
  const radius = planet.radiusEarth ? `${formatMaybe(planet.radiusEarth, 2)} R⊕` : '-';
  const orbit = planet.semiMajorAxisAU ? `${formatMaybe(planet.semiMajorAxisAU, 3)} AU` : '-';
  return lang === 'zh' ? `半径 ${radius} / 轨道 ${orbit}` : `Radius ${radius} / Orbit ${orbit}`;
}

function HostDetails({ system, lang }: { system: ExoplanetSystemDetails; lang: 'zh' | 'en' }): React.ReactElement {
  const star = system.star;
  const t = UI_TEXT[lang];
  const rows = [
    [t.name, system.hostname],
    ['RA / Dec', `${formatMaybe(star.raDeg, 3)}° / ${formatMaybe(star.decDeg, 3)}°`],
    [t.distance, `${formatMaybe(star.distancePc, 2)} pc`],
    [t.stars, star.starCount],
    [t.planets, system.planets.length],
    [t.spectralType, star.spectralType ?? '-'],
    [t.temperature, `${formatMaybe(star.stellarTemperatureK, 0)} K`],
    [t.radius, `${formatMaybe(star.stellarRadiusSolar, 3)} R☉`],
    [t.mass, `${formatMaybe(star.stellarMassSolar, 3)} M☉`],
    [t.luminosity, `${formatMaybe(star.stellarLuminosityLogSolar, 3)} log L☉`],
    [t.age, `${formatMaybe(star.stellarAgeGyr, 2)} Gyr`],
  ] as Array<[string, string | number]>;

  return (
    <>
      <SectionTitle>{t.hostTitle}</SectionTitle>
      {rows.map(([label, value]) => <LabelValue key={label} label={label} value={value} />)}
    </>
  );
}

function PlanetDetails({ planet, lang }: { planet: ExoplanetPlanet; lang: 'zh' | 'en' }): React.ReactElement {
  const t = UI_TEXT[lang];
  const rows = [
    [t.name, planet.name],
    [t.discovery, planet.discoveryMethod ?? '-'],
    [t.discoveryYear, planet.discoveryYear ?? '-'],
    [t.period, `${formatMaybe(planet.orbitalPeriodDays, 3)} d`],
    [t.semiMajorAxis, `${formatMaybe(planet.semiMajorAxisAU, 4)} AU`],
    [t.radius, `${formatMaybe(planet.radiusEarth, 3)} R⊕`],
    [t.mass, `${formatMaybe(planet.massEarth, 3)} M⊕`],
    [t.equilibriumTemp, `${formatMaybe(planet.equilibriumTemperatureK, 0)} K`],
    [t.eccentricity, formatMaybe(planet.eccentricity, 4)],
    [t.inclination, `${formatMaybe(planet.inclinationDeg, 2)}°`],
    [t.insolation, `${formatMaybe(planet.insolationEarth, 3)} S⊕`],
  ] as Array<[string, string | number]>;

  return (
    <>
      <SectionTitle>{t.planetTitle}</SectionTitle>
      {rows.map(([label, value]) => <LabelValue key={label} label={label} value={value} />)}
    </>
  );
}

function PlanetList({
  planets,
  selectedBody,
  lang,
  onSelect,
}: {
  planets: ExoplanetPlanet[];
  selectedBody: ExoplanetSelection | null;
  lang: 'zh' | 'en';
  onSelect: (planetName: string) => void;
}): React.ReactElement {
  const t = UI_TEXT[lang];

  return (
    <>
      <SectionTitle>{t.planetList}</SectionTitle>
      <div className="space-y-2">
        {planets.map((planet) => {
          const active = selectedBody?.type === 'planet' && selectedBody.planetName === planet.name;
          return (
            <button
              key={planet.name}
              onClick={() => onSelect(planet.name)}
              className="w-full border px-3 py-2 text-left transition-colors"
              style={{
                borderColor: active ? PANEL_COLORS.accent : 'rgba(255,255,255,0.12)',
                background: active ? 'rgba(157,216,255,0.12)' : 'rgba(255,255,255,0.03)',
              }}
            >
              <div className="text-sm" style={{ color: PANEL_COLORS.text }}>{planet.name}</div>
              <div className="mt-1 text-[11px]" style={{ color: PANEL_COLORS.dim }}>
                {planetSummary(planet, lang)}
              </div>
            </button>
          );
        })}
      </div>
    </>
  );
}

function getSelectedPlanet(
  system: ExoplanetSystemDetails | null,
  selection: ExoplanetSelection | null
): ExoplanetPlanet | null {
  if (!system || selection?.type !== 'planet') {
    return null;
  }

  return system.planets.find((planet) => planet.name === selection.planetName) ?? null;
}

function getSubtitle(selectedPlanet: ExoplanetPlanet | null, text: TextBundle): string {
  return selectedPlanet ? text.planetSubtitle : text.hostSubtitle;
}

function ExoplanetSystemPanel({ lang = 'zh' }: ExoplanetSystemPanelProps): React.ReactElement | null {
  const {
    selectedHostName,
    selectedSystem,
    selectedBody,
    loadingSystem,
    systemError,
    clearSelection,
    selectPlanet,
  } = useExoplanetStore();

  if (!selectedHostName) {
    return null;
  }

  const t = UI_TEXT[lang];
  const selectedPlanet = getSelectedPlanet(selectedSystem, selectedBody);
  const title = selectedPlanet?.name ?? selectedSystem?.hostname ?? selectedHostName;
  const subtitle = getSubtitle(selectedPlanet, t);

  return (
    <aside
      className="pointer-events-auto fixed z-[1900] w-[400px] max-w-[92vw] overflow-hidden shadow-2xl"
      style={{
        top: '140px',
        right: '20px',
        bottom: '80px',
        maxHeight: 'calc(100vh - 220px)',
        background: PANEL_COLORS.background,
        border: `2px solid ${PANEL_COLORS.border}`,
        clipPath: 'polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)',
      }}
    >
      <button
        onClick={clearSelection}
        className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center text-white/60 transition-colors hover:text-white"
        style={{
          border: '1px solid rgba(255,255,255,0.25)',
          background: '#05080e',
          clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px))',
        }}
        aria-label={t.close}
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <div className="h-full overflow-y-auto p-6 pr-5 satellite-menu-scrollbar">
        <div className="pr-10">
          <div className="text-[10px] uppercase tracking-[0.22em]" style={{ color: PANEL_COLORS.dim }}>
            NASA Exoplanet Archive
          </div>
          <h2 className="mt-2 text-xl font-light" style={{ color: PANEL_COLORS.text }}>
            {title}
          </h2>
          <div className="mt-1 text-xs" style={{ color: PANEL_COLORS.dim }}>
            {subtitle}
          </div>
        </div>

        {loadingSystem && (
          <StatusBox tone="loading">
            {t.loading}
          </StatusBox>
        )}

        {systemError && !loadingSystem && (
          <StatusBox tone="error">{systemError}</StatusBox>
        )}

        {selectedSystem && (
          <>
            <HostDetails system={selectedSystem} lang={lang} />
            {selectedPlanet && <PlanetDetails planet={selectedPlanet} lang={lang} />}
            <PlanetList
              planets={selectedSystem.planets}
              selectedBody={selectedBody}
              lang={lang}
              onSelect={selectPlanet}
            />
          </>
        )}
      </div>
    </aside>
  );
}

export default memo(ExoplanetSystemPanel);
