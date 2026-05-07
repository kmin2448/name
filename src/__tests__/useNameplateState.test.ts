import { nameplateReducer, initialState } from '@/hooks/useNameplateState'
import { DEFAULT_FIELDS } from '@/lib/sizeConstants'

describe('nameplateReducer', () => {
  it('SET_SIZE updates size', () => {
    const newSize = { label: 'A형 (대) 250×90mm', widthMm: 250, heightMm: 90 }
    const next = nameplateReducer(initialState, { type: 'SET_SIZE', payload: newSize })
    expect(next.size).toEqual(newSize)
    expect(next.fields).toEqual(initialState.fields)
  })

  it('SET_BACKGROUND updates backgroundImage', () => {
    const next = nameplateReducer(initialState, { type: 'SET_BACKGROUND', payload: 'data:image/png;base64,abc' })
    expect(next.backgroundImage).toBe('data:image/png;base64,abc')
  })

  it('ADD_FIELD appends new field with label "새 항목"', () => {
    const next = nameplateReducer(initialState, { type: 'ADD_FIELD' })
    expect(next.fields).toHaveLength(DEFAULT_FIELDS.length + 1)
    expect(next.fields[next.fields.length - 1].label).toBe('새 항목')
  })

  it('REMOVE_FIELD removes the field by id', () => {
    const target = initialState.fields[0]
    const next = nameplateReducer(initialState, { type: 'REMOVE_FIELD', payload: target.id })
    expect(next.fields).toHaveLength(DEFAULT_FIELDS.length - 1)
    expect(next.fields.find((f) => f.id === target.id)).toBeUndefined()
  })

  it('UPDATE_FIELD updates matching field', () => {
    const target = initialState.fields[0]
    const updated = { ...target, label: '수정된 항목', fontSize: 30 }
    const next = nameplateReducer(initialState, { type: 'UPDATE_FIELD', payload: updated })
    const found = next.fields.find((f) => f.id === target.id)
    expect(found?.label).toBe('수정된 항목')
    expect(found?.fontSize).toBe(30)
  })

  it('MOVE_FIELD clamps position to 0-100', () => {
    const target = initialState.fields[0]
    const next = nameplateReducer(initialState, {
      type: 'MOVE_FIELD',
      payload: { id: target.id, positionX: 150, positionY: -10 },
    })
    const found = next.fields.find((f) => f.id === target.id)
    expect(found?.positionX).toBe(100)
    expect(found?.positionY).toBe(0)
  })
})
