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
  fontFamily: string
  textAlign: 'left' | 'center' | 'right'
  positionX: number  // % from left edge (top-left of box)
  positionY: number  // % from top edge (top-left of box)
  widthPct: number   // box width as % of canvas width
  heightPct: number  // box height as % of canvas height
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
