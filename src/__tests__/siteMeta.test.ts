import {
  FALLBACK_SITE_URL,
  NAVER_SITE_VERIFICATION,
  SITEMAP_PATHS,
  SITE_DESCRIPTION,
  SITE_KEYWORDS,
  buildJsonLd,
  normalizeSiteUrl,
  resolveSiteUrl,
} from '@/lib/siteMeta'

describe('normalizeSiteUrl', () => {
  it('스킴이 없으면 https를 붙인다', () => {
    expect(normalizeSiteUrl('example.vercel.app')).toBe('https://example.vercel.app')
  })

  it('끝의 슬래시를 떼어 낸다 — 붙어 있으면 sitemap 주소가 //로 어긋난다', () => {
    expect(normalizeSiteUrl('https://example.com/')).toBe('https://example.com')
    expect(normalizeSiteUrl('https://example.com///')).toBe('https://example.com')
  })

  it('이미 온전한 주소는 그대로 둔다', () => {
    expect(normalizeSiteUrl('http://localhost:3000')).toBe('http://localhost:3000')
  })

  it('빈 값이면 기본 주소를 쓴다', () => {
    expect(normalizeSiteUrl('   ')).toBe(FALLBACK_SITE_URL)
  })
})

describe('resolveSiteUrl', () => {
  it('NEXT_PUBLIC_SITE_URL을 가장 먼저 쓴다', () => {
    expect(
      resolveSiteUrl({
        NEXT_PUBLIC_SITE_URL: 'https://mypage.com/',
        VERCEL_PROJECT_PRODUCTION_URL: 'other.vercel.app',
      })
    ).toBe('https://mypage.com')
  })

  it('없으면 Vercel이 넣어 주는 주소를 쓴다 (스킴이 빠져 있다)', () => {
    expect(resolveSiteUrl({ VERCEL_PROJECT_PRODUCTION_URL: 'proj.vercel.app' })).toBe(
      'https://proj.vercel.app'
    )
  })

  it('둘 다 없으면 기본 주소로 떨어진다', () => {
    expect(resolveSiteUrl({})).toBe(FALLBACK_SITE_URL)
  })
})

describe('검색 정보', () => {
  it('요청한 핵심 키워드가 모두 들어 있다', () => {
    for (const keyword of [
      '명패',
      '명패 제작',
      '명패 매크로',
      '명패 프린트',
      '명패 인쇄',
      '명패 자동화',
      '명패 만들기',
      '명패 자동 만들기',
      '명패 엑셀 작성',
    ]) {
      expect(SITE_KEYWORDS).toContain(keyword)
    }
  })

  it('키워드가 중복되지 않는다', () => {
    expect(new Set(SITE_KEYWORDS).size).toBe(SITE_KEYWORDS.length)
  })

  it('설명은 검색 결과에 잘리지 않을 길이다', () => {
    expect(SITE_DESCRIPTION.length).toBeGreaterThan(50)
    expect(SITE_DESCRIPTION.length).toBeLessThan(300)
  })

  it('사이트맵에 실제로 있는 페이지만 넣는다', () => {
    expect([...SITEMAP_PATHS]).toEqual(['/', '/guide'])
  })
})

describe('NAVER_SITE_VERIFICATION', () => {
  it('서치어드바이저가 준 형식 그대로다 — 한 글자만 달라도 확인이 실패한다', () => {
    expect(NAVER_SITE_VERIFICATION).toMatch(/^[a-f0-9]{40}$/)
  })
})

describe('buildJsonLd', () => {
  it('전달한 주소를 그대로 쓴다', () => {
    expect(buildJsonLd('https://example.com').url).toBe('https://example.com')
  })

  it('무료 웹 애플리케이션으로 알린다', () => {
    const jsonLd = buildJsonLd('https://example.com')
    expect(jsonLd['@type']).toBe('WebApplication')
    expect(jsonLd.isAccessibleForFree).toBe(true)
  })

  it('JSON으로 직렬화해도 깨지지 않는다 — script 태그에 그대로 넣는다', () => {
    const serialized = JSON.stringify(buildJsonLd('https://example.com'))
    expect(() => JSON.parse(serialized)).not.toThrow()
    // </script>가 섞이면 페이지가 깨지므로 없어야 한다
    expect(serialized).not.toContain('</script')
  })
})
