import { NextRequest, NextResponse } from 'next/server'
import { getDriveAccessToken, getSessionEmail } from '@/lib/auth'
import { deleteDesignRow, updateDesignRow } from '@/lib/googleSheets'
import { deleteFile, downloadImageAsDataUrl } from '@/lib/googleDrive'
import {
  DesignImages,
  designFileIds,
  designRowToSummary,
  parseDesignPayload,
} from '@/lib/designs'
import { DESIGN_COLUMN } from '@/constants/sheets'
import { errorResponse, findOwnDesignRow } from '@/lib/designApi'

export const dynamic = 'force-dynamic'

type Context = { params: { id: string } }

/** 디자인 본문과 드라이브에 저장된 이미지를 함께 돌려준다 */
export async function GET(req: NextRequest, { params }: Context) {
  const email = await getSessionEmail()
  if (!email) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

  try {
    const found = await findOwnDesignRow(email, params.id)
    if (!found) return NextResponse.json({ error: '디자인을 찾지 못했습니다.' }, { status: 404 })

    const payload = parseDesignPayload(found.row[DESIGN_COLUMN.payload] ?? '')
    if (!payload) {
      return NextResponse.json({ error: '저장된 디자인이 손상되었습니다.' }, { status: 422 })
    }

    // 캔버스가 data URL을 그대로 쓰므로 서버에서 받아 변환해 내려준다
    const accessToken = await getDriveAccessToken(req)
    const images: DesignImages = { background: null, overlays: {} }

    if (payload.backgroundFileId) {
      images.background = await downloadImageAsDataUrl(accessToken, payload.backgroundFileId)
    }
    for (const overlay of payload.overlays) {
      images.overlays[overlay.id] = await downloadImageAsDataUrl(accessToken, overlay.fileId)
    }

    return NextResponse.json({ item: designRowToSummary(found.row), payload, images })
  } catch (error) {
    return errorResponse(error, '디자인을 불러오지 못했습니다.')
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
    const found = await findOwnDesignRow(email, params.id)
    if (!found) return NextResponse.json({ error: '디자인을 찾지 못했습니다.' }, { status: 404 })

    const row = [...found.row]
    row[DESIGN_COLUMN.title] = title
    await updateDesignRow(found.index, row)

    return NextResponse.json({ item: designRowToSummary(row) })
  } catch (error) {
    return errorResponse(error, '건명을 수정하지 못했습니다.')
  }
}

/** 저장 건과 함께 드라이브에 올린 이미지도 정리한다 */
export async function DELETE(req: NextRequest, { params }: Context) {
  const email = await getSessionEmail()
  if (!email) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

  try {
    const found = await findOwnDesignRow(email, params.id)
    if (!found) return NextResponse.json({ error: '디자인을 찾지 못했습니다.' }, { status: 404 })

    const payload = parseDesignPayload(found.row[DESIGN_COLUMN.payload] ?? '')
    if (payload) {
      // 이미지 정리에 실패해도 저장 건 삭제는 진행한다
      try {
        const accessToken = await getDriveAccessToken(req)
        for (const fileId of designFileIds(payload)) {
          await deleteFile(accessToken, fileId)
        }
      } catch {
        // 드라이브 권한이 만료된 경우 — 시트 행만 지운다
      }
    }

    await deleteDesignRow(found.index)
    return NextResponse.json({ ok: true })
  } catch (error) {
    return errorResponse(error, '디자인을 삭제하지 못했습니다.')
  }
}
