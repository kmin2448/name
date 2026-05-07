'use client'
import { useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

const MAX_SIZE = 10 * 1024 * 1024

type Props = {
  value: string | null
  onChange: (image: string | null) => void
}

export function BackgroundUploader({ value, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = (file: File) => {
    if (file.size > MAX_SIZE) {
      toast.error('이미지 파일은 10MB 이하만 업로드 가능합니다.')
      return
    }
    const url = URL.createObjectURL(file)
    onChange(url)
  }

  return (
    <div className="space-y-2">
      <Label className="text-sm font-semibold">배경 이미지</Label>
      <div className="flex gap-2">
        <Button variant="outline" className="flex-1 text-sm" onClick={() => inputRef.current?.click()}>
          {value ? '이미지 변경' : '이미지 업로드'}
        </Button>
        {value && (
          <Button variant="ghost" size="sm" onClick={() => onChange(null)}>
            제거
          </Button>
        )}
      </div>
      {value && (
        <div className="rounded border overflow-hidden h-14">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="배경 미리보기" className="w-full h-full object-cover" />
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
