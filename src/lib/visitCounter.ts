// 페이지 접속 수(오늘/누적) 집계용 타입과 응답 파싱.
// Supabase 호출은 반드시 /api/visits Route Handler를 경유한다 (클라이언트 직접 호출 금지).

export type VisitCounts = {
  today: number
  total: number
}

/** page_visits 테이블에서 이 앱을 구분하는 키 (DB 함수의 app_key 규칙: 소문자/숫자/-/_) */
export const VISIT_APP_KEY = 'nameplate'

/** 같은 탭에서 새로고침해도 중복 집계되지 않도록 남기는 세션 표식 */
export const VISIT_SESSION_KEY = 'nameplate:visit-counted'

function toCount(value: unknown): number | null {
  // bigint는 드라이버/직렬화 방식에 따라 문자열로 올 수 있으므로 둘 다 허용한다.
  const num = typeof value === 'string' ? Number(value) : value
  if (typeof num !== 'number' || !Number.isFinite(num) || num < 0) return null
  return Math.floor(num)
}

/**
 * record_page_visit RPC 응답에서 오늘/누적 값을 뽑는다.
 * PostgREST는 테이블 반환 함수를 행 배열로 돌려주므로 첫 행을 사용한다.
 */
export function parseVisitCounts(raw: unknown): VisitCounts | null {
  const row = Array.isArray(raw) ? raw[0] : raw
  if (!row || typeof row !== 'object') return null
  const record = row as Record<string, unknown>
  const today = toCount(record.today_count)
  const total = toCount(record.total_count)
  if (today === null || total === null) return null
  return { today, total }
}

/** /api/visits 응답이 기대한 형태인지 검사한다 */
export function isVisitCounts(raw: unknown): raw is VisitCounts {
  if (!raw || typeof raw !== 'object') return false
  const record = raw as Record<string, unknown>
  return toCount(record.today) !== null && toCount(record.total) !== null
}

/** 1234 → '1,234' */
export function formatVisitCount(value: number): string {
  return value.toLocaleString('ko-KR')
}
