import type { MetadataRoute } from 'next'
import { resolveSiteUrl } from '@/lib/siteMeta'

export default function robots(): MetadataRoute.Robots {
  const siteUrl = resolveSiteUrl()

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // 로그인·데이터 경로는 검색 결과에 뜰 이유가 없다
      disallow: ['/api/'],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  }
}
