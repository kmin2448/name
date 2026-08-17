// 구글 시트 관련 문자열은 이 파일에서만 정의한다 (Route Handler에서 하드코딩 금지).

/** 저장 시트의 헤더 — 열 순서가 곧 아래 인덱스 정의와 같아야 한다 */
export const ROSTER_HEADER = [
  'id',
  'user_email',
  'title',
  'program_name',
  'page_count',
  'saved_at',
  'payload',
] as const

/** 행 배열에서 각 값이 있는 위치 */
export const ROSTER_COLUMN = {
  id: 0,
  userEmail: 1,
  title: 2,
  programName: 3,
  pageCount: 4,
  savedAt: 5,
  payload: 6,
} as const

/** 데이터가 들어가는 열 범위 (A~G) */
export const ROSTER_COLUMN_RANGE = 'A:G'

/** 헤더가 있는 첫 행 */
export const ROSTER_HEADER_ROW = 1

/**
 * 시트 탭 이름. 지정하지 않으면 스프레드시트의 첫 번째 탭을 자동으로 사용한다.
 * (탭 이름을 바꿨을 때만 환경 변수로 지정하면 된다)
 */
export const ROSTER_TAB_NAME_ENV = 'GOOGLE_SHEETS_TAB_NAME'

/** 시트 탭 이름을 포함한 A1 표기 범위를 만든다 */
function sheetRange(tabName: string, columnRange: string): string {
  // 공백·한글이 들어간 탭 이름은 작은따옴표로 감싸야 하며, 이름 안의 '는 두 번 써서 이스케이프한다
  return `'${tabName.replace(/'/g, "''")}'!${columnRange}`
}

export function rosterRange(tabName: string, columnRange: string = ROSTER_COLUMN_RANGE): string {
  return sheetRange(tabName, columnRange)
}

// ── 명패 디자인 시트 ───────────────────────────────────────────────────

/** 디자인 저장 시트의 헤더 */
export const DESIGN_HEADER = [
  'id',
  'user_email',
  'title',
  'saved_at',
  'payload',
] as const

export const DESIGN_COLUMN = {
  id: 0,
  userEmail: 1,
  title: 2,
  savedAt: 3,
  payload: 4,
} as const

export const DESIGN_COLUMN_RANGE = 'A:E'
export const DESIGN_HEADER_ROW = 1
export const DESIGN_TAB_NAME_ENV = 'GOOGLE_DESIGN_SHEETS_TAB_NAME'

export function designRange(tabName: string, columnRange: string = DESIGN_COLUMN_RANGE): string {
  return sheetRange(tabName, columnRange)
}
