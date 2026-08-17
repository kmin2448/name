'use client'
import { useReducer, useCallback, useEffect, useState } from 'react'
import { NameplateState, NameplateSize, TextFieldConfig, OverlayImage } from '@/types/nameplate'
import { DEFAULT_SIZE, DEFAULT_FIELDS, SAMPLE_PREVIEW_DATA } from '@/lib/sizeConstants'
import { removePageOverrides } from '@/lib/pageRows'

const CUSTOM_DEFAULTS_KEY = 'nameplate_default_fields'
// 명단(excelRows) 및 모든 편집 내용을 새로고침 후에도 유지하기 위한 전체 상태 저장 키
const PERSISTED_STATE_KEY = 'nameplate_state'

function loadCustomDefaultFields(): TextFieldConfig[] | null {
  if (typeof window === 'undefined') return null
  try {
    const stored = localStorage.getItem(CUSTOM_DEFAULTS_KEY)
    return stored ? (JSON.parse(stored) as TextFieldConfig[]) : null
  } catch {
    return null
  }
}

function saveCustomDefaultFields(fields: TextFieldConfig[]): void {
  try {
    localStorage.setItem(CUSTOM_DEFAULTS_KEY, JSON.stringify(fields))
  } catch {
    // localStorage 사용 불가 환경에서는 무시
  }
}

function loadPersistedState(): NameplateState | null {
  if (typeof window === 'undefined') return null
  try {
    const stored = localStorage.getItem(PERSISTED_STATE_KEY)
    if (!stored) return null
    const parsed = JSON.parse(stored) as Partial<NameplateState>
    // 스키마 변경에 대비해 기본 상태와 병합 (누락된 필드는 기본값 사용)
    return {
      ...initialState,
      ...parsed,
      size: parsed.size ?? initialState.size,
    }
  } catch {
    return null
  }
}

function savePersistedState(state: NameplateState): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(PERSISTED_STATE_KEY, JSON.stringify(state))
  } catch {
    // base64 이미지 등으로 용량 초과 시 명단/편집 내용만이라도 보존하도록 이미지 제외 후 재시도
    try {
      const overlayIds = new Set(state.overlayImages.map((o) => o.id))
      const lightweight: NameplateState = {
        ...state,
        backgroundImage: null,
        overlayImages: [],
        layers: state.layers.filter((id) => !overlayIds.has(id)),
      }
      localStorage.setItem(PERSISTED_STATE_KEY, JSON.stringify(lightweight))
    } catch {
      // 저장 불가 환경에서는 무시
    }
  }
}

