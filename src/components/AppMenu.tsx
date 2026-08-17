'use client'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { ChevronDown, LayoutTemplate, Wand2 } from 'lucide-react'

export type AppPage = 'nameplate' | 'vectorize'

const PAGES = [
  {
    id: 'nameplate' as const,
    href: '/',
    title: '명패 제작기',
    desc: '엑셀 명단으로 명패 PDF 만들기',
    Icon: LayoutTemplate,
  },
  {
    id: 'vectorize' as const,
    href: '/vectorize',
    title: '이미지 변환',
    desc: 'JPG·PNG를 SVG 벡터 파일로',
    Icon: Wand2,
  },
]

type Props = {
  /** 지금 보고 있는 페이지 — 목록에서 표시해 준다 */
  current: AppPage
}

/** 헤더 제목을 겸하는 페이지 전환 메뉴 */
export function AppMenu({ current }: Props) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  // 바깥을 누르거나 Esc를 누르면 닫는다
  useEffect(() => {
    if (!open) return

    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('touchstart', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('touchstart', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const currentPage = PAGES.find((p) => p.id === current) ?? PAGES[0]

  return (
    <div ref={rootRef} className="relative shrink-0 mr-1">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 px-1.5 py-0.5 -ml-1.5 rounded hover:bg-white/15 active:bg-white/25 transition-colors"
        aria-haspopup="menu"
        aria-expanded={open}
        title="다른 기능으로 이동"
      >
        <h1 className="text-base font-bold tracking-tight whitespace-nowrap">
          {currentPage.title}
        </h1>
        <ChevronDown
          className="w-3.5 h-3.5 opacity-70"
          style={{ transform: open ? 'rotate(180deg)' : undefined, transition: 'transform 150ms' }}
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute left-0 top-full mt-1.5 w-64 bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden z-[60]"
        >
          {PAGES.map(({ id, href, title, desc, Icon }) => (
            <Link
              key={id}
              href={href}
              role="menuitem"
              onClick={() => setOpen(false)}
              className={`flex items-start gap-2.5 px-3 py-2.5 transition-colors ${
                id === current ? 'bg-slate-50' : 'hover:bg-gray-50'
              }`}
            >
              <Icon className="w-4 h-4 text-[#475569] shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-gray-800 flex items-center gap-1.5">
                  {title}
                  {id === current && (
                    <span className="text-[10px] font-medium text-gray-400">현재</span>
                  )}
                </p>
                <p className="text-[11px] text-gray-500 leading-snug">{desc}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
