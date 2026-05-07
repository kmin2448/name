import { NAMEPLATE_SIZES, DEFAULT_SIZE, DEFAULT_FIELDS, MM_TO_PX } from '@/lib/sizeConstants'

describe('sizeConstants', () => {
  it('MM_TO_PX converts 1mm to ~3.78px', () => {
    expect(MM_TO_PX).toBeCloseTo(3.7795, 3)
  })

  it('NAMEPLATE_SIZES has 4 entries including custom', () => {
    expect(NAMEPLATE_SIZES).toHaveLength(4)
    const custom = NAMEPLATE_SIZES.find((s) => s.isCustom)
    expect(custom).toBeDefined()
  })

  it('DEFAULT_SIZE is B형 (중)', () => {
    expect(DEFAULT_SIZE.widthMm).toBe(210)
    expect(DEFAULT_SIZE.heightMm).toBe(70)
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
