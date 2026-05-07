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

export type ImageCondition =
  | { type: 'all' }
  | { type: 'field'; fieldLabel: string; fieldValue: string }

export type OverlayImage = {
  id: string
  src: string        // base64 data URL
  name: string
  positionX: number  // % from left
  positionY: number  // % from top
  widthPct: number   // % of canvas width
  heightPct: number  // % of canvas height
  condition: ImageCondition
  // Crop region in % of image natural size (defaults: 0, 0, 100, 100 = no crop)
  cropX: number
  cropY: number
  cropW: number
  cropH: number
}

export type NameplateState = {
  size: NameplateSize
  backgroundImage: string | null
  overlayImages: OverlayImage[]
  fields: TextFieldConfig[]
  // Render order: index 0 = bottommost layer, last = topmost
  layers: string[]
  pageFieldOverrides: Record<number, Record<string, TextFieldConfig>>
  previewData: Record<string, string>
  excelRows: Record<string, string>[]
}

export type ExcelParseResult = {
  rows: Record<string, string>[]
  matched: string[]         // field labels found in Excel
  unmatched: string[]       // field labels NOT in Excel (will be empty)
  newColumns: string[]      // Excel headers not in any field (auto-add candidates)
  fieldConfigs?: TextFieldConfig[]  // loaded from 서식 sheet, if present
}
