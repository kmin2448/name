'use client'
import { useEffect, useRef, useState } from 'react'
import { Users } from 'lucide-react'
import { VisitCounts, VISIT_SESSION_KEY, formatVisitCount, isVisitCounts } from '@/lib/visitCounter'

/**
 * 화면 오른쪽 아래에 고정되는 접속 수 표시.
 * 스크롤·패널 상태와 무관하게 항상 같은 자리에 남는다.
 */
export function VisitCounter() {
  const [counts, setCounts] = useState<VisitCounts | null>(null)
  const requested = useRef(false)

  useEffect(() => {
    // StrictMode에서 effect가 두 번 실행돼도 요청은 한 번만 보낸다.
    if (requested.current) return
    requested.current = true

    // 같은 탭에서 새로고침한 경우엔 다시 집계하지 않고 현재 값만 읽는다.
    let alreadyCounted = false
    try {
      alreadyCounted = sessionStorage.getItem(VISIT_SESSION_KEY) === '1'
    } catch {
      // 프라이빗 모드 등으로 sessionStorage를 못 쓰면 중복 방지 없이 진행한다.
    }

    // 요청을 한 번만 보내므로 언마운트 시 abort하지 않는다.
    // (abort하면 StrictMode의 두 번째 실행이 위 가드에 막혀 재요청되지 않는다)
    fetch('/api/visits', { method: alreadyCounted ? 'GET' : 'POST' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: unknown) => {
        if (!isVisitCounts(data)) return
        setCounts({ today: data.today, total: data.total })
        if (!alreadyCounted) {
          try {
            sessionStorage.setItem(VISIT_SESSION_KEY, '1')
          } catch {
            // 저장 실패는 표시에 영향이 없으므로 무시한다.
          }
        }
      })
      .catch(() => {
        // 집계 실패는 앱 사용에 영향이 없으므로 조용히 숨긴다.
      })
  }, [])

  // 값을 못 받으면(환경 변수 미설정·네트워크 오류) 아무것도 그리지 않는다.
  if (!counts) return null

  return (
    <div
      className="fixed bottom-3 right-3 z-30 pointer-events-none select-none flex items-center gap-2 rounded-md bg-[#475569]/90 px-2.5 py-1.5 text-[11px] leading-none text-white shadow-lg backdrop-blur-sm tabular-nums"
      title="페이지 접속 수 (오늘 / 전체)"
    >
      <Users className="w-3 h-3 opacity-70" />
      <span>
        오늘 <b className="font-semibold">{formatVisitCount(counts.today)}</b>
      </span>
      <span className="opacity-40">|</span>
      <span>
        전체 <b className="font-semibold">{formatVisitCount(counts.total)}</b>
      </span>
    </div>
  )
}
