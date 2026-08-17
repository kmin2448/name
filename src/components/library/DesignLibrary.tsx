'use client'
import { useCallback, useEffect, useState } from 'react'
import { signIn } from 'next-auth/react'
import { toast } from 'sonner'
import { Save, Trash2, Download, Pencil } from 'lucide-react'
import { ApplyMode, DesignImages, DesignPayload, DesignSummary, MAX_DESIGNS } from '@/lib/designs'
import { DRIVE_UPGRADE_AUTH_PARAMS } from '@/lib/googleScopes'
import { NameplateState } from '@/types/nameplate'
import { formatSavedAt, readError } from '@/components/library/shared'

type Props = {
  /** 저장할 현재 편집 상태 */
  state: NameplateState
  /** 불러온 디자인을 편집 화면에 적용한다 */
  onApply: (payload: DesignPayload, images: DesignImages, mode: ApplyMode) => void
  /** 구글 드라이브 접근 권한을 승인받았는지 */
  hasDriveScope: boolean
}

/** '내 자료' 패널의 디자인 탭 — 로그인한 상태에서만 그려진다 */
export function DesignLibrary({ state, onApply, hasDriveScope }: Props) {
  const [items, setItems] = useState<DesignSummary[]>([])
  const [title, setTitle] = useState('')
  const [applyMode, setApplyMode] = useState<ApplyMode>('overwrite')
  const [busy, setBusy] = useState(false)
  const [loaded, setLoaded] = useState(false)

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/designs')
      if (res.status === 401 || res.status === 503) return
      if (!res.ok) {
        toast.error(await readError(res, '저장된 디자인을 불러오지 못했습니다.'))
        return
      }
      const body = (await res.json()) as { items: DesignSummary[] }
      setItems(body.items)
    } catch {
      toast.error('저장된 디자인을 불러오지 못했습니다.')
    } finally {
      setLoaded(true)
    }
  }, [])

  useEffect(() => {
    if (hasDriveScope) refresh()
  }, [hasDriveScope, refresh])

  const hasImage = !!state.backgroundImage || state.overlayImages.length > 0

  const handleSave = async (overwriteId?: string) => {
    if (!hasImage) {
      toast.error('저장할 이미지가 없습니다. 배경이나 오버레이 이미지를 먼저 설정해 주세요.')
      return
    }
    setBusy(true)
    // 이미지 업로드가 있어 시간이 걸리므로 진행 상태를 알려준다
    const toastId = toast.loading('드라이브에 이미지를 올리는 중...')
    try {
      const res = await fetch('/api/designs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: overwriteId, title, state }),
      })
      if (!res.ok) {
        toast.error(await readError(res, '저장하지 못했습니다.'), { id: toastId })
        return
      }
      const body = (await res.json()) as { item: DesignSummary }
      toast.success(`'${body.item.title}' 디자인을 저장했습니다.`, { id: toastId })
      setTitle('')
      await refresh()
    } catch {
      toast.error('저장하지 못했습니다.', { id: toastId })
    } finally {
      setBusy(false)
    }
  }

  const handleApply = async (item: DesignSummary) => {
    setBusy(true)
    const toastId = toast.loading('디자인을 불러오는 중...')
    try {
      const res = await fetch(`/api/designs/${encodeURIComponent(item.id)}`)
      if (!res.ok) {
        toast.error(await readError(res, '불러오지 못했습니다.'), { id: toastId })
        return
      }
      const body = (await res.json()) as { payload: DesignPayload; images: DesignImages }
      onApply(body.payload, body.images, applyMode)
      toast.success(
        applyMode === 'overwrite'
          ? `'${item.title}'을(를) 적용했습니다. 텍스트 서식도 저장 당시 값으로 바꿨습니다.`
          : `'${item.title}'의 이미지를 적용했습니다. 현재 서식은 그대로입니다.`,
        { id: toastId }
      )
    } catch {
      toast.error('불러오지 못했습니다.', { id: toastId })
    } finally {
      setBusy(false)
    }
  }

  const handleRename = async (item: DesignSummary) => {
    const next = window.prompt('건명을 입력하세요.', item.title)
    if (next === null) return
    if (!next.trim()) {
      toast.error('건명을 입력해 주세요.')
      return
    }
    setBusy(true)
    try {
      const res = await fetch(`/api/designs/${encodeURIComponent(item.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: next }),
      })
      if (!res.ok) {
        toast.error(await readError(res, '건명을 수정하지 못했습니다.'))
        return
      }
      await refresh()
    } finally {
      setBusy(false)
    }
  }

  const handleDelete = async (item: DesignSummary) => {
    if (!window.confirm(`'${item.title}'을(를) 삭제할까요? 드라이브에 올린 이미지도 함께 지워집니다.`)) {
      return
    }
    setBusy(true)
    try {
      const res = await fetch(`/api/designs/${encodeURIComponent(item.id)}`, { method: 'DELETE' })
      if (!res.ok) {
        toast.error(await readError(res, '삭제하지 못했습니다.'))
        return
      }
      toast.success('삭제했습니다.')
      await refresh()
    } finally {
      setBusy(false)
    }
  }

  // 아직 드라이브 권한을 요청하지 않았거나, 요청했지만 승인하지 않은 경우.
  // 로그인 단계에서는 권한을 묻지 않으므로 대부분 여기서 처음 만나게 된다.
  if (!hasDriveScope) {
    return (
      <div className="py-8 flex flex-col items-center gap-3">
        <p className="text-xs text-gray-500 text-center leading-relaxed">
          디자인을 저장하려면 구글 드라이브<br />
          액세스 권한이 필요합니다.<br />
          <span className="text-gray-400">
            명단 관리는 권한 없이도 그대로 이용할 수 있습니다.
          </span>
        </p>
        <button
          onClick={() => signIn('google', undefined, DRIVE_UPGRADE_AUTH_PARAMS)}
          className="text-xs px-3 py-1.5 rounded bg-[#475569] text-white hover:bg-[#334155] active:bg-[#1e293b] transition-colors"
        >
          드라이브 권한 허용하기
        </button>
        <p className="text-[11px] text-gray-400 text-center leading-relaxed">
          업로드한 배경 이미지와 서식 정보만 저장되며,<br />
          드라이브의 다른 파일에는 접근하지 않습니다.<br />
          승인하지 않고 화면을 닫아도 로그인은 유지됩니다.
        </p>
      </div>
    )
  }

  const isFull = items.length >= MAX_DESIGNS

  return (
    <>
      <div className="px-3 pt-3 pb-2 rounded border border-gray-200 bg-gray-50 mb-4">
        <p className="text-xs font-semibold text-gray-600 mb-2">
          현재 디자인 저장 ({items.length}/{MAX_DESIGNS}건)
        </p>
        <input
          className="h-7 w-full text-xs border border-gray-200 rounded px-2 mb-2 focus:outline-none focus:border-[#475569]"
          placeholder="건명 (비워두면 날짜로 자동 생성)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <button
          onClick={() => handleSave()}
          disabled={busy || isFull || !hasImage}
          className="w-full flex items-center justify-center gap-1.5 text-xs py-1.5 rounded bg-[#475569] text-white hover:bg-[#334155] active:bg-[#1e293b] transition-colors disabled:opacity-40"
        >
          <Save className="w-3.5 h-3.5" />
          {hasImage ? '배경·오버레이 저장' : '저장할 이미지 없음'}
        </button>
        {isFull && (
          <p className="text-xs text-orange-500 mt-2">
            ⚠ {MAX_DESIGNS}건이 모두 찼습니다. 아래에서 기존 디자인을 삭제해 주세요.
          </p>
        )}
        <p className="text-[11px] text-gray-400 mt-2 leading-relaxed">
          이미지는 본인 구글 드라이브의 &ldquo;명패 제작기&rdquo; 폴더에 저장되고, 배치값과 텍스트 서식은
          디자인 시트에 저장됩니다.
        </p>
      </div>

      {/* 불러올 때 서식 처리 방식 */}
      <div className="mb-3">
        <p className="text-xs font-semibold text-gray-600 mb-1.5">불러올 때 텍스트 서식</p>
        <div className="flex text-xs border border-gray-200 rounded overflow-hidden">
          <button
            onClick={() => setApplyMode('overwrite')}
            className={`flex-1 py-1 transition-colors ${
              applyMode === 'overwrite'
                ? 'bg-[#475569] text-white'
                : 'bg-white text-gray-500 hover:bg-gray-50'
            }`}
            title="저장 당시의 폰트 크기·위치·색상으로 바꿉니다"
          >
            저장값으로 덮어쓰기
          </button>
          <button
            onClick={() => setApplyMode('keep')}
            className={`flex-1 py-1 border-l border-gray-200 transition-colors ${
              applyMode === 'keep' ? 'bg-[#475569] text-white' : 'bg-white text-gray-500 hover:bg-gray-50'
            }`}
            title="이미지만 바꾸고 지금 서식은 그대로 둡니다"
          >
            현재 서식 유지
          </button>
        </div>
        <p className="text-[11px] text-gray-400 mt-1.5 leading-relaxed">
          {applyMode === 'overwrite'
            ? '폰트 크기·위치·색상과 페이지별 개별 서식이 저장 당시 값으로 바뀝니다.'
            : '배경·오버레이 이미지와 명패 규격만 바뀌고 서식은 지금 것을 씁니다.'}
          {' '}명단은 어느 쪽이든 그대로 유지됩니다.
        </p>
      </div>

      {items.length === 0 ? (
        <p className="text-xs text-gray-400 text-center py-8">
          {loaded ? '저장된 디자인이 없습니다.' : '불러오는 중...'}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((item) => (
            <li
              key={item.id}
              className="border border-gray-200 rounded px-2.5 py-2 hover:border-[#475569] transition-colors"
            >
              <p className="text-xs font-semibold text-gray-800 truncate" title={item.title}>
                {item.title}
              </p>
              <p className="text-[11px] text-gray-400 mb-1.5">{formatSavedAt(item.savedAt)}</p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleApply(item)}
                  disabled={busy}
                  className="flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded bg-[#475569] text-white hover:bg-[#334155] transition-colors disabled:opacity-40"
                >
                  <Download className="w-3 h-3" />
                  적용
                </button>
                <button
                  onClick={() => handleSave(item.id)}
                  disabled={busy || !hasImage}
                  className="flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors disabled:opacity-40"
                  title="현재 디자인으로 이 건을 덮어씁니다"
                >
                  <Save className="w-3 h-3" />
                  덮어쓰기
                </button>
                <button
                  onClick={() => handleRename(item)}
                  disabled={busy}
                  className="flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors disabled:opacity-40"
                  title="건명 수정"
                >
                  <Pencil className="w-3 h-3" />
                </button>
                <button
                  onClick={() => handleDelete(item)}
                  disabled={busy}
                  className="flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded border border-gray-200 text-gray-500 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors disabled:opacity-40 ml-auto"
                  title="삭제"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
