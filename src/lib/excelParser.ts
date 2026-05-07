import * as XLSX from 'xlsx'
import { ExcelParseResult, TextFieldConfig } from '@/types/nameplate'

const FORMAT_SHEET = '서식'

function parseFormatSheet(sheet: XLSX.WorkSheet): TextFieldConfig[] {
  const rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: '' })
  return rows
    .map((row, i) => {
      const label = row['항목명']?.trim()
      if (!label) return null
      const align = row['정렬']
      return {
        id: `loaded-${i}-${label}`,
        label,
        fontSize: Math.max(8, Math.min(150, Number(row['폰트크기']) || 14)),
        fontWeight: row['굵기'] === 'bold' ? 'bold' : 'normal',
        fontFamily: row['폰트'] || '맑은 고딕',
        textAlign: (['left', 'center', 'right'] as const).includes(align as 'left' | 'center' | 'right')
          ? (align as 'left' | 'center' | 'right')
          : 'center',
        positionX: Number(row['X위치']) || 0,
        positionY: Number(row['Y위치']) || 0,
        widthPct: Number(row['너비']) || 80,
        heightPct: Number(row['높이']) || 20,
        color: row['색상'] || '#000000',
      } satisfies TextFieldConfig
    })
    .filter((f): f is TextFieldConfig => f !== null)
}

export function normalizeHeader(header: string): string {
  return header.trim().toLowerCase()
}

export function matchHeaders(
  headers: string[],
  fieldLabels: string[]
): { matched: string[]; unmatched: string[]; newColumns: string[] } {
  const normHeaders = headers.map((h) => normalizeHeader(h))
  const normLabels = fieldLabels.map((l) => normalizeHeader(l))

  // Field labels that have a matching Excel column
  const matched = fieldLabels.filter((l) => normHeaders.includes(normalizeHeader(l)))
  // Field labels without a matching Excel column (will render empty)
  const unmatched = fieldLabels.filter((l) => !normHeaders.includes(normalizeHeader(l)))
  // Excel columns that don't correspond to any existing field (auto-add candidates)
  const newColumns = headers.filter((h) => !normLabels.includes(normalizeHeader(h)))

  return { matched, unmatched, newColumns }
}

export function parseExcelFile(
  file: File,
  fieldLabels: string[]
): Promise<ExcelParseResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = e.target?.result
        const workbook = XLSX.read(data, { type: 'array' })
        const sheetName = workbook.SheetNames[0]
        const sheet = workbook.Sheets[sheetName]
        const jsonData = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, {
          defval: '',
          raw: false,
        })

        if (jsonData.length === 0) {
          resolve({ rows: [], matched: [], unmatched: [], newColumns: [] })
          return
        }

        const headers = Object.keys(jsonData[0])

        // Load field configs from 서식 sheet if available
        let fieldConfigs: TextFieldConfig[] | undefined
        if (workbook.SheetNames.includes(FORMAT_SHEET)) {
          const loaded = parseFormatSheet(workbook.Sheets[FORMAT_SHEET])
          if (loaded.length > 0) fieldConfigs = loaded
        }

        // If we have fieldConfigs, recalculate newColumns against those labels
        const effectiveLabels = fieldConfigs ? fieldConfigs.map((f) => f.label) : fieldLabels
        const { matched, unmatched, newColumns } = matchHeaders(headers, effectiveLabels)
        resolve({ rows: jsonData, matched, unmatched, newColumns, fieldConfigs })
      } catch (err) {
        reject(err)
      }
    }
    reader.onerror = reject
    reader.readAsArrayBuffer(file)
  })
}
