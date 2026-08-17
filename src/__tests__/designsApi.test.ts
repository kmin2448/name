/**
 * @jest-environment node
 */
import type { NextRequest } from 'next/server'
import { DESIGN_COLUMN } from '@/constants/sheets'
import { MAX_DESIGNS, buildDesignPayload } from '@/lib/designs'
import { initialState } from '@/hooks/useNameplateState'
import { NameplateState } from '@/types/nameplate'

jest.mock('@/lib/auth')
jest.mock('@/lib/googleSheets')
jest.mock('@/lib/googleDrive')

import { getDriveAccessToken, getSessionEmail, isAuthConfigured } from '@/lib/auth'
import {
  appendDesignRow,
  deleteDesignRow,
  ensureDesignHeader,
  readDesignRows,
  updateDesignRow,
} from '@/lib/googleSheets'
import {
  deleteFile,
  downloadImageAsDataUrl,
  ensureAppFolder,
  uploadImage,
} from '@/lib/googleDrive'
import { GET as listDesigns, POST as saveDesign } from '@/app/api/designs/route'
import { DELETE as deleteDesign, GET as getDesign } from '@/app/api/designs/[id]/route'

const mockIsAuthConfigured = isAuthConfigured as jest.MockedFunction<typeof isAuthConfigured>
const mockGetSessionEmail = getSessionEmail as jest.MockedFunction<typeof getSessionEmail>
const mockGetToken = getDriveAccessToken as jest.MockedFunction<typeof getDriveAccessToken>
const mockReadRows = readDesignRows as jest.MockedFunction<typeof readDesignRows>
const mockAppend = appendDesignRow as jest.MockedFunction<typeof appendDesignRow>
const mockUpdate = updateDesignRow as jest.MockedFunction<typeof updateDesignRow>
const mockDeleteRow = deleteDesignRow as jest.MockedFunction<typeof deleteDesignRow>
const mockUpload = uploadImage as jest.MockedFunction<typeof uploadImage>
const mockDownload = downloadImageAsDataUrl as jest.MockedFunction<typeof downloadImageAsDataUrl>
const mockDeleteFile = deleteFile as jest.MockedFunction<typeof deleteFile>

const PHOTO = 'data:image/png;base64,iVBORw0KGgo='
const ME = 'me@example.com'
const OTHER = 'other@example.com'

const STATE: NameplateState = {
  ...initialState,
  backgroundImage: PHOTO,
  overlayImages: [
    {
      id: 'img-1',
      src: PHOTO,
      name: '로고',
      positionX: 5,
      positionY: 6,
      widthPct: 20,
      heightPct: 15,
      condition: { type: 'all' },
      cropX: 0,
      cropY: 0,
      cropW: 100,
      cropH: 100,
    },
  ],
}

function designRow(id: string, email: string, savedAt: string): string[] {
  const payload = buildDesignPayload(STATE, 'bg-file', { 'img-1': 'ov-file' })
  const row: string[] = []
  row[DESIGN_COLUMN.id] = id
  row[DESIGN_COLUMN.userEmail] = email
  row[DESIGN_COLUMN.title] = `디자인 ${id}`
  row[DESIGN_COLUMN.savedAt] = savedAt
  row[DESIGN_COLUMN.payload] = JSON.stringify(payload)
  return row
}

function request(body?: unknown): NextRequest {
  return { json: async () => body } as unknown as NextRequest
}

beforeEach(() => {
  jest.clearAllMocks()
  mockIsAuthConfigured.mockReturnValue(true)
  mockGetSessionEmail.mockResolvedValue(ME)
  mockGetToken.mockResolvedValue('drive-token')
  mockReadRows.mockResolvedValue([])
  ;(ensureDesignHeader as jest.Mock).mockResolvedValue(undefined)
  mockAppend.mockResolvedValue(undefined)
  mockUpdate.mockResolvedValue(undefined)
  mockDeleteRow.mockResolvedValue(undefined)
  ;(ensureAppFolder as jest.Mock).mockResolvedValue('folder-1')
  mockUpload.mockImplementation(async (_token, _folder, name) => `file-${name}`)
  mockDownload.mockResolvedValue(PHOTO)
  mockDeleteFile.mockResolvedValue(undefined)
})

describe('GET /api/designs', () => {
  it('서버 미설정이면 503', async () => {
    mockIsAuthConfigured.mockReturnValue(false)
    expect((await listDesigns()).status).toBe(503)
  })

  it('로그인하지 않으면 401', async () => {
    mockGetSessionEmail.mockResolvedValue(null)
    expect((await listDesigns()).status).toBe(401)
  })

  it('본인 디자인만 최근 순으로 돌려준다', async () => {
    mockReadRows.mockResolvedValue([
      designRow('a', ME, '2026-08-01T00:00:00.000Z'),
      designRow('b', OTHER, '2026-08-10T00:00:00.000Z'),
      designRow('c', ME, '2026-08-15T00:00:00.000Z'),
    ])
    const body = (await (await listDesigns()).json()) as { items: { id: string }[] }

    expect(body.items.map((i) => i.id)).toEqual(['c', 'a'])
  })
})

