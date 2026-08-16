// pre-commit 훅이 사용하는 버전 계산 로직 검증
const { nextVersion, VERSION_RE } = require('../../scripts/bump-version.js') as {
  nextVersion: (current: string | null, today: string) => string
  VERSION_RE: RegExp
}

describe('nextVersion', () => {
  it('같은 날 재커밋이면 번호가 올라간다 (2자리 패딩)', () => {
    expect(nextVersion('2026-08-16-v.01', '2026-08-16')).toBe('2026-08-16-v.02')
    expect(nextVersion('2026-08-16-v.09', '2026-08-16')).toBe('2026-08-16-v.10')
  })

  it('날짜가 바뀌면 v.01로 리셋된다', () => {
    expect(nextVersion('2026-08-16-v.07', '2026-08-17')).toBe('2026-08-17-v.01')
  })

  it('구버전 형식(v9, 점 없음)도 인식해 새 형식으로 이어간다', () => {
    expect(nextVersion('2026-05-21-v9', '2026-05-21')).toBe('2026-05-21-v.10')
    expect(nextVersion('2026-05-21-v9', '2026-08-16')).toBe('2026-08-16-v.01')
  })

  it('버전이 없거나 형식이 깨져 있으면 오늘 v.01부터 시작한다', () => {
    expect(nextVersion(null, '2026-08-16')).toBe('2026-08-16-v.01')
    expect(nextVersion('unknown', '2026-08-16')).toBe('2026-08-16-v.01')
  })

  it('99를 넘으면 자릿수가 늘어나되 증가는 계속된다', () => {
    expect(nextVersion('2026-08-16-v.99', '2026-08-16')).toBe('2026-08-16-v.100')
  })

  it('생성된 버전 문자열은 항상 VERSION_RE와 다시 매칭된다', () => {
    const v = nextVersion('2026-08-16-v.03', '2026-08-16')
    expect(v).toMatch(VERSION_RE)
  })
})
