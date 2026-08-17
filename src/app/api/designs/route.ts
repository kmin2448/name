import { NextRequest, NextResponse } from 'next/server'
import { getDriveAccessToken, getSessionEmail, isAuthConfigured } from '@/lib/auth'
import { errorResponse, readOwnDesignRows } from '@/lib/designApi'
import { appendDesignRow, ensureDesignHeader, updateDesignRow } from '@/lib/googleSheets'
import { ensureAppFolder, uploadImage } from '@/lib/googleDrive'
import {
  MAX_DESIGNS,
  buildDesignPayload,
  buildDesignTitle,
  canSaveDesign,
  designRowToSummary,
  isInlineBackground,
  toDesignRow,
} from '@/lib/designs'
import { DESIGN_COLUMN } from '@/constants/sheets'
import { NameplateState } from '@/types/nameplate'

export const dynamic = 'force-dynamic'

/** 저장된 디자인 목록 */
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
    const own = await readOwnDesignRows(email)
    const items = own
      .map((entry) => designRowToSummary(entry.row))
      .filter((summary): summary is NonNullable<typeof summary> => summary !== null)
      .sort((a, b) => b.savedAt.localeCompare(a.savedAt))

    return NextResponse.json({ items, max: MAX_DESIGNS })
  } catch (error) {
    return errorResponse(error, '저장된 디자인을 불러오지 못했습니다.')
  }
}

type SaveBody = {
  id?: string
  title?: string
  state?: NameplateState
}

/** 현재 디자인을 저장한다 (id가 있으면 덮어쓰기) */
export async function POST(req: NextRequest) {
  if (!isAuthConfigured()) {
    return NextResponse.json({ error: '서버에 구글 로그인이 설정되지 않았습니다.' }, { status: 503 })
  }

  const email = await getSessionEmail()
  if (!email) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

  let body: SaveBody
  try {
    body = (await req.json()) as SaveBody
  } catch {
    return NextResponse.json({ error: '요청 형식이 올바르지 않습니다.' }, { status: 400 })
  }

  const state = body.state
  if (!state || !state.size || !Array.isArray(state.fields)) {
    return NextResponse.json({ error: '저장할 디자인 형식이 올바르지 않습니다.' }, { status: 400 })
  }
  if (!state.backgroundImage && state.overlayImages.length === 0) {
    return NextResponse.json(
      { error: '저장할 이미지가 없습니다. 배경이나 오버레이 이미지를 먼저 설정해 주세요.' },
      { status: 400 }
    )
  }

  try {
    const own = await readOwnDesignRows(email)
    const existing = body.id ? own.find((entry) => entry.row[DESIGN_COLUMN.id] === body.id) : undefined

    if (body.id && !existing) {
      return NextResponse.json({ error: '덮어쓸 디자인을 찾지 못했습니다.' }, { status: 404 })
    }
    if (!canSaveDesign(own.length, !!existing)) {
      return NextResponse.json(
        {
          error: `디자인은 최대 ${MAX_DESIGNS}건까지 저장할 수 있습니다. 기존 디자인을 삭제한 뒤 저장해 주세요.`,
        },
        { status: 409 }
      )
    }

    // 사용자 본인 드라이브의 앱 폴더에 이미지를 올린다
    const accessToken = await getDriveAccessToken(req)
    const folderId = await ensureAppFolder(accessToken)
    const savedAt = new Date()
    const stamp = savedAt.toISOString().replace(/[:.]/g, '-')

    let backgroundFileId: string | null = null
    if (state.backgroundImage && !isInlineBackground(state.backgroundImage)) {
      backgroundFileId = await uploadImage(
        accessToken,
        folderId,
        `배경-${stamp}`,
        state.backgroundImage
      )
    }

    const overlayFileIds: Record<string, string> = {}
    for (const overlay of state.overlayImages) {
      overlayFileIds[overlay.id] = await uploadImage(
        accessToken,
        folderId,
        `오버레이-${overlay.name}-${stamp}`,
        overlay.src
      )
    }

    const payload = buildDesignPayload(state, backgroundFileId, overlayFileIds)
    const summary = {
      title: buildDesignTitle(body.title ?? '', savedAt),
      savedAt: savedAt.toISOString(),
    }
    const id =
      existing?.row[DESIGN_COLUMN.id] ?? `${savedAt.getTime()}-${Math.random().toString(36).slice(2, 8)}`
    const row = toDesignRow(id, email, summary, payload)

    if (existing) {
      await updateDesignRow(existing.index, row)
    } else {
      await ensureDesignHeader()
      await appendDesignRow(row)
    }

    return NextResponse.json({ item: { id, ...summary } })
  } catch (error) {
    return errorResponse(error, '디자인을 저장하지 못했습니다.')
  }
}
