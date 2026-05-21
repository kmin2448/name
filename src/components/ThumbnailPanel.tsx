'use client'
import { useState } from 'react'
import { LayoutGrid, X, Square } from 'lucide-react'
import { NameplateState } from '@/types/nameplate'
import { PageThumbnails } from '@/components/NameplatePreview/PageThumbnails'

const PANEL_WIDTH = 480

type Props = {
  state: NameplateState
  selectedRowIndex: number
  applyToAll: boolean
  hasPageOverride: boolean
  onApplyToAllChange: (v: boolean) => void
  onRowFieldChange: (label: string, value: string) => void
  onClearPageOverride: () => void
  onToggleBorder: () => void
  onSelect: (index: number) => void
}

export function ThumbnailPanel({
  state,
  selectedRowIndex,
  applyToAll,
  hasPageOverride,
  onApplyToAllChange,
  onRowFieldChange,
  onClearPageOverride,
  onToggleBorder,
  onSelect,
}: Props) {
  const [open, setOpen] = useState(false)
  const hasData = state.excelRows.length > 0

  return (
    <>
      {/* 토글 버튼 — 우측 고정 (사용법 버튼 위) */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed z-50 bg-[#475569] text-white flex flex-col items-center gap-1.5 px-1.5 py-4 rounded-l-lg shadow-lg hover:bg-[#334155] active:bg-[#1e293b]"
        style={{
          right: open ? PANEL_WIDTH : 0,
          top: '35%',
          transform: 'translateY(-50%)',
          transition: 'right 300ms ease',
        }}
        title={open ? '닫기' : '페이지 썸네일'}
      >
        {open ? (
          <X className="w-4 h-4" />
        ) : (
          <>
            <LayoutGrid className="w-4 h-4" />
            <span
              className="text-[11px] font-medium tracking-wide"
              style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
            >
              썸네일
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
        <div className="p-4 pb-8">
          {/* 헤더 */}
          <div className="flex items-center gap-2 mb-4">
            <LayoutGrid className="w-4 h-4 text-[#475569] shrink-0" />
            <h2 className="text-sm font-bold text-gray-800">페이지 목록</h2>
          </div>

          {!hasData ? (
            <p className="text-xs text-gray-400 text-center py-12">
              엑셀 파일을 업로드하면<br />썸네일이 표시됩니다.
            </p>
          ) : (
            <>
              {/* 데이터 편집 */}
              <div
                className={`px-3 pt-3 pb-2 rounded border mb-4 transition-colors ${
                  applyToAll ? 'bg-orange-50 border-orange-200' : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-gray-600">
                    {selectedRowIndex + 1}번 데이터 (총 {state.excelRows.length}명)
                  </p>
                  <div className="flex items-center gap-1.5">
                    {hasPageOverride && !applyToAll && (
                      <button
                        onClick={onClearPageOverride}
                        className="text-xs bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded hover:bg-orange-200 transition-colors"
                        title="이 페이지의 커스텀 서식 제거"
                      >
                        커스텀 취소 ✕
                      </button>
                    )}
                    <button
                      onClick={onToggleBorder}
                      className={`flex items-center gap-1 text-xs px-1.5 py-0.5 rounded border transition-colors ${
                        state.showBorder
                          ? 'bg-[#475569] text-white border-[#475569]'
                          : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                      }`}
                      title={state.showBorder ? '테두리 숨기기' : '테두리 표시'}
                    >
                      <Square className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* 이 페이지만 / 전체 적용 토글 */}
                <div className="flex text-xs border border-gray-200 rounded overflow-hidden mb-2">
                  <button
                    onClick={() => onApplyToAllChange(false)}
                    className={`flex-1 py-0.5 transition-colors ${
                      !applyToAll ? 'bg-[#475569] text-white' : 'bg-white text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    이 페이지만
                  </button>
                  <button
                    onClick={() => onApplyToAllChange(true)}
                    className={`flex-1 py-0.5 border-l border-gray-200 transition-colors ${
                      applyToAll ? 'bg-orange-500 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    전체 적용
                  </button>
                </div>

                {applyToAll && (
                  <p className="text-xs text-orange-500 mb-2">
                    ⚠ 전체 {state.excelRows.length}개 페이지에 동일하게 적용됩니다
                  </p>
                )}

                <div className="flex flex-col gap-1.5">
                  {state.fields.map((field) => (
                    <div key={field.id} className="flex items-center gap-1.5">
                      <span className="text-xs text-gray-500 whitespace-nowrap w-16 shrink-0">
                        {field.label}
                      </span>
                      <input
                        className={`h-6 text-xs border rounded px-1.5 flex-1 focus:outline-none ${
                          applyToAll
                            ? 'border-orange-300 focus:border-orange-500'
                            : 'border-gray-200 focus:border-[#475569]'
                        }`}
                        value={state.excelRows[selectedRowIndex]?.[field.label] ?? ''}
                        onChange={(e) => onRowFieldChange(field.label, e.target.value)}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* 페이지 썸네일 */}
              <PageThumbnails
                rows={state.excelRows}
                fields={state.fields}
                pageFieldOverrides={state.pageFieldOverrides}
                size={state.size}
                backgroundImage={state.backgroundImage}
                overlayImages={state.overlayImages}
                layers={state.layers}
                selectedIndex={selectedRowIndex}
                onSelect={onSelect}
              />
            </>
          )}
        </div>
      </div>
    </>
  )
}
