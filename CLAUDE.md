# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 개발 명령어

```bash
npm run dev      # 개발 서버 실행 (localhost:5173)
npm run build    # 프로덕션 빌드
npm run lint     # ESLint 실행
npm run preview  # 빌드 결과물 미리보기
```

환경변수 (`.env` 필요):
```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

---

## 아키텍처

### 인증 방식
로그인이 없다. `localStorage`에 UUID를 저장해 `device_id`로 사용하고, `profiles` 테이블의 `id`로 변환해 Supabase 쿼리에 사용한다.

```
deviceId.js → getProfileId.js → supabase 쿼리
```

### 데이터 흐름
- **localStorage 우선**: `my_challenges`, `interests`, `certified_by_challenge` 등은 localStorage에 먼저 저장하고, Supabase와 비동기 동기화한다. 다른 기기에서 참여한 챌린지는 Supabase 동기화로 반영된다.
- **Realtime**: 알림 배지(`notifications`), 강퇴 감지(`challenge_members`) 등은 Supabase Realtime channel로 실시간 반영한다. 컴포넌트 unmount 시 반드시 `supabase.removeChannel(channel)`로 정리한다.

### 레이아웃
`AppLayout`이 모든 라우트를 감싸며 최대 너비 480px 모바일 래퍼를 제공한다. `/onboarding`, `/login` 경로에서는 `BottomNav`를 숨긴다.

### Supabase 주요 테이블

| 테이블 | 핵심 컬럼 |
|--------|-----------|
| `profiles` | `device_id`, `avatar`, `nickname`, `interests` |
| `challenges` | `status` (active/early_closed), `early_close_active`, `max_members`, `certify_type` |
| `challenge_members` | `role` (owner/member), `status` (active/kicked/gave_up/observer) |
| `certifications` | `cert_date` (YYYY-MM-DD) |
| `early_close_votes` | `agreed` (boolean) |
| `notifications` | `type`, `read` |

---

## 스타일 규칙

- **인라인 style만 사용한다.** CSS 클래스(Tailwind 등) 추가 금지.
- 예외: `className="font-display"` (Moneygraphy 폰트), `className="mobile-wrapper"`, `"main-content"`, `"nav-item"`, `"fab-create"` — `index.css`에 정의된 클래스만 사용 가능.
- 디자인 토큰은 CSS 변수로 참조한다: `var(--primary)` (#FF5C35), `var(--secondary)` (#1A1A2E), `var(--text-muted)`, `var(--border-color)`, `var(--nav-height)` 등.

---

## 챌린지 상태 흐름

```
active → (early_close_active: true) → early_closed
```

- 운영자가 중지 요청 → `challenges.early_close_active = true` + 참여자에게 알림
- 75% 이상 동의(24시간 내) → `challenges.status = 'early_closed'`
- 참여자 강퇴: `challenge_members.status = 'kicked'`
- 중도 포기: `challenge_members.status = 'gave_up'`
- 인원 카운트: `status NOT IN ('observer', 'kicked')`인 멤버만 집계
