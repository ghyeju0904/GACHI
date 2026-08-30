# 가치(GACHI) - 같이 도전하는 챌린지

포인트 기반 챌린지 참여 서비스. 웰컴 포인트로 시작해 모임 참여·완료 보상까지 전부 포인트로 순환한다.

## 업데이트 로그

### 2026-08-30 — 보증금 기반 → 포인트 기반(기획서) 전면 전환
서비스기획서(`가치_서비스기획서.pdf`)에 맞춰 기존 보증금/토스페이 결제 구조를 전부 제거하고 포인트 경제로 재설계했다.

- **포인트 시스템 신규 구축**: 웰컴 포인트, 온보딩 미션 보상, 참여비(2P), 경고 횟수 기반 완료 보상, 마이페이지 포인트 내역 (`src/utils/points.js`, `src/utils/onboardingRewards.js`)
- **신고·경고·퇴출 시스템**: 인증 신고(1일 1회), 경고 3회 자동 퇴출, 허위 신고 처리 (`ChallengeManage.jsx`)
- **부모임장 / 모임장 승계**: 지정·해제, 퇴출 시 자동→수동→투표 순 승계, 퇴출 누적 패널티
- **인증 개선**: 복수 인증 방식 지원, 1일 1회 수정 허용 (`Certify.jsx`)
- **마이페이지 개편**: 포인트 잔액·카테고리별 내역·완료 챌린지 기록, 서비스 탈퇴 기능 (`Profile.jsx`, `ProfileEdit.jsx`)
- **자동 알림 Edge Function 2종 신규**: 인증 마감 2시간 전 리마인드(`check-uncertified-reminder`), 모임장 일일 리포트(`send-daily-report`)
- **DB 마이그레이션**: `supabase/migrations/0001_points_system.sql` — 포인트/신고/경고/승계 테이블 및 RPC 함수(`adjust_points`, `apply_warning`, `withdraw_account`) 추가, `deposit` 등 보증금 관련 컬럼 삭제
- **삭제**: 미사용 `Stats.jsx` 페이지 및 `recharts` 의존성, 보증금/토스페이/열정왕 투표 관련 코드 전체

## 기술 스택

| 항목 | 버전 |
|------|------|
| React | 18 |
| React Router | v6 |
| Vite | 5 |
| Supabase | ^2 |
| Lucide React | ^0.300 |

---

## 폴더 구조

```
src/
├── App.jsx
├── main.jsx
│
├── components/
│   └── layout/
│       ├── AppLayout.jsx           # 모바일 래퍼 + BottomNav 조건부 렌더링
│       └── BottomNav.jsx           # 하단 탭 내비게이션 (홈 / 개설 / 마이)
│
├── pages/
│   ├── onboarding/
│   │   └── Onboarding.jsx          # 관심 카테고리 선택 (최대 5개)
│   ├── home/
│   │   └── Home.jsx                # 챌린지 목록, 내 챌린지, 인증 현황, 중도 포기
│   ├── explore/
│   │   └── Explore.jsx             # 챌린지 탐색
│   ├── challenge/
│   │   ├── ChallengeDetail.jsx     # 챌린지 상세 + 포인트 참여
│   │   └── ChallengeCreate.jsx     # 챌린지 개설
│   ├── manage/
│   │   └── ChallengeManage.jsx     # 챌린지 관리 (모임장 / 부모임장)
│   ├── feed/
│   │   └── GroupFeed.jsx           # 그룹 인증 피드
│   ├── certify/
│   │   └── Certify.jsx             # 오늘의 인증 제출
│   ├── result/
│   │   └── ChallengeResult.jsx     # 챌린지 결과
│   ├── profile/
│   │   ├── Profile.jsx             # 마이페이지
│   │   └── ProfileEdit.jsx         # 프로필 수정
│   └── notifications/
│       └── Notifications.jsx       # 알림
│
├── services/
│   ├── supabase.js                 # Supabase 클라이언트 초기화
│   └── logger.js                   # 행동 이벤트 로그 (user_logs 테이블)
│
├── utils/
│   ├── deviceId.js                 # 익명 디바이스 ID 생성/조회
│   ├── getProfileId.js             # device_id → profiles.id 변환 (+ 웰컴 포인트 지급)
│   ├── points.js                   # 포인트 증감/조회 (adjust_points RPC 래퍼)
│   └── onboardingRewards.js        # 온보딩 미션 1회성 포인트 지급
│
├── assets/
│   ├── fonts/                      # Moneygraphy (Rounded / Pixel)
│   └── fonts/images/               # 서비스 일러스트 (가치.png 등)
│
└── styles/
    └── index.css                   # 디자인 토큰, 전역 스타일
```

---

## 라우팅 구조

| 경로 | 컴포넌트 | 설명 |
|------|----------|------|
| `/` | → `/onboarding` | 최초 진입 리다이렉트 |
| `/onboarding` | Onboarding | 관심사 선택 온보딩 |
| `/home` | Home | 메인 홈 |
| `/explore` | Explore | 챌린지 탐색 |
| `/challenge/:id` | ChallengeDetail | 챌린지 상세 + 참여 |
| `/create` | ChallengeCreate | 챌린지 개설 |
| `/manage/:id` | ChallengeManage | 챌린지 관리 (운영자) |
| `/feed/:id` | GroupFeed | 그룹 인증 피드 |
| `/certify/:id` | Certify | 인증 제출 |
| `/result/:id` | ChallengeResult | 챌린지 결과 |
| `/profile` | Profile | 마이페이지 |
| `/profile/edit` | ProfileEdit | 프로필 수정 |
| `/notifications` | Notifications | 알림 |

