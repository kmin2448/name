import {
  DEFAULT_CANVAS_VIEW,
  MAX_ZOOM,
  MIN_ZOOM,
  loadCanvasView,
  parseCanvasView,
  saveCanvasView,
} from '@/lib/canvasView'

describe('parseCanvasView', () => {
  it('정상 값을 그대로 읽는다', () => {
    expect(parseCanvasView({ zoom: 2, offsetX: -30, offsetY: 15 })).toEqual({
      zoom: 2,
      offsetX: -30,
      offsetY: 15,
    })
  })

  it('배율은 허용 범위로 제한한다', () => {
    expect(parseCanvasView({ zoom: 99, offsetX: 0, offsetY: 0 })?.zoom).toBe(MAX_ZOOM)
    expect(parseCanvasView({ zoom: 0.01, offsetX: 0, offsetY: 0 })?.zoom).toBe(MIN_ZOOM)
  })

  it('손상된 값은 null을 반환한다', () => {
    expect(parseCanvasView(null)).toBeNull()
    expect(parseCanvasView({ zoom: 'x', offsetX: 0, offsetY: 0 })).toBeNull()
    expect(parseCanvasView({ zoom: NaN, offsetX: 0, offsetY: 0 })).toBeNull()
    expect(parseCanvasView({ zoom: 1.5 })).toBeNull()
  })
})

describe('loadCanvasView / saveCanvasView', () => {
  beforeEach(() => localStorage.clear())

  it('저장한 배율·위치를 그대로 복원한다', () => {
    saveCanvasView({ zoom: 0.75, offsetX: 12, offsetY: -8 })
    expect(loadCanvasView()).toEqual({ zoom: 0.75, offsetX: 12, offsetY: -8 })
  })

  it('저장된 값이 없으면 null을 반환한다 (호출 측에서 기본 화면 사용)', () => {
    expect(loadCanvasView()).toBeNull()
  })

  it('이전 버전이 저장한 이동 위치는 기본 배율과 함께 이어받는다', () => {
    localStorage.setItem('nameplate_canvas_offset', JSON.stringify({ x: 40, y: 20 }))
    expect(loadCanvasView()).toEqual({ ...DEFAULT_CANVAS_VIEW, offsetX: 40, offsetY: 20 })
  })

  it('깨진 JSON이 저장돼 있어도 예외를 던지지 않는다', () => {
    localStorage.setItem('nameplate_canvas_view', '{oops')
    expect(loadCanvasView()).toBeNull()
  })
})

describe('DEFAULT_CANVAS_VIEW', () => {
  it('접속 직후 기본 화면은 150% 배율에 이동 없음', () => {
    expect(DEFAULT_CANVAS_VIEW).toEqual({ zoom: 1.5, offsetX: 0, offsetY: 0 })
  })
})
