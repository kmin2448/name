import {
  MAX_DESIGNS,
  applyDesign,
  buildDesignPayload,
  buildDesignTitle,
  canSaveDesign,
  collectUploadTargets,
  designFileIds,
  designRowToSummary,
  isApplyMode,
  isInlineBackground,
  parseDesignPayload,
  toDesignRow,
} from '@/lib/designs'
import { base64ByteLength, parseDataUrl } from '@/lib/googleDrive'
import {
  BASE_AUTH_PARAMS,
  BASE_SCOPE,
  DRIVE_SCOPE,
  DRIVE_UPGRADE_AUTH_PARAMS,
  DRIVE_UPGRADE_SCOPE,
  grantedDriveScope,
} from '@/lib/googleScopes'
import { DESIGN_COLUMN, designRange } from '@/constants/sheets'
import { initialState } from '@/hooks/useNameplateState'
import { NameplateState, OverlayImage, TextFieldConfig } from '@/types/nameplate'

function field(id: string, fontSize: number, color: string): TextFieldConfig {
  return {
    id,
    label: '이름',
    fontSize,
    fontWeight: 'bold',
    fontFamily: '맑은 고딕',
    textAlign: 'center',
    positionX: 10,
    positionY: 40,
    widthPct: 80,
    heightPct: 30,
    color,
  }
}

function overlay(id: string, src: string): OverlayImage {
  return {
    id,
    src,
    name: '로고',
    positionX: 5,
    positionY: 6,
    widthPct: 20,
    heightPct: 15,
    condition: { type: 'all' },
    cropX: 1,
    cropY: 2,
    cropW: 90,
    cropH: 95,
  }
}

const PHOTO = 'data:image/png;base64,iVBORw0KGgo='
const PRESET = 'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4='

const SAVED_STATE: NameplateState = {
  ...initialState,
  size: { label: '중 210×70mm', widthMm: 210, heightMm: 70 },
  backgroundImage: PHOTO,
  overlayImages: [overlay('img-1', PHOTO)],
  fields: [field('f-name', 30, '#ff0000')],
  layers: ['img-1', 'f-name'],
  showBorder: false,
  excelRows: [{ 이름: '홍길동' }],
}

describe('isInlineBackground', () => {
  it('앱 내장 프리셋(SVG)은 시트에 그대로 담는다', () => {
    expect(isInlineBackground(PRESET)).toBe(true)
  })

  it('업로드한 사진은 드라이브에 올려야 한다', () => {
    expect(isInlineBackground(PHOTO)).toBe(false)
    expect(isInlineBackground(null)).toBe(false)
  })
})

describe('collectUploadTargets', () => {
  it('업로드 사진과 오버레이만 업로드 대상으로 고른다', () => {
    const targets = collectUploadTargets(SAVED_STATE)
    expect(targets.background).toBe(PHOTO)
    expect(targets.overlays).toEqual([{ id: 'img-1', name: '로고', dataUrl: PHOTO }])
  })

  it('프리셋 배경은 업로드하지 않는다', () => {
    const targets = collectUploadTargets({ ...SAVED_STATE, backgroundImage: PRESET })
    expect(targets.background).toBeNull()
  })
})

describe('buildDesignPayload', () => {
  it('이미지 본문 대신 드라이브 파일 id와 배치값을 담는다', () => {
    const payload = buildDesignPayload(SAVED_STATE, 'bg-file', { 'img-1': 'ov-file' })

    expect(payload.backgroundFileId).toBe('bg-file')
    expect(payload.backgroundInline).toBeNull()
    expect(payload.overlays).toHaveLength(1)
    expect(payload.overlays[0]).toMatchObject({
      fileId: 'ov-file',
      positionX: 5,
      positionY: 6,
      widthPct: 20,
      heightPct: 15,
      cropX: 1,
      cropW: 90,
    })
    // 이미지 본문(base64)은 시트에 들어가지 않는다
    expect(JSON.stringify(payload)).not.toContain('iVBORw0KGgo')
  })

  it('프리셋 배경은 파일 id 없이 그대로 담는다', () => {
    const payload = buildDesignPayload({ ...SAVED_STATE, backgroundImage: PRESET }, null, {
      'img-1': 'ov-file',
    })
    expect(payload.backgroundInline).toBe(PRESET)
    expect(payload.backgroundFileId).toBeNull()
  })
})

