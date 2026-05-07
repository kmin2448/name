'use client'
import { useRef } from 'react'
import * as XLSX from 'xlsx'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { TextFieldConfig, ExcelParseResult } from '@/types/nameplate'
import { parseExcelFile } from '@/lib/excelParser'
import { toast } from 'sonner'
import { Download } from 'lucide-react'

type Props = {
  fields: TextFieldConfig[]
  rowCount: number
  onParsed: (result: ExcelParseResult) => void
}

export function ExcelUploader({ fields, rowCount, onParsed }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)

  const downloadTemplate = () => {
    const headers = fields.map((f) => f.label)
    const ws = XLSX.utils.aoa_to_sheet([headers])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '명패목록')
    XLSX.writeFile(wb, '명패_양식.xlsx')
  }

  const handleFile = async (file: File) => {
    try {
      const fieldLabels = fields.map((f) => f.label)
      const result = await parseExcelFile(file, fieldLabels)

      if (result.rows.length === 0) {
        toast.error('데이터 행이 없습니다.')
        return
      }

      onParsed(result)

      if (result.unmatched.length > 0) {
        result.unmatched.forEach((col) => {
          toast.warning(`'${col}' 열을 찾지 못했습니다. 빈 값으로 표시됩니다.`)
        })
      } else {
        toast.success(`${result.rows.length}명의 데이터를 불러왔습니다.`)
      }
    } catch {
      toast.error('파일을 읽는 중 오류가 발생했습니다.')
    }
  }

  return (
    <div className="space-y-2">
      <Label className="text-sm font-semibold">엑셀 업로드</Label>
      <Button variant="outline" className="w-full text-sm" onClick={downloadTemplate}>
        <Download className="w-3 h-3 mr-1" />
        양식 다운로드
      </Button>
      <div className="flex items-center gap-2">
        <Button variant="outline" className="flex-1 text-sm" onClick={() => inputRef.current?.click()}>
          {rowCount > 0 ? '파일 변경' : '엑셀 파일 선택'}
        </Button>
        {rowCount > 0 && (
          <Badge variant="secondary">{rowCount}명</Badge>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        양식을 다운받아 작성 후 업로드하세요 | .xlsx, .csv
      </p>
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.csv"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
          e.target.value = ''
        }}
      />
    </div>
  )
}
