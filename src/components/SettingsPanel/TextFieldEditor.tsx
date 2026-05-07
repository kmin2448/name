'use client'
import { TextFieldConfig } from '@/types/nameplate'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Toggle } from '@/components/ui/toggle'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Bold, AlignLeft, AlignCenter, AlignRight, X, Plus } from 'lucide-react'
import { useLocalFonts } from '@/hooks/useLocalFonts'

type Props = {
  fields: TextFieldConfig[]
  focusedId: string | null
  onUpdate: (field: TextFieldConfig) => void
  onRemove: (id: string) => void
  onAdd: () => void
}

export function TextFieldEditor({ fields, focusedId, onUpdate, onRemove, onAdd }: Props) {
  const fonts = useLocalFonts()

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-semibold">텍스트 항목</Label>
        <Button size="sm" variant="outline" onClick={onAdd}>
          <Plus className="w-3 h-3 mr-1" />
          추가
        </Button>
      </div>

      {fields.map((field) => (
        <Card
          key={field.id}
          className={`transition-shadow ${focusedId === field.id ? 'ring-2 ring-[#1F5C99]' : ''}`}
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
                <input
                  list={`fontlist-${field.id}`}
                  value={field.fontFamily}
                  onChange={(e) => onUpdate({ ...field, fontFamily: e.target.value })}
                  className="h-7 text-xs w-full rounded border border-input px-2"
                  style={{ fontFamily: field.fontFamily }}
                  placeholder="폰트 이름..."
                  spellCheck={false}
                />
                <datalist id={`fontlist-${field.id}`}>
                  {fonts.map((f) => (
                    <option key={f} value={f} />
                  ))}
                </datalist>
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
              <span className="text-xs w-8 text-right tabular-nums">{field.fontSize}px</span>
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