describe('parseDesignPayload', () => {
  it('저장한 값을 그대로 읽는다', () => {
    const payload = buildDesignPayload(SAVED_STATE, 'bg-file', { 'img-1': 'ov-file' })
    expect(parseDesignPayload(JSON.stringify(payload))).toEqual(payload)
  })

  it('형식이 깨진 값은 null을 반환한다', () => {
    expect(parseDesignPayload('{oops')).toBeNull()
    expect(parseDesignPayload('null')).toBeNull()
    expect(parseDesignPayload(JSON.stringify({ size: {}, fields: [] }))).toBeNull()
  })

  it('파일 id가 없는 오버레이는 버린다', () => {
    const parsed = parseDesignPayload(
      JSON.stringify({
        size: { label: '중', widthMm: 210, heightMm: 70 },
        fields: [],
        overlays: [{ id: 'a' }, { id: 'b', fileId: 'ok' }],
      })
    )
    expect(parsed?.overlays.map((o) => o.id)).toEqual(['b'])
  })
})

describe('applyDesign', () => {
  const payload = buildDesignPayload(SAVED_STATE, 'bg-file', { 'img-1': 'ov-file' })
  const images = { background: PHOTO, overlays: { 'img-1': PHOTO } }

  // 지금 편집 중인 상태 — 서식과 명단이 저장 당시와 다르다
  const current: NameplateState = {
    ...initialState,
    fields: [field('f-name', 12, '#000000')],
    layers: ['f-name'],
    pageFieldOverrides: { 0: { 'f-name': field('f-name', 99, '#00ff00') } },
    excelRows: [{ 이름: '김철수' }, { 이름: '박영희' }],
    showBorder: true,
  }

  it('덮어쓰기: 폰트 크기·색상까지 저장 당시 값으로 바꾼다', () => {
    const next = applyDesign(current, payload, images, 'overwrite')

    expect(next.fields[0].fontSize).toBe(30)
    expect(next.fields[0].color).toBe('#ff0000')
    expect(next.showBorder).toBe(false)
    // 페이지별 개별 서식도 저장 당시 기준으로 초기화된다
    expect(next.pageFieldOverrides).toEqual({})
  })

  it('현재 서식 유지: 이미지만 바꾸고 서식은 그대로 둔다', () => {
    const next = applyDesign(current, payload, images, 'keep')

    expect(next.fields[0].fontSize).toBe(12)
    expect(next.fields[0].color).toBe('#000000')
    expect(next.showBorder).toBe(true)
    expect(next.pageFieldOverrides).toEqual(current.pageFieldOverrides)
    // 이미지와 규격은 두 방식 모두 바뀐다
    expect(next.backgroundImage).toBe(PHOTO)
    expect(next.size.widthMm).toBe(210)
    expect(next.overlayImages[0]).toMatchObject({ id: 'img-1', src: PHOTO, positionX: 5, cropW: 90 })
  })

  it('명단은 어느 방식에서도 유지된다', () => {
    for (const mode of ['overwrite', 'keep'] as const) {
      expect(applyDesign(current, payload, images, mode).excelRows).toEqual(current.excelRows)
    }
  })

  it('프리셋 배경은 드라이브 이미지 없이 복원된다', () => {
    const presetPayload = buildDesignPayload({ ...SAVED_STATE, backgroundImage: PRESET }, null, {
      'img-1': 'ov-file',
    })
    const next = applyDesign(current, presetPayload, { background: null, overlays: { 'img-1': PHOTO } }, 'keep')
    expect(next.backgroundImage).toBe(PRESET)
  })

  it('내려받지 못한 오버레이는 넣지 않는다', () => {
    const next = applyDesign(current, payload, { background: null, overlays: {} }, 'keep')
    expect(next.overlayImages).toEqual([])
  })

  it('레이어는 이미지가 아래, 텍스트가 위로 정리된다', () => {
    const next = applyDesign(current, payload, images, 'overwrite')
    expect(next.layers).toEqual(['img-1', 'f-name'])
  })
})

describe('canSaveDesign', () => {
  it(`${MAX_DESIGNS}건이 차면 새로 저장할 수 없다`, () => {
    expect(canSaveDesign(MAX_DESIGNS - 1, false)).toBe(true)
    expect(canSaveDesign(MAX_DESIGNS, false)).toBe(false)
  })

  it('덮어쓰기는 가득 차도 허용한다', () => {
    expect(canSaveDesign(MAX_DESIGNS, true)).toBe(true)
  })
})

describe('buildDesignTitle', () => {
  it('입력이 없으면 날짜로 만든다', () => {
    expect(buildDesignTitle('', new Date(2026, 7, 17))).toBe('명패 디자인 (2026-08-17)')
  })

  it('입력한 건명을 그대로 쓴다', () => {
    expect(buildDesignTitle(' 세미나 배경 ', new Date(2026, 7, 17))).toBe('세미나 배경')
  })
})

