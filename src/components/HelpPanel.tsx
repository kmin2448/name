'use client'
import { useState } from 'react'
import { BookOpen, X } from 'lucide-react'

const PANEL_WIDTH = 480

const STEPS = [
  {
    num: 1,
    title: '명패 크기 선택',
    desc: '왼쪽 상단에서 A형(250×90mm)·B형(210×70mm)·C형(150×60mm)·기타(200×82mm) 중 선택하거나, 사용자 지정에서 직접 크기를 입력합니다.',
  },
  {
    num: 2,
    title: '텍스트 항목 설정',
    desc: '왼쪽 패널에서 항목의 폰트, 크기, 색상, 정렬을 설정합니다.\n\n편집 캔버스에서:\n• 텍스트 박스 드래그 → 위치 이동\n• 요소 선택 후 방향키 → 1mm씩 미세 이동 (Shift+방향키: 5mm)\n• 네 모서리 핸들 드래그 → 크기 조절\n• 한 번 클릭해 선택 후, 다시 클릭 → 텍스트 직접 편집 (Esc 종료)\n• Space를 누른 채 드래그 → 캔버스 화면 이동\n\n요소는 캔버스에서 직접 클릭하거나 왼쪽 "레이어 순서" 목록을 클릭해 선택할 수 있습니다.\n\n"기본값 저장" 버튼으로 현재 서식을 저장해두면, 이후 "초기화"로 언제든 복원할 수 있습니다.',
  },
  {
    num: 3,
    title: '여러 항목 동시 편집',
    desc: '빈 곳에서 드래그하면 파란 사각형이 그려지고, 그 영역에 걸친 텍스트·이미지가 한꺼번에 선택됩니다.\n\n드래그는 편집 화면 어디에서 시작해도 됩니다 — A4 용지 안의 여백은 물론, A4 바깥 회색 배경에서 시작해 명패 쪽으로 끌어와도 됩니다. 항목이 빽빽해 시작할 빈 곳이 마땅치 않을 때는 A4 바깥에서 시작하세요.\n(단, 항목 위에서 시작한 드래그는 그 항목을 옮기는 동작이 됩니다.)\n\n• Ctrl(⌘)+클릭 → 항목을 하나씩 선택에 추가/제외\n• Ctrl(⌘) 또는 Shift를 누른 채 영역 드래그 → 기존 선택에 이어서 추가\n• 빈 곳을 그냥 클릭 → 선택 해제\n\n2개 이상 선택하면 캔버스 위쪽에 도구 모음이 나타납니다.\n• 왼쪽 끝 / 가운데 / 오른쪽 끝 정렬 — 선택한 항목들의 가로 위치를 맞춥니다\n• 정렬 기준 "선택 영역" — 선택한 항목들의 바깥 경계에 맞춤 (여러 줄을 나란히 줄맞춤할 때)\n• 정렬 기준 "명패" — 명패 전체 폭에 맞춤 (명패 정중앙·양 끝에 붙일 때)\n• 크기 − / + — 각 항목의 현재 크기를 기준으로 1씩 키우고 줄입니다 (Shift+클릭: 10씩). 항목마다 크기가 달라도 각자의 크기에서 출발하므로 크기 차이는 그대로 유지됩니다.\n• 색상 — 선택한 텍스트 항목의 글자 색을 한 번에 변경\n\n선택된 상태에서 방향키를 누르면 전체가 1mm씩(Shift+방향키는 5mm씩) 상대 위치를 유지한 채 함께 이동합니다. 선택된 항목 중 하나를 드래그해도 전체가 같이 움직입니다.\n\n선택 영역은 아래쪽(정방향) 명패를 기준으로 계산됩니다. 위쪽은 같은 내용을 180도 돌려 보여주는 미리보기이므로, 위쪽만 감싸도 선택되지 않습니다.',
  },
  {
    num: 4,
    title: '배경 이미지 설정 (선택)',
    desc: '배경 이미지 탭에서 세 가지 방법으로 배경을 적용합니다.\n\n• 기본 제공 배경 — 상·하단 띠 장식 5종(클래식 네이비, 미니멀 라인, 에메랄드 그라데이션, 와인 & 골드, 소프트 스카이). 글씨와 겹치지 않도록 디자인되어 있습니다.\n• 직접 업로드 — 내 이미지 파일을 배경으로 사용 (10MB 이하)\n• 픽사베이 검색 — 팝업창에서 무료 사진을 검색하고, 실제 명패 미리보기로 확인한 뒤 적용\n\n사진 적용 방식 2가지:\n• 전체 채우기 — 사진이 명패 전체를 덮음 (글씨와 겹칠 수 있음)\n• 상·하단 띠 (간섭 없음) — 사진을 위·아래 띠로만 배치. 텍스트 위치를 기준으로 5px 여백을 두고 합성되므로 글씨와 절대 겹치지 않습니다.',
  },
  {
    num: 5,
    title: '오버레이 이미지 설정 (선택)',
    desc: '오버레이 이미지 탭에서 이미지를 추가하고 \'조건 적용\'을 선택하면 특정 속성값(예: 소속 = 강원대학교)을 가진 페이지에만 삽입됩니다.\n\n• 캔버스에서 이미지를 클릭하면 선택 → 드래그 또는 방향키로 이동, 모서리 핸들로 크기 조절\n• Shift 키를 누른 채 이미지 선택 = 자르기 모드. 주황색 핸들을 드래그해 노출 영역을 조정합니다.',
  },
  {
    num: 6,
    title: '레이어 순서 설정 (선택)',
    desc: '왼쪽 패널의 레이어 순서 항목에서 텍스트와 이미지의 겹침 순서를 조정합니다.\n• 목록 위쪽 = 화면 앞(위)\n• 핸들을 드래그해 순서 변경\n• 항목을 클릭하면 해당 요소가 선택되어 방향키로 이동 가능\n새로 추가된 오버레이 이미지는 기본적으로 텍스트 아래에 배치됩니다.',
  },
  {
    num: 7,
    title: '엑셀 파일 업로드',
    desc: '상단 헤더의 "양식 다운로드" 버튼으로 양식을 받은 후, 1행에 항목명·2행부터 데이터를 입력하고 "엑셀 파일 업로드" 버튼으로 올립니다.\n\n열 이름이 항목명과 일치하면 자동으로 연결되고, 행마다 명패 1장이 생성됩니다. 업로드가 끝나면 우측 썸네일 패널이 자동으로 열립니다.',
  },
  {
    num: 8,
    title: '페이지별 편집 (선택)',
    desc: '엑셀 업로드 직후 자동으로 열리며, 닫은 뒤에는 우측 "썸네일" 버튼으로 다시 열 수 있습니다.\n썸네일을 클릭하면 해당 페이지의 데이터와 서식을 편집할 수 있습니다.\n\n• 이 페이지만 — 선택한 페이지에만 변경 적용\n• 전체 적용 — 모든 페이지에 동일하게 적용\n• "이 페이지 설정을 전체에 적용" 버튼 — 현재 페이지 서식을 전체에 일괄 적용\n\n주황색 테두리 썸네일은 개별 서식이 적용된 페이지입니다.',
  },
  {
    num: 9,
    title: 'PDF 내보내기',
    desc: '상단 헤더의 "인쇄 미리보기" 버튼으로 브라우저에서 미리 확인하거나, "PDF 다운로드" 버튼으로 파일을 저장합니다.\n\n인쇄 시 배율을 반드시 100%(실제 크기)로 설정하고, 여백은 없음으로 지정하세요. 명패는 A4 중앙에 배치되며 위아래로 접어 사용합니다.',
  },
]

