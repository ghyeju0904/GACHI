import React, { useState, useEffect, useMemo } from 'react';
import { Search, Flame, Users, Coins, ChevronRight, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import { logEvent } from '../../services/logger';
import { getProfileId } from '../../utils/getProfileId';

export default function Explore() {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState('전체');
  const [searchQuery,    setSearchQuery]    = useState('');
  const [challenges,     setChallenges]     = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [favoriteIds,    setFavoriteIds]    = useState(new Set());

  useEffect(() => {
    logEvent('page_view', '/explore');

    const fetchChallenges = async () => {
      const { data, error } = await supabase
        .from('challenges')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (!error && data) setChallenges(data);
      setLoading(false);
    };
    fetchChallenges();

    const loadFavorites = async () => {
      const profileId = await getProfileId();
      if (!profileId) return;
      const { data } = await supabase.from('favorites').select('challenge_id').eq('user_id', profileId);
      setFavoriteIds(new Set((data || []).map((f) => String(f.challenge_id))));
    };
    loadFavorites();
  }, []);

  const toggleFavorite = async (e, challengeId) => {
    e.stopPropagation();
    const profileId = await getProfileId();
    if (!profileId) return;
    const key = String(challengeId);
    if (favoriteIds.has(key)) {
      await supabase.from('favorites').delete().eq('user_id', profileId).eq('challenge_id', challengeId);
      setFavoriteIds((prev) => { const next = new Set(prev); next.delete(key); return next; });
    } else {
      await supabase.from('favorites').upsert({ user_id: profileId, challenge_id: challengeId }, { onConflict: 'user_id,challenge_id' });
      setFavoriteIds((prev) => new Set(prev).add(key));
    }
  };

  const categories = useMemo(() => {
    const cats = [...new Set(challenges.map((c) => c.category))];
    return ['전체', ...cats];
  }, [challenges]);

  const displayed = useMemo(() => {
    let list = challenges;
    if (activeCategory !== '전체') list = list.filter((c) => c.category === activeCategory);
    if (searchQuery.trim()) {
      const q = searchQuery.trim();
      list = list.filter((c) => c.title.includes(q) || c.category.includes(q));
    }
    return list;
  }, [challenges, activeCategory, searchQuery]);

  return (
    <div style={{ padding: '0 20px 40px', backgroundColor: '#F8F9FA', minHeight: '100vh' }}>

      <header style={{ paddingTop: '20px', paddingBottom: '16px', background: 'var(--bg-color)', position: 'sticky', top: 0, zIndex: 10 }}>
        <h1 className="font-display" style={{ fontSize: '24px', marginBottom: '16px' }}>탐색</h1>
        <div style={{ position: 'relative' }}>
          <Search size={20} color="var(--text-muted)" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="어떤 챌린지를 찾으시나요?"
            style={{ width: '100%', padding: '14px 14px 14px 44px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'white', fontSize: '15px', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
          />
        </div>
      </header>

      {/* 카테고리 필터 */}
      <div className="hide-scrollbar" style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px', marginTop: '8px' }}>
        {categories.map((cat) => (
          <button key={cat} onClick={() => setActiveCategory(cat)} style={{
            padding: '8px 16px', borderRadius: '20px', flexShrink: 0, cursor: 'pointer',
            border: `1px solid ${activeCategory === cat ? 'var(--primary)' : 'var(--border-color)'}`,
            background: activeCategory === cat ? '#FFF0EB' : 'white',
            color: activeCategory === cat ? 'var(--primary)' : 'var(--text-muted)',
            fontSize: '14px', fontWeight: activeCategory === cat ? 'bold' : 'normal',
          }}>
            {cat}
          </button>
        ))}
      </div>

      {/* 챌린지 목록 */}
      <section style={{ marginTop: '20px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Flame size={18} color="var(--primary)" />
          {searchQuery ? `'${searchQuery}' 검색 결과 ${displayed.length}건` : '전체 챌린지'}
        </h2>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>불러오는 중...</div>
        ) : displayed.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>챌린지가 없어요</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {displayed.map((ch) => (
              <div key={ch.id} onClick={() => navigate(`/challenge/${ch.id}`)}
                style={{ background: 'white', borderRadius: '12px', padding: '16px', border: '1px solid var(--border-color)', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: 'bold' }}>{ch.category}</span>
                  <div style={{ fontSize: '15px', fontWeight: 'bold', margin: '4px 0 8px' }}>{ch.title}</div>
                  <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: 'var(--text-muted)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}><Users size={11} /> 0/{ch.max_members}명</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}><Coins size={11} /> 참여비 2P</span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '2px', flexShrink: 0 }}>
                  <button onClick={(e) => toggleFavorite(e, ch.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: '4px' }}>
                    <Star size={16} color={favoriteIds.has(String(ch.id)) ? '#FFD700' : 'var(--border-color)'} fill={favoriteIds.has(String(ch.id)) ? '#FFD700' : 'none'} />
                  </button>
                  <ChevronRight size={18} color="var(--text-muted)" style={{ marginLeft: '2px' }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <style>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
