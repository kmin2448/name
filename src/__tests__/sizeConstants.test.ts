import { NAMEPLATE_SIZES, DEFAULT_SIZE, DEFAULT_FIELDS, MM_TO_PX } from '@/lib/sizeConstants'

describe('sizeConstants', () => {
  it('MM_TO_PX converts 1mm to ~3.78px', () => {
    expect(MM_TO_PX).toBeCloseTo(3.7795, 3)
  })

  it('NAMEPLATE_SIZES has 5 entries with exactly one custom option', () => {
    expect(NAMEPLATE_SIZES).toHaveLength(5)
    const customs = NAMEPLATE_SIZES.filter((s) => s.isCustom)
    expect(customs).toHaveLength(1)
    expect(customs[0].label).toBe('사용자 지정')
  })

  it('every size has positive dimensions and a unique label', () => {
    NAMEPLATE_SIZES.forEach((s) => {
      expect(s.widthMm).toBeGreaterThan(0)
      expect(s.heightMm).toBeGreaterThan(0)
    })
    expect(new Set(NAMEPLATE_SIZES.map((s) => s.label)).size).toBe(NAMEPLATE_SIZES.length)
  })

  it('DEFAULT_SIZE is 기타 200×82mm and comes from the size list', () => {
    expect(DEFAULT_SIZE.widthMm).toBe(200)
    expect(DEFAULT_SIZE.heightMm).toBe(82)
    expect(NAMEPLATE_SIZES).toContain(DEFAULT_SIZE)
  })

  it('DEFAULT_FIELDS has 4 items with required properties', () => {
    expect(DEFAULT_FIELDS).toHaveLength(4)
    DEFAULT_FIELDS.forEach((field) => {
      expect(field.id).toBeTruthy()
      expect(field.label).toBeTruthy()
      expect(field.positionX).toBeGreaterThanOrEqual(0)
      expect(field.positionX).toBeLessThanOrEqual(100)
    })
  })
})
