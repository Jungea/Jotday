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
- `(main)/` — 달력 홈 (보호된 라우트, `?month=YYYY-MM` 쿼리 파라미터로 월 이동)
- `(main)/[date]` — 날짜별 카드 목록
- `(main)/feed` — 피드 (필터·정렬, 카드 클릭 시 날짜 모달)
- `(main)/search` — 태그·전문 검색 (`?q=키워드&tags=태그1,태그2`)
- `(main)/settings` — 테마·카드 액션·피드 필터 설정
- `(main)/links` — 공유 링크 관리 및 만료 기간 설정
- `api/cards` — 카드 CRUD + 이미지 업로드 + 검색
- `api/share` — 공유 토큰 생성·조회·삭제
- `api/settings` — 사용자 설정 조회(GET) · 저장(PATCH), upsert on user_id
- `share/[token]` — 공개 공유 페이지 (인증 불필요, `generateMetadata`로 OG 태그 동적 생성)

### Data Flow

1. **인증**: Supabase SSR — `src/lib/supabase/`의 `createBrowserClient` / `createServerClient`, 미들웨어에서 세션 갱신 및 라우트 보호
2. **달력**: `GET /api/cards?month=YYYY-MM` → 날짜별 대표 이미지·카드 수 집계(`DayMeta`)
3. **날짜 상세**: `GET /api/cards?date=YYYY-MM-DD` → 해당 날의 카드 목록
4. **카드 생성**: `CardForm` → `POST /api/cards` (FormData) → Cloudinary 업로드 → Supabase 저장. 본문의 `#태그`는 자동 추출되어 `tags[]`로 저장
5. **대표 카드**: `PATCH /api/cards` with `set_representative=true` → 해당 날짜의 기존 대표 해제 후 지정
6. **검색**: `GET /api/cards?q=키워드&tags=태그1,태그2&page=N` → pg_trgm(content) + GIN(tags) 인덱스
7. **공유**: `POST /api/share` → `share_tokens` 테이블에 토큰 생성. `GET /api/share?token=...` → 공개 카드 조회
8. **설정 동기화**: `SettingsSync` 컴포넌트가 `(main)/layout.tsx`에 마운트. 앱 진입 시 `GET /api/settings`로 서버 값을 스토어에 덮어쓰고, 이후 변경 시 500ms 디바운스 후 `PATCH /api/settings`로 저장

### Key Types (`src/types/index.ts`)

```typescript
Card { id, user_id, date, type: 'image'|'text'|'mixed', title, content,
       image_url, image_public_id,       // 레거시 단일 이미지
       images: {url, public_id}[],       // 다중 이미지 (JSONB)
       tags: string[],                   // #태그 자동 추출
       is_representative, created_at, updated_at }

DayMeta { date, count, preview_image }
UserSettings { user_id, theme: 'light'|'dark',
               card_actions: JSONB, feed_presets: JSONB, share_settings: JSONB }
```

### State Management

Zustand + `persist` (localStorage 캐시) + Supabase 서버 동기화:
- `src/store/theme.ts` — 테마(light/dark), CSS 클래스 `theme-light` / `theme-dark`
- `src/store/cardActions.ts` — 카드 액션 버튼 순서·핀 설정
- `src/store/feedPresets.ts` — 피드 기간 필터 프리셋 순서·숨김
- `src/store/shareSettings.ts` — 공유 링크 만료 기간

localStorage는 첫 페인트용 캐시. 실제 값은 `user_settings` 테이블의 JSONB 컬럼(`card_actions`, `feed_presets`, `share_settings`)에 저장되며 `SettingsSync`가 마운트 시 로드해 덮어씀.

### Image Handling

- 업로드: 서버에서 `cloudinary` SDK → `jotday/{userId}/` 폴더
- 삭제: 카드 삭제 시 Cloudinary `public_id`로 함께 삭제
- 클라이언트 표시: `next-cloudinary`
- 다운로드: Canvas로 카드 렌더링 후 PNG 저장. 다중 이미지는 순차 다운로드. 파일명: `jotday-날짜-HHmmss[-N].png`

### Database

`supabase/schema.sql` 참고. RLS 활성화 — 사용자는 자신의 카드와 설정만 접근 가능.

주요 인덱스:
- `(user_id, date)` 복합 인덱스
- `tags` GIN 인덱스 (배열 검색)
- `content` gin_trgm_ops 인덱스 (빠른 ILIKE)

DB 구조 변경 시 `supabase/schema.sql`에 반영한다. 사용자에게 안내할 때는 실행용 수정 쿼리(ALTER/UPDATE)로 알려주되, SQL 파일에는 최초 생성 기준 INSERT 형태로 추가한다.
