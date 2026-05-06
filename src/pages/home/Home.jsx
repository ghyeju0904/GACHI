import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Bell, Flame, ChevronRight, ChevronDown, ChevronUp, Search, Users, Wallet, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import { logEvent } from '../../services/logger';
import { getProfileId } from '../../utils/getProfileId';

const ALL_CATEGORIES = [
  '미라클모닝', '스터디', '식단', '운동',
  '독서', '외국어', 'SNS 업로드', '기타'
];

function getMemberStatus(members, maxMembers) {
  const ratio = members / maxMembers;
  if (members >= maxMembers) return { label: '멤버 마감',  textColor: '#EF4444', bgColor: '#FEF2F2' };
  if (ratio >= 0.8)          return { label: '마감 임박',  textColor: '#F59E0B', bgColor: '#FFFBEB' };
  return                            { label: '모집 중',    textColor: '#10B981', bgColor: '#ECFDF5' };
}

export default function Home() {
  const navigate  = useNavigate();
  const todayStr  = new Date().toISOString().split('T')[0];

  const interests = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('interests') || '[]'); }
    catch { return []; }
  }, []);

  const [allChallenges,     setAllChallenges]     = useState([]);
  const [loadingChallenges, setLoadingChallenges] = useState(true);
  const [unreadCount,       setUnreadCount]       = useState(0);
  const [certByChallenge, setCertByChallenge] = useState({});
  const [ownedChallenges, setOwnedChallenges] = useState([]);
  const [joinedFromLS,    setJoinedFromLS]    = useState([]);
  const [myOpen,          setMyOpen]          = useState(false);
  const [mySubTab,        setMySubTab]        = useState('owned');  // owned | joined
  const [searchQuery,     setSearchQuery]     = useState('');
  const [activeTab,       setActiveTab]       = useState('전체');
  const [showCatDropdown, setShowCatDropdown] = useState(false);
  const dropdownRef = useRef(null);
  const [giveUpModal,     setGiveUpModal]     = useState(null);
  const [giveUpStep,      setGiveUpStep]      = useState(1);
  const [givenUpIds,      setGivenUpIds]      = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem('given_up_challenges') || '[]').map(String)); }
    catch { return new Set(); }
  });

  // Supabase에서 챌린지 목록 fetch
  useEffect(() => {
    const fetchChallenges = async () => {
      const { data, error } = await supabase
        .from('challenges')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (!error && data) {
        setAllChallenges(data.map((ch) => ({
          ...ch,
          maxMembers:  ch.max_members,
          certifyType: ch.certify_type,
          members:     0,
        })));
      }
      setLoadingChallenges(false);
    };
    fetchChallenges();
  }, []);

  // 홈 진입 로그 + 읽지 않은 알림 수 + 실시간 구독
  useEffect(() => {
    logEvent('page_view', '/home');

    let channel = null;
    const init = async () => {
      const profileId = await getProfileId();
      if (!profileId) return;

      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', profileId)
        .eq('read', false);
      setUnreadCount(count || 0);

      // 새 알림 실시간 수신
      channel = supabase
        .channel(`notif_${profileId}`)
        .on('postgres_changes', {
          event: 'INSERT', schema: 'public', table: 'notifications',
          filter: `user_id=eq.${profileId}`,
        }, () => {
          setUnreadCount((n) => n + 1);
        })
        .subscribe();
    };
    init();
    return () => { if (channel) supabase.removeChannel(channel); };
  }, []);

  // 드롭다운 외부 클릭 시 닫기
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowCatDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // 내 챌린지 로드: localStorage 우선 표시 후 Supabase 동기화
  useEffect(() => {
    try { setCertByChallenge(JSON.parse(localStorage.getItem('certified_by_challenge') || '{}')); } catch {}

    // localStorage 즉시 로드
    try {
      const all = JSON.parse(localStorage.getItem('my_challenges') || '[]');
      setOwnedChallenges(all.filter((c) => c.role === 'owner'));
      setJoinedFromLS(all.filter((c) => c.role === 'member'));
    } catch {}

    // Supabase에서 동기화 (다른 디바이스에서 참여한 챌린지 반영)
    const syncFromSupabase = async () => {
      try {
        const profileId = await getProfileId();
        if (!profileId) return;

        const { data, error } = await supabase
          .from('challenge_members')
          .select('role, status, joined_at, challenges(*)')
          .eq('user_id', profileId)
          .neq('status', 'gave_up')
          .neq('status', 'kicked');

        if (error || !data) return;

        const synced = data
          .filter((m) => m.challenges?.status === 'active')
          .map((m) => ({
          id:          m.challenges.id,
          title:       m.challenges.title,
          category:    m.challenges.category,
          deposit:     m.challenges.deposit,
          dDay:        m.challenges.duration,
          streak:      0,
          role:        m.role,
          maxMembers:  m.challenges.max_members,
          certifyType: m.challenges.certify_type,
          joinedAt:    m.joined_at,
        }));

        // localStorage 갱신
        localStorage.setItem('my_challenges', JSON.stringify(synced));
        setOwnedChallenges(synced.filter((c) => c.role === 'owner'));
        setJoinedFromLS(synced.filter((c) => c.role === 'member'));
      } catch {}
    };
    syncFromSupabase();
  }, []);

  const isCertifiedToday = (id) => (certByChallenge[String(id)] || []).includes(todayStr);

  const openGiveUp = (ch) => { setGiveUpModal(ch); setGiveUpStep(1); };
  const closeGiveUp = () => setGiveUpModal(null);

  const handleConfirmGiveUp = () => {
    if (!giveUpModal) return;
    const challengeId = String(giveUpModal.id);
    try {
      const all = JSON.parse(localStorage.getItem('my_challenges') || '[]');
      localStorage.setItem('my_challenges', JSON.stringify(all.filter((c) => String(c.id) !== challengeId)));
      const prev = JSON.parse(localStorage.getItem('given_up_challenges') || '[]');
      localStorage.setItem('given_up_challenges', JSON.stringify([...new Set([...prev.map(String), challengeId])]));
    } catch {}
    setJoinedFromLS((prev) => prev.filter((c) => String(c.id) !== challengeId));
    setGivenUpIds((prev) => new Set([...prev, challengeId]));
    logEvent('challenge_give_up', `/home`, { challenge_id: challengeId, deposit: giveUpModal?.deposit });
    closeGiveUp();
  };

  // 참여 중 = localStorage member 전체 (포기한 챌린지 제외)
  const joinedChallenges = useMemo(() => {
    return joinedFromLS.filter((c) => !givenUpIds.has(String(c.id)));
  }, [joinedFromLS, givenUpIds]);

  const allMyChallenges = [...ownedChallenges, ...joinedChallenges];
  const pendingCount    = allMyChallenges.filter((c) => !isCertifiedToday(c.id)).length;

  // Supabase + localStorage(운영 중 + 참여 중) 통합 챌린지 목록
  const mergedChallenges = useMemo(() => {
    const map = new Map(allChallenges.map((c) => [String(c.id), c]));
    [...ownedChallenges, ...joinedFromLS].forEach((c) => {
      if (!map.has(String(c.id))) {
        map.set(String(c.id), {
          id:         c.id,
          title:      c.title,
          category:   c.category,
          deposit:    c.deposit || 0,
          members:    0,
          maxMembers: c.memberCount || c.maxMembers || 30,
          max_members: c.memberCount || c.maxMembers || 30,
        });
      }
    });
    return [...map.values()];
  }, [allChallenges, ownedChallenges, joinedFromLS]);

  const tabs = useMemo(() => {
    // 온보딩 전체 카테고리 기준, 관심 카테고리 우선 배치
    const interestFirst = interests.filter((c) => ALL_CATEGORIES.includes(c));
    const rest          = ALL_CATEGORIES.filter((c) => !interests.includes(c));
    // Supabase/localStorage에만 있는 추가 카테고리
    const extraFromData = [...new Set(mergedChallenges.map((c) => c.category))]
      .filter((c) => !ALL_CATEGORIES.includes(c));
    return ['전체', ...interestFirst, ...rest, ...extraFromData];
  }, [interests, mergedChallenges]);

  // 사용자가 참여한 챌린지 ID Set (인원 카운트 +1용)
  const joinedIdsSet = useMemo(() => new Set(joinedFromLS.map((c) => String(c.id))), [joinedFromLS]);

  const displayedChallenges = useMemo(() => {
    if (searchQuery.trim()) {
      const q = searchQuery.trim();
      return mergedChallenges.filter((c) => c.title.includes(q) || c.category.includes(q));
    }
    if (activeTab === '전체') return mergedChallenges;
    return mergedChallenges.filter((c) => c.category === activeTab);
  }, [searchQuery, activeTab, mergedChallenges]);

  /* ── 내 챌린지 미니 탭 색상 ── */
  const SUB_TAB_STYLES = {
    owned:  { active: { bg: 'var(--primary)',   color: 'white' }, inactive: { bg: '#FFF0EB', color: 'var(--primary)' } },
    joined: { active: { bg: 'var(--secondary)', color: 'white' }, inactive: { bg: '#E8E8F0', color: 'var(--secondary)' } },
  };

  const MiniChallengeRow = ({ ch, isOwned, onGiveUp }) => (
    <div onClick={() => navigate(isOwned ? `/manage/${ch.id}` : `/feed/${ch.id}`)}
      style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 4px', borderBottom: '1px solid #F3F4F6', cursor: 'pointer' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ch.title}</div>
        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
          {isOwned
            ? `${ch.category} · ${ch.deposit?.toLocaleString() || 0}원`
            : `D-${ch.dDay} · 🔥 ${ch.streak}일`}
        </div>
      </div>
      <div style={{ marginLeft: '10px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
        {isCertifiedToday(ch.id)
          ? <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#10B981', background: '#D1FAE5', padding: '3px 8px', borderRadius: '20px' }}>✓ 완료</span>
          : !isOwned
            ? <button onClick={(e) => { e.stopPropagation(); navigate(`/certify/${ch.id}`); }}
                style={{ fontSize: '11px', fontWeight: 'bold', color: 'white', background: 'var(--primary)', padding: '5px 10px', borderRadius: '20px', border: 'none', cursor: 'pointer' }}>
                인증하기
              </button>
            : <ChevronRight size={16} color="var(--text-muted)" />
        }
        {!isOwned && (
          <button onClick={(e) => { e.stopPropagation(); onGiveUp(ch); }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', opacity: 0.45 }}>
            <LogOut size={14} color="var(--text-muted)" />
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div style={{ backgroundColor: '#F8F9FA', minHeight: '100vh', paddingBottom: '20px' }}>

      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', background: 'var(--card-bg)', position: 'sticky', top: 0, zIndex: 10 }}>
        <h1 className="font-display" style={{ fontSize: '26px', color: 'var(--primary)', margin: 0, letterSpacing: '-0.5px' }}>GACHI</h1>
        <div style={{ position: 'relative', cursor: 'pointer' }} onClick={() => { navigate('/notifications'); setUnreadCount(0); }}>
          <Bell size={24} color="var(--text-main)" />
          {unreadCount > 0 && (
            <span style={{ position: 'absolute', top: -4, right: -4, minWidth: '16px', height: '16px', background: '#EF4444', borderRadius: '8px', fontSize: '10px', fontWeight: 'bold', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px' }}>
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </div>
      </header>

      <div style={{ padding: '0 20px' }}>

        {/* 검색창 */}
        <div style={{ position: 'relative', marginTop: '16px' }}>
          <Search size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="챌린지 검색"
            style={{ width: '100%', padding: '12px 36px 12px 42px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'white', fontSize: '15px', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')}
              style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '20px', lineHeight: 1 }}>×</button>
          )}
        </div>

        {/* 오늘의 인증 현황 */}
        {pendingCount > 0 && !searchQuery && (
          <section style={{ marginTop: '14px' }}>
            <div style={{ background: '#FFF0EB', borderRadius: '12px', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ width: '40px', height: '40px', background: 'var(--primary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Flame size={22} color="white" />
              </div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 'bold' }}>오늘의 인증 {allMyChallenges.length - pendingCount}/{allMyChallenges.length}</div>
                <div style={{ fontSize: '12px', color: 'var(--primary)', marginTop: '2px' }}>{pendingCount}개의 챌린지가 인증을 기다려요!</div>
              </div>
            </div>
          </section>
        )}

        {/* 내 챌린지 아코디언 */}
        {!searchQuery && (
          <section style={{ marginTop: '14px' }}>
            <button onClick={() => setMyOpen((v) => !v)}
              style={{ width: '100%', background: 'white', border: '1px solid var(--border-color)', borderRadius: myOpen ? '12px 12px 0 0' : '12px', padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
              <span style={{ fontWeight: 'bold', fontSize: '15px' }}>
                내 챌린지
                <span style={{ fontSize: '12px', color: 'var(--primary)', fontWeight: 'normal', marginLeft: '8px' }}>
                  {allMyChallenges.length - pendingCount}/{allMyChallenges.length} 인증
                </span>
              </span>
              {myOpen ? <ChevronUp size={18} color="var(--text-muted)" /> : <ChevronDown size={18} color="var(--text-muted)" />}
            </button>

            {myOpen && (
              <div style={{ background: 'white', border: '1px solid var(--border-color)', borderTop: 'none', borderRadius: '0 0 12px 12px', padding: '12px 12px' }}>
                {/* 서브 탭 */}
                <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
                  {[['owned', '운영 중'], ['joined', '참여 중']].map(([key, label]) => {
                    const st = SUB_TAB_STYLES[key];
                    const isActive = mySubTab === key;
                    return (
                      <button key={key} onClick={() => setMySubTab(key)} style={{
                        flex: 1, padding: '8px 0', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold',
                        background: isActive ? st.active.bg : st.inactive.bg,
                        color: isActive ? st.active.color : st.inactive.color,
                        transition: 'all 0.15s',
                      }}>{label}</button>
                    );
                  })}
                </div>

                {/* 운영 중 */}
                {mySubTab === 'owned' && (
                  ownedChallenges.length === 0
                    ? <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-muted)', fontSize: '13px' }}>
                        개설한 챌린지가 없어요
                        <div><button onClick={() => navigate('/create')} style={{ marginTop: '10px', padding: '6px 16px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>+ 개설하기</button></div>
                      </div>
                    : ownedChallenges.map((ch) => <MiniChallengeRow key={ch.id} ch={ch} isOwned />)
                )}

                {/* 참여 중 */}
                {mySubTab === 'joined' && (
                  joinedChallenges.length === 0
                    ? <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-muted)', fontSize: '13px' }}>참여 중인 챌린지가 없어요</div>
                    : joinedChallenges.map((ch) => <MiniChallengeRow key={ch.id} ch={ch} isOwned={false} onGiveUp={openGiveUp} />)
                )}
              </div>
            )}
          </section>
        )}

        {/* 챌린지 탐색 */}
        <section style={{ marginTop: '20px', marginBottom: '40px' }}>
          {searchQuery ? (
            <h2 style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '12px', color: 'var(--text-muted)' }}>
              '{searchQuery}' 검색 결과 {displayedChallenges.length}건
            </h2>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h2 style={{ fontSize: '16px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
                  챌린지 둘러보기 <Flame size={16} color="var(--primary)" />
                </h2>

                {/* 카테고리 드롭다운 */}
                <div ref={dropdownRef} style={{ position: 'relative' }}>
                  <button onClick={() => setShowCatDropdown((v) => !v)}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '20px', border: '1px solid var(--border-color)', background: activeTab === '전체' ? 'white' : '#FFF0EB', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold', color: activeTab === '전체' ? 'var(--text-muted)' : 'var(--primary)' }}>
                    {activeTab}
                    <ChevronDown size={14} />
                  </button>

                  {showCatDropdown && (
                    <div style={{ position: 'absolute', top: 'calc(100% + 6px)', right: 0, background: 'white', border: '1px solid var(--border-color)', borderRadius: '12px', boxShadow: '0 4px 16px rgba(0,0,0,0.1)', zIndex: 50, minWidth: '160px', overflow: 'hidden' }}>
                      {tabs.map((tab) => (
                        <button key={tab} onClick={() => { setActiveTab(tab); setShowCatDropdown(false); }}
                          style={{ width: '100%', padding: '10px 14px', textAlign: 'left', border: 'none', background: activeTab === tab ? '#FFF0EB' : 'white', color: activeTab === tab ? 'var(--primary)' : 'var(--text-main)', fontSize: '13px', fontWeight: (activeTab === tab || interests.includes(tab)) ? 'bold' : 'normal', cursor: 'pointer' }}>
                          {tab}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {loadingChallenges ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: '14px' }}>챌린지 불러오는 중...</div>
          ) : displayedChallenges.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: '14px' }}>검색 결과가 없어요</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {displayedChallenges.map((ch) => {
                // 사용자가 참여 중이면 인원 +1 반영
                const effectiveMembers = joinedIdsSet.has(String(ch.id)) ? (ch.members || 0) + 1 : (ch.members || 0);
                const maxM = ch.maxMembers || ch.max_members || 30;
                const status = getMemberStatus(effectiveMembers, maxM);
                return (
                  <div key={ch.id} onClick={() => navigate(`/challenge/${ch.id}`)}
                    style={{ background: 'var(--card-bg)', borderRadius: '12px', padding: '14px 16px', border: '1px solid var(--border-color)', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: 'bold' }}>{ch.category}</span>
                        <span style={{ fontSize: '11px', fontWeight: 'bold', color: status.textColor, background: status.bgColor, padding: '2px 7px', borderRadius: '10px' }}>{status.label}</span>
                      </div>
                      <div style={{ fontSize: '15px', fontWeight: 'bold', marginBottom: '6px' }}>{ch.title}</div>
                      <div style={{ display: 'flex', gap: '10px', fontSize: '12px', color: 'var(--text-muted)' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}><Users size={11} /> {effectiveMembers}/{maxM}명</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}><Wallet size={11} /> {ch.deposit?.toLocaleString()}원</span>
                      </div>
                    </div>
                    <ChevronRight size={18} color="var(--text-muted)" style={{ marginLeft: '10px', flexShrink: 0 }} />
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      <style>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* 중도 포기 모달 */}
      {giveUpModal && (
        <div onClick={closeGiveUp}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div onClick={(e) => e.stopPropagation()}
            style={{ width: '100%', maxWidth: '480px', background: 'white', borderRadius: '20px 20px 0 0', padding: '28px 24px 40px' }}>

            {giveUpStep === 1 ? (
              <>
                <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                  <div style={{ fontSize: '52px', marginBottom: '14px' }}>🔥</div>
                  <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '10px', color: 'var(--text-main)' }}>포기하기 전에 잠깐만요!</h3>
                  <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.7, margin: 0 }}>
                    챌린지 완주까지 앞으로<br />
                    <strong style={{ fontSize: '20px', color: 'var(--primary)' }}>D-{giveUpModal.dDay}</strong>일 남았어요.<br />
                    여기서 멈추기엔 너무 아깝잖아요.<br />
                    우리 좀 더 같이 달려봐요! 💪
                  </p>
                </div>
                <button onClick={closeGiveUp}
                  style={{ width: '100%', padding: '15px', background: 'var(--primary)', color: 'white', borderRadius: '12px', fontSize: '16px', fontWeight: 'bold', border: 'none', cursor: 'pointer', marginBottom: '10px' }}>
                  계속 도전할게요! 💪
                </button>
                <button onClick={() => setGiveUpStep(2)}
                  style={{ width: '100%', padding: '12px', background: 'none', color: 'var(--text-muted)', borderRadius: '12px', fontSize: '14px', border: 'none', cursor: 'pointer' }}>
                  그래도 포기할게요
                </button>
              </>
            ) : (
              <>
                <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                  <div style={{ fontSize: '52px', marginBottom: '14px' }}>⚠️</div>
                  <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '10px', color: '#EF4444' }}>중도 포기 = 실패 처리</h3>
                  <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.7, margin: 0 }}>
                    중도 포기는 챌린지 실패와 동일하게 처리돼요.<br />
                    납부하신 보증금{' '}
                    <strong style={{ color: '#EF4444' }}>{giveUpModal.deposit?.toLocaleString() ?? 0}원</strong>은<br />
                    <strong>반환되지 않습니다.</strong>
                  </p>
                </div>
                <button onClick={handleConfirmGiveUp}
                  style={{ width: '100%', padding: '15px', background: '#EF4444', color: 'white', borderRadius: '12px', fontSize: '16px', fontWeight: 'bold', border: 'none', cursor: 'pointer', marginBottom: '10px' }}>
                  포기하기
                </button>
                <button onClick={() => setGiveUpStep(1)}
                  style={{ width: '100%', padding: '12px', background: 'none', color: 'var(--text-muted)', borderRadius: '12px', fontSize: '14px', border: 'none', cursor: 'pointer' }}>
                  돌아가기
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
