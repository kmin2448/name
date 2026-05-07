import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'
import { NameplateState, TextFieldConfig } from '@/types/nameplate'
import { MM_TO_PX } from '@/lib/sizeConstants'

const A4_W_MM = 210
const A4_H_MM = 297
// scale:3 → 96×3 = 288 DPI 인쇄 품질
const PRINT_SCALE = 3

function getEffectiveFields(state: NameplateState, pageIndex: number): TextFieldConfig[] {
  const overrides = state.pageFieldOverrides[pageIndex]
  if (!overrides) return state.fields
  return state.fields.map((f) => overrides[f.id] ?? f)
}

function buildHalfElement(
  fields: TextFieldConfig[],
  rowData: Record<string, string>,
  state: NameplateState,
  rotate: boolean
): HTMLDivElement {
  const { size, backgroundImage, overlayImages } = state
  const el = document.createElement('div')
  el.style.cssText = [
    `position:relative`,
    `width:${size.widthMm * MM_TO_PX}px`,
    `height:${size.heightMm * MM_TO_PX}px`,
    `overflow:hidden`,
    `background-color:#ffffff`,
    backgroundImage ? `background-image:url(${backgroundImage})` : '',
    `background-size:cover`,
    `background-position:center`,
    rotate ? `transform:rotate(180deg)` : '',
  ]
    .filter(Boolean)
    .join(';')

  overlayImages.forEach((img) => {
    const matches =
      img.condition.type === 'all' ||
      rowData[img.condition.fieldLabel] === img.condition.fieldValue
    if (!matches) return

    const imgEl = document.createElement('img')
    imgEl.src = img.src
    imgEl.style.cssText = [
      `position:absolute`,
      `left:${img.positionX}%`,
      `top:${img.positionY}%`,
      `width:${img.widthPct}%`,
      `height:${img.heightPct}%`,
      `object-fit:contain`,
      `pointer-events:none`,
    ].join(';')
    el.appendChild(imgEl)
  })

  fields.forEach((field: TextFieldConfig) => {
    const justifyContent =
      field.textAlign === 'center' ? 'center' : field.textAlign === 'right' ? 'flex-end' : 'flex-start'

    const box = document.createElement('div')
    box.style.cssText = [
      `position:absolute`,
      `left:${field.positionX}%`,
      `top:${field.positionY}%`,
      `width:${field.widthPct}%`,
      `height:${field.heightPct}%`,
      `display:flex`,
      `align-items:center`,
      `justify-content:${justifyContent}`,
      `overflow:hidden`,
      `box-sizing:border-box`,
    ].join(';')

    const text = document.createElement('span')
    text.style.cssText = [
      `font-size:${field.fontSize}px`,
      `font-weight:${field.fontWeight}`,
      `font-family:${field.fontFamily}`,
      `text-align:${field.textAlign}`,
      `color:${field.color}`,
      `white-space:nowrap`,
      `line-height:1.2`,
      `flex-shrink:0`,
    ].join(';')
    text.textContent = rowData[field.label] ?? ''
    box.appendChild(text)
    el.appendChild(box)
  })

  return el
}

// 명패 크기에 따라 A4 방향 결정
// - widthMm ≤ 210 → 세로(portrait)
// - widthMm > 210 (A형 250mm 등) → 가로(landscape, 297×210)
function getPageLayout(widthMm: number): {
  orientation: 'portrait' | 'landscape'
  pageW: number
  pageH: number
} {
  if (widthMm <= A4_W_MM) {
    return { orientation: 'portrait', pageW: A4_W_MM, pageH: A4_H_MM }
  }
  return { orientation: 'landscape', pageW: A4_H_MM, pageH: A4_W_MM }
}

export async function generatePdf(
  state: NameplateState,
  onProgress?: (current: number, total: number) => void
): Promise<void> {
  const rows = state.excelRows.length > 0 ? state.excelRows : [state.previewData]
  const { size } = state
  const totalHeightMm = size.heightMm * 2

  const { orientation, pageW, pageH } = getPageLayout(size.widthMm)

  // 명패를 A4 중앙에 배치하기 위한 여백
  const offsetX = (pageW - size.widthMm) / 2
  const offsetY = (pageH - totalHeightMm) / 2

  const pdf = new jsPDF({
    orientation,
    unit: 'mm',
    format: 'a4',
  })

  for (let i = 0; i < rows.length; i++) {
    onProgress?.(i + 1, rows.length)

    // 페이지별 필드 오버라이드 반영
    const effectiveFields = getEffectiveFields(state, i)

    const wrapper = document.createElement('div')
    // position:absolute + 음수 left: fixed보다 안정적으로 화면 밖 렌더링
    wrapper.style.cssText = 'position:absolute;left:-9999px;top:0;display:inline-block;'
    wrapper.appendChild(buildHalfElement(effectiveFields, rows[i], state, true))
    wrapper.appendChild(buildHalfElement(effectiveFields, rows[i], state, false))
    document.body.appendChild(wrapper)

    const canvas = await html2canvas(wrapper, {
      scale: PRINT_SCALE,
      useCORS: true,
      logging: false,
      // 명시적 캡처 영역 지정으로 잘림 방지
      width: size.widthMm * MM_TO_PX,
      height: totalHeightMm * MM_TO_PX,
      x: 0,
      y: 0,
    })
    const imgData = canvas.toDataURL('image/png')

    if (i > 0) pdf.addPage()
    // A4 중앙에 실제 명패 크기(mm)로 배치
    pdf.addImage(imgData, 'PNG', offsetX, offsetY, size.widthMm, totalHeightMm)

    document.body.removeChild(wrapper)
  }

  pdf.save('명패_일괄출력.pdf')
}
