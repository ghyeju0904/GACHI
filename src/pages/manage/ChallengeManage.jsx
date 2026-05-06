import React, { useState, useEffect } from 'react';
import { ArrowLeft, Users, Calendar, AlertTriangle, CheckCircle, Clock, RefreshCw } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import { getProfileId } from '../../utils/getProfileId';

export default function ChallengeManage() {
  const navigate  = useNavigate();
  const { id }    = useParams();
  const todayStr  = new Date().toISOString().split('T')[0];

  const [challenge,    setChallenge]    = useState(null);
  const [members,      setMembers]      = useState([]);
  const [closeVotes,   setCloseVotes]   = useState([]);
  const [myProfileId,  setMyProfileId]  = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [extendDays,        setExtendDays]        = useState(1);
  const [showExtend,        setShowExtend]        = useState(false);
  const [showClose,         setShowClose]         = useState(false);
  const [countdown,         setCountdown]         = useState('');
  const [voteActive,        setVoteActive]        = useState(false);
  const [voteStartedAt,     setVoteStartedAt]     = useState(null);
  const [kickTarget,        setKickTarget]        = useState(null);

  const fetchAll = async () => {
    const profileId = await getProfileId();
    setMyProfileId(profileId);

    const [{ data: ch }, { data: mems }, { data: certs }, { data: votes }] = await Promise.all([
      supabase.from('challenges').select('*').eq('id', id).single(),
      supabase.from('challenge_members').select('*, profiles(avatar, nickname)').eq('challenge_id', id),
      supabase.from('certifications').select('user_id').eq('challenge_id', id).eq('cert_date', todayStr),
      supabase.from('early_close_votes').select('*, profiles(avatar, nickname)').eq('challenge_id', id),
    ]);

    setChallenge(ch);
    setVoteActive(ch?.early_close_active || false);
    setVoteStartedAt(ch?.early_close_started_at || null);
    const certIds = new Set((certs || []).map((c) => c.user_id));
    setMembers((mems || []).map((m) => ({ ...m, certifiedToday: certIds.has(m.user_id) })));
    setCloseVotes(votes || []);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, [id]);

  // 카운트다운 타이머
  useEffect(() => {
    if (!voteStartedAt) return;
    const deadline = new Date(new Date(voteStartedAt).getTime() + 24 * 60 * 60 * 1000);
    const tick = () => {
      const diff = deadline - Date.now();
      if (diff <= 0) { setCountdown('00:00:00'); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setCountdown(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`);
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [voteStartedAt]);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#F8F9FA' }}>
      <p style={{ color: 'var(--text-muted)' }}>불러오는 중...</p>
    </div>
  );

  if (!challenge) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#F8F9FA' }}>
      <p style={{ color: 'var(--text-muted)' }}>챌린지를 찾을 수 없어요</p>
    </div>
  );

  const participantMembers = members.filter((m) =>
    m.role === 'member' ||
    (m.role === 'owner' && challenge.owner_participates && m.status !== 'observer')
  );
  const memberCount = participantMembers.length;
  const maxMembers         = challenge.max_members || 30;
  const isFull             = memberCount >= maxMembers;

  const recruitEnd    = challenge.recruitment_end_date;
  const isRecruitOpen = recruitEnd && todayStr <= recruitEnd && !isFull;
  const canExtend     = isRecruitOpen && !challenge.recruitment_extended;

  const agreedCount  = closeVotes.filter((v) => v.agreed).length;
  const threshold    = Math.ceil(memberCount * 0.75);
  const closePercent = memberCount > 0 ? Math.round((agreedCount / memberCount) * 100) : 0;
  const canConfirmClose = agreedCount >= threshold && threshold > 0;

  const voteDeadline   = voteStartedAt ? new Date(new Date(voteStartedAt).getTime() + 24 * 60 * 60 * 1000) : null;
  const isVoteExpired  = voteDeadline && Date.now() > voteDeadline.getTime();

  const getDaysLeft = (dateStr) => {
    const diff = Math.ceil((new Date(dateStr) - new Date(todayStr)) / 86400000);
    return diff;
  };

  // 모집 기간 연장
  const handleExtend = async () => {
    if (!canExtend) return;
    const cur = new Date(recruitEnd);
    cur.setDate(cur.getDate() + extendDays);
    const newDate = cur.toISOString().split('T')[0];
    await supabase.from('challenges').update({
      recruitment_end_date: newDate,
      recruitment_extended: true,
    }).eq('id', id);
    setShowExtend(false);
    fetchAll();
  };

  // 챌린지 중지 요청
  const handleStartCloseVote = async () => {
    console.log('[VOTE] 시작');
    const now = new Date().toISOString();

    setShowClose(false);
    setVoteActive(true);
    setVoteStartedAt(now);
    console.log('[VOTE] UI 업데이트 완료 - voteActive=true');

    const { data: updData, error } = await supabase
      .from('challenges')
      .update({ early_close_active: true, early_close_started_at: now })
      .eq('id', id)
      .select();

    console.log('[VOTE] Supabase update 결과:', { updData, error });

    if (error) {
      console.error('[VOTE] 업데이트 실패 → UI 롤백:', error.message, error.code);
      setVoteActive(false);
      setVoteStartedAt(null);
      return;
    }

    console.log('[VOTE] members 목록:', members);
    console.log('[VOTE] myProfileId:', myProfileId);

    const notifTargets = members
      .filter((m) => m.user_id !== myProfileId)
      .map((m) => ({
        user_id:      m.user_id,
        challenge_id: id,
        type:         'early_close_request',
        message:      `'${challenge.title}' 챌린지 운영자가 중지를 요청했어요. 24시간 내 응답해주세요.`,
      }));

    console.log('[VOTE] 알림 대상:', notifTargets);

    if (notifTargets.length > 0) {
      const { error: notifError } = await supabase.from('notifications').insert(notifTargets);
      console.log('[VOTE] 알림 전송 결과:', notifError || '성공');
    } else {
      console.log('[VOTE] 알림 보낼 대상 없음');
    }

    console.log('[VOTE] 완료');
  };

  // 참여자 강퇴
  const handleKick = async () => {
    if (!kickTarget) return;
    await supabase.from('challenge_members')
      .delete()
      .eq('challenge_id', id)
      .eq('user_id', kickTarget.user_id);

    // 강퇴 알림
    await supabase.from('notifications').insert({
      user_id:      kickTarget.user_id,
      challenge_id: id,
      type:         'kicked',
      message:      `'${challenge.title}' 챌린지에서 강퇴되었어요.`,
    });

    setMembers((prev) => prev.filter((m) => m.user_id !== kickTarget.user_id));
    setKickTarget(null);
  };

  // 완주 전 마감 투표 취소
  const handleCancelCloseVote = async () => {
    await supabase.from('challenges').update({ early_close_active: false }).eq('id', id);
    await supabase.from('early_close_votes').delete().eq('challenge_id', id);
    fetchAll();
  };

  // 완주 전 마감 확정
  const handleConfirmClose = async () => {
    await supabase.from('challenges').update({
      status:             'early_closed',
      early_close_active: false,
    }).eq('id', id);

    // localStorage에서도 제거
    try {
      const all = JSON.parse(localStorage.getItem('my_challenges') || '[]');
      localStorage.setItem('my_challenges', JSON.stringify(
        all.filter((c) => String(c.id) !== String(id))
      ));
    } catch {}

    navigate('/home');
  };

  return (
    <div style={{ backgroundColor: '#F8F9FA', minHeight: '100vh', paddingBottom: '40px' }}>

      <header style={{ padding: '16px 20px', background: 'white', display: 'flex', alignItems: 'center', borderBottom: '1px solid var(--border-color)', position: 'sticky', top: 0, zIndex: 10 }}>
        <ArrowLeft size={24} style={{ cursor: 'pointer', marginRight: '16px' }} onClick={() => navigate(-1)} />
        <div>
          <h1 style={{ fontSize: '16px', fontWeight: 'bold', margin: 0 }}>챌린지 관리</h1>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>{challenge.title}</p>
        </div>
      </header>

      <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

        {/* 현황 카드 */}
        <div style={{ background: 'white', borderRadius: '16px', padding: '20px', border: '1px solid var(--border-color)' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 'bold', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Users size={16} color="var(--primary)" /> 참여 현황
          </h3>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>참여 인원</span>
            <span style={{ fontSize: '18px', fontWeight: 'bold', color: isFull ? '#EF4444' : 'var(--primary)' }}>
              {memberCount} / {maxMembers}명 {isFull && '(만원)'}
            </span>
          </div>
          <div style={{ width: '100%', height: '8px', background: '#F3F4F6', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ width: `${(memberCount / maxMembers) * 100}%`, height: '100%', background: isFull ? '#EF4444' : 'var(--primary)', borderRadius: '4px', transition: 'width 0.3s' }} />
          </div>

          <div style={{ marginTop: '16px', display: 'flex', gap: '12px', fontSize: '13px' }}>
            <div style={{ flex: 1, background: '#F8F9FA', borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
              <div style={{ fontWeight: 'bold', color: 'var(--primary)', fontSize: '16px' }}>
                {members.filter((m) => m.certifiedToday).length}명
              </div>
              <div style={{ color: 'var(--text-muted)', marginTop: '2px' }}>오늘 인증</div>
            </div>
            <div style={{ flex: 1, background: '#F8F9FA', borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
              <div style={{ fontWeight: 'bold', fontSize: '16px' }}>
                {recruitEnd ? (isRecruitOpen ? `D-${getDaysLeft(recruitEnd)}` : '마감') : '없음'}
              </div>
              <div style={{ color: 'var(--text-muted)', marginTop: '2px' }}>모집 기간</div>
            </div>
          </div>
        </div>

        {/* 참여자 목록 */}
        <div style={{ background: 'white', borderRadius: '16px', padding: '20px', border: '1px solid var(--border-color)' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 'bold', marginBottom: '14px' }}>참여자 목록</h3>
          {participantMembers.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', textAlign: 'center', padding: '20px 0' }}>아직 참여자가 없어요</p>
          ) : (
            participantMembers.map((m) => (
              <div key={m.user_id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #F3F4F6' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#FFF0EB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>
                    {m.profiles?.avatar || '🐰'}
                  </div>
                  <div>
                    <span style={{ fontSize: '14px', fontWeight: 'bold' }}>{m.profiles?.nickname || '익명'}</span>
                    {m.role === 'owner' && (
                      <span style={{ marginLeft: '6px', fontSize: '11px', color: 'var(--primary)', background: '#FFF0EB', padding: '1px 6px', borderRadius: '8px', fontWeight: 'bold' }}>운영자</span>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {m.certifiedToday
                    ? <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#10B981', background: '#D1FAE5', padding: '3px 10px', borderRadius: '20px' }}>✓ 인증완료</span>
                    : <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-muted)', background: '#F3F4F6', padding: '3px 10px', borderRadius: '20px' }}>미인증</span>
                  }
                  {m.role !== 'owner' && (
                    <button onClick={() => setKickTarget({ user_id: m.user_id, nickname: m.profiles?.nickname || '익명' })}
                      style={{ fontSize: '11px', color: '#EF4444', background: '#FEF2F2', border: '1px solid #FFD4C8', borderRadius: '20px', padding: '3px 8px', cursor: 'pointer', fontWeight: 'bold' }}>
                      강퇴
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* 모집 기간 연장 */}
        <div style={{ background: 'white', borderRadius: '16px', padding: '20px', border: '1px solid var(--border-color)' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 'bold', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Calendar size={16} color="var(--primary)" /> 모집 기간 관리
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '14px' }}>
            현재 모집 마감일: {recruitEnd || '미설정'}{challenge.recruitment_extended && ' (연장 완료)'}
          </p>
          {canExtend ? (
            showExtend ? (
              <div>
                <p style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '10px' }}>연장 기간 선택 (최대 3일, 1회만 가능)</p>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                  {[1, 2, 3].map((d) => (
                    <button key={d} onClick={() => setExtendDays(d)} style={{
                      flex: 1, padding: '10px 0', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: extendDays === d ? 'bold' : 'normal',
                      border: `1px solid ${extendDays === d ? 'var(--primary)' : 'var(--border-color)'}`,
                      background: extendDays === d ? '#FFF0EB' : 'white',
                      color: extendDays === d ? 'var(--primary)' : 'var(--text-main)',
                    }}>{d}일</button>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => setShowExtend(false)} style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'white', cursor: 'pointer', fontSize: '14px' }}>취소</button>
                  <button onClick={handleExtend} style={{ flex: 2, padding: '12px', borderRadius: '10px', border: 'none', background: 'var(--primary)', color: 'white', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' }}>
                    {extendDays}일 연장하기
                  </button>
                </div>
              </div>
            ) : (
              <button onClick={() => setShowExtend(true)} style={{ width: '100%', padding: '13px', borderRadius: '10px', border: '1px solid var(--primary)', background: '#FFF0EB', color: 'var(--primary)', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' }}>
                <RefreshCw size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                모집 기간 연장하기
              </button>
            )
          ) : (
            <div style={{ padding: '12px', background: '#F3F4F6', borderRadius: '10px', fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center' }}>
              {challenge.recruitment_extended ? '이미 연장을 사용했어요 (1회 제한)' : isFull ? '참여 인원이 가득 찼어요' : '모집 기간이 마감됐어요'}
            </div>
          )}
        </div>

        {/* 챌린지 중지 요청 */}
        <div style={{ background: 'white', borderRadius: '16px', padding: '20px', border: `1px solid ${voteActive ? '#EF4444' : '#FFD4C8'}` }}>
          <h3 style={{ fontSize: '15px', fontWeight: 'bold', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px', color: '#EF4444' }}>
            <AlertTriangle size={16} color="#EF4444" /> 챌린지 중지 요청
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '14px' }}>
            참여자 75% 이상 동의 시 중지 가능 · 보증금 100% 반환
          </p>

          {voteActive ? (
            <>
              {/* 카운트다운 */}
              <div style={{ background: '#FEF2F2', border: '1px solid #FFD4C8', borderRadius: '12px', padding: '16px', textAlign: 'center', marginBottom: '16px' }}>
                <p style={{ fontSize: '12px', color: '#EF4444', fontWeight: 'bold', marginBottom: '6px' }}>응답 마감</p>
                <p style={{ fontSize: '28px', fontWeight: 'bold', color: isVoteExpired ? 'var(--text-muted)' : '#EF4444', letterSpacing: '2px', margin: 0, fontVariantNumeric: 'tabular-nums' }}>
                  {isVoteExpired ? '만료됨' : `${countdown} 전`}
                </p>
              </div>

              {/* 동의 현황 */}
              <div style={{ marginBottom: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px' }}>
                  <span style={{ fontWeight: 'bold' }}>동의 현황</span>
                  <span style={{ color: canConfirmClose ? '#10B981' : 'var(--text-muted)', fontWeight: 'bold' }}>
                    {agreedCount}/{memberCount}명 ({closePercent}%)
                  </span>
                </div>
                <div style={{ width: '100%', height: '8px', background: '#F3F4F6', borderRadius: '4px', overflow: 'hidden', marginBottom: '6px' }}>
                  <div style={{ width: `${closePercent}%`, height: '100%', background: canConfirmClose ? '#10B981' : '#F59E0B', borderRadius: '4px', transition: 'width 0.3s' }} />
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>목표: {threshold}명 동의 필요 (75%)</p>
              </div>

              {/* 동의한 참여자 */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '14px' }}>
                {closeVotes.filter((v) => v.agreed).map((v) => (
                  <span key={v.id} style={{ fontSize: '12px', background: '#D1FAE5', color: '#10B981', padding: '3px 10px', borderRadius: '20px', fontWeight: 'bold' }}>
                    {v.profiles?.avatar} {v.profiles?.nickname}
                  </span>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={handleCancelCloseVote} style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'white', cursor: 'pointer', fontSize: '14px' }}>요청 취소</button>
                <button onClick={handleConfirmClose} disabled={!canConfirmClose}
                  style={{ flex: 2, padding: '12px', borderRadius: '10px', border: 'none', background: canConfirmClose ? '#EF4444' : '#E5E7EB', color: canConfirmClose ? 'white' : 'var(--text-muted)', cursor: canConfirmClose ? 'pointer' : 'not-allowed', fontSize: '14px', fontWeight: 'bold' }}>
                  {canConfirmClose ? '챌린지 중지 확정' : `동의 ${threshold - agreedCount}명 더 필요`}
                </button>
              </div>
            </>
          ) : (
            showClose ? (
              <div>
                <div style={{ background: '#FFF5F5', border: '1px solid #FFD4C8', borderRadius: '10px', padding: '14px', marginBottom: '14px', fontSize: '13px', color: '#EF4444', lineHeight: 1.6 }}>
                  ⚠️ 요청을 보내면 참여자들에게 동의 요청이 전송돼요.<br />
                  24시간 이내에 75% 이상 동의해야 중지할 수 있으며, 보증금은 전액 반환됩니다.
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => setShowClose(false)} style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'white', cursor: 'pointer', fontSize: '14px' }}>취소</button>
                  <button onClick={handleStartCloseVote} style={{ flex: 2, padding: '12px', borderRadius: '10px', border: 'none', background: '#EF4444', color: 'white', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' }}>
                    중지 요청 보내기
                  </button>
                </div>
              </div>
            ) : (
              <button onClick={() => setShowClose(true)} style={{ width: '100%', padding: '13px', borderRadius: '10px', border: '1px solid #EF4444', background: '#FFF5F5', color: '#EF4444', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' }}>
                챌린지 중지 요청하기
              </button>
            )
          )}
        </div>
      </div>

      {/* 강퇴 확인 모달 */}
      {kickTarget && (
        <div onClick={() => setKickTarget(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div onClick={(e) => e.stopPropagation()}
            style={{ width: '100%', maxWidth: '480px', background: 'white', borderRadius: '20px 20px 0 0', padding: '28px 24px 40px' }}>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>⚠️</div>
              <h3 style={{ fontSize: '17px', fontWeight: 'bold', marginBottom: '8px' }}>
                {kickTarget.nickname}님을 강퇴할까요?
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                강퇴된 참여자는 챌린지에서 제외되며<br />해당 참여자에게 알림이 전송됩니다.
              </p>
            </div>
            <button onClick={handleKick}
              style={{ width: '100%', padding: '15px', background: '#EF4444', color: 'white', borderRadius: '12px', fontSize: '16px', fontWeight: 'bold', border: 'none', cursor: 'pointer', marginBottom: '10px' }}>
              강퇴하기
            </button>
            <button onClick={() => setKickTarget(null)}
              style={{ width: '100%', padding: '12px', background: 'none', color: 'var(--text-muted)', borderRadius: '12px', fontSize: '14px', border: 'none', cursor: 'pointer' }}>
              취소
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
