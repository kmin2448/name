// 구글 OAuth 범위 관련 순수 로직.
// next-auth 서버 코드를 끌어오지 않도록 별도 모듈로 둔다.

/** 앱이 직접 만든 파일만 접근하는 좁은 범위 — 사용자의 기존 드라이브 파일은 볼 수 없다 */
export const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file'

/**
 * 승인된 범위 문자열에 드라이브 권한이 들어 있는지.
 * 구글 동의 화면에서 드라이브 항목만 체크 해제해도 로그인 자체는 성공하므로,
 * 로그인 여부와 별개로 이 값을 확인해야 한다.
 */
export function grantedDriveScope(scope: string | undefined | null): boolean {
  return (scope ?? '').split(' ').includes(DRIVE_SCOPE)
}
