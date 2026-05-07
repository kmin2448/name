import * as XLSX from 'xlsx'
import { ExcelParseResult } from '@/types/nameplate'

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
        const { matched, unmatched, newColumns } = matchHeaders(headers, fieldLabels)
        resolve({ rows: jsonData, matched, unmatched, newColumns })
      } catch (err) {
        reject(err)
      }
    }
    reader.onerror = reject
    reader.readAsArrayBuffer(file)
  })
}
