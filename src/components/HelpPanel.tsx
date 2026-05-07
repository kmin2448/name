'use client'
import { useState } from 'react'
import { BookOpen, X } from 'lucide-react'

const PANEL_WIDTH = 320

const STEPS = [
  {
    num: 1,
    title: '명패 크기 선택',
    desc: '왼쪽 상단에서 A형(250×90mm)·B형(210×70mm)·C형(150×60mm) 중 선택하거나, 사용자 지정에서 직접 크기를 입력합니다.',
  },
  {
    num: 2,
    title: '텍스트 항목 설정',
    desc: '프로그램명·소속·이름·직책 등 각 항목의 폰트, 크기, 색상, 정렬을 설정합니다. 미리보기 화면에서 텍스트 박스를 드래그해 위치를, 우하단 핸들로 크기를 조정합니다.',
  },
  {
    num: 3,
    title: '이미지 설정 (선택)',
    desc: '배경 이미지 탭: 명패 전체에 배경 이미지 적용.\n오버레이 이미지 탭: 이미지를 추가하고 \'조건 적용\'을 선택하면 특정 속성값(예: 소속 = 강원대학교)을 가진 페이지에만 삽입됩니다.',
  },
  {
    num: 4,
    title: '엑셀 파일 업로드',
    desc: '1행에 항목명, 2행부터 데이터를 입력한 엑셀 파일을 업로드합니다. 열 이름이 항목명과 일치하면 자동으로 연결되고, 행마다 명패 1장이 생성됩니다.',
  },
  {
    num: 5,
    title: '페이지별 개별 편집 (선택)',
    desc: '하단 썸네일에서 페이지를 클릭하면 해당 페이지의 데이터 수정이 가능합니다.\n• 이 페이지만 — 선택한 페이지에만 변경 적용\n• 전체 적용 — 모든 페이지에 동일하게 적용',
  },
  {
    num: 6,
    title: 'PDF 내보내기',
    desc: '오른쪽 하단 PDF 내보내기 버튼을 클릭하면 A4 크기의 PDF가 생성됩니다. 인쇄 시 배율을 반드시 100%(실제 크기)로 설정하고, 여백은 없음으로 지정하세요. 명패는 A4 중앙에 배치되며 위아래로 접어 사용합니다.',
  },
]

const TIPS = [
  '썸네일에 주황색 "커스텀" 배지가 붙은 페이지는 개별 서식이 적용된 상태입니다.',
  '미리보기 우측 상단의 눈금자 버튼을 켜면 mm 단위 위치를 확인할 수 있습니다.',
  '오버레이 이미지는 데이터 URL로 저장되므로 새로고침 후에도 유지됩니다.',
]

export function HelpPanel() {
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* 토글 버튼 — 스크롤과 무관하게 항상 오른쪽 고정 */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed top-1/2 z-50 bg-[#1F5C99] text-white flex flex-col items-center gap-1.5 px-1.5 py-4 rounded-l-lg shadow-lg hover:bg-[#174a80] active:bg-[#0e3a6b]"
        style={{
          right: open ? PANEL_WIDTH : 0,
          transform: 'translateY(-50%)',
          transition: 'right 300ms ease',
        }}
        title={open ? '닫기' : '사용법 안내'}
      >
        {open ? (
          <X className="w-4 h-4" />
        ) : (
          <>
            <BookOpen className="w-4 h-4" />
            <span
              className="text-[11px] font-medium tracking-wide"
              style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
            >
              사용법
            </span>
          </>
        )}
      </button>

      {/* 슬라이드 패널 */}
      <div
        className="fixed top-0 right-0 h-full bg-white border-l border-gray-200 shadow-2xl z-40 overflow-y-auto"
        style={{
          width: PANEL_WIDTH,
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 300ms ease',
        }}
      >
        <div className="p-5 pb-8">
          {/* 헤더 */}
          <div className="flex items-center gap-2 mb-5">
            <BookOpen className="w-4 h-4 text-[#1F5C99] shrink-0" />
            <h2 className="text-sm font-bold text-gray-800">사용 방법</h2>
          </div>

          {/* 단계별 안내 */}
          <ol className="space-y-5">
            {STEPS.map((step) => (
              <li key={step.num} className="flex gap-3">
                <div className="w-5 h-5 rounded-full bg-[#1F5C99] text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {step.num}
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-800 mb-1">{step.title}</p>
                  <p className="text-[11px] text-gray-500 leading-relaxed whitespace-pre-line">{step.desc}</p>
                </div>
              </li>
            ))}
          </ol>

          {/* 구분선 */}
          <hr className="my-5 border-gray-100" />

          {/* 팁 */}
          <div>
            <p className="text-xs font-bold text-gray-700 mb-2.5">💡 알아두면 좋은 점</p>
            <ul className="space-y-2">
              {TIPS.map((tip, i) => (
                <li key={i} className="flex gap-2 text-[11px] text-gray-500 leading-relaxed">
                  <span className="text-[#1F5C99] shrink-0">•</span>
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
