import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Flame, Star, CheckCircle } from 'lucide-react';
import { supabase } from '../../services/supabase';
import { getDeviceId } from '../../utils/deviceId';
import { getProfileId } from '../../utils/getProfileId';
import { grantOnboardingReward } from '../../utils/onboardingRewards';
import gachiIllust from '../../assets/fonts/images/가치.png';

const MAX_SELECT = 5;

const CATEGORIES = [
  '미라클모닝', '스터디', '식단', '운동',
  '독서', '외국어', 'SNS 업로드', '기타'
];

export default function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0); // 0: 관심사 선택, 1: 모임 둘러보기
  const [selectedCats, setSelectedCats] = useState([]);

  const [previewChallenges, setPreviewChallenges] = useState([]);
  const [viewedId,   setViewedId]   = useState(null);
  const [favoriteId, setFavoriteId] = useState(null);

  const toggleCat = (cat) => {
    if (selectedCats.includes(cat)) {
      setSelectedCats(selectedCats.filter((c) => c !== cat));
    } else {
      if (selectedCats.length >= MAX_SELECT) return;
      setSelectedCats([...selectedCats, cat]);
    }
  };

  const handleInterestsDone = async () => {
    if (selectedCats.length < 1) return;
    localStorage.setItem('interests', JSON.stringify(selectedCats));

    try {
      await supabase
        .from('profiles')
        .upsert({ device_id: getDeviceId(), interests: selectedCats }, { onConflict: 'device_id' });
    } catch {}

    const profileId = await getProfileId();
    if (profileId) await grantOnboardingReward(profileId, 'interests');

    // 모임 둘러보기용 활성 챌린지 미리보기 (관심사 우선)
    try {
      const { data } = await supabase
        .from('challenges')
        .select('id, title, category, description, max_members')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(20);

      const list = data || [];
      const sorted = [
        ...list.filter((c) => selectedCats.includes(c.category)),
        ...list.filter((c) => !selectedCats.includes(c.category)),
      ].slice(0, 2);
      setPreviewChallenges(sorted);
    } catch {}

    setStep(1);
  };

  const handleViewIntro = async (ch) => {
    setViewedId(ch.id);
    const profileId = await getProfileId();
    if (profileId) await grantOnboardingReward(profileId, 'intro');
  };

  const handleFavorite = async (ch) => {
    const profileId = await getProfileId();
    if (!profileId) return;
    await supabase.from('favorites').upsert({ user_id: profileId, challenge_id: ch.id }, { onConflict: 'user_id,challenge_id' });
    setFavoriteId(ch.id);
    await grantOnboardingReward(profileId, 'favorite');
  };

  const finishOnboarding = () => navigate('/home');

  const canSelect  = selectedCats.length < MAX_SELECT;
  const canProceed = selectedCats.length >= 1;
  const canFinish  = viewedId !== null && favoriteId !== null;

  if (step === 1) {
    return (
      <div style={{ backgroundColor: 'var(--secondary)', minHeight: '100vh', display: 'flex', flexDirection: 'column', color: 'white', padding: '40px 20px' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '22px', fontWeight: 'bold', margin: 0 }}>운영 중인 모임을 살펴보세요</h2>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', marginTop: '10px', lineHeight: 1.6 }}>
            소개글을 확인하고, 마음에 드는 모임을 즐겨찾기 해보세요.<br />두 가지 모두 완료하면 포인트를 드려요!
          </p>
        </div>

        {previewChallenges.length === 0 ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.5)', fontSize: '14px' }}>
            아직 둘러볼 모임이 없어요
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {previewChallenges.map((ch) => (
              <div key={ch.id} onClick={() => handleViewIntro(ch)} style={{
                background: viewedId === ch.id ? 'rgba(255,92,53,0.15)' : 'rgba(255,255,255,0.06)',
                border: `1.5px solid ${viewedId === ch.id ? 'var(--primary)' : 'rgba(255,255,255,0.12)'}`,
                borderRadius: '16px', padding: '18px', cursor: 'pointer',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: 'bold' }}>{ch.category}</span>
                    <div style={{ fontSize: '16px', fontWeight: 'bold', margin: '4px 0' }}>{ch.title}</div>
                    {viewedId === ch.id && (
                      <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.65)', lineHeight: 1.6, marginTop: '8px' }}>
                        {ch.description || '소개글이 아직 없어요.'}
                      </p>
                    )}
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); handleFavorite(ch); }} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: '4px', flexShrink: 0 }}>
                    <Star size={22} color={favoriteId === ch.id ? '#FFD700' : 'rgba(255,255,255,0.4)'} fill={favoriteId === ch.id ? '#FFD700' : 'none'} />
                  </button>
                </div>
                {viewedId === ch.id && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '10px', fontSize: '12px', color: 'var(--primary)', fontWeight: 'bold' }}>
                    <CheckCircle size={13} /> 소개글 확인 완료
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div style={{ marginTop: 'auto', paddingTop: '32px' }}>
          <p style={{ textAlign: 'center', fontSize: '13px', color: 'rgba(255,255,255,0.45)', marginBottom: '12px' }}>
            {canFinish ? '모두 완료했어요! 🎉' : '소개글 확인과 즐겨찾기를 모두 진행해주세요'}
          </p>
          <button onClick={finishOnboarding} disabled={!canFinish} style={{
            width: '100%', padding: '16px', borderRadius: '12px',
            background: canFinish ? 'var(--primary)' : 'rgba(255,255,255,0.2)',
            color: canFinish ? 'white' : 'rgba(255,255,255,0.5)',
            border: 'none', fontSize: '16px', fontWeight: 'bold',
            cursor: canFinish ? 'pointer' : 'not-allowed',
          }}>
            GACHI 시작하기
          </button>
          {!canFinish && previewChallenges.length > 0 && (
            <button onClick={finishOnboarding} style={{ width: '100%', padding: '10px', marginTop: '8px', background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: '12px', cursor: 'pointer' }}>
              건너뛰기
            </button>
          )}
        </div>
      </div>
    );
  }

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

        {/* 일러스트 */}
        <img
          src={gachiIllust}
          alt="가치 일러스트"
          style={{ width: '200px', height: '200px', objectFit: 'contain', marginTop: '20px' }}
        />

        {/* 안내 문구 */}
        <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '14px', marginTop: '12px' }}>
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
          onClick={handleInterestsDone}
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
          다음
        </button>
      </div>
    </div>
  );
}
