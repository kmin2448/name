'use client'
import { useCallback, useEffect, useState } from 'react'
import { signIn, signOut, useSession } from 'next-auth/react'
import { toast } from 'sonner'
import { FolderOpen, X, Save, Trash2, Download, Pencil, LogOut } from 'lucide-react'
import { MAX_ROSTERS, RosterPayload, RosterSummary } from '@/lib/rosters'

const PANEL_WIDTH = 380

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** 지금 편집 중인 내용을 저장 형식으로 변환해 돌려준다 */
  getPayload: () => RosterPayload
  /** 불러온 명단을 편집 화면에 반영한다 */
  onLoad: (payload: RosterPayload) => void
  pageCount: number
  /** 열린 패널 위에 글자가 겹치지 않도록, 패널이 모두 닫혔을 때만 안내 문구를 보여준다 */
  showHint: boolean
}

/** 구글 브랜드 가이드의 4색 'G' 마크 */
function GoogleMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true" className="shrink-0">
      <path
        fill="#4285F4"
        d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z"
      />
      <path
        fill="#34A853"
        d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z"
      />
      <path
        fill="#FBBC05"
        d="M11.69 28.18C11.25 26.86 11 25.45 11 24s.25-2.86.69-4.18v-5.7H4.34C2.85 17.09 2 20.45 2 24s.85 6.91 2.34 9.88l7.35-5.7z"
      />
      <path
        fill="#EA4335"
        d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z"
      />
    </svg>
  )
}

function formatSavedAt(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

async function readError(res: Response, fallback: string): Promise<string> {
  try {
    const body = (await res.json()) as { error?: string }
    return body.error ?? fallback
  } catch {
    return fallback
  }
}

export function RosterPanel({ open, onOpenChange, getPayload, onLoad, pageCount, showHint }: Props) {
  const { data: session, status } = useSession()
  const email = session?.user?.email ?? null

  const [items, setItems] = useState<RosterSummary[]>([])
  const [title, setTitle] = useState('')
  const [busy, setBusy] = useState(false)
  const [loaded, setLoaded] = useState(false)
  // null = 아직 확인 전, false = 서버에 로그인/시트 설정이 없어 기능을 숨김
  const [enabled, setEnabled] = useState<boolean | null>(null)

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/rosters')
      // 503 = 서버 미설정. 로그인 여부와 무관하게 기능 자체를 감춘다.
      if (res.status === 503) {
        setEnabled(false)
        return
      }
      setEnabled(true)
      if (res.status === 401) return // 로그인 전 — 목록 없음이 정상
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

  // 마운트 시 설정 여부를 확인하고, 패널을 열거나 로그인하면 목록을 갱신한다
  useEffect(() => {
    if (enabled === null || (open && email)) refresh()
  }, [open, email, enabled, refresh])

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

  // 서버에 구글 로그인·시트가 설정되기 전에는 버튼 자체를 노출하지 않는다
  if (enabled !== true) return null

  return (
    <>
      {/* 토글 버튼 — 썸네일 버튼 아래 (우측 두 번째). 안내 문구가 버튼 왼쪽에 항상 붙어 다닌다 */}
      <div
        className="fixed z-50 flex items-center gap-2 pointer-events-none"
        style={{
          right: open ? PANEL_WIDTH : 0,
          top: '25%',
          transform: 'translateY(-50%)',
          transition: 'right 300ms ease',
        }}
      >
        {showHint && (
          <span className="text-[11px] font-medium text-gray-700 whitespace-nowrap">
            구글로 로그인하여 작성 명단을 관리하세요.
          </span>
        )}
        <button
          onClick={() => onOpenChange(!open)}
          className="pointer-events-auto bg-[#475569] text-white flex flex-col items-center gap-1.5 px-1.5 py-4 rounded-l-lg shadow-lg hover:bg-[#334155] active:bg-[#1e293b]"
          title={open ? '닫기' : '내 명단'}
        >
          {open ? (
            <X className="w-4 h-4" />
          ) : (
            <>
              <FolderOpen className="w-4 h-4" />
              <span
                className="text-[11px] font-medium tracking-wide"
                style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
              >
                내 명단
              </span>
            </>
          )}
        </button>
      </div>

      <div
        className="fixed top-0 right-0 h-full bg-white border-l border-gray-200 shadow-2xl z-[40] overflow-y-auto"
        style={{
          width: PANEL_WIDTH,
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 300ms ease',
        }}
      >
        <div className="p-4 pb-8">
          <div className="flex items-center gap-2 mb-4">
            <FolderOpen className="w-4 h-4 text-[#475569] shrink-0" />
            <h2 className="text-sm font-bold text-gray-800">내 명단</h2>
          </div>

          {status === 'loading' ? (
            <p className="text-xs text-gray-400 text-center py-12">확인 중...</p>
          ) : !email ? (
            <div className="py-10 flex flex-col items-center gap-3">
              <p className="text-xs text-gray-500 text-center leading-relaxed">
                구글로 로그인하면 만든 명단을<br />
                최대 {MAX_ROSTERS}건까지 저장하고<br />
                언제든 다시 불러올 수 있습니다.
              </p>
              <button
                onClick={() => signIn('google')}
                className="flex items-center gap-2 text-xs font-medium px-3 py-2 rounded border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 active:bg-gray-100 shadow-sm transition-colors"
              >
                <GoogleMark />
                구글로 로그인
              </button>

              <div className="text-[11px] text-gray-500 leading-relaxed text-left border-t border-gray-100 pt-3 mt-1 space-y-1.5">
                <p>
                  배경 서식 저장을 위해 구글 드라이브 액세스 권한 승인이 필요합니다. 사용자가
                  업로드하는 배경 이미지와 서식 정보 외에 다른 정보는 저장되지 않습니다.
                </p>
                <p className="text-gray-400">
                  권한을 승인하지 않아도 <span className="font-medium text-gray-500">명단 관리는
                  그대로 이용</span>할 수 있습니다. 승인하지 않으면 &ldquo;내 디자인&rdquo;의 배경·오버레이
                  저장만 제한되고, 다른 제약은 없습니다. 나중에 다시 로그인해 권한을 허용할 수도
                  있습니다.
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-3 text-xs text-gray-500">
                <span className="truncate" title={email}>{email}</span>
                <button
                  onClick={() => signOut()}
                  className="flex items-center gap-1 shrink-0 px-1.5 py-0.5 rounded border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  <LogOut className="w-3 h-3" />
                  로그아웃
                </button>
              </div>

              {/* 현재 명단 저장 */}
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
                  명단과 텍스트 서식(규격·위치·크기·색)이 저장됩니다. 배경·오버레이 이미지는
                  저장되지 않으니 불러온 뒤 다시 선택해 주세요.
                </p>
              </div>

              {/* 저장 목록 */}
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
          )}
        </div>
      </div>
    </>
  )
}
