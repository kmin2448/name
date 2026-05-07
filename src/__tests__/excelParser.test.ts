import { normalizeHeader, matchHeaders } from '@/lib/excelParser'

describe('normalizeHeader', () => {
  it('trims whitespace', () => {
    expect(normalizeHeader('  이름  ')).toBe('이름')
  })

  it('lowercases ASCII', () => {
    expect(normalizeHeader('Name')).toBe('name')
  })
})

describe('matchHeaders', () => {
  it('matches exact Korean headers', () => {
    const result = matchHeaders(['이름', '소속', '부서'], ['이름', '소속'])
    expect(result.matched).toEqual(['이름', '소속'])
    expect(result.unmatched).toEqual(['부서'])
  })

  it('matches headers with extra whitespace', () => {
    const result = matchHeaders(['  이름  ', ' 소속'], ['이름', '소속'])
    expect(result.matched).toHaveLength(2)
    expect(result.unmatched).toHaveLength(0)
  })

  it('returns all as unmatched when no overlap', () => {
    const result = matchHeaders(['foo', 'bar'], ['이름', '소속'])
    expect(result.matched).toHaveLength(0)
    expect(result.unmatched).toHaveLength(2)
  })
})
