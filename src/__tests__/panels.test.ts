import { nextOpenPanel } from '@/lib/panels'

describe('nextOpenPanel', () => {
  it('아무것도 열려 있지 않으면 요청한 패널이 열린다', () => {
    expect(nextOpenPanel(null, 'thumbnail', true)).toBe('thumbnail')
  })

  it('다른 패널이 열려 있으면 그 패널을 닫고 새 패널로 바꾼다', () => {
    expect(nextOpenPanel('thumbnail', 'library', true)).toBe('library')
    expect(nextOpenPanel('library', 'help', true)).toBe('help')
    expect(nextOpenPanel('help', 'thumbnail', true)).toBe('thumbnail')
  })

  it('열려 있는 패널을 닫으면 아무것도 열리지 않은 상태가 된다', () => {
    expect(nextOpenPanel('library', 'library', false)).toBeNull()
  })

  it('이미 다른 패널로 바뀐 뒤 도착한 닫기 요청은 무시한다', () => {
    // 썸네일을 열어 내 자료가 닫히는 순간, 내 자료 쪽 닫기 요청이 뒤늦게 오더라도
    // 방금 연 썸네일까지 닫아 버리면 안 된다
    expect(nextOpenPanel('thumbnail', 'library', false)).toBe('thumbnail')
  })

  it('닫혀 있는 패널을 다시 닫아도 상태가 바뀌지 않는다', () => {
    expect(nextOpenPanel(null, 'help', false)).toBeNull()
  })
})
