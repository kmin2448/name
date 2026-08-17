import {
  MAX_ROSTERS,
  buildRosterTitle,
  canSaveRoster,
  exceedsCellLimit,
  extractRosterPayload,
  findProgramName,
  mergeRestoredState,
  parseRosterPayload,
  rowToSummary,
  toSheetRow,
} from '@/lib/rosters'
import { ROSTER_COLUMN, rosterRange } from '@/constants/sheets'
import { initialState } from '@/hooks/useNameplateState'
import { NameplateState, OverlayImage, TextFieldConfig } from '@/types/nameplate'

function field(id: string, label: string): TextFieldConfig {
  return {
    id,
    label,
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

function overlay(id: string): OverlayImage {
  return {
    id,
    src: 'data:image/png;base64,AAAA',
    name: 'logo',
    positionX: 0,
    positionY: 0,
    widthPct: 20,
    heightPct: 20,
    condition: { type: 'all' },
    cropX: 0,
    cropY: 0,
    cropW: 100,
    cropH: 100,
  }
}

const FIELDS = [field('f-prog', '프로그램명'), field('f-name', '이름')]
const ROWS = [
  { 프로그램명: '2026 봄 세미나', 이름: '홍길동' },
  { 프로그램명: '2026 봄 세미나', 이름: '김철수' },
]

const STATE: NameplateState = {
  ...initialState,
  fields: FIELDS,
  layers: ['img-1', 'f-prog', 'f-name'],
  overlayImages: [overlay('img-1')],
  backgroundImage: 'data:image/png;base64,BBBB',
  excelRows: ROWS,
}

describe('extractRosterPayload', () => {
  it('명단과 텍스트 서식만 담고 이미지는 제외한다', () => {
    const payload = extractRosterPayload(STATE)

    expect(payload.excelRows).toEqual(ROWS)
    expect(payload.fields).toEqual(FIELDS)
    expect(payload.layers).toEqual(['f-prog', 'f-name'])
    expect(Object.keys(payload)).not.toContain('backgroundImage')
    expect(Object.keys(payload)).not.toContain('overlayImages')
  })
})

describe('findProgramName', () => {
  it('프로그램명 항목의 값을 찾는다', () => {
    expect(findProgramName(ROWS, FIELDS)).toBe('2026 봄 세미나')
  })

  it('값이 빈 행은 건너뛰고 채워진 값을 쓴다', () => {
    const rows = [{ 프로그램명: '', 이름: '홍길동' }, { 프로그램명: '가을 워크숍', 이름: '김철수' }]
    expect(findProgramName(rows, FIELDS)).toBe('가을 워크숍')
  })

  it('프로그램명 항목이 없으면 빈 문자열', () => {
    expect(findProgramName(ROWS, [field('f-name', '이름')])).toBe('')
  })
})

describe('buildRosterTitle', () => {
  const savedAt = new Date(2026, 7, 17) // 2026-08-17

  it('입력한 건명을 그대로 쓴다', () => {
    expect(buildRosterTitle('  8월 정기회의  ', '2026 봄 세미나', savedAt)).toBe('8월 정기회의')
  })

  it('입력이 없으면 프로그램명과 날짜로 만든다', () => {
    expect(buildRosterTitle('', '2026 봄 세미나', savedAt)).toBe('2026 봄 세미나 (2026-08-17)')
  })

  it('프로그램명도 없으면 기본 이름과 날짜를 쓴다', () => {
    expect(buildRosterTitle('', '', savedAt)).toBe('명패 (2026-08-17)')
  })
})

describe('canSaveRoster', () => {
  it(`${MAX_ROSTERS}건 미만이면 새로 저장할 수 있다`, () => {
    expect(canSaveRoster(MAX_ROSTERS - 1, false)).toBe(true)
  })

  it(`${MAX_ROSTERS}건이 차면 새로 저장할 수 없다`, () => {
    expect(canSaveRoster(MAX_ROSTERS, false)).toBe(false)
  })

  it('덮어쓰기는 건수가 늘지 않으므로 가득 차도 허용한다', () => {
    expect(canSaveRoster(MAX_ROSTERS, true)).toBe(true)
  })
})

describe('parseRosterPayload', () => {
  it('저장한 값을 그대로 읽는다', () => {
    const payload = extractRosterPayload(STATE)
    expect(parseRosterPayload(JSON.stringify(payload))).toEqual(payload)
  })

  it('형식이 깨진 값은 null을 반환한다', () => {
    expect(parseRosterPayload('{oops')).toBeNull()
    expect(parseRosterPayload('null')).toBeNull()
    expect(parseRosterPayload(JSON.stringify({ size: {}, fields: [], excelRows: [] }))).toBeNull()
    expect(
      parseRosterPayload(JSON.stringify({ size: { widthMm: 1, heightMm: 1 }, fields: 'x', excelRows: [] }))
    ).toBeNull()
  })

  it('빠진 선택 항목은 기본값으로 채운다', () => {
    const parsed = parseRosterPayload(
      JSON.stringify({ size: { label: '중', widthMm: 210, heightMm: 70 }, fields: FIELDS, excelRows: ROWS })
    )
    expect(parsed?.layers).toEqual(['f-prog', 'f-name'])
    expect(parsed?.pageFieldOverrides).toEqual({})
    expect(parsed?.showBorder).toBe(true)
  })
})

describe('mergeRestoredState', () => {
  it('명단·서식은 불러온 값으로 바꾸고 현재 이미지는 유지한다', () => {
    const payload = parseRosterPayload(
      JSON.stringify({
        size: { label: '소 150×60mm', widthMm: 150, heightMm: 60 },
        fields: [field('f-name', '이름')],
        layers: ['f-name'],
        excelRows: [{ 이름: '박영희' }],
        showBorder: false,
      })
    )!
    const merged = mergeRestoredState(STATE, payload)

    expect(merged.size.widthMm).toBe(150)
    expect(merged.excelRows).toEqual([{ 이름: '박영희' }])
    expect(merged.showBorder).toBe(false)
    expect(merged.previewData).toEqual({ 이름: '박영희' })
    // 저장되지 않은 이미지는 그대로 남는다
    expect(merged.backgroundImage).toBe(STATE.backgroundImage)
    expect(merged.overlayImages).toEqual(STATE.overlayImages)
    // 이미지가 아래, 텍스트가 위
    expect(merged.layers).toEqual(['img-1', 'f-name'])
  })

  it('레이어 목록에 빠진 항목도 빠뜨리지 않는다', () => {
    const payload = parseRosterPayload(
      JSON.stringify({
        size: { label: '중', widthMm: 210, heightMm: 70 },
        fields: FIELDS,
        layers: ['f-name'], // f-prog 누락
        excelRows: ROWS,
      })
    )!
    expect(mergeRestoredState(STATE, payload).layers).toEqual(['img-1', 'f-name', 'f-prog'])
  })
})

describe('시트 행 변환', () => {
  it('저장 행과 요약이 왕복 변환된다', () => {
    const payload = extractRosterPayload(STATE)
    const summary = {
      title: '2026 봄 세미나 (2026-08-17)',
      programName: '2026 봄 세미나',
      pageCount: 2,
      savedAt: '2026-08-17T01:00:00.000Z',
    }
    const row = toSheetRow('id-1', 'user@example.com', summary, payload)

    expect(row[ROSTER_COLUMN.userEmail]).toBe('user@example.com')
    expect(rowToSummary(row)).toEqual({ id: 'id-1', ...summary })
    expect(parseRosterPayload(row[ROSTER_COLUMN.payload])).toEqual(payload)
  })

  it('id가 없는 행은 건너뛴다', () => {
    expect(rowToSummary([])).toBeNull()
    expect(rowToSummary(['   '])).toBeNull()
  })
})

describe('exceedsCellLimit', () => {
  it('일반적인 명단은 셀 한도를 넘지 않는다', () => {
    expect(exceedsCellLimit(extractRosterPayload(STATE))).toBe(false)
  })

  it('명단이 지나치게 크면 한도 초과로 본다', () => {
    const huge = {
      ...extractRosterPayload(STATE),
      excelRows: Array.from({ length: 2000 }, (_, i) => ({ 이름: `사람${i}`, 소속: '가'.repeat(20) })),
    }
    expect(exceedsCellLimit(huge)).toBe(true)
  })
})

describe('rosterRange', () => {
  it('탭 이름을 작은따옴표로 감싼다', () => {
    expect(rosterRange('시트1')).toBe("'시트1'!A:G")
  })

  it('이름에 든 작은따옴표를 이스케이프한다', () => {
    expect(rosterRange("Bob's 시트", 'A1:G1')).toBe("'Bob''s 시트'!A1:G1")
  })
})
