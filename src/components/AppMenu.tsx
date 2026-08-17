'use client'
import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { BookOpen, ChevronDown, LayoutTemplate } from 'lucide-react'

export type AppPage = 'nameplate' | 'guide'

const PAGES = [
  {
    id: 'nameplate' as const,
    href: '/',
    title: '명패 제작기',
    desc: '엑셀 명단으로 명패 PDF 만들기',
    Icon: LayoutTemplate,
  },
  {
    id: 'guide' as const,
    href: '/guide',
    title: '사용 설명서',
    desc: '명패 만드는 방법 단계별 안내',
    Icon: BookOpen,
  },
]

const MENU_WIDTH = 256
/** 버튼과 메뉴 사이 간격 */
const GAP = 6

type Props = {
  /** 지금 보고 있는 페이지 — 목록에서 표시해 준다 */
  current: AppPage
}

/**
 * 헤더 제목을 겸하는 페이지 전환 메뉴.
 *
 * 메뉴는 body로 포털 렌더링한다. 헤더에 overflow-x-auto가 걸려 있어
 * 헤더 안에 그리면 아래로 펼쳐진 메뉴가 헤더 경계에서 잘리기 때문이다.
 * (z-index로는 해결되지 않는다 — 잘림은 쌓임 순서와 무관하다)
 */
export function AppMenu({ current }: Props) {
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const place = useCallback(() => {
    const rect = buttonRef.current?.getBoundingClientRect()
    if (!rect) return
    setPosition({
      top: rect.bottom + GAP,
      // 화면 밖으로 나가지 않도록 오른쪽 끝을 넘기지 않는다
      left: Math.max(8, Math.min(rect.left, window.innerWidth - MENU_WIDTH - 8)),
    })
  }, [])

  const toggle = () => {
    if (!open) place()
    setOpen((v) => !v)
  }

  useEffect(() => {
    if (!open) return

    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node
      // 메뉴가 포털로 빠져 있으므로 버튼과 메뉴를 따로 확인해야 한다.
      // (메뉴 안을 눌렀는데 닫아 버리면 링크 이동이 취소된다)
      if (buttonRef.current?.contains(target) || menuRef.current?.contains(target)) return
      setOpen(false)
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    // 헤더가 가로로 밀리거나 창 크기가 바뀌면 위치가 어긋나므로 다시 계산한다
    const onReflow = () => place()

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('touchstart', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    window.addEventListener('resize', onReflow)
    window.addEventListener('scroll', onReflow, true)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('touchstart', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('resize', onReflow)
      window.removeEventListener('scroll', onReflow, true)
    }
  }, [open, place])

  const currentPage = PAGES.find((p) => p.id === current) ?? PAGES[0]

  const menu = (
    <div
      ref={menuRef}
      role="menu"
      className="fixed bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden z-[100]"
      style={{ top: position.top, left: position.left, width: MENU_WIDTH }}
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
  )

  return (
    <div className="shrink-0 mr-1">
      <button
        ref={buttonRef}
        onClick={toggle}
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

      {open && createPortal(menu, document.body)}
    </div>
  )
}
