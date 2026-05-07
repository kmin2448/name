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
  onCrop: (id: string, cropX: number, cropY: number, cropW: number, cropH: number) => void
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
    const up = (e: KeyboardEvent) => { if (e.key === 'Shift') setIsShifted(false) }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up) }
  }, [])

  const cropX = image.cropX
  const cropY = image.cropY
  const cropW = image.cropW
  const cropH = image.cropH

  const captureStart = useCallback((e: React.MouseEvent) => {
    startRef.current = {
      mouseX: e.clientX, mouseY: e.clientY,
      startX: image.positionX, startY: image.positionY,
      startW: image.widthPct, startH: image.heightPct,
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
    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }, [image.id, captureStart, onMove, onFocus, containerRef])

  // ── Corner resize (bottom-right) ──────────────────────────────────────
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
    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }, [image.id, captureStart, onResize, containerRef])

  // ── Edge crop (Shift mode) ────────────────────────────────────────────
  const handleCropMouseDown = useCallback((edge: CropEdge) => (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    captureStart(e)

    const handleMouseMove = (ev: MouseEvent) => {
      if (!containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      // canvas-% delta → image-% delta
      const dxImg = ((ev.clientX - startRef.current.mouseX) / rect.width) * 100
                    * startRef.current.startCropW / startRef.current.startW
      const dyImg = ((ev.clientY - startRef.current.mouseY) / rect.height) * 100
                    * startRef.current.startCropH / startRef.current.startH

      let { startCropX: cx, startCropY: cy, startCropW: cw, startCropH: ch } = startRef.current
      let nx = cx, ny = cy, nw = cw, nh = ch

      if (edge === 'left') {
        nx = clamp(cx + dxImg, 0, cx + cw - 5)
        nw = cx + cw - nx
      } else if (edge === 'right') {
        nw = clamp(cw + dxImg, 5, 100 - cx)
      } else if (edge === 'top') {
        ny = clamp(cy + dyImg, 0, cy + ch - 5)
        nh = cy + ch - ny
      } else {
        nh = clamp(ch + dyImg, 5, 100 - cy)
      }

      onCrop(image.id, nx, ny, nw, nh)
    }
    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }, [image.id, captureStart, onCrop, containerRef])

  const borderColor = isFocused
    ? isShifted ? '#f97316' : '#475569'
    : 'rgba(31,92,153,0.18)'
  const borderStyle = isFocused ? '1.5px dashed' : '1px dashed'

  // Crop CSS: image positioned inside overflow:hidden container
  const imgLeft = `${-(cropX / cropW) * 100}%`
  const imgTop  = `${-(cropY / cropH) * 100}%`
  const imgW    = `${(100 / cropW) * 100}%`
  const imgH    = `${(100 / cropH) * 100}%`

  const HANDLE = {
    position: 'absolute' as const,
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

      {/* ── Normal mode: resize handle ── */}
      {isFocused && !isShifted && (
        <div
          onMouseDown={handleResizeMouseDown}
          style={{
            ...HANDLE,
            bottom: -4, right: -4,
            background: '#475569',
            cursor: 'nwse-resize',
          }}
        />
      )}

      {/* ── Shift mode: 4 crop edge handles ── */}
      {isFocused && isShifted && (
        <>
          <div style={{ position: 'absolute', inset: 0, border: '1.5px dashed #f97316', pointerEvents: 'none' }} />
          {/* label */}
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
