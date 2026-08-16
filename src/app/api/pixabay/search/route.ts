import { NextRequest, NextResponse } from 'next/server'
import { PixabaySearchResponse } from '@/lib/pixabay'

// 픽사베이 API 원본 응답 중 사용하는 필드만 정의
type PixabayApiHit = {
  id: number
  previewURL: string
  webformatURL: string
  tags: string
  user: string
}

type PixabayApiResponse = {
  totalHits: number
  hits: PixabayApiHit[]
}

export async function GET(req: NextRequest) {
  const key = process.env.PIXABAY_API_KEY
  if (!key) {
    return NextResponse.json(
      { error: '서버에 PIXABAY_API_KEY가 설정되지 않았습니다. Vercel 환경 변수에 키를 추가해 주세요.' },
      { status: 503 }
    )
  }

  const q = req.nextUrl.searchParams.get('q')?.trim() ?? ''
  if (!q) {
    return NextResponse.json({ error: '검색어를 입력해 주세요.' }, { status: 400 })
  }

  const page = Math.max(1, parseInt(req.nextUrl.searchParams.get('page') ?? '1', 10) || 1)
  const params = new URLSearchParams({
    key,
    q,
    image_type: 'photo',
    orientation: 'horizontal', // 명패는 가로형이므로 가로 사진만
    safesearch: 'true',
    per_page: '12',
    page: String(page),
    lang: 'ko',
  })

  const res = await fetch(`https://pixabay.com/api/?${params.toString()}`, { cache: 'no-store' })
  if (!res.ok) {
    return NextResponse.json({ error: '픽사베이 검색 요청이 실패했습니다.' }, { status: 502 })
  }

  const data = (await res.json()) as PixabayApiResponse
  const body: PixabaySearchResponse = {
    total: data.totalHits,
    hits: data.hits.map((hit) => ({
      id: hit.id,
      previewURL: hit.previewURL,
      webformatURL: hit.webformatURL,
      tags: hit.tags,
      user: hit.user,
    })),
  }
  return NextResponse.json(body)
}
