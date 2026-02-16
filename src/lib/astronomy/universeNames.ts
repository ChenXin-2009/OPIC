/**
 * universeNames.ts - 宇宙天体中英文名称映射
 * 
 * 提供本星系群、近邻星系群、室女座超星系团等天体的中英文名称
 * 所有翻译基于天文学标准译名
 */

/**
 * 本星系群星系名称（中英文）
 * 数据来源：McConnachie (2012) 目录
 */
export const LOCAL_GROUP_NAMES: Record<string, string> = {
  // 银河系及其卫星星系
  'Milky Way': '银河系',
  'Canis Major': '大犬座矮星系',
  'Sagittarius dSph': '人马座矮椭球星系',
  'Segue (I)': 'Segue 1',
  'Segue I': 'Segue 1',
  'Ursa Major II': '大熊座 II',
  'Bootes II': '牧夫座 II',
  'Segue II': 'Segue 2',
  'Willman 1': 'Willman 1',
  'Coma Berenices': '后发座矮星系',
  'Bootes III': '牧夫座 III',
  'LMC': '大麦哲伦云',
  'SMC': '小麦哲伦云',
  'Bootes (I)': '牧夫座 I',
  'Bootes I': '牧夫座 I',
  'Draco': '天龙座矮星系',
  'Ursa Minor': '小熊座矮星系',
  'Sculptor': '玉夫座矮星系',
  'Sextans (I)': '六分仪座矮星系',
  'Sextans I': '六分仪座矮星系',
  'Ursa Major (I)': '大熊座 I',
  'Ursa Major I': '大熊座 I',
  'Carina': '船底座矮星系',
  'Hercules': '武仙座矮星系',
  'Fornax': '天炉座矮星系',
  'Leo IV': '狮子座 IV',
  'Canes Venatici II': '猎犬座 II',
  'Leo V': '狮子座 V',
  'Pisces II': '双鱼座 II',
  'Canes Venatici (I)': '猎犬座 I',
  'Canes Venatici I': '猎犬座 I',
  'Leo II': '狮子座 II',
  'Leo I': '狮子座 I',
  
  // 仙女座星系及其卫星星系
  'Andromeda': '仙女座星系',
  'M31': '仙女座星系',
  'MESSIER031': '仙女座星系',
  'M32': 'M32',
  'MESSIER032': 'M32',
  'Andromeda IX': '仙女座 IX',
  'NGC 205': 'NGC 205',
  'Andromeda XVII': '仙女座 XVII',
  'Andromeda I': '仙女座 I',
  'Andromeda XXVII': '仙女座 XXVII',
  'Andromeda III': '仙女座 III',
  'Andromeda XXV': '仙女座 XXV',
  'Andromeda XXVI': '仙女座 XXVI',
  'Andromeda XI': '仙女座 XI',
  'Andromeda V': '仙女座 V',
  'Andromeda X': '仙女座 X',
  'Andromeda XXIII': '仙女座 XXIII',
  'Andromeda XX': '仙女座 XX',
  'Andromeda XII': '仙女座 XII',
  'NGC 147': 'NGC 147',
  'Andromeda XXI': '仙女座 XXI',
  'Andromeda XIV': '仙女座 XIV',
  'Andromeda XV': '仙女座 XV',
  'Andromeda XIII': '仙女座 XIII',
  'Andromeda II': '仙女座 II',
  'NGC 185': 'NGC 185',
  'Andromeda XXIX': '仙女座 XXIX',
  'Andromeda XIX': '仙女座 XIX',
  'Triangulum': '三角座星系',
  'M33': '三角座星系',
  'MESSIER033': '三角座星系',
  'Andromeda XXIV': '仙女座 XXIV',
  'Andromeda VII': '仙女座 VII',
  'Andromeda XXII': '仙女座 XXII',
  'IC 10': 'IC 10',
  'LGS 3': 'LGS 3',
  'Local Group Suspect 3': 'LGS 3',
  'Andromeda VI': '仙女座 VI',
  'Andromeda XVI': '仙女座 XVI',
  'Andromeda XXVIII': '仙女座 XXVIII',
  'Andromeda XVIII': '仙女座 XVIII',
  'Andromeda XXX': '仙女座 XXX',
  'Andromeda IV': '仙女座 IV',
  
  // 其他本星系群成员
  'IC 1613': 'IC 1613',
  'Phoenix': '凤凰座矮星系',
  'NGC 6822': 'NGC 6822',
  'Cetus': '鲸鱼座矮星系',
  'Pegasus dIrr': '飞马座矮不规则星系',
  'Leo T': '狮子座 T',
  'WLM': 'WLM',
  'Wolf-Lundmark-Melotte': 'WLM',
  'Leo A': '狮子座 A',
  'Aquarius': '宝瓶座矮星系',
  'Tucana': '杜鹃座矮星系',
  'Sagittarius dIrr': '人马座矮不规则星系',
  'UGC 4879': 'UGC 4879',
  'NGC 3109': 'NGC 3109',
  'Sextans B': '六分仪座 B',
  'Antlia': '唧筒座矮星系',
  'Sextans A': '六分仪座 A',
};

