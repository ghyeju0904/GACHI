import React, { useState, useMemo, useEffect } from 'react';
import { ArrowLeft, Users, Clock, Flame, Wallet, ShieldCheck, X, CheckCircle } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { logEvent } from '../../services/logger';
import { supabase } from '../../services/supabase';
import { getProfileId } from '../../utils/getProfileId';

const CERTIFY_LABEL = { photo: '사진 인증', text: '텍스트 인증', check: '체크인' };

function getMemberStatus(members, maxMembers) {
  const ratio = members / maxMembers;
  if (members >= maxMembers) return { label: '멤버 마감', textColor: '#EF4444', bgColor: '#FEF2F2' };
  if (ratio >= 0.8)          return { label: '마감 임박', textColor: '#F59E0B', bgColor: '#FFFBEB' };
  return                            { label: '모집 중',   textColor: '#10B981', bgColor: '#ECFDF5' };
}

export default function ChallengeDetail() {
  const navigate = useNavigate();
  const { id }   = useParams();

  const [showDepositModal, setShowDepositModal] = useState(false);
  const [paying,           setPaying]           = useState(false);
  const [paid,             setPaid]             = useState(false);
  const [challenge,        setChallenge]        = useState(null);
  const [loading,          setLoading]          = useState(true);

  useEffect(() => {
    logEvent('challenge_view', `/challenge/${id}`, { challenge_id: id });

    const fetchChallenge = async () => {
      const { data, error } = await supabase
        .from('challenges')
        .select('*')
        .eq('id', id)
        .single();

      if (!error && data) {
        setChallenge({
          ...data,
          maxMembers:  data.max_members,
          certifyType: data.certify_type,
          members:     0,
        });
      } else {
        // localStorage 개설 챌린지 fallback
        try {
          const owned = JSON.parse(localStorage.getItem('my_challenges') || '[]');
          const found = owned.find((c) => String(c.id) === String(id));
          if (found) setChallenge(found);
        } catch {}
      }
      setLoading(false);
    };
    fetchChallenge();
  }, [id]);

  const [alreadyJoined,  setAlreadyJoined]  = useState(false);
  const [wasKicked,      setWasKicked]      = useState(false);
  const [currentMembers, setCurrentMembers] = useState(0);

  useEffect(() => {
    const checkMembership = async () => {
      const profileId = await getProfileId();
      const { data } = await supabase
        .from('challenge_members')
        .select('user_id, status, role')
        .eq('challenge_id', id);

      const active = (data || []).filter(
        (m) => m.status !== 'observer' && m.status !== 'kicked'
      );
      setCurrentMembers(active.length);

      if (profileId) {
        const mine = (data || []).find((m) => m.user_id === profileId);
        if (mine?.status === 'kicked') {
          setWasKicked(true);
          setAlreadyJoined(false);
        } else {
          setAlreadyJoined(!!mine);
        }
      }
    };
    try {
      const saved = JSON.parse(localStorage.getItem('my_challenges') || '[]');
      if (saved.some((c) => String(c.id) === String(id))) setAlreadyJoined(true);
    } catch {}
    checkMembership();

    // 강퇴 실시간 감지 — 페이지 열어둔 채로 강퇴 당해도 즉시 반영
    let myPid = null;
    getProfileId().then((pid) => { myPid = pid; });

    const kickChannel = supabase
      .channel(`detail_kick_${id}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'challenge_members',
        filter: `challenge_id=eq.${id}`,
      }, (payload) => {
        if (payload.new.user_id === myPid && payload.new.status === 'kicked') {
          setWasKicked(true);
          setAlreadyJoined(false);
          try {
            const all = JSON.parse(localStorage.getItem('my_challenges') || '[]');
            localStorage.setItem('my_challenges', JSON.stringify(
              all.filter((c) => String(c.id) !== String(id))
            ));
          } catch {}
        }
      })
      .subscribe();

    return () => supabase.removeChannel(kickChannel);
  }, [id]);

  const memberStatus = getMemberStatus(currentMembers, challenge?.maxMembers || 30);

  const handlePay = () => {
    setPaying(true);
    setTimeout(async () => {
      // 강퇴 여부 재확인 (서버 기준)
      const profileId = await getProfileId();
      if (profileId) {
        const { data: myRow } = await supabase
          .from('challenge_members')
          .select('status')
          .eq('challenge_id', id)
          .eq('user_id', profileId)
          .single();
        if (myRow?.status === 'kicked') {
          setPaying(false);
          setShowDepositModal(false);
          setWasKicked(true);
          return;
        }
      }

      // 실시간 인원 재확인 (동시 참여 방지)
      const { count } = await supabase
        .from('challenge_members')
        .select('*', { count: 'exact', head: true })
        .eq('challenge_id', id)
        .not('status', 'in', '(observer,kicked)');

      const maxM = challenge.max_members || challenge.maxMembers || 30;
      if (count >= maxM) {
        setPaying(false);
        setShowDepositModal(false);
        alert('참여 인원이 가득 찼어요.');
        setCurrentMembers(count);
        return;
      }

      const daysTotal  = parseInt(challenge.duration) || 30;
      const todayStr   = new Date().toISOString().split('T')[0];
      const endDateStr = (() => {
        const d = new Date();
        d.setDate(d.getDate() + daysTotal);
        return d.toISOString().split('T')[0];
      })();

      // 1. localStorage 저장
      const newEntry = {
        id:        id,
        title:     challenge.title,
        category:  challenge.category,
        deposit:   challenge.deposit,
        dDay:      daysTotal,
        streak:    0,
        role:      'member',
        startDate: todayStr,
        endDate:   endDateStr,
        joinedAt:  new Date().toISOString(),
      };
      const prev = JSON.parse(localStorage.getItem('my_challenges') || '[]');
      if (!prev.some((c) => String(c.id) === String(id))) {
        localStorage.setItem('my_challenges', JSON.stringify([newEntry, ...prev]));
      }

      // 2. Supabase challenge_members 저장 (디바이스 간 공유)
      try {
        const profileId = await getProfileId();
        if (profileId) {
          await supabase.from('challenge_members').upsert({
            challenge_id: id,
            user_id:      profileId,
            role:         'member',
            status:       'active',
            joined_at:    new Date().toISOString(),
          }, { onConflict: 'challenge_id,user_id' });
        }
      } catch {}

      logEvent('challenge_join', `/challenge/${id}`, { challenge_id: id, deposit: challenge.deposit });
      setPaying(false);
      setPaid(true);
      setTimeout(() => {
        setShowDepositModal(false);
        navigate(`/feed/${id}`);
      }, 1000);
    }, 1200);
  };

  if (loading) return (
    <div style={{ backgroundColor: '#F8F9FA', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: 'var(--text-muted)', fontSize: '14px' }}>불러오는 중...</div>
    </div>
  );

  if (!challenge) return (
    <div style={{ backgroundColor: '#F8F9FA', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: 'var(--text-muted)', fontSize: '14px' }}>챌린지를 찾을 수 없어요</div>
    </div>
  );

  return (
    <div style={{ backgroundColor: '#F8F9FA', minHeight: '100vh', paddingBottom: '160px' }}>

      <div style={{ height: '200px', background: 'linear-gradient(135deg, var(--secondary) 0%, var(--primary) 100%)', position: 'relative' }}>
        <ArrowLeft size={28} color="white" style={{ position: 'absolute', top: '16px', left: '16px', cursor: 'pointer' }} onClick={() => navigate(-1)} />
      </div>

      <div style={{ padding: '20px', marginTop: '-40px', position: 'relative', zIndex: 1 }}>

        {/* 기본 정보 카드 */}
        <div style={{ background: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', border: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ display: 'inline-block', padding: '4px 10px', background: '#FFF0EB', color: 'var(--primary)', borderRadius: '16px', fontSize: '12px', fontWeight: 'bold' }}>
              {challenge.category}
            </div>
            <span style={{ fontSize: '12px', fontWeight: 'bold', color: memberStatus.textColor, background: memberStatus.bgColor, padding: '4px 10px', borderRadius: '20px' }}>
              {memberStatus.label}
            </span>
          </div>
          <h1 style={{ fontSize: '22px', fontWeight: 'bold', marginBottom: '16px' }}>{challenge.title}</h1>
          <div style={{ display: 'flex', gap: '16px', color: 'var(--text-muted)', fontSize: '14px', flexWrap: 'wrap' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Clock size={16} /> {typeof challenge.duration === 'number' ? `${challenge.duration}일` : challenge.duration}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Users size={16} /> {currentMembers}/{challenge.maxMembers || challenge.max_members}명</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ShieldCheck size={16} /> {CERTIFY_LABEL[challenge.certifyType] || challenge.certifyType}
            </span>
          </div>
          <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid var(--border-color)' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 'bold', marginBottom: '8px' }}>챌린지 소개</h3>
            <p style={{ fontSize: '14px', lineHeight: 1.6, color: 'var(--text-muted)' }}>{challenge.description}</p>
          </div>
        </div>

        {/* 보증금 안내 */}
        <div style={{ marginTop: '16px', background: '#FFF0EB', borderRadius: '16px', padding: '20px', border: '1px solid #FFD4C8' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <Wallet size={18} color="var(--primary)" />
            <span style={{ fontWeight: 'bold', fontSize: '15px', color: 'var(--primary)' }}>참가 보증금</span>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '8px' }}>{challenge.deposit?.toLocaleString()}원</div>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.8 }}>
            · 챌린지 성공 시 <strong style={{ color: 'var(--text-main)' }}>전액 환급</strong><br />
            · 실패 또는 중도 포기 시 <strong style={{ color: 'var(--text-main)' }}>미환급</strong><br />
            · 참여자 투표 과반 미달 인증은 실패 처리
          </div>
        </div>

        {/* 멤버 미리보기 */}
        <div style={{ marginTop: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Flame size={18} color="var(--primary)" /> 열정 멤버 ({challenge.members}명)
          </h3>
          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px' }}>
            {Array.from({ length: Math.min(6, challenge.members || 0) }).map((_, i) => (
              <div key={i} style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>😀</div>
            ))}
            {(challenge.members || 0) > 6 && (
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#FFF0EB', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 'bold', flexShrink: 0 }}>
                +{(challenge.members || 0) - 6}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 하단 고정 CTA — nav-height 위에 위치 */}
      <div style={{ position: 'fixed', bottom: 'var(--nav-height)', left: 0, right: 0, padding: '12px 20px', background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(10px)', borderTop: '1px solid var(--border-color)', maxWidth: '480px', margin: '0 auto' }}>
        {wasKicked ? (
          <div style={{ padding: '16px', background: '#FEF2F2', border: '1px solid #FFD4C8', borderRadius: '12px', textAlign: 'center', color: '#EF4444', fontWeight: 'bold', fontSize: '15px' }}>
            🚫 강퇴 당한 챌린지입니다.
          </div>
        ) : alreadyJoined ? (
          <button onClick={() => navigate(`/feed/${id}`)}
            style={{ width: '100%', padding: '16px', background: 'var(--secondary)', color: 'white', borderRadius: '12px', fontSize: '16px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}>
            그룹 피드 보러 가기
          </button>
        ) : (
          <>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center', marginBottom: '8px' }}>
              참여 시 보증금 <strong style={{ color: 'var(--primary)' }}>{challenge.deposit?.toLocaleString()}원</strong> 결제 후 합류
            </div>
            <button
              onClick={() => currentMembers >= (challenge.max_members || challenge.maxMembers) ? null : setShowDepositModal(true)}
              disabled={currentMembers >= (challenge.max_members || challenge.maxMembers)}
              style={{ width: '100%', padding: '16px', background: currentMembers >= (challenge.max_members || challenge.maxMembers) ? '#E5E7EB' : 'var(--primary)', color: currentMembers >= (challenge.max_members || challenge.maxMembers) ? 'var(--text-muted)' : 'white', borderRadius: '12px', fontSize: '16px', fontWeight: 'bold', border: 'none', cursor: currentMembers >= (challenge.max_members || challenge.maxMembers) ? 'not-allowed' : 'pointer' }}>
              {currentMembers >= (challenge.max_members || challenge.maxMembers) ? '멤버 마감' : '보증금 납부하고 참여하기'}
            </button>
          </>
        )}
      </div>

      {/* 보증금 납부 바텀시트 */}
      {showDepositModal && (
        <div onClick={() => !paying && setShowDepositModal(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'flex-end' }}>
          <div onClick={(e) => e.stopPropagation()}
            style={{ width: '100%', background: 'white', borderRadius: '20px 20px 0 0', padding: '24px 20px 40px', maxWidth: '480px', margin: '0 auto' }}>
            <div style={{ width: '40px', height: '4px', background: '#E5E7EB', borderRadius: '2px', margin: '0 auto 24px' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0 }}>보증금 납부 확인</h3>
              {!paying && <X size={24} style={{ cursor: 'pointer', color: 'var(--text-muted)' }} onClick={() => setShowDepositModal(false)} />}
            </div>

            <div style={{ background: '#F8F9FA', borderRadius: '12px', padding: '20px', marginBottom: '16px' }}>
              {[
                ['챌린지', challenge.title],
                ['기간', typeof challenge.duration === 'number' ? `${challenge.duration}일` : challenge.duration],
                ['인증 방식', CERTIFY_LABEL[challenge.certifyType] || challenge.certifyType],
              ].map(([label, val]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '14px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>{label}</span>
                  <span style={{ fontWeight: 'bold', textAlign: 'right', maxWidth: '60%' }}>{val}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '12px', borderTop: '1px solid var(--border-color)', fontSize: '16px' }}>
                <span style={{ fontWeight: 'bold' }}>납부 금액</span>
                <span style={{ fontWeight: 'bold', color: 'var(--primary)' }}>{challenge.deposit?.toLocaleString()}원</span>
              </div>
            </div>

            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '20px', lineHeight: 1.6 }}>
              챌린지 성공 시 전액 환급됩니다. 참여자 투표 과반 미달 인증은 실패 처리됩니다.
            </p>

            {paid ? (
              <div style={{ padding: '16px', background: '#ECFDF5', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#10B981', fontWeight: 'bold', fontSize: '16px' }}>
                <CheckCircle size={20} /> 결제 완료! 챌린지에 합류했어요
              </div>
            ) : (
              <button onClick={handlePay} disabled={paying}
                style={{ width: '100%', padding: '16px', background: paying ? '#93C5FD' : '#0064FF', color: 'white', borderRadius: '12px', fontSize: '16px', fontWeight: 'bold', border: 'none', cursor: paying ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                {paying ? '토스페이 처리 중…' : '토스페이로 납부하기'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
