# 명패 자동 생성 웹 애플리케이션 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 엑셀 명단을 업로드하면 양면 인쇄용 명패 PDF를 일괄 생성하는 Next.js 웹 앱을 만든다.

**Architecture:** HTML/CSS DOM으로 명패를 렌더링하고 html2canvas로 캡처 후 jsPDF에 삽입. 상태는 useReducer 기반 커스텀 훅으로 관리. 100% 클라이언트 사이드.

**Tech Stack:** Next.js 14, TypeScript, Tailwind CSS, shadcn/ui, xlsx, html2canvas, jspdf

---

## 파일 구조

```
src/
├── app/
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── SettingsPanel/
│   │   ├── SizeSelector.tsx
│   │   ├── BackgroundUploader.tsx
│   │   ├── TextFieldEditor.tsx
│   │   └── ExcelUploader.tsx
│   ├── NameplatePreview/
│   │   ├── NameplateCanvas.tsx
│   │   └── DraggableTextField.tsx
│   └── ExportButton.tsx
├── hooks/
│   ├── useNameplateState.ts
│   └── usePdfExport.ts
├── lib/
│   ├── excelParser.ts
│   ├── pdfGenerator.ts
│   └── sizeConstants.ts
└── types/
    └── nameplate.ts
```

---

## Task 1: Next.js 프로젝트 스캐폴드

**Files:**
- Create: `package.json`, `tsconfig.json`, `tailwind.config.ts`, `src/app/layout.tsx` (자동 생성)

- [ ] **Step 1: 현재 디렉토리에 Next.js 14 프로젝트 초기화**

```bash
npx create-next-app@14 . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --yes
```

기존 파일(CLAUDE.md, name.md, docs/) 보존 여부 묻는 프롬프트가 뜨면 `y` 입력.

Expected: `package.json`, `tsconfig.json`, `src/app/` 등 생성됨

- [ ] **Step 2: 추가 의존성 설치**

```bash
npm install xlsx html2canvas jspdf
npm install lucide-react
```

Expected: `node_modules/xlsx`, `node_modules/html2canvas`, `node_modules/jspdf` 설치됨

- [ ] **Step 3: shadcn/ui 초기화**

```bash
npx shadcn@latest init -d
```

Interactive 프롬프트:
- Style: `Default`
- Base color: `Neutral`
- CSS variables: `Yes`

- [ ] **Step 4: 필요한 shadcn 컴포넌트 설치**

```bash
npx shadcn@latest add button card input label select slider toggle toggle-group badge sonner
```

- [ ] **Step 5: Jest 설치 및 설정**

```bash
npm install --save-dev jest jest-environment-jsdom @testing-library/react @testing-library/jest-dom ts-jest
```

`jest.config.ts` 생성:
```ts
import type { Config } from 'jest'
import nextJest from 'next/jest.js'

const createJestConfig = nextJest({ dir: './' })

const config: Config = {
  testEnvironment: 'jsdom',
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
}

export default createJestConfig(config)
```

`package.json`의 `"test"` 스크립트를 확인:
```json
"test": "jest --passWithNoTests"
```

없으면 `scripts`에 추가.

- [ ] **Step 6: 개발 서버 확인**

```bash
npm run dev
```

Expected: `http://localhost:3000` 에서 Next.js 기본 페이지 확인

- [ ] **Step 7: 초기 커밋**

```bash
git add package.json package-lock.json tsconfig.json tailwind.config.ts next.config.mjs src/ components.json .eslintrc.json jest.config.ts
git commit -m "feat: scaffold Next.js 14 project with shadcn/ui"
git push -u origin master
```

---

## Task 2: 타입 정의 및 상수

**Files:**
- Create: `src/types/nameplate.ts`
- Create: `src/lib/sizeConstants.ts`
- Create: `src/__tests__/sizeConstants.test.ts`

- [ ] **Step 1: 타입 정의 파일 작성**

`src/types/nameplate.ts`:
```ts
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
```

- [ ] **Step 2: 상수 파일 작성**

`src/lib/sizeConstants.ts`:
```ts
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
```

- [ ] **Step 3: 상수 테스트 작성**

