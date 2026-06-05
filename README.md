# Jotday

이미지와 텍스트 카드로 날짜별 기록을 남기는 개인 일기 서비스.

## 기술 스택

- **Frontend**: Next.js 16 (App Router), TypeScript, Tailwind CSS v4
- **Auth & DB**: Supabase (Row Level Security 적용)
- **이미지 저장**: Cloudinary
- **상태 관리**: Zustand + persist

## 주요 기능

- 월간 달력 뷰 — 기록이 있는 날짜에 썸네일 표시, 월 이동 및 오늘 버튼
- 피드 뷰 — 기간·정렬 필터, 무한 스크롤
- 카드 타입: 이미지 / 텍스트 / 혼합, 다중 이미지 스와이프·라이트박스
- 태그 검색 + 전문 검색 — 본문 `#태그` 자동 추출, pg_trgm 인덱스
- 공유 링크 — 카드 또는 날짜별 공유, 만료 기간 설정, SNS OG 미리보기
- 카드 다운로드 — Canvas 렌더링 PNG 저장
- 테마: 라이트 / 다크
- 설정 서버 동기화 — 테마·카드 액션·피드 필터·공유 설정을 Supabase에 저장, 멀티 디바이스 동기화

## 프로젝트 구조

```
src/
├── app/
│   ├── (auth)/login               # 인증 페이지
│   ├── (main)/                    # 인증 필요 영역
│   │   ├── page.tsx               # 홈 (달력)
│   │   ├── [date]/page.tsx        # 날짜별 카드 목록
│   │   ├── feed/page.tsx          # 피드
│   │   ├── search/page.tsx        # 태그·전문 검색
│   │   ├── settings/page.tsx      # 설정
│   │   └── links/page.tsx         # 공유 링크 관리
│   ├── api/cards/route.ts         # 카드 CRUD + 검색
│   ├── api/share/route.ts         # 공유 토큰 관리
│   ├── api/settings/route.ts      # 설정 조회·저장
│   └── share/[token]/page.tsx     # 공개 공유 페이지 (OG 메타태그 포함)
├── components/
│   ├── calendar/CalendarGrid.tsx
│   ├── cards/CardItem.tsx, CardForm.tsx, ShareLinkModal.tsx
│   └── ui/
├── lib/supabase/                  # client, server, middleware
├── lib/cloudinary/
├── store/                         # theme, cardActions, feedPresets, shareSettings
└── types/index.ts
```

## 시작하기

### 1. 환경변수 설정

```bash
cp .env.local.example .env.local
```

`.env.local`에 아래 값을 채워넣으세요:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=
```

### 2. Supabase 스키마 적용

Supabase 대시보드 SQL Editor에서 `supabase/schema.sql`을 실행하세요.

### 3. 개발 서버 실행

```bash
npm install
npm run dev
```

[http://localhost:3000](http://localhost:3000)에서 확인.
