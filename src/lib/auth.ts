import { NextAuthOptions, getServerSession } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
    }),
  ],
  // 별도 DB 없이 쿠키에 담긴 JWT만으로 세션을 유지한다
  session: { strategy: 'jwt' },
  callbacks: {
    async jwt({ token, profile }) {
      if (profile?.email) token.email = profile.email
      return token
    },
    async session({ session, token }) {
      if (session.user && typeof token.email === 'string') session.user.email = token.email
      return session
    },
  },
}

/** 구글 로그인이 서버에 설정돼 있는지 */
export function isAuthConfigured(): boolean {
  return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.NEXTAUTH_SECRET)
}

/**
 * 현재 로그인한 사용자의 이메일. 로그인하지 않았으면 null.
 * 명단은 이 이메일로 구분해 저장·조회하므로 서버에서만 판단해야 한다.
 */
export async function getSessionEmail(): Promise<string | null> {
  const session = await getServerSession(authOptions)
  const email = session?.user?.email
  return typeof email === 'string' && email ? email.toLowerCase() : null
}
