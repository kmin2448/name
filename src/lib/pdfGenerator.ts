import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'
import { NameplateState, TextFieldConfig } from '@/types/nameplate'
import { MM_TO_PX } from '@/lib/sizeConstants'

function buildHalfElement(
  state: NameplateState,
  rowData: Record<string, string>,
  rotate: boolean
): HTMLDivElement {
  const { size, backgroundImage, fields } = state
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

  fields.forEach((field: TextFieldConfig) => {
    const text = document.createElement('div')
    text.style.cssText = [
      `position:absolute`,
      `left:${field.positionX}%`,
      `top:${field.positionY}%`,
      `transform:translate(-50%,-50%)`,
      `font-size:${field.fontSize}px`,
      `font-weight:${field.fontWeight}`,
      `text-align:${field.textAlign}`,
      `color:${field.color}`,
      `white-space:nowrap`,
      `line-height:1.2`,
    ].join(';')
    text.textContent = rowData[field.label] ?? ''
    el.appendChild(text)
  })

  return el
}

export async function generatePdf(
  state: NameplateState,
  onProgress?: (current: number, total: number) => void
): Promise<void> {
  const rows = state.excelRows.length > 0 ? state.excelRows : [state.previewData]
  const { size } = state
  const totalHeightMm = size.heightMm * 2

  const pdf = new jsPDF({
    orientation: size.widthMm > totalHeightMm ? 'landscape' : 'portrait',
    unit: 'mm',
    format: [size.widthMm, totalHeightMm],
  })

  for (let i = 0; i < rows.length; i++) {
    onProgress?.(i + 1, rows.length)

    const wrapper = document.createElement('div')
    wrapper.style.cssText = 'position:fixed;left:-9999px;top:0;display:inline-block;'
    wrapper.appendChild(buildHalfElement(state, rows[i], true))
    wrapper.appendChild(buildHalfElement(state, rows[i], false))
    document.body.appendChild(wrapper)

    const canvas = await html2canvas(wrapper, { scale: 2, useCORS: true, logging: false })
    const imgData = canvas.toDataURL('image/png')

    if (i > 0) pdf.addPage([size.widthMm, totalHeightMm])
    pdf.addImage(imgData, 'PNG', 0, 0, size.widthMm, totalHeightMm)

    document.body.removeChild(wrapper)
  }

  pdf.save('명패_일괄출력.pdf')
}
