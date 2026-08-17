// 명패 디자인(배경·오버레이 이미지와 배치값)의 도메인 로직. 순수 함수만 둔다.
import { DESIGN_COLUMN } from '@/constants/sheets'
import { ImageCondition, NameplateSize, NameplateState, OverlayImage, TextFieldConfig } from '@/types/nameplate'

/** 사용자 한 명이 저장할 수 있는 최대 디자인 수 */
export const MAX_DESIGNS = 3

/** 불러온 디자인을 적용할 때 텍스트 서식을 어떻게 할지 */
export type ApplyMode =
  /** 저장 당시의 폰트 크기·위치·색상으로 덮어쓴다 */
  | 'overwrite'
  /** 이미지만 적용하고 지금 쓰던 서식은 그대로 둔다 */
  | 'keep'

export function isApplyMode(value: unknown): value is ApplyMode {
  return value === 'overwrite' || value === 'keep'
}

export type DesignSummary = {
  id: string
  title: string
  savedAt: string
}

/** 오버레이 이미지 — 실제 파일은 드라이브에 있고 여기에는 id와 배치값만 둔다 */
export type DesignOverlay = {
  id: string
  name: string
  fileId: string
  positionX: number
  positionY: number
  widthPct: number
  heightPct: number
  cropX: number
  cropY: number
  cropW: number
  cropH: number
  condition: ImageCondition
}

export type DesignPayload = {
  size: NameplateSize
  /** 앱 내장 배경 프리셋(SVG data URI)은 용량이 작아 그대로 담는다 */
  backgroundInline: string | null
  /** 사용자가 올린 배경 사진의 드라이브 파일 id */
  backgroundFileId: string | null
  overlays: DesignOverlay[]
  /** 저장 당시의 텍스트 서식 — '덮어쓰기'를 고르면 이 값이 적용된다 */
  fields: TextFieldConfig[]
  layers: string[]
  showBorder: boolean
}

/** 앱에 내장된 배경 프리셋인지 (업로드 사진과 구분) */
export function isInlineBackground(background: string | null): boolean {
  if (!background) return false
  // 프리셋과 합성 배경은 SVG data URI, 업로드 사진은 비트맵 data URI
  return background.startsWith('data:image/svg+xml')
}

/** 드라이브에 올려야 하는 이미지 목록을 뽑아낸다 (업로드 사진만 해당) */
export function collectUploadTargets(state: NameplateState): {
  background: string | null
  overlays: { id: string; name: string; dataUrl: string }[]
} {
  const background =
    state.backgroundImage && !isInlineBackground(state.backgroundImage)
      ? state.backgroundImage
      : null
  return {
    background,
    overlays: state.overlayImages.map((o) => ({ id: o.id, name: o.name, dataUrl: o.src })),
  }
}

