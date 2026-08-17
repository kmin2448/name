// 저장된 명단(제작 이력)의 도메인 로직. 서버·클라이언트 양쪽에서 쓰는 순수 함수만 둔다.
import { NameplateSize, NameplateState, TextFieldConfig } from '@/types/nameplate'
import { ROSTER_COLUMN } from '@/constants/sheets'

/** 사용자 한 명이 저장할 수 있는 최대 건수 */
export const MAX_ROSTERS = 20

/** 목록에 표시하는 요약 정보 (명단 본문은 포함하지 않는다) */
export type RosterSummary = {
  id: string
  title: string
  programName: string
  pageCount: number
  savedAt: string
}

/**
 * 시트에 저장하는 본문.
 * 배경·오버레이 이미지는 base64라 시트 셀 한도(5만 자)를 넘기므로 제외한다.
 */
export type RosterPayload = {
  size: NameplateSize
  fields: TextFieldConfig[]
  layers: string[]
  pageFieldOverrides: Record<number, Record<string, TextFieldConfig>>
  excelRows: Record<string, string>[]
  showBorder: boolean
}

/** 편집 중인 상태에서 저장 대상만 뽑아낸다 */
export function extractRosterPayload(state: NameplateState): RosterPayload {
  const fieldIds = new Set(state.fields.map((f) => f.id))
  return {
    size: state.size,
    fields: state.fields,
    // 이미지 레이어는 저장하지 않으므로 텍스트 항목 순서만 남긴다
    layers: state.layers.filter((id) => fieldIds.has(id)),
    pageFieldOverrides: state.pageFieldOverrides,
    excelRows: state.excelRows,
    showBorder: state.showBorder,
  }
}

/** 명단에서 프로그램명을 찾는다 (건명 자동 생성용) */
export function findProgramName(
  rows: Record<string, string>[],
  fields: TextFieldConfig[]
): string {
  const field = fields.find((f) => f.label.includes('프로그램'))
  if (!field) return ''
  const row = rows.find((r) => (r[field.label] ?? '').trim())
  return (row?.[field.label] ?? '').trim()
}

function formatDate(date: Date): string {
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

/**
 * 건명을 정한다.
 * 사용자가 입력하지 않으면 '프로그램명 (저장 날짜)'로 자동 생성하고,
 * 프로그램명도 없으면 '명패 (저장 날짜)'를 쓴다.
 */
export function buildRosterTitle(input: string, programName: string, savedAt: Date): string {
  const typed = input.trim()
  if (typed) return typed
  const base = programName.trim() || '명패'
  return `${base} (${formatDate(savedAt)})`
}

/** 저장 가능 여부 — 새로 저장할 때만 건수 제한을 적용한다 (덮어쓰기는 건수가 늘지 않음) */
export function canSaveRoster(currentCount: number, isOverwrite: boolean): boolean {
  return isOverwrite || currentCount < MAX_ROSTERS
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

/** 시트에 저장된 JSON 문자열을 검증하며 읽는다 */
export function parseRosterPayload(raw: string): RosterPayload | null {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }
  if (!isRecord(parsed)) return null

  const { size, fields, layers, pageFieldOverrides, excelRows, showBorder } = parsed
  if (!isRecord(size) || typeof size.widthMm !== 'number' || typeof size.heightMm !== 'number') {
    return null
  }
  if (!Array.isArray(fields) || !Array.isArray(excelRows)) return null

  return {
    size: size as unknown as NameplateSize,
    fields: fields as TextFieldConfig[],
    layers: Array.isArray(layers) ? (layers as string[]) : (fields as TextFieldConfig[]).map((f) => f.id),
    pageFieldOverrides: isRecord(pageFieldOverrides)
      ? (pageFieldOverrides as RosterPayload['pageFieldOverrides'])
      : {},
    excelRows: excelRows as Record<string, string>[],
    showBorder: typeof showBorder === 'boolean' ? showBorder : true,
  }
}

/**
 * 불러온 명단을 현재 편집 상태에 반영한다.
 * 저장 대상이 아닌 배경·오버레이 이미지는 지금 화면의 것을 그대로 둔다.
 */
export function mergeRestoredState(current: NameplateState, payload: RosterPayload): NameplateState {
  const overlayIds = current.overlayImages.map((o) => o.id)
  const fieldIds = payload.fields.map((f) => f.id)
  const restoredFieldLayers = payload.layers.filter((id) => fieldIds.includes(id))
  const missingFieldLayers = fieldIds.filter((id) => !restoredFieldLayers.includes(id))

  return {
    ...current,
    size: payload.size,
    fields: payload.fields,
    // 이미지가 아래, 텍스트가 위 (기존 레이어 규칙과 동일)
    layers: [
      ...current.layers.filter((id) => overlayIds.includes(id)),
      ...restoredFieldLayers,
      ...missingFieldLayers,
    ],
    pageFieldOverrides: payload.pageFieldOverrides,
    excelRows: payload.excelRows,
    showBorder: payload.showBorder,
    previewData: payload.excelRows[0] ?? current.previewData,
  }
}

/** 시트 한 행을 목록 요약으로 바꾼다 (형식이 깨진 행은 건너뛰도록 null) */
export function rowToSummary(row: string[]): RosterSummary | null {
  const id = row[ROSTER_COLUMN.id]?.trim()
  if (!id) return null
  const pageCount = Number(row[ROSTER_COLUMN.pageCount])
  return {
    id,
    title: row[ROSTER_COLUMN.title] ?? '',
    programName: row[ROSTER_COLUMN.programName] ?? '',
    pageCount: Number.isFinite(pageCount) ? pageCount : 0,
    savedAt: row[ROSTER_COLUMN.savedAt] ?? '',
  }
}

/** 저장할 시트 행을 만든다 */
export function toSheetRow(
  id: string,
  userEmail: string,
  summary: Pick<RosterSummary, 'title' | 'programName' | 'pageCount' | 'savedAt'>,
  payload: RosterPayload
): string[] {
  const row: string[] = []
  row[ROSTER_COLUMN.id] = id
  row[ROSTER_COLUMN.userEmail] = userEmail
  row[ROSTER_COLUMN.title] = summary.title
  row[ROSTER_COLUMN.programName] = summary.programName
  row[ROSTER_COLUMN.pageCount] = String(summary.pageCount)
  row[ROSTER_COLUMN.savedAt] = summary.savedAt
  row[ROSTER_COLUMN.payload] = JSON.stringify(payload)
  return row
}

/** 구글 시트 셀 하나에 들어갈 수 있는 최대 길이 */
export const SHEET_CELL_LIMIT = 50000

/** 명단이 너무 커서 시트 셀에 담기지 않는지 확인한다 */
export function exceedsCellLimit(payload: RosterPayload): boolean {
  return JSON.stringify(payload).length > SHEET_CELL_LIMIT
}
