import { NextAuthOptions, getServerSession } from 'next-auth'
import { getToken } from 'next-auth/jwt'
import GoogleProvider from 'next-auth/providers/google'
import type { NextRequest } from 'next/server'

// 앱이 직접 만든 파일만 접근하는 좁은 범위 — 사용자의 기존 드라이브 파일은 볼 수 없다.
const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file'
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'

/** 만료 직전에 미리 갱신하기 위한 여유 시간 */
const REFRESH_MARGIN_MS = 60 * 1000

type GoogleTokens = {
  accessToken?: string
  refreshToken?: string
  /** access token 만료 시각 (epoch ms) */
  expiresAt?: number
  /** 갱신에 실패해 다시 로그인해야 하는 상태 */
  error?: string
}

/** refresh token으로 access token을 다시 받아온다 */
async function refreshAccessToken(tokens: GoogleTokens): Promise<GoogleTokens> {
  if (!tokens.refreshToken) return { ...tokens, error: 'NoRefreshToken' }

  try {
    const res = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID ?? '',
        client_secret: process.env.GOOGLE_CLIENT_SECRET ?? '',
        grant_type: 'refresh_token',
        refresh_token: tokens.refreshToken,
      }),
    })
    const data = (await res.json()) as {
      access_token?: string
      expires_in?: number
      refresh_token?: string
    }
    if (!res.ok || !data.access_token) return { ...tokens, error: 'RefreshFailed' }

    return {
      accessToken: data.access_token,
      // 구글은 갱신 시 refresh token을 다시 주지 않는 경우가 많다
      refreshToken: data.refresh_token ?? tokens.refreshToken,
      expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
    }
  } catch {
    return { ...tokens, error: 'RefreshFailed' }
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
      authorization: {
        params: {
          scope: `openid email profile ${DRIVE_SCOPE}`,
          // 서버가 나중에 스스로 토큰을 갱신할 수 있도록 refresh token을 받는다
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    }),
  ],
  // 별도 DB 없이 쿠키에 담긴 JWT만으로 세션을 유지한다
  session: { strategy: 'jwt' },
  callbacks: {
    async jwt({ token, account, profile }) {
      if (profile?.email) token.email = profile.email

      // 최초 로그인 — 발급받은 토큰을 JWT에 담는다
      if (account) {
        token.google = {
          accessToken: account.access_token,
          refreshToken: account.refresh_token,
          expiresAt: account.expires_at ? account.expires_at * 1000 : undefined,
        } satisfies GoogleTokens
        return token
      }

      const google = token.google as GoogleTokens | undefined
      if (!google?.accessToken) return token
      if (google.expiresAt && Date.now() < google.expiresAt - REFRESH_MARGIN_MS) return token

      token.google = await refreshAccessToken(google)
      return token
    },
    async session({ session, token }) {
      if (session.user && typeof token.email === 'string') session.user.email = token.email
      // 드라이브 접근 권한이 끊겼으면 클라이언트가 다시 로그인하도록 알린다
      const google = token.google as GoogleTokens | undefined
      if (google?.error) session.error = google.error
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

/** 드라이브 접근에 다시 로그인이 필요할 때 던진다 */
export class DriveAuthError extends Error {}

/**
 * 사용자의 구글 드라이브 access token.
 * 세션 쿠키(JWT)에서만 읽으므로 브라우저로는 내려가지 않는다.
 */
export async function getDriveAccessToken(req: NextRequest): Promise<string> {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  const google = token?.google as GoogleTokens | undefined

  if (!google?.accessToken || google.error) {
    throw new DriveAuthError('구글 드라이브 권한이 만료되었습니다. 다시 로그인해 주세요.')
  }
  return google.accessToken
}
