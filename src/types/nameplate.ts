export type NameplateSize = {
  label: string
  widthMm: number
  heightMm: number
  isCustom?: boolean
}

export type TextFieldConfig = {
  id: string
  label: string
  fontSize: number
  fontWeight: 'normal' | 'bold'
  textAlign: 'left' | 'center' | 'right'
  positionX: number
  positionY: number
  color: string
}

export type NameplateState = {
  size: NameplateSize
  backgroundImage: string | null
  fields: TextFieldConfig[]
  previewData: Record<string, string>
  excelRows: Record<string, string>[]
}

export type ExcelParseResult = {
  rows: Record<string, string>[]
  matched: string[]
  unmatched: string[]
}
