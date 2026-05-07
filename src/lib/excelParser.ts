import * as XLSX from 'xlsx'
import { ExcelParseResult } from '@/types/nameplate'

export function normalizeHeader(header: string): string {
  return header.trim().toLowerCase()
}

export function matchHeaders(
  headers: string[],
  fieldLabels: string[]
): { matched: string[]; unmatched: string[] } {
  const normalizedLabels = fieldLabels.map(normalizeHeader)
  const matched: string[] = []
  const unmatched: string[] = []
  for (const header of headers) {
    if (normalizedLabels.includes(normalizeHeader(header))) {
      matched.push(header)
    } else {
      unmatched.push(header)
    }
  }
  return { matched, unmatched }
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
          resolve({ rows: [], matched: [], unmatched: [] })
          return
        }

        const headers = Object.keys(jsonData[0])
        const { matched, unmatched } = matchHeaders(headers, fieldLabels)
        resolve({ rows: jsonData, matched, unmatched })
      } catch (err) {
        reject(err)
      }
    }
    reader.onerror = reject
    reader.readAsArrayBuffer(file)
  })
}
