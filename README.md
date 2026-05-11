# 가치(GACHI) - 같이 도전하는 챌린지

보증금 기반 챌린지 참여 서비스. 목표를 함께 달성하고, 성공하면 보증금을 돌려받는다.

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
│   │   ├── ChallengeDetail.jsx     # 챌린지 상세 + 보증금 납부 참여
│   │   └── ChallengeCreate.jsx     # 챌린지 개설
│   ├── manage/
│   │   └── ChallengeManage.jsx     # 챌린지 관리 (챌린지 개설자 전용)
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
│   └── getProfileId.js             # device_id → profiles.id 변환
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

### 온보딩
- 관심 카테고리 최대 5개 선택 (불꽃 인디케이터)
- Supabase `profiles` 테이블에 관심사 저장

### 홈
- Supabase 챌린지 목록 연동
- 카테고리 필터 드롭다운 + 제목/카테고리 검색
- 관심 카테고리 우선 정렬
- 내 챌린지 아코디언 (운영 중 / 참여 중)
- 오늘의 인증 현황 배너
- 중도 포기 2단계 확인 플로우
- Supabase Realtime 실시간 알림 배지

### 챌린지 상세
- 참여 인원 실시간 표시 (모집 중 / 마감 임박 / 멤버 마감)
- 보증금 납부 바텀시트 (토스페이 UI)
- 동시 참여 방지 (납부 전 서버 인원 재확인)
- 강퇴 실시간 감지 (Supabase Realtime)

### 챌린지 관리 (운영자)
- 참여자 목록 + 오늘 인증 여부 표시
- 참여자 강퇴 및 알림 전송
- 모집 기간 연장 (최대 3일, 1회 제한)
- 완주 전 챌린지 중지 요청
  - 참여자 75% 이상 동의 시 확정
  - 24시간 카운트다운 타이머
  - 확정 시 보증금 전액 반환 알림 발송

### 알림
- 강퇴 / 중지 요청 / 챌린지 종료 알림
- Supabase Realtime 실시간 수신

---

## Supabase 테이블

| 테이블 | 용도 |
|--------|------|
| `profiles` | 유저 프로필 (device_id, avatar, nickname, interests) |
| `challenges` | 챌린지 정보 |
| `challenge_members` | 챌린지 참여자 (role, status, joined_at) |
| `certifications` | 인증 기록 (user_id, challenge_id, cert_date) |
| `early_close_votes` | 완주 전 중지 투표 |
| `notifications` | 알림 (user_id, type, message, read) |
| `user_logs` | 행동 로그 |

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
