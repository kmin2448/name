// 편집 화면의 배율·위치(패닝) 상태. 새로고침 후에도 유지하기 위해 localStorage에 저장한다.

export type CanvasView = {
  zoom: number
  offsetX: number
  offsetY: number
}

export const MIN_ZOOM = 0.25
export const MAX_ZOOM = 3

/** 접속 직후 기본 화면 — 150% 배율, 편집 영역 좌상단 기준(여백은 CSS padding) */
export const DEFAULT_CANVAS_VIEW: CanvasView = { zoom: 1.5, offsetX: 0, offsetY: 0 }

const VIEW_KEY = 'nameplate_canvas_view'
// 배율 저장 기능 추가 이전에 쓰던 키 (이동 위치만 저장했다)
const LEGACY_OFFSET_KEY = 'nameplate_canvas_offset'

function toFiniteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

/** 저장된 값이 손상됐거나 형식이 다르면 null을 돌려준다 */
export function parseCanvasView(raw: unknown): CanvasView | null {
  if (!raw || typeof raw !== 'object') return null
  const record = raw as Record<string, unknown>
  const zoom = toFiniteNumber(record.zoom)
  const offsetX = toFiniteNumber(record.offsetX)
  const offsetY = toFiniteNumber(record.offsetY)
  if (zoom === null || offsetX === null || offsetY === null) return null
  return { zoom: clamp(zoom, MIN_ZOOM, MAX_ZOOM), offsetX, offsetY }
}

/**
 * 저장된 화면 상태를 읽는다.
 * hydration 불일치를 피하려면 첫 렌더가 아니라 마운트 이후에 호출해야 한다.
 */
export function loadCanvasView(): CanvasView | null {
  if (typeof window === 'undefined') return null
  try {
    const stored = localStorage.getItem(VIEW_KEY)
    if (stored) return parseCanvasView(JSON.parse(stored))

    // 이전 버전에서 저장한 이동 위치가 있으면 기본 배율과 함께 이어받는다
    const legacy = localStorage.getItem(LEGACY_OFFSET_KEY)
    if (!legacy) return null
    const parsed = JSON.parse(legacy) as Record<string, unknown>
    const offsetX = toFiniteNumber(parsed.x)
    const offsetY = toFiniteNumber(parsed.y)
    if (offsetX === null || offsetY === null) return null
    return { ...DEFAULT_CANVAS_VIEW, offsetX, offsetY }
  } catch {
    return null
  }
}

export function saveCanvasView(view: CanvasView): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(VIEW_KEY, JSON.stringify(view))
  } catch {
    // localStorage 사용 불가 환경에서는 무시
  }
}
