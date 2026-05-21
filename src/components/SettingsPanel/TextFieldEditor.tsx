'use client'
import { useState } from 'react'
import { TextFieldConfig } from '@/types/nameplate'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import { Toggle } from '@/components/ui/toggle'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Bold, AlignLeft, AlignCenter, AlignRight, X, Plus, ChevronDown, RotateCcw, Bookmark } from 'lucide-react'
import { useLocalFonts } from '@/hooks/useLocalFonts'

function FontSizeInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [draft, setDraft] = useState<string | null>(null)
  return (
    <input
      type="number"
      min={8}
      max={150}
      value={draft !== null ? draft : String(value)}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        if (draft !== null) {
          const v = parseInt(draft, 10)
          if (!isNaN(v)) onChange(Math.min(150, Math.max(8, v)))
          setDraft(null)
        }
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
      }}
      className="h-6 w-14 text-xs border border-input rounded px-1 text-right tabular-nums"
    />
  )
}

// 포커스 시 입력을 초기화해서 datalist가 모든 폰트를 표시하도록 함
function FontPicker({
  value,
  onChange,
  listId,
  fonts,
}: {
  value: string
  onChange: (v: string) => void
  listId: string
  fonts: string[]
}) {
  const [draft, setDraft] = useState<string | null>(null)
  const display = draft !== null ? draft : value

  return (
    <>
      <input
        list={listId}
        value={display}
        style={{ fontFamily: draft === null ? value : undefined }}
        onChange={(e) => {
          setDraft(e.target.value)
          if (e.target.value) onChange(e.target.value)
        }}
        onFocus={() => setDraft('')}
        onBlur={() => {
          if (draft !== null && draft.trim()) onChange(draft.trim())
          setDraft(null)
        }}
        className="h-7 text-xs w-full rounded border border-input px-2"
        placeholder={value}
        spellCheck={false}
      />
      <datalist id={listId}>
        {fonts.map((f) => (
          <option key={f} value={f} />
        ))}
      </datalist>
    </>
  )
}

type Props = {
  fields: TextFieldConfig[]
  focusedId: string | null
  onUpdate: (field: TextFieldConfig) => void
  onRemove: (id: string) => void
  onAdd: () => void
  onFocus?: (id: string) => void
  onReset?: () => void
  onSaveAsDefault?: () => void
}

export function TextFieldEditor({ fields, focusedId, onUpdate, onRemove, onAdd, onFocus, onReset, onSaveAsDefault }: Props) {
  const fonts = useLocalFonts()
  const [open, setOpen] = useState(true)

  return (
    <div className="space-y-2">
      {/* 첫 번째 줄: 섹션 토글 + 추가 버튼 */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-1.5 text-left"
        >
          <ChevronDown
            className="w-3.5 h-3.5 text-gray-400 shrink-0 transition-transform duration-200"
            style={{ transform: open ? 'rotate(0deg)' : 'rotate(-90deg)' }}
          />
          <span className="text-sm font-semibold text-gray-900">텍스트 항목</span>
        </button>
        <Button size="sm" variant="outline" onClick={onAdd}>
          <Plus className="w-3 h-3 mr-1" />
          추가
        </Button>
      </div>

      {/* 두 번째 줄: 기본값 관련 버튼 */}
      {(onSaveAsDefault || onReset) && (
        <div className="flex items-center gap-1.5">
          {onSaveAsDefault && (
            <Button
              size="sm"
              variant="outline"
              onClick={onSaveAsDefault}
              className="flex-1 text-xs text-blue-600 border-blue-300 hover:bg-blue-50 hover:text-blue-700"
              title="현재 설정을 기본값으로 저장 (앱 재시작 후에도 유지)"
            >
              <Bookmark className="w-3 h-3 mr-1" />
              기본값 저장
            </Button>
          )}
          {onReset && (
            <Button
              size="sm"
              variant="outline"
              onClick={onReset}
              className="flex-1 text-xs text-orange-600 border-orange-300 hover:bg-orange-50 hover:text-orange-700"
              title="저장된 기본값으로 초기화"
            >
              <RotateCcw className="w-3 h-3 mr-1" />
              초기화
            </Button>
          )}
        </div>
      )}

      {open && fields.map((field) => (
        <Card
          key={field.id}
          onClick={() => onFocus?.(field.id)}
          className={`transition-shadow cursor-pointer ${focusedId === field.id ? 'ring-2 ring-[#475569]' : 'hover:ring-1 hover:ring-gray-300'}`}
        >
          <CardHeader className="py-2 px-3 pb-0">
            <div className="flex items-center gap-2">
              <Input
                value={field.label}
                onChange={(e) => onUpdate({ ...field, label: e.target.value })}
                className="h-7 text-sm font-medium"
              />
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => onRemove(field.id)}
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="py-2 px-3 space-y-2">
            {/* Font family */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground w-10 shrink-0">폰트</span>
              <div className="flex-1">
                <FontPicker
                  value={field.fontFamily}
                  onChange={(v) => onUpdate({ ...field, fontFamily: v })}
                  listId={`fontlist-${field.id}`}
                  fonts={fonts}
                />
              </div>
            </div>

            {/* Font size */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground w-10 shrink-0">크기</span>
              <Slider
                min={8}
                max={150}
                step={1}
                value={[field.fontSize]}
                onValueChange={([v]) => onUpdate({ ...field, fontSize: v })}
                className="flex-1"
              />
              <FontSizeInput
                value={field.fontSize}
                onChange={(v) => onUpdate({ ...field, fontSize: v })}
              />
            </div>

            {/* Style + align + color */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground w-10 shrink-0">서식</span>
              <Toggle
                size="sm"
                pressed={field.fontWeight === 'bold'}
                onPressedChange={(p) => onUpdate({ ...field, fontWeight: p ? 'bold' : 'normal' })}
                className="h-7 w-7 p-0"
              >
                <Bold className="w-3 h-3" />
              </Toggle>
              <ToggleGroup
                type="single"
                value={field.textAlign}
                onValueChange={(v) => {
                  if (v) onUpdate({ ...field, textAlign: v as TextFieldConfig['textAlign'] })
                }}
                className="gap-0"
              >
                <ToggleGroupItem value="left" className="h-7 w-7 p-0">
                  <AlignLeft className="w-3 h-3" />
                </ToggleGroupItem>
                <ToggleGroupItem value="center" className="h-7 w-7 p-0">
                  <AlignCenter className="w-3 h-3" />
                </ToggleGroupItem>
                <ToggleGroupItem value="right" className="h-7 w-7 p-0">
                  <AlignRight className="w-3 h-3" />
                </ToggleGroupItem>
              </ToggleGroup>
              <input
                type="color"
                value={field.color}
                onChange={(e) => onUpdate({ ...field, color: e.target.value })}
                className="h-7 w-7 rounded cursor-pointer border border-input p-0.5"
                title="글자 색상"
              />
            </div>

            {/* Box size display */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground w-10 shrink-0">박스</span>
              <span className="text-xs text-gray-400 tabular-nums">
                W {field.widthPct.toFixed(0)}% · H {field.heightPct.toFixed(0)}%
                &nbsp;·&nbsp;X {field.positionX.toFixed(0)}% Y {field.positionY.toFixed(0)}%
              </span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
