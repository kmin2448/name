import { BackgroundPreset } from '@/types/nameplate'

/**
 * SVG 문자열을 data URI로 변환한다.
 * CSS `url('...')` · HTML `style="..."` · cssText의 `;` 구분자 어디에 넣어도 깨지지 않도록
 * 괄호/따옴표를 모두 퍼센트 인코딩하고, MIME 뒤 `;charset` 파라미터도 붙이지 않는다.
 */
export function svgToDataUri(svg: string): string {
  const compact = svg.replace(/\s+/g, ' ').trim()
  const encoded = encodeURIComponent(compact)
    .replace(/\(/g, '%28')
    .replace(/\)/g, '%29')
    .replace(/'/g, '%27')
  return `data:image/svg+xml,${encoded}`
}

// 기준 캔버스 1000×400. 실제 명패 비율(가로:세로 약 2.4~3.0)에 맞춰 늘려 쓰기 위해
// preserveAspectRatio="none"을 지정한다.
// 모든 장식은 가로 전체(width=1000)를 채우면서 상단 10%(y<40) · 하단 10%(y>=360)에만 배치해
// 중앙 텍스트 영역(프로그램명·소속·이름·직책)과 겹치지 않는다.
function frame(body: string): string {
  return [
    '<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="400"',
    ' viewBox="0 0 1000 400" preserveAspectRatio="none">',
    '<rect width="1000" height="400" fill="#ffffff"/>',
    body,
    '</svg>',
  ].join('')
}

export const BACKGROUND_PRESETS: BackgroundPreset[] = [
  {
    id: 'classic-navy',
    name: '클래식 네이비',
    description: '남색 띠 + 금색 라인 · 공식 세미나/회의',
    src: svgToDataUri(
      frame(
        [
          '<rect width="1000" height="18" fill="#1b3a5c"/>',
          '<rect y="24" width="1000" height="4" fill="#c9a227"/>',
          '<rect y="372" width="1000" height="4" fill="#c9a227"/>',
          '<rect y="382" width="1000" height="18" fill="#1b3a5c"/>',
        ].join('')
      )
    ),
  },
  {
    id: 'minimal-line',
    name: '미니멀 라인',
    description: '얇은 이중 실선 · 어떤 서체에도 무난',
    src: svgToDataUri(
      frame(
        [
          '<rect y="12" width="1000" height="3" fill="#475569"/>',
          '<rect y="21" width="1000" height="1.5" fill="#94a3b8"/>',
          '<rect y="377.5" width="1000" height="1.5" fill="#94a3b8"/>',
          '<rect y="385" width="1000" height="3" fill="#475569"/>',
        ].join('')
      )
    ),
  },
  {
    id: 'emerald-gradient',
    name: '에메랄드 그라데이션',
    description: '청록 그라데이션 띠 · 워크숍/발표회',
    src: svgToDataUri(
      frame(
        [
          '<defs>',
          '<linearGradient id="eg" x1="0" y1="0" x2="1" y2="0">',
          '<stop offset="0" stop-color="#0f766e"/>',
          '<stop offset="1" stop-color="#5eead4"/>',
          '</linearGradient>',
          '</defs>',
          '<rect width="1000" height="22" fill="url(#eg)"/>',
          '<rect y="378" width="1000" height="22" fill="url(#eg)"/>',
        ].join('')
      )
    ),
  },
  {
    id: 'wine-gold',
    name: '와인 & 골드',
    description: '자주색 띠 + 금색 이중선 · 시상식/만찬',
    src: svgToDataUri(
      frame(
        [
          '<rect width="1000" height="16" fill="#6b1d2b"/>',
          '<rect y="21" width="1000" height="2" fill="#c9a227"/>',
          '<rect y="27" width="1000" height="1" fill="#c9a227"/>',
          '<rect y="372" width="1000" height="1" fill="#c9a227"/>',
          '<rect y="377" width="1000" height="2" fill="#c9a227"/>',
          '<rect y="384" width="1000" height="16" fill="#6b1d2b"/>',
        ].join('')
      )
    ),
  },
  {
    id: 'soft-sky',
    name: '소프트 스카이',
    description: '하늘색이 흰색으로 사라지는 띠 · 교육/연수',
    src: svgToDataUri(
      frame(
        [
          '<defs>',
          '<linearGradient id="st" x1="0" y1="0" x2="0" y2="1">',
          '<stop offset="0" stop-color="#38bdf8"/>',
          '<stop offset="1" stop-color="#38bdf8" stop-opacity="0"/>',
          '</linearGradient>',
          '<linearGradient id="sb" x1="0" y1="1" x2="0" y2="0">',
          '<stop offset="0" stop-color="#38bdf8"/>',
          '<stop offset="1" stop-color="#38bdf8" stop-opacity="0"/>',
          '</linearGradient>',
          '</defs>',
          '<rect width="1000" height="34" fill="url(#st)"/>',
          '<rect y="366" width="1000" height="34" fill="url(#sb)"/>',
        ].join('')
      )
    ),
  },
]

const PRESET_SRCS = new Set(BACKGROUND_PRESETS.map((p) => p.src))

/** 기본 제공 배경인지 여부 (사용자가 업로드한 이미지와 구분) */
export function isPresetBackground(src: string | null): boolean {
  return src !== null && PRESET_SRCS.has(src)
}

/**
 * SVG 배경(기본 제공 배경·상하단 띠 합성 배경)은 명패 비율에 맞춰 늘려(100% 100%)
 * 상·하단 띠가 잘리지 않게 하고, 일반 이미지는 '채우기(cover)' 방식으로 배치한다.
 */
export function getBackgroundSize(src: string | null): string {
  return src !== null && src.startsWith('data:image/svg+xml') ? '100% 100%' : 'cover'
}

/** CSS background-image 값. 배경이 없으면 undefined */
export function getBackgroundImageCss(src: string | null): string | undefined {
  return src ? `url('${src}')` : undefined
}
