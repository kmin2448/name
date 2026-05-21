'use client'
import { useState } from 'react'
import { BookOpen, X } from 'lucide-react'

const PANEL_WIDTH = 480

const STEPS = [
  {
    num: 1,
    title: '명패 크기 선택',
    desc: '왼쪽 상단에서 A형(250×90mm)·B형(210×70mm)·C형(150×60mm) 중 선택하거나, 사용자 지정에서 직접 크기를 입력합니다.',
  },
  {
    num: 2,
    title: '텍스트 항목 설정',
    desc: '왼쪽 패널에서 항목의 폰트, 크기, 색상, 정렬을 설정합니다.\n\n편집 캔버스에서:\n• 텍스트 박스 드래그 → 위치 이동\n• 네 모서리 핸들 드래그 → 크기 조절\n• 한 번 클릭해 선택 후, 다시 클릭 → 텍스트 직접 편집 (Esc 종료)\n• Space를 누른 채 드래그 → 캔버스 화면 이동\n\n"기본값 저장" 버튼으로 현재 서식을 저장해두면, 이후 "초기화"로 언제든 복원할 수 있습니다.',
  },
  {
    num: 3,
    title: '이미지 설정 (선택)',
    desc: '배경 이미지 탭: 명패 전체에 배경 이미지 적용.\n오버레이 이미지 탭: 이미지를 추가하고 \'조건 적용\'을 선택하면 특정 속성값(예: 소속 = 강원대학교)을 가진 페이지에만 삽입됩니다.\n\n• 캔버스에서 이미지를 클릭하면 선택 → 드래그로 이동, 모서리 핸들로 크기 조절\n• Shift 키를 누른 채 이미지 선택 = 자르기 모드. 주황색 핸들을 드래그해 노출 영역을 조정합니다.',
  },
  {
    num: 4,
    title: '레이어 순서 설정 (선택)',
    desc: '왼쪽 패널의 레이어 순서 항목에서 텍스트와 이미지의 겹침 순서를 조정합니다.\n• 목록 위쪽 = 화면 앞(위)\n• ↑↓ 버튼으로 순서 변경\n새로 추가된 오버레이 이미지는 기본적으로 텍스트 아래에 배치됩니다.',
  },
  {
    num: 5,
    title: '엑셀 파일 업로드',
    desc: '상단 헤더의 "양식 다운로드" 버튼으로 양식을 받은 후, 1행에 항목명·2행부터 데이터를 입력하고 "엑셀 파일 선택" 버튼으로 업로드합니다.\n\n열 이름이 항목명과 일치하면 자동으로 연결되고, 행마다 명패 1장이 생성됩니다.',
  },
  {
    num: 6,
    title: '페이지별 편집 (선택)',
    desc: '우측 "썸네일" 버튼을 클릭해 패널을 열면 페이지 목록이 표시됩니다.\n썸네일을 클릭하면 해당 페이지의 데이터와 서식을 편집할 수 있습니다.\n\n• 이 페이지만 — 선택한 페이지에만 변경 적용\n• 전체 적용 — 모든 페이지에 동일하게 적용\n• "이 페이지 설정을 전체에 적용" 버튼 — 현재 페이지 서식을 전체에 일괄 적용\n\n주황색 테두리 썸네일은 개별 서식이 적용된 페이지입니다.',
  },
  {
    num: 7,
    title: 'PDF 내보내기',
    desc: '상단 헤더의 "인쇄 미리보기" 버튼으로 브라우저에서 미리 확인하거나, "PDF 다운로드" 버튼으로 파일을 저장합니다.\n\n인쇄 시 배율을 반드시 100%(실제 크기)로 설정하고, 여백은 없음으로 지정하세요. 명패는 A4 중앙에 배치되며 위아래로 접어 사용합니다.',
  },
]

const TIPS = [
  'Space 키를 누른 채 드래그하면 A4 캔버스를 자유롭게 이동할 수 있습니다. 이동한 위치는 새로고침 후에도 유지됩니다.',
  '"기본값 저장" 버튼으로 현재 폰트·위치 등 서식을 저장하면, "초기화" 버튼으로 언제든 복원할 수 있습니다.',
  '오버레이 이미지를 선택한 뒤 Shift를 누르면 자르기 핸들이 주황색으로 나타납니다. 핸들을 드래그해 필요한 부분만 표시하세요.',
  '레이어 순서에서 이미지를 텍스트 위로 올리면 텍스트 위에 이미지를 배치할 수 있습니다.',
]

const PRINT_TIPS = [
  '배율: 실제 크기(100%) 또는 맞춤 페이지 없음 선택',
  '여백: 없음 또는 최소로 설정',
  '용지 크기: A4',
  '단면 인쇄 후 접어서 사용',
]

export function HelpPanel() {
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* 토글 버튼 — 스크롤과 무관하게 항상 오른쪽 고정 */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed z-50 bg-[#475569] text-white flex flex-col items-center gap-1.5 px-1.5 py-4 rounded-l-lg shadow-lg hover:bg-[#334155] active:bg-[#1e293b]"
        style={{
          right: open ? PANEL_WIDTH : 0,
          top: 'calc(52px + 2%)',
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
