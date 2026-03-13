/**
 * @module astronomy/names
 * @description 天体名称多语言映射模块
 * 
 * 本模块提供天体名称的多语言支持（中文/英文），用于在 Canvas 渲染和 UI 界面中
 * 根据用户语言设置显示对应的天体名称。
 * 
 * @architecture
 * - 所属子系统：天文计算
 * - 架构层级：核心层
 * - 职责边界：负责天体名称的多语言映射，不负责语言切换逻辑或渲染
 * 
 * @dependencies
 * - 直接依赖：无
 * - 被依赖：astronomy/index, 3d/celestial-objects, components/ui
 * - 循环依赖：无
 * 
 * 支持的天体：
 * - 太阳系八大行星：水星、金星、地球、火星、木星、土星、天王星、海王星
 * - 主要卫星：月球、木卫一至四、土卫二和六、天卫一至四、海卫一
 * 
 * @example
 * ```typescript
 * import { planetNames } from './names';
 * 
 * // 获取中文名称
 * const earthNameCN = planetNames.zh['Earth']; // '地球'
 * 
 * // 获取英文名称
 * const earthNameEN = planetNames.en['Earth']; // 'Earth'
 * 
 * // 根据语言设置获取名称
 * const lang = 'zh'; // 从 Zustand store 获取
 * const name = planetNames[lang]['Jupiter']; // '木星'
 * ```
 */

export const planetNames: Record<string, Record<string, string>> = {
  en: {
    Sun: 'Sun',
    Mercury: 'Mercury',
    Venus: 'Venus',
    Earth: 'Earth',
    Mars: 'Mars',
    Jupiter: 'Jupiter',
    Saturn: 'Saturn',
    Uranus: 'Uranus',
    Neptune: 'Neptune',
    Moon: 'Moon',
    Io: 'Io',
    Europa: 'Europa',
    Ganymede: 'Ganymede',
    Callisto: 'Callisto',
    Titan: 'Titan',
    Enceladus: 'Enceladus',
    Miranda: 'Miranda',
    Ariel: 'Ariel',
    Umbriel: 'Umbriel',
    Titania: 'Titania',
    Triton: 'Triton',
  },
  zh: {
    Sun: '太阳',
    Mercury: '水星',
    Venus: '金星',
    Earth: '地球',
    Mars: '火星',
    Jupiter: '木星',
    Saturn: '土星',
    Uranus: '天王星',
    Neptune: '海王星',
    Moon: '月球',
    Io: '木卫一',
    Europa: '木卫二',
    Ganymede: '木卫三',
    Callisto: '木卫四',
    Titan: '土卫六',
    Enceladus: '土卫二',
    Miranda: '天卫一',
    Ariel: '天卫二',
    Umbriel: '天卫三',
    Titania: '天卫四',
    Triton: '海卫一',
  },
};