describe('designFileIds', () => {
  it('배경과 오버레이 파일 id를 모두 모은다 (삭제 시 정리용)', () => {
    const payload = buildDesignPayload(SAVED_STATE, 'bg-file', { 'img-1': 'ov-file' })
    expect(designFileIds(payload)).toEqual(['bg-file', 'ov-file'])
  })

  it('프리셋 배경만 있으면 오버레이 id만 남는다', () => {
    const payload = buildDesignPayload({ ...SAVED_STATE, backgroundImage: PRESET }, null, {
      'img-1': 'ov-file',
    })
    expect(designFileIds(payload)).toEqual(['ov-file'])
  })
})

describe('시트 행 변환', () => {
  it('저장 행과 요약이 왕복 변환된다', () => {
    const payload = buildDesignPayload(SAVED_STATE, 'bg-file', { 'img-1': 'ov-file' })
    const summary = { title: '세미나 배경', savedAt: '2026-08-17T01:00:00.000Z' }
    const row = toDesignRow('d-1', 'user@example.com', summary, payload)

    expect(row[DESIGN_COLUMN.userEmail]).toBe('user@example.com')
    expect(designRowToSummary(row)).toEqual({ id: 'd-1', ...summary })
    expect(parseDesignPayload(row[DESIGN_COLUMN.payload])).toEqual(payload)
  })

  it('id 없는 행은 건너뛴다', () => {
    expect(designRowToSummary([])).toBeNull()
  })

  it('디자인 시트 범위는 A:E', () => {
    expect(designRange('시트1')).toBe("'시트1'!A:E")
  })
})

describe('isApplyMode', () => {
  it('허용된 값만 통과시킨다', () => {
    expect(isApplyMode('overwrite')).toBe(true)
    expect(isApplyMode('keep')).toBe(true)
    expect(isApplyMode('other')).toBe(false)
  })
})

describe('drive 업로드 보조 함수', () => {
  it('허용된 이미지 data URL만 파싱한다', () => {
    expect(parseDataUrl(PHOTO)).toEqual({ mimeType: 'image/png', base64: 'iVBORw0KGgo=' })
    expect(parseDataUrl('data:text/html;base64,PHNjcmlwdD4=')).toBeNull()
    expect(parseDataUrl('https://example.com/a.png')).toBeNull()
  })

  it('base64 길이에서 실제 바이트 수를 구한다', () => {
    // 'AAAA' → 3바이트, 패딩이 있으면 그만큼 줄어든다
    expect(base64ByteLength('AAAA')).toBe(3)
    expect(base64ByteLength('AAA=')).toBe(2)
    expect(base64ByteLength('AA==')).toBe(1)
  })
})

describe('grantedDriveScope', () => {
  it('드라이브 범위를 승인했으면 true', () => {
    expect(
      grantedDriveScope('openid email profile https://www.googleapis.com/auth/drive.file')
    ).toBe(true)
  })

  it('기본 로그인 범위만 받은 상태는 false (로그인 자체는 성공)', () => {
    expect(grantedDriveScope(BASE_SCOPE)).toBe(false)
    expect(grantedDriveScope(undefined)).toBe(false)
  })

  it('비슷한 이름의 다른 범위는 인정하지 않는다', () => {
    expect(grantedDriveScope('https://www.googleapis.com/auth/drive.file.readonly')).toBe(false)
  })
})

describe('증분 인증 범위', () => {
  it('기본 로그인 범위에는 드라이브 권한이 들어 있지 않다', () => {
    expect(BASE_SCOPE).toBe('openid email profile')
    expect(grantedDriveScope(BASE_SCOPE)).toBe(false)
  })

  it('권한 추가 요청 범위는 기본 범위에 드라이브만 더한 값이다', () => {
    expect(DRIVE_UPGRADE_SCOPE).toBe(`${BASE_SCOPE} ${DRIVE_SCOPE}`)
    expect(grantedDriveScope(DRIVE_UPGRADE_SCOPE)).toBe(true)
  })

  it('권한 추가 요청은 기존 승인 범위를 유지하고 refresh token을 다시 받는다', () => {
    expect(DRIVE_UPGRADE_AUTH_PARAMS).toEqual({
      scope: DRIVE_UPGRADE_SCOPE,
      include_granted_scopes: 'true',
      access_type: 'offline',
      prompt: 'consent',
    })
  })

  it('로그인은 기본 범위만 요청하고 드라이브 권한을 끼워 넣지 않는다', () => {
    expect(BASE_AUTH_PARAMS.scope).toBe(BASE_SCOPE)
    expect(BASE_AUTH_PARAMS.scope).not.toContain(DRIVE_SCOPE)
  })

  it('로그인에는 prompt=consent를 쓰지 않는다 (매번 동의 화면이 다시 뜨는 것을 막는다)', () => {
    expect(BASE_AUTH_PARAMS).not.toHaveProperty('prompt')
  })
})
