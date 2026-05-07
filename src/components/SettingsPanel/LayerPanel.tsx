'use client'
import { useRef, useState } from 'react'
import { TextFieldConfig, OverlayImage } from '@/types/nameplate'
import { Type, GripVertical, ChevronDown } from 'lucide-react'

type Props = {
  layers: string[]
  fields: TextFieldConfig[]
  overlayImages: OverlayImage[]
  onSetLayers: (newLayers: string[]) => void
}

export function LayerPanel({ layers, fields, overlayImages, onSetLayers }: Props) {
  const [open, setOpen] = useState(true)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const dragIndexRef = useRef<number | null>(null)

  if (layers.length === 0) return null

  // Display order: topmost layer first (reversed from internal array)
  const reversed = [...layers].reverse()

  const handleDragStart = (e: React.DragEvent, displayIdx: number) => {
    dragIndexRef.current = displayIdx
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent, displayIdx: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (dragOverIndex !== displayIdx) setDragOverIndex(displayIdx)
  }

  const handleDrop = (e: React.DragEvent, displayIdx: number) => {
    e.preventDefault()
    const from = dragIndexRef.current
    if (from === null || from === displayIdx) {
      setDragOverIndex(null)
      return
    }
    const next = [...reversed]
    const [item] = next.splice(from, 1)
    next.splice(displayIdx, 0, item)
    onSetLayers([...next].reverse())
    dragIndexRef.current = null
    setDragOverIndex(null)
  }

  const handleDragEnd = () => {
    dragIndexRef.current = null
    setDragOverIndex(null)
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 w-full text-left"
      >
        <ChevronDown
          className="w-3.5 h-3.5 text-gray-400 shrink-0 transition-transform duration-200"
          style={{ transform: open ? 'rotate(0deg)' : 'rotate(-90deg)' }}
        />
        <span className="text-sm font-semibold text-gray-900">레이어 순서</span>
      </button>

      {open && (
        <div className="space-y-1">
          <p className="text-[11px] text-gray-400 leading-relaxed">
            위에 있을수록 화면 앞에 표시됩니다. 핸들을 드래그해 순서를 바꾸세요.
          </p>
          {reversed.map((id, displayIdx) => {
            const field = fields.find((f) => f.id === id)
            const overlay = overlayImages.find((o) => o.id === id)
            const label = field?.label ?? overlay?.name ?? id
            const isDropTarget = dragOverIndex === displayIdx && dragIndexRef.current !== displayIdx

            return (
              <div
                key={id}
                draggable
                onDragStart={(e) => handleDragStart(e, displayIdx)}
                onDragOver={(e) => handleDragOver(e, displayIdx)}
                onDrop={(e) => handleDrop(e, displayIdx)}
                onDragEnd={handleDragEnd}
                className="flex items-center gap-2 px-2 py-1.5 rounded bg-gray-50 border border-gray-100 select-none"
                style={{
                  cursor: 'grab',
                  borderTopColor: isDropTarget ? '#475569' : undefined,
                  borderTopWidth: isDropTarget ? 2 : undefined,
                }}
              >
                <GripVertical className="w-3.5 h-3.5 text-gray-300 shrink-0" />

                {field ? (
                  <Type className="w-3 h-3 text-gray-400 shrink-0" />
                ) : overlay ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={overlay.src} alt="" className="w-5 h-5 object-cover rounded border border-gray-200 shrink-0" />
                ) : (
                  <div className="w-3 h-3 shrink-0" />
                )}

                <span className="text-[11px] text-gray-700 flex-1 truncate">{label}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
