// 썸네일 패널의 페이지(명단 행) 추가·삭제에 쓰이는 순수 로직.
import { TextFieldConfig } from '@/types/nameplate'

type Row = Record<string, string>
type PageOverrides = Record<number, Record<string, TextFieldConfig>>

/**
 * 모든 페이지가 같은 값을 갖는 항목을 찾는다 (예: 프로그램명).
 * 페이지가 1개뿐이면 어떤 값이 공통인지(프로그램명) 사람마다 다른지(이름)
 * 구분할 근거가 없으므로 아무것도 공통으로 보지 않는다.
 */
export function commonRowValues(rows: Row[]): Row {
  if (rows.length < 2) return {}

  const keys = Array.from(new Set(rows.flatMap((row) => Object.keys(row))))
  const common: Row = {}
  keys.forEach((key) => {
    const first = rows[0][key] ?? ''
    if (!first.trim()) return
    if (rows.every((row) => (row[key] ?? '').trim() === first.trim())) {
      common[key] = first
    }
  })
  return common
}

/**
 * 새 페이지의 초기 데이터를 만든다.
 * 공통 항목은 자동으로 채우고 나머지 항목은 빈 값으로 둔다.
 */
export function createPageRow(rows: Row[], fieldLabels: string[]): Row {
  const common = commonRowValues(rows)
  const row: Row = {}
  fieldLabels.forEach((label) => {
    row[label] = common[label] ?? ''
  })
  // 텍스트 항목으로 등록되지 않은 엑셀 열도 공통 값이면 유지한다
  Object.entries(common).forEach(([key, value]) => {
    if (!(key in row)) row[key] = value
  })
  return row
}

/**
 * 페이지 삭제에 맞춰 페이지별 서식(pageFieldOverrides)의 인덱스를 당긴다.
 * 삭제된 페이지의 서식은 버리고, 뒤쪽 페이지 서식은 한 칸씩 앞으로 옮긴다.
 */
export function removePageOverrides(overrides: PageOverrides, removedIndex: number): PageOverrides {
  const next: PageOverrides = {}
  Object.entries(overrides).forEach(([key, value]) => {
    const index = Number(key)
    if (index === removedIndex) return
    next[index > removedIndex ? index - 1 : index] = value
  })
  return next
}

/** 페이지 삭제 후 선택된 페이지 인덱스를 보정한다 (newLength = 삭제 후 페이지 수) */
export function nextSelectedIndex(current: number, removedIndex: number, newLength: number): number {
  if (newLength <= 0) return -1
  if (current > removedIndex) return current - 1
  if (current === removedIndex) return Math.min(current, newLength - 1)
  return current
}