const TIPS = [
  '요소를 선택하고 방향키를 누르면 1mm씩, Shift+방향키는 5mm씩 정밀하게 이동합니다. 위쪽 반전본은 같은 좌표를 회전해 그리므로 자동으로 반대 방향으로 움직입니다.',
  '픽사베이 팝업에서는 이미지를 고른 뒤 적용 방식을 바꾸면 미리보기가 즉시 갱신됩니다. 실제 명패 비율에 현재 텍스트까지 겹쳐 보여줘 적용 전에 확인할 수 있습니다.',
  '상·하단 띠 배경은 적용 시점의 텍스트 위치를 기준으로 여백을 계산합니다. 텍스트 위치를 크게 바꿨다면 배경을 한 번 다시 적용하세요.',
  '명단과 편집 내용은 브라우저(localStorage)에 자동 저장되어 새로고침 후에도 유지됩니다.',
  'Space 키를 누른 채 드래그하면 A4 캔버스를 자유롭게 이동할 수 있습니다. 이동한 위치는 새로고침 후에도 유지됩니다.',
  '"기본값 저장" 버튼으로 현재 폰트·위치 등 서식을 저장하면, "초기화" 버튼으로 언제든 복원할 수 있습니다.',
  '오버레이 이미지를 선택한 뒤 Shift를 누르면 자르기 핸들이 주황색으로 나타납니다. 핸들을 드래그해 필요한 부분만 표시하세요.',
  '레이어 순서에서 이미지를 텍스트 위로 올리면 텍스트 위에 이미지를 배치할 수 있습니다.',
  '여러 항목을 선택하려면 A4 바깥 회색 배경에서 드래그를 시작해 명패 쪽으로 끌어오세요. 항목이 화면을 거의 채우고 있어도 확실하게 영역 선택을 시작할 수 있습니다.',
  '여러 항목을 선택한 채 방향키로 옮기면 항목 간 간격은 그대로 유지되므로, 이미 맞춰둔 배치를 흐트러뜨리지 않고 전체 위치만 조정할 수 있습니다.',
  '글자 크기 −/+ 버튼은 항목마다 각자의 현재 크기에서 증감합니다. 제목만 크고 나머지는 작은 배치를 그대로 둔 채 전체를 조금씩 키우거나 줄일 때 쓰세요. Shift와 함께 누르면 10씩 움직입니다.',
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
