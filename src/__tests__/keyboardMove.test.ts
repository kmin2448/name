import { arrowKeyDelta, ARROW_STEP_MM, ARROW_STEP_COARSE_MM } from '@/lib/keyboardMove'

// 기본 규격 '기타 200×82mm' 기준
const W = 200
const H = 82

describe('arrowKeyDelta', () => {
  it('방향키 1회당 1mm에 해당하는 %만큼 이동한다', () => {
    expect(arrowKeyDelta('ArrowRight', W, H, false)).toEqual({ dxPct: (ARROW_STEP_MM / W) * 100, dyPct: 0 })
    expect(arrowKeyDelta('ArrowDown', W, H, false)).toEqual({ dxPct: 0, dyPct: (ARROW_STEP_MM / H) * 100 })
  })

  it('왼쪽·위쪽은 음수 방향이다', () => {
    const left = arrowKeyDelta('ArrowLeft', W, H, false)
    const up = arrowKeyDelta('ArrowUp', W, H, false)
    expect(left).toEqual({ dxPct: -(ARROW_STEP_MM / W) * 100, dyPct: 0 })
    expect(up).toEqual({ dxPct: 0, dyPct: -(ARROW_STEP_MM / H) * 100 })
  })

  it('Shift를 누르면 5mm 간격으로 이동한다', () => {
    const coarse = arrowKeyDelta('ArrowRight', W, H, true)
    expect(coarse).toEqual({ dxPct: (ARROW_STEP_COARSE_MM / W) * 100, dyPct: 0 })
    expect(ARROW_STEP_COARSE_MM).toBeGreaterThan(ARROW_STEP_MM)
  })

  it('명패 크기가 달라도 실제 이동 거리는 항상 같은 mm이다', () => {
    // A형(대) 250×90에서의 1mm와 C형(소) 150×60에서의 1mm는 %는 달라도 mm는 같아야 한다
    const big = arrowKeyDelta('ArrowRight', 250, 90, false)
    const small = arrowKeyDelta('ArrowRight', 150, 60, false)
    expect((big!.dxPct / 100) * 250).toBeCloseTo(ARROW_STEP_MM, 10)
    expect((small!.dxPct / 100) * 150).toBeCloseTo(ARROW_STEP_MM, 10)
    expect(big!.dxPct).not.toBe(small!.dxPct)
  })

  it('방향키가 아닌 키는 null을 반환한다', () => {
    expect(arrowKeyDelta('Enter', W, H, false)).toBeNull()
    expect(arrowKeyDelta('a', W, H, false)).toBeNull()
    expect(arrowKeyDelta(' ', W, H, false)).toBeNull()
    expect(arrowKeyDelta('Escape', W, H, true)).toBeNull()
  })
})
