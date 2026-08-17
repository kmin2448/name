// 구글 시트 접근 계층 — 반드시 서버(Route Handler)에서만 사용한다.
// 서비스 계정 자격 증명은 클라이언트로 절대 내려가지 않는다.
import { JWT } from 'google-auth-library'
import {
  ROSTER_COLUMN_RANGE,
  ROSTER_HEADER,
  ROSTER_HEADER_ROW,
  ROSTER_TAB_NAME_ENV,
  rosterRange,
} from '@/constants/sheets'

const SHEETS_API = 'https://sheets.googleapis.com/v4/spreadsheets'
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets']

/** 서버에 시트 설정이 없을 때 — 호출 측에서 503으로 안내한다 */
export class SheetsConfigError extends Error {}

type SheetsConfig = {
  spreadsheetId: string
  clientEmail: string
  privateKey: string
}

function getConfig(): SheetsConfig {
  const spreadsheetId = process.env.GOOGLE_SHEETS_ID
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
  // Vercel 환경 변수에는 줄바꿈이 \n 문자열로 들어가므로 실제 줄바꿈으로 되돌린다
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n')

  if (!spreadsheetId || !clientEmail || !privateKey) {
    throw new SheetsConfigError(
      '서버에 GOOGLE_SHEETS_ID / GOOGLE_SERVICE_ACCOUNT_EMAIL / GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY가 설정되지 않았습니다.'
    )
  }
  return { spreadsheetId, clientEmail, privateKey }
}

let cachedClient: { email: string; jwt: JWT } | null = null

function getJwtClient(config: SheetsConfig): JWT {
  if (cachedClient?.email === config.clientEmail) return cachedClient.jwt
  const jwt = new JWT({ email: config.clientEmail, key: config.privateKey, scopes: SCOPES })
  cachedClient = { email: config.clientEmail, jwt }
  return jwt
}

async function sheetsFetch(path: string, init: RequestInit = {}): Promise<unknown> {
  const config = getConfig()
  const token = await getJwtClient(config).getAccessToken()
  const res = await fetch(`${SHEETS_API}/${config.spreadsheetId}${path}`, {
    ...init,
    headers: {
      ...init.headers,
      Authorization: `Bearer ${token.token}`,
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`구글 시트 요청 실패 (${res.status}): ${body.slice(0, 300)}`)
  }
  return res.json()
}

type SheetMeta = { title: string; sheetId: number }
let cachedMeta: SheetMeta | null = null

/**
 * 사용할 시트 탭의 이름과 id를 알아낸다.
 * 환경 변수로 탭 이름을 지정하지 않으면 첫 번째 탭을 사용한다.
 */
async function getSheetMeta(): Promise<SheetMeta> {
  if (cachedMeta) return cachedMeta

  const data = (await sheetsFetch('?fields=sheets.properties(title,sheetId)')) as {
    sheets?: { properties?: { title?: string; sheetId?: number } }[]
  }
  const sheets = (data.sheets ?? [])
    .map((s) => s.properties)
    .filter((p): p is { title: string; sheetId: number } =>
      typeof p?.title === 'string' && typeof p?.sheetId === 'number'
    )
  if (sheets.length === 0) throw new Error('스프레드시트에서 시트 탭을 찾지 못했습니다.')

  const wanted = process.env[ROSTER_TAB_NAME_ENV]?.trim()
  const target = wanted ? sheets.find((s) => s.title === wanted) : sheets[0]
  if (!target) throw new Error(`'${wanted}' 이름의 시트 탭을 찾지 못했습니다.`)

  cachedMeta = target
  return target
}

/** 데이터 행 전체를 읽는다 (헤더 제외). 반환값의 index 0 = 시트 2행 */
export async function readRosterRows(): Promise<string[][]> {
  const meta = await getSheetMeta()
  const data = (await sheetsFetch(
    `/values/${encodeURIComponent(rosterRange(meta.title))}`
  )) as { values?: string[][] }

  const values = data.values ?? []
  return values.slice(ROSTER_HEADER_ROW)
}

/** 헤더가 비어 있으면 헤더 행을 채운다 (빈 시트에 처음 저장할 때) */
export async function ensureRosterHeader(): Promise<void> {
  const meta = await getSheetMeta()
  const data = (await sheetsFetch(
    `/values/${encodeURIComponent(rosterRange(meta.title, `A${ROSTER_HEADER_ROW}:G${ROSTER_HEADER_ROW}`))}`
  )) as { values?: string[][] }

  if (data.values?.[0]?.length) return

  await sheetsFetch(
    `/values/${encodeURIComponent(
      rosterRange(meta.title, `A${ROSTER_HEADER_ROW}:G${ROSTER_HEADER_ROW}`)
    )}?valueInputOption=RAW`,
    { method: 'PUT', body: JSON.stringify({ values: [ROSTER_HEADER] }) }
  )
}

export async function appendRosterRow(row: string[]): Promise<void> {
  const meta = await getSheetMeta()
  await sheetsFetch(
    `/values/${encodeURIComponent(
      rosterRange(meta.title)
    )}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
    { method: 'POST', body: JSON.stringify({ values: [row] }) }
  )
}

/** dataIndex = readRosterRows()가 돌려준 배열에서의 위치 */
export async function updateRosterRow(dataIndex: number, row: string[]): Promise<void> {
  const meta = await getSheetMeta()
  const sheetRow = dataIndex + ROSTER_HEADER_ROW + 1
  await sheetsFetch(
    `/values/${encodeURIComponent(
      rosterRange(meta.title, `A${sheetRow}:G${sheetRow}`)
    )}?valueInputOption=RAW`,
    { method: 'PUT', body: JSON.stringify({ values: [row] }) }
  )
}

export async function deleteRosterRow(dataIndex: number): Promise<void> {
  const meta = await getSheetMeta()
  const startIndex = dataIndex + ROSTER_HEADER_ROW // 0-based, 헤더 다음부터
  await sheetsFetch(':batchUpdate', {
    method: 'POST',
    body: JSON.stringify({
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId: meta.sheetId,
              dimension: 'ROWS',
              startIndex,
              endIndex: startIndex + 1,
            },
          },
        },
      ],
    }),
  })
}

/** 열 범위 상수를 다른 모듈에서도 쓸 수 있게 재노출 */
export { ROSTER_COLUMN_RANGE }
