// 픽사베이 검색 API의 응답/요청 타입과 URL 검증.
// API 호출은 반드시 /api/pixabay/* Route Handler를 경유한다 (클라이언트 직접 호출 금지).

export type PixabayImage = {
  id: number
  previewURL: string    // 150px 썸네일 (검색 결과 표시용)
  webformatURL: string  // 640px (배경 적용용)
  tags: string
  user: string          // 사진작가 이름
}

export type PixabaySearchResponse = {
  total: number
  hits: PixabayImage[]
}

// 픽사베이 API가 실제로 접근을 허용하는 결과 수 상한 (API 명세)
export const PIXABAY_MAX_RESULTS = 500

/**
 * 페이지 결과를 기존 목록에 합친다.
 * 픽사베이는 페이지 간 중복 이미지를 반환할 수 있으므로 id 기준으로 중복을 제거한다.
 * 1페이지는 새 검색이므로 목록을 교체한다.
 */
export function mergeSearchResults(
  prev: PixabayImage[],
  hits: PixabayImage[],
  page: number
): PixabayImage[] {
  if (page === 1) return hits
  const seen = new Set(prev.map((p) => p.id))
  return [...prev, ...hits.filter((h) => !seen.has(h.id))]
}

/**
 * '결과 더 보기'를 표시할지 여부.
 * 마지막 페이지가 비어 있거나 API 접근 한도(500개)에 도달하면 종료.
 */
export function hasMoreResults(loaded: number, total: number, lastBatchSize: number): boolean {
  return lastBatchSize > 0 && loaded < Math.min(total, PIXABAY_MAX_RESULTS)
}

/** 이미지 프록시가 픽사베이 CDN 주소만 중계하도록 검증한다 (SSRF 방지) */
export function isAllowedPixabayImageUrl(raw: string): boolean {
  try {
    const url = new URL(raw)
    return (
      url.protocol === 'https:' &&
      (url.hostname === 'pixabay.com' || url.hostname.endsWith('.pixabay.com'))
    )
  } catch {
    return false
  }
}
