import React, { useState, useMemo } from 'react';
import { PenTool, Shuffle, Wallet, ShieldCheck, Minus, Plus, ChevronLeft, ChevronRight, CalendarDays, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabase';

/* ───────── 상수 ───────── */
const CATEGORIES = [
  '미라클모닝', '운동', '스터디', '임장', '취준', '다이어트',
  '바이브코딩', '독서', '명상', '외국어', '절약', '글쓰기',
];

const TITLE_POOL = {
  '미라클모닝': ['새벽 5시 기상 루틴 21일 완성', '매일 아침 6시 전 일어나기', '미라클모닝 30일 연속', '아침형 인간 되기 프로젝트', '새벽 루틴 7일 완성'],
  '운동':       ['하루 30분 홈트레이닝', '매일 만보 걷기 도전', '주 5회 러닝 루틴', '스쿼트 100개 30일', '코어 운동 매일 20분'],
  '스터디':     ['매일 1시간 집중 공부', '자격증 합격 30일 스터디', '하루 개념 하나씩 정복', '플래너 실천 21일', '오늘의 학습 인증 30일'],
  '임장':       ['주 1회 임장 기록 남기기', '30일 부동산 공부 챌린지', '매일 시세 체크 루틴', '임장 사진 30일 아카이브', '투자처 탐색 21일'],
  '취준':       ['자소서 하루 한 줄 챌린지', '매일 직무 공부 30분', '취준 일기 21일 기록', '면접 질문 하루 3개 답변', '스펙 업 30일 플랜'],
  '다이어트':   ['식단 기록 21일 챌린지', '저탄고지 30일 도전', '하루 1700kcal 지키기', '매일 체중 기록 30일', '간헐적 단식 21일'],
  '바이브코딩': ['하루 1시간 바이브코딩', '사이드 프로젝트 30일 완성', '매일 깃허브 커밋 도전', '토이 프로젝트 21일 완성', '하루 코드 50줄 챌린지'],
  '독서':       ['하루 30분 독서 습관', '한 달 책 두 권 읽기', '매일 독서 노트 작성', '읽고 요약하기 30일', '책 한 권 완독 챌린지'],
  '명상':       ['매일 명상 10분 30일', '호흡 명상 21일 루틴', '마음 챙김 저널 30일', '감사 일기 매일 작성', '무념 명상 7분 챌린지'],
  '외국어':     ['영어 단어 20개 암기', '매일 회화 문장 3개', '일어 히라가나 완성 14일', '영어 뉴스 하루 한 단락', '듣기 30분 30일 챌린지'],
  '절약':       ['커피 끊기 30일 챌린지', '무지출 데이 주 3회', '가계부 매일 작성하기', '충동구매 제로 21일', '한 달 용돈 지키기'],
  '글쓰기':     ['매일 일기 한 페이지', '브런치 글 주 2회 발행', '하루 200자 에세이', '아이디어 노트 매일 작성', '독서 후기 30일 기록'],
};

const EXISTING_TITLES = new Set([
  '새벽 5시 기상 루틴 21일 완성', '매일 1시간 집중 공부',
  '하루 1시간 바이브코딩', '매일 만보 걷기 도전',
]);

const DEPOSIT_OPTIONS  = [5000, 10000, 20000, 50000];
const CERTIFY_TYPES    = [{ id: 'photo', label: '사진 인증' }, { id: 'text', label: '텍스트 인증' }, { id: 'check', label: '체크인' }];
const DAY_TYPE_OPTIONS = [{ id: 'weekday', label: '평일' }, { id: 'weekend', label: '주말' }, { id: 'all', label: '평일 및 주말' }];
const DURATION_PRESETS = [{ label: '7일', days: 7 }, { label: '14일', days: 14 }, { label: '21일', days: 21 }, { label: '30일', days: 30 }];

const STEP_LABELS = ['카테고리', '제목', '기간', '인원', '보증금', '인증 방식'];

/* ───────── 유틸 ───────── */
function toDateString(date) {
  return date.toISOString().split('T')[0];
}
function addDays(dateStr, days) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return toDateString(d);
}
function generateUniqueTitle(category) {
  if (!TITLE_POOL[category]) return '';
  const pool = TITLE_POOL[category].filter((t) => !EXISTING_TITLES.has(t));
  const src  = pool.length ? pool : TITLE_POOL[category];
  return src[Math.floor(Math.random() * src.length)];
}

