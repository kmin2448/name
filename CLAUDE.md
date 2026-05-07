---

## 📛 [신규 확장] 명패 제작 모듈 지침

1. **목적:** 행사 및 세미나용 명패(양면형)를 엑셀 명단 기반으로 일괄 생성한다.
2. **UI 흐름:** 
   - 규격 선택(상수 기반) -> 배경 업로드(자동 리사이즈) -> 텍스트 위치/서식 드래그 설정 -> 엑셀 업로드 -> PDF 다운로드.
3. **핵심 요구사항:**
   - 접어서 사용하는 명패 특성에 따라 **상단 영역은 180도 회전된 상태**로 출력되어야 함.
   - 모든 처리는 브라우저 메모리(Client-side)에서 수행하여 서버 부하를 최소화함.
   - `jsPDF`를 활용하여 엑셀의 데이터 행 개수만큼 PDF 페이지를 자동 생성함.
4. **디자인 유지:** 기존 시스템의 `primary` 컬러(#1F5C99)와 `shadcn/ui` 스타일을 계승함.


## 🌿 Git 브랜치 정책



- **모든 작업은 `master` 브랜치에서 직접 진행한다.**

- 별도 feature/fix 브랜치를 생성하지 않는다.

- 커밋 후 `git push origin master`로 즉시 push한다.

- Vercel은 `master` 브랜치를 감지해 자동 배포하므로, master에 push해야만 사이트에 반영된다.

- `package.json`의 `"push"` 스크립트(`git add . && git commit -m 'update' && git push`)를 활용한다.



---



## 🚫 금지 사항



- `any` 타입 사용 금지

- 클라이언트에서 Google API 직접 호출 금지 → `/api/` Route Handler 경유

- Named Range 문자열 하드코딩 금지 → `constants/sheets.ts` 상수 사용

- 권한 체크 없는 데이터 수정 API 노출 금지

- `.env.local` 커밋 금지



---



## 📦 scripts



```json

"dev": "next dev",  "build": "next build",

"push": "git add . && git commit -m 'update' && git push",

"test": "jest --passWithNoTests",  "lint": "next lint",  "type-check": "tsc --noEmit"

```



---



## ✅ 테스트 원칙



- 무의미한 어설션(`expect(true).toBe(true)`) 절대 금지

- 하드코딩으로 테스트 통과 절대 금지

- 라이브러리 사용법 불확실 시 **context7 먼저 참조**