`src/__tests__/sizeConstants.test.ts`:
```ts
import { NAMEPLATE_SIZES, DEFAULT_SIZE, DEFAULT_FIELDS, MM_TO_PX } from '@/lib/sizeConstants'

describe('sizeConstants', () => {
  it('MM_TO_PX converts 1mm to ~3.78px', () => {
    expect(MM_TO_PX).toBeCloseTo(3.7795, 3)
  })

  it('NAMEPLATE_SIZES has 4 entries including custom', () => {
    expect(NAMEPLATE_SIZES).toHaveLength(4)
    const custom = NAMEPLATE_SIZES.find((s) => s.isCustom)
    expect(custom).toBeDefined()
  })

  it('DEFAULT_SIZE is B형 (중)', () => {
    expect(DEFAULT_SIZE.widthMm).toBe(210)
    expect(DEFAULT_SIZE.heightMm).toBe(70)
  })

  it('DEFAULT_FIELDS has 4 items with required properties', () => {
    expect(DEFAULT_FIELDS).toHaveLength(4)
    DEFAULT_FIELDS.forEach((field) => {
      expect(field.id).toBeTruthy()
      expect(field.label).toBeTruthy()
      expect(field.positionX).toBeGreaterThanOrEqual(0)
      expect(field.positionX).toBeLessThanOrEqual(100)
    })
  })
})
```

- [ ] **Step 4: 테스트 실행 확인**

```bash
npm test
```

Expected: 4 tests pass

- [ ] **Step 5: 커밋**

```bash
git add src/types/ src/lib/sizeConstants.ts src/__tests__/sizeConstants.test.ts
git commit -m "feat: add nameplate types and size constants"
git push
```

---

## Task 3: 엑셀 파서

**Files:**
- Create: `src/lib/excelParser.ts`
- Create: `src/__tests__/excelParser.test.ts`

- [ ] **Step 1: 테스트 작성**

`src/__tests__/excelParser.test.ts`:
```ts
import { normalizeHeader, matchHeaders } from '@/lib/excelParser'

describe('normalizeHeader', () => {
  it('trims whitespace', () => {
    expect(normalizeHeader('  이름  ')).toBe('이름')
  })

  it('lowercases ASCII', () => {
    expect(normalizeHeader('Name')).toBe('name')
  })
})

describe('matchHeaders', () => {
  it('matches exact Korean headers', () => {
    const result = matchHeaders(['이름', '소속', '부서'], ['이름', '소속'])
    expect(result.matched).toEqual(['이름', '소속'])
    expect(result.unmatched).toEqual(['부서'])
  })

  it('matches headers with extra whitespace', () => {
    const result = matchHeaders(['  이름  ', ' 소속'], ['이름', '소속'])
    expect(result.matched).toHaveLength(2)
    expect(result.unmatched).toHaveLength(0)
  })

  it('returns all as unmatched when no overlap', () => {
    const result = matchHeaders(['foo', 'bar'], ['이름', '소속'])
    expect(result.matched).toHaveLength(0)
    expect(result.unmatched).toHaveLength(2)
  })
})
```

- [ ] **Step 2: 테스트 실행 — FAIL 확인**

```bash
npm test excelParser
```

Expected: FAIL — "Cannot find module '@/lib/excelParser'"

- [ ] **Step 3: excelParser 구현**

`src/lib/excelParser.ts`:
```ts
import * as XLSX from 'xlsx'
import { ExcelParseResult } from '@/types/nameplate'

export function normalizeHeader(header: string): string {
  return header.trim().toLowerCase()
}

export function matchHeaders(
  headers: string[],
  fieldLabels: string[]
): { matched: string[]; unmatched: string[] } {
  const normalizedLabels = fieldLabels.map(normalizeHeader)
  const matched: string[] = []
  const unmatched: string[] = []
  for (const header of headers) {
    if (normalizedLabels.includes(normalizeHeader(header))) {
      matched.push(header)
    } else {
      unmatched.push(header)
    }
  }
  return { matched, unmatched }
}

export function parseExcelFile(
  file: File,
  fieldLabels: string[]
): Promise<ExcelParseResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = e.target?.result
        const workbook = XLSX.read(data, { type: 'array' })
        const sheetName = workbook.SheetNames[0]
        const sheet = workbook.Sheets[sheetName]
        const jsonData = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, {
          defval: '',
          raw: false,
        })

        if (jsonData.length === 0) {
          resolve({ rows: [], matched: [], unmatched: [] })
          return
        }

        const headers = Object.keys(jsonData[0])
        const { matched, unmatched } = matchHeaders(headers, fieldLabels)
        resolve({ rows: jsonData, matched, unmatched })
      } catch (err) {
        reject(err)
      }
    }
    reader.onerror = reject
    reader.readAsArrayBuffer(file)
  })
}
```

- [ ] **Step 4: 테스트 PASS 확인**

