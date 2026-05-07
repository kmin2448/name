# 명패 자동 생성 웹 애플리케이션 설계 명세

**날짜:** 2026-05-07  
**스택:** Next.js 14 (App Router) + TypeScript + Tailwind CSS + shadcn/ui  
**배포:** Vercel (master 브랜치 자동 배포)  
**처리 방식:** 클라이언트 사이드 전용 (서버 없음)

---

## 1. 목표

엑셀 명단을 업로드하면 설정된 디자인에 맞춰 양면 인쇄용 명패 PDF를 일괄 생성하는 웹 앱.

---

## 2. 아키텍처

### 렌더링 방식
HTML/CSS DOM으로 명패를 렌더링하고 html2canvas로 캡처 후 jsPDF에 삽입.  
시스템 폰트(맑은 고딕 등)를 그대로 사용하며 별도 폰트 파일 내장 불필요.

### 상태 관리
`useReducer` 기반 커스텀 훅 `useNameplateState`에 전체 에디터 상태 집중.  
외부 상태 라이브러리 없음.

### 파일 구조

```
src/
├── app/
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

## 3. 데이터 타입

```ts
type NameplateSize = {
  label: string
  widthMm: number
  heightMm: number
}

type TextFieldConfig = {
  id: string
  label: string          // 사용자 편집 가능 (기본: "이름", "소속" 등)
  fontSize: number       // px
  fontWeight: 'normal' | 'bold'
  textAlign: 'left' | 'center' | 'right'
  positionX: number      // 부모 컨테이너 대비 % (0~100)
  positionY: number      // 부모 컨테이너 대비 % (0~100)
  color: string          // hex
}

type NameplateState = {
  size: NameplateSize
  backgroundImage: string | null
  fields: TextFieldConfig[]
  previewData: Record<string, string>
  excelRows: Record<string, string>[]
}
```

---

## 4. 명패 규격 상수

`lib/sizeConstants.ts`에서 관리:

| 구분 | 가로(mm) | 세로(mm) | 비고 |
|------|---------|---------|------|
| A형 (대) | 250 | 90 | 일반적인 세미나용 |
| B형 (중) | 210 | 70 | 가장 많이 쓰이는 규격 |
| C형 (소) | 150 | 60 | 소규모 미팅용 |
| 사용자 지정 | — | — | 직접 입력 |

기본 텍스트 필드 4개도 상수로 정의: `프로그램명`, `소속`, `이름`, `직책`

---

## 5. UI 레이아웃

```
┌─────────────────────────────────────────────────────────┐
│  헤더: "명패 제작기"  (bg: #1F5C99, text: white)         │
├──────────────────────┬──────────────────────────────────┤
│   좌측 설정 패널      │      우측 미리보기 패널           │
│   (overflow-y: auto) │      (sticky)                    │
│                      │                                  │
│  [1] 명패 규격 선택   │   ┌──────────────────────┐       │
│  [2] 배경 이미지 업로드│   │  상단 (180° 회전)      │       │
│  [3] 텍스트 필드 관리 │   ├──────────────────────┤       │
│      기본 4개 + 추가  │   │  하단 (정방향)         │       │
│      각 카드: 이름편집│   └──────────────────────┘       │
│      크기/굵기/정렬   │                                  │
│      색상/삭제        │   (드래그로 텍스트 위치 조정)      │
│  [4] 엑셀 업로드      │                                  │
│  [5] PDF 다운로드     │                                  │
└──────────────────────┴──────────────────────────────────┘
```

---

## 6. 텍스트 필드 관리

- **기본 제공:** 프로그램명, 소속, 이름, 직책 (4개)
- **추가:** "+ 항목 추가" 버튼 → 기본명 "새 항목"으로 빈 필드 생성
- **삭제:** 각 카드의 × 버튼으로 삭제
- **편집:** 카드 내 Input으로 필드명 직접 수정
- **서식:** 폰트 크기(Slider), 굵기(Toggle), 정렬(ToggleGroup), 색상(색상 피커)

---

## 7. 양면 명패 렌더링 구조

```
<div class="nameplate-wrapper"> {/* 전체 높이 = 명패 높이 × 2 */}
  <div class="nameplate-top" style="transform: rotate(180deg)">
    {/* 동일한 TextFieldConfig 사용, 회전만 적용 */}
  </div>
  <div class="nameplate-bottom">
    {/* 정방향 */}
  </div>
</div>
```

접었을 때 앞면(하단 정방향)과 뒷면(상단 180° 회전)이 동일 데이터로 일치.

---

## 8. 드래그 앤 드롭

- `DraggableTextField`: `position: absolute`, `onMouseDown` → `onMouseMove` → `onMouseUp`
- 좌표는 부모 컨테이너 대비 `%`로 저장 → 사이즈 변경 시 비율 유지
- 명패 영역 밖 이탈 방지: 0~100% 범위로 클램핑
- 클릭 시 해당 필드가 좌측 패널에서 포커스됨

---

## 9. 엑셀 파싱

```
파일 업로드 (File API)
→ xlsx.read() (SheetJS)
→ 첫 행 헤더 추출
→ fields[].label과 대조 (trim, 대소문자 무시)
→ 매핑 결과: { matched, unmatched }
→ 2행부터 Record<string, string>[] 변환
```

- 미매핑 컬럼: 회색 뱃지로 표시
- 엑셀 없을 때 미리보기: 샘플 더미 데이터 표시

---

## 10. PDF 생성 흐름

```
엑셀 행 순회
→ 각 행 데이터를 NameplateCanvas에 주입
→ html2canvas 캡처 (scale: 2, 고해상도)
→ jsPDF 새 페이지에 이미지 삽입
→ 완료 후 "명패_일괄출력.pdf" 다운로드
```

- 페이지 크기: 명패 widthMm × (heightMm × 2)
- 엑셀 없을 경우: 현재 미리보기 1장만 출력
- 생성 중: 버튼 비활성화 + 로딩 스피너 + 진행 메시지

---

## 11. 에러 처리

| 상황 | 처리 |
|------|------|
| 헤더 미매핑 | 토스트: "'{필드명}' 열을 찾지 못했습니다. 빈 값으로 표시됩니다." |
| 빈 엑셀 파일 | 토스트: "데이터 행이 없습니다." |
| 잘못된 파일 형식 | input accept=".xlsx,.csv" 제한 + 에러 토스트 |
| 배경 이미지 10MB 초과 | 업로드 차단 + 경고 토스트 |
| PDF 생성 실패 | 에러 토스트 + 콘솔 로그 |

---

## 12. 의존성

```json
{
  "next": "14.x",
  "react": "18.x",
  "typescript": "5.x",
  "tailwindcss": "3.x",
  "xlsx": "^0.18.x",
  "html2canvas": "^1.4.x",
  "jspdf": "^2.5.x"
}
```

shadcn/ui 컴포넌트: Slider, Toggle, ToggleGroup, Card, Button, Toast(Sonner), Input, Select

---

## 13. CLAUDE.md 준수 사항

- `any` 타입 사용 없음
- 서버 API 없음 (100% 클라이언트 사이드)
- 명패 규격 상수 → `lib/sizeConstants.ts`
- `.env.local` 사용 없음
- 배포: Vercel master 브랜치 자동 배포
