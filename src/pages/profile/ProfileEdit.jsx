import React, { useState, useEffect } from 'react';
import { ArrowLeft, Check, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import { getDeviceId } from '../../utils/deviceId';
import { getProfileId } from '../../utils/getProfileId';
import { logEvent } from '../../services/logger';

const AVATAR_OPTIONS = ['🐰', '🐻', '🦊', '🐯', '🐧', '🦁', '🐸', '🐨', '🐼', '🦝'];
const DEFAULT_PROFILE = { avatar: '🐰', nickname: '', bio: '' };

export default function ProfileEdit() {
  const navigate = useNavigate();
  const [avatar,   setAvatar]   = useState(DEFAULT_PROFILE.avatar);
  const [nickname, setNickname] = useState(DEFAULT_PROFILE.nickname);
  const [bio,      setBio]      = useState(DEFAULT_PROFILE.bio);
  const [saving,   setSaving]   = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [withdrawStep, setWithdrawStep] = useState(1);
  const [withdrawing,  setWithdrawing]  = useState(false);

  useEffect(() => {
    logEvent('page_view', '/profile/edit');

    // localStorage 우선 로드
    try {
      const local = JSON.parse(localStorage.getItem('profile') || 'null');
      if (local) {
        setAvatar(local.avatar   || DEFAULT_PROFILE.avatar);
        setNickname(local.nickname || '');
        setBio(local.bio          || '');
        return; // localStorage에 있으면 Supabase 호출 생략
      }
    } catch { /* ignore */ }

    // localStorage 없으면 Supabase에서 fetch
    async function fetchProfile() {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('avatar, nickname, bio')
          .eq('device_id', getDeviceId())
          .single();
        if (data) {
          setAvatar(data.avatar   || DEFAULT_PROFILE.avatar);
          setNickname(data.nickname || '');
          setBio(data.bio          || '');
        }
      } catch { /* Supabase 미설정 환경에서는 무시 */ }
    }
    fetchProfile();
  }, []);

  const handleSave = async () => {
    if (!nickname.trim()) return;
    setSaving(true);

    const profileData = { avatar, nickname: nickname.trim(), bio: bio.trim() };

    // 1. localStorage에 즉시 저장 (항상 성공)
    localStorage.setItem('profile', JSON.stringify(profileData));

    // 2. Supabase에도 저장 시도 (설정된 경우)
    try {
      await supabase
        .from('profiles')
        .upsert(
          { device_id: getDeviceId(), ...profileData, updated_at: new Date().toISOString() },
          { onConflict: 'device_id' }
        );
      await logEvent('profile_update', '/profile/edit', { avatar, nickname });
    } catch { /* Supabase 미설정 환경에서는 무시 */ }

    setSaving(false);
    navigate('/profile');
  };

  const handleWithdraw = async () => {
    setWithdrawing(true);
    try {
      const profileId = await getProfileId();
      if (profileId) {
        await supabase.rpc('withdraw_account', { p_user: profileId });
      }
    } catch { /* 실패해도 로컬 상태는 초기화한다 */ }

    localStorage.clear();
    navigate('/onboarding');
  };

  return (
    <div style={{ backgroundColor: '#F8F9FA', minHeight: '100vh' }}>
      <header style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '16px 20px', background: 'white', borderBottom: '1px solid var(--border-color)',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <button onClick={() => navigate('/profile')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'var(--text-main)' }}>
          <ArrowLeft size={22} />
        </button>
        <h1 style={{ fontSize: '17px', fontWeight: 'bold', margin: 0 }}>프로필 수정</h1>
        <button onClick={handleSave} disabled={saving || !nickname.trim()}
          style={{ background: 'none', border: 'none', cursor: nickname.trim() ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', color: nickname.trim() ? 'var(--primary)' : 'var(--text-muted)', opacity: saving ? 0.4 : 1 }}>
          <Check size={24} />
        </button>
      </header>

      <div style={{ padding: '32px 20px', display: 'flex', flexDirection: 'column', gap: '32px' }}>

        {/* 아바타 선택 */}
        <section>
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#FFF0EB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '36px', margin: '0 auto 8px' }}>
              {avatar}
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>캐릭터를 선택하세요</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px' }}>
            {AVATAR_OPTIONS.map((emoji) => (
              <button key={emoji} onClick={() => setAvatar(emoji)} style={{
                aspectRatio: '1/1', background: avatar === emoji ? '#FFF0EB' : 'white',
                border: avatar === emoji ? '2px solid var(--primary)' : '2px solid var(--border-color)',
                borderRadius: '12px', fontSize: '28px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s',
              }}>{emoji}</button>
            ))}
          </div>
        </section>

        {/* 닉네임 */}
        <section>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', marginBottom: '8px' }}>
            닉네임 <span style={{ color: 'var(--primary)' }}>*</span>
          </label>
          <input type="text" value={nickname} onChange={(e) => setNickname(e.target.value)} maxLength={12}
            placeholder="닉네임을 입력하세요"
            style={{ width: '100%', padding: '14px 16px', borderRadius: '10px', border: `1.5px solid ${nickname ? 'var(--border-color)' : 'var(--primary)'}`, fontSize: '15px', background: 'white', boxSizing: 'border-box', outline: 'none' }}
            onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
            onBlur={(e)  => e.target.style.borderColor = nickname ? 'var(--border-color)' : 'var(--primary)'}
          />
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px', textAlign: 'right' }}>{nickname.length}/12</p>
        </section>

        {/* 한 줄 소개 */}
        <section>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', marginBottom: '8px' }}>한 줄 소개</label>
          <input type="text" value={bio} onChange={(e) => setBio(e.target.value)} maxLength={30}
            placeholder="나를 한 줄로 표현해보세요"
            style={{ width: '100%', padding: '14px 16px', borderRadius: '10px', border: '1.5px solid var(--border-color)', fontSize: '15px', background: 'white', boxSizing: 'border-box', outline: 'none' }}
            onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
            onBlur={(e)  => e.target.style.borderColor = 'var(--border-color)'}
          />
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px', textAlign: 'right' }}>{bio.length}/30</p>
        </section>

        <button onClick={handleSave} disabled={saving || !nickname.trim()} style={{
          background: nickname.trim() ? 'var(--primary)' : '#E5E7EB',
          color: nickname.trim() ? 'white' : 'var(--text-muted)',
          padding: '16px', borderRadius: '12px', fontSize: '16px', fontWeight: 'bold',
          border: 'none', cursor: nickname.trim() ? 'pointer' : 'not-allowed', width: '100%',
          opacity: saving ? 0.6 : 1,
        }}>
          {saving ? '저장 중...' : '저장하기'}
        </button>

        {/* 위험 구역: 서비스 탈퇴 */}
        <section style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid var(--border-color)' }}>
          <button onClick={() => { setShowWithdraw(true); setWithdrawStep(1); }} style={{
            width: '100%', padding: '14px', background: 'none', border: '1px solid #FFD4C8',
            borderRadius: '12px', color: '#EF4444', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer',
          }}>
            서비스 탈퇴하기
          </button>
        </section>
      </div>

      {showWithdraw && (
        <div onClick={() => !withdrawing && setShowWithdraw(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div onClick={(e) => e.stopPropagation()}
            style={{ width: '100%', maxWidth: '480px', background: 'white', borderRadius: '20px 20px 0 0', padding: '28px 24px 40px' }}>
            {withdrawStep === 1 ? (
              <>
                <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                  <AlertTriangle size={44} color="#EF4444" style={{ marginBottom: '14px' }} />
                  <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '10px', color: '#EF4444' }}>정말 탈퇴하시겠어요?</h3>
                  <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.7, margin: 0 }}>
                    탈퇴 시 <strong>개설한 모임</strong>과<br /><strong>보유 포인트</strong>가 즉시 소멸되며<br />복구할 수 없어요.
                  </p>
                </div>
                <button onClick={() => setWithdrawStep(2)}
                  style={{ width: '100%', padding: '15px', background: '#EF4444', color: 'white', borderRadius: '12px', fontSize: '16px', fontWeight: 'bold', border: 'none', cursor: 'pointer', marginBottom: '10px' }}>
                  계속 진행할게요
                </button>
                <button onClick={() => setShowWithdraw(false)}
                  style={{ width: '100%', padding: '12px', background: 'none', color: 'var(--text-muted)', borderRadius: '12px', fontSize: '14px', border: 'none', cursor: 'pointer' }}>
                  취소
                </button>
              </>
            ) : (
              <>
                <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                  <div style={{ fontSize: '44px', marginBottom: '14px' }}>👋</div>
                  <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '10px' }}>마지막 확인이에요</h3>
                  <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.7, margin: 0 }}>
                    이 버튼을 누르면 즉시 탈퇴 처리돼요.
                  </p>
                </div>
                <button onClick={handleWithdraw} disabled={withdrawing}
                  style={{ width: '100%', padding: '15px', background: withdrawing ? '#FCA5A5' : '#EF4444', color: 'white', borderRadius: '12px', fontSize: '16px', fontWeight: 'bold', border: 'none', cursor: withdrawing ? 'default' : 'pointer', marginBottom: '10px' }}>
                  {withdrawing ? '처리 중...' : '탈퇴하기'}
                </button>
                <button onClick={() => setWithdrawStep(1)} disabled={withdrawing}
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
