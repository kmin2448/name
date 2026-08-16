import {
  BACKGROUND_PRESETS,
  isPresetBackground,
  getBackgroundSize,
  getBackgroundImageCss,
} from '@/lib/backgroundPresets'

const VIEWBOX_W = 1000
const VIEWBOX_H = 400
// 상·하단 각 10% 안쪽에만 장식이 놓여야 중앙 텍스트(프로그램명·소속·이름·직책)와 겹치지 않는다.
const SAFE_TOP = VIEWBOX_H * 0.1   // 40
const SAFE_BOTTOM = VIEWBOX_H * 0.9 // 360

function decode(src: string): string {
  return decodeURIComponent(src.replace(/^data:image\/svg\+xml,/, ''))
}

type Rect = { y: number; height: number; width: number | null }

function parseRects(svg: string): Rect[] {
  const rects = svg.match(/<rect[^>]*\/>/g) ?? []
  return rects.map((tag) => {
    const attr = (name: string): number | null => {
      const m = tag.match(new RegExp(`\\s${name}="([\\d.]+)"`))
      return m ? Number(m[1]) : null
    }
    return { y: attr('y') ?? 0, height: attr('height') ?? 0, width: attr('width') }
  })
}

describe('BACKGROUND_PRESETS', () => {
  it('명패용 기본 배경 5종을 고유한 id/이름으로 제공한다', () => {
    expect(BACKGROUND_PRESETS).toHaveLength(5)
    expect(new Set(BACKGROUND_PRESETS.map((p) => p.id)).size).toBe(5)
    expect(new Set(BACKGROUND_PRESETS.map((p) => p.name)).size).toBe(5)
    expect(new Set(BACKGROUND_PRESETS.map((p) => p.src)).size).toBe(5)
  })

  it.each(BACKGROUND_PRESETS)('$name: 명패 비율에 맞춰 늘어나는 SVG data URI다', (preset) => {
    expect(preset.src.startsWith('data:image/svg+xml,')).toBe(true)
    const svg = decode(preset.src)
    expect(svg).toContain(`viewBox="0 0 ${VIEWBOX_W} ${VIEWBOX_H}"`)
    // 명패 규격마다 가로:세로 비율이 달라도 띠가 잘리지 않도록 자유 변형을 허용한다
    expect(svg).toContain('preserveAspectRatio="none"')
    expect(svg).toContain(`width="${VIEWBOX_W}" height="${VIEWBOX_H}"`)
  })

  it.each(BACKGROUND_PRESETS)('$name: 장식이 가로 전체를 채우고 상·하단에만 놓인다', (preset) => {
    const rects = parseRects(decode(preset.src))
    // 흰색 바탕 1개 + 장식 최소 2개
    expect(rects.length).toBeGreaterThanOrEqual(3)

    const base = rects.filter((r) => r.height === VIEWBOX_H)
    expect(base).toHaveLength(1)

    const decorations = rects.filter((r) => r.height !== VIEWBOX_H)
    expect(decorations.length).toBeGreaterThanOrEqual(2)

    for (const rect of decorations) {
      // 너비를 지정하지 않은 장식은 없어야 한다 (가로 꽉 참)
      expect(rect.width).toBe(VIEWBOX_W)
      const isTopBand = rect.y + rect.height <= SAFE_TOP
      const isBottomBand = rect.y >= SAFE_BOTTOM
      expect(isTopBand || isBottomBand).toBe(true)
    }

    // 상단과 하단 모두에 장식이 있어야 한다
    expect(decorations.some((r) => r.y + r.height <= SAFE_TOP)).toBe(true)
    expect(decorations.some((r) => r.y >= SAFE_BOTTOM)).toBe(true)
  })

  it.each(BACKGROUND_PRESETS)('$name: CSS/HTML에 그대로 넣어도 깨지지 않게 인코딩된다', (preset) => {
    // url(...) · style="..." · cssText의 ; 구분자를 깨뜨리는 문자가 없어야 한다
    expect(preset.src).not.toMatch(/[()'"<>; ]/)
  })
})

describe('isPresetBackground', () => {
  it('기본 제공 배경을 식별한다', () => {
    for (const preset of BACKGROUND_PRESETS) {
      expect(isPresetBackground(preset.src)).toBe(true)
    }
  })

  it('업로드 이미지와 빈 배경은 기본 배경이 아니다', () => {
    expect(isPresetBackground(null)).toBe(false)
    expect(isPresetBackground('data:image/png;base64,abc')).toBe(false)
    expect(isPresetBackground('blob:http://localhost/1234')).toBe(false)
    // 형식만 같고 내용이 다른 SVG는 기본 배경이 아니다
    expect(isPresetBackground('data:image/svg+xml,%3Csvg%3E%3C/svg%3E')).toBe(false)
  })
})

describe('getBackgroundSize', () => {
  it('기본 배경은 명패 크기에 맞춰 늘리고, 업로드 이미지는 채우기(cover)로 배치한다', () => {
    expect(getBackgroundSize(BACKGROUND_PRESETS[0].src)).toBe('100% 100%')
    expect(getBackgroundSize('data:image/png;base64,abc')).toBe('cover')
    expect(getBackgroundSize(null)).toBe('cover')
  })
})

describe('getBackgroundImageCss', () => {
  it('배경이 있으면 따옴표로 감싼 url()을, 없으면 undefined를 돌려준다', () => {
    expect(getBackgroundImageCss('data:image/png;base64,abc')).toBe("url('data:image/png;base64,abc')")
    expect(getBackgroundImageCss(null)).toBeUndefined()
  })
})
