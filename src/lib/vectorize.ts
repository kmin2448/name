// JPG·PNG를 SVG로 바꾸는 기능의 순수 로직.
// 브라우저 API를 쓰지 않으므로 그대로 테스트할 수 있다.

/** 트레이싱 정도 — 원본을 얼마나 세밀하게 따라갈지 */
export type TraceLevel = 'low' | 'medium' | 'high'

/**
 * vtracer 설정. 모든 항목이 필수다 —
 * 하나라도 빠지면 wasm 쪽에서 설정을 읽다가 패닉한다.
 */
export type VtracerConfig = {
  /** 흑백 2치화 모드 (컬러 로고에는 쓰지 않는다) */
  binary: boolean
  /** 경로를 어떻게 그릴지 — spline이 베지어 곡선을 만든다 */
  mode: 'pixel' | 'polygon' | 'spline'
  /** 색 영역을 쌓을지, 뚫을지 */
  hierarchical: 'stacked' | 'cutout'
  /** 이 화소 수 이하의 얼룩을 버린다 — 작을수록 잔 디테일을 남긴다 */
  filterSpeckle: number
  /** 채널당 유효 비트 수. 7 이상은 영역이 뭉개지거나 wasm이 죽는다 */
  colorPrecision: number
  /** 그라데이션을 몇 단계로 끊을지 — 작을수록 층이 많아진다 */
  layerDifference: number
  /** 이 각도 미만은 모서리로 본다 — 작을수록 원본 모서리를 살린다 */
  cornerThreshold: number
  /** 이 길이 미만의 선분은 잇는다 — 작을수록 촘촘하다 */
  lengthThreshold: number
  /** 곡선 맞춤 반복 횟수 */
  maxIterations: number
  /** 이 각도를 넘으면 곡선을 나눈다 */
  spliceThreshold: number
  /** 출력 좌표 소수점 자리수 */
  pathPrecision: number
}

/**
 * colorPrecision 상한.
 * 7이면 색 영역이 하나로 뭉개지고, 8이면 vtracer 내부(color_clusters)에서 패닉한다.
 */
export const MAX_COLOR_PRECISION = 6

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
    desc: '색을 크게 묶고 잔 얼룩을 지웁니다. 단순한 도형·아이콘에 알맞습니다.',
  },
  {
    value: 'medium',
    label: '중간',
    desc: '로고·교표처럼 색 경계가 뚜렷한 그림에 알맞습니다. 대부분 이 정도면 충분합니다.',
  },
  {
    value: 'high',
    label: '높음',
    desc: '모서리와 가는 획까지 살립니다. 글자가 들어간 로고라면 이쪽을 쓰세요.',
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
      return 1200
    case 'medium':
      return 2000
    case 'high':
      return 3000
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

/**
 * 트레이싱 정도별 vtracer 설정.
 *
 * 세 단계 모두 spline 모드다. 곡선으로 그려야 로고 테두리가 매끈하게 나온다.
 * (다각형으로 그리면 확대했을 때 각져 보인다)
 * 정도는 colorPrecision이 아니라 얼룩 제거·모서리 민감도·좌표 정밀도로 조절한다.
 * colorPrecision을 올리면 오히려 영역이 뭉개진다.
 */
export function vtracerConfig(level: TraceLevel): VtracerConfig {
  const common = {
    binary: false,
    mode: 'spline',
    hierarchical: 'stacked',
  } as const

  switch (level) {
    case 'low':
      return {
        ...common,
        filterSpeckle: 16,
        colorPrecision: 4,
        layerDifference: 32,
        cornerThreshold: 90,
        lengthThreshold: 8,
        spliceThreshold: 20,
        maxIterations: 8,
        pathPrecision: 2,
      }
    case 'medium':
      return {
        ...common,
        filterSpeckle: 4,
        colorPrecision: MAX_COLOR_PRECISION,
        layerDifference: 16,
        cornerThreshold: 60,
        lengthThreshold: 4,
        spliceThreshold: 45,
        maxIterations: 10,
        pathPrecision: 3,
      }
    case 'high':
      return {
        ...common,
        filterSpeckle: 1,
        colorPrecision: MAX_COLOR_PRECISION,
        layerDifference: 8,
        cornerThreshold: 30,
        lengthThreshold: 2,
        spliceThreshold: 60,
        maxIterations: 16,
        pathPrecision: 5,
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
