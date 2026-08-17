// 화면 오른쪽에서 밀려 나오는 패널들의 열림 규칙.
// 폭도 겹치는 위치도 서로 달라 두 개가 동시에 열리면 화면이 어긋나므로,
// 한 번에 하나만 열리도록 상태를 한 곳에서 관리한다.

export type RightPanel = 'thumbnail' | 'library' | 'help'

/**
 * 패널 하나의 열기·닫기 요청을 받아 다음 열림 상태를 계산한다.
 * - 열기: 먼저 열려 있던 패널은 자동으로 닫힌다
 * - 닫기: 지금 열려 있는 패널일 때만 닫는다.
 *   (다른 패널이 이미 자리를 넘겨받았다면 뒤늦은 닫기 요청은 무시한다)
 */
export function nextOpenPanel(
  current: RightPanel | null,
  panel: RightPanel,
  open: boolean
): RightPanel | null {
  if (open) return panel
  return current === panel ? null : current
}
