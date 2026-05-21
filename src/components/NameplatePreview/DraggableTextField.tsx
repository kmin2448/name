'use client'
import { useRef, useCallback, useState, useEffect } from 'react'
import { TextFieldConfig } from '@/types/nameplate'

type Corner = 'tl' | 'tr' | 'bl' | 'br'

type Props = {
  field: TextFieldConfig
  value: string
  isFocused: boolean
  onMove: (id: string, positionX: number, positionY: number) => void
  onMoveRaw?: (id: string, positionX: number, positionY: number) => void
  onResize: (id: string, widthPct: number, heightPct: number) => void
  onFocus: (id: string) => void
  onDragEnd?: () => void
  onValueChange?: (value: string) => void
  containerRef: React.RefObject<HTMLDivElement>
}

const CORNER_CURSORS: Record<Corner, string> = {
  tl: 'nwse-resize',
  tr: 'nesw-resize',
  bl: 'nesw-resize',
  br: 'nwse-resize',
}

const HANDLE_SIZE = 9

export function DraggableTextField({
  field, value, isFocused, onMove, onMoveRaw, onResize, onFocus, onDragEnd, onValueChange, containerRef,
}: Props) {
  const isDragging = useRef(false)
  const isResizing = useRef(false)
  const hasMoved = useRef(false)
  const wasFocused = useRef(false)
  const startRef = useRef({ mouseX: 0, mouseY: 0, startX: 0, startY: 0, startW: 0, startH: 0 })
  const [isEditing, setIsEditing] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!isFocused) setIsEditing(false)
  }, [isFocused])

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus()
      const len = textareaRef.current.value.length
      textareaRef.current.setSelectionRange(len, len)
    }
  }, [isEditing])

  // ── 드래그 이동 ──────────────────────────────────────────────────────
  const handleDragMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (isEditing) return
      e.preventDefault()
      e.stopPropagation()

      wasFocused.current = isFocused
      hasMoved.current = false
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
        const dx = ev.clientX - startRef.current.mouseX
        const dy = ev.clientY - startRef.current.mouseY
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) hasMoved.current = true
        const rect = containerRef.current.getBoundingClientRect()
        const newX = Math.max(0, Math.min(100 - startRef.current.startW, startRef.current.startX + (dx / rect.width) * 100))
        const newY = Math.max(0, Math.min(100 - startRef.current.startH, startRef.current.startY + (dy / rect.height) * 100))
        onMove(field.id, newX, newY)
      }

      const handleMouseUp = () => {
        isDragging.current = false
        onDragEnd?.()
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
        if (!hasMoved.current && wasFocused.current && onValueChange) {
          setIsEditing(true)
        }
      }

      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    },
    [field.id, field.positionX, field.positionY, field.widthPct, field.heightPct, onMove, onFocus, onDragEnd, containerRef, isFocused, isEditing, onValueChange]
  )

  // ── 모서리 리사이즈 ───────────────────────────────────────────────────
  const handleCornerMouseDown = useCallback(
    (corner: Corner) => (e: React.MouseEvent) => {
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
        const { startX, startY, startW, startH } = startRef.current

        let newX = startX, newY = startY, newW = startW, newH = startH

        if (corner === 'br') {
          newW = Math.max(5, Math.min(100 - startX, startW + dw))
          newH = Math.max(5, Math.min(100 - startY, startH + dh))
        } else if (corner === 'bl') {
          newX = Math.max(0, Math.min(startX + startW - 5, startX + dw))
          newW = startX + startW - newX
          newH = Math.max(5, Math.min(100 - startY, startH + dh))
        } else if (corner === 'tr') {
          newW = Math.max(5, Math.min(100 - startX, startW + dw))
          newY = Math.max(0, Math.min(startY + startH - 5, startY + dh))
          newH = startY + startH - newY
        } else {
          // tl
          newX = Math.max(0, Math.min(startX + startW - 5, startX + dw))
          newW = startX + startW - newX
          newY = Math.max(0, Math.min(startY + startH - 5, startY + dh))
          newH = startY + startH - newY
        }

        if (newX !== startX || newY !== startY) {
          onMoveRaw?.(field.id, newX, newY)
        }
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
    [field.id, field.positionX, field.positionY, field.widthPct, field.heightPct, onMoveRaw, onResize, containerRef]
  )

  // ── 핸들 스타일 헬퍼 ─────────────────────────────────────────────────
  const cornerStyle = (corner: Corner): React.CSSProperties => {
    const base: React.CSSProperties = {
      position: 'absolute',
      width: HANDLE_SIZE,
      height: HANDLE_SIZE,
      background: '#475569',
      borderRadius: 2,
      zIndex: 2,
      cursor: CORNER_CURSORS[corner],
    }
    const offset = -Math.floor(HANDLE_SIZE / 2) - 1
    if (corner === 'tl') return { ...base, top: offset, left: offset }
    if (corner === 'tr') return { ...base, top: offset, right: offset }
    if (corner === 'bl') return { ...base, bottom: offset, left: offset }
    return { ...base, bottom: offset, right: offset }
  }

  return (
    <div
      onMouseDown={handleDragMouseDown}
      style={{
        position: 'absolute',
        left: `${field.positionX}%`,
        top: `${field.positionY}%`,
        width: `${field.widthPct}%`,
        height: `${field.heightPct}%`,
        cursor: isEditing ? 'text' : 'move',
        boxSizing: 'border-box',
        border: isFocused
          ? '1.5px dashed #475569'
          : '1px dashed rgba(31, 92, 153, 0.25)',
        overflow: 'visible',
        userSelect: 'none',
      }}
    >
      {/* 텍스트 / 편집 영역 (overflow hidden 처리) */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
        {isEditing ? (
          <textarea
            ref={textareaRef}
            value={value}
            placeholder={`[${field.label}]`}
            onChange={(e) => onValueChange?.(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Escape') { e.preventDefault(); setIsEditing(false) } }}
            onBlur={() => setIsEditing(false)}
            onMouseDown={(e) => e.stopPropagation()}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              background: 'rgba(255,255,255,0.92)',
              border: 'none',
              outline: 'none',
              resize: 'none',
              fontSize: `${field.fontSize}px`,
              fontWeight: field.fontWeight,
              fontFamily: field.fontFamily,
              textAlign: field.textAlign,
              color: field.color,
              lineHeight: 1.2,
              padding: '4px',
              boxSizing: 'border-box',
            }}
          />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'table', tableLayout: 'fixed' }}>
            <div style={{ display: 'table-cell', verticalAlign: 'middle' }}>
              <span
                style={{
                  display: 'block',
                  width: '100%',
                  fontSize: `${field.fontSize}px`,
                  fontWeight: field.fontWeight,
                  fontFamily: field.fontFamily,
                  textAlign: field.textAlign,
                  color: field.color,
                  whiteSpace: 'pre-line',
                  lineHeight: 1.2,
                  pointerEvents: 'none',
                }}
              >
                {value || `[${field.label}]`}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 4개 모서리 핸들 */}
      {isFocused && !isEditing && (
        <>
          <div onMouseDown={handleCornerMouseDown('tl')} style={cornerStyle('tl')} />
          <div onMouseDown={handleCornerMouseDown('tr')} style={cornerStyle('tr')} />
          <div onMouseDown={handleCornerMouseDown('bl')} style={cornerStyle('bl')} />
          <div onMouseDown={handleCornerMouseDown('br')} style={cornerStyle('br')} />
        </>
      )}
    </div>
  )
}
