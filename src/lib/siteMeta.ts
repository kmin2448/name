// 검색 노출에 쓰는 사이트 정보. 순수 로직이라 그대로 테스트할 수 있다.

/** 환경 변수가 없을 때 쓰는 배포 주소 */
export const FALLBACK_SITE_URL = 'https://name-tawny-one.vercel.app'

export const SITE_NAME = '명패 제작기'

export const SITE_TITLE = '명패 제작기 — 엑셀 명단으로 명패 자동 제작·인쇄'

export const SITE_DESCRIPTION =
  '엑셀 명단만 올리면 행사·세미나용 명패를 한 번에 만들어 A4 인쇄용 PDF로 내려받는 무료 웹 도구입니다. ' +
  '접어서 쓰는 양면(상하 반전) 배치를 자동으로 잡아 주고, 명패 규격·글꼴·배경 이미지를 자유롭게 조절할 수 있습니다. ' +
  '설치 없이 브라우저에서 바로 쓸 수 있습니다.'

export const GUIDE_TITLE = '명패 만드는 방법 — 단계별 사용 설명서'

export const GUIDE_DESCRIPTION =
  '엑셀 명단으로 명패를 자동 생성하고 A4에 인쇄하기까지, 명패 규격 선택부터 글꼴·배경 설정, ' +
  '페이지별 편집, PDF 내보내기와 인쇄 설정까지 단계별로 안내합니다.'

/**
 * 검색 키워드.
 * 구글은 keywords 메타를 보지 않지만 네이버 등 일부 검색엔진은 참고한다.
 */
export const SITE_KEYWORDS = [
  '명패',
  '명패 제작',
  '명패 제작기',
  '명패 만들기',
  '명패 매크로',
  '명패 프린트',
  '명패 인쇄',
  '명패 자동화',
  '명패 자동 제작',
  '명패 양식',
  '명패 템플릿',
  '엑셀 명패',
  '명패 PDF',
  '행사 명패',
  '세미나 명패',
  '회의 명패',
  '좌석 명패',
  '탁상 명패',
  '이름표 제작',
  '명패 디자인',
]

/** 배포 주소를 정할 때 참고하는 환경 변수 */
export type SiteUrlEnv = {
  NEXT_PUBLIC_SITE_URL?: string
  VERCEL_PROJECT_PRODUCTION_URL?: string
}

/**
 * 실행 환경에서 주소 관련 값만 추린다.
 * NEXT_PUBLIC_ 값은 이렇게 통째로 적어야 빌드 시점에 치환된다.
 */
function currentEnv(): SiteUrlEnv {
  return {
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    VERCEL_PROJECT_PRODUCTION_URL: process.env.VERCEL_PROJECT_PRODUCTION_URL,
  }
}

/**
 * 배포 주소를 정한다.
 * NEXT_PUBLIC_SITE_URL을 우선 쓰고, 없으면 Vercel이 넣어 주는 값을 쓴다.
 */
export function resolveSiteUrl(env: SiteUrlEnv = currentEnv()): string {
  const raw = env.NEXT_PUBLIC_SITE_URL || env.VERCEL_PROJECT_PRODUCTION_URL || FALLBACK_SITE_URL
  return normalizeSiteUrl(raw)
}

/** 앞의 스킴을 채우고 끝의 슬래시를 떼어 낸다 */
export function normalizeSiteUrl(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return FALLBACK_SITE_URL

  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
  return withScheme.replace(/\/+$/, '')
}

/** 검색엔진에 알려 줄 페이지 목록 */
export const SITEMAP_PATHS = ['/', '/guide'] as const

/**
 * 구조화 데이터 (JSON-LD).
 * 검색 결과에서 어떤 종류의 사이트인지 알아보게 해 준다.
 */
export function buildJsonLd(siteUrl: string): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: SITE_NAME,
    url: siteUrl,
    description: SITE_DESCRIPTION,
    applicationCategory: 'BusinessApplication',
    operatingSystem: '웹 브라우저',
    inLanguage: 'ko',
    isAccessibleForFree: true,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      '엑셀 명단 일괄 업로드',
      '양면(상하 반전) 명패 자동 배치',
      '명패 규격·글꼴·색상 조절',
      '배경·오버레이 이미지 삽입',
      'A4 인쇄용 PDF 내보내기',
    ],
  }
}
