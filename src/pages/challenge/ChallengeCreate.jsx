import React, { useState, useMemo } from 'react';
import { Camera, Edit3, CheckSquare, ChevronLeft, CalendarDays, Shuffle, Lock, Globe } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import { getProfileId } from '../../utils/getProfileId';
import { spendJoinFee } from '../../utils/points';
import { grantOnboardingReward } from '../../utils/onboardingRewards';

/* ───────── 상수 ───────── */
const CATEGORIES = [
  '미라클모닝', '스터디', '식단', '운동',
  '독서', '외국어', 'SNS 업로드', '기타'
];

const TITLE_SUGGESTIONS = {
  '미라클모닝': ['새벽 5시 기상 루틴', '매일 아침 6시 전 기상', '미라클모닝 21일', '아침형 인간 되기', '새벽 루틴 30일'],
  '스터디':     ['매일 1시간 집중 공부', '자격증 스터디', '하루 한 개념 정복', '오늘의 학습 인증', '플래너 실천'],
  '식단':       ['매일 식단 기록', '저탄고지 식단 챌린지', '매일 체중 기록', '간헐적 단식', '건강 식단 21일'],
  '운동':       ['하루 30분 홈트레이닝', '매일 만보 걷기', '주 5회 러닝', '코어 운동 매일', '스트레칭 21일'],
  '독서':       ['하루 30분 독서', '한 달 책 두 권', '매일 독서 노트', '책 완독 챌린지', '읽고 요약하기'],
  '외국어':     ['영어 단어 암기', '매일 회화 문장', '듣기 30분 챌린지', '영어 뉴스 읽기', '외국어 공부'],
  'SNS 업로드': ['매일 1개 포스팅', '월 5회 인스타 업로드', '월 3회 티스토리 업로드', '월 2회 블로그 업로드', '월 1회 유튜브 업로드'],
  '기타':       ['매일 일기 한 페이지', '브런치 글 발행', '하루 200자 에세이', '아이디어 노트', '독서 후기']
};

function getRandomTitle(category) {
  const pool = TITLE_SUGGESTIONS[category];
  if (!pool) return '';
  return pool[Math.floor(Math.random() * pool.length)];
}

const CERTIFY_TYPES    = [{ id: 'photo', label: '사진 인증' }, { id: 'text', label: '텍스트 인증' }, { id: 'check', label: '체크인' }];
const DAY_TYPE_OPTIONS = [{ id: 'weekday', label: '평일' }, { id: 'weekend', label: '주말' }, { id: 'all', label: '평일 및 주말' }];
const DURATION_PRESETS = [{ label: '7일', days: 7 }, { label: '14일', days: 14 }, { label: '21일', days: 21 }, { label: '30일', days: 30 }];
const STEP_LABELS = ['카테고리', '제목', '기간', '인원', '공개·인증'];
const MAX_ACTIVE_PER_CATEGORY = 2;
const JOIN_FEE = 2;

