import React, { useState, useEffect, useMemo } from 'react';
import { Settings, ChevronLeft, ChevronRight, Flame, Users, Wallet, CheckCircle, Clock, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import { getDeviceId } from '../../utils/deviceId';
import { logEvent } from '../../services/logger';

/* ───────── 상수 ───────── */
const KO_MONTHS  = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];
const WEEK_DAYS  = ['일','월','화','수','목','금','토'];

const LEVEL_TABLE = [
  { min: 0,  label: '씨앗 챌리',  emoji: '🌱', desc: '첫 인증을 시작해보세요!',      color: '#6B7280' },
  { min: 3,  label: '불씨 챌리',  emoji: '🔥', desc: '3일 연속 인증 달성!',          color: '#F59E0B' },
  { min: 7,  label: '점화 챌리',  emoji: '🔥', desc: '7일 연속 — 습관이 시작됩니다', color: '#EF4444' },
  { min: 14, label: '폭발 챌리',  emoji: '💥', desc: '2주 연속 — 거침없는 성장!',    color: '#8B5CF6' },
  { min: 30, label: '전설 챌리',  emoji: '⚡', desc: '30일 연속 — 당신은 레전드!',   color: '#F59E0B' },
];

function getLevel(streak) {
  return [...LEVEL_TABLE].reverse().find((l) => streak >= l.min) || LEVEL_TABLE[0];
}

