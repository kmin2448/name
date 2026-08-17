// 다중 선택(드래그 영역 선택)·정렬·그룹 이동 계산 유틸.
// 좌표는 모두 명패 캔버스 기준 % 단위이며, 렌더링과 무관한 순수 함수로 유지해
// 단위 테스트가 가능하도록 분리했다.

export type SelectionBox = {
  id: string
  positionX: number
  positionY: number
  widthPct: number
  heightPct: number
}

export type MarqueeRect = {
  x: number
  y: number
  width: number
  height: number
}

/** 가로 정렬 기준 */
export type AlignMode = 'left' | 'center' | 'right'

/** 정렬 기준 영역 — 선택 항목들의 외곽(selection) 또는 명패 전체(canvas) */
export type AlignReference = 'selection' | 'canvas'

/** 클릭과 영역 선택을 구분하는 최소 드래그 거리(화면 px) */
export const MARQUEE_MIN_PX = 3

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

/** 드래그 시작점과 현재점으로 좌상단 기준 사각형을 만든다. (역방향 드래그 지원) */
export function normalizeRect(x0: number, y0: number, x1: number, y1: number): MarqueeRect {
  return {
    x: Math.min(x0, x1),
    y: Math.min(y0, y1),
    width: Math.abs(x1 - x0),
    height: Math.abs(y1 - y0),
  }
}

/** 선택 영역과 조금이라도 겹치는 요소들의 id를 반환한다. */
export function boxesInRect(boxes: SelectionBox[], rect: MarqueeRect): string[] {
  const rectRight = rect.x + rect.width
  const rectBottom = rect.y + rect.height
  return boxes
    .filter((b) => {
      const right = b.positionX + b.widthPct
      const bottom = b.positionY + b.heightPct
      return b.positionX < rectRight && right > rect.x && b.positionY < rectBottom && bottom > rect.y
    })
    .map((b) => b.id)
}

/**
 * 선택된 요소들의 새 X 위치(id → positionX)를 계산한다.
 * - reference 'selection': 선택 항목 전체의 왼쪽 끝/중앙/오른쪽 끝에 맞춘다.
 * - reference 'canvas': 명패 전체의 왼쪽 끝/중앙/오른쪽 끝에 맞춘다.
 */
export function alignBoxes(
  boxes: SelectionBox[],
  mode: AlignMode,
  reference: AlignReference = 'selection'
): Record<string, number> {
  if (boxes.length === 0) return {}

  let refLeft = 0
  let refRight = 100
  if (reference === 'selection') {
    refLeft = Math.min(...boxes.map((b) => b.positionX))
    refRight = Math.max(...boxes.map((b) => b.positionX + b.widthPct))
  }
  const refCenter = (refLeft + refRight) / 2

  const result: Record<string, number> = {}
  for (const box of boxes) {
    const target =
      mode === 'left' ? refLeft
      : mode === 'right' ? refRight - box.widthPct
      : refCenter - box.widthPct / 2
    result[box.id] = clamp(target, 0, Math.max(0, 100 - box.widthPct))
  }
  return result
}

/**
 * 그룹 이동량을 캔버스 밖으로 벗어나지 않도록 제한한다.
 * 개별 요소를 각각 clamp 하면 상대 위치가 무너지므로 이동량 자체를 줄인다.
 */
export function clampGroupDelta(
  boxes: SelectionBox[],
  dxPct: number,
  dyPct: number
): { dxPct: number; dyPct: number } {
  if (boxes.length === 0) return { dxPct: 0, dyPct: 0 }

  const minLeft = Math.min(...boxes.map((b) => b.positionX))
  const minRightSlack = Math.min(...boxes.map((b) => 100 - (b.positionX + b.widthPct)))
  const minTop = Math.min(...boxes.map((b) => b.positionY))
  const minBottomSlack = Math.min(...boxes.map((b) => 100 - (b.positionY + b.heightPct)))

  return {
    dxPct: clamp(dxPct, -Math.max(0, minLeft), Math.max(0, minRightSlack)),
    dyPct: clamp(dyPct, -Math.max(0, minTop), Math.max(0, minBottomSlack)),
  }
}
