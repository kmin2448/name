'use client'
import { useRef, useCallback } from 'react'
import { TextFieldConfig } from '@/types/nameplate'

type Props = {
  field: TextFieldConfig
  value: string
  onMove: (id: string, positionX: number, positionY: number) => void
  onFocus: (id: string) => void
  onDragEnd?: () => void
  containerRef: React.RefObject<HTMLDivElement>
}

export function DraggableTextField({ field, value, onMove, onFocus, onDragEnd, containerRef }: Props) {
  const isDragging = useRef(false)
  const dragStart = useRef({ mouseX: 0, mouseY: 0, fieldX: 0, fieldY: 0 })

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      onFocus(field.id)
      isDragging.current = true
      dragStart.current = {
        mouseX: e.clientX,
        mouseY: e.clientY,
        fieldX: field.positionX,
        fieldY: field.positionY,
      }

      const handleMouseMove = (ev: MouseEvent) => {
        if (!isDragging.current || !containerRef.current) return
        const rect = containerRef.current.getBoundingClientRect()
        const deltaX = ev.clientX - dragStart.current.mouseX
        const deltaY = ev.clientY - dragStart.current.mouseY
        const newX = dragStart.current.fieldX + (deltaX / rect.width) * 100
        const newY = dragStart.current.fieldY + (deltaY / rect.height) * 100
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
    [field.id, field.positionX, field.positionY, onMove, onFocus, onDragEnd, containerRef]
  )

  return (
    <div
      onMouseDown={handleMouseDown}
      style={{
        position: 'absolute',
        left: `${field.positionX}%`,
        top: `${field.positionY}%`,
        transform: 'translate(-50%, -50%)',
        fontSize: `${field.fontSize}px`,
        fontWeight: field.fontWeight,
        textAlign: field.textAlign,
        color: field.color,
        cursor: 'move',
        userSelect: 'none',
        whiteSpace: 'nowrap',
        lineHeight: 1.2,
      }}
    >
      {value || `[${field.label}]`}
    </div>
  )
}
