# Jotday

이미지와 텍스트 카드로 날짜별 기록을 남기는 개인 일기 서비스.

## 기술 스택

- **Frontend**: Next.js 16 (App Router), TypeScript, Tailwind CSS v4
- **Auth & DB**: Supabase (Row Level Security 적용)
- **이미지 저장**: Cloudinary (25GB 무료)
- **상태 관리**: Zustand (테마 persist)

## 주요 기능

- 월간 달력 뷰 — 기록이 있는 날짜에 썸네일 표시
- 카드 타입: 이미지 / 텍스트 / 이미지+텍스트 혼합
- 테마 전환: **Cork** (코르크보드 아날로그) / **Card** (그리드 모던)
- Supabase SSR 기반 인증 (로그인 / 회원가입)

## 프로젝트 구조

```
src/
├── app/
│   ├── (auth)/login, register     # 인증 페이지
│   ├── (main)/                    # 인증 필요 영역
│   │   ├── page.tsx               # 홈 (달력)
│   │   ├── [date]/page.tsx        # 날짜별 카드 목록
│   │   └── settings/page.tsx      # 테마 설정
│   └── api/cards/route.ts         # REST API (GET/POST/DELETE)
├── components/
│   ├── calendar/CalendarGrid.tsx
│   ├── cards/CardItem.tsx
│   ├── cards/CardForm.tsx
│   └── ui/Button, ThemeWrapper
├── lib/supabase/                  # client, server, middleware
├── lib/cloudinary/
├── store/theme.ts
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
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

### 2. Supabase 스키마 적용

Supabase 대시보드 SQL Editor에서 `supabase/schema.sql`을 실행하세요.

### 3. 개발 서버 실행

```bash
npm install
npm run dev
```

[http://localhost:3000](http://localhost:3000)에서 확인.