---

## 구현된 기능

### 포인트 시스템
- 신규 가입 시 웰컴 포인트 10점 즉시 지급
- 온보딩 필수/옵션 미션 완료 시 포인트 지급 (관심사 설정, 소개글 확인, 즐겨찾기, 참여, 개설)
- 모임 참여 시 2P 소모, 중도 자진 탈퇴 시 환급 없음
- 챌린지 완료 시 경고 횟수에 따라 포인트 보상 (0회 5P · 1회 3P · 2회 2P · 3회 퇴출 0P)
- 마이페이지에서 카테고리별 포인트 내역 및 완료한 챌린지 기록 확인

### 온보딩
- 관심 카테고리 최대 5개 선택 (불꽃 인디케이터)
- 운영 중인 모임 소개글 확인 + 즐겨찾기 미션
- Supabase `profiles` 테이블에 관심사 저장

### 홈 / 탐색
- Supabase 챌린지 목록 연동
- 카테고리 필터 드롭다운 + 제목/카테고리 검색
- 관심 카테고리 우선 정렬, 즐겨찾기 토글
- 내 챌린지 아코디언 (운영 중 / 참여 중)
- 오늘의 인증 현황 배너
- 중도 포기 2단계 확인 플로우
- Supabase Realtime 실시간 알림 배지

### 챌린지 상세
- 공개/비공개 모임, 복수 인증 방식 표시
- 참여 인원 실시간 표시 (모집 중 / 마감 임박 / 멤버 마감)
- 포인트 참여 확인 모달 (2P 차감)
- 동시 참여 방지 (참여 전 서버 인원 재확인)
- 강퇴 실시간 감지 (Supabase Realtime)

### 챌린지 관리 (운영자 / 부모임장)
- 참여자 목록 + 오늘 인증 여부 + 경고 횟수 표시
- 부모임장 지정/해제
- 신고 관리 (경고 부여 / 기각 / 허위 신고 처리)
- 모임장 본인 인증 신고 시 참여자 투표
- 모임장 공석 시 승계 제안 · 자원 · 존속 투표
- 참여자 강퇴 및 알림 전송
- 모집 기간 연장 (최대 3일, 1회 제한)
- 완주 전 챌린지 중지 요청
  - 참여자 75% 이상 동의 시 확정
  - 24시간 카운트다운 타이머

### 인증 / 신고 / 경고
- 사진·텍스트·체크인 중 개설자가 지정한 방식(복수 가능)으로 인증
- 하루 1회 인증, 1회 한정 수정 가능
- 인증 마감 2시간 전 미인증 알림 (Edge Function 자동 발송)
- 부적합 인증 신고 (모임당 1일 1회), 경고 3회 누적 시 자동 퇴출
- 모임장 대상 일일 리포트 자동 발송 (Edge Function)

### 마이페이지 / 탈퇴
- 포인트 잔액, 카테고리별 내역, 완료한 챌린지 기록
- 서비스 탈퇴 시 개설한 모임 및 보유 포인트 즉시 소멸

### 알림
- 강퇴 / 경고 / 신고 처리 / 중지 요청 / 챌린지 종료 / 승계 제안 / 일일 리포트 알림
- Supabase Realtime 실시간 수신

---

## Supabase 테이블

| 테이블 | 용도 |
|--------|------|
| `profiles` | 유저 프로필 (device_id, avatar, nickname, interests, points, onboarding_rewards) |
| `challenges` | 챌린지 정보 (is_public, certify_types, sub_owner_id, day_type 등) |
| `challenge_members` | 챌린지 참여자 (role, status, warning_count, reward_claimed) |
| `certifications` | 인증 기록 (user_id, challenge_id, cert_date, edit_count) |
| `early_close_votes` | 완주 전 중지 투표 |
| `favorites` | 즐겨찾기 |
| `point_transactions` | 포인트 내역 원장 |
| `reports` | 인증 신고 |
| `warning_log` | 경고 이력 |
| `succession_requests` | 모임장 승계 제안 |
| `owner_report_votes` | 모임장 인증 신고 투표 |
| `continuation_votes` | 모임 존속 여부 투표 |
| `notifications` | 알림 (user_id, type, message, read) |
| `user_logs` | 행동 로그 |

RPC 함수: `adjust_points`, `apply_warning`, `withdraw_account` (`supabase/migrations/0001_points_system.sql` 참고)

> 인증은 `device_id` (localStorage UUID) 기반. 추후 Supabase Auth 전환 예정.

---

## 디자인 토큰

| 변수 | 값 | 용도 |
|------|----|------|
| `--primary` | `#FF5C35` | 브랜드 메인 컬러 |
| `--secondary` | `#1A1A2E` | 다크 배경, 온보딩 |
| `--bg-color` | `#F8F9FA` | 페이지 기본 배경 |
| `--card-bg` | `#FFFFFF` | 카드 배경 |
| `--text-main` | `#1A1A2E` | 본문 텍스트 |
| `--text-muted` | `#6B7280` | 보조 텍스트 |
| `--border-color` | `#E5E7EB` | 테두리 |
| `--nav-height` | `60px` | 하단 내비게이션 높이 |

---

## 로컬 실행

```bash
npm install
npm run dev
```

환경변수 설정 (`.env`):
```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```
