'use client'
import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { ChevronDown } from 'lucide-react'
import { BACKGROUND_PRESETS, isPresetBackground } from '@/lib/backgroundPresets'
import { composeBandedBackground } from '@/lib/backgroundCompose'
import { PixabaySearchModal, BackgroundApplyMode } from './PixabaySearchModal'
import { NameplateSize, TextFieldConfig } from '@/types/nameplate'

const MAX_SIZE = 10 * 1024 * 1024

// 접힘 상태를 localStorage에 기억하는 접이식 섹션 (기본: 닫힘)
function CollapsibleSection({
  storageKey,
  title,
  children,
}: {
  storageKey: string
  title: string
  children: React.ReactNode
}) {
  const [open, setOpen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    try {
      return localStorage.getItem(storageKey) === '1'
    } catch {
      return false
    }
  })

  const toggle = () => {
    setOpen((v) => {
      const next = !v
      try {
        localStorage.setItem(storageKey, next ? '1' : '0')
      } catch {
        // localStorage 사용 불가 환경에서는 무시
      }
      return next
    })
  }

  return (
    <div className="space-y-1.5">
      <button type="button" onClick={toggle} className="flex items-center gap-1.5 w-full text-left">
        <ChevronDown
          className="w-3.5 h-3.5 text-gray-400 shrink-0 transition-transform duration-200"
          style={{ transform: open ? 'rotate(0deg)' : 'rotate(-90deg)' }}
        />
        <span className="text-xs font-semibold text-gray-700">{title}</span>
      </button>
      {open && children}
    </div>
  )
}

type Props = {
  value: string | null
  onChange: (image: string | null) => void
  size: NameplateSize
  fields: TextFieldConfig[]
  previewData: Record<string, string>
}

export function BackgroundUploader({ value, onChange, size, fields, previewData }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [applyMode, setApplyMode] = useState<BackgroundApplyMode>('cover')
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const hasCustom = value !== null && !isPresetBackground(value)
  const isBandedCustom = hasCustom && value.startsWith('data:image/svg+xml')

  const applyImage = (dataUrl: string) => {
    onChange(applyMode === 'band' ? composeBandedBackground(dataUrl, size.heightMm) : dataUrl)
  }

  const handleFile = (file: File) => {
    if (file.size > MAX_SIZE) {
      toast.error('이미지 파일은 10MB 이하만 업로드 가능합니다.')
      return
    }
    // 새로고침 후에도 유지되고 PDF 출력/미리보기 창에서도 그대로 그려지도록 data URL로 저장
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') applyImage(reader.result)
    }
    reader.onerror = () => toast.error('이미지를 읽지 못했습니다. 다시 시도해 주세요.')
    reader.readAsDataURL(file)
  }

  return (
    <div className="space-y-2.5">
      <Label className="text-sm font-semibold">배경 이미지</Label>

      <CollapsibleSection storageKey="nameplate_section_bg_presets" title="기본 제공 배경">
        <div className="space-y-1">
          <p className="text-[11px] text-gray-500">
            상·하단 가로 전체에만 장식이 들어가 글씨와 겹치지 않습니다.
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
      </CollapsibleSection>

      <CollapsibleSection storageKey="nameplate_section_bg_photo" title="사진 배경 (업로드 · 픽사베이)">
        <div className="space-y-2">
          {/* 사진 적용 방식 */}
          <div className="flex text-xs border border-gray-200 rounded overflow-hidden">
            <button
              type="button"
              onClick={() => setApplyMode('cover')}
              className={`flex-1 py-1 transition-colors ${applyMode === 'cover' ? 'bg-[#475569] text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
            >
              전체 채우기
            </button>
            <button
              type="button"
              onClick={() => setApplyMode('band')}
              title="사진을 상·하단 띠에만 배치해 글씨와 겹치지 않습니다"
              className={`flex-1 py-1 border-l border-gray-200 transition-colors ${applyMode === 'band' ? 'bg-[#475569] text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
            >
              상·하단 띠 (간섭 없음)
            </button>
          </div>

          {/* 동일 너비 3버튼: 한 줄 배치 */}
          <div className="grid grid-cols-3 gap-1.5">
            <Button
              variant="outline"
              className="h-8 px-1 text-xs w-full"
              onClick={() => inputRef.current?.click()}
            >
              직접 업로드
            </Button>
            <Button
              variant="outline"
              className="h-8 px-1 text-xs w-full"
              onClick={() => setIsSearchOpen(true)}
            >
              픽사베이 검색
            </Button>
            <Button
              variant="outline"
              className="h-8 px-1 text-xs w-full text-destructive hover:text-destructive disabled:opacity-40"
              disabled={value === null}
              onClick={() => onChange(null)}
            >
              제거
            </Button>
          </div>

          {hasCustom && (
            <div className="space-y-1">
              <p className="text-[11px] text-gray-500">
                {isBandedCustom ? '적용된 배경 (상·하단 띠)' : '적용된 배경 (채우기 방식으로 배치)'}
              </p>
              <div className="rounded border overflow-hidden h-14 bg-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={value}
                  alt="배경 미리보기"
                  className={isBandedCustom ? 'w-full h-full' : 'w-full h-full object-cover'}
                />
              </div>
            </div>
          )}
        </div>
      </CollapsibleSection>

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

      {isSearchOpen && (
        <PixabaySearchModal
          initialMode={applyMode}
          size={size}
          fields={fields}
          previewData={previewData}
          onApply={onChange}
          onClose={() => setIsSearchOpen(false)}
        />
      )}
    </div>
  )
}
