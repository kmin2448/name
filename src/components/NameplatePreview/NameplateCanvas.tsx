'use client'
import { useRef, useState, useCallback } from 'react'
import { NameplateState, TextFieldConfig } from '@/types/nameplate'
import { DraggableTextField } from './DraggableTextField'
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

  // Snap center to canvas center
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

    // --- X axis: left edge, center, right edge ---
    const xCandidates: { snap: number; pos: number; delta: number }[] = [
      { snap: oX, pos: oX, delta: Math.abs(rawX - oX) },              // left-left
      { snap: oCX - widthPct / 2, pos: oCX, delta: Math.abs(centerX - oCX) },  // center-center
      { snap: oR - widthPct, pos: oR, delta: Math.abs(dragRight - oR) }, // right-right
    ].filter((c) => c.delta < SNAP_THRESHOLD)

    if (xCandidates.length > 0) {
      const best = xCandidates.reduce((a, b) => (a.delta < b.delta ? a : b))
      if (x === rawX) x = best.snap
      guides.push({ type: 'vertical', position: best.pos, isCenter: false })
    }

    // --- Y axis: top edge, center, bottom edge ---
    const yCandidates: { snap: number; pos: number; delta: number }[] = [
      { snap: oY, pos: oY, delta: Math.abs(rawY - oY) },                     // top-top
      { snap: oCY - heightPct / 2, pos: oCY, delta: Math.abs(centerY - oCY) }, // center-center
      { snap: oB - heightPct, pos: oB, delta: Math.abs(dragBottom - oB) },     // bottom-bottom
    ].filter((c) => c.delta < SNAP_THRESHOLD)

    if (yCandidates.length > 0) {
      const best = yCandidates.reduce((a, b) => (a.delta < b.delta ? a : b))
      if (y === rawY) y = best.snap
      guides.push({ type: 'horizontal', position: best.pos, isCenter: false })
    }
  }

  // Deduplicate guides
  const seen = new Set<string>()
  const deduped = guides.filter((g) => {
    const key = `${g.type}-${g.position}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  return {
    x: Math.max(0, Math.min(100 - widthPct, x)),
    y: Math.max(0, Math.min(100 - heightPct, y)),
    guides: deduped,
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
        {isMajor && mm > 0 && (
          <text x={x} y={RULER_SIZE - 14} textAnchor="middle" fontSize={7} fill="#777">{mm}</text>
        )}
      </g>
    )
  }
  return (
    <svg width={totalPx} height={RULER_SIZE} style={{ display: 'block', background: '#f6f6f6', borderBottom: '1px solid #d1d5db' }}>
      {ticks}
    </svg>
  )
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
        {isMajor && mm > 0 && (
          <text x={RULER_SIZE / 2} y={y + 3} textAnchor="middle" fontSize={7} fill="#777">{mm}</text>
        )}
      </g>
    )
  }
  return (
    <svg width={RULER_SIZE} height={totalPx} style={{ display: 'block', background: '#f6f6f6', borderRight: '1px solid #d1d5db' }}>
      {ticks}
    </svg>
  )
}

export function renderStaticFields(fields: TextFieldConfig[], data: Record<string, string>) {
  return fields.map((field) => {
    const justifyContent =
      field.textAlign === 'center' ? 'center' : field.textAlign === 'right' ? 'flex-end' : 'flex-start'
    return (
      <div
        key={field.id}
        style={{
          position: 'absolute',
          left: `${field.positionX}%`,
          top: `${field.positionY}%`,
          width: `${field.widthPct}%`,
          height: `${field.heightPct}%`,
          display: 'flex',
          alignItems: 'center',
          justifyContent,
          overflow: 'hidden',
          boxSizing: 'border-box',
        }}
      >
        <span
          style={{
            fontSize: `${field.fontSize}px`,
            fontWeight: field.fontWeight,
            fontFamily: field.fontFamily,
            textAlign: field.textAlign,
            color: field.color,
            whiteSpace: 'nowrap',
            lineHeight: 1.2,
            flexShrink: 0,
          }}
        >
          {data[field.label] ?? `[${field.label}]`}
        </span>
      </div>
    )
  })
}

type Props = {
  state: NameplateState
  overrideFields?: TextFieldConfig[]
  scale: number
  focusedFieldId: string | null
  onMove: (id: string, positionX: number, positionY: number) => void
  onResize: (id: string, widthPct: number, heightPct: number) => void
  onFieldFocus: (id: string) => void
}

export function NameplateCanvas({ state, overrideFields, scale, focusedFieldId, onMove, onResize, onFieldFocus }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const [showRuler, setShowRuler] = useState(false)
  const [guides, setGuides] = useState<GuideLine[]>([])

  const { size, backgroundImage, previewData } = state
  const fields = overrideFields ?? state.fields
  const widthPx = size.widthMm * MM_TO_PX
  const heightPx = size.heightMm * MM_TO_PX
  const scaledWidth = Math.round(widthPx * scale)
  const scaledHeight = Math.round(heightPx * scale)

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
    border: '1px solid #d1d5db',
    ...bgStyle,
  }

  return (
    <div>
      {/* Ruler toggle */}
      <div className="flex justify-end mb-2">
        <button
          onClick={() => setShowRuler((v) => !v)}
          className={`flex items-center gap-1 text-xs px-2 py-1 rounded border transition-colors ${
            showRuler
              ? 'bg-[#1F5C99] text-white border-[#1F5C99]'
              : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
          }`}
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
              <div style={{ ...halfStyle, transform: 'rotate(180deg)' }}>
                {renderStaticFields(fields, previewData)}
              </div>
              <div ref={bottomRef} style={halfStyle}>
                {fields.map((field) => (
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
                ))}
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
