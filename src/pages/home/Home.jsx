import React, { useState, useMemo, useEffect } from 'react';
import { Bell, Flame, ChevronRight, ChevronDown, ChevronUp, Search, Users, Wallet } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ALL_CHALLENGES = [
  { id: 1,  title: '새벽 5시 기상 루틴 21일',     category: '미라클모닝', members: 8,  maxMembers: 15, deposit: 10000 },
  { id: 2,  title: '매일 아침 6시 전 일어나기',     category: '미라클모닝', members: 12, maxMembers: 20, deposit: 5000  },
  { id: 3,  title: '하루 30분 홈트레이닝',          category: '운동',       members: 20, maxMembers: 30, deposit: 20000 },
  { id: 4,  title: '매일 만보 걷기 30일',           category: '운동',       members: 6,  maxMembers: 10, deposit: 10000 },
  { id: 5,  title: '매일 1시간 집중 공부',          category: '스터디',     members: 9,  maxMembers: 15, deposit: 15000 },
  { id: 6,  title: '자격증 합격 30일 스터디',       category: '스터디',     members: 5,  maxMembers: 10, deposit: 30000 },
  { id: 7,  title: '하루 1시간 바이브코딩',         category: '바이브코딩', members: 14, maxMembers: 20, deposit: 10000 },
  { id: 8,  title: '사이드 프로젝트 30일 완성',     category: '바이브코딩', members: 7,  maxMembers: 10, deposit: 20000 },
  { id: 9,  title: '하루 30분 독서 습관',           category: '독서',       members: 11, maxMembers: 20, deposit: 5000  },
  { id: 10, title: '다이어트 식단 21일 기록',       category: '다이어트',   members: 18, maxMembers: 30, deposit: 15000 },
  { id: 11, title: '매일 명상 10분',                category: '명상',       members: 6,  maxMembers: 15, deposit: 5000  },
  { id: 12, title: '영어 단어 20개 암기 30일',      category: '외국어',     members: 8,  maxMembers: 20, deposit: 10000 },
];