```bash
npm test excelParser
```

Expected: 5 tests pass

- [ ] **Step 5: 커밋**

```bash
git add src/lib/excelParser.ts src/__tests__/excelParser.test.ts
git commit -m "feat: add Excel parser with header auto-matching"
git push
```

---

## Task 4: useNameplateState 훅

**Files:**
- Create: `src/hooks/useNameplateState.ts`
- Create: `src/__tests__/useNameplateState.test.ts`

- [ ] **Step 1: 테스트 작성**

`src/__tests__/useNameplateState.test.ts`:
```ts
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
```

- [ ] **Step 2: 테스트 FAIL 확인**

```bash
npm test useNameplateState
```

Expected: FAIL — "Cannot find module"

- [ ] **Step 3: 훅 구현**

`src/hooks/useNameplateState.ts`:
```ts
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
            ? { ...f, positionX: clamp(action.payload.positionX, 0, 100), positionY: clamp(action.payload.positionY, 0, 100) }
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
```

- [ ] **Step 4: 테스트 PASS 확인**

```bash
npm test useNameplateState
```

Expected: 6 tests pass

- [ ] **Step 5: 커밋**

```bash
git add src/hooks/useNameplateState.ts src/__tests__/useNameplateState.test.ts
git commit -m "feat: add useNameplateState hook with reducer"
git push
```

---

## Task 5: DraggableTextField 컴포넌트

**Files:**
- Create: `src/components/NameplatePreview/DraggableTextField.tsx`

- [ ] **Step 1: 컴포넌트 작성**

`src/components/NameplatePreview/DraggableTextField.tsx`:
```tsx
'use client'
import { useRef, useCallback } from 'react'
import { TextFieldConfig } from '@/types/nameplate'

type Props = {
  field: TextFieldConfig
  value: string
  onMove: (id: string, positionX: number, positionY: number) => void
  onFocus: (id: string) => void
  containerRef: React.RefObject<HTMLDivElement>
}

export function DraggableTextField({ field, value, onMove, onFocus, containerRef }: Props) {
  const isDragging = useRef(false)
  const dragStart = useRef({ mouseX: 0, mouseY: 0, fieldX: 0, fieldY: 0 })

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      onFocus(field.id)
      isDragging.current = true
      dragStart.current = {
        mouseX: e.clientX,
        mouseY: e.clientY,
        fieldX: field.positionX,
        fieldY: field.positionY,
      }

      const handleMouseMove = (ev: MouseEvent) => {
        if (!isDragging.current || !containerRef.current) return
        const rect = containerRef.current.getBoundingClientRect()
        const deltaX = ev.clientX - dragStart.current.mouseX
        const deltaY = ev.clientY - dragStart.current.mouseY
        const newX = dragStart.current.fieldX + (deltaX / rect.width) * 100
        const newY = dragStart.current.fieldY + (deltaY / rect.height) * 100
        onMove(field.id, newX, newY)
      }

      const handleMouseUp = () => {
        isDragging.current = false
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }

      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    },
    [field.id, field.positionX, field.positionY, onMove, onFocus, containerRef]
  )

  return (
    <div
      onMouseDown={handleMouseDown}
      style={{
        position: 'absolute',
        left: `${field.positionX}%`,
        top: `${field.positionY}%`,
        transform: 'translate(-50%, -50%)',
        fontSize: `${field.fontSize}px`,
        fontWeight: field.fontWeight,
        textAlign: field.textAlign,
        color: field.color,
        cursor: 'move',
        userSelect: 'none',
        whiteSpace: 'nowrap',
        lineHeight: 1.2,
      }}
    >
      {value || `[${field.label}]`}
    </div>
  )
}
```

- [ ] **Step 2: 커밋**

```bash
git add src/components/NameplatePreview/DraggableTextField.tsx
git commit -m "feat: add DraggableTextField component"
git push
```

---

## Task 6: NameplateCanvas 컴포넌트

**Files:**
- Create: `src/components/NameplatePreview/NameplateCanvas.tsx`

- [ ] **Step 1: 컴포넌트 작성**

