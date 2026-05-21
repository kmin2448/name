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

// ─── HTML escaping for preview ──────────────────────────────────────────────

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// ─── HTML-based preview (native browser rendering = pixel-perfect match) ────

function buildFieldHtml(field: TextFieldConfig, rowData: Record<string, string>): string {
  const text = escapeHtml(rowData[field.label] ?? '')
  return [
    `<div style="position:absolute;left:${field.positionX}%;top:${field.positionY}%;`,
    `width:${field.widthPct}%;height:${field.heightPct}%;`,
    `overflow:hidden;box-sizing:border-box;">`,
    `<div style="display:table;width:100%;height:100%;table-layout:fixed;">`,
    `<div style="display:table-cell;vertical-align:middle;">`,
    `<span style="display:block;width:100%;`,
    `font-size:${field.fontSize}px;font-weight:${field.fontWeight};`,
    `font-family:${escapeHtml(field.fontFamily)};text-align:${field.textAlign};`,
    `color:${field.color};white-space:pre-line;line-height:1.2;">`,
    text,
    `</span></div></div></div>`,
  ].join('')
}

function buildOverlayHtml(img: OverlayImage): string {
  const { cropX, cropY, cropW, cropH } = img
  return [
    `<div style="position:absolute;left:${img.positionX}%;top:${img.positionY}%;`,
    `width:${img.widthPct}%;height:${img.heightPct}%;overflow:hidden;">`,
    `<img src="${img.src}" style="position:absolute;`,
    `left:${-(cropX / cropW) * 100}%;top:${-(cropY / cropH) * 100}%;`,
    `width:${(100 / cropW) * 100}%;height:${(100 / cropH) * 100}%;object-fit:fill;" />`,
    `</div>`,
  ].join('')
}

function buildHalfHtml(
  fields: TextFieldConfig[],
  overlayImages: OverlayImage[],
  layers: string[],
  rowData: Record<string, string>,
  state: NameplateState,
  rotate: boolean,
): string {
  const { size, backgroundImage } = state
  const widthPx = size.widthMm * MM_TO_PX
  const heightPx = size.heightMm * MM_TO_PX

  const effectiveLayers = layers.length > 0 ? layers : fields.map((f) => f.id)
  let items = ''

  effectiveLayers.forEach((id) => {
    const field = fields.find((f) => f.id === id)
    if (field) {
      items += buildFieldHtml(field, rowData)
      return
    }
    const img = overlayImages.find((o) => o.id === id)
    if (img && overlayMatches(img, rowData)) {
      items += buildOverlayHtml(img)
    }
  })

  if (state.showBorder) {
    items += `<div style="position:absolute;inset:0;border:1px solid #e0e0e0;box-sizing:border-box;pointer-events:none;"></div>`
  }

  let bgCss = 'background-color:#fff;'
  if (backgroundImage) {
    bgCss += `background-image:url(${backgroundImage});background-size:cover;background-position:center;`
  }

  return `<div style="position:relative;width:${widthPx}px;height:${heightPx}px;overflow:hidden;${bgCss}${rotate ? 'transform:rotate(180deg);' : ''}">${items}</div>`
}

function openPreview(state: NameplateState): void {
  const rows = state.excelRows.length > 0 ? state.excelRows : [state.previewData]
  const { size } = state
  const totalHeightMm = size.heightMm * 2
  const { orientation, pageW, pageH } = getPageLayout(size.widthMm)
  const offsetXMm = (pageW - size.widthMm) / 2
  const offsetYMm = (pageH - totalHeightMm) / 2

  let pages = ''
  for (let i = 0; i < rows.length; i++) {
    const effectiveFields = getEffectiveFields(state, i)
    const row = rows[i]
    const topHalf = buildHalfHtml(effectiveFields, state.overlayImages, state.layers, row, state, true)
    const bottomHalf = buildHalfHtml(effectiveFields, state.overlayImages, state.layers, row, state, false)
    pages += `<div class="page"><div style="position:absolute;left:${offsetXMm}mm;top:${offsetYMm}mm;">${topHalf}${bottomHalf}</div></div>`
  }

  const pageSize = orientation === 'landscape' ? 'A4 landscape' : 'A4'
  const html = `<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<title>명패 인쇄 미리보기 (${rows.length}장)</title>
<style>
  @media print {
    @page { size: ${pageSize}; margin: 0; }
    body { margin: 0; background: #fff; }
    .page { margin: 0 !important; box-shadow: none !important; }
    .page { page-break-after: always; }
    .page:last-child { page-break-after: auto; }
    .no-print { display: none !important; }
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #d1d5db; }
  .page {
    width: ${pageW}mm; height: ${pageH}mm;
    position: relative; background: #fff;
    margin: 8mm auto; box-shadow: 0 2px 12px rgba(0,0,0,0.18);
    overflow: hidden;
  }
  .header-bar {
    position: sticky; top: 0; z-index: 100;
    background: #475569; color: #fff;
    display: flex; align-items: center; justify-content: center; gap: 16px;
    padding: 8px 16px; font: bold 13px/1.4 sans-serif;
  }
  .header-bar button {
    background: rgba(255,255,255,0.15); color: #fff; border: none;
    padding: 6px 16px; border-radius: 4px; cursor: pointer; font: bold 12px sans-serif;
  }
  .header-bar button:hover { background: rgba(255,255,255,0.25); }
</style>
</head><body>
<div class="header-bar no-print">
  <span>인쇄 미리보기 · 총 ${rows.length}장</span>
  <button onclick="window.print()">인쇄 (Ctrl+P)</button>
</div>
${pages}
</body></html>`

  const win = window.open('', '_blank')
  if (win) {
    win.document.write(html)
    win.document.close()
  }
}

