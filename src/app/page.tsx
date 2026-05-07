'use client'
import { useState } from 'react'
import { Toaster } from 'sonner'
import { useNameplateState } from '@/hooks/useNameplateState'
import { SizeSelector } from '@/components/SettingsPanel/SizeSelector'
import { BackgroundUploader } from '@/components/SettingsPanel/BackgroundUploader'
import { TextFieldEditor } from '@/components/SettingsPanel/TextFieldEditor'
import { ExcelUploader } from '@/components/SettingsPanel/ExcelUploader'
import { NameplateCanvas } from '@/components/NameplatePreview/NameplateCanvas'
import { PageThumbnails } from '@/components/NameplatePreview/PageThumbnails'
import { ExportButton } from '@/components/ExportButton'
import { ExcelParseResult, TextFieldConfig } from '@/types/nameplate'
import { MM_TO_PX } from '@/lib/sizeConstants'
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react'

const PREVIEW_MAX_WIDTH = 460
const MIN_ZOOM = 0.25
const MAX_ZOOM = 3

function getEffectiveFields(
  globalFields: TextFieldConfig[],
  overrides?: Record<string, TextFieldConfig>
): TextFieldConfig[] {
  if (!overrides) return globalFields
  return globalFields.map((f) => overrides[f.id] ?? f)
}

