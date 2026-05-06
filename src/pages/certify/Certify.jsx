import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Camera, CheckSquare, Edit3, Image, X, CheckCircle, ShieldCheck } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { logEvent } from '../../services/logger';
import { supabase } from '../../services/supabase';
import { getProfileId } from '../../utils/getProfileId';

const KEY_TO_LABEL = { photo: '사진 인증', text: '텍스트 인증', check: '체크인' };

export default function Certify() {
  const navigate = useNavigate();
  const { id }   = useParams();

  const today = new Date().toISOString().split('T')[0];

  const [allowedType,    setAllowedType]    = useState(null);
  const [activeTab,      setActiveTab]      = useState('photo');
  const [isKicked,       setIsKicked]       = useState(false);
  const [photoPreview,   setPhotoPreview]   = useState(null);
  const [photoBase64,    setPhotoBase64]    = useState(null);
  const [textValue,      setTextValue]      = useState('');
  const [commentValue,   setCommentValue]   = useState('');
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const galleryInputRef = useRef(null);
  const cameraInputRef  = useRef(null);

  // 강퇴 여부 확인
  useEffect(() => {
    const checkKicked = async () => {
      const profileId = await getProfileId();
      if (!profileId) return;
      const { data } = await supabase
        .from('challenge_members')
        .select('status')
        .eq('challenge_id', id)
        .eq('user_id', profileId)
        .single();
      if (data?.status === 'kicked') setIsKicked(true);
    };
    checkKicked();
  }, [id]);

  // Supabase에서 인증 방식 fetch
  useEffect(() => {
    const fetchCertifyType = async () => {
      const { data, error } = await supabase
        .from('challenges')
        .select('certify_type')
        .eq('id', id)
        .single();

      if (!error && data) {
        setAllowedType(data.certify_type);
        setActiveTab(data.certify_type);
      } else {
        // localStorage fallback (내가 개설한 챌린지)
        try {
          const owned = JSON.parse(localStorage.getItem('my_challenges') || '[]');
          const ch = owned.find((c) => String(c.id) === String(id));
          if (ch?.certifyType) {
            setAllowedType(ch.certifyType);
            setActiveTab(ch.certifyType);
          }
        } catch {}
      }
    };
    fetchCertifyType();
  }, [id]);

  const alreadyCertified = (() => {
    try {
      const data = JSON.parse(localStorage.getItem('certified_by_challenge') || '{}');
      return (data[id] || []).includes(today);
    } catch { return false; }
  })();

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoPreview(URL.createObjectURL(file));
      const reader = new FileReader();
      reader.onload = (ev) => setPhotoBase64(ev.target.result);
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const handleUpload = async () => {
    // 1. 인증 날짜 로컬 기록
    const certData = JSON.parse(localStorage.getItem('certified_by_challenge') || '{}');
    if (!certData[id]) certData[id] = [];
    if (!certData[id].includes(today)) certData[id].push(today);
    localStorage.setItem('certified_by_challenge', JSON.stringify(certData));

    const dates = JSON.parse(localStorage.getItem('certified_dates') || '[]');
    if (!dates.includes(today)) {
      localStorage.setItem('certified_dates', JSON.stringify([...dates, today]));
    }

    // 2. Supabase에 인증 저장 (모든 유저 공유)
    try {
      const profileId = await getProfileId();
      if (profileId) {
        let photoUrl = null;

        // 사진 → Supabase Storage 업로드
        if (activeTab === 'photo' && photoBase64) {
          const blob     = await fetch(photoBase64).then((r) => r.blob());
          const fileName = `${id}/${profileId}/${today}.jpg`;
          const { data: uploadData } = await supabase.storage
            .from('cert-photos')
            .upload(fileName, blob, { upsert: true, contentType: 'image/jpeg' });
          if (uploadData) {
            const { data: urlData } = supabase.storage
              .from('cert-photos')
              .getPublicUrl(fileName);
            photoUrl = urlData.publicUrl;
          }
        }

        await supabase.from('certifications').upsert({
          challenge_id: id,
          user_id:      profileId,
          cert_date:    today,
          type:         activeTab,
          content:      activeTab === 'text' ? textValue.trim() : (commentValue.trim() || null),
          photo_url:    photoUrl,
        }, { onConflict: 'challenge_id,user_id,cert_date' });
      }
    } catch (e) {
      console.error('인증 저장 실패:', e);
    }

    logEvent('certification_submit', `/certify/${id}`, { challenge_id: id, type: activeTab });
    navigate(`/feed/${id || 1}`);
  };

  const ALL_TABS = [
    { id: 'photo', label: '사진 인증',   icon: <Camera size={18} /> },
    { id: 'text',  label: '텍스트 인증', icon: <Edit3 size={18} /> },
    { id: 'check', label: '체크인',      icon: <CheckSquare size={18} /> },
  ];

  /* allowedType이 있으면 해당 탭 하나만, 없으면 전체 */
  const visibleTabs = allowedType ? ALL_TABS.filter((t) => t.id === allowedType) : ALL_TABS;

  if (isKicked) return (
    <div style={{ backgroundColor: '#F8F9FA', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
      <div style={{ fontSize: '48px', marginBottom: '16px' }}>🚫</div>
      <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '8px' }}>접근 불가</h2>
      <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '24px' }}>강퇴 당한 챌린지입니다.</p>
      <button onClick={() => navigate('/home')}
        style={{ padding: '12px 28px', background: 'var(--primary)', color: 'white', borderRadius: '12px', border: 'none', fontSize: '15px', fontWeight: 'bold', cursor: 'pointer' }}>
        홈으로 돌아가기
      </button>
    </div>
  );

  return (
    <div style={{ backgroundColor: '#F8F9FA', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header style={{ padding: '16px 20px', background: 'white', display: 'flex', alignItems: 'center', borderBottom: '1px solid var(--border-color)', position: 'sticky', top: 0, zIndex: 10 }}>
        <ArrowLeft size={24} style={{ cursor: 'pointer', marginRight: '16px' }} onClick={() => navigate(-1)} />
        <div>
          <h1 className="font-display" style={{ fontSize: '17px', margin: 0 }}>오늘의 챌린지 인증</h1>
          {allowedType && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
              <ShieldCheck size={12} color="var(--primary)" />
              <span style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: 'bold' }}>
                개설자 설정: {KEY_TO_LABEL[allowedType]}만 허용
              </span>
            </div>
          )}
        </div>
      </header>

      <div style={{ padding: '20px', flex: 1 }}>
        {/* 탭 — 허용된 방식이 1개면 탭 버튼 숨김 */}
        {visibleTabs.length > 1 && (
          <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
            {visibleTabs.map((t) => (
              <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
                flex: 1, padding: '12px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                background: activeTab === t.id ? '#1A1A2E' : 'white',
                color: activeTab === t.id ? 'white' : 'var(--text-muted)',
                borderRadius: '8px', border: `1px solid ${activeTab === t.id ? '#1A1A2E' : 'var(--border-color)'}`,
                fontWeight: activeTab === t.id ? 'bold' : 'normal', cursor: 'pointer',
              }}>
                {t.icon} <span style={{ fontSize: '13px' }}>{t.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* 허용된 방식이 1개일 때: 방식 안내 칩 */}
        {visibleTabs.length === 1 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', padding: '10px 14px', background: '#FFF0EB', borderRadius: '10px' }}>
            {visibleTabs[0].icon}
            <span style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--primary)' }}>{visibleTabs[0].label}으로 인증</span>
          </div>
        )}

        {/* 사진 인증 */}
        {(allowedType === 'photo' || (!allowedType && activeTab === 'photo')) && (
          <>
            <div onClick={!photoPreview ? () => setShowPhotoModal(true) : undefined}
              style={{ background: '#E5E7EB', borderRadius: '16px', height: '240px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', position: 'relative', overflow: 'hidden', cursor: !photoPreview ? 'pointer' : 'default' }}>
              {photoPreview ? (
                <>
                  <img src={photoPreview} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button onClick={() => { setPhotoPreview(null); setPhotoBase64(null); }}
                    style={{ position: 'absolute', top: '12px', right: '12px', background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%', padding: '6px', color: 'white', cursor: 'pointer', display: 'flex' }}>
                    <X size={16} />
                  </button>
                  <button onClick={() => setShowPhotoModal(true)}
                    style={{ position: 'absolute', bottom: '12px', right: '12px', background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '20px', padding: '6px 12px', color: 'white', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>
                    변경
                  </button>
                </>
              ) : (
                <>
                  <Image size={40} style={{ marginBottom: '12px', opacity: 0.5 }} />
                  <span style={{ fontSize: '14px', fontWeight: 'bold' }}>탭하여 사진 선택</span>
                  <span style={{ fontSize: '12px', marginTop: '6px', opacity: 0.6 }}>카메라 촬영 또는 앨범에서 가져오기</span>
                </>
              )}
            </div>
            <input type="file" accept="image/*" ref={galleryInputRef} style={{ display: 'none' }} onChange={handlePhotoChange} />
            <input type="file" accept="image/*" capture="environment" ref={cameraInputRef} style={{ display: 'none' }} onChange={handlePhotoChange} />
            {showPhotoModal && (
              <div onClick={() => setShowPhotoModal(false)}
                style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'flex-end' }}>
                <div onClick={(e) => e.stopPropagation()}
                  style={{ width: '100%', background: 'white', borderRadius: '20px 20px 0 0', padding: '24px 20px 36px' }}>
                  <div style={{ width: '40px', height: '4px', background: '#E5E7EB', borderRadius: '2px', margin: '0 auto 24px' }} />
                  <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '16px', textAlign: 'center' }}>사진 가져오기</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <button onClick={() => { setShowPhotoModal(false); cameraInputRef.current?.click(); }}
                      style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', background: '#F8F9FA', border: '1px solid var(--border-color)', borderRadius: '12px', cursor: 'pointer', fontSize: '15px', fontWeight: 'bold' }}>
                      <Camera size={22} color="var(--primary)" /> 카메라로 촬영
                    </button>
                    <button onClick={() => { setShowPhotoModal(false); galleryInputRef.current?.click(); }}
                      style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', background: '#F8F9FA', border: '1px solid var(--border-color)', borderRadius: '12px', cursor: 'pointer', fontSize: '15px', fontWeight: 'bold' }}>
                      <Image size={22} color="var(--primary)" /> 앨범에서 선택
                    </button>
                    <button onClick={() => setShowPhotoModal(false)}
                      style={{ padding: '16px', background: 'none', border: 'none', borderRadius: '12px', cursor: 'pointer', fontSize: '15px', color: 'var(--text-muted)' }}>
                      취소
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* 텍스트 인증 */}
        {(allowedType === 'text' || (!allowedType && activeTab === 'text')) && (
          <textarea
            value={textValue} onChange={(e) => setTextValue(e.target.value)}
            placeholder="오늘의 인증 내용을 자세히 작성해주세요. (최소 10자 이상)"
            style={{ width: '100%', height: '240px', padding: '16px', borderRadius: '16px', border: '1px solid var(--border-color)', resize: 'none', outline: 'none', fontSize: '15px', fontFamily: 'inherit', boxSizing: 'border-box' }} />
        )}

        {/* 체크인 */}
        {(allowedType === 'check' || (!allowedType && activeTab === 'check')) && (
          <div style={{ background: 'white', padding: '40px 20px', borderRadius: '16px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
            <button style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'var(--primary)', color: 'white', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
              <CheckSquare size={36} />
            </button>
            <p style={{ marginTop: '16px', fontSize: '15px', fontWeight: 'bold' }}>단순 체크인으로 바로 인증을 완료합니다!</p>
          </div>
        )}

        <div style={{ marginTop: '24px' }}>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', marginBottom: '8px' }}>한 줄 코멘트 (선택)</label>
          <input
            type="text" value={commentValue} onChange={(e) => setCommentValue(e.target.value)}
            placeholder="인증글과 함께 피드에 보여질 짧은 한 마디!"
            style={{ width: '100%', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)', fontSize: '15px', outline: 'none', boxSizing: 'border-box' }} />
        </div>
      </div>

      <div style={{ padding: '20px', background: 'white', borderTop: '1px solid var(--border-color)', marginTop: 'auto' }}>
        <button onClick={alreadyCertified ? undefined : handleUpload}
          style={{ width: '100%', padding: '16px', background: alreadyCertified ? '#E5E7EB' : 'var(--primary)', color: alreadyCertified ? 'var(--text-muted)' : 'white', borderRadius: '12px', fontSize: '16px', fontWeight: 'bold', border: 'none', cursor: alreadyCertified ? 'not-allowed' : 'pointer' }}>
          {alreadyCertified ? '오늘 이미 인증 완료' : '업로드하기'}
        </button>
      </div>

      {/* 이미 인증 완료 모달 */}
      {alreadyCertified && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div style={{ background: 'white', borderRadius: '20px', padding: '32px 24px', textAlign: 'center', width: '100%', maxWidth: '320px' }}>
            <CheckCircle size={56} color="var(--success)" style={{ marginBottom: '16px' }} />
            <h3 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '8px' }}>오늘 인증 완료!</h3>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '24px' }}>
              이미 오늘의 인증을 마쳤어요.<br />내일 또 만나요!
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => navigate(-1)}
                style={{ flex: 1, padding: '13px', borderRadius: '10px', border: '1.5px solid var(--border-color)', background: 'white', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' }}>
                닫기
              </button>
              <button onClick={() => navigate(`/feed/${id || 1}`)}
                style={{ flex: 2, padding: '13px', borderRadius: '10px', border: 'none', background: 'var(--primary)', color: 'white', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' }}>
                그룹 피드 보기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
