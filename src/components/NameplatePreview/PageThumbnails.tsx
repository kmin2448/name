'use client'
import { useRef, useState, useEffect } from 'react'
import { TextFieldConfig, NameplateSize } from '@/types/nameplate'
import { MM_TO_PX } from '@/lib/sizeConstants'

const COLS = 4
const GAP = 8
const MAX_VISIBLE = 300

type Props = {
  rows: Record<string, string>[]
  fields: TextFieldConfig[]
  size: NameplateSize
  backgroundImage: string | null
  selectedIndex: number
  onSelect: (index: number) => void
}

function getLabel(row: Record<string, string>, fields: TextFieldConfig[]): string {
  const nameField = fields.find((f) => f.label === '이름')
  if (nameField && row[nameField.label]) return row[nameField.label]
  for (const field of fields) {
    if (row[field.label]) return row[field.label]
  }
  return '—'
}

function ThumbnailFace({
  row,
  fields,
  size,
  backgroundImage,
  thumbWidth,
}: {
  row: Record<string, string>
  fields: TextFieldConfig[]
  size: NameplateSize
  backgroundImage: string | null
  thumbWidth: number
}) {
  const widthPx = size.widthMm * MM_TO_PX
  const heightPx = size.heightMm * MM_TO_PX
  const scale = thumbWidth / widthPx
  const thumbH = Math.round(heightPx * scale)

  const bgStyle: React.CSSProperties = {
    backgroundImage: backgroundImage ? `url(${backgroundImage})` : undefined,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundColor: '#ffffff',
  }

  return (
    <div style={{ width: thumbWidth, height: thumbH, position: 'relative', overflow: 'hidden', ...bgStyle }}>
      <div style={{ position: 'absolute', top: 0, left: 0, transformOrigin: 'top left', transform: `scale(${scale})`, width: widthPx, height: heightPx }}>
        {fields.map((field) => {
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
                {row[field.label] ?? ''}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function PageThumbnails({ rows, fields, size, backgroundImage, selectedIndex, onSelect }: Props) {
  if (rows.length === 0) return null

  const containerRef = useRef<HTMLDivElement>(null)
  const [thumbWidth, setThumbWidth] = useState(0)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => {
      const w = entry.contentRect.width
      const computed = Math.floor((w - GAP * (COLS - 1)) / COLS)
      setThumbWidth(Math.max(60, computed))
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const visible = rows.slice(0, MAX_VISIBLE)
  const overflow = rows.length - MAX_VISIBLE

  return (
    <div ref={containerRef} className="w-full mt-5">
      <p className="text-xs text-muted-foreground mb-2">
        총 {rows.length}명 · 썸네일 클릭 시 해당 페이지 미리보기
      </p>
      {thumbWidth > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${COLS}, 1fr)`,
            gap: GAP,
          }}
        >
          {visible.map((row, i) => (
            <div
              key={i}
              onClick={() => onSelect(i)}
              className="cursor-pointer rounded overflow-hidden transition-all"
              style={{
                outline: selectedIndex === i ? '2.5px solid #1F5C99' : '1.5px solid #e5e7eb',
                outlineOffset: 1,
              }}
            >
              <ThumbnailFace row={row} fields={fields} size={size} backgroundImage={backgroundImage} thumbWidth={thumbWidth} />
              <div
                className="text-center bg-white border-t border-gray-100 text-gray-500"
                style={{ fontSize: 9, padding: '2px 4px', lineHeight: 1.5, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}
              >
                {i + 1}. {getLabel(row, fields)}
              </div>
            </div>
          ))}
          {overflow > 0 && (
            <div className="flex items-center justify-center text-xs text-gray-400 py-4">
              +{overflow}명
            </div>
          )}
        </div>
      )}
    </div>
  )
}
