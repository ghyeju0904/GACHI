import React, { useState } from 'react';
import { Search, Flame, Users } from 'lucide-react';

/**
 * Explore.jsx (S-04)
 * 챌린지 탐색 페이지
 * - 가로 스크롤 카테고리 필터
 * - AI 추천 TOP 5 (상단 고정)
 * - 전체 챌린지 목록 (최신순 등 정렬 생략/더미배치)
 */
export default function Explore() {
  const [activeCategory, setActiveCategory] = useState('전체');
  const categories = ['전체', '미라클모닝', '운동', '스터디', '바이브코딩', '다이어트'];

  const recommended = [
    { title: '매일 코드 1줄 작성', category: '개발', members: 12, max: 30 },
    { title: '아침 7시 달리기', category: '운동', members: 5, max: 10 }
  ];

  return (
    <div style={{ padding: '0 20px 40px 20px', backgroundColor: '#F8F9FA', minHeight: '100vh' }}>
      
      {/* 1. 상단 타이틀 & 검색 바 */}
      <header style={{ paddingTop: '20px', paddingBottom: '16px', background: 'var(--bg-color)', position: 'sticky', top: 0, zIndex: 10 }}>
        <h1 className="font-display" style={{ fontSize: '24px', marginBottom: '16px' }}>탐색</h1>
        <div style={{ position: 'relative' }}>
          <Search size={20} color="var(--text-muted)" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
          <input 
            type="text" 
            placeholder="어떤 챌린지를 찾으시나요?" 
            style={{ 
              width: '100%', padding: '14px 14px 14px 44px', borderRadius: '12px', border: '1px solid var(--border-color)', 
              background: 'white', fontSize: '15px', fontFamily: 'inherit', outline: 'none'
            }} 
          />
        </div>
      </header>

      {/* 2. 카테고리 칩 (수평 스크롤) */}
      <div className="hide-scrollbar" style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px', marginTop: '8px' }}>
        {categories.map(cat => (
          <button 
            key={cat} onClick={() => setActiveCategory(cat)}
            style={{ 
              padding: '8px 16px', borderRadius: '20px', border: `1px solid ${activeCategory === cat ? 'var(--primary)' : 'var(--border-color)'}`,
              background: activeCategory === cat ? '#FFF0EB' : 'white', color: activeCategory === cat ? 'var(--primary)' : 'var(--text-muted)',
              fontSize: '14px', fontWeight: activeCategory === cat ? 'bold' : 'normal', flexShrink: 0, cursor: 'pointer'
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* 3. AI 추천 TOP 5 */}
      <section style={{ marginTop: '24px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Flame size={18} color="var(--primary)" /> 나에게 딱 맞는 챌린지
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {recommended.map((item, idx) => (
            <div key={idx} style={{ background: 'white', borderRadius: '12px', padding: '16px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: 'var(--primary)', fontWeight: 'bold' }}>{item.category}</span>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Users size={14} /> {item.members}/{item.max}명
                </span>
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: 'bold' }}>{item.title}</h3>
            </div>
          ))}
        </div>
      </section>

      <style>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
