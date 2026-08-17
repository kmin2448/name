// 구글 드라이브 접근 계층 — 서버(Route Handler)에서만 사용한다.
// 로그인한 사용자 본인의 access token으로 동작하므로, 이미지는 각 사용자의 드라이브에 저장된다.
// drive.file 범위라 이 앱이 만든 파일 외에는 접근할 수 없다.

const DRIVE_API = 'https://www.googleapis.com/drive/v3'
const DRIVE_UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3'

/** 사용자 드라이브에 만들어지는 앱 전용 폴더 이름 */
export const APP_FOLDER_NAME = '명패 제작기'
const FOLDER_MIME = 'application/vnd.google-apps.folder'

/** 저장 가능한 이미지 형식 */
const ALLOWED_MIME = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml']

/** 드라이브에 올릴 수 있는 파일 하나의 최대 크기 (업로더 제한과 동일) */
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024

async function driveFetch(
  accessToken: string,
  url: string,
  init: RequestInit = {}
): Promise<Response> {
  const res = await fetch(url, {
    ...init,
    headers: { ...init.headers, Authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`구글 드라이브 요청 실패 (${res.status}): ${body.slice(0, 300)}`)
  }
  return res
}

/**
 * 앱 전용 폴더를 찾고, 없으면 만든다.
 * drive.file 범위에서는 이 앱이 만든 폴더만 검색되므로 다른 폴더와 섞이지 않는다.
 */
export async function ensureAppFolder(accessToken: string): Promise<string> {
  const query = encodeURIComponent(
    `mimeType='${FOLDER_MIME}' and name='${APP_FOLDER_NAME}' and trashed=false`
  )
  const res = await driveFetch(
    accessToken,
    `${DRIVE_API}/files?q=${query}&fields=files(id)&pageSize=1`
  )
  const found = (await res.json()) as { files?: { id: string }[] }
  if (found.files?.[0]?.id) return found.files[0].id

  const created = await driveFetch(accessToken, `${DRIVE_API}/files?fields=id`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: APP_FOLDER_NAME, mimeType: FOLDER_MIME }),
  })
  const folder = (await created.json()) as { id: string }
  return folder.id
}

export type DataUrlParts = { mimeType: string; base64: string }

/** data URL을 MIME 타입과 base64 본문으로 나눈다 */
export function parseDataUrl(dataUrl: string): DataUrlParts | null {
  const match = /^data:([^;,]+);base64,(.+)$/s.exec(dataUrl)
  if (!match) return null
  const [, mimeType, base64] = match
  if (!ALLOWED_MIME.includes(mimeType)) return null
  return { mimeType, base64 }
}

/** base64 문자열이 나타내는 실제 바이트 수 */
export function base64ByteLength(base64: string): number {
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0
  return Math.floor((base64.length * 3) / 4) - padding
}

/**
 * data URL 이미지를 사용자의 드라이브 앱 폴더에 올리고 파일 id를 돌려준다.
 * multipart 업로드라 메타데이터와 본문을 한 번에 보낸다.
 */
export async function uploadImage(
  accessToken: string,
  folderId: string,
  name: string,
  dataUrl: string
): Promise<string> {
  const parsed = parseDataUrl(dataUrl)
  if (!parsed) throw new Error('지원하지 않는 이미지 형식입니다.')
  if (base64ByteLength(parsed.base64) > MAX_IMAGE_BYTES) {
    throw new Error('이미지가 너무 큽니다. 10MB 이하로 올려 주세요.')
  }

  const boundary = `nameplate-${Math.random().toString(36).slice(2)}`
  const metadata = JSON.stringify({ name, parents: [folderId] })
  const body =
    `--${boundary}\r\n` +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    `${metadata}\r\n` +
    `--${boundary}\r\n` +
    `Content-Type: ${parsed.mimeType}\r\n` +
    'Content-Transfer-Encoding: base64\r\n\r\n' +
    `${parsed.base64}\r\n` +
    `--${boundary}--`

  const res = await driveFetch(
    accessToken,
    `${DRIVE_UPLOAD_API}/files?uploadType=multipart&fields=id`,
    {
      method: 'POST',
      headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
      body,
    }
  )
  const file = (await res.json()) as { id: string }
  return file.id
}

/** 드라이브 파일을 다시 data URL로 읽어 온다 (캔버스가 data URL을 그대로 쓰기 때문) */
export async function downloadImageAsDataUrl(
  accessToken: string,
  fileId: string
): Promise<string> {
  const res = await driveFetch(
    accessToken,
    `${DRIVE_API}/files/${encodeURIComponent(fileId)}?alt=media`
  )
  const mimeType = res.headers.get('content-type') ?? 'image/png'
  const buffer = Buffer.from(await res.arrayBuffer())
  return `data:${mimeType};base64,${buffer.toString('base64')}`
}

/** 저장 건을 지울 때 함께 정리한다. 이미 지워진 파일은 조용히 넘어간다 */
export async function deleteFile(accessToken: string, fileId: string): Promise<void> {
  try {
    await driveFetch(accessToken, `${DRIVE_API}/files/${encodeURIComponent(fileId)}`, {
      method: 'DELETE',
    })
  } catch {
    // 사용자가 드라이브에서 직접 지웠을 수 있으므로 실패해도 저장 건 삭제는 계속한다
  }
}
