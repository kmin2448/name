import 'next-auth'

declare module 'next-auth' {
  interface Session {
    /** 드라이브 토큰 갱신에 실패했을 때 클라이언트에 알리는 값 */
    error?: string
  }
}