/* ───────── 유틸 ───────── */
function toDateString(date) {
  return date.toISOString().split('T')[0];
}
function addDays(dateStr, days) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return toDateString(d);
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
  const [isPublic,          setIsPublic]          = useState(true);
  const [certifyTypes,      setCertifyTypes]      = useState(['photo']);
  const [recruitDays,       setRecruitDays]       = useState(3);
  const [description,       setDescription]       = useState('');
  const [submitting,        setSubmitting]        = useState(false);
  const [errorMsg,          setErrorMsg]          = useState('');

  /* 스텝 상태 */
  const [step,      setStep]      = useState(0);
  const [direction, setDirection] = useState('forward'); // 애니메이션 방향

  /* 각 스텝 통과 조건 */
  const canNext = [
    category !== '',                          // 0: 카테고리
    title.trim() !== '',                      // 1: 제목
    !!startDate && !!endDate && endDate >= startDate, // 2: 기간
    parseInt(memberCount) >= 2 && parseInt(memberCount) <= 30, // 3: 인원
    certifyTypes.length > 0,                  // 4: 공개설정+인증방식
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

  const toggleCertifyType = (id) => {
    setCertifyTypes((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  };

  /* 관심사 카테고리 우선 정렬 */
  const sortedCats = [
    ...CATEGORIES.filter((c) => userInterests.includes(c)),
    ...CATEGORIES.filter((c) => !userInterests.includes(c)),
  ];

  const handleSubmit = async () => {
    setErrorMsg('');
    setSubmitting(true);
    try {
      const profileId = await getProfileId();
      if (!profileId) { setErrorMsg('프로필을 불러오지 못했어요.'); setSubmitting(false); return; }

      // 모임장 퇴출 누적 패널티로 인한 개설 제한 확인
      const { data: myProfile } = await supabase
        .from('profiles')
        .select('points, owner_restricted_until')
        .eq('id', profileId)
        .single();

      if (myProfile?.owner_restricted_until && myProfile.owner_restricted_until >= today) {
        setErrorMsg(`모임장 퇴출 이력으로 ${myProfile.owner_restricted_until}까지 모임을 개설할 수 없어요.`);
        setSubmitting(false);
        return;
      }

      if ((myProfile?.points ?? 0) < JOIN_FEE) {
        setErrorMsg('포인트가 부족해요. 모임 개설도 참여로 간주되어 2P가 필요해요.');
        setSubmitting(false);
        return;
      }

      // 주제별 동시 개설 제한 (최대 2개)
      const { count: activeSameCategory } = await supabase
        .from('challenges')
        .select('*', { count: 'exact', head: true })
        .eq('category', category)
        .eq('status', 'active');

      if ((activeSameCategory ?? 0) >= MAX_ACTIVE_PER_CATEGORY) {
        setErrorMsg(`'${category}' 주제는 이미 개설된 모임이 ${MAX_ACTIVE_PER_CATEGORY}개 있어요. 기존 모임이 마감된 후 다시 시도해주세요.`);
        setSubmitting(false);
        return;
      }

      const durationDays = Math.round(
        (new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)
      ) + 1;

      const { data: sbData, error } = await supabase
        .from('challenges')
        .insert({
          title,
          category,
          description:          description.trim() || null,
          duration:             durationDays,
          max_members:          parseInt(memberCount) || 2,
          certify_types:        certifyTypes,
          is_public:            isPublic,
          day_type:             dayType,
          exclude_holiday:      excludeHoliday,
          status:               'active',
          recruitment_end_date: addDays(today, recruitDays),
          created_by:           profileId,
        })
        .select()
        .single();

      if (error || !sbData) {
        setErrorMsg('챌린지 개설에 실패했어요. 잠시 후 다시 시도해주세요.');
        setSubmitting(false);
        return;
      }

      const challengeId = sbData.id;

      // 모임장은 항상 참여자로 등록
      await supabase.from('challenge_members').insert({
        challenge_id: challengeId,
        user_id:      profileId,
        role:         'owner',
        status:       'active',
      });

      // 참여 포인트 2P 차감 (모임장 포함)
      const { error: spendError } = await spendJoinFee(profileId, challengeId, `'${title}' 모임 개설 참여`);
      if (spendError) {
        // 포인트 부족 등으로 실패하면 방금 만든 챌린지를 되돌린다
        await supabase.from('challenges').delete().eq('id', challengeId);
        setErrorMsg('포인트가 부족해 개설을 완료하지 못했어요.');
        setSubmitting(false);
        return;
      }

      await grantOnboardingReward(profileId, 'created');

      // localStorage에도 저장 (내 챌린지 표시용)
      const newChallenge = {
        id:          challengeId,
        title, category,
        duration:    `${startDate} ~ ${endDate}`,
        startDate, endDate, dayType, excludeHoliday,
        memberCount: parseInt(memberCount) || 2,
        certifyTypes, isPublic,
        createdAt:   new Date().toISOString(),
        role:        'owner',
      };
      const prev = JSON.parse(localStorage.getItem('my_challenges') || '[]');
      localStorage.setItem('my_challenges', JSON.stringify([newChallenge, ...prev]));
      navigate('/profile');
    } catch {
      setErrorMsg('알 수 없는 오류가 발생했어요.');
    } finally {
      setSubmitting(false);
    }
  };

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
      <p style={s.stepDesc}>어떤 습관을 만들고 싶나요?</p>
      <div style={{ marginTop: '28px' }}>
        <input
          type="text" value={title} onChange={(e) => setTitle(e.target.value)}
          placeholder="챌린지 이름을 입력해주세요"
          style={{ width: '100%', padding: '16px', borderRadius: '12px', border: '1.5px solid var(--border-color)', fontSize: '16px', outline: 'none', boxSizing: 'border-box' }}
          autoFocus
        />
        <button onClick={() => setTitle(getRandomTitle(category))} style={{
          marginTop: '12px', background: '#FFF0EB', color: 'var(--primary)', border: 'none',
          padding: '12px 20px', borderRadius: '10px', fontSize: '14px', fontWeight: 'bold',
          display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', width: '100%', justifyContent: 'center',
        }}>
          <Shuffle size={16} /> 랜덤 제목 추천
        </button>
        {title && <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px', textAlign: 'right' }}>{title.length}자</p>}

        {/* 챌린지 소개 (선택) */}
        <div style={{ marginTop: '20px' }}>
          <label style={{ ...s.fieldLabel, marginBottom: '8px', display: 'block' }}>
            챌린지 소개 <span style={{ color: 'var(--text-muted)', fontWeight: 'normal' }}>(선택)</span>
          </label>
          <textarea
            value={description} onChange={(e) => setDescription(e.target.value)}
            placeholder="어떤 챌린지인지 간단히 소개해주세요"
            maxLength={200}
            style={{ width: '100%', height: '100px', padding: '14px', borderRadius: '12px', border: '1.5px solid var(--border-color)', resize: 'none', outline: 'none', fontSize: '14px', fontFamily: 'inherit', boxSizing: 'border-box' }}
          />
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'right', marginTop: '4px' }}>{description.length}/200</p>
        </div>
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

        {/* 모집 기간 */}
        <div>
          <p style={s.fieldLabel}><CalendarDays size={14} color="var(--primary)" /> 인원 모집 기간 (최대 7일)</p>
          <div style={{ display: 'flex', gap: '8px' }}>
            {[1, 3, 5, 7].map((d) => (
              <button key={d} onClick={() => setRecruitDays(d)} style={{
                flex: 1, padding: '11px 0', borderRadius: '8px', cursor: 'pointer', fontSize: '14px',
                border: `1px solid ${recruitDays === d ? 'var(--primary)' : 'var(--border-color)'}`,
                background: recruitDays === d ? '#FFF0EB' : 'white',
                color: recruitDays === d ? 'var(--primary)' : 'var(--text-main)',
                fontWeight: recruitDays === d ? 'bold' : 'normal',
              }}>{d}일</button>
            ))}
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>
            모집 마감일: {addDays(today, recruitDays)} · 만원 시 자동 마감
          </p>
        </div>

        {/* 요약 */}
        {startDate && endDate && (
          <div style={{ padding: '12px 16px', background: '#FFF0EB', borderRadius: '10px', fontSize: '13px', color: 'var(--primary)', fontWeight: 'bold' }}>
            {startDate} ~ {endDate} · {dayType === 'weekday' ? '평일' : dayType === 'weekend' ? '주말' : '매일'} 인증
            {excludeHoliday ? ' · 공휴일 제외' : ''} · 모집 {recruitDays}일
          </div>
        )}
      </div>
    </div>,

    /* 3: 인원 */
    <div key="member">
      <h2 style={s.stepTitle}>몇 명이서 할까요?</h2>
      <p style={s.stepDesc}>모임장 포함 최소 2명, 최대 30명까지 설정할 수 있어요</p>
      <div style={{ marginTop: '48px', display: 'flex', alignItems: 'center', gap: '16px', justifyContent: 'center' }}>
        <button onClick={() => setMemberCount((v) => String(Math.max(2, (parseInt(v) || 2) - 1)))} style={s.roundBtn}>
          <span style={{ fontSize: '20px', color: 'var(--text-main)' }}>−</span>
        </button>
        <input
          type="number" min={2} max={30}
          value={memberCount}
          onChange={handleMemberInput}
          style={{ width: '120px', textAlign: 'center', padding: '16px', borderRadius: '12px', border: '1.5px solid var(--border-color)', fontSize: '32px', fontWeight: 'bold', color: 'var(--primary)', outline: 'none' }}
        />
        <button onClick={() => setMemberCount((v) => String(Math.min(30, (parseInt(v) || 1) + 1)))} style={{ ...s.roundBtn, background: 'var(--primary)', border: 'none' }}>
          <span style={{ fontSize: '20px', color: 'white' }}>+</span>
        </button>
      </div>
      <p style={{ textAlign: 'center', marginTop: '16px', fontSize: '14px', color: 'var(--text-muted)' }}>
        명 참여 가능 (모임장 포함)
      </p>
      <div style={{ marginTop: '28px', padding: '16px', background: '#FFF0EB', borderRadius: '12px', fontSize: '13px', color: 'var(--primary)', textAlign: 'center', fontWeight: 'bold' }}>
        모임 참여 시 {JOIN_FEE}P가 소모돼요 (모임장 포함)
      </div>
    </div>,

    /* 4: 공개설정 + 인증 방식 */
    <div key="settings">
      <h2 style={s.stepTitle}>공개 범위와 인증 방식을 정해주세요</h2>
      <p style={s.stepDesc}>인증 방식은 여러 개 선택할 수 있어요</p>

      <div style={{ marginTop: '24px' }}>
        <p style={s.fieldLabel}>모임 유형</p>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => setIsPublic(true)} style={{
            flex: 1, padding: '14px 0', borderRadius: '10px', cursor: 'pointer',
            border: `1.5px solid ${isPublic ? 'var(--primary)' : 'var(--border-color)'}`,
            background: isPublic ? '#FFF0EB' : 'white',
            color: isPublic ? 'var(--primary)' : 'var(--text-main)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            fontSize: '14px', fontWeight: isPublic ? 'bold' : 'normal',
          }}><Globe size={16} /> 공개 모임</button>
          <button onClick={() => setIsPublic(false)} style={{
            flex: 1, padding: '14px 0', borderRadius: '10px', cursor: 'pointer',
            border: `1.5px solid ${!isPublic ? 'var(--primary)' : 'var(--border-color)'}`,
            background: !isPublic ? '#FFF0EB' : 'white',
            color: !isPublic ? 'var(--primary)' : 'var(--text-main)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            fontSize: '14px', fontWeight: !isPublic ? 'bold' : 'normal',
          }}><Lock size={16} /> 비공개 모임</button>
        </div>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>
          {isPublic ? '누구나 참여할 수 있어요' : '접근이 제한된 모임이에요'}
        </p>
      </div>

      <div style={{ marginTop: '28px' }}>
        <p style={s.fieldLabel}>인증 방식 (복수 선택 가능)</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {CERTIFY_TYPES.map((type) => {
            const selected = certifyTypes.includes(type.id);
            return (
              <button key={type.id} onClick={() => toggleCertifyType(type.id)} style={{
                padding: '20px', borderRadius: '12px', cursor: 'pointer', textAlign: 'left',
                border: `1.5px solid ${selected ? 'var(--primary)' : 'var(--border-color)'}`,
                background: selected ? '#FFF0EB' : 'white',
                display: 'flex', alignItems: 'center', gap: '12px',
              }}>
                {type.id === 'photo' && <Camera size={20} color={selected ? 'var(--primary)' : 'var(--text-muted)'} />}
                {type.id === 'text'  && <Edit3 size={20} color={selected ? 'var(--primary)' : 'var(--text-muted)'} />}
                {type.id === 'check' && <CheckSquare size={20} color={selected ? 'var(--primary)' : 'var(--text-muted)'} />}
                <div style={{ fontSize: '16px', fontWeight: 'bold', color: selected ? 'var(--primary)' : 'var(--text-main)' }}>
                  {type.label}
                </div>
              </button>
            );
          })}
        </div>
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
        {errorMsg && (
          <div style={{ marginTop: '16px', padding: '12px 16px', background: '#FEF2F2', border: '1px solid #FFD4C8', borderRadius: '10px', fontSize: '13px', color: '#EF4444', fontWeight: 'bold' }}>
            {errorMsg}
          </div>
        )}
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
          onClick={() => step === STEP_LABELS.length - 1 ? handleSubmit() : go(1)}
          disabled={!canNext[step] || submitting}
          style={{
            flex: step > 0 ? 2 : 1, padding: '16px', borderRadius: '12px', border: 'none',
            background: (canNext[step] && !submitting) ? 'var(--primary)' : '#E5E7EB',
            color: (canNext[step] && !submitting) ? 'white' : 'var(--text-muted)',
            fontSize: '16px', fontWeight: 'bold',
            cursor: (canNext[step] && !submitting) ? 'pointer' : 'not-allowed',
            transition: 'background 0.2s',
          }}
        >
          {step === STEP_LABELS.length - 1 ? (submitting ? '개설 중...' : '개설 완료하기') : '다음'}
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
