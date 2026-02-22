/**
 * 卫星详情内容组件
 * 
 * 显示卫星的完整详细信息，支持实时数据更新
 */

import { useEffect, useState, useMemo, memo } from 'react';
import { useSatelliteStore } from '@/lib/store/useSatelliteStore';
import { SatelliteDetailData } from '@/lib/types/satellite';

interface SatelliteDetailContentProps {
  data: SatelliteDetailData;
  lang?: 'zh' | 'en';
}

/**
 * 国家到ISO代码的映射
 */
const countryToISO: Record<string, string> = {
  // 主要国家
  'US': 'us',
  'USA': 'us',
  'United States': 'us',
  'Russia': 'ru',
  'RU': 'ru',
  'China': 'cn',
  'CN': 'cn',
  'Japan': 'jp',
  'JP': 'jp',
  'India': 'in',
  'IN': 'in',
  'United Kingdom': 'gb',
  'UK': 'gb',
  'France': 'fr',
  'FR': 'fr',
  'Germany': 'de',
  'DE': 'de',
  'Canada': 'ca',
  'CA': 'ca',
  'Italy': 'it',
  'IT': 'it',
  'Spain': 'es',
  'ES': 'es',
  
  // 其他国家
  'Luxembourg': 'lu',
  'Uruguay': 'uy',
  'Finland': 'fi',
  'Australia': 'au',
  'Brazil': 'br',
  'South Korea': 'kr',
  'United Arab Emirates': 'ae',
  'Saudi Arabia': 'sa',
  'Norway': 'no',
  'Mexico': 'mx',
  'Algeria': 'dz',
  'Argentina': 'ar',
  'Austria': 'at',
  'Belgium': 'be',
  'Chile': 'cl',
  'Colombia': 'co',
  'Czech Republic': 'cz',
  'Denmark': 'dk',
  'Egypt': 'eg',
  'Greece': 'gr',
  'Hungary': 'hu',
  'Indonesia': 'id',
  'Iran': 'ir',
  'Iraq': 'iq',
  'Ireland': 'ie',
  'Israel': 'il',
  'Kazakhstan': 'kz',
  'Malaysia': 'my',
  'Netherlands': 'nl',
  'New Zealand': 'nz',
  'Nigeria': 'ng',
  'Pakistan': 'pk',
  'Peru': 'pe',
  'Philippines': 'ph',
  'Poland': 'pl',
  'Portugal': 'pt',
  'Qatar': 'qa',
  'Romania': 'ro',
  'Singapore': 'sg',
  'South Africa': 'za',
  'Sweden': 'se',
  'Switzerland': 'ch',
  'Taiwan': 'tw',
  'Thailand': 'th',
  'Turkey': 'tr',
  'Ukraine': 'ua',
  'Venezuela': 've',
  'Vietnam': 'vn',
  
  // 国际组织
  'International': 'un',
  'Multinational': 'un',
  'ESA': 'eu',
  'EUMETSAT': 'eu',
  'European Space Agency': 'eu',
};

/**
 * 获取国旗组件
 */
