import { NextRequest, NextResponse } from 'next/server'
import { getSessionEmail } from '@/lib/auth'
import {
  deleteRosterRow,
  readRosterRows,
  SheetsConfigError,
  updateRosterRow,
} from '@/lib/googleSheets'
import { parseRosterPayload, rowToSummary } from '@/lib/rosters'
import { ROSTER_COLUMN } from '@/constants/sheets'

export const dynamic = 'force-dynamic'

type Context = { params: { id: string } }

/**
 * 요청한 사용자의 행만 찾는다.
 * 다른 사용자의 id를 넣어도 찾지 못하므로 남의 명단에는 접근할 수 없다.
 */
async function findOwnRow(email: string, id: string) {
  const rows = await readRosterRows()
  const index = rows.findIndex(
    (row) =>
      row[ROSTER_COLUMN.id] === id &&
      (row[ROSTER_COLUMN.userEmail] ?? '').toLowerCase() === email
  )
  return index === -1 ? null : { row: rows[index], index }
}

function handleError(error: unknown, message: string): NextResponse {
  if (error instanceof SheetsConfigError) {
    return NextResponse.json({ error: error.message }, { status: 503 })
  }
  return NextResponse.json({ error: message }, { status: 502 })
}

/** 저장된 명단 본문을 불러온다 */
export async function GET(_req: NextRequest, { params }: Context) {
  const email = await getSessionEmail()
  if (!email) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

  try {
    const found = await findOwnRow(email, params.id)
    if (!found) return NextResponse.json({ error: '명단을 찾지 못했습니다.' }, { status: 404 })

    const payload = parseRosterPayload(found.row[ROSTER_COLUMN.payload] ?? '')
    if (!payload) {
      return NextResponse.json({ error: '저장된 명단이 손상되었습니다.' }, { status: 422 })
    }

    return NextResponse.json({ item: rowToSummary(found.row), payload })
  } catch (error) {
    return handleError(error, '명단을 불러오지 못했습니다.')
  }
}

/** 건명 수정 */
export async function PATCH(req: NextRequest, { params }: Context) {
  const email = await getSessionEmail()
  if (!email) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

  let title: string
  try {
    const body = (await req.json()) as { title?: unknown }
    title = typeof body.title === 'string' ? body.title.trim() : ''
  } catch {
    return NextResponse.json({ error: '요청 형식이 올바르지 않습니다.' }, { status: 400 })
  }
  if (!title) return NextResponse.json({ error: '건명을 입력해 주세요.' }, { status: 400 })

  try {
    const found = await findOwnRow(email, params.id)
    if (!found) return NextResponse.json({ error: '명단을 찾지 못했습니다.' }, { status: 404 })

    const row = [...found.row]
    row[ROSTER_COLUMN.title] = title
    await updateRosterRow(found.index, row)

    return NextResponse.json({ item: rowToSummary(row) })
  } catch (error) {
    return handleError(error, '건명을 수정하지 못했습니다.')
  }
}

export async function DELETE(_req: NextRequest, { params }: Context) {
  const email = await getSessionEmail()
  if (!email) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

  try {
    const found = await findOwnRow(email, params.id)
    if (!found) return NextResponse.json({ error: '명단을 찾지 못했습니다.' }, { status: 404 })

    await deleteRosterRow(found.index)
    return NextResponse.json({ ok: true })
  } catch (error) {
    return handleError(error, '명단을 삭제하지 못했습니다.')
  }
}
