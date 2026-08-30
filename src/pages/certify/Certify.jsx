import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Camera, CheckSquare, Edit3, Image, X, ShieldCheck } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { logEvent } from '../../services/logger';
import { supabase } from '../../services/supabase';
import { getProfileId } from '../../utils/getProfileId';

const KEY_TO_LABEL = { photo: '사진 인증', text: '텍스트 인증', check: '체크인' };

export default function Certify() {
  const navigate = useNavigate();
  const { id }   = useParams();

  const today = new Date().toISOString().split('T')[0];

  const [allowedTypes,   setAllowedTypes]   = useState([]);
  const [activeTab,      setActiveTab]      = useState(null);
  const [isKicked,       setIsKicked]       = useState(false);
  const [photoPreview,   setPhotoPreview]   = useState(null);
  const [photoBase64,    setPhotoBase64]    = useState(null);
  const [textValue,      setTextValue]      = useState('');
  const [commentValue,   setCommentValue]   = useState('');
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [existingCert,   setExistingCert]   = useState(null);
  const [editing,        setEditing]        = useState(false);
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
    const fetchCertifyTypes = async () => {
      const { data, error } = await supabase
        .from('challenges')
        .select('certify_types')
        .eq('id', id)
        .single();

      let types = [];
      if (!error && data?.certify_types?.length) {
        types = data.certify_types;
      } else {
        try {
          const owned = JSON.parse(localStorage.getItem('my_challenges') || '[]');
          const ch = owned.find((c) => String(c.id) === String(id));
          if (ch?.certifyTypes?.length) types = ch.certifyTypes;
        } catch {}
      }
      setAllowedTypes(types);
      setActiveTab(types[0] || 'photo');
    };
    fetchCertifyTypes();
  }, [id]);

  // 오늘 이미 제출한 인증이 있는지 확인 (수정 모드 지원)
  useEffect(() => {
    const fetchExisting = async () => {
      const profileId = await getProfileId();
      if (!profileId) return;
      const { data } = await supabase
        .from('certifications')
        .select('*')
        .eq('challenge_id', id)
        .eq('user_id', profileId)
        .eq('cert_date', today)
        .maybeSingle();
      if (data) {
        setExistingCert(data);
        setActiveTab(data.type);
        if (data.type === 'text') setTextValue(data.content || '');
        else setCommentValue(data.content || '');
        if (data.photo_url) setPhotoPreview(data.photo_url);
      }
    };
    fetchExisting();
  }, [id]);

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
        let photoUrl = existingCert?.photo_url || null;

        // 사진 → Supabase Storage 업로드 (새로 고른 경우만)
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

        if (existingCert) {
          // 수정: 1일 1회 한정
          const { error: updateError } = await supabase
            .from('certifications')
            .update({
              type:       activeTab,
              content:    activeTab === 'text' ? textValue.trim() : (commentValue.trim() || null),
              photo_url:  photoUrl,
              edit_count: (existingCert.edit_count || 0) + 1,
            })
            .eq('id', existingCert.id);
          if (updateError) throw updateError;
        } else {
          const { error: certError } = await supabase.from('certifications').insert({
            challenge_id: id,
            user_id:      profileId,
            cert_date:    today,
            type:         activeTab,
            content:      activeTab === 'text' ? textValue.trim() : (commentValue.trim() || null),
            photo_url:    photoUrl,
          });
          if (certError) throw certError;
        }
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

  const visibleTabs = allowedTypes.length ? ALL_TABS.filter((t) => allowedTypes.includes(t.id)) : ALL_TABS;
  const canEditMore  = !existingCert || (existingCert.edit_count || 0) < 1;

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
          <h1 className="font-display" style={{ fontSize: '17px', margin: 0 }}>
            {existingCert ? '오늘의 인증 수정' : '오늘의 챌린지 인증'}
          </h1>
          {allowedTypes.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
              <ShieldCheck size={12} color="var(--primary)" />
              <span style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: 'bold' }}>
                개설자 설정: {allowedTypes.map((t) => KEY_TO_LABEL[t]).join(' · ')}
              </span>
            </div>
          )}
        </div>
      </header>

      <div style={{ padding: '20px', flex: 1 }}>
        {existingCert && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', padding: '10px 14px', background: canEditMore ? '#FFFBEB' : '#F3F4F6', borderRadius: '10px', fontSize: '13px', color: canEditMore ? '#F59E0B' : 'var(--text-muted)', fontWeight: 'bold' }}>
            {canEditMore ? '오늘 인증을 이미 제출했어요. 1회 한정으로 수정할 수 있어요.' : '오늘의 인증 수정을 이미 사용했어요.'}
          </div>
        )}

        {/* 탭 — 허용된 방식이 1개면 탭 버튼 숨김 */}
        {visibleTabs.length > 1 && (
          <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
            {visibleTabs.map((t) => (
              <button key={t.id} onClick={() => canEditMore && setActiveTab(t.id)} disabled={!canEditMore} style={{
                flex: 1, padding: '12px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                background: activeTab === t.id ? '#1A1A2E' : 'white',
                color: activeTab === t.id ? 'white' : 'var(--text-muted)',
                borderRadius: '8px', border: `1px solid ${activeTab === t.id ? '#1A1A2E' : 'var(--border-color)'}`,
                fontWeight: activeTab === t.id ? 'bold' : 'normal', cursor: canEditMore ? 'pointer' : 'not-allowed',
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
        {activeTab === 'photo' && (
          <>
            <div onClick={(!photoPreview && canEditMore) ? () => setShowPhotoModal(true) : undefined}
              style={{ background: '#E5E7EB', borderRadius: '16px', height: '240px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', position: 'relative', overflow: 'hidden', cursor: (!photoPreview && canEditMore) ? 'pointer' : 'default' }}>
              {photoPreview ? (
                <>
                  <img src={photoPreview} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  {canEditMore && (
                    <>
                      <button onClick={() => { setPhotoPreview(null); setPhotoBase64(null); }}
                        style={{ position: 'absolute', top: '12px', right: '12px', background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%', padding: '6px', color: 'white', cursor: 'pointer', display: 'flex' }}>
                        <X size={16} />
                      </button>
                      <button onClick={() => setShowPhotoModal(true)}
                        style={{ position: 'absolute', bottom: '12px', right: '12px', background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '20px', padding: '6px 12px', color: 'white', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>
                        변경
                      </button>
                    </>
                  )}
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
        {activeTab === 'text' && (
          <textarea
            value={textValue} onChange={(e) => canEditMore && setTextValue(e.target.value)}
            readOnly={!canEditMore}
            placeholder="오늘의 인증 내용을 자세히 작성해주세요. (최소 10자 이상)"
            style={{ width: '100%', height: '240px', padding: '16px', borderRadius: '16px', border: '1px solid var(--border-color)', resize: 'none', outline: 'none', fontSize: '15px', fontFamily: 'inherit', boxSizing: 'border-box', background: canEditMore ? 'white' : '#F3F4F6' }} />
        )}

        {/* 체크인 */}
        {activeTab === 'check' && (
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
            type="text" value={commentValue} onChange={(e) => canEditMore && setCommentValue(e.target.value)}
            readOnly={!canEditMore}
            placeholder="인증글과 함께 피드에 보여질 짧은 한 마디!"
            style={{ width: '100%', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)', fontSize: '15px', outline: 'none', boxSizing: 'border-box', background: canEditMore ? 'white' : '#F3F4F6' }} />
        </div>
      </div>

      <div style={{ padding: '20px', background: 'white', borderTop: '1px solid var(--border-color)', marginTop: 'auto' }}>
        <button onClick={!canEditMore ? undefined : handleUpload}
          style={{ width: '100%', padding: '16px', background: !canEditMore ? '#E5E7EB' : 'var(--primary)', color: !canEditMore ? 'var(--text-muted)' : 'white', borderRadius: '12px', fontSize: '16px', fontWeight: 'bold', border: 'none', cursor: !canEditMore ? 'not-allowed' : 'pointer' }}>
          {!canEditMore ? '오늘 수정 기회를 모두 사용했어요' : existingCert ? '수정 완료하기' : '업로드하기'}
        </button>
      </div>
    </div>
  );
}
