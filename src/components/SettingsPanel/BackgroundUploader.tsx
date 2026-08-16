'use client'
import { useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { BACKGROUND_PRESETS, isPresetBackground } from '@/lib/backgroundPresets'

const MAX_SIZE = 10 * 1024 * 1024

type Props = {
  value: string | null
  onChange: (image: string | null) => void
}

export function BackgroundUploader({ value, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const hasCustom = value !== null && !isPresetBackground(value)

  const handleFile = (file: File) => {
    if (file.size > MAX_SIZE) {
      toast.error('이미지 파일은 10MB 이하만 업로드 가능합니다.')
      return
    }
    // 새로고침 후에도 유지되고 PDF 출력/미리보기 창에서도 그대로 그려지도록 data URL로 저장
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') onChange(reader.result)
    }
    reader.onerror = () => toast.error('이미지를 읽지 못했습니다. 다시 시도해 주세요.')
    reader.readAsDataURL(file)
  }

  return (
    <div className="space-y-2">
      <Label className="text-sm font-semibold">배경 이미지</Label>

      <div className="space-y-1">
        <p className="text-xs text-gray-500">
          기본 배경은 상·하단 가로 전체에만 장식이 들어가 글씨와 겹치지 않습니다.
        </p>
        <div className="grid grid-cols-3 gap-1.5">
          <button
            type="button"
            onClick={() => onChange(null)}
            title="배경 없음"
            className={`rounded border overflow-hidden transition-colors ${
              value === null ? 'border-[#475569] ring-1 ring-[#475569]' : 'border-gray-200 hover:border-gray-400'
            }`}
          >
            <div className="h-9 flex items-center justify-center bg-white text-[10px] text-gray-400">
              없음
            </div>
            <div className="text-[10px] text-gray-600 py-0.5 border-t border-gray-100 truncate px-1">
              배경 없음
            </div>
          </button>

          {BACKGROUND_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => onChange(preset.src)}
              title={preset.description}
              className={`rounded border overflow-hidden transition-colors ${
                value === preset.src ? 'border-[#475569] ring-1 ring-[#475569]' : 'border-gray-200 hover:border-gray-400'
              }`}
            >
              <div
                className="h-9"
                style={{
                  backgroundImage: `url('${preset.src}')`,
                  backgroundSize: '100% 100%',
                  backgroundColor: '#ffffff',
                }}
              />
              <div className="text-[10px] text-gray-600 py-0.5 border-t border-gray-100 truncate px-1">
                {preset.name}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <Button variant="outline" className="flex-1 text-sm" onClick={() => inputRef.current?.click()}>
          {hasCustom ? '이미지 변경' : '직접 업로드'}
        </Button>
        {value && (
          <Button variant="ghost" size="sm" onClick={() => onChange(null)}>
            제거
          </Button>
        )}
      </div>

      {hasCustom && (
        <div className="space-y-1">
          <p className="text-[11px] text-gray-500">업로드한 배경 (채우기 방식으로 배치)</p>
          <div className="rounded border overflow-hidden h-14">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={value} alt="배경 미리보기" className="w-full h-full object-cover" />
          </div>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
          e.target.value = ''
        }}
      />
    </div>
  )
}