`src/components/NameplatePreview/NameplateCanvas.tsx`:
```tsx
'use client'
import { useRef } from 'react'
import { NameplateState, TextFieldConfig } from '@/types/nameplate'
import { DraggableTextField } from './DraggableTextField'
import { MM_TO_PX } from '@/lib/sizeConstants'

type Props = {
  state: NameplateState
  scale: number
  onMove: (id: string, positionX: number, positionY: number) => void
  onFieldFocus: (id: string) => void
}

function renderStaticFields(fields: TextFieldConfig[], data: Record<string, string>) {
  return fields.map((field) => (
    <div
      key={field.id}
      style={{
        position: 'absolute',
        left: `${field.positionX}%`,
        top: `${field.positionY}%`,
        transform: 'translate(-50%, -50%)',
        fontSize: `${field.fontSize}px`,
        fontWeight: field.fontWeight,
        textAlign: field.textAlign,
        color: field.color,
        whiteSpace: 'nowrap',
        lineHeight: 1.2,
      }}
    >
      {data[field.label] ?? `[${field.label}]`}
    </div>
  ))
}

export function NameplateCanvas({ state, scale, onMove, onFieldFocus }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const { size, backgroundImage, fields, previewData } = state

  const widthPx = size.widthMm * MM_TO_PX
  const heightPx = size.heightMm * MM_TO_PX

  const bgStyle: React.CSSProperties = {
    backgroundImage: backgroundImage ? `url(${backgroundImage})` : undefined,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundColor: '#ffffff',
  }

  const halfStyle: React.CSSProperties = {
    position: 'relative',
    width: widthPx,
    height: heightPx,
    overflow: 'hidden',
    border: '1px solid #d1d5db',
    ...bgStyle,
  }

  return (
    <div
      style={{
        width: Math.round(widthPx * scale),
        height: Math.round(heightPx * 2 * scale),
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        id="nameplate-export-container"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          transformOrigin: 'top left',
          transform: `scale(${scale})`,
        }}
      >
        {/* 상단: 180° 회전 — 접었을 때 뒷면 */}
        <div style={{ ...halfStyle, transform: 'rotate(180deg)' }}>
          {renderStaticFields(fields, previewData)}
        </div>

        {/* 하단: 정방향 — 접었을 때 앞면, 드래그 가능 */}
        <div ref={bottomRef} style={halfStyle}>
          {fields.map((field) => (
            <DraggableTextField
              key={field.id}
              field={field}
              value={previewData[field.label] ?? ''}
              onMove={onMove}
              onFocus={onFieldFocus}
              containerRef={bottomRef as React.RefObject<HTMLDivElement>}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 커밋**

```bash
git add src/components/NameplatePreview/NameplateCanvas.tsx
git commit -m "feat: add NameplateCanvas with dual-panel layout"
git push
```

---

## Task 7: SizeSelector 컴포넌트

**Files:**
- Create: `src/components/SettingsPanel/SizeSelector.tsx`

- [ ] **Step 1: 컴포넌트 작성**

`src/components/SettingsPanel/SizeSelector.tsx`:
```tsx
'use client'
import { useState } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NameplateSize } from '@/types/nameplate'
import { NAMEPLATE_SIZES } from '@/lib/sizeConstants'

type Props = {
  value: NameplateSize
  onChange: (size: NameplateSize) => void
}

