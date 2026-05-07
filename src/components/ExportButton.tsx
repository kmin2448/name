'use client'
import { Button } from '@/components/ui/button'
import { usePdfExport } from '@/hooks/usePdfExport'
import { NameplateState } from '@/types/nameplate'
import { toast } from 'sonner'
import { Download } from 'lucide-react'

type Props = {
  state: NameplateState
}

export function ExportButton({ state }: Props) {
  const { exportPdf, isExporting, progress } = usePdfExport()
  const totalRows = state.excelRows.length || 1

  const handleExport = async () => {
    try {
      await exportPdf(state)
      toast.success(`PDF ${totalRows}장 생성이 완료되었습니다.`)
    } catch {
      toast.error('PDF 생성 중 오류가 발생했습니다.')
    }
  }

  return (
    <Button
      onClick={handleExport}
      disabled={isExporting}
      className="w-full bg-[#1F5C99] hover:bg-[#1a4d82] text-white"
    >
      <Download className="w-4 h-4 mr-2" />
      {isExporting
        ? `생성 중... (${progress.current}/${progress.total})`
        : `PDF 다운로드 (${totalRows}장)`}
    </Button>
  )
}
