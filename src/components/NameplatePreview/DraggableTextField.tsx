'use client'
import { useRef, useCallback } from 'react'
import { TextFieldConfig } from '@/types/nameplate'

type Props = {
  field: TextFieldConfig
  value: string
  isFocused: boolean
  onMove: (id: string, positionX: number, positionY: number) => void
  onResize: (id: string, widthPct: number, heightPct: number) => void
  onFocus: (id: string) => void
  onDragEnd?: () => void
  containerRef: React.RefObject<HTMLDivElement>
}

export function DraggableTextField({
  field, value, isFocused, onMove, onResize, onFocus, onDragEnd, containerRef,
}: Props) {
  const isDragging = useRef(false)
  const isResizing = useRef(false)
  const startRef = useRef({ mouseX: 0, mouseY: 0, startX: 0, startY: 0, startW: 0, startH: 0 })

  const handleDragMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      onFocus(field.id)
      isDragging.current = true
      startRef.current = {
        mouseX: e.clientX,
        mouseY: e.clientY,
        startX: field.positionX,
        startY: field.positionY,
        startW: field.widthPct,
        startH: field.heightPct,
      }

      const handleMouseMove = (ev: MouseEvent) => {
        if (!isDragging.current || !containerRef.current) return
        const rect = containerRef.current.getBoundingClientRect()
        const dx = ((ev.clientX - startRef.current.mouseX) / rect.width) * 100
        const dy = ((ev.clientY - startRef.current.mouseY) / rect.height) * 100
        const newX = Math.max(0, Math.min(100 - startRef.current.startW, startRef.current.startX + dx))
        const newY = Math.max(0, Math.min(100 - startRef.current.startH, startRef.current.startY + dy))
        onMove(field.id, newX, newY)
      }

      const handleMouseUp = () => {
        isDragging.current = false
        onDragEnd?.()
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }

      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    },
    [field.id, field.positionX, field.positionY, field.widthPct, field.heightPct, onMove, onFocus, onDragEnd, containerRef]
  )

  const handleResizeMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      isResizing.current = true
      startRef.current = {
        mouseX: e.clientX,
        mouseY: e.clientY,
        startX: field.positionX,
        startY: field.positionY,
        startW: field.widthPct,
        startH: field.heightPct,
      }

      const handleMouseMove = (ev: MouseEvent) => {
        if (!isResizing.current || !containerRef.current) return
        const rect = containerRef.current.getBoundingClientRect()
        const dw = ((ev.clientX - startRef.current.mouseX) / rect.width) * 100
        const dh = ((ev.clientY - startRef.current.mouseY) / rect.height) * 100
        const newW = Math.max(5, Math.min(100 - startRef.current.startX, startRef.current.startW + dw))
        const newH = Math.max(5, Math.min(100 - startRef.current.startY, startRef.current.startH + dh))
        onResize(field.id, newW, newH)
      }

      const handleMouseUp = () => {
        isResizing.current = false
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }

      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    },
    [field.id, field.positionX, field.positionY, field.widthPct, field.heightPct, onResize, containerRef]
  )

  const justifyContent =
    field.textAlign === 'center' ? 'center' : field.textAlign === 'right' ? 'flex-end' : 'flex-start'

  return (
    <div
      onMouseDown={handleDragMouseDown}
      style={{
        position: 'absolute',
        left: `${field.positionX}%`,
        top: `${field.positionY}%`,
        width: `${field.widthPct}%`,
        height: `${field.heightPct}%`,
        cursor: 'move',
        boxSizing: 'border-box',
        border: isFocused
          ? '1.5px dashed #475569'
          : '1px dashed rgba(31, 92, 153, 0.25)',
        display: 'flex',
        alignItems: 'center',
        justifyContent,
        overflow: 'hidden',
        userSelect: 'none',
      }}
    >
      <span
        style={{
          fontSize: `${field.fontSize}px`,
          fontWeight: field.fontWeight,
          fontFamily: field.fontFamily,
          textAlign: field.textAlign,
          color: field.color,
          whiteSpace: 'nowrap',
          lineHeight: 1.2,
          pointerEvents: 'none',
          flexShrink: 0,
        }}
      >
        {value || `[${field.label}]`}
      </span>

      {isFocused && (
        <div
          onMouseDown={handleResizeMouseDown}
          style={{
            position: 'absolute',
            bottom: -4,
            right: -4,
            width: 9,
            height: 9,
            background: '#475569',
            cursor: 'nwse-resize',
            borderRadius: 2,
            zIndex: 1,
          }}
        />
      )}
    </div>
  )
}
