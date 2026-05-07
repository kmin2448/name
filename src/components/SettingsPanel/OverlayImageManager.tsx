'use client'
import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { OverlayImage, ImageCondition, TextFieldConfig } from '@/types/nameplate'
import { ChevronDown, ChevronUp, Trash2, Upload } from 'lucide-react'

const MAX_SIZE = 10 * 1024 * 1024

type Props = {
  images: OverlayImage[]
  fields: TextFieldConfig[]
  excelRows: Record<string, string>[]
  onAdd: (image: OverlayImage) => void
  onUpdate: (image: OverlayImage) => void
  onRemove: (id: string) => void
}

function makeId() {
  return `overlay-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

function getUniqueValues(excelRows: Record<string, string>[], fieldLabel: string): string[] {
  const vals = excelRows.map((r) => r[fieldLabel] ?? '').filter(Boolean)
  return [...new Set(vals)].sort()
}

function ConditionEditor({
  condition,
  fields,
  excelRows,
  onChange,
}: {
  condition: ImageCondition
  fields: TextFieldConfig[]
  excelRows: Record<string, string>[]
  onChange: (c: ImageCondition) => void
}) {
  const currentFieldLabel = condition.type === 'field' ? condition.fieldLabel : (fields[0]?.label ?? '')
  const uniqueValues = getUniqueValues(excelRows, currentFieldLabel)

  const matchCount =
    condition.type === 'field' && condition.fieldValue
      ? excelRows.filter((r) => r[condition.fieldLabel] === condition.fieldValue).length
      : null

  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-gray-600">적용 범위</Label>
      <div className="flex text-xs border border-gray-200 rounded overflow-hidden">
        <button
          onClick={() => onChange({ type: 'all' })}
          className={`flex-1 py-1 transition-colors ${condition.type === 'all' ? 'bg-[#1F5C99] text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
        >
          전체 적용
        </button>
        <button
          onClick={() => onChange({ type: 'field', fieldLabel: fields[0]?.label ?? '', fieldValue: '' })}
          className={`flex-1 py-1 border-l border-gray-200 transition-colors ${condition.type === 'field' ? 'bg-[#1F5C99] text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
        >
          조건 적용
        </button>
      </div>

      {condition.type === 'field' && (
        <div className="space-y-1.5 pt-0.5">
          <div>
            <Label className="text-xs text-gray-500">속성</Label>
            <select
              value={condition.fieldLabel}
              onChange={(e) => onChange({ type: 'field', fieldLabel: e.target.value, fieldValue: '' })}
              className="w-full mt-0.5 h-7 text-xs border border-gray-200 rounded px-1.5 focus:outline-none focus:border-[#1F5C99] bg-white"
            >
              {fields.length === 0 && <option value="">— 항목 없음 —</option>}
              {fields.map((f) => (
                <option key={f.id} value={f.label}>{f.label}</option>
              ))}
            </select>
          </div>
          <div>
            <Label className="text-xs text-gray-500">값</Label>
            {excelRows.length > 0 ? (
              <select
                value={condition.fieldValue}
                onChange={(e) => onChange({ ...condition, fieldValue: e.target.value })}
                className="w-full mt-0.5 h-7 text-xs border border-gray-200 rounded px-1.5 focus:outline-none focus:border-[#1F5C99] bg-white"
              >
                <option value="">— 선택 —</option>
                {uniqueValues.map((v) => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={condition.fieldValue}
                onChange={(e) => onChange({ ...condition, fieldValue: e.target.value })}
                placeholder="값 직접 입력"
                className="w-full mt-0.5 h-7 text-xs border border-gray-200 rounded px-1.5 focus:outline-none focus:border-[#1F5C99]"
              />
            )}
            {matchCount !== null && excelRows.length > 0 && (
              <p className="text-xs text-[#1F5C99] mt-0.5">
                → {matchCount}개 페이지에 적용됨
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function SliderInput({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  onChange: (v: number) => void
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs text-gray-500 w-4 shrink-0">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={1}
        value={Math.round(value)}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1 h-1.5 accent-[#1F5C99]"
      />
      <input
        type="number"
        min={min}
        max={max}
        step={1}
        value={Math.round(value)}
        onChange={(e) => {
          const v = Number(e.target.value)
          if (!isNaN(v)) onChange(Math.min(max, Math.max(min, v)))
        }}
        className="w-10 h-5 text-xs border border-gray-200 rounded px-1 focus:outline-none text-center"
      />
      <span className="text-xs text-gray-400 shrink-0">%</span>
    </div>
  )
}

function PositionSizeEditor({ image, onChange }: { image: OverlayImage; onChange: (img: OverlayImage) => void }) {
  const update = (key: 'positionX' | 'positionY' | 'widthPct' | 'heightPct', v: number) =>
    onChange({ ...image, [key]: v })

  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-gray-600">위치 / 크기</Label>
      <SliderInput label="X" value={image.positionX} min={0} max={95} onChange={(v) => update('positionX', v)} />
      <SliderInput label="Y" value={image.positionY} min={0} max={95} onChange={(v) => update('positionY', v)} />
      <SliderInput label="W" value={image.widthPct} min={5} max={100} onChange={(v) => update('widthPct', v)} />
      <SliderInput label="H" value={image.heightPct} min={5} max={100} onChange={(v) => update('heightPct', v)} />
    </div>
  )
}

export function OverlayImageManager({ images, fields, excelRows, onAdd, onUpdate, onRemove }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const handleFile = (file: File) => {
    if (file.size > MAX_SIZE) {
      toast.error('이미지 파일은 10MB 이하만 업로드 가능합니다.')
      return
    }
    const reader = new FileReader()
    reader.onload = (e) => {
      const src = e.target?.result as string
      const newImg: OverlayImage = {
        id: makeId(),
        src,
        name: file.name,
        positionX: 10,
        positionY: 10,
        widthPct: 30,
        heightPct: 30,
        condition: { type: 'all' },
      }
      onAdd(newImg)
      setExpandedId(newImg.id)
    }
    reader.readAsDataURL(file)
  }

  return (
    <div className="space-y-2">
      <Button
        variant="outline"
        className="w-full text-sm"
        onClick={() => inputRef.current?.click()}
      >
        <Upload className="w-3.5 h-3.5 mr-1.5" />
        이미지 추가
      </Button>
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

      {images.length === 0 && (
        <p className="text-xs text-gray-400 text-center py-2">추가된 이미지 없음</p>
      )}

      <div className="space-y-2">
        {images.map((img) => {
          const isExpanded = expandedId === img.id
          const conditionLabel =
            img.condition.type === 'all'
              ? '전체'
              : img.condition.fieldValue
              ? `${img.condition.fieldLabel}="${img.condition.fieldValue}"`
              : `${img.condition.fieldLabel} (미설정)`
          return (
            <div key={img.id} className="border rounded-lg overflow-hidden">
              <div className="flex items-center gap-2 px-2.5 py-1.5 bg-gray-50">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.src} alt="" className="w-8 h-8 object-cover rounded border border-gray-200 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-700 truncate">{img.name}</p>
                  <p className="text-[10px] text-gray-400 truncate">{conditionLabel}</p>
                </div>
                <button
                  onClick={() => setExpandedId(isExpanded ? null : img.id)}
                  className="text-gray-400 hover:text-gray-600 shrink-0"
                >
                  {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={() => onRemove(img.id)}
                  className="text-gray-400 hover:text-red-500 shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {isExpanded && (
                <div className="px-2.5 py-2.5 space-y-3 bg-white border-t border-gray-100">
                  <PositionSizeEditor image={img} onChange={onUpdate} />
                  <ConditionEditor
                    condition={img.condition}
                    fields={fields}
                    excelRows={excelRows}
                    onChange={(c) => onUpdate({ ...img, condition: c })}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
