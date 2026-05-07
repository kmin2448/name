'use client'
import { useRef, useCallback, useState, useEffect } from 'react'
import { OverlayImage } from '@/types/nameplate'

type CropEdge = 'left' | 'right' | 'top' | 'bottom'

type StartState = {
  mouseX: number
  mouseY: number
  startX: number
  startY: number
  startW: number
  startH: number
  startCropX: number
  startCropY: number
  startCropW: number
  startCropH: number
}

type Props = {
  image: OverlayImage
  isFocused: boolean
  onMove: (id: string, x: number, y: number) => void
  onResize: (id: string, w: number, h: number) => void
  // positionX/Y and widthPct/heightPct included so left/top drags update in one dispatch
  onCrop: (
    id: string,
    positionX: number, positionY: number,
    widthPct: number, heightPct: number,
    cropX: number, cropY: number, cropW: number, cropH: number
  ) => void
  onFocus: (id: string) => void
  containerRef: React.RefObject<HTMLDivElement>
}

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v))
}

export function DraggableOverlayImage({
  image, isFocused, onMove, onResize, onCrop, onFocus, containerRef,
}: Props) {
  const [isShifted, setIsShifted] = useState(false)
  const startRef = useRef<StartState>({
    mouseX: 0, mouseY: 0, startX: 0, startY: 0,
    startW: 0, startH: 0,
    startCropX: 0, startCropY: 0, startCropW: 100, startCropH: 100,
  })

  useEffect(() => {
    const down = (e: KeyboardEvent) => { if (e.key === 'Shift') setIsShifted(true) }
    const up   = (e: KeyboardEvent) => { if (e.key === 'Shift') setIsShifted(false) }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up) }
  }, [])

  const { cropX, cropY, cropW, cropH } = image

  const captureStart = useCallback((e: React.MouseEvent) => {
    startRef.current = {
      mouseX: e.clientX, mouseY: e.clientY,
      startX: image.positionX, startY: image.positionY,
      startW: image.widthPct,  startH: image.heightPct,
      startCropX: cropX, startCropY: cropY, startCropW: cropW, startCropH: cropH,
    }
  }, [image.positionX, image.positionY, image.widthPct, image.heightPct, cropX, cropY, cropW, cropH])

  // ── Body drag (move) ──────────────────────────────────────────────────
  const handleDragMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onFocus(image.id)
    captureStart(e)

    const handleMouseMove = (ev: MouseEvent) => {
      if (!containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const dx = ((ev.clientX - startRef.current.mouseX) / rect.width) * 100
      const dy = ((ev.clientY - startRef.current.mouseY) / rect.height) * 100
      const newX = clamp(startRef.current.startX + dx, 0, 100 - startRef.current.startW)
      const newY = clamp(startRef.current.startY + dy, 0, 100 - startRef.current.startH)
      onMove(image.id, newX, newY)
    }
    const up = () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', up)
    }
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', up)
  }, [image.id, captureStart, onMove, onFocus, containerRef])

  // ── Corner resize (bottom-right, normal mode) ─────────────────────────
  const handleResizeMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    captureStart(e)

    const handleMouseMove = (ev: MouseEvent) => {
      if (!containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const dw = ((ev.clientX - startRef.current.mouseX) / rect.width) * 100
      const dh = ((ev.clientY - startRef.current.mouseY) / rect.height) * 100
      const newW = clamp(startRef.current.startW + dw, 5, 100 - startRef.current.startX)
      const newH = clamp(startRef.current.startH + dh, 5, 100 - startRef.current.startY)
      onResize(image.id, newW, newH)
    }
    const up = () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', up)
    }
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', up)
  }, [image.id, captureStart, onResize, containerRef])

  // ── Edge crop (Shift mode) ────────────────────────────────────────────
  // Logic: keep image scale (scaleX = widthPct / cropW) constant.
  // Dragging an edge resizes the box; crop values are derived so the
  // visible image content scrolls/clips naturally — identical to dragging
  // the edge of a window over a fixed-scale image.
  const handleCropMouseDown = useCallback((edge: CropEdge) => (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    captureStart(e)

    const handleMouseMove = (ev: MouseEvent) => {
      if (!containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()

      const {
        mouseX, mouseY,
        startX, startY, startW, startH,
        startCropX, startCropY, startCropW, startCropH,
      } = startRef.current

      const dx = ((ev.clientX - mouseX) / rect.width) * 100
      const dy = ((ev.clientY - mouseY) / rect.height) * 100

      // canvas% per image% — stays constant during crop
      const scaleX = startW / startCropW
      const scaleY = startH / startCropH
      const MIN_BOX = 3

      let nx = startX, ny = startY, nw = startW, nh = startH
      let ncx = startCropX, ncy = startCropY, ncw = startCropW, nch = startCropH

      if (edge === 'right') {
        // Right edge moves; left crop anchor stays
        const maxW = Math.min((100 - startCropX) * scaleX, 100 - startX)
        nw  = clamp(startW + dx, MIN_BOX, maxW)
        ncw = nw / scaleX
        // ncx unchanged, nx unchanged

      } else if (edge === 'left') {
        // Left edge moves; right crop anchor stays
        const maxW = Math.min((startCropX + startCropW) * scaleX, startX + startW)
        nw  = clamp(startW - dx, MIN_BOX, maxW)
        nx  = startX + startW - nw        // right box edge fixed
        ncw = nw / scaleX
        ncx = startCropX + startCropW - ncw  // right crop edge fixed

      } else if (edge === 'bottom') {
        // Bottom edge moves; top crop anchor stays
        const maxH = Math.min((100 - startCropY) * scaleY, 100 - startY)
        nh  = clamp(startH + dy, MIN_BOX, maxH)
        nch = nh / scaleY
        // ncy unchanged, ny unchanged

      } else { // top
        // Top edge moves; bottom crop anchor stays
        const maxH = Math.min((startCropY + startCropH) * scaleY, startY + startH)
        nh  = clamp(startH - dy, MIN_BOX, maxH)
        ny  = startY + startH - nh        // bottom box edge fixed
        nch = nh / scaleY
        ncy = startCropY + startCropH - nch  // bottom crop edge fixed
      }

      onCrop(image.id, nx, ny, nw, nh, ncx, ncy, ncw, nch)
    }

    const up = () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', up)
    }
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', up)
  }, [image.id, captureStart, onCrop, containerRef])

  const borderColor = isFocused
    ? isShifted ? '#f97316' : '#475569'
    : 'rgba(71,85,105,0.18)'
  const borderStyle = isFocused ? '1.5px dashed' : '1px dashed'

  const imgLeft = `${-(cropX / cropW) * 100}%`
  const imgTop  = `${-(cropY / cropH) * 100}%`
  const imgW    = `${(100 / cropW) * 100}%`
  const imgH    = `${(100 / cropH) * 100}%`

  const HANDLE: React.CSSProperties = {
    position: 'absolute',
    width: 9, height: 9,
    borderRadius: 2,
    zIndex: 2,
  }

  return (
    <div
      onMouseDown={handleDragMouseDown}
      style={{
        position: 'absolute',
        left: `${image.positionX}%`,
        top: `${image.positionY}%`,
        width: `${image.widthPct}%`,
        height: `${image.heightPct}%`,
        overflow: 'hidden',
        boxSizing: 'border-box',
        border: `${borderStyle} ${borderColor}`,
        cursor: 'move',
        userSelect: 'none',
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={image.src}
        alt=""
        draggable={false}
        style={{
          position: 'absolute',
          left: imgLeft, top: imgTop,
          width: imgW, height: imgH,
          objectFit: 'fill',
          pointerEvents: 'none',
          userSelect: 'none',
        }}
      />

      {/* Normal mode: resize handle (bottom-right) */}
      {isFocused && !isShifted && (
        <div
          onMouseDown={handleResizeMouseDown}
          style={{ ...HANDLE, bottom: -4, right: -4, background: '#475569', cursor: 'nwse-resize' }}
        />
      )}

      {/* Shift / crop mode */}
      {isFocused && isShifted && (
        <>
          <div style={{ position: 'absolute', inset: 0, border: '1.5px dashed #f97316', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', top: 2, left: 2, fontSize: 9, background: 'rgba(249,115,22,0.88)', color: '#fff', padding: '1px 4px', borderRadius: 2, pointerEvents: 'none', zIndex: 3 }}>
            자르기 모드
          </div>
          {/* Left */}
          <div onMouseDown={handleCropMouseDown('left')}
            style={{ ...HANDLE, left: -4, top: '50%', transform: 'translateY(-50%)', background: '#f97316', cursor: 'ew-resize' }} />
          {/* Right */}
          <div onMouseDown={handleCropMouseDown('right')}
            style={{ ...HANDLE, right: -4, top: '50%', transform: 'translateY(-50%)', background: '#f97316', cursor: 'ew-resize' }} />
          {/* Top */}
          <div onMouseDown={handleCropMouseDown('top')}
            style={{ ...HANDLE, top: -4, left: '50%', transform: 'translateX(-50%)', background: '#f97316', cursor: 'ns-resize' }} />
          {/* Bottom */}
          <div onMouseDown={handleCropMouseDown('bottom')}
            style={{ ...HANDLE, bottom: -4, left: '50%', transform: 'translateX(-50%)', background: '#f97316', cursor: 'ns-resize' }} />
        </>
      )}
    </div>
  )
}
