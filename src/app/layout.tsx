import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { SessionProvider } from '@/components/SessionProvider'
import {
  NAVER_SITE_VERIFICATION,
  SITE_DESCRIPTION,
  SITE_KEYWORDS,
  SITE_NAME,
  SITE_TITLE,
  buildJsonLd,
  resolveSiteUrl,
} from '@/lib/siteMeta'

const inter = Inter({ subsets: ['latin'] })

const siteUrl = resolveSiteUrl()

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: SITE_TITLE,
    // 하위 페이지는 "페이지 이름 | 명패 제작기"로 붙는다
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  keywords: SITE_KEYWORDS,
  applicationName: SITE_NAME,
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    url: siteUrl,
    siteName: SITE_NAME,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: 'summary',
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
  },
  // 검색엔진 소유 확인.
  // 네이버는 받은 값을 코드에 담아 뒀고, 구글은 public/의 확인 파일로 끝냈다.
  // (구글도 메타 태그로 하고 싶으면 환경 변수만 채우면 된다)
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
    other: {
      'naver-site-verification':
        process.env.NEXT_PUBLIC_NAVER_SITE_VERIFICATION || NAVER_SITE_VERIFICATION,
    },
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className={inter.className}>
        {/* 검색엔진이 어떤 종류의 사이트인지 알아보도록 구조화 데이터를 심는다 */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(buildJsonLd(siteUrl)) }}
        />
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  )
}
