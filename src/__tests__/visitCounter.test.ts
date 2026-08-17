import { formatVisitCount, isVisitCounts, parseVisitCounts } from '@/lib/visitCounter'

describe('parseVisitCounts', () => {
  it('PostgREST가 돌려주는 행 배열에서 첫 행을 읽는다', () => {
    expect(parseVisitCounts([{ today_count: 3, total_count: 42 }])).toEqual({ today: 3, total: 42 })
  })

  it('bigint가 문자열로 와도 숫자로 변환한다', () => {
    expect(parseVisitCounts([{ today_count: '3', total_count: '1200' }])).toEqual({
      today: 3,
      total: 1200,
    })
  })

  it('배열이 아닌 단일 객체도 허용한다', () => {
    expect(parseVisitCounts({ today_count: 0, total_count: 0 })).toEqual({ today: 0, total: 0 })
  })

  it('빈 결과나 형식이 다른 응답은 null을 반환한다', () => {
    expect(parseVisitCounts([])).toBeNull()
    expect(parseVisitCounts(null)).toBeNull()
    expect(parseVisitCounts([{ today_count: 1 }])).toBeNull()
    expect(parseVisitCounts([{ today_count: 'abc', total_count: 5 }])).toBeNull()
    expect(parseVisitCounts([{ today_count: -1, total_count: 5 }])).toBeNull()
  })
})

describe('isVisitCounts', () => {
  it('오늘/전체 값이 모두 있는 응답만 통과시킨다', () => {
    expect(isVisitCounts({ today: 1, total: 2 })).toBe(true)
    expect(isVisitCounts({ today: 1 })).toBe(false)
    expect(isVisitCounts({ error: '실패' })).toBe(false)
    expect(isVisitCounts(undefined)).toBe(false)
  })
})

describe('formatVisitCount', () => {
  it('천 단위 구분 기호를 넣는다', () => {
    expect(formatVisitCount(1234)).toBe('1,234')
    expect(formatVisitCount(0)).toBe('0')
  })
})
