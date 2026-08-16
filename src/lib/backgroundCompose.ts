import { svgToDataUri } from '@/lib/backgroundPresets'
import { MM_TO_PX } from '@/lib/sizeConstants'
import { TextFieldConfig } from '@/types/nameplate'

// 텍스트 항목이 없을 때 띠가 차지하는 기본 최대 높이 (%)
export const BAND_PCT = 10
// 띠 안쪽과 텍스트 영역 사이에 두는 여백 (렌더링 px 기준)
export const BAND_GAP_PX = 5
// 여백을 빼고도 유지할 최소 띠 높이 (viewBox 단위)
const MIN_BAND_UNITS = 4

// 합성 SVG의 기준 캔버스 (기본 배경과 동일)
const VIEW_W = 1000
const VIEW_H = 400

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

/**
 * 사진을 상·하단 가로 전체 띠에만 배치한 SVG 배경을 만든다.
 * 중앙(텍스트 영역)은 흰색으로 남는다.
 *
 * 띠 높이는 실제 텍스트 항목의 상단·하단 경계를 기준으로 계산해,
 * 위쪽과 아래쪽 모두 텍스트와 배경 사이에 BAND_GAP_PX만큼의
 * 동일한 여백이 생긴다 (텍스트 배치가 비대칭이어도 여백은 대칭).
 *
 * preserveAspectRatio="none"으로 명패 비율에 맞춰 늘어나며,
 * 각 띠 안의 사진은 slice(cover) 방식으로 잘려 채워진다.
 *
 * @param heightMm 현재 명패 높이(mm) — 화면 5px에 해당하는 여백을 환산하는 데 사용
 * @param fields   현재 텍스트 항목 — 상·하단 경계 계산에 사용 (없으면 기본 10% 영역)
 */
export function composeBandedBackground(
  photoDataUrl: string,
  heightMm: number,
  fields: TextFieldConfig[] = []
): string {
  // 렌더링 px → viewBox 단위 환산 (명패 높이 px가 VIEW_H에 대응)
  const gapUnits = (BAND_GAP_PX / (heightMm * MM_TO_PX)) * VIEW_H
  const maxBandUnits = (VIEW_H * BAND_PCT) / 100

  // 텍스트가 차지하는 세로 범위 (%). 항목이 없으면 기본 안전 영역 사용
  const textTopPct = fields.length > 0 ? Math.min(...fields.map((f) => f.positionY)) : BAND_PCT
  const textBottomPct =
    fields.length > 0 ? Math.max(...fields.map((f) => f.positionY + f.heightPct)) : 100 - BAND_PCT

  const topBandH = clamp((textTopPct / 100) * VIEW_H - gapUnits, MIN_BAND_UNITS, maxBandUnits)
  const bottomBandH = clamp(
    ((100 - textBottomPct) / 100) * VIEW_H - gapUnits,
    MIN_BAND_UNITS,
    maxBandUnits
  )
  const bottomY = VIEW_H - bottomBandH

  const image = (y: number, h: number) =>
    `<image href="${photoDataUrl}" xlink:href="${photoDataUrl}" x="0" y="${y}" width="${VIEW_W}" height="${h}" preserveAspectRatio="xMidYMid slice"/>`

  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"`,
    ` width="${VIEW_W}" height="${VIEW_H}" viewBox="0 0 ${VIEW_W} ${VIEW_H}" preserveAspectRatio="none">`,
    `<rect width="${VIEW_W}" height="${VIEW_H}" fill="#ffffff"/>`,
    image(0, topBandH),
    image(bottomY, bottomBandH),
    `</svg>`,
  ].join('')

  return svgToDataUri(svg)
}