const toDateStr = (y, m, d) =>
  `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;

const JOINED_DUMMY = [
  { id: 7, title: '하루 1시간 바이브코딩', category: '바이브코딩', dDay: 14, streak: 5,  deposit: 10000 },
  { id: 5, title: '매일 1시간 집중 공부',  category: '스터디',     dDay: 22, streak: 12, deposit: 15000 },
];

const DEFAULT_PROFILE = { avatar: '🐰', nickname: '챌린저', bio: '목표는 꾸준함!' };

/* ───────── 컴포넌트 ───────── */
export default function Profile() {
  const navigate = useNavigate();
  const today    = new Date();
  const todayStr = today.toISOString().split('T')[0];

  const [profile,         setProfile]         = useState(DEFAULT_PROFILE);
  const [mainTab,         setMainTab]          = useState('challenges');
  const [challengeTab,    setChallengeTab]     = useState('joined');
  const [calYear,         setCalYear]          = useState(today.getFullYear());
  const [calMonth,        setCalMonth]         = useState(today.getMonth());
  const [certByChallenge, setCertByChallenge]  = useState({});
  const [certifiedDates,  setCertifiedDates]   = useState(new Set());
  const [ownedChallenges, setOwnedChallenges]  = useState([]);
  const [joinedChallenges, setJoinedChallenges] = useState(JOINED_DUMMY);
  const [showLevelModal,  setShowLevelModal]   = useState(false);

  useEffect(() => {
    logEvent('page_view', '/profile');

    // 프로필: localStorage 우선
    try {
      const local = JSON.parse(localStorage.getItem('profile') || 'null');
      if (local) { setProfile(local); }
      else {
        (async () => {
          try {
            const { data } = await supabase.from('profiles').select('avatar, nickname, bio').eq('device_id', getDeviceId()).single();
            if (data) setProfile(data);
          } catch {}
        })();
      }
    } catch {}

    // 챌린지별 인증
    try { setCertByChallenge(JSON.parse(localStorage.getItem('certified_by_challenge') || '{}')); } catch {}

    // 전체 인증 날짜
    try { setCertifiedDates(new Set(JSON.parse(localStorage.getItem('certified_dates') || '[]'))); } catch {}

    // 내가 개설한 챌린지 + 참여 중인 챌린지
    try {
      const all = JSON.parse(localStorage.getItem('my_challenges') || '[]');
      setOwnedChallenges(all.filter((c) => c.role === 'owner'));

      // localStorage member + JOINED_DUMMY 병합 (중복 제거)
      const fromLS = all.filter((c) => c.role === 'member');
      const lsIds  = new Set(fromLS.map((c) => String(c.id)));
      const merged = [
        ...fromLS,
        ...JOINED_DUMMY.filter((c) => !lsIds.has(String(c.id))),
      ];
      setJoinedChallenges(merged);
    } catch {}
  }, []);

  /* 오늘 인증 여부 — 챌린지별 */
  const isCertifiedToday = (challengeId) =>
    (certByChallenge[String(challengeId)] || []).includes(todayStr);

  /* 현재 스트릭 */
  const currentStreak = useMemo(() => {
    let streak = 0;
    const d = new Date(today);
    while (true) {
      const str = d.toISOString().split('T')[0];
      if (certifiedDates.has(str)) { streak++; d.setDate(d.getDate() - 1); }
      else break;
    }
    return streak;
  }, [certifiedDates]);

  const level = getLevel(currentStreak);

  /* 달력 */
  const allChallengeIds = useMemo(() => [
    ...joinedChallenges.map((c) => String(c.id)),
    ...ownedChallenges.map((c) => String(c.id)),
  ], [joinedChallenges, ownedChallenges]);

  const calData = useMemo(() => ({
    firstDay:    new Date(calYear, calMonth, 1).getDay(),
    daysInMonth: new Date(calYear, calMonth + 1, 0).getDate(),
  }), [calYear, calMonth]);

  const moveMonth = (dir) => {
    let m = calMonth + dir, y = calYear;
    if (m < 0)  { m = 11; y--; }
    if (m > 11) { m = 0;  y++; }
    if (y > today.getFullYear() || (y === today.getFullYear() && m > today.getMonth())) return;
    setCalYear(y); setCalMonth(m);
  };

  const isFutureMonth = calYear > today.getFullYear() ||
    (calYear === today.getFullYear() && calMonth >= today.getMonth());

  /* 날짜별 인증 비율 */
  const getCertRatio = (dateStr) => {
    if (allChallengeIds.length === 0) return certifiedDates.has(dateStr) ? 1 : 0;
    const certified = allChallengeIds.filter((cId) => (certByChallenge[cId] || []).includes(dateStr));
    return certified.length / allChallengeIds.length;
  };

  /* 챌린지 카드 — 인증 상태 표시 */
  const ChallengeCard = ({ ch, isOwned = false }) => {
    const certified = isCertifiedToday(ch.id);
    return (
      <div onClick={() => navigate(isOwned ? `/feed/${ch.id}` : `/feed/${ch.id}`)}
        style={{ background: 'white', borderRadius: '12px', padding: '16px', border: `1px solid ${certified ? '#D1FAE5' : 'var(--border-color)'}`, cursor: 'pointer', position: 'relative' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: 'bold', marginBottom: '4px' }}>{ch.category}</div>
            <div style={{ fontSize: '15px', fontWeight: 'bold', marginBottom: '8px' }}>{ch.title}</div>
            <div style={{ display: 'flex', gap: '10px', fontSize: '12px', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
              {ch.dDay   != null && <span>D-{ch.dDay}</span>}
              {ch.streak != null && <span>🔥 {ch.streak}일</span>}
              {ch.memberCount && <span style={{ display:'flex', alignItems:'center', gap:'2px' }}><Users size={11}/> {ch.memberCount}명</span>}
              {ch.deposit != null && <span>💰 {ch.deposit.toLocaleString()}원</span>}
              {ch.startDate && <span>{ch.startDate} ~ {ch.endDate}</span>}
            </div>
          </div>
          {/* 오늘 인증 뱃지 */}
          <div style={{ marginLeft: '12px', flexShrink: 0 }}>
            {certified
              ? <span style={{ display:'flex', alignItems:'center', gap:'4px', fontSize:'11px', fontWeight:'bold', color:'var(--success)', background:'#D1FAE5', padding:'4px 8px', borderRadius:'20px' }}>
                  <CheckCircle size={12}/> 인증 완료
                </span>
              : <span style={{ display:'flex', alignItems:'center', gap:'4px', fontSize:'11px', fontWeight:'bold', color:'var(--primary)', background:'#FFF0EB', padding:'4px 8px', borderRadius:'20px' }}>
                  <Clock size={12}/> 인증 대기
                </span>
            }
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ backgroundColor: '#F8F9FA', minHeight: '100vh', paddingBottom: '40px' }}>

      {/* 프로필 헤더 */}
      <header style={{ padding: '24px 20px', background: 'white', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#FFF0EB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px' }}>
            {profile.avatar}
          </div>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0 }}>{profile.nickname}</h1>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '2px 0 0' }}>{profile.bio}</p>
          </div>
        </div>
        <Settings size={22} color="var(--text-muted)" style={{ cursor: 'pointer', flexShrink: 0 }} onClick={() => navigate('/profile/edit')} />
      </header>

      {/* 챌리 레벨 카드 (클릭 시 레벨표 툴팁) */}
      <section style={{ padding: '20px 20px 0' }}>
        <div onClick={() => setShowLevelModal(true)}
          style={{ background: 'var(--secondary)', borderRadius: '16px', padding: '20px 24px', color: 'white', display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer', position: 'relative' }}>
          <div style={{ fontSize: '44px' }}>{level.emoji}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>현재 레벨 — 탭하여 기준 보기</div>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: level.color }}>{level.label}</div>
            <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', marginTop: '4px' }}>
              {currentStreak > 0 ? `${currentStreak}일 연속 인증 중!` : '오늘 첫 인증을 시작해보세요!'}
            </div>
          </div>
          <ChevronRight size={18} color="rgba(255,255,255,0.4)" />
        </div>
      </section>

      {/* 메인 탭 */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', background: 'white', padding: '0 20px', marginTop: '20px' }}>
        {[['challenges', '챌린지'], ['growth', '성장 기록']].map(([key, label]) => (
          <button key={key} onClick={() => setMainTab(key)} style={{
            flex: 1, padding: '14px 0', border: 'none', background: 'none', cursor: 'pointer',
            fontSize: '14px', fontWeight: mainTab === key ? 'bold' : 'normal',
            color: mainTab === key ? 'var(--primary)' : 'var(--text-muted)',
            borderBottom: mainTab === key ? '2px solid var(--primary)' : '2px solid transparent',
          }}>{label}</button>
        ))}
      </div>

      {/* ── 챌린지 탭 ── */}
      {mainTab === 'challenges' && (
        <div style={{ padding: '16px 20px' }}>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            {[['joined', '참여 중인 챌린지'], ['owned', '운영 중인 챌린지']].map(([key, label]) => (
              <button key={key} onClick={() => setChallengeTab(key)} style={{
                flex: 1, padding: '10px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                background: challengeTab === key ? 'var(--primary)' : '#F3F4F6',
                color: challengeTab === key ? 'white' : 'var(--text-muted)',
                fontSize: '13px', fontWeight: challengeTab === key ? 'bold' : 'normal',
              }}>{label}</button>
            ))}
          </div>

          {challengeTab === 'joined' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {joinedChallenges.map((ch) => <ChallengeCard key={ch.id} ch={ch} />)}
            </div>
          )}

          {challengeTab === 'owned' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {ownedChallenges.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)' }}>
                  <div style={{ fontSize: '32px', marginBottom: '12px' }}>📋</div>
                  <p style={{ fontSize: '14px' }}>개설한 챌린지가 없어요</p>
                  <button onClick={() => navigate('/create')} style={{ marginTop: '16px', padding: '10px 24px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '20px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' }}>
                    + 챌린지 개설하기
                  </button>
                </div>
              ) : (
                ownedChallenges.map((ch) => <ChallengeCard key={ch.id} ch={ch} isOwned />)
              )}
            </div>
          )}
        </div>
      )}

      {/* ── 성장 기록 탭 ── */}
      {mainTab === 'growth' && (
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* 통계 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {[
              [currentStreak + '일', '현재 연속 스트릭'],
              [certifiedDates.size + '회', '총 인증 횟수'],
              [ownedChallenges.length + '개', '개설한 챌린지'],
              [joinedChallenges.length + '개', '참여 중인 챌린지'],
            ].map(([val, label]) => (
              <div key={label} style={{ background: 'white', borderRadius: '12px', padding: '16px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                <div style={{ fontSize: '22px', fontWeight: 'bold', color: 'var(--primary)' }}>{val}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>{label}</div>
              </div>
            ))}
          </div>

          {/* 달력 */}
          <div style={{ background: 'white', borderRadius: '16px', padding: '20px', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <button onClick={() => moveMonth(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex' }}>
                <ChevronLeft size={20} color="var(--text-muted)" />
              </button>
              <div style={{ fontWeight: 'bold', fontSize: '15px' }}>{calYear}년 {KO_MONTHS[calMonth]}</div>
              <button onClick={() => moveMonth(1)} style={{ background: 'none', border: 'none', padding: '4px', display: 'flex', opacity: isFutureMonth ? 0.3 : 1, cursor: isFutureMonth ? 'default' : 'pointer' }}>
                <ChevronRight size={20} color="var(--text-muted)" />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '6px' }}>
              {WEEK_DAYS.map((d) => (
                <div key={d} style={{ textAlign: 'center', fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)', padding: '4px 0' }}>{d}</div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
              {Array.from({ length: calData.firstDay }).map((_, i) => <div key={`e${i}`} />)}
              {Array.from({ length: calData.daysInMonth }).map((_, i) => {
                const dayNum  = i + 1;
                const dateStr = toDateStr(calYear, calMonth, dayNum);
                const isFuture  = dateStr > todayStr;
                const isToday   = dateStr === todayStr;
                const ratio     = isFuture ? 0 : getCertRatio(dateStr);
                const isFull    = ratio === 1 && ratio > 0;
                const isPartial = ratio > 0 && ratio < 1;
                const isEmpty   = ratio === 0;

                return (
                  <div key={dayNum} style={{
                    aspectRatio: '1/1', borderRadius: '8px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: isFull ? '#FFF0EB' : isPartial ? '#FFFBEB' : isFuture ? 'transparent' : '#F9FAFB',
                    border: isToday ? '2px solid var(--primary)' : '2px solid transparent',
                  }}>
                    {isFull
                      ? <Flame size={15} color="var(--primary)" fill="var(--primary)" />
                      : isPartial
                        ? <Flame size={15} color="#F59E0B" fill="#FEF3C7" />
                        : <span style={{ fontSize: '11px', fontWeight: isToday ? 'bold' : 'normal', color: isFuture ? '#9CA3AF' : isToday ? 'var(--primary)' : 'var(--text-muted)' }}>{dayNum}</span>
                    }
                  </div>
                );
              })}
            </div>

            {/* 범례 */}
            <div style={{ display: 'flex', gap: '14px', marginTop: '14px', justifyContent: 'center' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--text-muted)' }}>
                <Flame size={12} color="var(--primary)" fill="var(--primary)" /> 완전 인증
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--text-muted)' }}>
                <Flame size={12} color="#F59E0B" fill="#FEF3C7" /> 부분 인증
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--text-muted)' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '3px', border: '2px solid var(--primary)' }} /> 오늘
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 레벨 기준 모달 */}
      {showLevelModal && (
        <div onClick={() => setShowLevelModal(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'flex-end' }}>
          <div onClick={(e) => e.stopPropagation()}
            style={{ width: '100%', maxWidth: '480px', margin: '0 auto', background: 'white', borderRadius: '20px 20px 0 0', padding: '24px 20px 40px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '17px', fontWeight: 'bold', margin: 0 }}>단계별 레벨 기준</h3>
              <button onClick={() => setShowLevelModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}>
                <X size={22} color="var(--text-muted)" />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {LEVEL_TABLE.map((lv, idx) => {
                const next = LEVEL_TABLE[idx + 1];
                const isCurrentLevel = level.min === lv.min;
                return (
                  <div key={lv.label} style={{
                    padding: '14px 16px', borderRadius: '12px',
                    background: isCurrentLevel ? '#FFF0EB' : '#F8F9FA',
                    border: `1.5px solid ${isCurrentLevel ? 'var(--primary)' : 'var(--border-color)'}`,
                    display: 'flex', alignItems: 'center', gap: '14px',
                  }}>
                    <span style={{ fontSize: '28px' }}>{lv.emoji}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 'bold', fontSize: '14px', color: lv.color }}>{lv.label}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{lv.desc}</div>
                    </div>
                    <div style={{ fontSize: '12px', fontWeight: 'bold', color: isCurrentLevel ? 'var(--primary)' : 'var(--text-muted)', textAlign: 'right' }}>
                      {lv.min}일{next ? `~${next.min - 1}일` : '+'}
                      {isCurrentLevel && <div style={{ fontSize: '10px', color: 'var(--primary)' }}>현재</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
