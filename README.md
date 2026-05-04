# CHALLY (CHALLENGO)

챌린지 기반 습관 형성 모바일 웹앱. 그룹을 만들어 함께 챌린지를 수행하고, 매일 인증하며 스트릭을 쌓는다.

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
├── App.jsx                         # 전역 라우터 정의
├── main.jsx                        # 앱 엔트리포인트
│
├── components/                     # 재사용 가능한 공통 UI 컴포넌트
│   ├── layout/
│   │   ├── AppLayout.jsx           # 모바일 래퍼 + BottomNav 조건부 렌더링
│   │   └── BottomNav.jsx           # 하단 탭 내비게이션 (홈/탐색/개설/마이)
│   └── common/                     # (예정) 버튼, 카드 등 공용 UI
│
├── pages/                          # 라우트와 1:1 매핑되는 화면 (도메인별 분리)
│   ├── onboarding/
│   │   └── Onboarding.jsx          # 관심 카테고리 선택 + 가상 소셜 로그인 (S-01/02)
│   ├── home/
│   │   └── Home.jsx                # 메인 피드 - 인증 현황, AI 추천, 참여 챌린지 (S-03)
│   ├── explore/
│   │   └── Explore.jsx             # 챌린지 탐색 - 카테고리 필터, AI 추천 TOP (S-04)
│   ├── challenge/
│   │   ├── ChallengeDetail.jsx     # 챌린지 상세 - 스펙 확인 및 참여 신청 (S-05)
│   │   └── ChallengeCreate.jsx     # 새 챌린지 개설 폼 - 제목/기간/인원 설정 (S-06)
│   ├── feed/
│   │   └── GroupFeed.jsx           # 그룹 인증 타임라인 + 달성률 (S-08)
│   ├── certify/
│   │   └── Certify.jsx             # 오늘의 인증 - 사진/텍스트/체크인 탭 (S-07)
│   ├── profile/
│   │   ├── Profile.jsx             # 마이페이지 - 챌리 단계, 스트릭 잔디, 배지 (S-09)
│   │   └── ProfileEdit.jsx         # 프로필 수정 - 아바타/닉네임/한줄소개 (S-09-1)
│   └── notifications/
│       └── Notifications.jsx       # 알림 내역 - AI 알림/리마인더/이벤트 (S-10)
│
├── services/                       # 외부 시스템 연동
│   ├── supabase.js                 # Supabase 클라이언트 초기화
│   └── logger.js                   # 사용자 행동 이벤트 로그 기록 (user_logs 테이블)
│
├── utils/                          # 순수 유틸리티 함수
│   └── deviceId.js                 # localStorage 기반 익명 디바이스 ID 생성/조회
│
└── styles/
    └── index.css                   # 전역 CSS - 디자인 토큰, 공통 레이아웃, 유틸 클래스
```

---

## 라우팅 구조

| 경로 | 컴포넌트 | 설명 |
|------|----------|------|
| `/` | → `/onboarding` | 최초 진입 리다이렉트 |
| `/onboarding` | Onboarding | 관심사 선택 온보딩 |
| `/home` | Home | 메인 홈 피드 |
| `/explore` | Explore | 챌린지 탐색 |
| `/challenge/:id` | ChallengeDetail | 챌린지 상세 |
| `/create` | ChallengeCreate | 챌린지 개설 |
| `/feed/:id` | GroupFeed | 그룹 인증 피드 |
| `/certify/:id` | Certify | 오늘의 인증 |
| `/profile` | Profile | 마이페이지 |
| `/profile/edit` | ProfileEdit | 프로필 수정 |
| `/notifications` | Notifications | 알림 |

---

## 디자인 토큰 (`styles/index.css`)

| 변수 | 값 | 용도 |
|------|----|------|
| `--primary` | `#FF5C35` | 브랜드 메인 컬러 (버튼, 강조) |
| `--secondary` | `#1A1A2E` | 다크 배경, 온보딩 배경 |
| `--success` | `#00C9A7` | 인증 완료 상태 |
| `--warning` | `#FFD700` | 챌리 단계, 경고 |
| `--bg-color` | `#F8F9FA` | 페이지 기본 배경 |
| `--card-bg` | `#FFFFFF` | 카드 배경 |
| `--text-main` | `#1A1A2E` | 본문 텍스트 |
| `--text-muted` | `#6B7280` | 보조 텍스트 |
| `--border-color` | `#E5E7EB` | 카드/인풋 테두리 |
| `--nav-height` | `60px` | 하단 내비게이션 높이 |

---

## Supabase 연동 테이블

| 테이블 | 용도 |
|--------|------|
| `profiles` | 유저 프로필 (device_id, avatar, nickname, bio) |
| `user_logs` | 행동 로그 (device_id, event_type, page, metadata) |

> 현재 인증은 `device_id` (localStorage UUID) 기반. 추후 Supabase Auth로 전환 예정.

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
