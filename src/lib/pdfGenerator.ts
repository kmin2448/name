import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'
import { NameplateState, TextFieldConfig, OverlayImage } from '@/types/nameplate'
import { MM_TO_PX } from '@/lib/sizeConstants'

const A4_W_MM = 210
const A4_H_MM = 297
// Base print scale; multiplied by devicePixelRatio at runtime for HiDPI screens
const BASE_PRINT_SCALE = 3
const MAX_PRINT_SCALE = 5

function getEffectiveFields(state: NameplateState, pageIndex: number): TextFieldConfig[] {
  const overrides = state.pageFieldOverrides[pageIndex]
  if (!overrides) return state.fields
  return state.fields.map((f) => overrides[f.id] ?? f)
}

function overlayMatches(img: OverlayImage, rowData: Record<string, string>): boolean {
  return img.condition.type === 'all' || rowData[img.condition.fieldLabel] === img.condition.fieldValue
}

function buildHalfElement(
  fields: TextFieldConfig[],
  overlayImages: OverlayImage[],
  layers: string[],
  rowData: Record<string, string>,
  state: NameplateState,
  rotate: boolean
): HTMLDivElement {
  const { size, backgroundImage } = state
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
  ].filter(Boolean).join(';')

  const effectiveLayers = layers.length > 0 ? layers : fields.map((f) => f.id)

  effectiveLayers.forEach((id) => {
    const field = fields.find((f) => f.id === id)
    if (field) {
      const justifyContent =
        field.textAlign === 'center' ? 'center' : field.textAlign === 'right' ? 'flex-end' : 'flex-start'

      const box = document.createElement('div')
      // Use overflow:visible so text that slightly exceeds the bounding box
      // (due to font ascender/descender metrics) is not hard-clipped.
      // A small vertical padding provides an additional safety margin.
      box.style.cssText = [
        `position:absolute`,
        `left:${field.positionX}%`,
        `top:${field.positionY}%`,
        `width:${field.widthPct}%`,
        `height:${field.heightPct}%`,
        `display:flex`,
        `align-items:center`,
        `justify-content:${justifyContent}`,
        `overflow:visible`,
        `box-sizing:border-box`,
        `padding:0 2px`,
      ].join(';')

      const text = document.createElement('span')
      text.style.cssText = [
        `font-size:${field.fontSize}px`,
        `font-weight:${field.fontWeight}`,
        `font-family:${field.fontFamily}`,
        `text-align:${field.textAlign}`,
        `color:${field.color}`,
        `white-space:nowrap`,
        // line-height:1 instead of 1.2 minimises the vertical extent
        // of the inline box, reducing clipping risk at box edges.
        `line-height:1`,
        `flex-shrink:0`,
        `display:block`,
      ].join(';')
      text.textContent = rowData[field.label] ?? ''
      box.appendChild(text)
      el.appendChild(box)
      return
    }

    const img = overlayImages.find((o) => o.id === id)
    if (img && overlayMatches(img, rowData)) {
      const { cropX, cropY, cropW, cropH } = img

      const container = document.createElement('div')
      container.style.cssText = [
        `position:absolute`,
        `left:${img.positionX}%`,
        `top:${img.positionY}%`,
        `width:${img.widthPct}%`,
        `height:${img.heightPct}%`,
        `overflow:hidden`,
        `pointer-events:none`,
      ].join(';')

      const imgEl = document.createElement('img')
      imgEl.src = img.src
      imgEl.style.cssText = [
        `position:absolute`,
        `left:${-(cropX / cropW) * 100}%`,
        `top:${-(cropY / cropH) * 100}%`,
        `width:${(100 / cropW) * 100}%`,
        `height:${(100 / cropH) * 100}%`,
        `object-fit:fill`,
        `pointer-events:none`,
      ].join(';')

      container.appendChild(imgEl)
      el.appendChild(container)
    }
  })

  return el
}

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
  const offsetX = (pageW - size.widthMm) / 2
  const offsetY = (pageH - totalHeightMm) / 2

  // Wait for all web fonts to finish loading before capturing.
  // This prevents fallback-font rendering that produces different glyph metrics.
  if (typeof document !== 'undefined' && document.fonts) {
    await document.fonts.ready
  }

  // Use devicePixelRatio so HiDPI screens produce sharper captures.
  const dpr = typeof window !== 'undefined' ? (window.devicePixelRatio ?? 1) : 1
  const printScale = Math.min(MAX_PRINT_SCALE, Math.round(BASE_PRINT_SCALE * dpr))

  const pdf = new jsPDF({ orientation, unit: 'mm', format: 'a4' })

  for (let i = 0; i < rows.length; i++) {
    onProgress?.(i + 1, rows.length)

    const effectiveFields = getEffectiveFields(state, i)

    const wrapper = document.createElement('div')
    wrapper.style.cssText = 'position:absolute;left:-9999px;top:0;display:inline-block;'
    wrapper.appendChild(buildHalfElement(effectiveFields, state.overlayImages, state.layers, rows[i], state, true))
    wrapper.appendChild(buildHalfElement(effectiveFields, state.overlayImages, state.layers, rows[i], state, false))
    document.body.appendChild(wrapper)

    const canvas = await html2canvas(wrapper, {
      scale: printScale,
      useCORS: true,
      logging: false,
      width: size.widthMm * MM_TO_PX,
      height: totalHeightMm * MM_TO_PX,
      x: 0,
      y: 0,
    })
    const imgData = canvas.toDataURL('image/png')

    if (i > 0) pdf.addPage()
    pdf.addImage(imgData, 'PNG', offsetX, offsetY, size.widthMm, totalHeightMm)

    document.body.removeChild(wrapper)
  }

  pdf.save('명패_일괄출력.pdf')
}