export default function Home() {
  const {
    state,
    setSize,
    setBackground,
    setFields,
    addField,
    addFieldWithLabel,
    updateField,
    removeField,
    moveField,
    resizeField,
    setPreviewData,
    setExcelRows,
    updateExcelRow,
    setFieldOverrideForPage,
    moveFieldForPage,
    resizeFieldForPage,
    clearPageFieldOverride,
  } = useNameplateState()

  const [focusedFieldId, setFocusedFieldId] = useState<string | null>(null)
  const [zoom, setZoom] = useState(1)
  const [selectedRowIndex, setSelectedRowIndex] = useState(-1)
  const [applyToAll, setApplyToAll] = useState(false)

  const baseScale = Math.min(1, PREVIEW_MAX_WIDTH / (state.size.widthMm * MM_TO_PX))
  const scale = baseScale * zoom

  const effectiveFields = getEffectiveFields(
    state.fields,
    selectedRowIndex >= 0 ? state.pageFieldOverrides[selectedRowIndex] : undefined
  )

  const hasPageOverride =
    selectedRowIndex >= 0 &&
    !!state.pageFieldOverrides[selectedRowIndex] &&
    Object.keys(state.pageFieldOverrides[selectedRowIndex]).length > 0

  const handleExcelParsed = (result: ExcelParseResult) => {
    if (result.fieldConfigs && result.fieldConfigs.length > 0) {
      setFields(result.fieldConfigs)
    }
    setExcelRows(result.rows)
    if (result.rows.length > 0) {
      setPreviewData(result.rows[0])
      setSelectedRowIndex(0)
    }
    result.newColumns.forEach((col) => addFieldWithLabel(col))
  }

  const handleThumbnailSelect = (index: number) => {
    setSelectedRowIndex(index)
    setPreviewData(state.excelRows[index])
  }

  const handleRowFieldChange = (fieldLabel: string, value: string) => {
    if (selectedRowIndex < 0) return
    if (applyToAll) {
      const updatedRows = state.excelRows.map((row) => ({ ...row, [fieldLabel]: value }))
      setExcelRows(updatedRows)
      setPreviewData(updatedRows[selectedRowIndex])
    } else {
      const updated = { ...state.excelRows[selectedRowIndex], [fieldLabel]: value }
      updateExcelRow(selectedRowIndex, updated)
      setPreviewData(updated)
    }
  }

  // Field style update: label changes always go global; style changes route by applyToAll
  const handleUpdateField = (field: TextFieldConfig) => {
    const globalField = state.fields.find((f) => f.id === field.id)
    const labelChanged = globalField?.label !== field.label
    if (!applyToAll && selectedRowIndex >= 0 && !labelChanged) {
      setFieldOverrideForPage(selectedRowIndex, field)
      // Keep previewData in sync with updated effective fields
      setPreviewData({ ...state.previewData })
    } else {
      updateField(field)
    }
  }

  const handleMoveField = (id: string, positionX: number, positionY: number) => {
    if (!applyToAll && selectedRowIndex >= 0) {
      moveFieldForPage(selectedRowIndex, id, positionX, positionY)
    } else {
      moveField(id, positionX, positionY)
    }
  }

  const handleResizeField = (id: string, widthPct: number, heightPct: number) => {
    if (!applyToAll && selectedRowIndex >= 0) {
      resizeFieldForPage(selectedRowIndex, id, widthPct, heightPct)
    } else {
      resizeField(id, widthPct, heightPct)
    }
  }

  const handleZoomIn = () => setZoom((v) => Math.min(MAX_ZOOM, parseFloat((v + 0.1).toFixed(1))))
  const handleZoomOut = () => setZoom((v) => Math.max(MIN_ZOOM, parseFloat((v - 0.1).toFixed(1))))
  const handleZoomReset = () => setZoom(1)

  return (
    <>
      <Toaster position="top-right" richColors />
      <div className="min-h-screen flex flex-col">
        <header className="bg-[#1F5C99] text-white px-6 py-3 shrink-0 flex items-center justify-between">
          <h1 className="text-lg font-bold tracking-tight">명패 제작기</h1>
          <span className="text-xs opacity-60">© min2448</span>
        </header>

        <div className="flex flex-1 overflow-hidden">
          {/* 좌측 설정 패널 */}
          <aside className="w-72 border-r overflow-y-auto p-4 space-y-5 shrink-0 bg-white">
            <SizeSelector value={state.size} onChange={setSize} />
            <hr />
            <BackgroundUploader value={state.backgroundImage} onChange={setBackground} />
            <hr />
            {/* 적용 범위 표시 */}
            {selectedRowIndex >= 0 && state.excelRows.length > 0 && (
              <div className={`text-xs rounded px-2 py-1.5 flex items-center gap-1.5 ${applyToAll ? 'bg-orange-50 text-orange-600' : 'bg-blue-50 text-[#1F5C99]'}`}>
                <span className="font-semibold">{applyToAll ? '전체 적용 모드' : '이 페이지만 모드'}</span>
                <span className="text-[10px] opacity-70">— 아래 편집이 {applyToAll ? '전체' : `${selectedRowIndex + 1}번`} 페이지에 적용됨</span>
              </div>
            )}
            <TextFieldEditor
              fields={effectiveFields}
              focusedId={focusedFieldId}
              onUpdate={handleUpdateField}
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
            <p className="text-xs text-muted-foreground mb-3">
              하단 명패에서 텍스트 박스를 드래그해 이동 · 우하단 핸들로 크기 조절
            </p>

            {/* 줌 컨트롤 */}
            <div className="flex items-center gap-1 mb-4">
              <button
                onClick={handleZoomOut}
                className="w-7 h-7 flex items-center justify-center rounded border border-gray-300 bg-white text-gray-600 hover:border-gray-400 hover:bg-gray-50"
                title="축소"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-xs w-12 text-center tabular-nums text-gray-600 select-none">
                {Math.round(zoom * 100)}%
              </span>
              <button
                onClick={handleZoomIn}
                className="w-7 h-7 flex items-center justify-center rounded border border-gray-300 bg-white text-gray-600 hover:border-gray-400 hover:bg-gray-50"
                title="확대"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleZoomReset}
                className="w-7 h-7 flex items-center justify-center rounded border border-gray-300 bg-white text-gray-600 hover:border-gray-400 hover:bg-gray-50"
                title="원래 크기"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
              {hasPageOverride && !applyToAll && (
                <button
                  onClick={() => {
                    clearPageFieldOverride(selectedRowIndex)
                  }}
                  className="ml-2 text-xs bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded hover:bg-orange-200 transition-colors"
                  title="이 페이지의 커스텀 서식을 제거하고 기본 서식으로 되돌립니다"
                >
                  커스텀 취소 ✕
                </button>
              )}
            </div>

            <NameplateCanvas
              state={state}
              overrideFields={effectiveFields}
              scale={scale}
              focusedFieldId={focusedFieldId}
              onMove={handleMoveField}
              onResize={handleResizeField}
              onFieldFocus={setFocusedFieldId}
            />

            {/* 선택된 페이지 데이터 인라인 편집 */}
            {selectedRowIndex >= 0 && state.excelRows.length > 0 && (
              <div className={`mt-4 w-full max-w-lg bg-white border rounded-lg px-4 py-3 transition-colors ${applyToAll ? 'border-orange-300' : 'border-gray-200'}`}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-gray-600">
                    {selectedRowIndex + 1}번 데이터 편집 (총 {state.excelRows.length}명)
                  </p>
                  <div className="flex text-xs border border-gray-200 rounded overflow-hidden">
                    <button
                      onClick={() => setApplyToAll(false)}
                      className={`px-2 py-0.5 transition-colors ${!applyToAll ? 'bg-[#1F5C99] text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
                    >
                      이 페이지만
                    </button>
                    <button
                      onClick={() => setApplyToAll(true)}
                      className={`px-2 py-0.5 border-l border-gray-200 transition-colors ${applyToAll ? 'bg-orange-500 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
                    >
                      전체 적용
                    </button>
                  </div>
                </div>
                {applyToAll && (
                  <p className="text-xs text-orange-500 mb-2">
                    ⚠ 입력한 내용이 전체 {state.excelRows.length}개 페이지에 동일하게 적용됩니다
                  </p>
                )}
                {!applyToAll && (
                  <p className="text-xs text-[#1F5C99] mb-2">
                    데이터 수정 · 텍스트 위치/크기/색상/정렬 변경이 이 페이지에만 적용됩니다
                  </p>
                )}
                <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                  {state.fields.map((field) => (
                    <div key={field.id} className="flex items-center gap-1.5">
                      <span className="text-xs text-gray-500 whitespace-nowrap">{field.label}</span>
                      <input
                        className={`h-6 text-xs border rounded px-1.5 w-28 focus:outline-none ${applyToAll ? 'border-orange-300 focus:border-orange-500' : 'border-gray-200 focus:border-[#1F5C99]'}`}
                        value={state.excelRows[selectedRowIndex]?.[field.label] ?? ''}
                        onChange={(e) => handleRowFieldChange(field.label, e.target.value)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 페이지 썸네일 */}
            <PageThumbnails
              rows={state.excelRows}
              fields={state.fields}
              pageFieldOverrides={state.pageFieldOverrides}
              size={state.size}
              backgroundImage={state.backgroundImage}
              selectedIndex={selectedRowIndex}
              onSelect={handleThumbnailSelect}
            />

            {/* 인쇄 안내 */}
            <div className="mt-6 w-full max-w-md px-2 py-2 text-sm text-gray-500">
              <p className="font-semibold mb-1 text-gray-600">🖨️ PDF 인쇄 방법</p>
              <ul className="space-y-0.5 text-xs list-disc list-inside">
                <li>배율: <strong>실제 크기(100%)</strong> 또는 <strong>맞춤 페이지 없음</strong> 선택</li>
                <li>여백: <strong>없음</strong> 또는 최소로 설정</li>
                <li>용지 크기: <strong>A4</strong></li>
                <li>단면 인쇄 후 접어서 사용하세요</li>
              </ul>
            </div>

          </main>
        </div>
      </div>
    </>
  )
}
