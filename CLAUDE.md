# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

## Commands

```bash
npm run dev      # 개발 서버 (localhost:3000)
npm run build    # 프로덕션 빌드
npm run lint     # ESLint
```

테스트 설정 없음.

## Environment Variables

`.env.local.example` 참고. 필수 값:

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase 프로젝트
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` — 서버 전용
- `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` — 클라이언트용

## Architecture

**Jotday**는 날짜별 이미지·텍스트 카드를 기록하는 개인 일기 서비스다.

### Route Groups

- `(auth)/login` — 로그인 (회원가입은 비활성화, `/login`으로 리다이렉트)
- `(main)/` — 달력 홈 (보호된 라우트)
- `(main)/[date]` — 날짜별 카드 목록
- `(main)/settings` — 테마 설정
- `api/cards` — 카드 CRUD + 이미지 업로드

### Data Flow

1. **인증**: Supabase SSR — `src/lib/supabase/`의 `createBrowserClient` / `createServerClient`, 미들웨어에서 세션 갱신 및 라우트 보호
2. **달력**: `GET /api/cards?month=YYYY-MM` → 날짜별 대표 이미지·카드 수 집계(`DayMeta`)
3. **날짜 상세**: `GET /api/cards?date=YYYY-MM-DD` → 해당 날의 카드 목록
4. **카드 생성**: `CardForm` → `POST /api/cards` (FormData) → Cloudinary 업로드 → Supabase 저장
5. **대표 카드**: `PATCH /api/cards` with `set_representative=true` → 해당 날짜의 기존 대표 해제 후 지정

### Key Types (`src/types/index.ts`)

```typescript
Card { id, user_id, date, type: 'image'|'text'|'mixed', title, content,
       image_url, image_public_id,       // 레거시 단일 이미지
       images: {url, public_id}[],       // 다중 이미지 (JSONB)
       is_representative, created_at, updated_at }

DayMeta { date, count, preview_image }
UserSettings { user_id, theme: 'light'|'dark' }
```

### State Management

Zustand(`src/store/theme.ts`) + `persist` 미들웨어로 테마(light/dark)를 localStorage에 저장. CSS 클래스 `theme-light` / `theme-dark`로 적용.

### Image Handling

- 업로드: 서버에서 `cloudinary` SDK → `jotday/{userId}/` 폴더
- 삭제: 카드 삭제 시 Cloudinary `public_id`로 함께 삭제
- 클라이언트 표시: `next-cloudinary`

### Database

`supabase/schema.sql` 참고. RLS 활성화 — 사용자는 자신의 카드와 설정만 접근 가능. `(user_id, date)` 복합 인덱스.

DB 구조 변경 시 `supabase/schema.sql`에 반영한다. 사용자에게 안내할 때는 실행용 수정 쿼리(ALTER/UPDATE)로 알려주되, SQL 파일에는 최초 생성 기준 INSERT 형태로 추가한다.
