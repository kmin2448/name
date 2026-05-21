'use client'
import { useState, useCallback, useRef, useEffect } from 'react'
import { Toaster, toast } from 'sonner'
import * as XLSX from 'xlsx'
import { useNameplateState } from '@/hooks/useNameplateState'
import { usePdfExport } from '@/hooks/usePdfExport'
import { SizeSelector } from '@/components/SettingsPanel/SizeSelector'
import { ImagePanel } from '@/components/SettingsPanel/ImagePanel'
import { TextFieldEditor } from '@/components/SettingsPanel/TextFieldEditor'
import { LayerPanel } from '@/components/SettingsPanel/LayerPanel'
import { NameplateCanvas } from '@/components/NameplatePreview/NameplateCanvas'
import { HelpPanel } from '@/components/HelpPanel'
import { ThumbnailPanel } from '@/components/ThumbnailPanel'
import { parseExcelFile } from '@/lib/excelParser'
import { ExcelParseResult, TextFieldConfig } from '@/types/nameplate'
import { MM_TO_PX } from '@/lib/sizeConstants'
import { ZoomIn, ZoomOut, RotateCcw, Download, Printer, Upload } from 'lucide-react'

// A4 기준 캔버스 최대 폭(px) — 이 값에서 zoom=1이 됨
const A4_MAX_PX = 580
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
    addOverlayImage,
    updateOverlayImage,
    removeOverlayImage,
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
    setLayers,
    setShowBorder,
    resetFields,
    saveAsDefault,
    applyFieldsToAll,
  } = useNameplateState()

  const [focusedFieldId, setFocusedFieldId] = useState<string | null>(null)
  const [focusedOverlayId, setFocusedOverlayId] = useState<string | null>(null)
  const [zoom, setZoom] = useState(1.5)
  const [selectedRowIndex, setSelectedRowIndex] = useState(-1)
  const [applyToAll, setApplyToAll] = useState(true)

  // A4 폭 기준 스케일 계산
  const a4WMm = state.size.widthMm > 210 ? 297 : 210
  const baseScale = A4_MAX_PX / (a4WMm * MM_TO_PX)
  const scale = baseScale * zoom

  const effectiveFields = getEffectiveFields(
    state.fields,
    selectedRowIndex >= 0 ? state.pageFieldOverrides[selectedRowIndex] : undefined
  )

  const hasPageOverride =
    selectedRowIndex >= 0 &&
    !!state.pageFieldOverrides[selectedRowIndex] &&
    Object.keys(state.pageFieldOverrides[selectedRowIndex]).length > 0

  // ── Excel ────────────────────────────────────────────────────────────
  const handleExcelParsed = (result: ExcelParseResult) => {
    if (result.fieldConfigs && result.fieldConfigs.length > 0) setFields(result.fieldConfigs)
    setExcelRows(result.rows)
    if (result.rows.length > 0) { setPreviewData(result.rows[0]); setSelectedRowIndex(0) }
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

  // ── Field interactions ────────────────────────────────────────────────
  const handleUpdateField = (field: TextFieldConfig) => {
    const globalField = state.fields.find((f) => f.id === field.id)
    const labelChanged = globalField?.label !== field.label
    if (!applyToAll && selectedRowIndex >= 0 && !labelChanged) {
      setFieldOverrideForPage(selectedRowIndex, field)
      setPreviewData({ ...state.previewData })
    } else {
      updateField(field)
    }
  }

  const handleMoveField = (id: string, positionX: number, positionY: number) => {
    if (!applyToAll && selectedRowIndex >= 0) moveFieldForPage(selectedRowIndex, id, positionX, positionY)
    else moveField(id, positionX, positionY)
  }

  const handleResizeField = (id: string, widthPct: number, heightPct: number) => {
    if (!applyToAll && selectedRowIndex >= 0) resizeFieldForPage(selectedRowIndex, id, widthPct, heightPct)
    else resizeField(id, widthPct, heightPct)
  }

  const handleFieldFocus = (id: string) => {
    setFocusedFieldId(id)
    setFocusedOverlayId(null)
  }

  // ── Overlay canvas interactions ───────────────────────────────────────
  const handleOverlayFocus = useCallback((id: string) => {
    setFocusedOverlayId(id)
    setFocusedFieldId(null)
  }, [])

  const handleOverlayMove = useCallback((id: string, x: number, y: number) => {
    const img = state.overlayImages.find((o) => o.id === id)
    if (img) updateOverlayImage({ ...img, positionX: x, positionY: y })
  }, [state.overlayImages, updateOverlayImage])

  const handleOverlayResize = useCallback((id: string, w: number, h: number) => {
    const img = state.overlayImages.find((o) => o.id === id)
    if (img) updateOverlayImage({ ...img, widthPct: w, heightPct: h })
  }, [state.overlayImages, updateOverlayImage])

  const handleOverlayCrop = useCallback((
    id: string,
    positionX: number, positionY: number,
    widthPct: number, heightPct: number,
    cropX: number, cropY: number, cropW: number, cropH: number,
  ) => {
    const img = state.overlayImages.find((o) => o.id === id)
    if (img) updateOverlayImage({ ...img, positionX, positionY, widthPct, heightPct, cropX, cropY, cropW, cropH })
  }, [state.overlayImages, updateOverlayImage])

  const handleDeselect = useCallback(() => {
    setFocusedFieldId(null)
    setFocusedOverlayId(null)
  }, [])

  // ── Excel upload & template ──────────────────────────────────────────
  const excelInputRef = useRef<HTMLInputElement>(null)

  const downloadTemplate = () => {
    const headers = state.fields.map((f) => f.label)
    const ws = XLSX.utils.aoa_to_sheet([headers])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '명패목록')
    const formatHeaders = ['항목명', '폰트크기', '굵기', '폰트', '정렬', 'X위치', 'Y위치', '너비', '높이', '색상']
    const formatRows = state.fields.map((f) => [
      f.label, f.fontSize, f.fontWeight, f.fontFamily, f.textAlign,
      f.positionX, f.positionY, f.widthPct, f.heightPct, f.color,
    ])
    const formatWs = XLSX.utils.aoa_to_sheet([formatHeaders, ...formatRows])
    XLSX.utils.book_append_sheet(wb, formatWs, '서식')
    XLSX.writeFile(wb, '명패_양식.xlsx')
  }

  const handleExcelFile = async (file: File) => {
    try {
      const fieldLabels = state.fields.map((f) => f.label)
      const result = await parseExcelFile(file, fieldLabels)
      if (result.rows.length === 0) { toast.error('데이터 행이 없습니다.'); return }
      handleExcelParsed(result)
      result.unmatched.forEach((label) => toast.warning(`'${label}' 항목에 해당하는 열이 없습니다.`))
      if (result.newColumns.length > 0) {
        toast.success(`${result.rows.length}명 로드 완료 · 새 항목 자동 추가: ${result.newColumns.join(', ')}`)
      } else {
        toast.success(`${result.rows.length}명의 데이터를 불러왔습니다.`)
      }
    } catch {
      toast.error('파일을 읽는 중 오류가 발생했습니다.')
    }
  }

  // ── PDF export ───────────────────────────────────────────────────────
  const { exportPdf, previewPdf, isExporting, progress } = usePdfExport()
  const totalRows = state.excelRows.length || 1

  const handleExportPdf = async () => {
    try {
      await exportPdf(state)
      toast.success(`PDF ${totalRows}장 생성이 완료되었습니다.`)
    } catch {
      toast.error('PDF 생성 중 오류가 발생했습니다.')
    }
  }

  const handlePreviewPdf = async () => {
    try {
      await previewPdf(state)
    } catch {
      toast.error('인쇄 미리보기 준비 중 오류가 발생했습니다.')
    }
  }

  // ── Pan (Space + drag) — transform 기반으로 캔버스 자체를 이동 ────────
  const [isPanMode, setIsPanMode] = useState(false)
  const [isPanDragging, setIsPanDragging] = useState(false)
  const [canvasOffset, setCanvasOffset] = useState<{ x: number; y: number }>(() => {
    try {
      const stored = localStorage.getItem('nameplate_canvas_offset')
      return stored ? (JSON.parse(stored) as { x: number; y: number }) : { x: 0, y: 0 }
    } catch {
      return { x: 0, y: 0 }
    }
  })

  useEffect(() => {
    try { localStorage.setItem('nameplate_canvas_offset', JSON.stringify(canvasOffset)) } catch { /* ignore */ }
  }, [canvasOffset])
  const panStart = useRef<{ mouseX: number; mouseY: number; canvasX: number; canvasY: number } | null>(null)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || e.repeat) return
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return
      e.preventDefault()
      setIsPanMode(true)
    }
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return
      setIsPanMode(false)
      setIsPanDragging(false)
      panStart.current = null
    }
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [])

  const handleCanvasMouseDown = useCallback((e: React.MouseEvent<HTMLElement>) => {
    if (!isPanMode) return
    e.preventDefault()
    setIsPanDragging(true)
    panStart.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      canvasX: canvasOffset.x,
      canvasY: canvasOffset.y,
    }
  }, [isPanMode, canvasOffset])

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent<HTMLElement>) => {
    if (!isPanDragging || !panStart.current) return
    const dx = e.clientX - panStart.current.mouseX
    const dy = e.clientY - panStart.current.mouseY
    setCanvasOffset({
      x: panStart.current.canvasX + dx,
      y: panStart.current.canvasY + dy,
    })
  }, [isPanDragging])

  const handleCanvasMouseUp = useCallback(() => {
    setIsPanDragging(false)
    panStart.current = null
  }, [])

  // ── Zoom ──────────────────────────────────────────────────────────────
  const handleZoomIn = () => setZoom((v) => Math.min(MAX_ZOOM, parseFloat((v + 0.1).toFixed(1))))
  const handleZoomOut = () => setZoom((v) => Math.max(MIN_ZOOM, parseFloat((v - 0.1).toFixed(1))))
  const handleZoomReset = () => setZoom(1)

  const hasExcelData = state.excelRows.length > 0

  return (
    <>
      <Toaster position="top-right" richColors />
      <HelpPanel />
      <ThumbnailPanel
        state={state}
        selectedRowIndex={selectedRowIndex}
        applyToAll={applyToAll}
        hasPageOverride={hasPageOverride}
        onApplyToAllChange={setApplyToAll}
        onRowFieldChange={handleRowFieldChange}
        onClearPageOverride={() => clearPageFieldOverride(selectedRowIndex)}
        onToggleBorder={() => setShowBorder(!state.showBorder)}
        onSelect={handleThumbnailSelect}
        onApplyCurrentPageToAll={() => applyFieldsToAll(effectiveFields)}
      />
      <div className="h-screen flex flex-col">
        <header className="bg-[#475569] text-white shrink-0 flex items-center gap-1.5 px-4 py-2 overflow-x-auto">
          {/* 타이틀 */}
          <h1 className="text-base font-bold tracking-tight shrink-0 mr-1">명패 제작기</h1>

          <div className="h-4 w-px bg-white/25 shrink-0 mx-0.5" />

          {/* 엑셀 */}
          <button
            onClick={downloadTemplate}
            className="flex items-center gap-1 text-[11px] px-2 py-1 rounded bg-white/10 hover:bg-white/20 transition-colors shrink-0 whitespace-nowrap"
          >
            <Download className="w-3 h-3" />
            양식 다운로드
          </button>
          <button
            onClick={() => excelInputRef.current?.click()}
            className="flex items-center gap-1 text-[11px] px-2 py-1 rounded bg-white/10 hover:bg-white/20 transition-colors shrink-0 whitespace-nowrap"
          >
            <Upload className="w-3 h-3" />
            {state.excelRows.length > 0 ? `파일 변경 (${state.excelRows.length}명)` : '엑셀 파일 선택'}
          </button>
          <input
            ref={excelInputRef}
            type="file"
            accept=".xlsx,.csv"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleExcelFile(f); e.target.value = '' }}
          />

          <div className="h-4 w-px bg-white/25 shrink-0 mx-0.5" />

          {/* 출력 */}
          <button
            onClick={handlePreviewPdf}
            disabled={isExporting}
            className="flex items-center gap-1 text-[11px] px-2 py-1 rounded bg-white/10 hover:bg-white/20 transition-colors shrink-0 whitespace-nowrap disabled:opacity-40"
          >
            <Printer className="w-3 h-3" />
            {isExporting ? `생성 중... (${progress.current}/${progress.total})` : `인쇄 미리보기 (${totalRows}장)`}
          </button>
          <button
            onClick={handleExportPdf}
            disabled={isExporting}
            className="flex items-center gap-1 text-[11px] px-2 py-1 rounded bg-white/10 hover:bg-white/20 transition-colors shrink-0 whitespace-nowrap disabled:opacity-40"
          >
            <Download className="w-3 h-3" />
            {isExporting ? '생성 중...' : `PDF 다운로드 (${totalRows}장)`}
          </button>

          <div className="h-4 w-px bg-white/25 shrink-0 mx-0.5" />

          {/* 배율 */}
          <button onClick={handleZoomOut} className="w-6 h-6 flex items-center justify-center rounded bg-white/10 hover:bg-white/20 transition-colors shrink-0" title="축소">
            <ZoomOut className="w-3 h-3" />
          </button>
          <span className="text-[11px] w-10 text-center tabular-nums select-none shrink-0">
            {Math.round(zoom * 100)}%
          </span>
          <button onClick={handleZoomIn} className="w-6 h-6 flex items-center justify-center rounded bg-white/10 hover:bg-white/20 transition-colors shrink-0" title="확대">
            <ZoomIn className="w-3 h-3" />
          </button>
          <button onClick={handleZoomReset} className="w-6 h-6 flex items-center justify-center rounded bg-white/10 hover:bg-white/20 transition-colors shrink-0" title="배율 초기화">
            <RotateCcw className="w-3 h-3" />
          </button>

          <div className="h-4 w-px bg-white/25 shrink-0 mx-0.5" />

          {/* 단축키 힌트 */}
          <span className="text-[10px] text-white/50 shrink-0 whitespace-nowrap">
            드래그: 이동 · 핸들: 크기 조절 · 클릭→재클릭: 텍스트 편집 ·{' '}
            <kbd className="bg-white/15 px-0.5 rounded">Esc</kbd>: 종료 ·{' '}
            <kbd className="bg-white/15 px-0.5 rounded">Shift</kbd>+이미지: 자르기 ·{' '}
            <kbd className="bg-white/15 px-0.5 rounded">Space</kbd>: 화면 이동
          </span>

          {/* 저작권 */}
          <div className="ml-auto shrink-0 flex flex-col items-end pl-3">
            <span className="text-xs opacity-60">© min2448</span>
            <span className="text-[10px] opacity-40">2026-05-21-v8</span>
          </div>
        </header>

        <div className="flex flex-1 overflow-hidden">
          {/* ── 좌측 설정 패널 ── */}
          <aside className="w-80 border-r overflow-y-auto p-4 space-y-5 shrink-0 bg-white">
            <SizeSelector value={state.size} onChange={setSize} />
            <hr />
            <ImagePanel
              backgroundImage={state.backgroundImage}
              onBackgroundChange={setBackground}
              overlayImages={state.overlayImages}
              fields={state.fields}
              excelRows={state.excelRows}
              onAddOverlay={addOverlayImage}
              onUpdateOverlay={updateOverlayImage}
              onRemoveOverlay={removeOverlayImage}
            />
            <hr />
            <LayerPanel
              layers={state.layers}
              fields={state.fields}
              overlayImages={state.overlayImages}
              onSetLayers={setLayers}
            />
            <hr />
            {selectedRowIndex >= 0 && hasExcelData && (
              <div className={`text-xs rounded px-2 py-1.5 flex items-center gap-1.5 ${applyToAll ? 'bg-orange-50 text-orange-600' : 'bg-slate-100 text-[#475569]'}`}>
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
              onFocus={handleFieldFocus}
              onReset={resetFields}
              onSaveAsDefault={() => saveAsDefault(state.fields)}
            />
          </aside>

          {/* ── 중앙 편집 캔버스 (A4) ── */}
          <main
            className="flex-1 overflow-hidden p-6 bg-gray-300 flex flex-col items-center relative"
            style={{
              cursor: isPanMode ? (isPanDragging ? 'grabbing' : 'grab') : undefined,
              userSelect: isPanMode ? 'none' : undefined,
            }}
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            onMouseLeave={handleCanvasMouseUp}
          >
            {/* Space 패닝: transform으로 캔버스 위치 이동 + 패닝 중 포인터 이벤트 차단 */}
            <div style={{
              pointerEvents: isPanMode ? 'none' : 'auto',
              transform: `translate(${canvasOffset.x}px, ${canvasOffset.y}px)`,
            }}>
              <NameplateCanvas
                state={state}
                overrideFields={effectiveFields}
                scale={scale}
                focusedFieldId={focusedFieldId}
                focusedOverlayId={focusedOverlayId}
                onMove={handleMoveField}
                onResize={handleResizeField}
                onFieldFocus={handleFieldFocus}
                onOverlayFocus={handleOverlayFocus}
                onOverlayMove={handleOverlayMove}
                onOverlayResize={handleOverlayResize}
                onOverlayCrop={handleOverlayCrop}
                onDeselect={handleDeselect}
                onValueChange={selectedRowIndex >= 0 ? handleRowFieldChange : undefined}
              />
            </div>

          </main>

        </div>
      </div>
    </>
  )
}
