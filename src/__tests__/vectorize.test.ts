import {
  MAX_COLOR_PRECISION,
  MAX_FILE_BYTES,
  TRACE_LEVELS,
  formatBytes,
  isSupportedImageType,
  maxDimension,
  scaledSize,
  svgFileName,
  validateFile,
  vtracerConfig,
} from '@/lib/vectorize'

describe('isSupportedImageType', () => {
  it('JPG와 PNG만 받는다', () => {
    expect(isSupportedImageType('image/jpeg')).toBe(true)
    expect(isSupportedImageType('image/png')).toBe(true)
  })

  it('그 외 형식은 거른다', () => {
    expect(isSupportedImageType('image/gif')).toBe(false)
    expect(isSupportedImageType('application/pdf')).toBe(false)
    expect(isSupportedImageType('image/svg+xml')).toBe(false)
    expect(isSupportedImageType('')).toBe(false)
  })
})

describe('scaledSize', () => {
  it('한도보다 작으면 원본 크기를 그대로 쓴다', () => {
    expect(scaledSize(600, 400, 1200)).toEqual({ width: 600, height: 400, scaled: false })
  })

  it('한도와 같으면 줄이지 않는다', () => {
    expect(scaledSize(1200, 300, 1200)).toEqual({ width: 1200, height: 300, scaled: false })
  })

  it('긴 변을 한도에 맞추고 비율을 유지한다', () => {
    expect(scaledSize(2400, 1200, 1200)).toEqual({ width: 1200, height: 600, scaled: true })
  })

  it('세로가 더 길어도 긴 변을 기준으로 줄인다', () => {
    expect(scaledSize(1000, 4000, 800)).toEqual({ width: 200, height: 800, scaled: true })
  })

  it('극단적으로 납작한 이미지도 짧은 변이 0이 되지 않는다', () => {
    const result = scaledSize(10000, 3, 800)
    expect(result.width).toBe(800)
    expect(result.height).toBe(1)
  })
})

describe('maxDimension', () => {
  it('정밀할수록 더 큰 해상도로 트레이싱한다', () => {
    expect(maxDimension('low')).toBeLessThan(maxDimension('medium'))
    expect(maxDimension('medium')).toBeLessThan(maxDimension('high'))
  })
})

describe('vtracerConfig', () => {
  it('세 단계 모두 곡선(spline)으로 그린다 — 다각형이면 확대할 때 각져 보인다', () => {
    for (const { value } of TRACE_LEVELS) {
      expect(vtracerConfig(value).mode).toBe('spline')
    }
  })

  it('정밀할수록 잔 얼룩을 덜 버린다', () => {
    expect(vtracerConfig('low').filterSpeckle).toBeGreaterThan(
      vtracerConfig('medium').filterSpeckle
    )
    expect(vtracerConfig('medium').filterSpeckle).toBeGreaterThan(
      vtracerConfig('high').filterSpeckle
    )
  })

  it('정밀할수록 모서리를 민감하게 잡는다', () => {
    expect(vtracerConfig('low').cornerThreshold).toBeGreaterThan(
      vtracerConfig('medium').cornerThreshold
    )
    expect(vtracerConfig('medium').cornerThreshold).toBeGreaterThan(
      vtracerConfig('high').cornerThreshold
    )
  })

  it('정밀할수록 좌표를 더 촘촘히 남기고 그라데이션 층을 잘게 나눈다', () => {
    expect(vtracerConfig('low').pathPrecision).toBeLessThan(vtracerConfig('high').pathPrecision)
    expect(vtracerConfig('high').layerDifference).toBeLessThan(
      vtracerConfig('low').layerDifference
    )
  })

  it('colorPrecision은 상한을 넘지 않는다 — 7은 영역이 뭉개지고 8은 wasm이 죽는다', () => {
    for (const { value } of TRACE_LEVELS) {
      expect(vtracerConfig(value).colorPrecision).toBeLessThanOrEqual(MAX_COLOR_PRECISION)
      expect(MAX_COLOR_PRECISION).toBeLessThan(7)
    }
  })

  it('설정 항목이 하나도 빠지지 않는다 — 빠지면 wasm이 패닉한다', () => {
    const required = [
      'binary',
      'mode',
      'hierarchical',
      'filterSpeckle',
      'colorPrecision',
      'layerDifference',
      'cornerThreshold',
      'lengthThreshold',
      'maxIterations',
      'spliceThreshold',
      'pathPrecision',
    ]
    for (const { value } of TRACE_LEVELS) {
      const config = vtracerConfig(value)
      for (const key of required) {
        expect(config).toHaveProperty(key)
        expect(config[key as keyof typeof config]).not.toBeUndefined()
      }
    }
  })
})

describe('svgFileName', () => {
  it('확장자를 .svg로 바꾼다', () => {
    expect(svgFileName('logo.png')).toBe('logo.svg')
    expect(svgFileName('사진.JPEG')).toBe('사진.svg')
  })

  it('점이 여러 개면 마지막 확장자만 바꾼다', () => {
    expect(svgFileName('my.logo.v2.png')).toBe('my.logo.v2.svg')
  })

  it('확장자가 없으면 그대로 붙인다', () => {
    expect(svgFileName('logo')).toBe('logo.svg')
  })

  it('이름이 확장자뿐이면 기본 이름을 쓴다', () => {
    expect(svgFileName('.png')).toBe('image.svg')
  })
})

describe('formatBytes', () => {
  it('단위를 크기에 맞춰 고른다', () => {
    expect(formatBytes(512)).toBe('512 B')
    expect(formatBytes(2048)).toBe('2.0 KB')
    expect(formatBytes(5 * 1024 * 1024)).toBe('5.0 MB')
  })
})

describe('validateFile', () => {
  it('알맞은 파일은 통과시킨다', () => {
    expect(validateFile({ name: 'logo.png', type: 'image/png', size: 1024 })).toBeNull()
  })

  it('지원하지 않는 형식은 이유를 알려준다', () => {
    const message = validateFile({ name: 'doc.pdf', type: 'application/pdf', size: 1024 })
    expect(message).toContain('doc.pdf')
    expect(message).toContain('JPG·PNG')
  })

  it('용량을 넘기면 이유를 알려준다', () => {
    const message = validateFile({
      name: 'big.jpg',
      type: 'image/jpeg',
      size: MAX_FILE_BYTES + 1,
    })
    expect(message).toContain('big.jpg')
    expect(message).toContain('너무 큽니다')
  })

  it('한도와 같은 크기는 통과시킨다', () => {
    expect(
      validateFile({ name: 'edge.jpg', type: 'image/jpeg', size: MAX_FILE_BYTES })
    ).toBeNull()
  })
})
