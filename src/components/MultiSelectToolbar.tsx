'use client'
import { AlignLeft, AlignCenter, AlignRight, Minus, Plus, X } from 'lucide-react'
import { AlignMode, AlignReference } from '@/lib/selection'
import { FONT_SIZE_STEP, FONT_SIZE_STEP_COARSE } from '@/lib/fontSize'

type Props = {
  count: number
  /** 선택 항목 중 텍스트 항목 수 (색상·글자 크기 변경 가능 여부 판단) */
  textFieldCount: number
  /** 색상 입력에 표시할 대표 색상 */
  color: string
  reference: AlignReference
  onReferenceChange: (reference: AlignReference) => void
  onAlign: (mode: AlignMode) => void
  onColorChange: (color: string) => void
  /** 선택한 텍스트 항목의 글자 크기를 각자의 현재 크기 기준으로 증감 */
  onFontSizeStep: (delta: number) => void
  onClear: () => void
}

const ALIGN_BUTTONS: { mode: AlignMode; label: string; Icon: typeof AlignLeft }[] = [
  { mode: 'left', label: '왼쪽 끝 정렬', Icon: AlignLeft },
  { mode: 'center', label: '가운데 정렬', Icon: AlignCenter },
  { mode: 'right', label: '오른쪽 끝 정렬', Icon: AlignRight },
]

const REFERENCES: { value: AlignReference; label: string; title: string }[] = [
  { value: 'selection', label: '선택 영역', title: '선택한 항목들의 바깥 경계를 기준으로 정렬합니다' },
  { value: 'canvas', label: '명패', title: '명패 전체 폭을 기준으로 정렬합니다' },
]

export function MultiSelectToolbar({
  count, textFieldCount, color, reference,
  onReferenceChange, onAlign, onColorChange, onFontSizeStep, onClear,
}: Props) {
  const stepOf = (e: React.MouseEvent) => (e.shiftKey ? FONT_SIZE_STEP_COARSE : FONT_SIZE_STEP)
  const noText = textFieldCount === 0

  return (
    <div
      data-marquee-ignore
      className="absolute top-2 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 rounded-md border border-gray-300 bg-white/95 px-2.5 py-1.5 shadow-lg backdrop-blur"
    >
      <span className="shrink-0 text-[11px] font-semibold text-[#475569]">{count}개 선택</span>

      <div className="h-4 w-px shrink-0 bg-gray-200" />

      {/* 정렬 기준 */}
      <div className="flex shrink-0 overflow-hidden rounded border border-gray-200">
        {REFERENCES.map((ref) => (
          <button
            key={ref.value}
            type="button"
            onClick={() => onReferenceChange(ref.value)}
            title={ref.title}
            className={`px-1.5 py-0.5 text-[10px] transition-colors ${
              reference === ref.value
                ? 'bg-[#475569] text-white'
                : 'bg-white text-gray-500 hover:bg-gray-50'
            }`}
          >
            {ref.label}
          </button>
        ))}
      </div>

      {/* 가로 정렬 */}
      <div className="flex shrink-0 items-center gap-0.5">
        {ALIGN_BUTTONS.map(({ mode, label, Icon }) => (
          <button
            key={mode}
            type="button"
            onClick={() => onAlign(mode)}
            title={label}
            aria-label={label}
            className="flex h-7 w-7 items-center justify-center rounded border border-gray-200 bg-white text-[#475569] transition-colors hover:bg-gray-100 active:bg-gray-200"
          >
            <Icon className="h-3.5 w-3.5" />
          </button>
        ))}
      </div>

      <div className="h-4 w-px shrink-0 bg-gray-200" />

      {/* 글자 크기 — 각 항목의 현재 크기를 기준으로 증감 (Shift: 10씩) */}
      <div
        className={`flex shrink-0 items-center gap-1 text-[10px] ${noText ? 'opacity-40' : 'text-gray-500'}`}
      >
        크기
        <button
          type="button"
          disabled={noText}
          onClick={(e) => onFontSizeStep(-stepOf(e))}
          title={`글자 크기 ${FONT_SIZE_STEP}씩 줄이기 (Shift+클릭: ${FONT_SIZE_STEP_COARSE}씩)`}
          aria-label="글자 크기 줄이기"
          className="flex h-6 w-6 items-center justify-center rounded border border-gray-200 bg-white text-[#475569] transition-colors hover:bg-gray-100 active:bg-gray-200 disabled:cursor-not-allowed disabled:hover:bg-white"
        >
          <Minus className="h-3 w-3" />
        </button>
        <button
          type="button"
          disabled={noText}
          onClick={(e) => onFontSizeStep(stepOf(e))}
          title={`글자 크기 ${FONT_SIZE_STEP}씩 키우기 (Shift+클릭: ${FONT_SIZE_STEP_COARSE}씩)`}
          aria-label="글자 크기 키우기"
          className="flex h-6 w-6 items-center justify-center rounded border border-gray-200 bg-white text-[#475569] transition-colors hover:bg-gray-100 active:bg-gray-200 disabled:cursor-not-allowed disabled:hover:bg-white"
        >
          <Plus className="h-3 w-3" />
        </button>
      </div>

      <div className="h-4 w-px shrink-0 bg-gray-200" />

      {/* 글자 색상 일괄 변경 */}
      <label
        className={`flex shrink-0 items-center gap-1 text-[10px] ${noText ? 'opacity-40' : 'text-gray-500'}`}
        title={
          noText
            ? '선택 항목에 텍스트가 없습니다'
            : `텍스트 ${textFieldCount}개의 글자 색상을 한 번에 변경합니다`
        }
      >
        색상
        <input
          type="color"
          value={color}
          disabled={noText}
          onChange={(e) => onColorChange(e.target.value)}
          className="h-6 w-7 cursor-pointer rounded border border-input p-0.5 disabled:cursor-not-allowed"
        />
      </label>

      <div className="h-4 w-px shrink-0 bg-gray-200" />

      <button
        type="button"
        onClick={onClear}
        title="선택 해제"
        aria-label="선택 해제"
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