describe('POST /api/designs', () => {
  it('배경과 오버레이를 드라이브에 올리고 파일 id를 시트에 저장한다', async () => {
    const res = await saveDesign(request({ state: STATE }))

    expect(res.status).toBe(200)
    expect(mockUpload).toHaveBeenCalledTimes(2) // 배경 1 + 오버레이 1
    expect(mockAppend).toHaveBeenCalledTimes(1)

    const saved = JSON.parse(mockAppend.mock.calls[0][0][DESIGN_COLUMN.payload]) as {
      backgroundFileId: string
    }
    expect(saved.backgroundFileId).toMatch(/^file-배경-/)
    // 이미지 본문은 시트에 들어가지 않는다
    expect(mockAppend.mock.calls[0][0][DESIGN_COLUMN.payload]).not.toContain('iVBORw0KGgo')
  })

  it('이미지가 하나도 없으면 저장하지 않는다', async () => {
    const res = await saveDesign(
      request({ state: { ...STATE, backgroundImage: null, overlayImages: [] } })
    )

    expect(res.status).toBe(400)
    expect(mockUpload).not.toHaveBeenCalled()
  })

  it(`${MAX_DESIGNS}건이 차면 새 저장을 거부한다`, async () => {
    mockReadRows.mockResolvedValue(
      Array.from({ length: MAX_DESIGNS }, (_, i) => designRow(`d-${i}`, ME, '2026-08-01T00:00:00.000Z'))
    )
    const res = await saveDesign(request({ state: STATE }))

    expect(res.status).toBe(409)
    expect(mockUpload).not.toHaveBeenCalled()
  })

  it('가득 찬 상태에서도 덮어쓰기는 허용한다', async () => {
    mockReadRows.mockResolvedValue(
      Array.from({ length: MAX_DESIGNS }, (_, i) => designRow(`d-${i}`, ME, '2026-08-01T00:00:00.000Z'))
    )
    const res = await saveDesign(request({ id: 'd-1', state: STATE }))

    expect(res.status).toBe(200)
    expect(mockUpdate.mock.calls[0][0]).toBe(1)
    expect(mockAppend).not.toHaveBeenCalled()
  })

  it('다른 사용자의 디자인은 덮어쓸 수 없다', async () => {
    mockReadRows.mockResolvedValue([designRow('theirs', OTHER, '2026-08-01T00:00:00.000Z')])
    const res = await saveDesign(request({ id: 'theirs', state: STATE }))

    expect(res.status).toBe(404)
    expect(mockUpdate).not.toHaveBeenCalled()
  })
})

describe('GET /api/designs/[id]', () => {
  it('본인 디자인은 배치값과 드라이브 이미지를 함께 돌려준다', async () => {
    mockReadRows.mockResolvedValue([designRow('mine', ME, '2026-08-01T00:00:00.000Z')])
    const res = await getDesign(request(), { params: { id: 'mine' } })
    const body = (await res.json()) as {
      images: { background: string; overlays: Record<string, string> }
    }

    expect(res.status).toBe(200)
    expect(body.images.background).toBe(PHOTO)
    expect(body.images.overlays['img-1']).toBe(PHOTO)
    expect(mockDownload).toHaveBeenCalledTimes(2)
  })

  it('다른 사용자의 디자인은 조회되지 않는다', async () => {
    mockReadRows.mockResolvedValue([designRow('theirs', OTHER, '2026-08-01T00:00:00.000Z')])
    const res = await getDesign(request(), { params: { id: 'theirs' } })

    expect(res.status).toBe(404)
    expect(mockDownload).not.toHaveBeenCalled()
  })
})

describe('DELETE /api/designs/[id]', () => {
  it('시트 행과 드라이브 이미지를 함께 정리한다', async () => {
    mockReadRows.mockResolvedValue([designRow('mine', ME, '2026-08-01T00:00:00.000Z')])
    const res = await deleteDesign(request(), { params: { id: 'mine' } })

    expect(res.status).toBe(200)
    expect(mockDeleteFile).toHaveBeenCalledTimes(2) // 배경 + 오버레이
    expect(mockDeleteRow).toHaveBeenCalledWith(0)
  })

  it('다른 사용자의 디자인은 삭제되지 않는다', async () => {
    mockReadRows.mockResolvedValue([designRow('theirs', OTHER, '2026-08-01T00:00:00.000Z')])
    const res = await deleteDesign(request(), { params: { id: 'theirs' } })

    expect(res.status).toBe(404)
    expect(mockDeleteRow).not.toHaveBeenCalled()
    expect(mockDeleteFile).not.toHaveBeenCalled()
  })
})
