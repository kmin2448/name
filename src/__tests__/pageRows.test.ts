import {
  commonRowValues,
  createPageRow,
  nextSelectedIndex,
  removePageOverrides,
} from '@/lib/pageRows'
import { nameplateReducer, initialState } from '@/hooks/useNameplateState'
import { TextFieldConfig } from '@/types/nameplate'

const ROWS = [
  { 프로그램명: '2026 봄 세미나', 소속: '기획팀', 이름: '홍길동', 직책: '팀장' },
  { 프로그램명: '2026 봄 세미나', 소속: '개발팀', 이름: '김철수', 직책: '과장' },
]

function makeField(id: string): TextFieldConfig {
  return {
    id,
    label: '이름',
    fontSize: 14,
    fontWeight: 'normal',
    fontFamily: '맑은 고딕',
    textAlign: 'center',
    positionX: 10,
    positionY: 10,
    widthPct: 80,
    heightPct: 20,
    color: '#000000',
  }
}

describe('commonRowValues', () => {
  it('모든 페이지가 같은 값인 항목만 골라낸다', () => {
    expect(commonRowValues(ROWS)).toEqual({ 프로그램명: '2026 봄 세미나' })
  })

  it('값이 비어 있는 항목은 공통으로 보지 않는다', () => {
    const rows = [
      { 프로그램명: '세미나', 직책: '' },
      { 프로그램명: '세미나', 직책: '' },
    ]
    expect(commonRowValues(rows)).toEqual({ 프로그램명: '세미나' })
  })

  it('페이지가 1개 이하면 공통 값을 추정하지 않는다', () => {
    expect(commonRowValues([ROWS[0]])).toEqual({})
    expect(commonRowValues([])).toEqual({})
  })

  it('일부 페이지에만 있는 열은 공통이 아니다', () => {
    const rows: Record<string, string>[] = [
      { 프로그램명: '세미나', 비고: '채식' },
      { 프로그램명: '세미나' },
    ]
    expect(commonRowValues(rows)).toEqual({ 프로그램명: '세미나' })
  })
})

describe('createPageRow', () => {
  it('공통 항목은 자동 입력하고 나머지 항목은 빈 값으로 만든다', () => {
    expect(createPageRow(ROWS, ['프로그램명', '소속', '이름', '직책'])).toEqual({
      프로그램명: '2026 봄 세미나',
      소속: '',
      이름: '',
      직책: '',
    })
  })

  it('텍스트 항목으로 등록되지 않은 공통 열도 유지한다', () => {
    const rows = [
      { 프로그램명: '세미나', 장소: '대강당' },
      { 프로그램명: '세미나', 장소: '대강당' },
    ]
    expect(createPageRow(rows, ['프로그램명'])).toEqual({ 프로그램명: '세미나', 장소: '대강당' })
  })

  it('첫 페이지를 만들 때는 모든 항목이 빈 값이다', () => {
    expect(createPageRow([], ['이름', '소속'])).toEqual({ 이름: '', 소속: '' })
  })
})

describe('removePageOverrides', () => {
  const overrides = { 0: { a: makeField('a') }, 2: { b: makeField('b') } }

  it('삭제된 페이지의 서식은 버리고 뒤쪽 서식은 한 칸 당긴다', () => {
    expect(removePageOverrides(overrides, 0)).toEqual({ 1: { b: makeField('b') } })
  })

  it('앞쪽 페이지 서식은 그대로 둔다', () => {
    expect(removePageOverrides(overrides, 2)).toEqual({ 0: { a: makeField('a') } })
  })
})

describe('nextSelectedIndex', () => {
  it('삭제된 페이지보다 뒤를 보고 있었으면 한 칸 앞으로 당긴다', () => {
    expect(nextSelectedIndex(3, 1, 4)).toBe(2)
  })

  it('삭제된 페이지를 보고 있었으면 같은 자리를 유지하되 마지막을 넘지 않는다', () => {
    expect(nextSelectedIndex(1, 1, 4)).toBe(1)
    expect(nextSelectedIndex(3, 3, 3)).toBe(2)
  })

  it('삭제된 페이지보다 앞을 보고 있었으면 그대로 둔다', () => {
    expect(nextSelectedIndex(0, 2, 4)).toBe(0)
  })

  it('페이지가 모두 사라지면 선택 없음(-1)이 된다', () => {
    expect(nextSelectedIndex(0, 0, 0)).toBe(-1)
  })
})

describe('nameplateReducer 페이지 추가·삭제', () => {
  const base = { ...initialState, excelRows: ROWS }

  it('ADD_EXCEL_ROW은 페이지별 서식 없이 행을 덧붙인다', () => {
    const newRow = { 프로그램명: '2026 봄 세미나', 소속: '', 이름: '', 직책: '' }
    const next = nameplateReducer(base, { type: 'ADD_EXCEL_ROW', payload: newRow })

    expect(next.excelRows).toHaveLength(3)
    expect(next.excelRows[2]).toEqual(newRow)
    expect(next.pageFieldOverrides[2]).toBeUndefined()
  })

  it('REMOVE_EXCEL_ROW은 행과 함께 페이지별 서식 인덱스도 정리한다', () => {
    const withOverride = { ...base, pageFieldOverrides: { 1: { a: makeField('a') } } }
    const next = nameplateReducer(withOverride, { type: 'REMOVE_EXCEL_ROW', payload: 0 })

    expect(next.excelRows).toEqual([ROWS[1]])
    expect(next.pageFieldOverrides).toEqual({ 0: { a: makeField('a') } })
  })

  it('범위를 벗어난 인덱스는 상태를 바꾸지 않는다', () => {
    expect(nameplateReducer(base, { type: 'REMOVE_EXCEL_ROW', payload: 9 })).toBe(base)
    expect(nameplateReducer(base, { type: 'REMOVE_EXCEL_ROW', payload: -1 })).toBe(base)
  })
})
