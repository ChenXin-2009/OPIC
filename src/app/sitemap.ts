/**
 * 站点地图 (Sitemap)
 *
 * 生成 Next.js 站点地图，用于搜索引擎爬虫。
 */

import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://opic.cxin.tech';

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
  ];
}
