'use client'
import { useRef, useState, useCallback } from 'react'
import { NameplateState, TextFieldConfig, OverlayImage } from '@/types/nameplate'
import { DraggableTextField } from './DraggableTextField'
import { DraggableOverlayImage } from './DraggableOverlayImage'
import { MM_TO_PX } from '@/lib/sizeConstants'
import { Ruler } from 'lucide-react'

const RULER_SIZE = 24
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

function HRuler({ totalPx, totalMm }: { totalPx: number; totalMm: number }) {
  const mmPx = totalPx / totalMm
  const ticks: React.ReactNode[] = []
  for (let mm = 0; mm <= totalMm; mm++) {
    const x = mm * mmPx
    const isMajor = mm % 10 === 0
    const isMid = mm % 5 === 0
    const tickH = isMajor ? 12 : isMid ? 8 : 4
    ticks.push(
      <g key={mm}>
        <line x1={x} y1={RULER_SIZE} x2={x} y2={RULER_SIZE - tickH} stroke="#999" strokeWidth={0.5} />
        {isMajor && mm > 0 && <text x={x} y={RULER_SIZE - 14} textAnchor="middle" fontSize={7} fill="#777">{mm}</text>}
      </g>
    )
  }
  return <svg width={totalPx} height={RULER_SIZE} style={{ display: 'block', background: '#f6f6f6', borderBottom: '1px solid #d1d5db' }}>{ticks}</svg>
}

function VRuler({ totalPx, totalMm }: { totalPx: number; totalMm: number }) {
  const mmPx = totalPx / totalMm
  const ticks: React.ReactNode[] = []
  for (let mm = 0; mm <= totalMm; mm++) {
    const y = mm * mmPx
    const isMajor = mm % 10 === 0
    const isMid = mm % 5 === 0
    const tickW = isMajor ? 12 : isMid ? 8 : 4
    ticks.push(
      <g key={mm}>
        <line x1={RULER_SIZE} y1={y} x2={RULER_SIZE - tickW} y2={y} stroke="#999" strokeWidth={0.5} />
        {isMajor && mm > 0 && <text x={RULER_SIZE / 2} y={y + 3} textAnchor="middle" fontSize={7} fill="#777">{mm}</text>}
      </g>
    )
  }
  return <svg width={RULER_SIZE} height={totalPx} style={{ display: 'block', background: '#f6f6f6', borderRight: '1px solid #d1d5db' }}>{ticks}</svg>
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
  const justifyContent =
    field.textAlign === 'center' ? 'center' : field.textAlign === 'right' ? 'flex-end' : 'flex-start'
  return (
    <div
      key={field.id}
      style={{
        position: 'absolute',
        left: `${field.positionX}%`, top: `${field.positionY}%`,
        width: `${field.widthPct}%`, height: `${field.heightPct}%`,
        display: 'flex', alignItems: 'center', justifyContent,
        overflow: 'hidden', boxSizing: 'border-box',
      }}
    >
      <span style={{
        fontSize: `${field.fontSize}px`, fontWeight: field.fontWeight,
        fontFamily: field.fontFamily, textAlign: field.textAlign,
        color: field.color, whiteSpace: 'nowrap', lineHeight: 1.2, flexShrink: 0,
      }}>
        {data[field.label] ?? `[${field.label}]`}
      </span>
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
  onMove: (id: string, positionX: number, positionY: number) => void
  onResize: (id: string, widthPct: number, heightPct: number) => void
  onFieldFocus: (id: string) => void
  onOverlayFocus: (id: string) => void
  onOverlayMove: (id: string, x: number, y: number) => void
  onOverlayResize: (id: string, w: number, h: number) => void
  onOverlayCrop: (id: string, cropX: number, cropY: number, cropW: number, cropH: number) => void
  onDeselect: () => void
}

export function NameplateCanvas({
  state, overrideFields, scale,
  focusedFieldId, focusedOverlayId,
  onMove, onResize, onFieldFocus,
  onOverlayFocus, onOverlayMove, onOverlayResize, onOverlayCrop,
  onDeselect,
}: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const [showRuler, setShowRuler] = useState(false)
  const [guides, setGuides] = useState<GuideLine[]>([])

  const { size, backgroundImage, overlayImages, previewData, layers } = state
  const fields = overrideFields ?? state.fields
  const widthPx = size.widthMm * MM_TO_PX
  const heightPx = size.heightMm * MM_TO_PX
  const scaledWidth = Math.round(widthPx * scale)
  const scaledHeight = Math.round(heightPx * scale)

  const effectiveLayers = layers.length > 0 ? layers : fields.map((f) => f.id)

  const handleMove = useCallback(
    (id: string, rawX: number, rawY: number) => {
      const field = fields.find((f) => f.id === id)
      if (!field) return
      const { x, y, guides: newGuides } = calcSnap(rawX, rawY, id, fields, field.widthPct, field.heightPct)
      setGuides(newGuides)
      onMove(id, x, y)
    },
    [fields, onMove]
  )

  const handleDragEnd = useCallback(() => setGuides([]), [])

  const bgStyle: React.CSSProperties = {
    backgroundImage: backgroundImage ? `url(${backgroundImage})` : undefined,
    backgroundSize: 'cover',
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
      <div className="flex justify-end mb-2">
        <button
          onClick={() => setShowRuler((v) => !v)}
          className={`flex items-center gap-1 text-xs px-2 py-1 rounded border transition-colors ${showRuler ? 'bg-[#475569] text-white border-[#475569]' : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'}`}
        >
          <Ruler className="w-3 h-3" />
          눈금자
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-start' }}>
        {showRuler && (
          <div style={{ display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
            <div style={{ width: RULER_SIZE, height: RULER_SIZE + scaledHeight, background: '#f6f6f6', borderRight: '1px solid #d1d5db' }} />
            <VRuler totalPx={scaledHeight} totalMm={size.heightMm} />
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {showRuler && <HRuler totalPx={scaledWidth} totalMm={size.widthMm} />}

          <div style={{ width: scaledWidth, height: scaledHeight * 2, position: 'relative', overflow: 'hidden' }}>
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
                onClick={(e) => { if (e.target === bottomRef.current) onDeselect() }}
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
                        onMove={handleMove}
                        onResize={onResize}
                        onFocus={onFieldFocus}
                        onDragEnd={handleDragEnd}
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
              </div>
            </div>

            {/* Guide overlay */}
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