export function SizeSelector({ value, onChange }: Props) {
  const [customW, setCustomW] = useState(value.widthMm)
  const [customH, setCustomH] = useState(value.heightMm)

  const handleSelect = (label: string) => {
    const size = NAMEPLATE_SIZES.find((s) => s.label === label)
    if (size) onChange(size)
  }

  const handleCustomChange = (w: number, h: number) => {
    onChange({ label: '사용자 지정', widthMm: w, heightMm: h, isCustom: true })
  }

  return (
    <div className="space-y-2">
      <Label className="text-sm font-semibold">명패 규격</Label>
      <Select value={value.label} onValueChange={handleSelect}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {NAMEPLATE_SIZES.map((size) => (
            <SelectItem key={size.label} value={size.label}>
              {size.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {value.isCustom && (
        <div className="flex gap-2 mt-1">
          <div className="flex-1">
            <Label className="text-xs text-muted-foreground">가로 (mm)</Label>
            <Input
              type="number"
              min={50}
              max={500}
              value={customW}
              onChange={(e) => {
                const w = Number(e.target.value)
                setCustomW(w)
                handleCustomChange(w, customH)
              }}
            />
          </div>
          <div className="flex-1">
            <Label className="text-xs text-muted-foreground">세로 (mm)</Label>
            <Input
              type="number"
              min={20}
              max={300}
              value={customH}
              onChange={(e) => {
                const h = Number(e.target.value)
                setCustomH(h)
                handleCustomChange(customW, h)
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: 커밋**

```bash
git add src/components/SettingsPanel/SizeSelector.tsx
git commit -m "feat: add SizeSelector component"
git push
```

---

## Task 8: BackgroundUploader 컴포넌트

**Files:**
- Create: `src/components/SettingsPanel/BackgroundUploader.tsx`

- [ ] **Step 1: 컴포넌트 작성**

`src/components/SettingsPanel/BackgroundUploader.tsx`:
```tsx
'use client'
import { useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

const MAX_SIZE = 10 * 1024 * 1024

type Props = {
  value: string | null
  onChange: (image: string | null) => void
}

export function BackgroundUploader({ value, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = (file: File) => {
    if (file.size > MAX_SIZE) {
      toast.error('이미지 파일은 10MB 이하만 업로드 가능합니다.')
      return
    }
    const url = URL.createObjectURL(file)
    onChange(url)
  }

  return (
    <div className="space-y-2">
      <Label className="text-sm font-semibold">배경 이미지</Label>
      <div className="flex gap-2">
        <Button variant="outline" className="flex-1 text-sm" onClick={() => inputRef.current?.click()}>
          {value ? '이미지 변경' : '이미지 업로드'}
        </Button>
        {value && (
          <Button variant="ghost" size="sm" onClick={() => onChange(null)}>
            제거
          </Button>
        )}
      </div>
      {value && (
        <div className="rounded border overflow-hidden h-14">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="배경 미리보기" className="w-full h-full object-cover" />
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
          e.target.value = ''
        }}
      />
    </div>
  )
}
```

- [ ] **Step 2: 커밋**

```bash
git add src/components/SettingsPanel/BackgroundUploader.tsx
git commit -m "feat: add BackgroundUploader component"
git push
```

---

## Task 9: TextFieldEditor 컴포넌트

**Files:**
- Create: `src/components/SettingsPanel/TextFieldEditor.tsx`

- [ ] **Step 1: 컴포넌트 작성**

`src/components/SettingsPanel/TextFieldEditor.tsx`:
```tsx
'use client'
import { TextFieldConfig } from '@/types/nameplate'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Toggle } from '@/components/ui/toggle'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Bold, AlignLeft, AlignCenter, AlignRight, X, Plus } from 'lucide-react'

type Props = {
  fields: TextFieldConfig[]
  focusedId: string | null
  onUpdate: (field: TextFieldConfig) => void
  onRemove: (id: string) => void
  onAdd: () => void
}

export function TextFieldEditor({ fields, focusedId, onUpdate, onRemove, onAdd }: Props) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-semibold">텍스트 항목</Label>
        <Button size="sm" variant="outline" onClick={onAdd}>
          <Plus className="w-3 h-3 mr-1" />
          추가
        </Button>
      </div>

      {fields.map((field) => (
        <Card
          key={field.id}
          className={`transition-shadow ${focusedId === field.id ? 'ring-2 ring-[#1F5C99]' : ''}`}
        >
          <CardHeader className="py-2 px-3 pb-0">
            <div className="flex items-center gap-2">
              <Input
                value={field.label}
                onChange={(e) => onUpdate({ ...field, label: e.target.value })}
                className="h-7 text-sm font-medium"
              />
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => onRemove(field.id)}
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="py-2 px-3 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground w-10 shrink-0">크기</span>
              <Slider
                min={8}
                max={72}
                step={1}
                value={[field.fontSize]}
                onValueChange={([v]) => onUpdate({ ...field, fontSize: v })}
                className="flex-1"
              />
              <span className="text-xs w-8 text-right tabular-nums">{field.fontSize}px</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground w-10 shrink-0">서식</span>
              <Toggle
                size="sm"
                pressed={field.fontWeight === 'bold'}
                onPressedChange={(p) => onUpdate({ ...field, fontWeight: p ? 'bold' : 'normal' })}
                className="h-7 w-7 p-0"
              >
                <Bold className="w-3 h-3" />
              </Toggle>
              <ToggleGroup
                type="single"
                value={field.textAlign}
                onValueChange={(v) => {
                  if (v) onUpdate({ ...field, textAlign: v as TextFieldConfig['textAlign'] })
                }}
                className="gap-0"
              >
                <ToggleGroupItem value="left" className="h-7 w-7 p-0">
                  <AlignLeft className="w-3 h-3" />
                </ToggleGroupItem>
                <ToggleGroupItem value="center" className="h-7 w-7 p-0">
                  <AlignCenter className="w-3 h-3" />
                </ToggleGroupItem>
                <ToggleGroupItem value="right" className="h-7 w-7 p-0">
                  <AlignRight className="w-3 h-3" />
                </ToggleGroupItem>
              </ToggleGroup>
              <input
                type="color"
                value={field.color}
                onChange={(e) => onUpdate({ ...field, color: e.target.value })}
                className="h-7 w-7 rounded cursor-pointer border border-input p-0.5"
                title="글자 색상"
              />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: 커밋**

```bash
git add src/components/SettingsPanel/TextFieldEditor.tsx
git commit -m "feat: add TextFieldEditor with dynamic field management"
git push
```

---

## Task 10: ExcelUploader 컴포넌트

**Files:**
- Create: `src/components/SettingsPanel/ExcelUploader.tsx`

- [ ] **Step 1: 컴포넌트 작성**

`src/components/SettingsPanel/ExcelUploader.tsx`:
```tsx
'use client'
import { useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { TextFieldConfig, ExcelParseResult } from '@/types/nameplate'
import { parseExcelFile } from '@/lib/excelParser'
import { toast } from 'sonner'

type Props = {
  fields: TextFieldConfig[]
  rowCount: number
  onParsed: (result: ExcelParseResult) => void
}

export function ExcelUploader({ fields, rowCount, onParsed }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = async (file: File) => {
    try {
      const fieldLabels = fields.map((f) => f.label)
      const result = await parseExcelFile(file, fieldLabels)

      if (result.rows.length === 0) {
        toast.error('데이터 행이 없습니다.')
        return
      }

      onParsed(result)

      if (result.unmatched.length > 0) {
        result.unmatched.forEach((col) => {
          toast.warning(`'${col}' 열을 찾지 못했습니다. 빈 값으로 표시됩니다.`)
        })
      } else {
        toast.success(`${result.rows.length}명의 데이터를 불러왔습니다.`)
      }
    } catch {
      toast.error('파일을 읽는 중 오류가 발생했습니다.')
    }
  }

  return (
    <div className="space-y-2">
      <Label className="text-sm font-semibold">엑셀 업로드</Label>
      <div className="flex items-center gap-2">
        <Button variant="outline" className="flex-1 text-sm" onClick={() => inputRef.current?.click()}>
          {rowCount > 0 ? '파일 변경' : '엑셀 파일 선택'}
        </Button>
        {rowCount > 0 && (
          <Badge variant="secondary">{rowCount}명</Badge>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        첫 행에 헤더(프로그램명, 소속, 이름, 직책 등) | .xlsx, .csv
      </p>
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.csv"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
          e.target.value = ''
        }}
      />
    </div>
  )
}
```

- [ ] **Step 2: 커밋**

```bash
git add src/components/SettingsPanel/ExcelUploader.tsx
git commit -m "feat: add ExcelUploader with header auto-matching"
git push
```

---

## Task 11: PDF 생성 로직 및 ExportButton

**Files:**
- Create: `src/lib/pdfGenerator.ts`
- Create: `src/hooks/usePdfExport.ts`
- Create: `src/components/ExportButton.tsx`

- [ ] **Step 1: pdfGenerator 작성**

`src/lib/pdfGenerator.ts`:
```ts
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import { NameplateState, TextFieldConfig } from '@/types/nameplate'
import { MM_TO_PX } from '@/lib/sizeConstants'

function buildHalfElement(
  state: NameplateState,
  rowData: Record<string, string>,
  rotate: boolean
): HTMLDivElement {
  const { size, backgroundImage, fields } = state
  const el = document.createElement('div')
  el.style.cssText = [
    `position:relative`,
    `width:${size.widthMm * MM_TO_PX}px`,
    `height:${size.heightMm * MM_TO_PX}px`,
    `overflow:hidden`,
    `background-color:#ffffff`,
    backgroundImage ? `background-image:url(${backgroundImage})` : '',
    `background-size:cover`,
    `background-position:center`,
    rotate ? `transform:rotate(180deg)` : '',
  ]
    .filter(Boolean)
    .join(';')

  fields.forEach((field: TextFieldConfig) => {
    const text = document.createElement('div')
    text.style.cssText = [
      `position:absolute`,
      `left:${field.positionX}%`,
      `top:${field.positionY}%`,
      `transform:translate(-50%,-50%)`,
      `font-size:${field.fontSize}px`,
      `font-weight:${field.fontWeight}`,
      `text-align:${field.textAlign}`,
      `color:${field.color}`,
      `white-space:nowrap`,
      `line-height:1.2`,
    ].join(';')
    text.textContent = rowData[field.label] ?? ''
    el.appendChild(text)
  })

  return el
}

export async function generatePdf(
  state: NameplateState,
  onProgress?: (current: number, total: number) => void
): Promise<void> {
  const rows = state.excelRows.length > 0 ? state.excelRows : [state.previewData]
  const { size } = state
  const totalHeightMm = size.heightMm * 2

  const pdf = new jsPDF({
    orientation: size.widthMm > totalHeightMm ? 'landscape' : 'portrait',
    unit: 'mm',
    format: [size.widthMm, totalHeightMm],
  })

  for (let i = 0; i < rows.length; i++) {
    onProgress?.(i + 1, rows.length)

    const wrapper = document.createElement('div')
    wrapper.style.cssText = 'position:fixed;left:-9999px;top:0;display:inline-block;'
    wrapper.appendChild(buildHalfElement(state, rows[i], true))
    wrapper.appendChild(buildHalfElement(state, rows[i], false))
    document.body.appendChild(wrapper)

    const canvas = await html2canvas(wrapper, { scale: 2, useCORS: true, logging: false })
    const imgData = canvas.toDataURL('image/png')

    if (i > 0) pdf.addPage([size.widthMm, totalHeightMm])
    pdf.addImage(imgData, 'PNG', 0, 0, size.widthMm, totalHeightMm)

    document.body.removeChild(wrapper)
  }

  pdf.save('명패_일괄출력.pdf')
}
```

- [ ] **Step 2: usePdfExport 훅 작성**

`src/hooks/usePdfExport.ts`:
```ts
'use client'
import { useState, useCallback } from 'react'
import { NameplateState } from '@/types/nameplate'
import { generatePdf } from '@/lib/pdfGenerator'

export function usePdfExport() {
  const [isExporting, setIsExporting] = useState(false)
  const [progress, setProgress] = useState({ current: 0, total: 0 })

  const exportPdf = useCallback(async (state: NameplateState) => {
    setIsExporting(true)
    try {
      await generatePdf(state, (current, total) => setProgress({ current, total }))
    } finally {
      setIsExporting(false)
      setProgress({ current: 0, total: 0 })
    }
  }, [])

  return { exportPdf, isExporting, progress }
}
```

- [ ] **Step 3: ExportButton 컴포넌트 작성**

`src/components/ExportButton.tsx`:
```tsx
'use client'
import { Button } from '@/components/ui/button'
import { usePdfExport } from '@/hooks/usePdfExport'
import { NameplateState } from '@/types/nameplate'
import { toast } from 'sonner'
import { Download } from 'lucide-react'

type Props = {
  state: NameplateState
}

export function ExportButton({ state }: Props) {
  const { exportPdf, isExporting, progress } = usePdfExport()
  const totalRows = state.excelRows.length || 1

  const handleExport = async () => {
    try {
      await exportPdf(state)
      toast.success(`PDF ${totalRows}장 생성이 완료되었습니다.`)
    } catch {
      toast.error('PDF 생성 중 오류가 발생했습니다.')
    }
  }

  return (
    <Button
      onClick={handleExport}
      disabled={isExporting}
      className="w-full bg-[#1F5C99] hover:bg-[#1a4d82] text-white"
    >
      <Download className="w-4 h-4 mr-2" />
      {isExporting
        ? `생성 중... (${progress.current}/${progress.total})`
        : `PDF 다운로드 (${totalRows}장)`}
    </Button>
  )
}
```

- [ ] **Step 4: 커밋**

```bash
git add src/lib/pdfGenerator.ts src/hooks/usePdfExport.ts src/components/ExportButton.tsx
git commit -m "feat: add PDF generation with html2canvas + jsPDF"
git push
```

---

## Task 12: 메인 페이지 조립

**Files:**
- Modify: `src/app/layout.tsx`
- Modify: `src/app/page.tsx`
- Modify: `src/app/globals.css`

- [ ] **Step 1: layout.tsx 수정**

`src/app/layout.tsx`:
```tsx
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: '명패 제작기',
  description: '엑셀 명단으로 양면 명패 PDF를 일괄 생성하는 도구',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className={inter.className}>{children}</body>
    </html>
  )
}
```

- [ ] **Step 2: page.tsx 작성**

`src/app/page.tsx`:
```tsx
'use client'
import { useState } from 'react'
import { Toaster } from 'sonner'
import { useNameplateState } from '@/hooks/useNameplateState'
import { SizeSelector } from '@/components/SettingsPanel/SizeSelector'
import { BackgroundUploader } from '@/components/SettingsPanel/BackgroundUploader'
import { TextFieldEditor } from '@/components/SettingsPanel/TextFieldEditor'
import { ExcelUploader } from '@/components/SettingsPanel/ExcelUploader'
import { NameplateCanvas } from '@/components/NameplatePreview/NameplateCanvas'
import { ExportButton } from '@/components/ExportButton'
import { ExcelParseResult } from '@/types/nameplate'
import { MM_TO_PX } from '@/lib/sizeConstants'

export default function Home() {
  const {
    state,
    setSize,
    setBackground,
    addField,
    updateField,
    removeField,
    moveField,
    setPreviewData,
    setExcelRows,
  } = useNameplateState()

  const [focusedFieldId, setFocusedFieldId] = useState<string | null>(null)

  const PREVIEW_MAX_WIDTH = 460
  const scale = Math.min(1, PREVIEW_MAX_WIDTH / (state.size.widthMm * MM_TO_PX))

  const handleExcelParsed = (result: ExcelParseResult) => {
    setExcelRows(result.rows)
    if (result.rows.length > 0) {
      setPreviewData(result.rows[0])
    }
  }

  return (
    <>
      <Toaster position="top-right" richColors />
      <div className="min-h-screen flex flex-col">
        <header className="bg-[#1F5C99] text-white px-6 py-3 shrink-0">
          <h1 className="text-lg font-bold tracking-tight">명패 제작기</h1>
        </header>

        <div className="flex flex-1 overflow-hidden">
          {/* 좌측 설정 패널 */}
          <aside className="w-72 border-r overflow-y-auto p-4 space-y-5 shrink-0 bg-white">
            <SizeSelector value={state.size} onChange={setSize} />
            <hr />
            <BackgroundUploader value={state.backgroundImage} onChange={setBackground} />
            <hr />
            <TextFieldEditor
              fields={state.fields}
              focusedId={focusedFieldId}
              onUpdate={updateField}
              onRemove={removeField}
              onAdd={addField}
            />
            <hr />
            <ExcelUploader
              fields={state.fields}
              rowCount={state.excelRows.length}
              onParsed={handleExcelParsed}
            />
            <ExportButton state={state} />
          </aside>

          {/* 우측 미리보기 패널 */}
          <main className="flex-1 overflow-auto p-6 bg-gray-50 flex flex-col items-center">
            <p className="text-xs text-muted-foreground mb-4">
              하단 명패에서 텍스트를 드래그해 위치를 조정하세요 · 상단은 접었을 때 뒷면 미리보기
            </p>
            <NameplateCanvas
              state={state}
              scale={scale}
              onMove={moveField}
              onFieldFocus={setFocusedFieldId}
            />
            {state.excelRows.length > 0 && (
              <p className="text-xs text-muted-foreground mt-3">
                미리보기: 첫 번째 행 데이터 · 총 {state.excelRows.length}명
              </p>
            )}
          </main>
        </div>
      </div>
    </>
  )
}
```

- [ ] **Step 3: globals.css — 불필요한 기본 스타일 제거**

`src/app/globals.css`의 내용을 다음으로 교체:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 4: 개발 서버에서 동작 확인**

```bash
npm run dev
```

확인 항목:
- 헤더 파란색(#1F5C99) 표시
- 좌측 설정 패널 스크롤 가능
- 우측 명패 미리보기 표시 (상단 회전 + 하단 정방향)
- 텍스트 드래그 이동 작동
- 항목 추가/삭제 작동
- 규격 변경 시 미리보기 크기 변경

- [ ] **Step 5: TypeScript 타입 체크**

```bash
npm run type-check
```

Expected: 오류 없음

- [ ] **Step 6: 최종 커밋 및 푸시**

```bash
git add src/app/layout.tsx src/app/page.tsx src/app/globals.css
git commit -m "feat: assemble main page with two-panel layout"
git push
```

---

## Task 13: 빌드 검증 및 배포

**Files:** 없음 (검증만)

- [ ] **Step 1: 프로덕션 빌드 확인**

```bash
npm run build
```

Expected: 빌드 성공, 오류 없음

- [ ] **Step 2: 린트 확인**

```bash
npm run lint
```

Expected: 경고/오류 없음

- [ ] **Step 3: 전체 테스트 실행**

```bash
npm test
```

Expected: 모든 테스트 통과

- [ ] **Step 4: 최종 push (Vercel 자동 배포 트리거)**

```bash
git add .
git commit -m "feat: complete nameplate generator app"
git push
```

Expected: GitHub에 push 완료, Vercel이 master 브랜치 감지해 자동 배포 시작
