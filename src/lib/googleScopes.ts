// 구글 OAuth 범위 관련 순수 로직.
// next-auth 서버 코드를 끌어오지 않도록 별도 모듈로 둔다.

/** 앱이 직접 만든 파일만 접근하는 좁은 범위 — 사용자의 기존 드라이브 파일은 볼 수 없다 */
export const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file'

/**
 * 로그인에만 쓰는 기본 범위.
 * 명단·디자인 목록은 서버의 서비스 계정으로 시트에 저장하므로,
 * 로그인 자체에는 사용자의 구글 API 접근 권한이 전혀 필요하지 않다.
 */
export const BASE_SCOPE = 'openid email profile'

/** 드라이브 권한을 추가로 요청할 때 함께 보내는 범위 */
export const DRIVE_UPGRADE_SCOPE = `${BASE_SCOPE} ${DRIVE_SCOPE}`

/**
 * 승인된 범위 문자열에 드라이브 권한이 들어 있는지.
 * 로그인 시점에는 이 값이 false인 게 정상이며,
 * 디자인 저장을 처음 쓸 때 따로 권한을 요청해 true가 된다.
 */
export function grantedDriveScope(scope: string | undefined | null): boolean {
  return (scope ?? '').split(' ').includes(DRIVE_SCOPE)
}

/**
 * 로그인할 때 구글에 보내는 인증 파라미터.
 *
 * prompt를 일부러 넣지 않는다. 'consent'를 주면 새로 승인할 범위가 없어도
 * 로그인할 때마다 동의 화면이 다시 떠서, 권한을 요청하지 않는다는 안내와 어긋난다.
 * 비워두면 구글이 알아서 판단해 이미 승인한 사용자는 화면 없이 바로 로그인된다.
 */
export const BASE_AUTH_PARAMS = {
  scope: BASE_SCOPE,
  include_granted_scopes: 'true',
  access_type: 'offline',
} as const

/**
 * 디자인 저장을 쓰려 할 때 signIn()에 넘기는 인증 파라미터 (증분 인증).
 * - include_granted_scopes: 이미 승인해 둔 범위를 새 토큰에도 그대로 담는다
 * - access_type=offline + prompt=consent: 서버가 스스로 갱신할 refresh token을 받는다
 *   (여기서는 사용자가 권한 버튼을 직접 누른 흐름이라 동의 화면이 뜨는 게 자연스럽다)
 */
export const DRIVE_UPGRADE_AUTH_PARAMS = {
  scope: DRIVE_UPGRADE_SCOPE,
  include_granted_scopes: 'true',
  access_type: 'offline',
  prompt: 'consent',
} as const
