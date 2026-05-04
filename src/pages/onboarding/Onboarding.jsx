import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Flame } from 'lucide-react';

const MAX_SELECT = 5;

const CATEGORIES = [
  '미라클모닝', '운동', '스터디', '임장', '취준', '다이어트',
  '바이브코딩', '독서', '명상', '외국어', '절약', '글쓰기',
];

export default function Onboarding() {
  const navigate = useNavigate();
  const [selectedCats, setSelectedCats] = useState([]);

  const toggleCat = (cat) => {
    if (selectedCats.includes(cat)) {
      setSelectedCats(selectedCats.filter((c) => c !== cat));
    } else {
      if (selectedCats.length >= MAX_SELECT) return;
      setSelectedCats([...selectedCats, cat]);
    }
  };

  const handleComplete = () => {
    if (selectedCats.length < 1) return;
    localStorage.setItem('interests', JSON.stringify(selectedCats));
    navigate('/home');
  };

  const canSelect  = selectedCats.length < MAX_SELECT;
  const canProceed = selectedCats.length >= 1;

  return (
    <div style={{ backgroundColor: 'var(--secondary)', minHeight: '100vh', display: 'flex', flexDirection: 'column', color: 'white', padding: '40px 20px' }}>

      <div style={{ marginTop: '40px', marginBottom: '32px', textAlign: 'center' }}>
        {/* 로고 */}
        <h1 className="font-display" style={{ fontSize: '52px', color: 'var(--primary)', letterSpacing: '-1px', margin: 0, lineHeight: 1 }}>
          GACHI
        </h1>

        {/* 슬로건 */}
        <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.65)', marginTop: '10px', letterSpacing: '0.2px' }}>
          같이 도전하는 챌린지,{' '}
          <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>가치</span>
        </p>

        {/* 안내 문구 */}
        <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '14px', marginTop: '20px' }}>
          나에게 꼭 맞는 챌린지를 찾기 위해<br />관심사를 최대 5개 선택해주세요
        </p>

        {/* 선택 현황 — 불꽃 인디케이터 */}
        <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'center', gap: '8px' }}>
          {Array.from({ length: MAX_SELECT }).map((_, i) => (
            <Flame
              key={i}
              size={20}
              color={i < selectedCats.length ? 'var(--primary)' : 'rgba(255,255,255,0.18)'}
              fill={i < selectedCats.length ? 'var(--primary)' : 'rgba(255,255,255,0.05)'}
              style={{ transition: 'color 0.2s, fill 0.2s' }}
            />
          ))}
        </div>
      </div>

      {/* 카테고리 버튼 */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'center', marginBottom: 'auto' }}>
        {CATEGORIES.map((cat) => {
          const isSelected = selectedCats.includes(cat);
          const isDisabled = !isSelected && !canSelect;
          return (
            <button
              key={cat}
              onClick={() => toggleCat(cat)}
              style={{
                display: 'flex', alignItems: 'center', gap: '5px',
                background: isSelected ? 'var(--primary)' : 'rgba(255,255,255,0.1)',
                color: isDisabled ? 'rgba(255,255,255,0.3)' : 'white',
                border: `1px solid ${isSelected ? 'var(--primary)' : isDisabled ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.2)'}`,
                padding: '12px 20px',
                borderRadius: '24px',
                fontSize: '15px',
                fontWeight: isSelected ? 'bold' : 'normal',
                cursor: isDisabled ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {isSelected && <Flame size={14} color="white" fill="white" />}
              {cat}
            </button>
          );
        })}
      </div>

      <div style={{ marginTop: '40px' }}>
        <p style={{ textAlign: 'center', fontSize: '13px', color: 'rgba(255,255,255,0.45)', marginBottom: '12px' }}>
          {selectedCats.length === 0
            ? '관심사를 1개 이상 선택해주세요'
            : `${selectedCats.length}개 선택됨 (최대 ${MAX_SELECT}개)`}
        </p>
        <button
          onClick={handleComplete}
          disabled={!canProceed}
          style={{
            width: '100%', padding: '16px', borderRadius: '12px',
            background: canProceed ? 'var(--primary)' : 'rgba(255,255,255,0.2)',
            color: canProceed ? 'white' : 'rgba(255,255,255,0.5)',
            border: 'none', fontSize: '16px', fontWeight: 'bold',
            cursor: canProceed ? 'pointer' : 'not-allowed',
            transition: 'background 0.3s',
          }}
        >
          GACHI 시작하기
        </button>
      </div>
    </div>
  );
}
