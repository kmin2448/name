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

type Props = {
  fields: TextFieldConfig[]
  focusedId: string | null
  onUpdate: (field: TextFieldConfig) => void
  onRemove: (id: string) => void
  onAdd: () => void
}

export function TextFieldEditor({ fields, focusedId, onUpdate, onRemove, onAdd }: Props) {
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
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground w-10 shrink-0">크기</span>
              <Slider
                min={8}
                max={72}
                step={1}
                value={[field.fontSize]}
                onValueChange={([v]) => onUpdate({ ...field, fontSize: v })}
                className="flex-1"
              />
              <span className="text-xs w-8 text-right tabular-nums">{field.fontSize}px</span>
            </div>
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
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
