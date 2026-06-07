/**
 * 多语言翻译文件
 * 支持中文和英文
 */

export type Language = 'zh' | 'en';

export const translations = {
  // 通用
  common: {
    now: { zh: '现在', en: 'Now' },
    loading: { zh: '加载中...', en: 'Loading...' },
    error: { zh: '错误', en: 'ERROR' },
    retry: { zh: '重试', en: 'RETRY' },
    search: { zh: '搜索', en: 'SEARCH' },
    searching: { zh: '搜索中...', en: 'Searching...' },
    version: { zh: '版本', en: 'VERSION' },
    author: { zh: '作者', en: 'AUTHOR' },
    show: { zh: '显示', en: 'SHOW' },
    hide: { zh: '隐藏', en: 'HIDE' },
    refresh: { zh: '刷新数据', en: 'REFRESH DATA' },
    refreshing: { zh: '刷新中...', en: 'REFRESHING...' },
  },

  // 设置菜单
  settings: {
    title: { zh: '设置', en: 'SETTINGS' },
    language: { zh: '语言', en: 'LANGUAGE' },
    unitSystem: { zh: '单位系统', en: 'UNIT SYSTEM' },
    metric: { zh: '公制', en: 'Metric' },
    imperial: { zh: '英制', en: 'Imperial' },
    temperature: { zh: '温度', en: 'Temperature' },
    celsius: { zh: '摄氏度', en: 'Celsius' },
    fahrenheit: { zh: '华氏度', en: 'Fahrenheit' },
    accessibility: { zh: '无障碍', en: 'ACCESSIBILITY' },
    highContrast: { zh: '高对比度模式', en: 'High Contrast Mode' },
    reducedMotion: { zh: '减少动画', en: 'Reduced Motion' },
    keyboardShortcuts: { zh: '键盘快捷键', en: 'Keyboard Shortcuts' },
    ephemerisStatus: { zh: '星历状态', en: 'EPHEMERIS STATUS' },
  },

  // 时间控制
  timeControl: {
    jumpToNow: { zh: '跳转到现在', en: 'Jump to now' },
    selectDate: { zh: '选择日期', en: 'Select date' },
    accuracyWarning: { zh: '精度可能降低', en: 'Accuracy may be reduced' },
    paused: { zh: '暂停', en: 'Paused' },
    future: { zh: '未来', en: '' },
    past: { zh: '过去', en: '' },
    // 时间单位
    year: { zh: '年', en: 'y' },
    month: { zh: '个月', en: 'mo' },
    day: { zh: '天', en: 'd' },
    hour: { zh: '小时', en: 'h' },
    minute: { zh: '分钟', en: 'm' },
    second: { zh: '秒', en: 's' },
  },

  // 搜索
  search: {
    title: { zh: '搜索天体', en: 'SEARCH' },
    placeholder: { zh: '搜索天体（Ctrl+K 或 /）', en: 'Search celestial objects (Ctrl+K or /)' },
    noResults: { zh: '未找到匹配的天体', en: 'No matching celestial objects found' },
  },

  // 卫星
  satellite: {
    title: { zh: '地球卫星', en: 'SATELLITES' },
    control: { zh: '卫星控制', en: 'SATELLITE CONTROL' },
    searchPlaceholder: { zh: '名称或NORAD ID...', en: 'Name or NORAD ID...' },
    visible: { zh: '可见卫星', en: 'VISIBLE' },
    updated: { zh: '更新时间', en: 'UPDATED' },
    notUpdated: { zh: '未更新', en: 'Not updated' },
    justNow: { zh: '刚刚', en: 'Just now' },
    minutesAgo: { zh: '分钟前', en: 'm ago' },
    hoursAgo: { zh: '小时前', en: 'h ago' },
    daysAgo: { zh: '天前', en: 'd ago' },
    info: { zh: '卫星信息', en: 'SATELLITE INFO' },
    basicInfo: { zh: '基本信息', en: 'BASIC INFO' },
    altitude: { zh: '高度', en: 'ALTITUDE' },
    velocity: { zh: '速度', en: 'VELOCITY' },
    orbitalParams: { zh: '轨道参数', en: 'ORBITAL PARAMETERS' },
    inclination: { zh: '倾角', en: 'INCLINATION' },
    eccentricity: { zh: '偏心率', en: 'ECCENTRICITY' },
    period: { zh: '周期', en: 'PERIOD' },
    semiMajorAxis: { zh: '半长轴', en: 'SEMI-MAJOR AXIS' },
    minutes: { zh: '分钟', en: 'min' },
    statistics: { zh: '统计信息', en: 'STATISTICS' },
    byCategory: { zh: '类别分布', en: 'BY CATEGORY' },
    performance: { zh: '性能', en: 'PERFORMANCE' },
    renderTime: { zh: '渲染时间', en: 'RENDER TIME' },
    showSatellites: { zh: '显示卫星', en: 'SHOW SATELLITES' },
    hideSatellites: { zh: '隐藏卫星', en: 'HIDE SATELLITES' },
    showOrbit: { zh: '显示轨道', en: 'SHOW ORBIT' },
    hideOrbit: { zh: '隐藏轨道', en: 'HIDE ORBIT' },
    visualizationError: { zh: '卫星可视化组件发生错误', en: 'Satellite visualization error occurred' },
  },

  // 天体名称
  celestialBodies: {
    sun: { zh: '太阳', en: 'Sun' },
    mercury: { zh: '水星', en: 'Mercury' },
    venus: { zh: '金星', en: 'Venus' },
    earth: { zh: '地球', en: 'Earth' },
    mars: { zh: '火星', en: 'Mars' },
    jupiter: { zh: '木星', en: 'Jupiter' },
    saturn: { zh: '土星', en: 'Saturn' },
    uranus: { zh: '天王星', en: 'Uranus' },
    neptune: { zh: '海王星', en: 'Neptune' },
    moon: { zh: '月球', en: 'Moon' },
  },

  // 天体类型
  celestialTypes: {
    star: { zh: '恒星', en: 'Star' },
    planet: { zh: '行星', en: 'Planet' },
    satellite: { zh: '卫星', en: 'Satellite' },
    galaxy: { zh: '星系', en: 'Galaxy' },
    group: { zh: '星系群', en: 'Group' },
    cluster: { zh: '星系团', en: 'Cluster' },
    supercluster: { zh: '超星系团', en: 'Supercluster' },
  },

  // 银河系
  galaxy: {
    milkyWay: { zh: '银河系', en: 'Milky Way' },
    laniakea: { zh: '拉尼亚凯亚超星系团', en: 'Laniakea Supercluster' },
  },

  // 缩放层级
  zoomLevels: {
    solarSystem: { zh: '太阳系', en: 'Solar System' },
    innerPlanets: { zh: '内行星', en: 'Inner Planets' },
    earthMoon: { zh: '地月系', en: 'Earth-Moon' },
    jupiterSystem: { zh: '木星系', en: 'Jupiter System' },
    saturnSystem: { zh: '土星系', en: 'Saturn System' },
  },

  // 语言切换
  language: {
    switch: { zh: '切换语言', en: 'Switch language' },
    chinese: { zh: '中文', en: 'Chinese' },
    english: { zh: '英文', en: 'English' },
  },
} as const;

export type TranslationKey = typeof translations;