'use client'
import { useState } from 'react'
import { Toaster } from 'sonner'
import { useNameplateState } from '@/hooks/useNameplateState'
import { SizeSelector } from '@/components/SettingsPanel/SizeSelector'
import { BackgroundUploader } from '@/components/SettingsPanel/BackgroundUploader'
import { TextFieldEditor } from '@/components/SettingsPanel/TextFieldEditor'
import { ExcelUploader } from '@/components/SettingsPanel/ExcelUploader'
import { NameplateCanvas } from '@/components/NameplatePreview/NameplateCanvas'
import { ExportButton } from '@/components/ExportButton'
import { ExcelParseResult } from '@/types/nameplate'
import { MM_TO_PX } from '@/lib/sizeConstants'

export default function Home() {
  const {
    state,
    setSize,
    setBackground,
    addField,
    updateField,
    removeField,
    moveField,
    setPreviewData,
    setExcelRows,
  } = useNameplateState()

  const [focusedFieldId, setFocusedFieldId] = useState<string | null>(null)

  const PREVIEW_MAX_WIDTH = 460
  const scale = Math.min(1, PREVIEW_MAX_WIDTH / (state.size.widthMm * MM_TO_PX))

  const handleExcelParsed = (result: ExcelParseResult) => {
    setExcelRows(result.rows)
    if (result.rows.length > 0) {
      setPreviewData(result.rows[0])
    }
  }

  return (
    <>
      <Toaster position="top-right" richColors />
      <div className="min-h-screen flex flex-col">
        <header className="bg-[#1F5C99] text-white px-6 py-3 shrink-0">
          <h1 className="text-lg font-bold tracking-tight">명패 제작기</h1>
        </header>

        <div className="flex flex-1 overflow-hidden">
          {/* 좌측 설정 패널 */}
          <aside className="w-72 border-r overflow-y-auto p-4 space-y-5 shrink-0 bg-white">
            <SizeSelector value={state.size} onChange={setSize} />
            <hr />
            <BackgroundUploader value={state.backgroundImage} onChange={setBackground} />
            <hr />
            <TextFieldEditor
              fields={state.fields}
              focusedId={focusedFieldId}
              onUpdate={updateField}
              onRemove={removeField}
              onAdd={addField}
            />
            <hr />
            <ExcelUploader
              fields={state.fields}
              rowCount={state.excelRows.length}
              onParsed={handleExcelParsed}
            />
            <ExportButton state={state} />
          </aside>

          {/* 우측 미리보기 패널 */}
          <main className="flex-1 overflow-auto p-6 bg-gray-50 flex flex-col items-center">
            <p className="text-xs text-muted-foreground mb-4">
              하단 명패에서 텍스트를 드래그해 위치를 조정하세요 · 상단은 접었을 때 뒷면 미리보기
            </p>
            <NameplateCanvas
              state={state}
              scale={scale}
              onMove={moveField}
              onFieldFocus={setFocusedFieldId}
            />
            {state.excelRows.length > 0 && (
              <p className="text-xs text-muted-foreground mt-3">
                미리보기: 첫 번째 행 데이터 · 총 {state.excelRows.length}명
              </p>
            )}

            {/* 인쇄 안내 */}
            <div className="mt-6 w-full max-w-md rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
              <p className="font-semibold mb-1">🖨️ PDF 인쇄 방법</p>
              <ul className="space-y-0.5 text-xs list-disc list-inside">
                <li>배율: <strong>실제 크기(100%)</strong> 또는 <strong>맞춤 페이지 없음</strong> 선택</li>
                <li>여백: <strong>없음</strong> 또는 최소로 설정</li>
                <li>용지 크기: <strong>A4</strong></li>
                <li>단면 인쇄 후 접어서 사용하세요</li>
              </ul>
            </div>

            {/* 저작권 */}
            <p className="mt-6 text-xs text-muted-foreground">© min2448</p>
          </main>
        </div>
      </div>
    </>
  )
}