function getCountryFlag(country: string | undefined): React.ReactNode {
  if (!country) return null;
  
  // 处理"NR (日期)"格式的未注册国家
  if (country.startsWith('NR')) {
    return <span className="text-gray-500 text-xs">未注册</span>;
  }
  
  const isoCode = countryToISO[country];
  if (!isoCode) {
    return <span className="text-gray-500 text-xs">{country.substring(0, 2).toUpperCase()}</span>;
  }
  
  // 使用CSS方式显示国旗
  return (
    <span 
      className="inline-block w-6 h-4 rounded-sm overflow-hidden"
      style={{
        backgroundImage: `url(https://flagcdn.com/w40/${isoCode}.png)`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
      title={country}
    />
  );
}

/**
 * 数据行组件 - 使用memo优化
 */
const DataRow = memo(({ label, value }: { label: string; value: string | number | React.ReactNode }) => {
  return (
    <div className="flex justify-between items-center text-sm py-1.5 border-b border-white/5">
      <span className="text-gray-400">{label}</span>
      <span className="text-gray-100 font-mono">{value}</span>
    </div>
  );
});
DataRow.displayName = 'DataRow';

/**
 * 区块标题组件 - 使用memo优化
 */
const SectionTitle = memo(({ children }: { children: React.ReactNode }) => {
  return (
    <h3 className="text-base font-light text-white/80 mb-3 tracking-wide flex items-center gap-2">
      <div className="w-1 h-4 bg-white/60" />
      {children}
    </h3>
  );
});
SectionTitle.displayName = 'SectionTitle';

function SatelliteDetailContent({ data, lang = 'zh' }: SatelliteDetailContentProps) {
  // 订阅Store中的卫星实时状态
  const satelliteState = useSatelliteStore((state) => 
    data.noradId ? state.satellites.get(data.noradId) : null
  );

  // 使用本地状态存储实时数据，每秒更新
  const [realTimeData, setRealTimeData] = useState(data.realTimeData);

  // 每秒更新实时数据
  useEffect(() => {
    const updateRealTimeData = () => {
      // 从Store获取最新的卫星状态
      const currentState = useSatelliteStore.getState().satellites.get(data.noradId);
      
      if (!currentState) {
        return;
      }

      // 确保position和velocity是Vector3对象
      const position = currentState.position;
      const velocityValue = currentState.velocity;
      
      if (!position || !velocityValue) {
        return;
      }

      // 计算速度大小
      let velocityMagnitude = 0;
      if (typeof velocityValue === 'object' && 'length' in velocityValue && typeof velocityValue.length === 'function') {
        // velocity是Vector3对象,调用length()方法
        velocityMagnitude = velocityValue.length();
      } else if (typeof velocityValue === 'number') {
        // velocity已经是数值
        velocityMagnitude = velocityValue;
      }

      // 计算距离(position是AU单位,需要转换为km)
      const AU_TO_KM = 149597870.7;
      const distanceAU = position.length();
      const distanceKm = distanceAU * AU_TO_KM;

      // 计算经纬度(使用归一化的位置向量)
      const latitude = Math.asin(position.y / distanceAU) * (180 / Math.PI);
      const longitude = Math.atan2(position.z, position.x) * (180 / Math.PI);

      const newData = {
        latitude,
        longitude,
        altitude: currentState.altitude || 0,
        velocity: velocityMagnitude,
        distance: distanceKm,
      };

      setRealTimeData(newData);
    };

    // 立即更新一次
    updateRealTimeData();

    // 每秒更新
    const interval = setInterval(updateRealTimeData, 1000);

    return () => clearInterval(interval);
  }, [data.noradId]);

  // 使用useMemo缓存翻译文本
  const t = useMemo(() => ({
    basicInfo: lang === 'zh' ? '基本信息' : 'Basic Information',
    orbitalParams: lang === 'zh' ? '轨道参数' : 'Orbital Parameters',
    realTimeData: lang === 'zh' ? '实时数据' : 'Real-time Data',
    physicalProps: lang === 'zh' ? '物理特性' : 'Physical Properties',
    launchInfo: lang === 'zh' ? '发射信息' : 'Launch Information',
    missionInfo: lang === 'zh' ? '任务信息' : 'Mission Information',
    notAvailable: lang === 'zh' ? '数据不可用' : 'Not Available',
  }), [lang]);

  return (
    <div className="space-y-6">
      {/* 标题区域 */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-1 h-8 bg-white/80" />
          <h2 className="text-2xl font-light text-white tracking-wider flex items-center gap-2">
            {data.basicInfo?.name || 'Unknown Satellite'}
            {data.basicInfo?.country && (
              <span className="ml-2">{getCountryFlag(data.basicInfo.country)}</span>
            )}
          </h2>
        </div>
        {data.basicInfo?.category && (
          <div className="ml-4 pl-3 border-l border-white/20">
            <span className="text-xs text-white/50 tracking-wide uppercase">
              {data.basicInfo.category}
            </span>
          </div>
        )}
      </div>

      {/* 基本信息 */}
      {data.basicInfo && (
        <section className="relative pl-4 border-l border-white/15">
          <SectionTitle>{t.basicInfo}</SectionTitle>
          <div className="space-y-0">
            <DataRow label="NORAD ID" value={data.basicInfo.noradId} />
            <DataRow 
              label={lang === 'zh' ? '国际编号' : 'COSPAR ID'} 
              value={data.basicInfo.cosparId || (lang === 'zh' ? '未知' : 'Unknown')} 
            />
            <DataRow 
              label={lang === 'zh' ? '所属国家' : 'Country'} 
              value={
                data.basicInfo.country ? (
                  <span className="flex items-center gap-2">
                    {getCountryFlag(data.basicInfo.country)}
                    <span>{data.basicInfo.country}</span>
                  </span>
                ) : (lang === 'zh' ? '未知' : 'Unknown')
              } 
            />
            <DataRow 
              label={lang === 'zh' ? '所有者' : 'Owner'} 
              value={data.basicInfo.owner || (lang === 'zh' ? '未知' : 'Unknown')} 
            />
          </div>
        </section>
      )}

      {/* 轨道参数 */}
      {data.orbitalParameters && (
        <section className="relative pl-4 border-l border-white/15">
          <SectionTitle>{t.orbitalParams}</SectionTitle>
          <div className="space-y-0">
            <DataRow 
              label={lang === 'zh' ? '半长轴' : 'Semi-major Axis'} 
              value={`${data.orbitalParameters.semiMajorAxis.toFixed(2)} km`} 
            />
            <DataRow 
              label={lang === 'zh' ? '偏心率' : 'Eccentricity'} 
              value={data.orbitalParameters.eccentricity.toFixed(4)} 
            />
            <DataRow 
              label={lang === 'zh' ? '轨道倾角' : 'Inclination'} 
              value={`${data.orbitalParameters.inclination.toFixed(2)}°`} 
            />
            <DataRow 
              label={lang === 'zh' ? '升交点赤经' : 'RAAN'} 
              value={`${data.orbitalParameters.raan.toFixed(2)}°`} 
            />
            <DataRow 
              label={lang === 'zh' ? '近地点幅角' : 'Arg of Perigee'} 
              value={`${data.orbitalParameters.argumentOfPerigee.toFixed(2)}°`} 
            />
            <DataRow 
              label={lang === 'zh' ? '平近点角' : 'Mean Anomaly'} 
              value={`${data.orbitalParameters.meanAnomaly.toFixed(2)}°`} 
            />
            <DataRow 
              label={lang === 'zh' ? '轨道周期' : 'Period'} 
              value={`${data.orbitalParameters.period.toFixed(2)} ${lang === 'zh' ? '分钟' : 'min'}`} 
            />
            <DataRow 
              label={lang === 'zh' ? '近地点高度' : 'Perigee'} 
              value={`${data.orbitalParameters.perigee.toFixed(2)} km`} 
            />
            <DataRow 
              label={lang === 'zh' ? '远地点高度' : 'Apogee'} 
              value={`${data.orbitalParameters.apogee.toFixed(2)} km`} 
            />
          </div>
        </section>
      )}

      {/* 实时数据 */}
      {realTimeData && (
        <section className="relative pl-4 border-l border-white/15">
          <SectionTitle>{t.realTimeData}</SectionTitle>
          <div className="space-y-0">
            <DataRow 
              label={lang === 'zh' ? '纬度' : 'Latitude'} 
              value={`${realTimeData.latitude.toFixed(4)}°`} 
            />
            <DataRow 
              label={lang === 'zh' ? '经度' : 'Longitude'} 
              value={`${realTimeData.longitude.toFixed(4)}°`} 
            />
            <DataRow 
              label={lang === 'zh' ? '高度' : 'Altitude'} 
              value={`${realTimeData.altitude.toFixed(2)} km`} 
            />
            <DataRow 
              label={lang === 'zh' ? '速度' : 'Velocity'} 
              value={`${realTimeData.velocity.toFixed(2)} km/s`} 
            />
            <DataRow 
              label={lang === 'zh' ? '距离' : 'Distance'} 
              value={`${realTimeData.distance.toFixed(2)} km`} 
            />
          </div>
        </section>
      )}

      {/* 物理特性 */}
      {data.physicalProperties && (
        <section className="relative pl-4 border-l border-white/15">
          <SectionTitle>{t.physicalProps}</SectionTitle>
          <div className="space-y-0">
            <DataRow 
              label={lang === 'zh' ? '雷达截面积' : 'RCS'} 
              value={data.physicalProperties.rcs !== undefined ? `${data.physicalProperties.rcs.toFixed(2)} m²` : (lang === 'zh' ? '未知' : 'Unknown')} 
            />
            <DataRow 
              label={lang === 'zh' ? '质量' : 'Mass'} 
              value={data.physicalProperties.mass !== undefined ? `${data.physicalProperties.mass.toFixed(2)} kg` : (lang === 'zh' ? '未知' : 'Unknown')} 
            />
            <DataRow 
              label={lang === 'zh' ? '尺寸' : 'Size'} 
              value={data.physicalProperties.size || (lang === 'zh' ? '未知' : 'Unknown')} 
            />
          </div>
        </section>
      )}

      {/* 发射信息 */}
      {data.launchInfo && (
        <section className="relative pl-4 border-l border-white/15">
          <SectionTitle>{t.launchInfo}</SectionTitle>
          <div className="space-y-0">
            <DataRow 
              label={lang === 'zh' ? '发射日期' : 'Launch Date'} 
              value={data.launchInfo.launchDate || (lang === 'zh' ? '未知' : 'Unknown')} 
            />
            <DataRow 
              label={lang === 'zh' ? '发射场' : 'Launch Site'} 
              value={data.launchInfo.launchSite || (lang === 'zh' ? '未知' : 'Unknown')} 
            />
            <DataRow 
              label={lang === 'zh' ? '运载火箭' : 'Launch Vehicle'} 
              value={data.launchInfo.launchVehicle || (lang === 'zh' ? '未知' : 'Unknown')} 
            />
          </div>
        </section>
      )}

      {/* 任务信息 */}
      {data.missionInfo && (
        <section className="relative pl-4 border-l border-white/15">
          <SectionTitle>{t.missionInfo}</SectionTitle>
          <div className="space-y-0">
            <DataRow 
              label={lang === 'zh' ? '卫星类型' : 'Type'} 
              value={data.missionInfo.type || (lang === 'zh' ? '未知' : 'Unknown')} 
            />
            <DataRow 
              label={lang === 'zh' ? '操作者' : 'Operator'} 
              value={data.missionInfo.operator || (lang === 'zh' ? '未知' : 'Unknown')} 
            />
            <DataRow 
              label={lang === 'zh' ? '预期寿命' : 'Expected Lifetime'} 
              value={data.missionInfo.expectedLifetime || (lang === 'zh' ? '未知' : 'Unknown')} 
            />
            {data.missionInfo.purpose && (
              <div className="mt-3 pt-3 border-t border-white/5">
                <p className="text-xs text-gray-400 mb-1">{lang === 'zh' ? '任务描述' : 'Purpose'}</p>
                <p className="text-sm text-white/70 leading-relaxed">{data.missionInfo.purpose}</p>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

// 使用memo优化，避免不必要的重渲染
export default memo(SatelliteDetailContent);
