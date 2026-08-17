import {
  stepFontSize,
  FONT_SIZE_MIN,
  FONT_SIZE_MAX,
  FONT_SIZE_STEP,
  FONT_SIZE_STEP_COARSE,
} from '@/lib/fontSize'

describe('stepFontSize', () => {
  it('현재 크기를 기준으로 키우고 줄인다', () => {
    expect(stepFontSize(24, FONT_SIZE_STEP)).toBe(25)
    expect(stepFontSize(24, -FONT_SIZE_STEP)).toBe(23)
    expect(stepFontSize(24, FONT_SIZE_STEP_COARSE)).toBe(34)
    expect(stepFontSize(24, -FONT_SIZE_STEP_COARSE)).toBe(14)
  })

  it('크기가 서로 다른 항목들도 각자의 크기에서 출발해 차이가 유지된다', () => {
    const before = [62, 24, 40]
    const after = before.map((v) => stepFontSize(v, FONT_SIZE_STEP_COARSE))
    expect(after).toEqual([72, 34, 50])
    // 항목 간 크기 차이가 그대로 보존된다
    expect(after[0] - after[1]).toBe(before[0] - before[1])
    expect(after[2] - after[1]).toBe(before[2] - before[1])
  })

  it('상·하한을 넘지 않는다', () => {
    expect(stepFontSize(FONT_SIZE_MAX, FONT_SIZE_STEP_COARSE)).toBe(FONT_SIZE_MAX)
    expect(stepFontSize(FONT_SIZE_MIN, -FONT_SIZE_STEP_COARSE)).toBe(FONT_SIZE_MIN)
    expect(stepFontSize(145, FONT_SIZE_STEP_COARSE)).toBe(FONT_SIZE_MAX)
    expect(stepFontSize(10, -FONT_SIZE_STEP_COARSE)).toBe(FONT_SIZE_MIN)
  })

  it('소수 크기는 정수로 정리한다', () => {
    expect(stepFontSize(23.4, FONT_SIZE_STEP)).toBe(24)
    expect(Number.isInteger(stepFontSize(23.6, 0))).toBe(true)
  })

  it('증감폭이 0이면 (상·하한 범위 안에서는) 크기가 그대로다', () => {
    expect(stepFontSize(24, 0)).toBe(24)
  })
})
