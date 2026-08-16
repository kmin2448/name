import { svgToDataUri } from '@/lib/backgroundPresets'
import { MM_TO_PX } from '@/lib/sizeConstants'

// 상·하단 띠가 차지할 수 있는 최대 높이 (%). 텍스트 안전 영역의 경계.
export const BAND_PCT = 10
// 띠 안쪽과 텍스트 영역 사이에 두는 여백 (렌더링 px 기준)
export const BAND_GAP_PX = 5
// 여백을 빼고도 유지할 최소 띠 높이 (viewBox 단위)
const MIN_BAND_UNITS = 4

// 합성 SVG의 기준 캔버스 (기본 배경과 동일)
const VIEW_W = 1000
const VIEW_H = 400

/**
 * 사진을 상·하단 가로 전체 띠에만 배치한 SVG 배경을 만든다.
 * 중앙(텍스트 영역)은 흰색으로 남고, 띠 안쪽에는 BAND_GAP_PX만큼의
 * 여백을 두어 배경이 글씨에 바로 붙지 않는다.
 * preserveAspectRatio="none"으로 명패 비율에 맞춰 늘어나며,
 * 각 띠 안의 사진은 slice(cover) 방식으로 잘려 채워진다.
 *
 * @param heightMm 현재 명패 높이(mm) — 화면 5px에 해당하는 여백을 환산하는 데 사용
 */
export function composeBandedBackground(photoDataUrl: string, heightMm: number): string {
  const maxBandH = (VIEW_H * BAND_PCT) / 100
  // 렌더링 px → viewBox 단위 환산 (명패 높이 px가 VIEW_H에 대응)
  const gapUnits = (BAND_GAP_PX / (heightMm * MM_TO_PX)) * VIEW_H
  const bandH = Math.max(MIN_BAND_UNITS, maxBandH - gapUnits)
  const bottomY = VIEW_H - bandH

  const image = (y: number) =>
    `<image href="${photoDataUrl}" xlink:href="${photoDataUrl}" x="0" y="${y}" width="${VIEW_W}" height="${bandH}" preserveAspectRatio="xMidYMid slice"/>`

  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"`,
    ` width="${VIEW_W}" height="${VIEW_H}" viewBox="0 0 ${VIEW_W} ${VIEW_H}" preserveAspectRatio="none">`,
    `<rect width="${VIEW_W}" height="${VIEW_H}" fill="#ffffff"/>`,
    image(0),
    image(bottomY),
    `</svg>`,
  ].join('')

  return svgToDataUri(svg)
}
