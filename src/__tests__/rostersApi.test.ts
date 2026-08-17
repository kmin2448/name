/**
 * @jest-environment node
 */
import type { NextRequest } from 'next/server'
import { ROSTER_COLUMN } from '@/constants/sheets'
import { MAX_ROSTERS, RosterPayload } from '@/lib/rosters'

jest.mock('@/lib/auth')
jest.mock('@/lib/googleSheets')

import { getSessionEmail, isAuthConfigured } from '@/lib/auth'
import {
  appendRosterRow,
  deleteRosterRow,
  ensureRosterHeader,
  readRosterRows,
  updateRosterRow,
} from '@/lib/googleSheets'
import { GET as listRosters, POST as saveRoster } from '@/app/api/rosters/route'
import { DELETE as deleteRoster, GET as getRoster } from '@/app/api/rosters/[id]/route'

const mockIsAuthConfigured = isAuthConfigured as jest.MockedFunction<typeof isAuthConfigured>
const mockGetSessionEmail = getSessionEmail as jest.MockedFunction<typeof getSessionEmail>
const mockReadRows = readRosterRows as jest.MockedFunction<typeof readRosterRows>
const mockAppend = appendRosterRow as jest.MockedFunction<typeof appendRosterRow>
const mockUpdate = updateRosterRow as jest.MockedFunction<typeof updateRosterRow>
const mockDelete = deleteRosterRow as jest.MockedFunction<typeof deleteRosterRow>

const PAYLOAD: RosterPayload = {
  size: { label: '중 210×70mm', widthMm: 210, heightMm: 70 },
  fields: [
    {
      id: 'f-prog',
      label: '프로그램명',
      fontSize: 14,
      fontWeight: 'normal',
      fontFamily: '맑은 고딕',
      textAlign: 'center',
      positionX: 10,
      positionY: 10,
      widthPct: 80,
      heightPct: 20,
      color: '#000000',
    },
  ],
  layers: ['f-prog'],
  pageFieldOverrides: {},
  excelRows: [{ 프로그램명: '2026 봄 세미나' }, { 프로그램명: '2026 봄 세미나' }],
  showBorder: true,
}

function sheetRow(id: string, email: string, title: string, savedAt: string): string[] {
  const row: string[] = []
  row[ROSTER_COLUMN.id] = id
  row[ROSTER_COLUMN.userEmail] = email
  row[ROSTER_COLUMN.title] = title
  row[ROSTER_COLUMN.programName] = '2026 봄 세미나'
  row[ROSTER_COLUMN.pageCount] = '2'
  row[ROSTER_COLUMN.savedAt] = savedAt
  row[ROSTER_COLUMN.payload] = JSON.stringify(PAYLOAD)
  return row
}

function postRequest(body: unknown): NextRequest {
  return { json: async () => body } as unknown as NextRequest
}

const ME = 'me@example.com'
const OTHER = 'other@example.com'

beforeEach(() => {
  jest.clearAllMocks()
  mockIsAuthConfigured.mockReturnValue(true)
  mockGetSessionEmail.mockResolvedValue(ME)
  mockReadRows.mockResolvedValue([])
  ;(ensureRosterHeader as jest.Mock).mockResolvedValue(undefined)
  mockAppend.mockResolvedValue(undefined)
  mockUpdate.mockResolvedValue(undefined)
  mockDelete.mockResolvedValue(undefined)
})

describe('GET /api/rosters', () => {
  it('서버에 로그인 설정이 없으면 503과 enabled:false', async () => {
    mockIsAuthConfigured.mockReturnValue(false)
    const res = await listRosters()

    expect(res.status).toBe(503)
    expect(await res.json()).toMatchObject({ enabled: false })
  })

  it('로그인하지 않으면 401', async () => {
    mockGetSessionEmail.mockResolvedValue(null)
    expect((await listRosters()).status).toBe(401)
  })

  it('본인 명단만, 최근 저장 순으로 돌려준다', async () => {
    mockReadRows.mockResolvedValue([
      sheetRow('a', ME, '오래된 건', '2026-08-01T00:00:00.000Z'),
      sheetRow('b', OTHER, '남의 건', '2026-08-10T00:00:00.000Z'),
      sheetRow('c', ME, '최근 건', '2026-08-15T00:00:00.000Z'),
    ])
    const body = (await (await listRosters()).json()) as { items: { id: string }[] }

    expect(body.items.map((i) => i.id)).toEqual(['c', 'a'])
  })

  it('대소문자가 다른 이메일도 같은 사용자로 본다', async () => {
    mockReadRows.mockResolvedValue([sheetRow('a', 'Me@Example.com', '내 건', '2026-08-01T00:00:00.000Z')])
    const body = (await (await listRosters()).json()) as { items: unknown[] }

    expect(body.items).toHaveLength(1)
  })
})

