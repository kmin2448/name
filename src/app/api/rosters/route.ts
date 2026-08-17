import { NextRequest, NextResponse } from 'next/server'
import { getSessionEmail, isAuthConfigured } from '@/lib/auth'
import {
  appendRosterRow,
  ensureRosterHeader,
  readRosterRows,
  SheetsConfigError,
  updateRosterRow,
} from '@/lib/googleSheets'
import {
  MAX_ROSTERS,
  RosterPayload,
  buildRosterTitle,
  canSaveRoster,
  exceedsCellLimit,
  findProgramName,
  parseRosterPayload,
  rowToSummary,
  toSheetRow,
} from '@/lib/rosters'
import { ROSTER_COLUMN } from '@/constants/sheets'

export const dynamic = 'force-dynamic'

function configErrorResponse(error: unknown): NextResponse | null {
  if (error instanceof SheetsConfigError) {
    return NextResponse.json({ error: error.message }, { status: 503 })
  }
  return null
}

/** 로그인한 사용자의 행만 골라낸다 — 다른 사용자의 명단은 서버 밖으로 나가지 않는다 */
async function readOwnRows(email: string) {
  const rows = await readRosterRows()
  return rows
    .map((row, index) => ({ row, index }))
    .filter((entry) => (entry.row[ROSTER_COLUMN.userEmail] ?? '').toLowerCase() === email)
}

/**
 * 저장된 명단 목록 (본문 제외).
 * 서버에 구글 로그인·시트 설정이 없으면 401보다 먼저 503을 돌려준다 —
 * 클라이언트는 이 응답을 보고 명단 기능 자체를 숨긴다.
 */
export async function GET() {
  if (!isAuthConfigured()) {
    return NextResponse.json(
      { error: '서버에 구글 로그인이 설정되지 않았습니다.', enabled: false },
      { status: 503 }
    )
  }

  const email = await getSessionEmail()
  if (!email) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

  try {
    const own = await readOwnRows(email)
    const items = own
      .map((entry) => rowToSummary(entry.row))
      .filter((summary): summary is NonNullable<typeof summary> => summary !== null)
      // 최근 저장한 것이 위로 오도록
      .sort((a, b) => b.savedAt.localeCompare(a.savedAt))

    return NextResponse.json({ items, max: MAX_ROSTERS })
  } catch (error) {
    return configErrorResponse(error) ?? NextResponse.json(
      { error: '저장된 명단을 불러오지 못했습니다.' },
      { status: 502 }
    )
  }
}

type SaveBody = {
  id?: string
  title?: string
  payload?: unknown
}

/** 새로 저장하거나(id 없음) 기존 건을 덮어쓴다(id 있음) */
export async function POST(req: NextRequest) {
  const email = await getSessionEmail()
  if (!email) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

  let body: SaveBody
  try {
    body = (await req.json()) as SaveBody
  } catch {
    return NextResponse.json({ error: '요청 형식이 올바르지 않습니다.' }, { status: 400 })
  }

  const payload: RosterPayload | null =
    typeof body.payload === 'string'
      ? parseRosterPayload(body.payload)
      : parseRosterPayload(JSON.stringify(body.payload ?? null))

  if (!payload) {
    return NextResponse.json({ error: '저장할 명단 형식이 올바르지 않습니다.' }, { status: 400 })
  }
  if (payload.excelRows.length === 0) {
    return NextResponse.json({ error: '저장할 명단이 비어 있습니다.' }, { status: 400 })
  }
  if (exceedsCellLimit(payload)) {
    return NextResponse.json(
      { error: '명단이 너무 커서 저장할 수 없습니다. 페이지 수를 줄여 주세요.' },
      { status: 413 }
    )
  }

  try {
    const own = await readOwnRows(email)
    const existing = body.id ? own.find((entry) => entry.row[ROSTER_COLUMN.id] === body.id) : undefined

    if (body.id && !existing) {
      return NextResponse.json({ error: '덮어쓸 명단을 찾지 못했습니다.' }, { status: 404 })
    }
    if (!canSaveRoster(own.length, !!existing)) {
      return NextResponse.json(
        {
          error: `저장은 최대 ${MAX_ROSTERS}건까지 가능합니다. 목록에서 기존 건을 삭제한 뒤 저장해 주세요.`,
        },
        { status: 409 }
      )
    }

    const savedAt = new Date()
    const programName = findProgramName(payload.excelRows, payload.fields)
    const summary = {
      title: buildRosterTitle(body.title ?? '', programName, savedAt),
      programName,
      pageCount: payload.excelRows.length,
      savedAt: savedAt.toISOString(),
    }
    const id = existing?.row[ROSTER_COLUMN.id] ?? `${savedAt.getTime()}-${Math.random().toString(36).slice(2, 8)}`
    const row = toSheetRow(id, email, summary, payload)

    if (existing) {
      await updateRosterRow(existing.index, row)
    } else {
      await ensureRosterHeader()
      await appendRosterRow(row)
    }

    return NextResponse.json({ item: { id, ...summary } })
  } catch (error) {
    return configErrorResponse(error) ?? NextResponse.json(
      { error: '명단을 저장하지 못했습니다.' },
      { status: 502 }
    )
  }
}
