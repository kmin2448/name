import { NextRequest, NextResponse } from 'next/server'
import { isAllowedPixabayImageUrl } from '@/lib/pixabay'

// 픽사베이 이미지를 서버 경유로 내려준다.
// 클라이언트는 이 응답을 data URL로 변환해 배경에 적용하므로
// CORS/캔버스 오염 없이 PDF 출력까지 동일하게 동작한다.
export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url') ?? ''
  if (!isAllowedPixabayImageUrl(url)) {
    return NextResponse.json({ error: '허용되지 않은 이미지 주소입니다.' }, { status: 400 })
  }

  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) {
    return NextResponse.json({ error: '이미지를 가져오지 못했습니다.' }, { status: 502 })
  }

  const contentType = res.headers.get('content-type') ?? 'image/jpeg'
  const buf = await res.arrayBuffer()
  return new NextResponse(buf, {
    headers: {
      'content-type': contentType,
      'cache-control': 'public, max-age=86400',
    },
  })
}
