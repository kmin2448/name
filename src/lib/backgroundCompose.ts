import { svgToDataUri } from '@/lib/backgroundPresets'

// 상·하단 띠 높이 (%). 텍스트 항목이 놓이는 중앙 영역을 침범하지 않는 안전 범위.
export const BAND_PCT = 10

// 합성 SVG의 기준 캔버스 (기본 배경과 동일)
const VIEW_W = 1000
const VIEW_H = 400

/**
 * 사진을 상·하단 가로 전체 띠에만 배치한 SVG 배경을 만든다.
 * 중앙(텍스트 영역)은 흰색으로 남아 글씨와 간섭하지 않는다.
 * preserveAspectRatio="none"으로 명패 비율에 맞춰 늘어나며,
 * 각 띠 안의 사진은 slice(cover) 방식으로 잘려 채워진다.
 */
export function composeBandedBackground(photoDataUrl: string): string {
  const bandH = (VIEW_H * BAND_PCT) / 100
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
