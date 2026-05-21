'use client'
import { useState, useCallback, useRef, useEffect } from 'react'
import { Toaster } from 'sonner'
import { useNameplateState } from '@/hooks/useNameplateState'
import { SizeSelector } from '@/components/SettingsPanel/SizeSelector'
import { ImagePanel } from '@/components/SettingsPanel/ImagePanel'
import { TextFieldEditor } from '@/components/SettingsPanel/TextFieldEditor'
import { ExcelUploader } from '@/components/SettingsPanel/ExcelUploader'
import { LayerPanel } from '@/components/SettingsPanel/LayerPanel'
import { NameplateCanvas } from '@/components/NameplatePreview/NameplateCanvas'
import { ExportButton } from '@/components/ExportButton'
import { HelpPanel } from '@/components/HelpPanel'
import { ThumbnailPanel } from '@/components/ThumbnailPanel'
import { ExcelParseResult, TextFieldConfig } from '@/types/nameplate'
import { MM_TO_PX } from '@/lib/sizeConstants'
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react'

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
  } = useNameplateState()

  const [focusedFieldId, setFocusedFieldId] = useState<string | null>(null)
  const [focusedOverlayId, setFocusedOverlayId] = useState<string | null>(null)
  const [zoom, setZoom] = useState(1.5)
  const [selectedRowIndex, setSelectedRowIndex] = useState(-1)
  const [applyToAll, setApplyToAll] = useState(false)

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

  // ── Pan (Space + drag) ───────────────────────────────────────────────
  const canvasRef = useRef<HTMLElement>(null)
  const [isPanMode, setIsPanMode] = useState(false)
  const [isPanDragging, setIsPanDragging] = useState(false)
  const panStart = useRef<{ x: number; y: number; scrollLeft: number; scrollTop: number } | null>(null)

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
    if (!isPanMode || !canvasRef.current) return
    e.preventDefault()
    setIsPanDragging(true)
    panStart.current = {
      x: e.clientX,
      y: e.clientY,
      scrollLeft: canvasRef.current.scrollLeft,
      scrollTop: canvasRef.current.scrollTop,
    }
  }, [isPanMode])

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent<HTMLElement>) => {
    if (!isPanDragging || !panStart.current || !canvasRef.current) return
    const dx = e.clientX - panStart.current.x
    const dy = e.clientY - panStart.current.y
    canvasRef.current.scrollLeft = panStart.current.scrollLeft - dx
    canvasRef.current.scrollTop = panStart.current.scrollTop - dy
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
      />
      <div className="h-screen flex flex-col">
        <header className="bg-[#475569] text-white px-6 py-3 shrink-0 flex items-center justify-between">
          <h1 className="text-lg font-bold tracking-tight">명패 제작기</h1>
          <div className="flex flex-col items-end gap-0.5">
            <span className="text-xs opacity-60">© min2448</span>
            <span className="text-[10px] opacity-40">2026-05-21-v2</span>
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
            <hr />
            <ExcelUploader
              fields={state.fields}
              rowCount={state.excelRows.length}
              onParsed={handleExcelParsed}
            />
            <ExportButton state={state} />
          </aside>

          {/* ── 중앙 편집 캔버스 (A4) ── */}
          <main
            ref={canvasRef}
            className="flex-1 overflow-auto p-6 bg-gray-300 flex flex-col items-center"
            style={{
              cursor: isPanMode ? (isPanDragging ? 'grabbing' : 'grab') : undefined,
              userSelect: isPanMode ? 'none' : undefined,
            }}
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            onMouseLeave={handleCanvasMouseUp}
          >
            <p className="text-xs text-gray-500 mb-3 text-center">
              드래그: 이동 · 핸들: 크기 조절 · 선택 후 다시 클릭: 텍스트 편집 · <kbd className="bg-gray-200 px-1 rounded">Esc</kbd>: 종료 · <kbd className="bg-gray-200 px-1 rounded">Shift</kbd>+이미지: 자르기 · <kbd className="bg-gray-200 px-1 rounded">Space</kbd>: 화면 이동
            </p>

            {/* 줌 컨트롤 */}
            <div className="flex items-center gap-1 mb-4">
              <button onClick={handleZoomOut} className="w-7 h-7 flex items-center justify-center rounded border border-gray-400 bg-white text-gray-600 hover:border-gray-500 hover:bg-gray-50" title="축소">
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-xs w-12 text-center tabular-nums text-gray-600 select-none bg-white rounded border border-gray-400 py-0.5">
                {Math.round(zoom * 100)}%
              </span>
              <button onClick={handleZoomIn} className="w-7 h-7 flex items-center justify-center rounded border border-gray-400 bg-white text-gray-600 hover:border-gray-500 hover:bg-gray-50" title="확대">
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button onClick={handleZoomReset} className="w-7 h-7 flex items-center justify-center rounded border border-gray-400 bg-white text-gray-600 hover:border-gray-500 hover:bg-gray-50" title="원래 크기">
                <RotateCcw className="w-3 h-3" />
              </button>
            </div>

            {/* Space 패닝 중에는 캔버스 요소의 포인터 이벤트를 차단해 드래그 충돌 방지 */}
            <div style={{ pointerEvents: isPanMode ? 'none' : 'auto' }}>
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
