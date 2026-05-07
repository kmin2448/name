'use client'
import { useReducer, useCallback } from 'react'
import { NameplateState, NameplateSize, TextFieldConfig } from '@/types/nameplate'
import { DEFAULT_SIZE, DEFAULT_FIELDS, SAMPLE_PREVIEW_DATA } from '@/lib/sizeConstants'

type Action =
  | { type: 'SET_SIZE'; payload: NameplateSize }
  | { type: 'SET_BACKGROUND'; payload: string | null }
  | { type: 'ADD_FIELD' }
  | { type: 'ADD_FIELD_WITH_LABEL'; payload: string }
  | { type: 'UPDATE_FIELD'; payload: TextFieldConfig }
  | { type: 'REMOVE_FIELD'; payload: string }
  | { type: 'MOVE_FIELD'; payload: { id: string; positionX: number; positionY: number } }
  | { type: 'RESIZE_FIELD'; payload: { id: string; widthPct: number; heightPct: number } }
  | { type: 'SET_PREVIEW_DATA'; payload: Record<string, string> }
  | { type: 'SET_EXCEL_ROWS'; payload: Record<string, string>[] }
  | { type: 'UPDATE_EXCEL_ROW'; payload: { index: number; data: Record<string, string> } }

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
    case 'ADD_FIELD': {
      const maxBottom = state.fields.reduce((m, f) => Math.max(m, f.positionY + f.heightPct), 0)
      return { ...state, fields: [...state.fields, makeNewField('새 항목', maxBottom + 3)] }
    }
    case 'ADD_FIELD_WITH_LABEL': {
      const label = action.payload
      if (state.fields.some((f) => f.label === label)) return state
      const maxBottom = state.fields.reduce((m, f) => Math.max(m, f.positionY + f.heightPct), 0)
      return { ...state, fields: [...state.fields, makeNewField(label, maxBottom + 3)] }
    }
    case 'UPDATE_FIELD':
      return {
        ...state,
        fields: state.fields.map((f) => (f.id === action.payload.id ? action.payload : f)),
      }
    case 'REMOVE_FIELD':
      return { ...state, fields: state.fields.filter((f) => f.id !== action.payload) }
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
    default:
      return state
  }
}

export const initialState: NameplateState = {
  size: DEFAULT_SIZE,
  backgroundImage: null,
  fields: DEFAULT_FIELDS,
  previewData: SAMPLE_PREVIEW_DATA,
  excelRows: [],
}

export function useNameplateState() {
  const [state, dispatch] = useReducer(nameplateReducer, initialState)

  const setSize = useCallback((size: NameplateSize) => dispatch({ type: 'SET_SIZE', payload: size }), [])
  const setBackground = useCallback((bg: string | null) => dispatch({ type: 'SET_BACKGROUND', payload: bg }), [])
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

  return {
    state, setSize, setBackground, addField, addFieldWithLabel,
    updateField, removeField, moveField, resizeField,
    setPreviewData, setExcelRows, updateExcelRow,
  }
}
