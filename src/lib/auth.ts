import { NextAuthOptions, getServerSession } from 'next-auth'
import { getToken } from 'next-auth/jwt'
import GoogleProvider from 'next-auth/providers/google'
import type { NextRequest } from 'next/server'

import { BASE_SCOPE, grantedDriveScope } from '@/lib/googleScopes'

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'

/** 만료 직전에 미리 갱신하기 위한 여유 시간 */
const REFRESH_MARGIN_MS = 60 * 1000

type GoogleTokens = {
  accessToken?: string
  refreshToken?: string
  /** access token 만료 시각 (epoch ms) */
  expiresAt?: number
  /**
   * 드라이브 권한을 실제로 승인받았는지.
   * 구글 동의 화면에서 드라이브 항목만 체크 해제해도 로그인 자체는 성공하므로,
   * 승인된 범위를 따로 확인해 둔다.
   */
  hasDriveScope?: boolean
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
      scope?: string
    }
    if (!res.ok || !data.access_token) return { ...tokens, error: 'RefreshFailed' }

    return {
      accessToken: data.access_token,
      // 구글은 갱신 시 refresh token을 다시 주지 않는 경우가 많다
      refreshToken: data.refresh_token ?? tokens.refreshToken,
      expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
      // 갱신 응답에 scope가 없으면 최초 승인 결과를 그대로 유지한다
      hasDriveScope: data.scope ? grantedDriveScope(data.scope) : tokens.hasDriveScope,
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
          // 로그인 단계에서는 드라이브 권한을 요구하지 않는다 (증분 인증).
          // 디자인 저장을 쓰려 할 때 DRIVE_UPGRADE_AUTH_PARAMS로 따로 요청한다.
          scope: BASE_SCOPE,
          // 지난번에 승인해 둔 드라이브 권한이 있으면 새 토큰에도 그대로 이어받는다
          include_granted_scopes: 'true',
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
          hasDriveScope: grantedDriveScope(account.scope),
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
      // 디자인 저장 기능을 쓸 수 있는지 화면에서 판단하기 위한 값 (토큰 자체는 내려보내지 않는다)
      session.hasDriveScope = !!google?.hasDriveScope && !google?.error
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
  if (!google.hasDriveScope) {
    throw new DriveAuthError(
      '구글 드라이브 접근 권한이 없습니다. 디자인 탭의 "드라이브 권한 허용하기"를 눌러 승인해 주세요.'
    )
  }
  return google.accessToken
}
