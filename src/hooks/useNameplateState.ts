'use client'
import { useReducer, useCallback } from 'react'
import { NameplateState, NameplateSize, TextFieldConfig } from '@/types/nameplate'
import { DEFAULT_SIZE, DEFAULT_FIELDS, SAMPLE_PREVIEW_DATA } from '@/lib/sizeConstants'

type Action =
  | { type: 'SET_SIZE'; payload: NameplateSize }
  | { type: 'SET_BACKGROUND'; payload: string | null }
  | { type: 'ADD_FIELD' }
  | { type: 'UPDATE_FIELD'; payload: TextFieldConfig }
  | { type: 'REMOVE_FIELD'; payload: string }
  | { type: 'MOVE_FIELD'; payload: { id: string; positionX: number; positionY: number } }
  | { type: 'SET_PREVIEW_DATA'; payload: Record<string, string> }
  | { type: 'SET_EXCEL_ROWS'; payload: Record<string, string>[] }

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function nameplateReducer(state: NameplateState, action: Action): NameplateState {
  switch (action.type) {
    case 'SET_SIZE':
      return { ...state, size: action.payload }
    case 'SET_BACKGROUND':
      return { ...state, backgroundImage: action.payload }
    case 'ADD_FIELD':
      return {
        ...state,
        fields: [
          ...state.fields,
          {
            id: `field-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            label: '새 항목',
            fontSize: 14,
            fontWeight: 'normal',
            textAlign: 'center',
            positionX: 50,
            positionY: 50,
            color: '#000000',
          },
        ],
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
        fields: state.fields.map((f) =>
          f.id === action.payload.id
            ? {
                ...f,
                positionX: clamp(action.payload.positionX, 0, 100),
                positionY: clamp(action.payload.positionY, 0, 100),
              }
            : f
        ),
      }
    case 'SET_PREVIEW_DATA':
      return { ...state, previewData: action.payload }
    case 'SET_EXCEL_ROWS':
      return { ...state, excelRows: action.payload }
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
  const updateField = useCallback((field: TextFieldConfig) => dispatch({ type: 'UPDATE_FIELD', payload: field }), [])
  const removeField = useCallback((id: string) => dispatch({ type: 'REMOVE_FIELD', payload: id }), [])
  const moveField = useCallback(
    (id: string, positionX: number, positionY: number) =>
      dispatch({ type: 'MOVE_FIELD', payload: { id, positionX, positionY } }),
    []
  )
  const setPreviewData = useCallback((data: Record<string, string>) => dispatch({ type: 'SET_PREVIEW_DATA', payload: data }), [])
  const setExcelRows = useCallback((rows: Record<string, string>[]) => dispatch({ type: 'SET_EXCEL_ROWS', payload: rows }), [])

  return { state, setSize, setBackground, addField, updateField, removeField, moveField, setPreviewData, setExcelRows }
}
