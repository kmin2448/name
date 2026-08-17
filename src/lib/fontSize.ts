// 글자 크기 조절 공통 규칙. 개별 항목 편집과 다중 선택 일괄 조절이
// 같은 범위·같은 단위를 쓰도록 한 곳에 모아둔다.

export const FONT_SIZE_MIN = 8
export const FONT_SIZE_MAX = 150

/** 버튼 1회 클릭 시 증감폭 */
export const FONT_SIZE_STEP = 1
/** Shift와 함께 눌렀을 때의 증감폭 */
export const FONT_SIZE_STEP_COARSE = 10

/**
 * 현재 크기를 기준으로 delta만큼 키우거나 줄인다.
 * 항목마다 원래 크기가 달라도 각자의 크기에서 출발하므로 상대적인 크기 차이가 유지된다.
 * (한쪽이 상·하한에 닿으면 그만큼은 좁혀진다.)
 */
export function stepFontSize(current: number, delta: number): number {
  const next = Math.round(current + delta)
  return Math.min(FONT_SIZE_MAX, Math.max(FONT_SIZE_MIN, next))
}
