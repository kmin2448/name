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
