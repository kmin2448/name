'use client'
import { BookOpen, X } from 'lucide-react'
import { PRINT_TIPS, STEPS, TIPS } from '@/lib/guideContent'

const PANEL_WIDTH = 480


type Props = {
  /** 오른쪽 패널은 한 번에 하나만 열리므로 열림 상태는 바깥에서 관리한다 */
  open: boolean
  onOpenChange: (open: boolean) => void
  /** 열린 패널 위에 글자가 겹치지 않도록, 패널이 모두 닫혔을 때만 안내 문구를 보여준다 */
  showHint?: boolean
}

export function HelpPanel({ open, onOpenChange, showHint = false }: Props) {
  const toggle = () => onOpenChange(!open)

  return (
    <>
      {/* 토글 버튼 — 오른쪽 아래 접속 수 표시 바로 위에 뜨는 플로팅 아이콘.
          썸네일·내 자료 버튼처럼 안내 문구가 버튼 왼쪽에 붙어 다닌다 */}
      <div
        className="fixed z-50 flex items-center gap-2 pointer-events-none"
        style={{
          right: open ? PANEL_WIDTH + 12 : 12,
          bottom: 52,
          transition: 'right 300ms ease',
        }}
      >
        {showHint && (
          <span className="text-[11px] font-medium text-gray-700 whitespace-nowrap">
            사용방법을 확인하세요.
          </span>
        )}
        <button
          onClick={toggle}
          className="pointer-events-auto w-10 h-10 rounded-full bg-[#475569] text-white flex items-center justify-center shadow-lg hover:bg-[#334155] active:bg-[#1e293b]"
          title={open ? '닫기' : '사용법 안내'}
          aria-label={open ? '사용법 닫기' : '사용법 안내'}
        >
          {open ? (
            <X className="w-4 h-4" />
          ) : (
            <>
              <BookOpen className="w-5 h-5" />
              <span className="sr-only">사용법</span>
            </>
          )}
        </button>
      </div>

      {/* 슬라이드 패널 */}
      <div
        className="fixed top-0 right-0 h-full bg-white border-l border-gray-200 shadow-2xl z-[45] overflow-y-auto"
        style={{
          width: PANEL_WIDTH,
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 300ms ease',
        }}
      >
        <div className="p-5 pb-8">
          {/* 헤더 */}
          <div className="flex items-center gap-2 mb-5">
            <BookOpen className="w-4 h-4 text-[#475569] shrink-0" />
            <h2 className="text-base font-bold text-gray-800">사용 방법</h2>
          </div>

          {/* 단계별 안내 */}
          <ol className="space-y-5">
            {STEPS.map((step) => (
              <li key={step.num} className="flex gap-3">
                <div className="w-5 h-5 rounded-full bg-[#475569] text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {step.num}
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-800 mb-1">{step.title}</p>
                  <p className="text-[13px] text-gray-500 leading-relaxed whitespace-pre-line">{step.desc}</p>
                </div>
              </li>
            ))}
          </ol>

          {/* 구분선 */}
          <hr className="my-5 border-gray-100" />

          {/* 팁 */}
          <div>
            <p className="text-sm font-bold text-gray-700 mb-2.5">💡 알아두면 좋은 점</p>
            <ul className="space-y-2">
              {TIPS.map((tip, i) => (
                <li key={i} className="flex gap-2 text-[13px] text-gray-500 leading-relaxed">
                  <span className="text-[#475569] shrink-0">•</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* 구분선 */}
          <hr className="my-5 border-gray-100" />

          {/* PDF 인쇄 방법 */}
          <div>
            <p className="text-sm font-bold text-gray-700 mb-2.5">🖨️ PDF 인쇄 방법</p>
            <ul className="space-y-1.5">
              {PRINT_TIPS.map((tip, i) => (
                <li key={i} className="flex gap-2 text-[13px] text-gray-500 leading-relaxed">
                  <span className="text-[#475569] shrink-0">•</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </>
  )
}
