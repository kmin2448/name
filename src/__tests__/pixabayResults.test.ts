import {
  mergeSearchResults,
  hasMoreResults,
  PIXABAY_MAX_RESULTS,
  PixabayImage,
} from '@/lib/pixabay'

function img(id: number): PixabayImage {
  return {
    id,
    previewURL: `https://cdn.pixabay.com/p${id}.jpg`,
    webformatURL: `https://cdn.pixabay.com/w${id}.jpg`,
    tags: 'test',
    user: 'tester',
  }
}

describe('mergeSearchResults', () => {
  it('1페이지는 새 검색이므로 기존 결과를 교체한다', () => {
    const prev = [img(1), img(2)]
    const hits = [img(10), img(11)]
    expect(mergeSearchResults(prev, hits, 1)).toEqual(hits)
  })

  it('2페이지 이상은 기존 결과 뒤에 이어 붙인다', () => {
    const prev = [img(1), img(2)]
    const hits = [img(3), img(4)]
    expect(mergeSearchResults(prev, hits, 2).map((h) => h.id)).toEqual([1, 2, 3, 4])
  })

  it('페이지 간 중복 이미지는 id 기준으로 제거된다', () => {
    const prev = [img(1), img(2), img(3)]
    const hits = [img(3), img(4), img(2)]
    expect(mergeSearchResults(prev, hits, 2).map((h) => h.id)).toEqual([1, 2, 3, 4])
  })

  it('전부 중복인 페이지를 받아도 목록이 늘어나지 않는다', () => {
    const prev = [img(1), img(2)]
    const hits = [img(1), img(2)]
    expect(mergeSearchResults(prev, hits, 2)).toHaveLength(2)
  })
})

describe('hasMoreResults', () => {
  it('남은 결과가 있으면 true', () => {
    expect(hasMoreResults(12, 100, 12)).toBe(true)
  })

  it('전체를 다 불러왔으면 false', () => {
    expect(hasMoreResults(100, 100, 12)).toBe(false)
  })

  it('마지막 페이지가 비어 있으면 false (중복만 반환된 경우 포함)', () => {
    expect(hasMoreResults(24, 100, 0)).toBe(false)
  })

  it('API 접근 한도(500개)에 도달하면 총 결과가 더 많아도 false', () => {
    expect(hasMoreResults(PIXABAY_MAX_RESULTS, 10000, 12)).toBe(false)
    expect(hasMoreResults(499, 10000, 12)).toBe(true)
  })
})