/* ───────── 컴포넌트 ───────── */
export default function ChallengeCreate() {
  const navigate = useNavigate();

  const today = toDateString(new Date());

  const userInterests = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('interests') || '[]'); }
    catch { return []; }
  }, []);

  /* 폼 상태 */
  const [category,     setCategory]     = useState('');
  const [title,        setTitle]         = useState('');
  const [startDate,    setStartDate]     = useState(today);
  const [endDate,      setEndDate]       = useState(addDays(today, 29));
  const [dayType,      setDayType]       = useState('all');
  const [excludeHoliday, setExcludeHoliday] = useState(false);
  const [memberCount,  setMemberCount]   = useState('2'); // 문자열로 관리 — 빈 칸 허용
  const [deposit,      setDeposit]       = useState(10000);
  const [certifyType,  setCertifyType]   = useState('photo');

  /* 스텝 상태 */
  const [step,      setStep]      = useState(0);
  const [direction, setDirection] = useState('forward'); // 애니메이션 방향

  /* 각 스텝 통과 조건 */
  const canNext = [
    category !== '',                          // 0: 카테고리
    title.trim() !== '',                      // 1: 제목
    !!startDate && !!endDate && endDate >= startDate, // 2: 기간
    parseInt(memberCount) >= 2 && parseInt(memberCount) <= 30, // 3: 인원
    deposit > 0,                              // 4: 보증금 (항상 유효)
    certifyType !== '',                       // 5: 인증방식 (항상 유효)
  ];

  const go = (dir) => {
    if (dir === 1 && !canNext[step]) return;
    setDirection(dir === 1 ? 'forward' : 'backward');
    setStep((s) => s + dir);
  };

  const handleMemberInput = (e) => {
    const raw = e.target.value;
    // 빈 칸은 그대로 허용, 숫자만 허용하되 30 초과는 막음
    if (raw === '') { setMemberCount(''); return; }
    const v = parseInt(raw, 10);
    if (!isNaN(v) && v <= 30) setMemberCount(String(v));
  };

  const handlePreset = (days) => {
    const end = addDays(startDate, days - 1);
    setEndDate(end);
  };

  /* 관심사 카테고리 우선 정렬 */
  const sortedCats = [
    ...CATEGORIES.filter((c) => userInterests.includes(c)),
    ...CATEGORIES.filter((c) => !userInterests.includes(c)),
  ];

  /* ── 스텝 콘텐츠 정의 ── */
  const stepContent = [
    /* 0: 카테고리 */
    <div key="cat">
      <h2 style={s.stepTitle}>어떤 챌린지인가요?</h2>
      <p style={s.stepDesc}>카테고리를 선택해주세요</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '24px' }}>
        {sortedCats.map((cat) => {
          const isMine = userInterests.includes(cat);
          const isSel  = category === cat;
          return (
            <button key={cat} onClick={() => setCategory(cat)} style={{
              padding: '11px 20px', borderRadius: '24px',
              border: `1.5px solid ${isSel ? 'var(--primary)' : isMine ? '#FFD4C8' : 'var(--border-color)'}`,
              background: isSel ? 'var(--primary)' : isMine ? '#FFF0EB' : 'white',
              color: isSel ? 'white' : isMine ? 'var(--primary)' : 'var(--text-muted)',
              fontSize: '14px', fontWeight: isSel || isMine ? 'bold' : 'normal', cursor: 'pointer',
            }}>
              {isMine && !isSel ? '★ ' : ''}{cat}
            </button>
          );
        })}
      </div>
      {userInterests.length > 0 && <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '12px' }}>★ 내 관심사</p>}
    </div>,

    /* 1: 제목 */
    <div key="title">
      <h2 style={s.stepTitle}>챌린지 이름을 정해주세요</h2>
      <p style={s.stepDesc}>직접 입력하거나 랜덤 생성을 사용하세요</p>
      <div style={{ marginTop: '28px' }}>
        <input
          type="text" value={title} onChange={(e) => setTitle(e.target.value)}
          placeholder="어떤 습관을 만들고 싶나요?"
          style={{ width: '100%', padding: '16px', borderRadius: '12px', border: '1.5px solid var(--border-color)', fontSize: '16px', outline: 'none', boxSizing: 'border-box' }}
          autoFocus
        />
        <button onClick={() => setTitle(generateUniqueTitle(category))} style={{
          marginTop: '14px', background: '#FFF0EB', color: 'var(--primary)', border: 'none',
          padding: '12px 20px', borderRadius: '10px', fontSize: '14px', fontWeight: 'bold',
          display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', width: '100%', justifyContent: 'center',
        }}>
          <Shuffle size={16} /> '{category}' 랜덤 제목 생성
        </button>
        {title && <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '12px', textAlign: 'right' }}>{title.length}자</p>}
      </div>
    </div>,

    /* 2: 기간 */
    <div key="period">
      <h2 style={s.stepTitle}>챌린지 기간을 설정해주세요</h2>
      <p style={s.stepDesc}>시작일과 종료일을 직접 선택하거나 프리셋을 사용하세요</p>
      <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* 프리셋 */}
        <div>
          <p style={s.fieldLabel}><CalendarDays size={14} color="var(--primary)" /> 기간 프리셋</p>
          <div style={{ display: 'flex', gap: '8px' }}>
            {DURATION_PRESETS.map((p) => (
              <button key={p.label} onClick={() => handlePreset(p.days)} style={{
                flex: 1, padding: '11px 0', borderRadius: '8px', cursor: 'pointer', fontSize: '14px',
                border: `1px solid ${addDays(startDate, p.days - 1) === endDate ? 'var(--primary)' : 'var(--border-color)'}`,
                background: addDays(startDate, p.days - 1) === endDate ? '#FFF0EB' : 'white',
                color: addDays(startDate, p.days - 1) === endDate ? 'var(--primary)' : 'var(--text-main)',
                fontWeight: addDays(startDate, p.days - 1) === endDate ? 'bold' : 'normal',
              }}>{p.label}</button>
            ))}
          </div>
        </div>

        {/* 시작일/종료일 */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <div style={{ flex: 1 }}>
            <p style={s.fieldLabel}>시작일</p>
            <input type="date" value={startDate} min={today}
              onChange={(e) => { setStartDate(e.target.value); if (e.target.value > endDate) setEndDate(e.target.value); }}
              style={s.dateInput}
            />
          </div>
          <div style={{ flex: 1 }}>
            <p style={s.fieldLabel}>종료일</p>
            <input type="date" value={endDate} min={startDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={s.dateInput}
            />
          </div>
        </div>

        {/* 요일 타입 */}
        <div>
          <p style={s.fieldLabel}>인증 요일</p>
          <div style={{ display: 'flex', gap: '8px' }}>
            {DAY_TYPE_OPTIONS.map((opt) => (
              <button key={opt.id} onClick={() => setDayType(opt.id)} style={{
                flex: 1, padding: '11px 0', borderRadius: '8px', cursor: 'pointer', fontSize: '13px',
                border: `1px solid ${dayType === opt.id ? 'var(--primary)' : 'var(--border-color)'}`,
                background: dayType === opt.id ? '#FFF0EB' : 'white',
                color: dayType === opt.id ? 'var(--primary)' : 'var(--text-main)',
                fontWeight: dayType === opt.id ? 'bold' : 'normal',
              }}>{opt.label}</button>
            ))}
          </div>
        </div>

        {/* 공휴일 설정 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: '#F8F9FA', borderRadius: '12px' }}>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 'bold' }}>공휴일 제외</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>공휴일은 인증 의무에서 제외됩니다</div>
          </div>
          <button onClick={() => setExcludeHoliday((v) => !v)} style={{
            width: '52px', height: '28px', borderRadius: '14px', border: 'none', cursor: 'pointer',
            background: excludeHoliday ? 'var(--primary)' : '#D1D5DB',
            position: 'relative', transition: 'background 0.2s', flexShrink: 0,
          }}>
            <span style={{
              position: 'absolute', top: '3px',
              left: excludeHoliday ? '27px' : '3px',
              width: '22px', height: '22px', borderRadius: '50%', background: 'white',
              transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
            }} />
          </button>
        </div>

        {/* 요약 */}
        {startDate && endDate && (
          <div style={{ padding: '12px 16px', background: '#FFF0EB', borderRadius: '10px', fontSize: '13px', color: 'var(--primary)', fontWeight: 'bold' }}>
            {startDate} ~ {endDate} · {dayType === 'weekday' ? '평일' : dayType === 'weekend' ? '주말' : '매일'} 인증
            {excludeHoliday ? ' · 공휴일 제외' : ''}
          </div>
        )}
      </div>
    </div>,

    /* 3: 인원 */
    <div key="member">
      <h2 style={s.stepTitle}>몇 명이서 할까요?</h2>
      <p style={s.stepDesc}>최소 2명, 최대 30명까지 설정할 수 있어요</p>
      <div style={{ marginTop: '48px', display: 'flex', alignItems: 'center', gap: '16px', justifyContent: 'center' }}>
        <button onClick={() => setMemberCount((v) => String(Math.max(2, (parseInt(v) || 2) - 1)))} style={s.roundBtn}>
          <Minus size={22} color="var(--text-main)" />
        </button>
        <input
          type="number" min={2} max={30}
          value={memberCount}
          onChange={handleMemberInput}
          style={{ width: '120px', textAlign: 'center', padding: '16px', borderRadius: '12px', border: '1.5px solid var(--border-color)', fontSize: '32px', fontWeight: 'bold', color: 'var(--primary)', outline: 'none' }}
        />
        <button onClick={() => setMemberCount((v) => String(Math.min(30, (parseInt(v) || 1) + 1)))} style={{ ...s.roundBtn, background: 'var(--primary)', border: 'none' }}>
          <Plus size={22} color="white" />
        </button>
      </div>
      <p style={{ textAlign: 'center', marginTop: '16px', fontSize: '14px', color: 'var(--text-muted)' }}>명 참여 가능</p>
    </div>,

    /* 4: 보증금 */
    <div key="deposit">
      <h2 style={s.stepTitle}>참가 보증금을 설정해주세요</h2>
      <p style={s.stepDesc}>챌린지 성공 시 전액 환급 · 실패 시 미환급</p>
      <div style={{ marginTop: '28px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {DEPOSIT_OPTIONS.map((amount) => (
          <button key={amount} onClick={() => setDeposit(amount)} style={{
            padding: '18px', borderRadius: '12px', cursor: 'pointer', textAlign: 'left',
            border: `1.5px solid ${deposit === amount ? 'var(--primary)' : 'var(--border-color)'}`,
            background: deposit === amount ? '#FFF0EB' : 'white',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span style={{ fontSize: '18px', fontWeight: 'bold', color: deposit === amount ? 'var(--primary)' : 'var(--text-main)' }}>
              {amount.toLocaleString()}원
            </span>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              전체 풀 {(amount * (parseInt(memberCount) || 0)).toLocaleString()}원
            </span>
          </button>
        ))}
      </div>
    </div>,

    /* 5: 인증 방식 */
    <div key="certify">
      <h2 style={s.stepTitle}>인증 방식을 선택해주세요</h2>
      <p style={s.stepDesc}>참여자들이 이 방식으로만 인증할 수 있어요</p>
      <div style={{ marginTop: '28px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {CERTIFY_TYPES.map((type) => (
          <button key={type.id} onClick={() => setCertifyType(type.id)} style={{
            padding: '20px', borderRadius: '12px', cursor: 'pointer', textAlign: 'left',
            border: `1.5px solid ${certifyType === type.id ? 'var(--primary)' : 'var(--border-color)'}`,
            background: certifyType === type.id ? '#FFF0EB' : 'white',
          }}>
            <div style={{ fontSize: '16px', fontWeight: 'bold', color: certifyType === type.id ? 'var(--primary)' : 'var(--text-main)', marginBottom: '4px' }}>
              {type.label}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              {type.id === 'photo'  && '사진을 업로드하여 인증 · 참여자 투표로 확정'}
              {type.id === 'text'   && '텍스트로 인증 내용 작성 · 참여자 투표로 확정'}
              {type.id === 'check'  && '단순 체크인으로 즉시 인증 완료'}
            </div>
          </button>
        ))}
      </div>
    </div>,
  ];

  return (
    <div style={{ backgroundColor: 'white', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

      {/* 상단 헤더 + 프로그레스 */}
      <header style={{ padding: '16px 20px 0', background: 'white', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <button onClick={() => step === 0 ? navigate(-1) : go(-1)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex' }}>
            <ChevronLeft size={24} color="var(--text-main)" />
          </button>
          <h1 className="font-display" style={{ fontSize: '18px', margin: 0, flex: 1 }}>새 챌린지 개설</h1>
          <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 'bold' }}>{step + 1} / {STEP_LABELS.length}</span>
        </div>

        {/* 프로그레스 바 */}
        <div style={{ height: '3px', background: '#F3F4F6', borderRadius: '2px', overflow: 'hidden' }}>
          <div style={{
            height: '100%', background: 'var(--primary)', borderRadius: '2px',
            width: `${((step + 1) / STEP_LABELS.length) * 100}%`,
            transition: 'width 0.3s ease',
          }} />
        </div>

        {/* 스텝 레이블 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', marginBottom: '4px' }}>
          {STEP_LABELS.map((label, i) => (
            <span key={label} style={{
              fontSize: '10px', fontWeight: i === step ? 'bold' : 'normal',
              color: i < step ? 'var(--primary)' : i === step ? 'var(--text-main)' : 'var(--text-muted)',
              transition: 'color 0.2s',
            }}>
              {i < step ? '✓' : label}
            </span>
          ))}
        </div>
      </header>

      {/* 스텝 콘텐츠 — 슬라이드 애니메이션 */}
      <div style={{ flex: 1, overflow: 'hidden', padding: '28px 20px 120px' }}>
        <div
          key={step}
          style={{
            animation: `${direction === 'forward' ? 'slideFromRight' : 'slideFromLeft'} 0.28s ease both`,
          }}
        >
          {stepContent[step]}
        </div>
      </div>

      {/* 하단 고정 이전/다음 */}
      <div style={{
        position: 'fixed', bottom: 'var(--nav-height)', left: 0, right: 0, maxWidth: '480px', margin: '0 auto',
        padding: '16px 20px', background: 'white', borderTop: '1px solid var(--border-color)',
        display: 'flex', gap: '12px',
      }}>
        {step > 0 && (
          <button onClick={() => go(-1)} style={{
            flex: 1, padding: '16px', borderRadius: '12px', border: '1.5px solid var(--border-color)',
            background: 'white', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', color: 'var(--text-main)',
          }}>
            이전
          </button>
        )}
        <button
          onClick={async () => {
            if (step === STEP_LABELS.length - 1) {
              const durationDays = Math.round(
                (new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)
              ) + 1;

              // Supabase에 저장
              let supabaseId = null;
              const { data: sbData, error } = await supabase
                .from('challenges')
                .insert({
                  title,
                  category,
                  duration:     durationDays,
                  max_members:  parseInt(memberCount) || 2,
                  deposit,
                  certify_type: certifyType,
                  status:       'active',
                })
                .select()
                .single();

              if (!error && sbData) supabaseId = sbData.id;
              else console.error('챌린지 저장 실패:', error);

              // localStorage에도 저장 (내 챌린지 표시용)
              const newChallenge = {
                id:          supabaseId || Date.now(),
                title, category,
                duration:    `${startDate} ~ ${endDate}`,
                startDate, endDate, dayType, excludeHoliday,
                memberCount: parseInt(memberCount) || 2,
                deposit,     certifyType,
                createdAt:   new Date().toISOString(),
                role:        'owner',
              };
              const prev = JSON.parse(localStorage.getItem('my_challenges') || '[]');
              localStorage.setItem('my_challenges', JSON.stringify([newChallenge, ...prev]));
              navigate('/profile');
            } else {
              go(1);
            }
          }}
          disabled={!canNext[step]}
          style={{
            flex: step > 0 ? 2 : 1, padding: '16px', borderRadius: '12px', border: 'none',
            background: canNext[step] ? 'var(--primary)' : '#E5E7EB',
            color: canNext[step] ? 'white' : 'var(--text-muted)',
            fontSize: '16px', fontWeight: 'bold',
            cursor: canNext[step] ? 'pointer' : 'not-allowed',
            transition: 'background 0.2s',
          }}
        >
          {step === STEP_LABELS.length - 1 ? '개설 완료하기' : '다음'}
        </button>
      </div>

      <style>{`
        @keyframes slideFromRight {
          from { transform: translateX(48px); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
        @keyframes slideFromLeft {
          from { transform: translateX(-48px); opacity: 0; }
          to   { transform: translateX(0);     opacity: 1; }
        }
        input[type="date"] { color-scheme: light; }
        input[type="number"]::-webkit-inner-spin-button { -webkit-appearance: none; }
      `}</style>
    </div>
  );
}

/* ───────── 인라인 스타일 상수 ───────── */
const s = {
  stepTitle: { fontSize: '22px', fontWeight: 'bold', margin: 0 },
  stepDesc:  { fontSize: '14px', color: 'var(--text-muted)', marginTop: '8px' },
  fieldLabel: { fontSize: '13px', fontWeight: 'bold', color: 'var(--text-muted)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px' },
  dateInput: { width: '100%', padding: '12px', borderRadius: '10px', border: '1.5px solid var(--border-color)', fontSize: '14px', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' },
  roundBtn:  { width: '52px', height: '52px', borderRadius: '50%', border: '1.5px solid var(--border-color)', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 },
};
