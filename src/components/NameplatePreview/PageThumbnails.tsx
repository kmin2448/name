'use client'
import { useRef, useState, useEffect } from 'react'
import { Trash2 } from 'lucide-react'
import { TextFieldConfig, NameplateSize, OverlayImage } from '@/types/nameplate'
import { MM_TO_PX } from '@/lib/sizeConstants'
import { renderItemsStatic } from '@/components/NameplatePreview/NameplateCanvas'
import { getBackgroundImageCss, getBackgroundSize } from '@/lib/backgroundPresets'

const COLS = 2
const GAP = 8
const MAX_VISIBLE = 300

type Props = {
  rows: Record<string, string>[]
  fields: TextFieldConfig[]
  pageFieldOverrides: Record<number, Record<string, TextFieldConfig>>
  size: NameplateSize
  backgroundImage: string | null
  overlayImages: OverlayImage[]
  layers: string[]
  selectedIndex: number
  onSelect: (index: number) => void
  onDelete: (index: number) => void
}

function getEffectiveFields(
  globalFields: TextFieldConfig[],
  overrides?: Record<string, TextFieldConfig>
): TextFieldConfig[] {
  if (!overrides) return globalFields
  return globalFields.map((f) => overrides[f.id] ?? f)
}

function ThumbnailFace({
  row, fields, size, backgroundImage, overlayImages, layers, thumbWidth,
}: {
  row: Record<string, string>
  fields: TextFieldConfig[]
  size: NameplateSize
  backgroundImage: string | null
  overlayImages: OverlayImage[]
  layers: string[]
  thumbWidth: number
}) {
  const widthPx = size.widthMm * MM_TO_PX
  const heightPx = size.heightMm * MM_TO_PX
  const scale = thumbWidth / widthPx
  const thumbH = Math.round(heightPx * scale)

  const bgStyle: React.CSSProperties = {
    backgroundImage: getBackgroundImageCss(backgroundImage),
    backgroundSize: getBackgroundSize(backgroundImage),
    backgroundPosition: 'center',
    backgroundColor: '#ffffff',
  }

  return (
    <div style={{ width: thumbWidth, height: thumbH, position: 'relative', overflow: 'hidden', ...bgStyle }}>
      <div style={{
        position: 'absolute', top: 0, left: 0,
        transformOrigin: 'top left', transform: `scale(${scale})`,
        width: widthPx, height: heightPx,
      }}>
        {renderItemsStatic(layers, fields, overlayImages, row)}
      </div>
    </div>
  )
}

export function PageThumbnails({
  rows, fields, pageFieldOverrides, size, backgroundImage, overlayImages, layers, selectedIndex, onSelect, onDelete,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [thumbWidth, setThumbWidth] = useState(0)
  // 빈 명단 → 명단 업로드 시 컨테이너가 새로 마운트되므로 effect도 다시 실행해야 한다
  const hasRows = rows.length > 0

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => {
      const w = entry.contentRect.width
      setThumbWidth(Math.max(60, Math.floor((w - GAP * (COLS - 1)) / COLS)))
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasRows])

  if (!hasRows) return null

  const visible = rows.slice(0, MAX_VISIBLE)
  const overflow = rows.length - MAX_VISIBLE

  return (
    <div ref={containerRef} className="w-full mt-5">
      <p className="text-xs text-muted-foreground mb-2">
        총 {rows.length}명 · 썸네일 클릭 시 해당 페이지 미리보기
      </p>
      {thumbWidth > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${COLS}, 1fr)`, gap: GAP }}>
          {visible.map((row, i) => {
            const effectiveFields = getEffectiveFields(fields, pageFieldOverrides[i])
            const hasOverride = !!pageFieldOverrides[i] && Object.keys(pageFieldOverrides[i]).length > 0
            const isSelected = selectedIndex === i

            let outlineStyle: string
            if (isSelected) {
              outlineStyle = '2.5px solid #475569'
            } else if (hasOverride) {
              outlineStyle = '2px solid #f97316'
            } else {
              outlineStyle = '1.5px solid #e5e7eb'
            }

            return (
              <div
                key={i}
                onClick={() => onSelect(i)}
                className="group relative cursor-pointer rounded overflow-hidden transition-all"
                style={{ outline: outlineStyle, outlineOffset: 1 }}
              >
                <ThumbnailFace
                  row={row}
                  fields={effectiveFields}
                  size={size}
                  backgroundImage={backgroundImage}
                  overlayImages={overlayImages}
                  layers={layers}
                  thumbWidth={thumbWidth}
                />
                <span className="absolute bottom-1 left-1 px-1 rounded bg-black/45 text-white text-[10px] leading-4 tabular-nums pointer-events-none">
                  {i + 1}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation() // 썸네일 선택과 겹치지 않도록
                    onDelete(i)
                  }}
                  className="absolute top-1 right-1 w-5 h-5 flex items-center justify-center rounded bg-black/45 text-white opacity-0 group-hover:opacity-100 focus:opacity-100 hover:bg-red-500 transition-opacity"
                  title={`${i + 1}번 페이지 삭제`}
                  aria-label={`${i + 1}번 페이지 삭제`}
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            )
          })}
          {overflow > 0 && (
            <div className="flex items-center justify-center text-xs text-gray-400 py-4">+{overflow}명</div>
          )}
        </div>
      )}
    </div>
  )
}
