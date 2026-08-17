import type { Metadata } from 'next'
import Link from 'next/link'
import { PRINT_TIPS, STEPS, TIPS } from '@/lib/guideContent'
import { GUIDE_DESCRIPTION, GUIDE_TITLE } from '@/lib/siteMeta'

export const metadata: Metadata = {
  title: GUIDE_TITLE,
  description: GUIDE_DESCRIPTION,
  alternates: { canonical: '/guide' },
  openGraph: { title: GUIDE_TITLE, description: GUIDE_DESCRIPTION, url: '/guide' },
}

/**
 * 사용 설명서를 그대로 담은 정적 페이지.
 *
 * 앱 화면의 사용법 패널은 눌러야 열리는 데다 클라이언트에서 그려져
 * 검색엔진이 읽지 못한다. 같은 내용을 서버에서 렌더해 검색에 잡히게 한다.
 */
export default function GuidePage() {
  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-[#475569] text-white px-4 py-2 flex items-center gap-3">
        <Link href="/" className="text-base font-bold tracking-tight hover:underline">
          명패 제작기
        </Link>
        <span className="text-[11px] text-white/60">사용 설명서</span>
        <Link
          href="/"
          className="ml-auto text-[11px] px-2 py-1 rounded bg-white/10 hover:bg-white/20 transition-colors"
        >
          제작기 열기
        </Link>
      </header>

      <main className="max-w-3xl mx-auto px-5 py-8">
        <article className="bg-white rounded-lg border border-gray-200 p-6">
          <h1 className="text-xl font-bold text-gray-900 mb-2">
            엑셀 명단으로 명패 만드는 방법
          </h1>
          <p className="text-sm text-gray-600 leading-relaxed mb-1">
            <b>명패 제작기</b>는 엑셀 명단만 올리면 행사·세미나·회의용 명패를 한 번에 만들어 A4
            인쇄용 PDF로 내려받는 무료 웹 도구입니다. 설치할 것 없이 브라우저에서 바로 쓸 수
            있습니다.
          </p>
          <p className="text-sm text-gray-600 leading-relaxed">
            한 장을 반으로 접으면 앞뒤 어느 쪽에서도 이름이 똑바로 보이도록, 같은 내용을 위아래로
            배치하고 위쪽을 180도 돌려 넣습니다. 이 배치는 자동으로 잡히므로 따로 손볼 필요가
            없습니다.
          </p>

          <hr className="my-6 border-gray-100" />

          <h2 className="text-base font-bold text-gray-800 mb-4">단계별 사용법</h2>
          <ol className="space-y-5">
            {STEPS.map((step) => (
              <li key={step.num} className="flex gap-3">
                <div className="w-5 h-5 rounded-full bg-[#475569] text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {step.num}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-800 mb-1">{step.title}</h3>
                  <p className="text-[13px] text-gray-500 leading-relaxed whitespace-pre-line">
                    {step.desc}
                  </p>
                </div>
              </li>
            ))}
          </ol>

          <hr className="my-6 border-gray-100" />

          <h2 className="text-base font-bold text-gray-800 mb-2.5">알아두면 좋은 점</h2>
          <ul className="space-y-2">
            {TIPS.map((tip, i) => (
              <li key={i} className="flex gap-2 text-[13px] text-gray-500 leading-relaxed">
                <span className="text-[#475569] shrink-0">•</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>

          <hr className="my-6 border-gray-100" />

          <h2 className="text-base font-bold text-gray-800 mb-2.5">명패 인쇄 설정</h2>
          <ul className="space-y-1.5">
            {PRINT_TIPS.map((tip, i) => (
              <li key={i} className="flex gap-2 text-[13px] text-gray-500 leading-relaxed">
                <span className="text-[#475569] shrink-0">•</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>

          <div className="mt-7 pt-5 border-t border-gray-100">
            <Link
              href="/"
              className="inline-flex items-center text-xs px-3 py-2 rounded bg-[#475569] text-white hover:bg-[#334155] transition-colors"
            >
              명패 제작기 시작하기
            </Link>
          </div>
        </article>
      </main>
    </div>
  )
}
