import { composeBandedBackground, BAND_PCT } from '@/lib/backgroundCompose'
import { getBackgroundSize } from '@/lib/backgroundPresets'
import { isAllowedPixabayImageUrl } from '@/lib/pixabay'

const PHOTO = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ=='

function decode(src: string): string {
  return decodeURIComponent(src.replace(/^data:image\/svg\+xml,/, ''))
}

describe('composeBandedBackground', () => {
  const banded = composeBandedBackground(PHOTO)
  const svg = decode(banded)

  it('SVG data URI를 만들고 명패 비율에 맞춰 늘어난다', () => {
    expect(banded.startsWith('data:image/svg+xml,')).toBe(true)
    expect(svg).toContain('viewBox="0 0 1000 400"')
    expect(svg).toContain('preserveAspectRatio="none"')
  })

  it('사진이 상단·하단 띠 두 곳에만 가로 전체로 배치된다', () => {
    const images = svg.match(/<image[^>]*\/>/g) ?? []
    expect(images).toHaveLength(2)

    const bandH = (400 * BAND_PCT) / 100
    const ys = images.map((tag) => Number(tag.match(/\sy="([\d.]+)"/)?.[1]))
    expect(ys).toContain(0)              // 상단 띠
    expect(ys).toContain(400 - bandH)    // 하단 띠

    for (const tag of images) {
      expect(tag).toContain(`width="1000"`)
      expect(tag).toContain(`height="${bandH}"`)
      // 띠 내부는 cover(slice) 방식으로 잘려 채워진다
      expect(tag).toContain('preserveAspectRatio="xMidYMid slice"')
      expect(tag).toContain(PHOTO.replace(/\+/g, '+')) // 원본 사진이 포함됨
    }
  })

  it('중앙(텍스트 영역)은 흰색 바탕으로 남는다', () => {
    expect(svg).toContain('<rect width="1000" height="400" fill="#ffffff"/>')
  })

  it('띠 높이는 상·하단 각 10%로 텍스트 안전 영역을 지킨다', () => {
    expect(BAND_PCT).toBeLessThanOrEqual(10)
  })

  it('합성 배경은 100% 100%로, 원본 사진은 cover로 배치된다', () => {
    expect(getBackgroundSize(banded)).toBe('100% 100%')
    expect(getBackgroundSize(PHOTO)).toBe('cover')
  })
})

describe('isAllowedPixabayImageUrl', () => {
  it('픽사베이 CDN 주소만 허용한다', () => {
    expect(isAllowedPixabayImageUrl('https://cdn.pixabay.com/photo/2024/01/01/abc_640.jpg')).toBe(true)
    expect(isAllowedPixabayImageUrl('https://pixabay.com/get/abc.jpg')).toBe(true)
  })

  it('다른 호스트·프로토콜·비정상 문자열은 거부한다 (SSRF 방지)', () => {
    expect(isAllowedPixabayImageUrl('https://evil.com/photo.jpg')).toBe(false)
    expect(isAllowedPixabayImageUrl('https://fakepixabay.com/photo.jpg')).toBe(false)
    expect(isAllowedPixabayImageUrl('https://pixabay.com.evil.com/photo.jpg')).toBe(false)
    expect(isAllowedPixabayImageUrl('http://cdn.pixabay.com/photo.jpg')).toBe(false)
    expect(isAllowedPixabayImageUrl('file:///etc/passwd')).toBe(false)
    expect(isAllowedPixabayImageUrl('not-a-url')).toBe(false)
    expect(isAllowedPixabayImageUrl('')).toBe(false)
  })
})
