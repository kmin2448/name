'use client'
import { TextFieldConfig, OverlayImage } from '@/types/nameplate'
import { Label } from '@/components/ui/label'
import { Type, ArrowUp, ArrowDown } from 'lucide-react'

type Props = {
  layers: string[]
  fields: TextFieldConfig[]
  overlayImages: OverlayImage[]
  onMoveLayer: (id: string, direction: 'up' | 'down') => void
}

export function LayerPanel({ layers, fields, overlayImages, onMoveLayer }: Props) {
  if (layers.length === 0) return null

  // UI: top of list = topmost layer (reverse of internal array)
  const reversed = [...layers].reverse()

  return (
    <div className="space-y-2">
      <Label className="text-sm font-semibold">레이어 순서</Label>
      <p className="text-[11px] text-gray-400 leading-relaxed">
        위에 있을수록 화면 앞에 표시됩니다. ↑↓ 버튼으로 순서를 바꾸세요.
      </p>
      <div className="space-y-1">
        {reversed.map((id, displayIdx) => {
          const realIdx = layers.length - 1 - displayIdx
          const field = fields.find((f) => f.id === id)
          const overlay = overlayImages.find((o) => o.id === id)
          const label = field?.label ?? overlay?.name ?? id
          const isTop = realIdx === layers.length - 1
          const isBottom = realIdx === 0

          return (
            <div
              key={id}
              className="flex items-center gap-2 px-2 py-1.5 rounded bg-gray-50 border border-gray-100"
            >
              {/* Icon */}
              {field ? (
                <Type className="w-3 h-3 text-gray-400 shrink-0" />
              ) : overlay ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={overlay.src} alt="" className="w-5 h-5 object-cover rounded border border-gray-200 shrink-0" />
              ) : (
                <div className="w-3 h-3 shrink-0" />
              )}

              <span className="text-[11px] text-gray-700 flex-1 truncate">{label}</span>

              {/* Up / Down */}
              <div className="flex gap-0.5 shrink-0">
                <button
                  onClick={() => onMoveLayer(id, 'up')}
                  disabled={isTop}
                  className="w-5 h-5 flex items-center justify-center rounded text-gray-400 hover:text-[#475569] hover:bg-slate-100 disabled:opacity-25"
                  title="앞으로"
                >
                  <ArrowUp className="w-3 h-3" />
                </button>
                <button
                  onClick={() => onMoveLayer(id, 'down')}
                  disabled={isBottom}
                  className="w-5 h-5 flex items-center justify-center rounded text-gray-400 hover:text-[#475569] hover:bg-slate-100 disabled:opacity-25"
                  title="뒤로"
                >
                  <ArrowDown className="w-3 h-3" />
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
