import { NextResponse } from 'next/server'
import { VISIT_APP_KEY, parseVisitCounts } from '@/lib/visitCounter'

// 접속할 때마다 값이 달라지므로 캐시하지 않는다.
export const dynamic = 'force-dynamic'

const RPC_PATH = '/rest/v1/rpc/record_page_visit'

/**
 * Supabase의 record_page_visit 함수를 호출한다.
 * increment=true 면 접속 1회를 기록하고, false 면 현재 값만 조회한다.
 */
async function recordVisit(increment: boolean) {
  const baseUrl = process.env.SUPABASE_URL
  const apiKey = process.env.SUPABASE_PUBLISHABLE_KEY
  if (!baseUrl || !apiKey) {
    return NextResponse.json(
      {
        error:
          '서버에 SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY가 설정되지 않았습니다. Vercel 환경 변수에 추가해 주세요.',
      },
      { status: 503 }
    )
  }

  const res = await fetch(`${baseUrl.replace(/\/$/, '')}${RPC_PATH}`, {
    method: 'POST',
    headers: {
      apikey: apiKey,
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ p_app_key: VISIT_APP_KEY, p_increment: increment }),
    cache: 'no-store',
  })

  if (!res.ok) {
    return NextResponse.json({ error: '방문 수 집계 요청이 실패했습니다.' }, { status: 502 })
  }

  const counts = parseVisitCounts(await res.json())
  if (!counts) {
    return NextResponse.json({ error: '방문 수 응답 형식이 올바르지 않습니다.' }, { status: 502 })
  }

  return NextResponse.json(counts)
}

/** 현재 접속 수 조회 (집계하지 않음) */
export async function GET() {
  return recordVisit(false)
}

/** 접속 1회 집계 후 최신 값 반환 */
export async function POST() {
  return recordVisit(true)
}
