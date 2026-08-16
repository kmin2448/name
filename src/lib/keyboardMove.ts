// 방향키 이동 간격 (mm). 정방향(하단) 명패 기준 방향이며,
// 상단 반전본은 동일 좌표를 180도 회전 렌더링하므로 화면상 자동으로 반대로 움직인다.
export const ARROW_STEP_MM = 1
export const ARROW_STEP_COARSE_MM = 5

export type ArrowDelta = { dxPct: number; dyPct: number }

/**
 * 방향키 입력을 위치 변화량(% 단위)으로 변환한다.
 * 명패 실물 치수(mm) 기준으로 일정하게 움직이도록 %를 역산한다.
 * 방향키가 아니면 null.
 */
export function arrowKeyDelta(
  key: string,
  widthMm: number,
  heightMm: number,
  coarse: boolean
): ArrowDelta | null {
  const mm = coarse ? ARROW_STEP_COARSE_MM : ARROW_STEP_MM
  const dx = (mm / widthMm) * 100
  const dy = (mm / heightMm) * 100
  switch (key) {
    case 'ArrowLeft':
      return { dxPct: -dx, dyPct: 0 }
    case 'ArrowRight':
      return { dxPct: dx, dyPct: 0 }
    case 'ArrowUp':
      return { dxPct: 0, dyPct: -dy }
    case 'ArrowDown':
      return { dxPct: 0, dyPct: dy }
    default:
      return null
  }
}