/**
 * 近邻星系群名称（中英文）
 * 数据来源：Karachentsev et al. (2013) 目录
 */
export const NEARBY_GROUPS_NAMES: Record<string, string> = {
  // 主要星系群（科学文献中公认的名称）
  'IC 342 Group': 'IC 342 星系群',
  'Maffei Group': '麦菲星系群',
  'Sculptor Group': '玉夫座星系群',
  'M81 Group': 'M81 星系群',
  'M83 Group': 'M83 星系群',
  'M101 Group': 'M101 星系群',
  'Centaurus A Group': '半人马座 A 星系群',
  'NGC 1023 Group': 'NGC 1023 星系群',
  'NGC 1400 Group': 'NGC 1400 星系群',
  'Canes Venatici I Group': '猎犬座 I 星系群',
  'NGC 5128 Group': 'NGC 5128 星系群',
  
  // 其他星系群（基于最著名成员命名）
  'Leo I Group': '狮子座 I 星系群',
  'NGC 253 Group': 'NGC 253 星系群',
  'NGC 300 Group': 'NGC 300 星系群',
  'NGC 55 Group': 'NGC 55 星系群',
  'NGC 1313 Group': 'NGC 1313 星系群',
  'NGC 1569 Group': 'NGC 1569 星系群',
  'NGC 2403 Group': 'NGC 2403 星系群',
  'NGC 4214 Group': 'NGC 4214 星系群',
  'NGC 4395 Group': 'NGC 4395 星系群',
  'NGC 4736 Group': 'NGC 4736 星系群',
  'NGC 5194 Group': 'NGC 5194 星系群',
  'NGC 5236 Group': 'NGC 5236 星系群',
  
  // 梅西耶天体命名的星系群
  'M94 Group': 'M94 星系群',
  
  // IC 天体命名的星系群
  'IC 1613 Group': 'IC 1613 星系群',
  
  // 基于位置的描述性名称（当没有著名成员时）
  // 这些会动态生成，格式如 "Group SGX10" -> "星系群 SGX10"
};

/**
 * 室女座超星系团星系团名称（中英文）
 * 数据来源：2MRS 巡天数据
 */
export const VIRGO_SUPERCLUSTER_NAMES: Record<string, string> = {
  // 主要星系团
  'Virgo Cluster': '室女座星系团',
  'Fornax Cluster': '天炉座星系团',
  'Eridanus Cluster': '波江座星系团',
  
  // 星系群
  'Dorado Group': '剑鱼座星系群',
  'NGC 1400 Group': 'NGC 1400 星系群',
  'NGC 5846 Group': 'NGC 5846 星系群',
  'NGC 4697 Group': 'NGC 4697 星系群',
  'NGC 4753 Group': 'NGC 4753 星系群',
  'NGC 5363 Group': 'NGC 5363 星系群',
  'NGC 5566 Group': 'NGC 5566 星系群',
  'Leo II Group': '狮子座 II 星系群',
  
  // 云和延伸结构
  'Crater Cloud': '巨爵座云',
  'Virgo III Group': '室女座 III 星系群',
  'Virgo W Cloud': '室女座 W 云',
  'Virgo E Cloud': '室女座 E 云',
  'Virgo S Cloud': '室女座 S 云',
  'Virgo II Cloud': '室女座 II 云',
  'Coma I Group': '后发座 I 星系群',
  'Leo Cloud': '狮子座云',
  'Ursa Major Cloud': '大熊座云',
  'Canes Venatici Cloud': '猎犬座云',
  'Canes Venatici Spur': '猎犬座支',
  
  // 方向性描述（当无法识别具体结构时）
  'East Cluster': '东侧星系团',
  'West Cluster': '西侧星系团',
  'North Cluster': '北侧星系团',
  'South Cluster': '南侧星系团',
  'Upper Cluster': '上方星系团',
  'Lower Cluster': '下方星系团',
};

/**
 * 拉尼亚凯亚超星系团名称（中英文）
 * 数据来源：Cosmicflows-3 数据集
 * 
 * 注意：Cosmicflows-3 数据覆盖范围有限（GLON: 0-23°, GLAT: 0-59°）
 * 因此我们看到的是观测窗口内的结构，不是完整的超星系团
 */
