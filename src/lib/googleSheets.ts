// 구글 시트 접근 계층 — 반드시 서버(Route Handler)에서만 사용한다.
// 서비스 계정 자격 증명은 클라이언트로 절대 내려가지 않는다.
import { JWT } from 'google-auth-library'
import {
  DESIGN_COLUMN_RANGE,
  DESIGN_HEADER,
  DESIGN_HEADER_ROW,
  DESIGN_TAB_NAME_ENV,
  ROSTER_COLUMN_RANGE,
  ROSTER_HEADER,
  ROSTER_HEADER_ROW,
  ROSTER_TAB_NAME_ENV,
  designRange,
  rosterRange,
} from '@/constants/sheets'

const SHEETS_API = 'https://sheets.googleapis.com/v4/spreadsheets'
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets']

/** 서버에 시트 설정이 없을 때 — 호출 측에서 503으로 안내한다 */
export class SheetsConfigError extends Error {}

type ServiceAccount = {
  clientEmail: string
  privateKey: string
}

function getServiceAccount(): ServiceAccount {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
  // Vercel 환경 변수에는 줄바꿈이 \n 문자열로 들어가므로 실제 줄바꿈으로 되돌린다
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n')

  if (!clientEmail || !privateKey) {
    throw new SheetsConfigError(
      '서버에 GOOGLE_SERVICE_ACCOUNT_EMAIL / GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY가 설정되지 않았습니다.'
    )
  }
  return { clientEmail, privateKey }
}

/** 명단이 저장되는 스프레드시트 */
export function getRosterSpreadsheetId(): string {
  const id = process.env.GOOGLE_SHEETS_ID
  if (!id) throw new SheetsConfigError('서버에 GOOGLE_SHEETS_ID가 설정되지 않았습니다.')
  return id
}

/** 명패 디자인이 저장되는 스프레드시트 */
export function getDesignSpreadsheetId(): string {
  const id = process.env.GOOGLE_DESIGN_SHEETS_ID
  if (!id) throw new SheetsConfigError('서버에 GOOGLE_DESIGN_SHEETS_ID가 설정되지 않았습니다.')
  return id
}

let cachedClient: { email: string; jwt: JWT } | null = null

function getJwtClient(config: ServiceAccount): JWT {
  if (cachedClient?.email === config.clientEmail) return cachedClient.jwt
  const jwt = new JWT({ email: config.clientEmail, key: config.privateKey, scopes: SCOPES })
  cachedClient = { email: config.clientEmail, jwt }
  return jwt
}

