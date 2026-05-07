import { NameplateSize, TextFieldConfig } from '@/types/nameplate'

export const MM_TO_PX = 96 / 25.4

export const NAMEPLATE_SIZES: NameplateSize[] = [
  { label: 'A형 (대) 250×90mm', widthMm: 250, heightMm: 90 },
  { label: 'B형 (중) 210×70mm', widthMm: 210, heightMm: 70 },
  { label: 'C형 (소) 150×60mm', widthMm: 150, heightMm: 60 },
  { label: '사용자 지정', widthMm: 210, heightMm: 70, isCustom: true },
]

export const DEFAULT_SIZE: NameplateSize = NAMEPLATE_SIZES[1]

export const DEFAULT_FIELDS: TextFieldConfig[] = [
  { id: 'program', label: '프로그램명', fontSize: 13, fontWeight: 'normal', textAlign: 'center', positionX: 50, positionY: 20, color: '#000000' },
  { id: 'affiliation', label: '소속', fontSize: 12, fontWeight: 'normal', textAlign: 'center', positionX: 50, positionY: 40, color: '#000000' },
  { id: 'name', label: '이름', fontSize: 22, fontWeight: 'bold', textAlign: 'center', positionX: 50, positionY: 62, color: '#000000' },
  { id: 'title', label: '직책', fontSize: 12, fontWeight: 'normal', textAlign: 'center', positionX: 50, positionY: 82, color: '#333333' },
]

export const SAMPLE_PREVIEW_DATA: Record<string, string> = {
  '프로그램명': '2026 봄 세미나',
  '소속': '한국개발자협회',
  '이름': '홍길동',
  '직책': '팀장',
}