// ─── html2canvas + jsPDF based PDF download ─────────────────────────────────

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
      const box = document.createElement('div')
      box.style.cssText = [
        `position:absolute`,
        `left:${field.positionX}%`,
        `top:${field.positionY}%`,
        `width:${field.widthPct}%`,
        `height:${field.heightPct}%`,
        `overflow:hidden`,
        `box-sizing:border-box`,
      ].join(';')

      const table = document.createElement('div')
      table.style.cssText = `display:table;width:100%;height:100%;table-layout:fixed;`

      const cell = document.createElement('div')
      cell.style.cssText = `display:table-cell;vertical-align:middle;`

      const text = document.createElement('span')
      text.style.cssText = [
        `display:block`,
        `width:100%`,
        `font-size:${field.fontSize}px`,
        `font-weight:${field.fontWeight}`,
        `font-family:${field.fontFamily}`,
        `text-align:${field.textAlign}`,
        `color:${field.color}`,
        `white-space:pre-line`,
        `line-height:1.2`,
      ].join(';')
      text.textContent = rowData[field.label] ?? ''

      cell.appendChild(text)
      table.appendChild(cell)
      box.appendChild(table)
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

  if (state.showBorder) {
    const borderEl = document.createElement('div')
    borderEl.style.cssText = [
      `position:absolute`,
      `top:0`,
      `left:0`,
      `width:100%`,
      `height:100%`,
      `border:1px solid #e0e0e0`,
      `box-sizing:border-box`,
      `pointer-events:none`,
    ].join(';')
    el.appendChild(borderEl)
  }

  return el
}

// ─── Main export ────────────────────────────────────────────────────────────

export async function generatePdf(
  state: NameplateState,
  onProgress?: (current: number, total: number) => void,
  mode: 'download' | 'preview' = 'download'
): Promise<void> {
  // Preview mode: use native browser HTML rendering for pixel-perfect accuracy.
  // This guarantees text positions match the edit canvas exactly because
  // both use the same browser rendering engine.
  if (mode === 'preview') {
    openPreview(state)
    return
  }

  // Download mode: use html2canvas + jsPDF
  const rows = state.excelRows.length > 0 ? state.excelRows : [state.previewData]
  const { size } = state
  const totalHeightMm = size.heightMm * 2

  const { orientation, pageW, pageH } = getPageLayout(size.widthMm)
  const offsetX = (pageW - size.widthMm) / 2
  const offsetY = (pageH - totalHeightMm) / 2

  if (typeof document !== 'undefined' && document.fonts) {
    await document.fonts.ready
  }

  const dpr = typeof window !== 'undefined' ? (window.devicePixelRatio ?? 1) : 1
  const printScale = Math.min(MAX_PRINT_SCALE, Math.round(BASE_PRINT_SCALE * dpr))

  const pdf = new jsPDF({ orientation, unit: 'mm', format: 'a4' })

  for (let i = 0; i < rows.length; i++) {
    onProgress?.(i + 1, rows.length)

    const effectiveFields = getEffectiveFields(state, i)

    const wrapper = document.createElement('div')
    wrapper.style.cssText = 'position:absolute;left:-9999px;top:0;'
    wrapper.appendChild(buildHalfElement(effectiveFields, state.overlayImages, state.layers, rows[i], state, true))
    wrapper.appendChild(buildHalfElement(effectiveFields, state.overlayImages, state.layers, rows[i], state, false))
    document.body.appendChild(wrapper)

    const canvas = await html2canvas(wrapper, {
      scale: printScale,
      useCORS: true,
      logging: false,
      width: size.widthMm * MM_TO_PX,
      height: totalHeightMm * MM_TO_PX,
    })
    const imgData = canvas.toDataURL('image/png')

    if (i > 0) pdf.addPage()
    pdf.addImage(imgData, 'PNG', offsetX, offsetY, size.widthMm, totalHeightMm)

    document.body.removeChild(wrapper)
  }

  pdf.save('명패_일괄출력.pdf')
}
