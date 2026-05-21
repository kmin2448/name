'use client'
import { Button } from '@/components/ui/button'
import { usePdfExport } from '@/hooks/usePdfExport'
import { NameplateState } from '@/types/nameplate'
import { toast } from 'sonner'
import { Download, Printer } from 'lucide-react'

type Props = {
  state: NameplateState
}

export function ExportButton({ state }: Props) {
  const { exportPdf, previewPdf, isExporting, progress } = usePdfExport()
  const totalRows = state.excelRows.length || 1

  const progressLabel = `생성 중... (${progress.current}/${progress.total})`

  const handleExport = async () => {
    try {
      await exportPdf(state)
      toast.success(`PDF ${totalRows}장 생성이 완료되었습니다.`)
    } catch {
      toast.error('PDF 생성 중 오류가 발생했습니다.')
    }
  }

  const handlePreview = async () => {
    try {
      await previewPdf(state)
    } catch {
      toast.error('인쇄 미리보기 준비 중 오류가 발생했습니다.')
    }
  }

  return (
    <div className="space-y-2">
      <Button
        onClick={handlePreview}
        disabled={isExporting}
        variant="outline"
        className="w-full border-[#475569] text-[#475569] hover:bg-[#475569] hover:text-white"
      >
        <Printer className="w-4 h-4 mr-2" />
        {isExporting ? progressLabel : `인쇄 미리보기 (${totalRows}장)`}
      </Button>
      <Button
        onClick={handleExport}
        disabled={isExporting}
        className="w-full bg-[#475569] hover:bg-[#334155] text-white"
      >
        <Download className="w-4 h-4 mr-2" />
        {isExporting ? progressLabel : `PDF 다운로드 (${totalRows}장)`}
      </Button>
    </div>
  )
}
