'use client'
import { useCallback, useEffect, useState } from 'react'
import { signIn, signOut, useSession } from 'next-auth/react'
import { FolderOpen, X, LogOut } from 'lucide-react'
import { MAX_ROSTERS, RosterPayload } from '@/lib/rosters'
import { ApplyMode, DesignImages, DesignPayload, MAX_DESIGNS } from '@/lib/designs'
import { NameplateState } from '@/types/nameplate'
import { RosterLibrary } from '@/components/library/RosterLibrary'
import { DesignLibrary } from '@/components/library/DesignLibrary'

const PANEL_WIDTH = 380

type Tab = 'roster' | 'design'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  showHint: boolean
  /** 지금 편집 중인 상태 (디자인 저장에 사용) */
  state: NameplateState
  /** 명단 저장용 — 현재 상태에서 저장 형식만 추려 돌려준다 */
  getRosterPayload: () => RosterPayload
  onLoadRoster: (payload: RosterPayload) => void
  onApplyDesign: (payload: DesignPayload, images: DesignImages, mode: ApplyMode) => void
  pageCount: number
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

/**
 * 저장해 둔 명단과 명패 디자인을 한 창에서 다루는 패널.
 * 창 상단의 탭으로 명단/디자인을 오간다.
 */
export function LibraryPanel({
  open,
  onOpenChange,
  showHint,
  state,
  getRosterPayload,
  onLoadRoster,
  onApplyDesign,
  pageCount,
}: Props) {
  const { data: session, status } = useSession()
  const email = session?.user?.email ?? null
  const hasDriveScope = session?.hasDriveScope === true

  const [tab, setTab] = useState<Tab>('roster')
  // null = 아직 확인 전, false = 서버에 로그인/시트 설정이 없어 기능을 숨김
  const [enabled, setEnabled] = useState<boolean | null>(null)

  const probe = useCallback(async () => {
    try {
      const res = await fetch('/api/rosters')
      // 503 = 서버 미설정. 로그인 여부와 무관하게 기능 자체를 감춘다.
      setEnabled(res.status !== 503)
    } catch {
      setEnabled(false)
    }
  }, [])

  useEffect(() => {
    if (enabled === null) probe()
  }, [enabled, probe])

  if (enabled !== true) return null

  return (
    <>
      {/* 토글 버튼 — 썸네일 버튼 아래. 안내 문구가 버튼 왼쪽에 항상 붙어 다닌다 */}
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
            구글로 로그인하여 작성 명단/ 디자인을 관리하세요.
          </span>
        )}
        <button
          onClick={() => onOpenChange(!open)}
          className="pointer-events-auto bg-[#475569] text-white flex flex-col items-center gap-1.5 px-1.5 py-4 rounded-l-lg shadow-lg hover:bg-[#334155] active:bg-[#1e293b]"
          title={open ? '닫기' : '내 자료 (명단·디자인)'}
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
                내 자료
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
            <h2 className="text-sm font-bold text-gray-800">내 자료</h2>
          </div>

          {status === 'loading' ? (
            <p className="text-xs text-gray-400 text-center py-12">확인 중...</p>
          ) : !email ? (
            <div className="py-8 flex flex-col items-center gap-3">
              <p className="text-xs text-gray-500 text-center leading-relaxed">
                구글로 로그인하면 만든 명단을 최대 {MAX_ROSTERS}건,<br />
                배경·오버레이 디자인을 최대 {MAX_DESIGNS}건까지<br />
                저장하고 언제든 다시 불러올 수 있습니다.
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
                  로그인에는{' '}
                  <span className="font-medium text-gray-600">이름·이메일 정보만</span> 사용합니다.
                  구글 드라이브 등 다른 권한은 요청하지 않습니다.
                </p>
                <p className="text-gray-400">
                  배경·오버레이 이미지를 저장하는{' '}
                  <span className="font-medium text-gray-500">디자인 기능을 처음 쓸 때</span>만
                  드라이브 액세스 권한을 따로 여쭤봅니다. 그때 승인하지 않아도 로그인은 유지되고,
                  명단 관리는 그대로 이용할 수 있습니다.
                </p>
                <p className="text-gray-400">
                  저장한 배경·오버레이 이미지는{' '}
                  <span className="font-medium text-gray-500">
                    본인 구글 드라이브의 &ldquo;명패 제작기&rdquo; 폴더
                  </span>
                  에 보관됩니다. 이 사이트의 서버에는 이미지를 따로 보관하지 않으며, 드라이브에서
                  직접 확인하거나 지울 수 있습니다.
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-3 text-xs text-gray-500">
                <span className="truncate" title={email}>
                  {email}
                </span>
                <button
                  onClick={() => signOut()}
                  className="flex items-center gap-1 shrink-0 px-1.5 py-0.5 rounded border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  <LogOut className="w-3 h-3" />
                  로그아웃
                </button>
              </div>

              {/* 명단 / 디자인 전환 */}
              <div className="flex text-xs border border-gray-200 rounded overflow-hidden mb-4">
                <button
                  onClick={() => setTab('roster')}
                  className={`flex-1 py-1.5 font-medium transition-colors ${
                    tab === 'roster'
                      ? 'bg-[#475569] text-white'
                      : 'bg-white text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  명단
                </button>
                <button
                  onClick={() => setTab('design')}
                  className={`flex-1 py-1.5 font-medium border-l border-gray-200 transition-colors ${
                    tab === 'design'
                      ? 'bg-[#475569] text-white'
                      : 'bg-white text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  디자인
                </button>
              </div>

              {tab === 'roster' ? (
                <RosterLibrary
                  getPayload={getRosterPayload}
                  onLoad={onLoadRoster}
                  pageCount={pageCount}
                />
              ) : (
                <DesignLibrary state={state} onApply={onApplyDesign} hasDriveScope={hasDriveScope} />
              )}
            </>
          )}
        </div>
      </div>
    </>
  )
}
