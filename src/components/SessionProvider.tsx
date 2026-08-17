'use client'
import { SessionProvider as NextAuthSessionProvider } from 'next-auth/react'

/** next-auth의 SessionProvider는 클라이언트 컴포넌트라 별도 래퍼가 필요하다 */
export function SessionProvider({ children }: { children: React.ReactNode }) {
  return <NextAuthSessionProvider>{children}</NextAuthSessionProvider>
}
