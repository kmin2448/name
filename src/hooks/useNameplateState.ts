'use client'
import { useReducer, useCallback } from 'react'
import { NameplateState, NameplateSize, TextFieldConfig, OverlayImage } from '@/types/nameplate'
import { DEFAULT_SIZE, DEFAULT_FIELDS, SAMPLE_PREVIEW_DATA } from '@/lib/sizeConstants'

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
  | { type: 'SET_FIELD_OVERRIDE_FOR_PAGE'; payload: { pageIndex: number; field: TextFieldConfig } }
  | { type: 'MOVE_FIELD_FOR_PAGE'; payload: { pageIndex: number; id: string; positionX: number; positionY: number } }
  | { type: 'RESIZE_FIELD_FOR_PAGE'; payload: { pageIndex: number; id: string; widthPct: number; heightPct: number } }
  | { type: 'CLEAR_PAGE_FIELD_OVERRIDE'; payload: number }
  | { type: 'MOVE_LAYER'; payload: { id: string; direction: 'up' | 'down' } }
  | { type: 'SET_LAYERS'; payload: string[] }
  | { type: 'SET_SHOW_BORDER'; payload: boolean }
  | { type: 'RESET_FIELDS' }

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

    case 'RESET_FIELDS': {
      const overlayIds = state.overlayImages.map((o) => o.id)
      const preservedOverlayLayers = state.layers.filter((id) => overlayIds.includes(id))
      return {
        ...state,
        fields: DEFAULT_FIELDS,
        layers: [...preservedOverlayLayers, ...DEFAULT_FIELDS.map((f) => f.id)],
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

export function useNameplateState() {
  const [state, dispatch] = useReducer(nameplateReducer, initialState)

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
  const resetFields = useCallback(() => dispatch({ type: 'RESET_FIELDS' }), [])

  return {
    state, setSize, setBackground, addOverlayImage, updateOverlayImage, removeOverlayImage,
    setFields, addField, addFieldWithLabel,
    updateField, removeField, moveField, resizeField,
    setPreviewData, setExcelRows, updateExcelRow,
    setFieldOverrideForPage, moveFieldForPage, resizeFieldForPage, clearPageFieldOverride,
    moveLayer, setLayers, setShowBorder, resetFields,
  }
}