const JOINED_DUMMY = [
  { id: 7, title: '하루 1시간 바이브코딩', category: '바이브코딩', dDay: 14, streak: 5,  deposit: 10000, role: 'member' },
  { id: 5, title: '매일 1시간 집중 공부',  category: '스터디',     dDay: 22, streak: 12, deposit: 15000, role: 'member' },
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

  const [certByChallenge, setCertByChallenge] = useState({});
  const [ownedChallenges, setOwnedChallenges] = useState([]);
  const [joinedFromLS,    setJoinedFromLS]    = useState([]);
  const [myOpen,          setMyOpen]          = useState(false);
  const [mySubTab,        setMySubTab]        = useState('owned');  // owned | joined
  const [searchQuery,     setSearchQuery]     = useState('');
  const [activeTab,       setActiveTab]       = useState('추천');

  useEffect(() => {
    try { setCertByChallenge(JSON.parse(localStorage.getItem('certified_by_challenge') || '{}')); } catch {}
    try {
      const all = JSON.parse(localStorage.getItem('my_challenges') || '[]');
      setOwnedChallenges(all.filter((c) => c.role === 'owner'));
      setJoinedFromLS(all.filter((c) => c.role === 'member'));
    } catch {}
  }, []);

  const isCertifiedToday = (id) => (certByChallenge[String(id)] || []).includes(todayStr);

  // 참여 중 = localStorage member + JOINED_DUMMY (중복 제거)
  const joinedChallenges = useMemo(() => {
    const fromLS = joinedFromLS.map((c) => ({ ...c, fromLS: true }));
    const dummyIds = new Set(fromLS.map((c) => String(c.id)));
    const dummy = JOINED_DUMMY.filter((c) => !dummyIds.has(String(c.id)));
    return [...fromLS, ...dummy];
  }, [joinedFromLS]);

  const allMyChallenges = [...ownedChallenges, ...joinedChallenges];
  const pendingCount    = allMyChallenges.filter((c) => !isCertifiedToday(c.id)).length;

  const tabs = ['추천', ...interests, '전체'];

  // 사용자가 참여한 챌린지 ID Set (인원 카운트 +1용)
  const joinedIdsSet = useMemo(() => new Set(joinedFromLS.map((c) => String(c.id))), [joinedFromLS]);

  // 검색: ALL_CHALLENGES + 내 챌린지(owned) 포함
  const searchableAll = useMemo(() => {
    const map = new Map(ALL_CHALLENGES.map((c) => [String(c.id), c]));
    ownedChallenges.forEach((c) => {
      if (!map.has(String(c.id))) {
        map.set(String(c.id), { id: c.id, title: c.title, category: c.category, members: 0, maxMembers: c.memberCount || 10, deposit: c.deposit || 0 });
      }
    });
    return [...map.values()];
  }, [ownedChallenges]);

  const displayedChallenges = useMemo(() => {
    if (searchQuery.trim()) {
      const q = searchQuery.trim();
      return searchableAll.filter((c) => c.title.includes(q) || c.category.includes(q));
    }
    if (activeTab === '전체') return ALL_CHALLENGES;
    if (activeTab === '추천') return interests.length ? ALL_CHALLENGES.filter((c) => interests.includes(c.category)) : ALL_CHALLENGES.slice(0, 6);
    return ALL_CHALLENGES.filter((c) => c.category === activeTab);
  }, [searchQuery, activeTab, interests, searchableAll]);

  /* ── 내 챌린지 미니 탭 색상 ── */
  const SUB_TAB_STYLES = {
    owned:  { active: { bg: 'var(--primary)',   color: 'white' }, inactive: { bg: '#FFF0EB', color: 'var(--primary)' } },
    joined: { active: { bg: 'var(--secondary)', color: 'white' }, inactive: { bg: '#E8E8F0', color: 'var(--secondary)' } },
  };

  const MiniChallengeRow = ({ ch, isOwned }) => (
    <div onClick={() => navigate(`/feed/${ch.id}`)}
      style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 4px', borderBottom: '1px solid #F3F4F6', cursor: 'pointer' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ch.title}</div>
        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
          {isOwned
            ? `${ch.category} · ${ch.deposit?.toLocaleString() || 0}원`
            : `D-${ch.dDay} · 🔥 ${ch.streak}일`}
        </div>
      </div>
      <div style={{ marginLeft: '10px', flexShrink: 0 }}>
        {isCertifiedToday(ch.id)
          ? <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#10B981', background: '#D1FAE5', padding: '3px 8px', borderRadius: '20px' }}>✓ 완료</span>
          : !isOwned
            ? <button onClick={(e) => { e.stopPropagation(); navigate(`/certify/${ch.id}`); }}
                style={{ fontSize: '11px', fontWeight: 'bold', color: 'white', background: 'var(--primary)', padding: '5px 10px', borderRadius: '20px', border: 'none', cursor: 'pointer' }}>
                인증하기
              </button>
            : <ChevronRight size={16} color="var(--text-muted)" />
        }
      </div>
    </div>
  );

  return (
    <div style={{ backgroundColor: '#F8F9FA', minHeight: '100vh', paddingBottom: '20px' }}>

      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', background: 'var(--card-bg)', position: 'sticky', top: 0, zIndex: 10 }}>
        <h1 className="font-display" style={{ fontSize: '26px', color: 'var(--primary)', margin: 0, letterSpacing: '-0.5px' }}>GACHI</h1>
        <div style={{ position: 'relative', cursor: 'pointer' }} onClick={() => navigate('/notifications')}>
          <Bell size={24} color="var(--text-main)" />
          <span style={{ position: 'absolute', top: 0, right: 0, width: '8px', height: '8px', background: 'var(--primary)', borderRadius: '50%' }} />
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
                    : joinedChallenges.map((ch) => <MiniChallengeRow key={ch.id} ch={ch} isOwned={false} />)
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
              <h2 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                챌린지 둘러보기 <Flame size={16} color="var(--primary)" />
              </h2>
              <div className="hide-scrollbar" style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px', marginBottom: '14px' }}>
                {tabs.map((tab) => (
                  <button key={tab} onClick={() => setActiveTab(tab)} style={{
                    padding: '7px 14px', borderRadius: '20px', flexShrink: 0, cursor: 'pointer',
                    border: `1px solid ${activeTab === tab ? 'var(--primary)' : 'var(--border-color)'}`,
                    background: activeTab === tab ? 'var(--primary)' : 'white',
                    color: activeTab === tab ? 'white' : 'var(--text-muted)',
                    fontSize: '13px', fontWeight: activeTab === tab ? 'bold' : 'normal',
                  }}>
                    {tab === '추천' ? '🔥 추천' : tab}
                  </button>
                ))}
              </div>
            </>
          )}

          {displayedChallenges.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: '14px' }}>검색 결과가 없어요</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {displayedChallenges.map((ch) => {
                // 사용자가 참여 중이면 인원 +1 반영
                const effectiveMembers = joinedIdsSet.has(String(ch.id)) ? (ch.members || 0) + 1 : (ch.members || 0);
                const status = getMemberStatus(effectiveMembers, ch.maxMembers);
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
                        <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}><Users size={11} /> {effectiveMembers}/{ch.maxMembers}명</span>
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
    </div>
  );
}
