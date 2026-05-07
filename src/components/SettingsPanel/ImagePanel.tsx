'use client'
import { useState } from 'react'
import { BackgroundUploader } from './BackgroundUploader'
import { OverlayImageManager } from './OverlayImageManager'
import { OverlayImage, TextFieldConfig } from '@/types/nameplate'
import { Label } from '@/components/ui/label'

type Props = {
  backgroundImage: string | null
  onBackgroundChange: (image: string | null) => void
  overlayImages: OverlayImage[]
  fields: TextFieldConfig[]
  excelRows: Record<string, string>[]
  onAddOverlay: (image: OverlayImage) => void
  onUpdateOverlay: (image: OverlayImage) => void
  onRemoveOverlay: (id: string) => void
}

export function ImagePanel({
  backgroundImage,
  onBackgroundChange,
  overlayImages,
  fields,
  excelRows,
  onAddOverlay,
  onUpdateOverlay,
  onRemoveOverlay,
}: Props) {
  const [tab, setTab] = useState<'background' | 'overlay'>('background')

  return (
    <div className="space-y-2">
      <Label className="text-sm font-semibold">이미지</Label>
      <div className="flex text-xs border border-gray-200 rounded overflow-hidden">
        <button
          onClick={() => setTab('background')}
          className={`flex-1 py-1 transition-colors ${tab === 'background' ? 'bg-[#475569] text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
        >
          배경 이미지
        </button>
        <button
          onClick={() => setTab('overlay')}
          className={`flex-1 py-1 border-l border-gray-200 transition-colors flex items-center justify-center gap-1 ${tab === 'overlay' ? 'bg-[#475569] text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
        >
          오버레이 이미지
          {overlayImages.length > 0 && (
            <span
              className={`text-[10px] rounded px-1 font-semibold ${tab === 'overlay' ? 'bg-white/20' : 'bg-[#f1f5f9] text-[#475569]'}`}
            >
              {overlayImages.length}
            </span>
          )}
        </button>
      </div>

      {tab === 'background' && (
        <BackgroundUploader value={backgroundImage} onChange={onBackgroundChange} />
      )}
      {tab === 'overlay' && (
        <OverlayImageManager
          images={overlayImages}
          fields={fields}
          excelRows={excelRows}
          onAdd={onAddOverlay}
          onUpdate={onUpdateOverlay}
          onRemove={onRemoveOverlay}
        />
      )}
    </div>
  )
}