async function sheetsFetch(
  spreadsheetId: string,
  path: string,
  init: RequestInit = {}
): Promise<unknown> {
  const token = await getJwtClient(getServiceAccount()).getAccessToken()
  const res = await fetch(`${SHEETS_API}/${spreadsheetId}${path}`, {
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

/** 스프레드시트별 탭 정보 캐시 (콜드 스타트마다 한 번만 조회) */
const metaCache = new Map<string, SheetMeta>()

/**
 * 사용할 시트 탭의 이름과 id를 알아낸다.
 * 환경 변수로 탭 이름을 지정하지 않으면 첫 번째 탭을 사용한다.
 */
async function getSheetMeta(spreadsheetId: string, tabNameEnv: string): Promise<SheetMeta> {
  const cached = metaCache.get(spreadsheetId)
  if (cached) return cached

  const data = (await sheetsFetch(spreadsheetId, '?fields=sheets.properties(title,sheetId)')) as {
    sheets?: { properties?: { title?: string; sheetId?: number } }[]
  }
  const sheets = (data.sheets ?? [])
    .map((s) => s.properties)
    .filter((p): p is { title: string; sheetId: number } =>
      typeof p?.title === 'string' && typeof p?.sheetId === 'number'
    )
  if (sheets.length === 0) throw new Error('스프레드시트에서 시트 탭을 찾지 못했습니다.')

  const wanted = process.env[tabNameEnv]?.trim()
  const target = wanted ? sheets.find((s) => s.title === wanted) : sheets[0]
  if (!target) throw new Error(`'${wanted}' 이름의 시트 탭을 찾지 못했습니다.`)

  metaCache.set(spreadsheetId, target)
  return target
}

/** 한 스프레드시트의 표 하나를 다루기 위한 설정 */
export type SheetTable = {
  spreadsheetId: string
  /** 헤더가 있는 행 번호 (1-based) */
  headerRow: number
  /** 데이터 열 범위 (예: 'A:G') */
  columnRange: string
  header: readonly string[]
  /** 탭 이름을 지정하는 환경 변수 이름 */
  tabNameEnv: string
  /** 탭 이름을 포함한 A1 범위를 만드는 함수 */
  range: (tabName: string, columnRange?: string) => string
}

/** 헤더 한 줄에 해당하는 열 범위 (예: 'A1:G1') */
function headerRange(table: SheetTable): string {
  const [from, to] = table.columnRange.split(':')
  return `${from}${table.headerRow}:${to}${table.headerRow}`
}

/** 특정 행 하나의 열 범위 (예: 'A5:G5') */
function singleRowRange(table: SheetTable, sheetRow: number): string {
  const [from, to] = table.columnRange.split(':')
  return `${from}${sheetRow}:${to}${sheetRow}`
}

/** 데이터 행 전체를 읽는다 (헤더 제외). 반환값의 index 0 = 헤더 바로 다음 행 */
export async function readRows(table: SheetTable): Promise<string[][]> {
  const meta = await getSheetMeta(table.spreadsheetId, table.tabNameEnv)
  const data = (await sheetsFetch(
    table.spreadsheetId,
    `/values/${encodeURIComponent(table.range(meta.title))}`
  )) as { values?: string[][] }

  return (data.values ?? []).slice(table.headerRow)
}

/** 헤더가 비어 있으면 헤더 행을 채운다 (빈 시트에 처음 저장할 때) */
export async function ensureHeader(table: SheetTable): Promise<void> {
  const meta = await getSheetMeta(table.spreadsheetId, table.tabNameEnv)
  const range = table.range(meta.title, headerRange(table))
  const data = (await sheetsFetch(table.spreadsheetId, `/values/${encodeURIComponent(range)}`)) as {
    values?: string[][]
  }

  if (data.values?.[0]?.length) return

  await sheetsFetch(table.spreadsheetId, `/values/${encodeURIComponent(range)}?valueInputOption=RAW`, {
    method: 'PUT',
    body: JSON.stringify({ values: [table.header] }),
  })
}

export async function appendRow(table: SheetTable, row: string[]): Promise<void> {
  const meta = await getSheetMeta(table.spreadsheetId, table.tabNameEnv)
  await sheetsFetch(
    table.spreadsheetId,
    `/values/${encodeURIComponent(
      table.range(meta.title)
    )}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
    { method: 'POST', body: JSON.stringify({ values: [row] }) }
  )
}

/** dataIndex = readRows()가 돌려준 배열에서의 위치 */
export async function updateRow(table: SheetTable, dataIndex: number, row: string[]): Promise<void> {
  const meta = await getSheetMeta(table.spreadsheetId, table.tabNameEnv)
  const sheetRow = dataIndex + table.headerRow + 1
  await sheetsFetch(
    table.spreadsheetId,
    `/values/${encodeURIComponent(
      table.range(meta.title, singleRowRange(table, sheetRow))
    )}?valueInputOption=RAW`,
    { method: 'PUT', body: JSON.stringify({ values: [row] }) }
  )
}

export async function deleteRow(table: SheetTable, dataIndex: number): Promise<void> {
  const meta = await getSheetMeta(table.spreadsheetId, table.tabNameEnv)
  const startIndex = dataIndex + table.headerRow // 0-based, 헤더 다음부터
  await sheetsFetch(table.spreadsheetId, ':batchUpdate', {
    method: 'POST',
    body: JSON.stringify({
      requests: [
        {
          deleteDimension: {
            range: { sheetId: meta.sheetId, dimension: 'ROWS', startIndex, endIndex: startIndex + 1 },
          },
        },
      ],
    }),
  })
}

// ── 명단 표 ────────────────────────────────────────────────────────────
function rosterTable(): SheetTable {
  return {
    spreadsheetId: getRosterSpreadsheetId(),
    headerRow: ROSTER_HEADER_ROW,
    columnRange: ROSTER_COLUMN_RANGE,
    header: ROSTER_HEADER,
    tabNameEnv: ROSTER_TAB_NAME_ENV,
    range: rosterRange,
  }
}

export const readRosterRows = () => readRows(rosterTable())
export const ensureRosterHeader = () => ensureHeader(rosterTable())
export const appendRosterRow = (row: string[]) => appendRow(rosterTable(), row)
export const updateRosterRow = (dataIndex: number, row: string[]) =>
  updateRow(rosterTable(), dataIndex, row)
export const deleteRosterRow = (dataIndex: number) => deleteRow(rosterTable(), dataIndex)

// ── 디자인 표 ──────────────────────────────────────────────────────────
function designTable(): SheetTable {
  return {
    spreadsheetId: getDesignSpreadsheetId(),
    headerRow: DESIGN_HEADER_ROW,
    columnRange: DESIGN_COLUMN_RANGE,
    header: DESIGN_HEADER,
    tabNameEnv: DESIGN_TAB_NAME_ENV,
    range: designRange,
  }
}

export const readDesignRows = () => readRows(designTable())
export const ensureDesignHeader = () => ensureHeader(designTable())
export const appendDesignRow = (row: string[]) => appendRow(designTable(), row)
export const updateDesignRow = (dataIndex: number, row: string[]) =>
  updateRow(designTable(), dataIndex, row)
export const deleteDesignRow = (dataIndex: number) => deleteRow(designTable(), dataIndex)

/** 열 범위 상수를 다른 모듈에서도 쓸 수 있게 재노출 */
export { ROSTER_COLUMN_RANGE }
