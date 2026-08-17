// 디자인 Route Handler들이 공유하는 서버 측 헬퍼.
// Route 파일에는 HTTP 메서드만 export할 수 있어 별도 모듈로 둔다.
import { NextResponse } from 'next/server'
import { DriveAuthError } from '@/lib/auth'
import { readDesignRows, SheetsConfigError } from '@/lib/googleSheets'
import { DESIGN_COLUMN } from '@/constants/sheets'

export function errorResponse(error: unknown, fallback: string): NextResponse {
  if (error instanceof SheetsConfigError) {
    return NextResponse.json({ error: error.message, enabled: false }, { status: 503 })
  }
  if (error instanceof DriveAuthError) {
    // 클라이언트가 다시 로그인하도록 알린다
    return NextResponse.json({ error: error.message, reauth: true }, { status: 401 })
  }
  const detail = error instanceof Error ? error.message : ''
  return NextResponse.json({ error: detail || fallback }, { status: 502 })
}

/** 로그인한 사용자의 행만 골라낸다 — 남의 디자인은 서버 밖으로 나가지 않는다 */
export async function readOwnDesignRows(email: string) {
  const rows = await readDesignRows()
  return rows
    .map((row, index) => ({ row, index }))
    .filter((entry) => (entry.row[DESIGN_COLUMN.userEmail] ?? '').toLowerCase() === email)
}

/** 사용자의 디자인 행 하나를 찾는다 */
export async function findOwnDesignRow(email: string, id: string) {
  const rows = await readDesignRows()
  const index = rows.findIndex(
    (row) =>
      row[DESIGN_COLUMN.id] === id &&
      (row[DESIGN_COLUMN.userEmail] ?? '').toLowerCase() === email
  )
  return index === -1 ? null : { row: rows[index], index }
}