export const LANIAKEA_SUPERCLUSTER_NAMES: Record<string, string> = {
  // 主要超星系团
  'Laniakea Supercluster': '拉尼亚凯亚超星系团',
  'Virgo Supercluster': '室女座超星系团',
  'Virgo Supercluster Core': '室女座超星系团核心',
  'Hydra Supercluster': '长蛇座超星系团',
  'Centaurus Supercluster': '半人马座超星系团',
  'Pavo-Indus Supercluster': '孔雀-印第安超星系团',
  'Southern Supercluster': '南天超星系团',
  
  // 编号的超星系团（同一类型的多个结构）
  'Centaurus Supercluster 2': '半人马座超星系团 2',
  'Centaurus Supercluster 3': '半人马座超星系团 3',
  'Southern Supercluster 2': '南天超星系团 2',
  'Southern Supercluster 3': '南天超星系团 3',
  
  // 室女座超星系团的不同区域
  'Virgo Supercluster (Leo Region)': '室女座超星系团（狮子座区域）',
  'Virgo Supercluster (Crater Region)': '室女座超星系团（巨爵座区域）',
  'Virgo Supercluster (Coma Region)': '室女座超星系团（后发座区域）',
  'Virgo Supercluster (Fornax Region)': '室女座超星系团（天炉座区域）',
  
  // 复合结构
  'Hydra-Centaurus Complex': '长蛇-半人马复合体',
  'Hydra-Centaurus Complex 2': '长蛇-半人马复合体 2',
  'Hydra-Centaurus Complex 3': '长蛇-半人马复合体 3',
  'Fornax-Eridanus Complex': '天炉-波江复合体',
  
  // 远距离结构
  'Distant Supercluster (Hydra Direction)': '远距离超星系团（长蛇座方向）',
  'Distant Supercluster (Pavo Direction)': '远距离超星系团（孔雀座方向）',
  'Distant Supercluster (Centaurus Direction)': '远距离超星系团（半人马座方向）',
};

/**
 * 近邻超星系团名称（中英文）
 */
export const NEARBY_SUPERCLUSTER_NAMES: Record<string, string> = {
  'Shapley Supercluster': '沙普利超星系团',
  'Hydra-Centaurus': '长蛇-半人马超星系团',
  'Pavo-Indus': '孔雀-印第安超星系团',
  'Perseus-Pisces': '英仙-双鱼超星系团',
  'Coma Supercluster': '后发座超星系团',
  'Hercules Supercluster': '武仙座超星系团',
  'Leo Supercluster': '狮子座超星系团',
  'Ophiuchus Supercluster': '蛇夫座超星系团',
};

/**
 * 获取天体的中文名称
 * @param englishName - 英文名称
 * @param scale - 宇宙尺度
 * @returns 中文名称，如果没有映射则返回处理后的名称
 */
export function getChineseName(englishName: string, scale: 'local-group' | 'nearby-groups' | 'virgo-supercluster' | 'laniakea' | 'nearby-supercluster'): string {
  let mapping: Record<string, string>;
  
  switch (scale) {
    case 'local-group':
      mapping = LOCAL_GROUP_NAMES;
      break;
    case 'nearby-groups':
      mapping = NEARBY_GROUPS_NAMES;
      break;
    case 'virgo-supercluster':
      mapping = VIRGO_SUPERCLUSTER_NAMES;
      break;
    case 'laniakea':
      mapping = LANIAKEA_SUPERCLUSTER_NAMES;
      break;
    case 'nearby-supercluster':
      mapping = NEARBY_SUPERCLUSTER_NAMES;
      break;
    default:
      return englishName;
  }
  
  // 直接映射
  if (mapping[englishName]) {
    return mapping[englishName];
  }
  
  // 处理动态生成的名称
  
  // 近邻星系群：处理 "M{number} Group", "NGC {number} Group", "IC {number} Group"
  if (scale === 'nearby-groups') {
    // M 天体
    const mMatch = englishName.match(/^M(\d+)\s+Group$/);
    if (mMatch) {
      return `M${mMatch[1]} 星系群`;
    }
    
    // NGC 天体
    const ngcMatch = englishName.match(/^NGC\s*(\d+)\s+Group$/);
    if (ngcMatch) {
      return `NGC ${ngcMatch[1]} 星系群`;
    }
    
    // IC 天体
    const icMatch = englishName.match(/^IC\s*(\d+)\s+Group$/);
    if (icMatch) {
      return `IC ${icMatch[1]} 星系群`;
    }
    
    // 基于位置的描述性名称 "Group SGX10"
    const posMatch = englishName.match(/^Group\s+(SG[XYZ]-?\d+)$/);
    if (posMatch) {
      return `星系群 ${posMatch[1]}`;
    }
  }
  
  // 室女座超星系团：处理方向性描述 "East Cluster 20Mpc"
  if (scale === 'virgo-supercluster') {
    const dirMatch = englishName.match(/^(East|West|North|South|Upper|Lower)\s+Cluster\s+(\d+)Mpc$/);
    if (dirMatch) {
      const dirMap: Record<string, string> = {
        'East': '东侧',
        'West': '西侧',
        'North': '北侧',
        'South': '南侧',
        'Upper': '上方',
        'Lower': '下方'
      };
      return `${dirMap[dirMatch[1]]}星系团 ${dirMatch[2]}Mpc`;
    }
  }
  
  // 如果没有匹配，返回原名称
  return englishName;
}
