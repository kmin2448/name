'use client'
import { useRef, useState, useCallback } from 'react'
import { NameplateState, TextFieldConfig, OverlayImage } from '@/types/nameplate'
import { DraggableTextField } from './DraggableTextField'
import { DraggableOverlayImage } from './DraggableOverlayImage'
import { MM_TO_PX } from '@/lib/sizeConstants'
import { getBackgroundImageCss, getBackgroundSize } from '@/lib/backgroundPresets'
import { MarqueeRect, MARQUEE_MIN_PCT, SelectionBox, boxesInRect, normalizeRect } from '@/lib/selection'

const SNAP_THRESHOLD = 2

type GuideLine = {
  type: 'horizontal' | 'vertical'
  position: number
  isCenter: boolean
}

function calcSnap(
  rawX: number,
  rawY: number,
  dragId: string,
  fields: TextFieldConfig[],
  widthPct: number,
  heightPct: number
): { x: number; y: number; guides: GuideLine[] } {
  let x = rawX
  let y = rawY
  const guides: GuideLine[] = []

  const centerX = rawX + widthPct / 2
  const centerY = rawY + heightPct / 2
  const dragRight = rawX + widthPct
  const dragBottom = rawY + heightPct

  if (Math.abs(centerX - 50) < SNAP_THRESHOLD) {
    x = 50 - widthPct / 2
    guides.push({ type: 'vertical', position: 50, isCenter: true })
  }
  if (Math.abs(centerY - 50) < SNAP_THRESHOLD) {
    y = 50 - heightPct / 2
    guides.push({ type: 'horizontal', position: 50, isCenter: true })
  }

  for (const field of fields) {
    if (field.id === dragId) continue
    const oX = field.positionX
    const oY = field.positionY
    const oCX = oX + field.widthPct / 2
    const oCY = oY + field.heightPct / 2
    const oR = oX + field.widthPct
    const oB = oY + field.heightPct

    const xCandidates = [
      { snap: oX, pos: oX, delta: Math.abs(rawX - oX) },
      { snap: oCX - widthPct / 2, pos: oCX, delta: Math.abs(centerX - oCX) },
      { snap: oR - widthPct, pos: oR, delta: Math.abs(dragRight - oR) },
    ].filter((c) => c.delta < SNAP_THRESHOLD)

    if (xCandidates.length > 0) {
      const best = xCandidates.reduce((a, b) => (a.delta < b.delta ? a : b))
      if (x === rawX) x = best.snap
      guides.push({ type: 'vertical', position: best.pos, isCenter: false })
    }

    const yCandidates = [
      { snap: oY, pos: oY, delta: Math.abs(rawY - oY) },
      { snap: oCY - heightPct / 2, pos: oCY, delta: Math.abs(centerY - oCY) },
      { snap: oB - heightPct, pos: oB, delta: Math.abs(dragBottom - oB) },
    ].filter((c) => c.delta < SNAP_THRESHOLD)

    if (yCandidates.length > 0) {
      const best = yCandidates.reduce((a, b) => (a.delta < b.delta ? a : b))
      if (y === rawY) y = best.snap
      guides.push({ type: 'horizontal', position: best.pos, isCenter: false })
    }
  }

  const seen = new Set<string>()
  return {
    x: Math.max(0, Math.min(100 - widthPct, x)),
    y: Math.max(0, Math.min(100 - heightPct, y)),
    guides: guides.filter((g) => {
      const key = `${g.type}-${g.position}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    }),
  }
}

// ─── Static rendering helpers (used by PageThumbnails and PDF generator) ───

function overlayMatchesRow(img: OverlayImage, rowData: Record<string, string>): boolean {
  return img.condition.type === 'all' || rowData[img.condition.fieldLabel] === img.condition.fieldValue
}

function renderStaticOverlay(img: OverlayImage): React.ReactNode {
  const { cropX, cropY, cropW, cropH } = img
  return (
    <div
      key={img.id}
      style={{
        position: 'absolute',
        left: `${img.positionX}%`, top: `${img.positionY}%`,
        width: `${img.widthPct}%`, height: `${img.heightPct}%`,
        overflow: 'hidden', pointerEvents: 'none',
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={img.src}
        alt=""
        style={{
          position: 'absolute',
          left: `${-(cropX / cropW) * 100}%`,
          top: `${-(cropY / cropH) * 100}%`,
          width: `${(100 / cropW) * 100}%`,
          height: `${(100 / cropH) * 100}%`,
          objectFit: 'fill',
          pointerEvents: 'none',
        }}
      />
    </div>
  )
}

function renderStaticField(field: TextFieldConfig, data: Record<string, string>): React.ReactNode {
  return (
    <div
      key={field.id}
      style={{
        position: 'absolute',
        left: `${field.positionX}%`, top: `${field.positionY}%`,
        width: `${field.widthPct}%`, height: `${field.heightPct}%`,
        overflow: 'hidden', boxSizing: 'border-box',
      }}
    >
      <div style={{ display: 'table', width: '100%', height: '100%', tableLayout: 'fixed' }}>
        <div style={{ display: 'table-cell', verticalAlign: 'middle' }}>
          <span style={{
            display: 'block', width: '100%',
            fontSize: `${field.fontSize}px`, fontWeight: field.fontWeight,
            fontFamily: field.fontFamily, textAlign: field.textAlign,
            color: field.color, whiteSpace: 'pre-line', lineHeight: 1.2,
          }}>
            {data[field.label] ?? `[${field.label}]`}
          </span>
        </div>
      </div>
    </div>
  )
}

/**
 * Renders all layers (fields + overlay images) as static React nodes.
 * Exported for use by PageThumbnails.
 */
export function renderItemsStatic(
  layers: string[],
  fields: TextFieldConfig[],
  overlayImages: OverlayImage[],
  rowData: Record<string, string>
): React.ReactNode[] {
  const effectiveLayers = layers.length > 0 ? layers : fields.map((f) => f.id)
  return effectiveLayers.map((id) => {
    const field = fields.find((f) => f.id === id)
    if (field) return renderStaticField(field, rowData)
    const overlay = overlayImages.find((o) => o.id === id)
    if (overlay && overlayMatchesRow(overlay, rowData)) return renderStaticOverlay(overlay)
    return null
  }).filter(Boolean)
}

// ─── Canvas component ───────────────────────────────────────────────────────

type Props = {
  state: NameplateState
  overrideFields?: TextFieldConfig[]
  scale: number
  focusedFieldId: string | null
  focusedOverlayId: string | null
  /** 다중 선택된 요소 id 목록 (텍스트·이미지 공통) */
  selectedIds: string[]
  onMarqueeSelect: (ids: string[], additive: boolean) => void
  onMove: (id: string, positionX: number, positionY: number) => void
  onResize: (id: string, widthPct: number, heightPct: number) => void
  onFieldFocus: (id: string, additive: boolean) => void
  onOverlayFocus: (id: string, additive: boolean) => void
  onOverlayMove: (id: string, x: number, y: number) => void
  onOverlayResize: (id: string, w: number, h: number) => void
  onOverlayCrop: (id: string, positionX: number, positionY: number, widthPct: number, heightPct: number, cropX: number, cropY: number, cropW: number, cropH: number) => void
  onDeselect: () => void
  onValueChange?: (fieldLabel: string, value: string) => void
}

export function NameplateCanvas({
  state, overrideFields, scale,
  focusedFieldId, focusedOverlayId, selectedIds, onMarqueeSelect,
  onMove, onResize, onFieldFocus,
  onOverlayFocus, onOverlayMove, onOverlayResize, onOverlayCrop,
  onDeselect, onValueChange,
}: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const canvasWrapperRef = useRef<HTMLDivElement>(null)
  const [guides, setGuides] = useState<GuideLine[]>([])
  const [marquee, setMarquee] = useState<MarqueeRect | null>(null)

  const { size, backgroundImage, overlayImages, previewData, layers } = state
  const fields = overrideFields ?? state.fields
  const widthPx = size.widthMm * MM_TO_PX
  const heightPx = size.heightMm * MM_TO_PX
  const scaledWidth = Math.round(widthPx * scale)
  const scaledHeight = Math.round(heightPx * scale)

  // A4 dimensions (landscape if nameplate wider than 210mm)
  const a4WMm = size.widthMm > 210 ? 297 : 210
  const a4HMm = size.widthMm > 210 ? 210 : 297
  const a4WPx = Math.round(a4WMm * MM_TO_PX * scale)
  const a4HPx = Math.round(a4HMm * MM_TO_PX * scale)
  const offsetXPx = Math.round(((a4WMm - size.widthMm) / 2) * MM_TO_PX * scale)
  const offsetYPx = Math.max(0, Math.round(((a4HMm - size.heightMm * 2) / 2) * MM_TO_PX * scale))

  const effectiveLayers = layers.length > 0 ? layers : fields.map((f) => f.id)

  const handleMove = useCallback(
    (id: string, rawX: number, rawY: number) => {
      const field = fields.find((f) => f.id === id)
      if (!field) return
      // 다중 선택 상태에서는 그룹 전체가 함께 움직이므로 스냅을 적용하지 않는다
      if (selectedIds.length > 1 && selectedIds.includes(id)) {
        onMove(id, rawX, rawY)
        return
      }
      const { x, y, guides: newGuides } = calcSnap(rawX, rawY, id, fields, field.widthPct, field.heightPct)
      setGuides(newGuides)
      onMove(id, x, y)
    },
    [fields, onMove, selectedIds]
  )

  const handleDragEnd = useCallback(() => setGuides([]), [])

  // ── 드래그 영역 선택(마퀴) ────────────────────────────────────────────
  // 하단(정방향) 명패의 빈 배경에서 드래그를 시작하면 사각형이 그려지고,
  // 놓는 순간 그 영역과 겹치는 요소들이 한 번에 선택된다.
  const collectSelectableBoxes = useCallback((): SelectionBox[] => {
    return effectiveLayers.flatMap((id): SelectionBox[] => {
      const field = fields.find((f) => f.id === id)
      if (field) {
        return [{
          id, positionX: field.positionX, positionY: field.positionY,
          widthPct: field.widthPct, heightPct: field.heightPct,
        }]
      }
      const overlay = overlayImages.find((o) => o.id === id)
      if (overlay && overlayMatchesRow(overlay, previewData)) {
        return [{
          id, positionX: overlay.positionX, positionY: overlay.positionY,
          widthPct: overlay.widthPct, heightPct: overlay.heightPct,
        }]
      }
      return []
    })
  }, [effectiveLayers, fields, overlayImages, previewData])

  const handleMarqueeMouseDown = useCallback(
    (e: React.MouseEvent) => {
      const container = bottomRef.current
      // 요소 위가 아니라 빈 배경에서 시작한 드래그만 영역 선택으로 처리
      if (!container || e.target !== container || e.button !== 0) return
      e.preventDefault()

      const rect = container.getBoundingClientRect()
      const toPctX = (clientX: number) => ((clientX - rect.left) / rect.width) * 100
      const toPctY = (clientY: number) => ((clientY - rect.top) / rect.height) * 100
      const startX = toPctX(e.clientX)
      const startY = toPctY(e.clientY)
      const additive = e.ctrlKey || e.metaKey || e.shiftKey

      let current: MarqueeRect = { x: startX, y: startY, width: 0, height: 0 }
      let dragged = false

      const handleMouseMove = (ev: MouseEvent) => {
        current = normalizeRect(startX, startY, toPctX(ev.clientX), toPctY(ev.clientY))
        if (current.width > MARQUEE_MIN_PCT || current.height > MARQUEE_MIN_PCT) dragged = true
        setMarquee(current)
      }

      const handleMouseUp = () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
        setMarquee(null)
        if (!dragged) {
          // 단순 클릭 — 선택 해제
          if (!additive) onDeselect()
          return
        }
        onMarqueeSelect(boxesInRect(collectSelectableBoxes(), current), additive)
      }

      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    },
    [collectSelectableBoxes, onMarqueeSelect, onDeselect]
  )

  const bgStyle: React.CSSProperties = {
    backgroundImage: getBackgroundImageCss(backgroundImage),
    backgroundSize: getBackgroundSize(backgroundImage),
    backgroundPosition: 'center',
    backgroundColor: '#ffffff',
  }

  const halfStyle: React.CSSProperties = {
    position: 'relative',
    width: widthPx,
    height: heightPx,
    overflow: 'hidden',
    border: state.showBorder ? '1px solid #e0e0e0' : 'none',
    ...bgStyle,
  }

  return (
    <div>
      {/* A4 page wrapper — 명패 외 영역은 50% 투명으로 표시 */}
      <div style={{
        width: a4WPx,
        height: a4HPx,
        background: 'rgba(255,255,255,0.5)',
        boxShadow: '0 2px 14px rgba(0,0,0,0.18)',
        position: 'relative',
        flexShrink: 0,
      }}>
        {/* A4 size label */}
        <div style={{
          position: 'absolute', top: 4, right: 8,
          fontSize: 9, color: '#bbb', fontFamily: 'monospace', userSelect: 'none', zIndex: 5,
        }}>
          A4 {a4WMm}×{a4HMm}mm
        </div>

        {/* 명패 범위 표시 녹색 라인 (출력 무관) */}
        <div style={{
          position: 'absolute',
          left: offsetXPx,
          top: offsetYPx,
          width: scaledWidth,
          height: scaledHeight * 2,
          border: '1.5px dashed #22c55e',
          pointerEvents: 'none',
          zIndex: 10,
          boxSizing: 'border-box',
        }} />

        {/* Nameplate area, centered within A4 */}
        <div style={{ position: 'absolute', left: offsetXPx, top: offsetYPx }}>
          <div ref={canvasWrapperRef} style={{ width: scaledWidth, height: scaledHeight * 2, position: 'relative', overflow: 'hidden' }}>
            <div
              id="nameplate-export-container"
              style={{ position: 'absolute', top: 0, left: 0, transformOrigin: 'top left', transform: `scale(${scale})` }}
            >
              {/* ── Top half (rotated, static) ── */}
              <div style={{ ...halfStyle, transform: 'rotate(180deg)' }}>
                {renderItemsStatic(effectiveLayers, fields, overlayImages, previewData)}
              </div>

              {/* ── Bottom half (interactive) ── */}
              <div
                ref={bottomRef}
                style={halfStyle}
                onMouseDown={handleMarqueeMouseDown}
              >
                {effectiveLayers.map((id) => {
                  const field = fields.find((f) => f.id === id)
                  if (field) {
                    return (
                      <DraggableTextField
                        key={field.id}
                        field={field}
                        value={previewData[field.label] ?? ''}
                        isFocused={focusedFieldId === field.id}
                        isSelected={selectedIds.length > 1 && selectedIds.includes(field.id)}
                        onMove={handleMove}
                        onMoveRaw={onMove}
                        onResize={onResize}
                        onFocus={onFieldFocus}
                        onDragEnd={handleDragEnd}
                        onValueChange={onValueChange ? (v) => onValueChange(field.label, v) : undefined}
                        containerRef={bottomRef as React.RefObject<HTMLDivElement>}
                      />
                    )
                  }
                  const overlay = overlayImages.find((o) => o.id === id)
                  if (overlay && overlayMatchesRow(overlay, previewData)) {
                    return (
                      <DraggableOverlayImage
                        key={overlay.id}
                        image={overlay}
                        isFocused={focusedOverlayId === overlay.id}
                        isSelected={selectedIds.length > 1 && selectedIds.includes(overlay.id)}
                        onMove={onOverlayMove}
                        onResize={onOverlayResize}
                        onCrop={onOverlayCrop}
                        onFocus={onOverlayFocus}
                        containerRef={bottomRef as React.RefObject<HTMLDivElement>}
                      />
                    )
                  }
                  return null
                })}

                {/* 드래그 영역 선택 사각형 */}
                {marquee && (
                  <div
                    style={{
                      position: 'absolute',
                      left: `${marquee.x}%`,
                      top: `${marquee.y}%`,
                      width: `${marquee.width}%`,
                      height: `${marquee.height}%`,
                      border: '1px dashed #2563eb',
                      background: 'rgba(37, 99, 235, 0.12)',
                      pointerEvents: 'none',
                      zIndex: 20,
                    }}
                  />
                )}
              </div>
            </div>

            {/* Snap guide overlay (드래그 중 자동 정렬선) */}
            {guides.length > 0 && (
              <div style={{ position: 'absolute', left: 0, top: scaledHeight, width: scaledWidth, height: scaledHeight, pointerEvents: 'none', zIndex: 10 }}>
                {guides.map((guide, i) =>
                  guide.type === 'vertical' ? (
                    <div key={i} style={{ position: 'absolute', left: `${guide.position}%`, top: 0, bottom: 0, width: 1, background: guide.isCenter ? '#ef4444' : '#f97316' }}>
                      <span style={{ position: 'absolute', top: 3, left: 3, fontSize: 9, fontFamily: 'monospace', color: guide.isCenter ? '#ef4444' : '#ea580c', background: 'rgba(255,255,255,0.88)', padding: '0 2px', borderRadius: 2, whiteSpace: 'nowrap', lineHeight: 1.5 }}>
                        {((guide.position / 100) * size.widthMm).toFixed(1)}
                      </span>
                    </div>
                  ) : (
                    <div key={i} style={{ position: 'absolute', top: `${guide.position}%`, left: 0, right: 0, height: 1, background: guide.isCenter ? '#ef4444' : '#f97316' }}>
                      <span style={{ position: 'absolute', top: 3, left: 3, fontSize: 9, fontFamily: 'monospace', color: guide.isCenter ? '#ef4444' : '#ea580c', background: 'rgba(255,255,255,0.88)', padding: '0 2px', borderRadius: 2, whiteSpace: 'nowrap', lineHeight: 1.5 }}>
                        {((guide.position / 100) * size.heightMm).toFixed(1)}
                      </span>
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
