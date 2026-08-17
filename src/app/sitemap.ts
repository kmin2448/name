import type { MetadataRoute } from 'next'
import { SITEMAP_PATHS, resolveSiteUrl } from '@/lib/siteMeta'

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = resolveSiteUrl()
  const lastModified = new Date()

  return SITEMAP_PATHS.map((path) => ({
    url: `${siteUrl}${path === '/' ? '' : path}`,
    lastModified,
    changeFrequency: 'monthly' as const,
    // 첫 화면이 가장 중요하다
    priority: path === '/' ? 1 : 0.7,
  }))
}
