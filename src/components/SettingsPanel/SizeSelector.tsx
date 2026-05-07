'use client'
import { useState } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NameplateSize } from '@/types/nameplate'
import { NAMEPLATE_SIZES } from '@/lib/sizeConstants'

type Props = {
  value: NameplateSize
  onChange: (size: NameplateSize) => void
}

export function SizeSelector({ value, onChange }: Props) {
  const [customW, setCustomW] = useState(value.widthMm)
  const [customH, setCustomH] = useState(value.heightMm)

  const handleSelect = (label: string) => {
    const size = NAMEPLATE_SIZES.find((s) => s.label === label)
    if (size) onChange(size)
  }

  const handleCustomChange = (w: number, h: number) => {
    onChange({ label: '사용자 지정', widthMm: w, heightMm: h, isCustom: true })
  }

  return (
    <div className="space-y-2">
      <Label className="text-sm font-semibold">명패 규격</Label>
      <Select value={value.label} onValueChange={handleSelect}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {NAMEPLATE_SIZES.map((size) => (
            <SelectItem key={size.label} value={size.label}>
              {size.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {value.isCustom && (
        <div className="flex gap-2 mt-1">
          <div className="flex-1">
            <Label className="text-xs text-muted-foreground">가로 (mm)</Label>
            <Input
              type="number"
              min={50}
              max={500}
              value={customW}
              onChange={(e) => {
                const w = Number(e.target.value)
                setCustomW(w)
                handleCustomChange(w, customH)
              }}
            />
          </div>
          <div className="flex-1">
            <Label className="text-xs text-muted-foreground">세로 (mm)</Label>
            <Input
              type="number"
              min={20}
              max={300}
              value={customH}
              onChange={(e) => {
                const h = Number(e.target.value)
                setCustomH(h)
                handleCustomChange(customW, h)
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