describe('POST /api/rosters', () => {
  it('건명을 비우면 프로그램명과 날짜로 자동 생성한다', async () => {
    const res = await saveRoster(postRequest({ payload: PAYLOAD }))
    const body = (await res.json()) as { item: { title: string } }

    expect(res.status).toBe(200)
    expect(body.item.title).toMatch(/^2026 봄 세미나 \(\d{4}-\d{2}-\d{2}\)$/)
    expect(mockAppend).toHaveBeenCalledTimes(1)
  })

  it('입력한 건명을 그대로 저장한다', async () => {
    const res = await saveRoster(postRequest({ title: '8월 정기회의', payload: PAYLOAD }))
    const body = (await res.json()) as { item: { title: string } }

    expect(body.item.title).toBe('8월 정기회의')
    expect(mockAppend.mock.calls[0][0][ROSTER_COLUMN.userEmail]).toBe(ME)
  })

  it('빈 명단은 저장하지 않는다', async () => {
    const res = await saveRoster(postRequest({ payload: { ...PAYLOAD, excelRows: [] } }))

    expect(res.status).toBe(400)
    expect(mockAppend).not.toHaveBeenCalled()
  })

  it(`${MAX_ROSTERS}건이 차면 새 저장을 거부한다`, async () => {
    mockReadRows.mockResolvedValue(
      Array.from({ length: MAX_ROSTERS }, (_, i) => sheetRow(`id-${i}`, ME, `건 ${i}`, '2026-08-01T00:00:00.000Z'))
    )
    const res = await saveRoster(postRequest({ payload: PAYLOAD }))

    expect(res.status).toBe(409)
    expect(mockAppend).not.toHaveBeenCalled()
  })

  it('가득 찬 상태에서도 덮어쓰기는 허용한다', async () => {
    mockReadRows.mockResolvedValue(
      Array.from({ length: MAX_ROSTERS }, (_, i) => sheetRow(`id-${i}`, ME, `건 ${i}`, '2026-08-01T00:00:00.000Z'))
    )
    const res = await saveRoster(postRequest({ id: 'id-3', payload: PAYLOAD }))

    expect(res.status).toBe(200)
    expect(mockUpdate).toHaveBeenCalledTimes(1)
    expect(mockUpdate.mock.calls[0][0]).toBe(3) // 해당 행만 갱신
    expect(mockAppend).not.toHaveBeenCalled()
  })

  it('다른 사용자의 건은 덮어쓸 수 없다', async () => {
    mockReadRows.mockResolvedValue([sheetRow('theirs', OTHER, '남의 건', '2026-08-01T00:00:00.000Z')])
    const res = await saveRoster(postRequest({ id: 'theirs', payload: PAYLOAD }))

    expect(res.status).toBe(404)
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('로그인하지 않으면 401', async () => {
    mockGetSessionEmail.mockResolvedValue(null)
    expect((await saveRoster(postRequest({ payload: PAYLOAD }))).status).toBe(401)
  })
})

describe('GET·DELETE /api/rosters/[id]', () => {
  it('본인 건은 본문까지 돌려준다', async () => {
    mockReadRows.mockResolvedValue([sheetRow('mine', ME, '내 건', '2026-08-01T00:00:00.000Z')])
    const res = await getRoster({} as NextRequest, { params: { id: 'mine' } })
    const body = (await res.json()) as { payload: RosterPayload }

    expect(res.status).toBe(200)
    expect(body.payload.excelRows).toHaveLength(2)
  })

  it('다른 사용자의 건은 조회되지 않는다', async () => {
    mockReadRows.mockResolvedValue([sheetRow('theirs', OTHER, '남의 건', '2026-08-01T00:00:00.000Z')])
    const res = await getRoster({} as NextRequest, { params: { id: 'theirs' } })

    expect(res.status).toBe(404)
  })

  it('다른 사용자의 건은 삭제되지 않는다', async () => {
    mockReadRows.mockResolvedValue([sheetRow('theirs', OTHER, '남의 건', '2026-08-01T00:00:00.000Z')])
    const res = await deleteRoster({} as NextRequest, { params: { id: 'theirs' } })

    expect(res.status).toBe(404)
    expect(mockDelete).not.toHaveBeenCalled()
  })

  it('본인 건은 해당 행만 삭제한다', async () => {
    mockReadRows.mockResolvedValue([
      sheetRow('other-user', OTHER, '남의 건', '2026-08-01T00:00:00.000Z'),
      sheetRow('mine', ME, '내 건', '2026-08-01T00:00:00.000Z'),
    ])
    const res = await deleteRoster({} as NextRequest, { params: { id: 'mine' } })

    expect(res.status).toBe(200)
    expect(mockDelete).toHaveBeenCalledWith(1)
  })
})
