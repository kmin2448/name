'use client'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Save, Trash2, Download, Pencil } from 'lucide-react'
import { MAX_ROSTERS, RosterPayload, RosterSummary } from '@/lib/rosters'
import { formatSavedAt, readError } from '@/components/library/shared'

type Props = {
  /** 지금 편집 중인 내용을 저장 형식으로 변환해 돌려준다 */
  getPayload: () => RosterPayload
  /** 불러온 명단을 편집 화면에 반영한다 */
  onLoad: (payload: RosterPayload) => void
  pageCount: number
}

/** '내 자료' 패널의 명단 탭 — 로그인한 상태에서만 그려진다 */
export function RosterLibrary({ getPayload, onLoad, pageCount }: Props) {
  const [items, setItems] = useState<RosterSummary[]>([])
  const [title, setTitle] = useState('')
  const [busy, setBusy] = useState(false)
  const [loaded, setLoaded] = useState(false)

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/rosters')
      if (res.status === 401 || res.status === 503) return
      if (!res.ok) {
        toast.error(await readError(res, '저장된 명단을 불러오지 못했습니다.'))
        return
      }
      const body = (await res.json()) as { items: RosterSummary[] }
      setItems(body.items)
    } catch {
      toast.error('저장된 명단을 불러오지 못했습니다.')
    } finally {
      setLoaded(true)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const handleSave = async (overwriteId?: string) => {
    if (pageCount === 0) {
      toast.error('저장할 명단이 없습니다. 페이지를 먼저 만들어 주세요.')
      return
    }
    setBusy(true)
    try {
      const res = await fetch('/api/rosters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: overwriteId, title, payload: getPayload() }),
      })
      if (!res.ok) {
        toast.error(await readError(res, '저장하지 못했습니다.'))
        return
      }
      const body = (await res.json()) as { item: RosterSummary }
      toast.success(`'${body.item.title}' 저장 완료`)
      setTitle('')
      await refresh()
    } catch {
      toast.error('저장하지 못했습니다.')
    } finally {
      setBusy(false)
    }
  }

  const handleLoad = async (item: RosterSummary) => {
    setBusy(true)
    try {
      const res = await fetch(`/api/rosters/${encodeURIComponent(item.id)}`)
      if (!res.ok) {
        toast.error(await readError(res, '불러오지 못했습니다.'))
        return
      }
      const body = (await res.json()) as { payload: RosterPayload }
      onLoad(body.payload)
      toast.success(`'${item.title}'을(를) 불러왔습니다. (${body.payload.excelRows.length}명)`)
    } catch {
      toast.error('불러오지 못했습니다.')
    } finally {
      setBusy(false)
    }
  }

  const handleRename = async (item: RosterSummary) => {
    const next = window.prompt('건명을 입력하세요.', item.title)
    if (next === null) return
    if (!next.trim()) {
      toast.error('건명을 입력해 주세요.')
      return
    }
    setBusy(true)
    try {
      const res = await fetch(`/api/rosters/${encodeURIComponent(item.id)}`, {
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

  const handleDelete = async (item: RosterSummary) => {
    if (!window.confirm(`'${item.title}'을(를) 삭제할까요? 되돌릴 수 없습니다.`)) return
    setBusy(true)
    try {
      const res = await fetch(`/api/rosters/${encodeURIComponent(item.id)}`, { method: 'DELETE' })
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

  const isFull = items.length >= MAX_ROSTERS

  return (
    <>
      <div className="px-3 pt-3 pb-2 rounded border border-gray-200 bg-gray-50 mb-4">
        <p className="text-xs font-semibold text-gray-600 mb-2">
          현재 명단 저장 ({items.length}/{MAX_ROSTERS}건)
        </p>
        <input
          className="h-7 w-full text-xs border border-gray-200 rounded px-2 mb-2 focus:outline-none focus:border-[#475569]"
          placeholder="건명 (비워두면 프로그램명 + 날짜로 자동 생성)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <button
          onClick={() => handleSave()}
          disabled={busy || isFull || pageCount === 0}
          className="w-full flex items-center justify-center gap-1.5 text-xs py-1.5 rounded bg-[#475569] text-white hover:bg-[#334155] active:bg-[#1e293b] transition-colors disabled:opacity-40"
        >
          <Save className="w-3.5 h-3.5" />
          {pageCount === 0 ? '저장할 명단 없음' : `현재 ${pageCount}명 저장`}
        </button>
        {isFull && (
          <p className="text-xs text-orange-500 mt-2">
            ⚠ {MAX_ROSTERS}건이 모두 찼습니다. 아래에서 기존 건을 삭제한 뒤 저장해 주세요.
          </p>
        )}
        <p className="text-[11px] text-gray-400 mt-2 leading-relaxed">
          명단과 텍스트 서식(규격·위치·크기·색)이 저장됩니다. 배경·오버레이 이미지는 디자인 탭에서
          따로 저장하세요.
        </p>
      </div>

      {items.length === 0 ? (
        <p className="text-xs text-gray-400 text-center py-8">
          {loaded ? '저장된 명단이 없습니다.' : '불러오는 중...'}
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
              <p className="text-[11px] text-gray-400 mb-1.5">
                {item.pageCount}명 · {formatSavedAt(item.savedAt)}
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleLoad(item)}
                  disabled={busy}
                  className="flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded bg-[#475569] text-white hover:bg-[#334155] transition-colors disabled:opacity-40"
                >
                  <Download className="w-3 h-3" />
                  불러오기
                </button>
                <button
                  onClick={() => handleSave(item.id)}
                  disabled={busy || pageCount === 0}
                  className="flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors disabled:opacity-40"
                  title="현재 편집 중인 명단으로 이 건을 덮어씁니다"
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
