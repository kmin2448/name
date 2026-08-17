// JPG·PNG를 SVG로 바꾸는 기능의 순수 로직.
// 브라우저 API를 쓰지 않으므로 그대로 테스트할 수 있다.
import type { TracerOptions } from 'imagetracerjs'

/** 트레이싱 정도 — 원본을 얼마나 세밀하게 따라갈지 */
export type TraceLevel = 'low' | 'medium' | 'high'

export type TraceLevelInfo = {
  value: TraceLevel
  label: string
  desc: string
}

/** 화면에 그대로 쓰는 선택지 목록 (단순 → 정밀 순서) */
export const TRACE_LEVELS: readonly TraceLevelInfo[] = [
  {
    value: 'low',
    label: '낮음',
    desc: '색을 크게 묶어 단순하게 그립니다. 변환이 가장 빠르고 파일이 가볍습니다.',
  },
  {
    value: 'medium',
    label: '중간',
    desc: '로고·도장처럼 경계가 뚜렷한 그림에 알맞습니다. 대부분 이 정도면 충분합니다.',
  },
  {
    value: 'high',
    label: '높음',
    desc: '원본에 가깝게 세밀히 따라갑니다. 변환이 느리고 파일이 커집니다.',
  },
]

/** 변환할 수 있는 파일 형식 */
export const SUPPORTED_TYPES = ['image/jpeg', 'image/png'] as const
/** <input accept="...">에 그대로 넣는 값 */
export const ACCEPT_ATTR = '.jpg,.jpeg,.png,image/jpeg,image/png'

/** 한 장당 허용하는 최대 용량 (10MB) */
export const MAX_FILE_BYTES = 10 * 1024 * 1024

export function isSupportedImageType(type: string): boolean {
  return (SUPPORTED_TYPES as readonly string[]).includes(type)
}

/**
 * 트레이싱 전에 줄일 최대 변 길이.
 * 원본이 클수록 경로가 기하급수적으로 늘어 브라우저가 멈추므로 한도를 둔다.
 */
export function maxDimension(level: TraceLevel): number {
  switch (level) {
    case 'low':
      return 800
    case 'medium':
      return 1200
    case 'high':
      return 1600
  }
}

/**
 * 긴 변을 max에 맞춰 비율을 유지한 채 줄인 크기.
 * 이미 작으면 원본 크기를 그대로 돌려준다.
 */
export function scaledSize(
  width: number,
  height: number,
  max: number
): { width: number; height: number; scaled: boolean } {
  const longest = Math.max(width, height)
  if (longest <= max) return { width, height, scaled: false }

  const ratio = max / longest
  return {
    // 1px 밑으로 내려가지 않도록 막는다 (캔버스 크기가 0이면 변환이 깨진다)
    width: Math.max(1, Math.round(width * ratio)),
    height: Math.max(1, Math.round(height * ratio)),
    scaled: true,
  }
}

/** 트레이싱 정도별 imagetracerjs 옵션 */
export function traceOptions(level: TraceLevel): Partial<TracerOptions> {
  const common: Partial<TracerOptions> = {
    // 면으로만 그린다 — 외곽선을 얹으면 인쇄물에서 색이 탁해진다
    strokewidth: 0,
    linefilter: false,
    rightangleenhance: true,
    viewbox: true,
    desc: false,
    scale: 1,
  }

  switch (level) {
    case 'low':
      return {
        ...common,
        numberofcolors: 6,
        colorquantcycles: 2,
        mincolorratio: 0.02,
        pathomit: 12,
        ltres: 2,
        qtres: 2,
        // 흐림을 주면 경계에 중간색 띠가 생겨 오히려 경로가 늘어난다.
        // '낮음'은 가장 단순해야 하므로 끈다.
        blurradius: 0,
        blurdelta: 20,
        roundcoords: 1,
      }
    case 'medium':
      return {
        ...common,
        numberofcolors: 16,
        colorquantcycles: 3,
        mincolorratio: 0.01,
        pathomit: 8,
        ltres: 1,
        qtres: 1,
        blurradius: 0,
        blurdelta: 20,
        roundcoords: 2,
      }
    case 'high':
      return {
        ...common,
        numberofcolors: 32,
        colorquantcycles: 5,
        mincolorratio: 0,
        pathomit: 1,
        ltres: 0.5,
        qtres: 0.5,
        blurradius: 0,
        blurdelta: 20,
        roundcoords: 2,
      }
  }
}

/** 원본 파일명의 확장자를 .svg로 바꾼다 */
export function svgFileName(originalName: string): string {
  const base = originalName.replace(/\.[^./\\]+$/, '')
  return `${base || 'image'}.svg`
}

/** 사람이 읽는 파일 크기 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/** 파일을 받아들일 수 있는지 검사한다. 문제가 없으면 null */
export function validateFile(file: { name: string; type: string; size: number }): string | null {
  if (!isSupportedImageType(file.type)) {
    return `${file.name}: JPG·PNG 파일만 변환할 수 있습니다.`
  }
  if (file.size > MAX_FILE_BYTES) {
    return `${file.name}: 파일이 너무 큽니다 (최대 ${formatBytes(MAX_FILE_BYTES)}).`
  }
  return null
}
