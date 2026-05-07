'use client'
import { useRef } from 'react'
import { NameplateState, TextFieldConfig } from '@/types/nameplate'
import { DraggableTextField } from './DraggableTextField'
import { MM_TO_PX } from '@/lib/sizeConstants'

type Props = {
  state: NameplateState
  scale: number
  onMove: (id: string, positionX: number, positionY: number) => void
  onFieldFocus: (id: string) => void
}

function renderStaticFields(fields: TextFieldConfig[], data: Record<string, string>) {
  return fields.map((field) => (
    <div
      key={field.id}
      style={{
        position: 'absolute',
        left: `${field.positionX}%`,
        top: `${field.positionY}%`,
        transform: 'translate(-50%, -50%)',
        fontSize: `${field.fontSize}px`,
        fontWeight: field.fontWeight,
        textAlign: field.textAlign,
        color: field.color,
        whiteSpace: 'nowrap',
        lineHeight: 1.2,
      }}
    >
      {data[field.label] ?? `[${field.label}]`}
    </div>
  ))
}

export function NameplateCanvas({ state, scale, onMove, onFieldFocus }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const { size, backgroundImage, fields, previewData } = state

  const widthPx = size.widthMm * MM_TO_PX
  const heightPx = size.heightMm * MM_TO_PX

  const bgStyle: React.CSSProperties = {
    backgroundImage: backgroundImage ? `url(${backgroundImage})` : undefined,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundColor: '#ffffff',
  }

  const halfStyle: React.CSSProperties = {
    position: 'relative',
    width: widthPx,
    height: heightPx,
    overflow: 'hidden',
    border: '1px solid #d1d5db',
    ...bgStyle,
  }

  return (
    <div
      style={{
        width: Math.round(widthPx * scale),
        height: Math.round(heightPx * 2 * scale),
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        id="nameplate-export-container"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          transformOrigin: 'top left',
          transform: `scale(${scale})`,
        }}
      >
        {/* 상단: 180° 회전 — 접었을 때 뒷면 */}
        <div style={{ ...halfStyle, transform: 'rotate(180deg)' }}>
          {renderStaticFields(fields, previewData)}
        </div>

        {/* 하단: 정방향 — 접었을 때 앞면, 드래그 가능 */}
        <div ref={bottomRef} style={halfStyle}>
          {fields.map((field) => (
            <DraggableTextField
              key={field.id}
              field={field}
              value={previewData[field.label] ?? ''}
              onMove={onMove}
              onFocus={onFieldFocus}
              containerRef={bottomRef as React.RefObject<HTMLDivElement>}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