type Action =
  | { type: 'SET_SIZE'; payload: NameplateSize }
  | { type: 'SET_BACKGROUND'; payload: string | null }
  | { type: 'ADD_OVERLAY_IMAGE'; payload: OverlayImage }
  | { type: 'UPDATE_OVERLAY_IMAGE'; payload: OverlayImage }
  | { type: 'REMOVE_OVERLAY_IMAGE'; payload: string }
  | { type: 'SET_FIELDS'; payload: TextFieldConfig[] }
  | { type: 'ADD_FIELD' }
  | { type: 'ADD_FIELD_WITH_LABEL'; payload: string }
  | { type: 'UPDATE_FIELD'; payload: TextFieldConfig }
  | { type: 'REMOVE_FIELD'; payload: string }
  | { type: 'MOVE_FIELD'; payload: { id: string; positionX: number; positionY: number } }
  | { type: 'RESIZE_FIELD'; payload: { id: string; widthPct: number; heightPct: number } }
  | { type: 'SET_PREVIEW_DATA'; payload: Record<string, string> }
  | { type: 'SET_EXCEL_ROWS'; payload: Record<string, string>[] }
  | { type: 'UPDATE_EXCEL_ROW'; payload: { index: number; data: Record<string, string> } }
  | { type: 'ADD_EXCEL_ROW'; payload: Record<string, string> }
  | { type: 'REMOVE_EXCEL_ROW'; payload: number }
  | { type: 'SET_FIELD_OVERRIDE_FOR_PAGE'; payload: { pageIndex: number; field: TextFieldConfig } }
  | { type: 'MOVE_FIELD_FOR_PAGE'; payload: { pageIndex: number; id: string; positionX: number; positionY: number } }
  | { type: 'RESIZE_FIELD_FOR_PAGE'; payload: { pageIndex: number; id: string; widthPct: number; heightPct: number } }
  | { type: 'CLEAR_PAGE_FIELD_OVERRIDE'; payload: number }
  | { type: 'MOVE_LAYER'; payload: { id: string; direction: 'up' | 'down' } }
  | { type: 'SET_LAYERS'; payload: string[] }
  | { type: 'SET_SHOW_BORDER'; payload: boolean }
  | { type: 'RESET_FIELDS'; payload: TextFieldConfig[] }
  | { type: 'APPLY_FIELDS_TO_ALL'; payload: TextFieldConfig[] }
  | { type: 'RESTORE_STATE'; payload: NameplateState }

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function makeNewField(label: string, yStart: number): TextFieldConfig {
  return {
    id: `field-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    label,
    fontSize: 14,
    fontWeight: 'normal',
    fontFamily: '맑은 고딕',
    textAlign: 'center',
    positionX: 10,
    positionY: Math.min(yStart, 75),
    widthPct: 80,
    heightPct: 20,
    color: '#000000',
  }
}

export function nameplateReducer(state: NameplateState, action: Action): NameplateState {
  switch (action.type) {
    case 'SET_SIZE':
      return { ...state, size: action.payload }
    case 'SET_BACKGROUND':
      return { ...state, backgroundImage: action.payload }

    case 'ADD_OVERLAY_IMAGE':
      return {
        ...state,
        overlayImages: [...state.overlayImages, action.payload],
        // New overlay images go at the bottom of the layer stack (behind text)
        layers: [action.payload.id, ...state.layers],
      }
    case 'UPDATE_OVERLAY_IMAGE':
      return {
        ...state,
        overlayImages: state.overlayImages.map((img) => img.id === action.payload.id ? action.payload : img),
      }
    case 'REMOVE_OVERLAY_IMAGE':
      return {
        ...state,
        overlayImages: state.overlayImages.filter((img) => img.id !== action.payload),
        layers: state.layers.filter((id) => id !== action.payload),
      }

    case 'SET_FIELDS': {
      const newFields = action.payload
      const newFieldIds = newFields.map((f) => f.id)
      const overlayIds = state.overlayImages.map((o) => o.id)
      // Preserve existing layer order; put unlisted items at bottom
      const preserved = state.layers.filter((id) => newFieldIds.includes(id) || overlayIds.includes(id))
      const added = newFieldIds.filter((id) => !preserved.includes(id))
      return { ...state, fields: newFields, layers: [...added, ...preserved] }
    }
    case 'ADD_FIELD': {
      const maxBottom = state.fields.reduce((m, f) => Math.max(m, f.positionY + f.heightPct), 0)
      const newField = makeNewField('새 항목', maxBottom + 3)
      return {
        ...state,
        fields: [...state.fields, newField],
        layers: [...state.layers, newField.id],
      }
    }
    case 'ADD_FIELD_WITH_LABEL': {
      const label = action.payload
      if (state.fields.some((f) => f.label === label)) return state
      const maxBottom = state.fields.reduce((m, f) => Math.max(m, f.positionY + f.heightPct), 0)
      const newField = makeNewField(label, maxBottom + 3)
      return {
        ...state,
        fields: [...state.fields, newField],
        layers: [...state.layers, newField.id],
      }
    }
    case 'UPDATE_FIELD':
      return {
        ...state,
        fields: state.fields.map((f) => (f.id === action.payload.id ? action.payload : f)),
      }
    case 'REMOVE_FIELD':
      return {
        ...state,
        fields: state.fields.filter((f) => f.id !== action.payload),
        layers: state.layers.filter((id) => id !== action.payload),
      }
    case 'MOVE_FIELD':
      return {
        ...state,
        fields: state.fields.map((f) => {
          if (f.id !== action.payload.id) return f
          return {
            ...f,
            positionX: clamp(action.payload.positionX, 0, 100 - f.widthPct),
            positionY: clamp(action.payload.positionY, 0, 100 - f.heightPct),
          }
        }),
      }
    case 'RESIZE_FIELD':
      return {
        ...state,
        fields: state.fields.map((f) => {
          if (f.id !== action.payload.id) return f
          return {
            ...f,
            widthPct: clamp(action.payload.widthPct, 5, 100 - f.positionX),
            heightPct: clamp(action.payload.heightPct, 5, 100 - f.positionY),
          }
        }),
      }
    case 'SET_PREVIEW_DATA':
      return { ...state, previewData: action.payload }
    case 'SET_EXCEL_ROWS':
      return { ...state, excelRows: action.payload }
    case 'UPDATE_EXCEL_ROW': {
      const rows = [...state.excelRows]
      rows[action.payload.index] = action.payload.data
      return { ...state, excelRows: rows }
    }
    case 'ADD_EXCEL_ROW':
      // 새 페이지는 페이지별 서식 없이 추가되므로 전체 서식이 그대로 적용된다
      return { ...state, excelRows: [...state.excelRows, action.payload] }
    case 'REMOVE_EXCEL_ROW': {
      const index = action.payload
      if (index < 0 || index >= state.excelRows.length) return state
      return {
        ...state,
        excelRows: state.excelRows.filter((_, i) => i !== index),
        pageFieldOverrides: removePageOverrides(state.pageFieldOverrides, index),
      }
    }
    case 'SET_FIELD_OVERRIDE_FOR_PAGE': {
      const { pageIndex, field } = action.payload
      const existing = state.pageFieldOverrides[pageIndex] ?? {}
      return {
        ...state,
        pageFieldOverrides: {
          ...state.pageFieldOverrides,
          [pageIndex]: { ...existing, [field.id]: field },
        },
      }
    }
    case 'MOVE_FIELD_FOR_PAGE': {
      const { pageIndex, id, positionX, positionY } = action.payload
      const existing = state.pageFieldOverrides[pageIndex] ?? {}
      const base = existing[id] ?? state.fields.find((f) => f.id === id)
      if (!base) return state
      const updated: TextFieldConfig = {
        ...base,
        positionX: clamp(positionX, 0, 100 - base.widthPct),
        positionY: clamp(positionY, 0, 100 - base.heightPct),
      }
      return {
        ...state,
        pageFieldOverrides: {
          ...state.pageFieldOverrides,
          [pageIndex]: { ...existing, [id]: updated },
        },
      }
    }
    case 'CLEAR_PAGE_FIELD_OVERRIDE': {
      const { [action.payload]: _removed, ...rest } = state.pageFieldOverrides
      return { ...state, pageFieldOverrides: rest }
    }
    case 'RESIZE_FIELD_FOR_PAGE': {
      const { pageIndex, id, widthPct, heightPct } = action.payload
      const existing = state.pageFieldOverrides[pageIndex] ?? {}
      const base = existing[id] ?? state.fields.find((f) => f.id === id)
      if (!base) return state
      const updated: TextFieldConfig = {
        ...base,
        widthPct: clamp(widthPct, 5, 100 - base.positionX),
        heightPct: clamp(heightPct, 5, 100 - base.positionY),
      }
      return {
        ...state,
        pageFieldOverrides: {
          ...state.pageFieldOverrides,
          [pageIndex]: { ...existing, [id]: updated },
        },
      }
    }

    case 'MOVE_LAYER': {
      const { id, direction } = action.payload
      const idx = state.layers.indexOf(id)
      if (idx === -1) return state
      const next = [...state.layers]
      if (direction === 'up' && idx < next.length - 1) {
        ;[next[idx], next[idx + 1]] = [next[idx + 1], next[idx]]
      } else if (direction === 'down' && idx > 0) {
        ;[next[idx], next[idx - 1]] = [next[idx - 1], next[idx]]
      }
      return { ...state, layers: next }
    }

    case 'SET_LAYERS':
      return { ...state, layers: action.payload }

    case 'SET_SHOW_BORDER':
      return { ...state, showBorder: action.payload }

    case 'APPLY_FIELDS_TO_ALL': {
      const newFields = action.payload
      const newFieldIds = newFields.map((f) => f.id)
      const overlayIds = state.overlayImages.map((o) => o.id)
      const preserved = state.layers.filter((id) => newFieldIds.includes(id) || overlayIds.includes(id))
      const added = newFieldIds.filter((id) => !preserved.includes(id))
      return {
        ...state,
        fields: newFields,
        layers: [...added, ...preserved],
        pageFieldOverrides: {},
      }
    }

    case 'RESTORE_STATE':
      return action.payload

    case 'RESET_FIELDS': {
      const targetFields = action.payload
      const overlayIds = state.overlayImages.map((o) => o.id)
      const preservedOverlayLayers = state.layers.filter((id) => overlayIds.includes(id))
      return {
        ...state,
        fields: targetFields,
        layers: [...preservedOverlayLayers, ...targetFields.map((f) => f.id)],
        pageFieldOverrides: {},
      }
    }

    default:
      return state
  }
}

export const initialState: NameplateState = {
  size: DEFAULT_SIZE,
  backgroundImage: null,
  overlayImages: [],
  fields: DEFAULT_FIELDS,
  layers: DEFAULT_FIELDS.map((f) => f.id),
  pageFieldOverrides: {},
  previewData: SAMPLE_PREVIEW_DATA,
  excelRows: [],
  showBorder: true,
}

/** localStorage에 저장된 상태(없으면 사용자 기본 서식)를 읽어 온다 */
function loadRestorableState(): NameplateState | null {
  const persisted = loadPersistedState()
  if (persisted) return persisted

  const customDefaults = loadCustomDefaultFields()
  if (!customDefaults) return null
  return {
    ...initialState,
    fields: customDefaults,
    layers: customDefaults.map((f) => f.id),
  }
}

export function useNameplateState() {
  // 서버 렌더와 클라이언트 첫 렌더가 같아야 하므로(hydration) 항상 기본 상태로 시작하고,
  // localStorage 복원은 마운트 이후에 한다.
  const [state, dispatch] = useReducer(nameplateReducer, initialState)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    const restorable = loadRestorableState()
    if (restorable) dispatch({ type: 'RESTORE_STATE', payload: restorable })
    setHydrated(true)
  }, [])

  // 상태가 바뀔 때마다 localStorage에 저장해 새로고침 후에도 유지.
  // 복원 전에는 저장하지 않는다 — 기본 상태로 저장된 내용을 덮어쓰게 된다.
  useEffect(() => {
    if (!hydrated) return
    savePersistedState(state)
  }, [state, hydrated])

  const setSize = useCallback((size: NameplateSize) => dispatch({ type: 'SET_SIZE', payload: size }), [])
  const setBackground = useCallback((bg: string | null) => dispatch({ type: 'SET_BACKGROUND', payload: bg }), [])
  const addOverlayImage = useCallback((img: OverlayImage) => dispatch({ type: 'ADD_OVERLAY_IMAGE', payload: img }), [])
  const updateOverlayImage = useCallback((img: OverlayImage) => dispatch({ type: 'UPDATE_OVERLAY_IMAGE', payload: img }), [])
  const removeOverlayImage = useCallback((id: string) => dispatch({ type: 'REMOVE_OVERLAY_IMAGE', payload: id }), [])
  const setFields = useCallback((fields: TextFieldConfig[]) => dispatch({ type: 'SET_FIELDS', payload: fields }), [])
  const addField = useCallback(() => dispatch({ type: 'ADD_FIELD' }), [])
  const addFieldWithLabel = useCallback((label: string) => dispatch({ type: 'ADD_FIELD_WITH_LABEL', payload: label }), [])
  const updateField = useCallback((field: TextFieldConfig) => dispatch({ type: 'UPDATE_FIELD', payload: field }), [])
  const removeField = useCallback((id: string) => dispatch({ type: 'REMOVE_FIELD', payload: id }), [])
  const moveField = useCallback(
    (id: string, positionX: number, positionY: number) =>
      dispatch({ type: 'MOVE_FIELD', payload: { id, positionX, positionY } }),
    []
  )
  const resizeField = useCallback(
    (id: string, widthPct: number, heightPct: number) =>
      dispatch({ type: 'RESIZE_FIELD', payload: { id, widthPct, heightPct } }),
    []
  )
  const setPreviewData = useCallback((data: Record<string, string>) => dispatch({ type: 'SET_PREVIEW_DATA', payload: data }), [])
  const setExcelRows = useCallback((rows: Record<string, string>[]) => dispatch({ type: 'SET_EXCEL_ROWS', payload: rows }), [])
  const updateExcelRow = useCallback(
    (index: number, data: Record<string, string>) =>
      dispatch({ type: 'UPDATE_EXCEL_ROW', payload: { index, data } }),
    []
  )
  /** 저장해 둔 명단을 불러와 편집 상태에 반영한다 */
  const restoreState = useCallback(
    (next: NameplateState) => dispatch({ type: 'RESTORE_STATE', payload: next }),
    []
  )
  const addExcelRow = useCallback(
    (row: Record<string, string>) => dispatch({ type: 'ADD_EXCEL_ROW', payload: row }),
    []
  )
  const removeExcelRow = useCallback(
    (index: number) => dispatch({ type: 'REMOVE_EXCEL_ROW', payload: index }),
    []
  )
  const setFieldOverrideForPage = useCallback(
    (pageIndex: number, field: TextFieldConfig) =>
      dispatch({ type: 'SET_FIELD_OVERRIDE_FOR_PAGE', payload: { pageIndex, field } }),
    []
  )
  const moveFieldForPage = useCallback(
    (pageIndex: number, id: string, positionX: number, positionY: number) =>
      dispatch({ type: 'MOVE_FIELD_FOR_PAGE', payload: { pageIndex, id, positionX, positionY } }),
    []
  )
  const resizeFieldForPage = useCallback(
    (pageIndex: number, id: string, widthPct: number, heightPct: number) =>
      dispatch({ type: 'RESIZE_FIELD_FOR_PAGE', payload: { pageIndex, id, widthPct, heightPct } }),
    []
  )
  const clearPageFieldOverride = useCallback(
    (pageIndex: number) => dispatch({ type: 'CLEAR_PAGE_FIELD_OVERRIDE', payload: pageIndex }),
    []
  )
  const moveLayer = useCallback(
    (id: string, direction: 'up' | 'down') =>
      dispatch({ type: 'MOVE_LAYER', payload: { id, direction } }),
    []
  )
  const setLayers = useCallback(
    (layers: string[]) => dispatch({ type: 'SET_LAYERS', payload: layers }),
    []
  )
  const setShowBorder = useCallback(
    (v: boolean) => dispatch({ type: 'SET_SHOW_BORDER', payload: v }),
    []
  )
  const applyFieldsToAll = useCallback(
    (fields: TextFieldConfig[]) => dispatch({ type: 'APPLY_FIELDS_TO_ALL', payload: fields }),
    []
  )

  const resetFields = useCallback(() => {
    const defaults = loadCustomDefaultFields() ?? DEFAULT_FIELDS
    dispatch({ type: 'RESET_FIELDS', payload: defaults })
  }, [])

  const saveAsDefault = useCallback((fields: TextFieldConfig[]) => {
    saveCustomDefaultFields(fields)
  }, [])

  return {
    state, setSize, setBackground, addOverlayImage, updateOverlayImage, removeOverlayImage,
    setFields, addField, addFieldWithLabel,
    updateField, removeField, moveField, resizeField,
    setPreviewData, setExcelRows, updateExcelRow, addExcelRow, removeExcelRow, restoreState,
    setFieldOverrideForPage, moveFieldForPage, resizeFieldForPage, clearPageFieldOverride,
    moveLayer, setLayers, setShowBorder, resetFields, saveAsDefault, applyFieldsToAll,
  }
}
