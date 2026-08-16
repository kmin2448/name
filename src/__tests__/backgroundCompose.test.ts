import { composeBandedBackground, BAND_PCT, BAND_GAP_PX } from '@/lib/backgroundCompose'
import { getBackgroundSize } from '@/lib/backgroundPresets'
import { isAllowedPixabayImageUrl } from '@/lib/pixabay'
import { MM_TO_PX } from '@/lib/sizeConstants'

const PHOTO = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ=='
const HEIGHT_MM = 82 // 기본 규격 '기타 200×82mm'의 높이

function decode(src: string): string {
  return decodeURIComponent(src.replace(/^data:image\/svg\+xml,/, ''))
}

type BandRect = { y: number; height: number }

function parseBands(svg: string): BandRect[] {
  const images = svg.match(/<image[^>]*\/>/g) ?? []
  return images.map((tag) => ({
    y: Number(tag.match(/\sy="([\d.]+)"/)?.[1]),
    height: Number(tag.match(/\sheight="([\d.]+)"/)?.[1]),
  }))
}

describe('composeBandedBackground', () => {
  const banded = composeBandedBackground(PHOTO, HEIGHT_MM)
  const svg = decode(banded)

  it('SVG data URI를 만들고 명패 비율에 맞춰 늘어난다', () => {
    expect(banded.startsWith('data:image/svg+xml,')).toBe(true)
    expect(svg).toContain('viewBox="0 0 1000 400"')
    expect(svg).toContain('preserveAspectRatio="none"')
  })

  it('사진이 상단·하단 띠 두 곳에만 가로 전체로 배치된다', () => {
    const images = svg.match(/<image[^>]*\/>/g) ?? []
    expect(images).toHaveLength(2)
    const bands = parseBands(svg)
    expect(bands.some((b) => b.y === 0)).toBe(true)                    // 상단 띠
    expect(bands.some((b) => b.y + b.height === 400)).toBe(true)       // 하단 띠

    for (const tag of images) {
      expect(tag).toContain(`width="1000"`)
      // 띠 내부는 cover(slice) 방식으로 잘려 채워진다
      expect(tag).toContain('preserveAspectRatio="xMidYMid slice"')
      expect(tag).toContain(PHOTO) // 원본 사진이 포함됨
    }
  })

  it('띠 안쪽에 화면 기준 약 5px의 여백을 둔다 (텍스트에 붙지 않음)', () => {
    const maxBandH = (400 * BAND_PCT) / 100
    const expectedGap = (BAND_GAP_PX / (HEIGHT_MM * MM_TO_PX)) * 400
    const bands = parseBands(svg)

    for (const band of bands) {
      // 띠 높이가 최대 높이보다 여백만큼 줄어들어 있어야 한다
      expect(band.height).toBeCloseTo(maxBandH - expectedGap, 5)
    }
    // 상단 띠 안쪽 경계는 10% 지점보다 여백만큼 위에 있어야 한다
    const top = bands.find((b) => b.y === 0)
    expect(top!.height).toBeLessThan(maxBandH)
  })

  it('명패가 작을수록(=배율이 클수록) 같은 5px에 해당하는 여백이 더 커진다', () => {
    const smallPlate = parseBands(decode(composeBandedBackground(PHOTO, 60)))
    const bigPlate = parseBands(decode(composeBandedBackground(PHOTO, 90)))
    // 높이 60mm 명패에서 5px은 90mm 명패보다 더 큰 비율이므로 띠가 더 얇아진다
    expect(smallPlate[0].height).toBeLessThan(bigPlate[0].height)
  })

  it('여백이 커도 최소 띠 높이는 유지된다', () => {
    const bands = parseBands(decode(composeBandedBackground(PHOTO, 1)))
    for (const band of bands) {
      expect(band.height).toBeGreaterThanOrEqual(4)
    }
  })

  it('중앙(텍스트 영역)은 흰색 바탕으로 남는다', () => {
    expect(svg).toContain('<rect width="1000" height="400" fill="#ffffff"/>')
  })

  it('띠는 상·하단 각 10% 텍스트 안전 영역을 넘지 않는다', () => {
    expect(BAND_PCT).toBeLessThanOrEqual(10)
    const bands = parseBands(svg)
    const safeTop = 400 * (BAND_PCT / 100)
    const top = bands.find((b) => b.y === 0)
    const bottom = bands.find((b) => b.y > 0)
    expect(top!.y + top!.height).toBeLessThanOrEqual(safeTop)
    expect(bottom!.y).toBeGreaterThanOrEqual(400 - safeTop)
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