/** 업로드 결과(파일 id)를 받아 저장할 본문을 만든다 */
export function buildDesignPayload(
  state: NameplateState,
  backgroundFileId: string | null,
  overlayFileIds: Record<string, string>
): DesignPayload {
  const fieldIds = new Set(state.fields.map((f) => f.id))
  const overlays: DesignOverlay[] = state.overlayImages
    .filter((o) => overlayFileIds[o.id])
    .map((o) => ({
      id: o.id,
      name: o.name,
      fileId: overlayFileIds[o.id],
      positionX: o.positionX,
      positionY: o.positionY,
      widthPct: o.widthPct,
      heightPct: o.heightPct,
      cropX: o.cropX,
      cropY: o.cropY,
      cropW: o.cropW,
      cropH: o.cropH,
      condition: o.condition,
    }))
  const overlayIds = new Set(overlays.map((o) => o.id))

  return {
    size: state.size,
    backgroundInline: isInlineBackground(state.backgroundImage) ? state.backgroundImage : null,
    backgroundFileId,
    overlays,
    fields: state.fields,
    // 저장한 이미지와 텍스트만 남긴 레이어 순서
    layers: state.layers.filter((id) => fieldIds.has(id) || overlayIds.has(id)),
    showBorder: state.showBorder,
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function toNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function parseOverlay(raw: unknown): DesignOverlay | null {
  if (!isRecord(raw)) return null
  const { id, fileId } = raw
  if (typeof id !== 'string' || typeof fileId !== 'string' || !fileId) return null

  const condition = raw.condition
  return {
    id,
    fileId,
    name: typeof raw.name === 'string' ? raw.name : '이미지',
    positionX: toNumber(raw.positionX, 0),
    positionY: toNumber(raw.positionY, 0),
    widthPct: toNumber(raw.widthPct, 20),
    heightPct: toNumber(raw.heightPct, 20),
    cropX: toNumber(raw.cropX, 0),
    cropY: toNumber(raw.cropY, 0),
    cropW: toNumber(raw.cropW, 100),
    cropH: toNumber(raw.cropH, 100),
    condition: isRecord(condition) && condition.type === 'field'
      ? (condition as unknown as ImageCondition)
      : { type: 'all' },
  }
}

/** 시트에 저장된 JSON을 검증하며 읽는다 */
export function parseDesignPayload(raw: string): DesignPayload | null {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }
  if (!isRecord(parsed)) return null

  const { size, fields } = parsed
  if (!isRecord(size) || typeof size.widthMm !== 'number' || typeof size.heightMm !== 'number') {
    return null
  }
  if (!Array.isArray(fields)) return null

  const overlays = Array.isArray(parsed.overlays)
    ? parsed.overlays.map(parseOverlay).filter((o): o is DesignOverlay => o !== null)
    : []

  return {
    size: size as unknown as NameplateSize,
    backgroundInline: typeof parsed.backgroundInline === 'string' ? parsed.backgroundInline : null,
    backgroundFileId: typeof parsed.backgroundFileId === 'string' ? parsed.backgroundFileId : null,
    overlays,
    fields: fields as TextFieldConfig[],
    layers: Array.isArray(parsed.layers)
      ? (parsed.layers as string[])
      : (fields as TextFieldConfig[]).map((f) => f.id),
    showBorder: typeof parsed.showBorder === 'boolean' ? parsed.showBorder : true,
  }
}

/** 디자인에 담긴 모든 드라이브 파일 id (삭제 시 함께 정리) */
export function designFileIds(payload: DesignPayload): string[] {
  const ids = payload.overlays.map((o) => o.fileId)
  return payload.backgroundFileId ? [payload.backgroundFileId, ...ids] : ids
}

/** 드라이브에서 받아온 실제 이미지 데이터 */
export type DesignImages = {
  background: string | null
  /** 오버레이 id → data URL */
  overlays: Record<string, string>
}

/**
 * 불러온 디자인을 현재 편집 상태에 적용한다.
 *
 * mode='overwrite' — 저장 당시의 텍스트 서식(폰트 크기·위치·색상)까지 덮어쓴다.
 * mode='keep'      — 이미지와 명패 규격만 바꾸고 지금 쓰던 서식은 그대로 둔다.
 *
 * 명단(excelRows)은 어느 쪽이든 건드리지 않는다.
 */
export function applyDesign(
  current: NameplateState,
  payload: DesignPayload,
  images: DesignImages,
  mode: ApplyMode
): NameplateState {
  const overlayImages: OverlayImage[] = payload.overlays
    .filter((o) => images.overlays[o.id])
    .map((o) => ({
      id: o.id,
      src: images.overlays[o.id],
      name: o.name,
      positionX: o.positionX,
      positionY: o.positionY,
      widthPct: o.widthPct,
      heightPct: o.heightPct,
      cropX: o.cropX,
      cropY: o.cropY,
      cropW: o.cropW,
      cropH: o.cropH,
      condition: o.condition,
    }))

  const fields = mode === 'overwrite' ? payload.fields : current.fields
  const fieldIds = new Set(fields.map((f) => f.id))
  const overlayIds = new Set(overlayImages.map((o) => o.id))

  // 저장된 순서를 우선 쓰되, 지금 상태에만 있는 텍스트 항목도 빠뜨리지 않는다
  const ordered = payload.layers.filter((id) => fieldIds.has(id) || overlayIds.has(id))
  const missingFields = fields.map((f) => f.id).filter((id) => !ordered.includes(id))
  const missingOverlays = overlayImages.map((o) => o.id).filter((id) => !ordered.includes(id))

  return {
    ...current,
    size: payload.size,
    backgroundImage: images.background ?? payload.backgroundInline,
    overlayImages,
    fields,
    layers: [...missingOverlays, ...ordered, ...missingFields],
    // 서식을 유지하기로 했다면 페이지별 개별 서식도 그대로 둔다
    pageFieldOverrides: mode === 'overwrite' ? {} : current.pageFieldOverrides,
    showBorder: mode === 'overwrite' ? payload.showBorder : current.showBorder,
  }
}

/** 저장 가능 여부 — 덮어쓰기는 건수가 늘지 않는다 */
export function canSaveDesign(currentCount: number, isOverwrite: boolean): boolean {
  return isOverwrite || currentCount < MAX_DESIGNS
}

function formatDate(date: Date): string {
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

/** 건명 미입력 시 '명패 디자인 (저장 날짜)'로 자동 생성 */
export function buildDesignTitle(input: string, savedAt: Date): string {
  const typed = input.trim()
  return typed || `명패 디자인 (${formatDate(savedAt)})`
}

export function designRowToSummary(row: string[]): DesignSummary | null {
  const id = row[DESIGN_COLUMN.id]?.trim()
  if (!id) return null
  return {
    id,
    title: row[DESIGN_COLUMN.title] ?? '',
    savedAt: row[DESIGN_COLUMN.savedAt] ?? '',
  }
}

export function toDesignRow(
  id: string,
  userEmail: string,
  summary: Pick<DesignSummary, 'title' | 'savedAt'>,
  payload: DesignPayload
): string[] {
  const row: string[] = []
  row[DESIGN_COLUMN.id] = id
  row[DESIGN_COLUMN.userEmail] = userEmail
  row[DESIGN_COLUMN.title] = summary.title
  row[DESIGN_COLUMN.savedAt] = summary.savedAt
  row[DESIGN_COLUMN.payload] = JSON.stringify(payload)
  return row
}
