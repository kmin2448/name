import {
  normalizeRect,
  boxesInRect,
  alignBoxes,
  clampGroupDelta,
  SelectionBox,
} from '@/lib/selection'

function box(id: string, x: number, y: number, w: number, h: number): SelectionBox {
  return { id, positionX: x, positionY: y, widthPct: w, heightPct: h }
}

describe('normalizeRect', () => {
  it('오른쪽 아래로 드래그한 경우 그대로 사각형이 된다', () => {
    expect(normalizeRect(10, 20, 40, 50)).toEqual({ x: 10, y: 20, width: 30, height: 30 })
  })

  it('왼쪽 위로 역방향 드래그해도 좌상단 기준으로 정규화된다', () => {
    expect(normalizeRect(40, 50, 10, 20)).toEqual({ x: 10, y: 20, width: 30, height: 30 })
  })
})

describe('boxesInRect', () => {
  const boxes = [
    box('a', 10, 10, 20, 10), // 10~30, 10~20
    box('b', 50, 10, 20, 10), // 50~70, 10~20
    box('c', 10, 60, 20, 10), // 10~30, 60~70
  ]

  it('영역에 완전히 포함된 요소를 선택한다', () => {
    expect(boxesInRect(boxes, { x: 0, y: 0, width: 40, height: 30 })).toEqual(['a'])
  })

  it('일부만 겹쳐도 선택한다', () => {
    expect(boxesInRect(boxes, { x: 25, y: 15, width: 30, height: 3 })).toEqual(['a', 'b'])
  })

  it('겹치지 않으면 선택하지 않는다', () => {
    expect(boxesInRect(boxes, { x: 80, y: 80, width: 10, height: 10 })).toEqual([])
  })

  it('경계가 맞닿기만 한 경우는 선택하지 않는다', () => {
    // a의 오른쪽 끝(30)에서 시작하는 영역
    expect(boxesInRect(boxes, { x: 30, y: 10, width: 10, height: 10 })).toEqual([])
  })

  it('전체를 덮으면 모두 선택한다', () => {
    expect(boxesInRect(boxes, { x: 0, y: 0, width: 100, height: 100 })).toEqual(['a', 'b', 'c'])
  })
})

describe('alignBoxes — 선택 영역 기준', () => {
  const boxes = [
    box('a', 10, 10, 30, 10), // 10~40
    box('b', 20, 30, 50, 10), // 20~70
  ]

  it('왼쪽 끝 정렬은 가장 왼쪽 요소의 X에 맞춘다', () => {
    expect(alignBoxes(boxes, 'left')).toEqual({ a: 10, b: 10 })
  })

  it('오른쪽 끝 정렬은 가장 오른쪽 끝(70)에 오른쪽 변을 맞춘다', () => {
    expect(alignBoxes(boxes, 'right')).toEqual({ a: 40, b: 20 })
  })

  it('가운데 정렬은 선택 영역 중앙(40)에 각 요소의 중심을 맞춘다', () => {
    const result = alignBoxes(boxes, 'center')
    expect(result.a).toBeCloseTo(25, 10) // 40 - 30/2
    expect(result.b).toBeCloseTo(15, 10) // 40 - 50/2
  })

  it('정렬 후에도 각 요소의 Y와 크기는 변하지 않는다 (X만 반환)', () => {
    expect(Object.keys(alignBoxes(boxes, 'left')).sort()).toEqual(['a', 'b'])
  })
})

describe('alignBoxes — 명패 전체 기준', () => {
  const boxes = [box('a', 10, 10, 30, 10), box('b', 20, 30, 50, 10)]

  it('왼쪽 끝은 0, 오른쪽 끝은 100에 맞춘다', () => {
    expect(alignBoxes(boxes, 'left', 'canvas')).toEqual({ a: 0, b: 0 })
    expect(alignBoxes(boxes, 'right', 'canvas')).toEqual({ a: 70, b: 50 })
  })

  it('가운데 정렬은 명패 중앙(50)에 맞춘다', () => {
    const result = alignBoxes(boxes, 'center', 'canvas')
    expect(result.a).toBeCloseTo(35, 10)
    expect(result.b).toBeCloseTo(25, 10)
  })
})

describe('alignBoxes — 경계 처리', () => {
  it('캔버스를 벗어나지 않도록 0~(100-너비)로 제한한다', () => {
    const wide = [box('wide', 5, 0, 120, 10)]
    expect(alignBoxes(wide, 'right', 'canvas').wide).toBe(0)
  })

  it('빈 선택은 빈 결과를 반환한다', () => {
    expect(alignBoxes([], 'center')).toEqual({})
  })
})

describe('clampGroupDelta', () => {
  const boxes = [box('a', 10, 10, 20, 10), box('b', 60, 40, 30, 20)]

  it('여유가 충분하면 요청한 이동량을 그대로 돌려준다', () => {
    expect(clampGroupDelta(boxes, 5, 5)).toEqual({ dxPct: 5, dyPct: 5 })
  })

  it('오른쪽 이동은 가장 오른쪽 요소의 남은 여백(10)까지만 허용한다', () => {
    expect(clampGroupDelta(boxes, 40, 0).dxPct).toBe(10)
  })

  it('왼쪽 이동은 가장 왼쪽 요소의 X(10)까지만 허용한다', () => {
    expect(clampGroupDelta(boxes, -40, 0).dxPct).toBe(-10)
  })

  it('아래 이동은 가장 아래 요소의 남은 여백(40)까지만 허용한다', () => {
    expect(clampGroupDelta(boxes, 0, 90).dyPct).toBe(40)
  })

  it('제한이 걸려도 상대 위치는 유지된다 (동일 delta 적용)', () => {
    const { dxPct } = clampGroupDelta(boxes, 40, 0)
    const moved = boxes.map((b) => b.positionX + dxPct)
    expect(moved[1] - moved[0]).toBe(boxes[1].positionX - boxes[0].positionX)
    expect(Math.max(...boxes.map((b, i) => moved[i] + b.widthPct))).toBeLessThanOrEqual(100)
  })

  it('빈 선택은 이동량 0을 반환한다', () => {
    expect(clampGroupDelta([], 10, 10)).toEqual({ dxPct: 0, dyPct: 0 })
  })
})
