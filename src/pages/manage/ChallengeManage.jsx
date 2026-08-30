import React, { useState, useEffect } from 'react';
import { ArrowLeft, Users, Calendar, AlertTriangle, RefreshCw, ShieldAlert, Crown, Flag } from 'lucide-react';
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
  const [reports,      setReports]      = useState([]);
  const [ownerVotes,   setOwnerVotes]   = useState([]);
  const [continuationVotes, setContinuationVotes] = useState([]);
  const [mySuccession, setMySuccession] = useState(null);
  const [myProfileId,  setMyProfileId]  = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [extendDays,        setExtendDays]        = useState(1);
  const [showExtend,        setShowExtend]        = useState(false);
  const [showClose,         setShowClose]         = useState(false);
  const [countdown,         setCountdown]         = useState('');
  const [voteActive,        setVoteActive]        = useState(false);
  const [voteStartedAt,     setVoteStartedAt]     = useState(null);
  const [kickTarget,        setKickTarget]        = useState(null);
  const [subOwnerPicker,    setSubOwnerPicker]    = useState(false);

  const fetchAll = async () => {
    const profileId = await getProfileId();
    setMyProfileId(profileId);

    const [{ data: ch }, { data: mems }, { data: certs }, { data: votes }, { data: reps }, { data: cvotes }, { data: succ }] = await Promise.all([
      supabase.from('challenges').select('*').eq('id', id).single(),
      supabase.from('challenge_members').select('*, profiles(avatar, nickname)').eq('challenge_id', id),
      supabase.from('certifications').select('user_id').eq('challenge_id', id).eq('cert_date', todayStr),
      supabase.from('early_close_votes').select('*, profiles(avatar, nickname)').eq('challenge_id', id),
      supabase.from('reports').select('*').eq('challenge_id', id).eq('status', 'pending'),
      supabase.from('continuation_votes').select('*').eq('challenge_id', id),
      profileId
        ? supabase.from('succession_requests').select('*').eq('challenge_id', id).eq('offered_to', profileId).eq('status', 'pending').maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    setChallenge(ch);
    setVoteActive(ch?.early_close_active || false);
    setVoteStartedAt(ch?.early_close_started_at || null);
    const certIds = new Set((certs || []).map((c) => c.user_id));
    const memberList = (mems || []).map((m) => ({ ...m, certifiedToday: certIds.has(m.user_id) }));
    setMembers(memberList);
    setCloseVotes(votes || []);

    const reportRows = reps || [];
    const reporterIds = [...new Set(reportRows.map((r) => r.reporter_id))];
    const targetIds   = [...new Set(reportRows.map((r) => r.reported_user_id))];
    const profileMap = new Map(memberList.map((m) => [m.user_id, m.profiles]));
    // 멤버 목록에 없는 신고자/대상자(이미 탈퇴 등)도 표시할 수 있도록 보강 조회
    const missingIds = [...new Set([...reporterIds, ...targetIds])].filter((uid) => !profileMap.has(uid));
    if (missingIds.length) {
      const { data: extra } = await supabase.from('profiles').select('id, avatar, nickname').in('id', missingIds);
      (extra || []).forEach((p) => profileMap.set(p.id, p));
    }
    setReports(reportRows.map((r) => ({
      ...r,
      reporterProfile: profileMap.get(r.reporter_id),
      targetProfile:   profileMap.get(r.reported_user_id),
    })));

    setOwnerVotes([]); // 아래에서 필요 시 별도 조회
    setContinuationVotes(cvotes || []);
    setMySuccession(succ || null);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, [id]);

  // 모임장 대상 신고의 투표 현황 별도 조회
  useEffect(() => {
    if (!challenge) return;
    const ownerTargetReportIds = reports
      .filter((r) => r.reported_user_id === challenge.created_by)
      .map((r) => r.id);
    if (ownerTargetReportIds.length === 0) return;
    supabase.from('owner_report_votes').select('*').in('report_id', ownerTargetReportIds)
      .then(({ data }) => setOwnerVotes(data || []));
  }, [challenge, reports.length]);

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

  const participantMembers = members.filter((m) => m.status !== 'kicked');
  const memberCount = participantMembers.length;
  const maxMembers  = challenge.max_members || 30;
  const isFull      = memberCount >= maxMembers;

  const myMember    = members.find((m) => m.user_id === myProfileId);
  const isOwner     = myMember?.role === 'owner' && myMember?.status === 'active';
  const isSubOwner  = challenge.sub_owner_id === myProfileId;
  const canManage   = isOwner || isSubOwner;

  const ownerMemberRow = members.find((m) => m.role === 'owner');
  const ownerActive    = ownerMemberRow?.status === 'active';

  const recruitEnd    = challenge.recruitment_end_date;
  const isRecruitOpen = recruitEnd && todayStr <= recruitEnd && !isFull;
  const canExtend     = isRecruitOpen && !challenge.recruitment_extended;

  const agreedCount  = closeVotes.filter((v) => v.agreed).length;
  const threshold    = Math.ceil(memberCount * 0.75);
  const closePercent = memberCount > 0 ? Math.round((agreedCount / memberCount) * 100) : 0;
  const canConfirmClose = agreedCount >= threshold && threshold > 0;

  const voteDeadline   = voteStartedAt ? new Date(new Date(voteStartedAt).getTime() + 24 * 60 * 60 * 1000) : null;
  const isVoteExpired  = voteDeadline && Date.now() > voteDeadline.getTime();

  const getDaysLeft = (dateStr) => Math.ceil((new Date(dateStr) - new Date(todayStr)) / 86400000);

  // ── 신고 그룹핑 (모임장 대상 / 일반 멤버 대상) ──
  const ownerTargetReports  = reports.filter((r) => r.reported_user_id === challenge.created_by);
  const memberTargetReports = reports.filter((r) => r.reported_user_id !== challenge.created_by);
  const memberReportGroups = Object.values(
    memberTargetReports.reduce((acc, r) => {
      const key = `${r.reported_user_id}_${r.report_date}`;
      if (!acc[key]) acc[key] = { key, userId: r.reported_user_id, date: r.report_date, profile: r.targetProfile, items: [] };
      acc[key].items.push(r);
      return acc;
    }, {})
  );

  const modableCandidates = participantMembers.filter((m) => m.role !== 'owner' && m.user_id !== myProfileId);

  // ── 액션 핸들러 ──
  const handleExtend = async () => {
    if (!canExtend) return;
    const cur = new Date(recruitEnd);
    cur.setDate(cur.getDate() + extendDays);
    await supabase.from('challenges').update({
      recruitment_end_date: cur.toISOString().split('T')[0],
      recruitment_extended: true,
    }).eq('id', id);
    setShowExtend(false);
    fetchAll();
  };

  const handleStartCloseVote = async () => {
    const now = new Date().toISOString();
    setShowClose(false);
    setVoteActive(true);
    setVoteStartedAt(now);

    const { error } = await supabase
      .from('challenges')
      .update({ early_close_active: true, early_close_started_at: now })
      .eq('id', id);

    if (error) { setVoteActive(false); setVoteStartedAt(null); return; }

    const notifTargets = members
      .filter((m) => m.status !== 'kicked')
      .map((m) => ({
        user_id: m.user_id, challenge_id: id, type: 'early_close_request',
        message: `'${challenge.title}' 챌린지 운영자가 중지를 요청했어요. 24시간 내 응답해주세요.`, read: false,
      }));
    if (notifTargets.length > 0) await supabase.from('notifications').insert(notifTargets);
  };

  const handleKick = async () => {
    if (!kickTarget) return;
    await supabase.from('challenge_members').update({ status: 'kicked' }).eq('challenge_id', id).eq('user_id', kickTarget.user_id);
    await supabase.from('notifications').insert({
      user_id: kickTarget.user_id, challenge_id: id, type: 'kicked',
      message: `'${challenge.title}' 챌린지에서 강퇴되었어요.`,
    });
    setKickTarget(null);
    fetchAll();
  };

  const handleCancelCloseVote = async () => {
    await supabase.from('challenges').update({ early_close_active: false }).eq('id', id);
    await supabase.from('early_close_votes').delete().eq('challenge_id', id);
    fetchAll();
  };

  const handleConfirmClose = async () => {
    await supabase.from('challenges').update({ status: 'early_closed', early_close_active: false }).eq('id', id);
    const notifTargets = members
      .filter((m) => m.status !== 'kicked')
      .map((m) => ({
        user_id: m.user_id, challenge_id: id, type: 'challenge_closed',
        message: `'${challenge.title}' 챌린지가 중지 동의로 종료되었어요.`, read: false,
      }));
    if (notifTargets.length > 0) await supabase.from('notifications').insert(notifTargets);
    try {
      const all = JSON.parse(localStorage.getItem('my_challenges') || '[]');
      localStorage.setItem('my_challenges', JSON.stringify(all.filter((c) => String(c.id) !== String(id))));
    } catch {}
    navigate('/home');
  };

  const handleSetSubOwner = async (userId) => {
    await supabase.from('challenges').update({ sub_owner_id: userId }).eq('id', id);
    setSubOwnerPicker(false);
    fetchAll();
  };

  const handleRemoveSubOwner = async () => {
    await supabase.from('challenges').update({ sub_owner_id: null }).eq('id', id);
    fetchAll();
  };

  const handleWarnGroup = async (group) => {
    await supabase.from('reports')
      .update({ status: 'warned', resolved_by: myProfileId, resolved_at: new Date().toISOString() })
      .in('id', group.items.map((r) => r.id));
    await supabase.rpc('apply_warning', { p_challenge_id: id, p_user: group.userId, p_reason: 'report_upheld' });
    fetchAll();
  };

  const handleDismissGroup = async (group) => {
    await supabase.from('reports')
      .update({ status: 'dismissed', resolved_by: myProfileId, resolved_at: new Date().toISOString() })
      .in('id', group.items.map((r) => r.id));
    fetchAll();
  };

  const handleMarkFalse = async (report) => {
    await supabase.from('reports')
      .update({ status: 'false_report', resolved_by: myProfileId, resolved_at: new Date().toISOString() })
      .eq('id', report.id);
    await supabase.rpc('apply_warning', { p_challenge_id: id, p_user: report.reporter_id, p_reason: 'false_report' });
    fetchAll();
  };

  // ── 모임장 본인 인증 신고 투표 ──
  const ownerReportEligible = participantMembers.filter((m) => m.role !== 'owner');
  const myOwnerVote = ownerTargetReports.length
    ? ownerVotes.find((v) => v.report_id === ownerTargetReports[0].id && v.voter_id === myProfileId)
    : null;
  const ownerVoteAgree = ownerTargetReports.length
    ? ownerVotes.filter((v) => v.report_id === ownerTargetReports[0].id && v.agree).length
    : 0;
  const ownerVoteMajority = ownerReportEligible.length > 0 && ownerVoteAgree > ownerReportEligible.length / 2;

  const castOwnerVote = async (agree) => {
    if (!ownerTargetReports.length || !myProfileId) return;
    await supabase.from('owner_report_votes').upsert({
      report_id: ownerTargetReports[0].id, voter_id: myProfileId, agree,
    }, { onConflict: 'report_id,voter_id' });
    fetchAll();
  };

  const finalizeOwnerVote = async () => {
    if (!ownerTargetReports.length) return;
    await supabase.rpc('apply_warning', { p_challenge_id: id, p_user: challenge.created_by, p_reason: 'report_upheld' });
    await supabase.from('reports')
      .update({ status: 'warned', resolved_by: myProfileId, resolved_at: new Date().toISOString() })
      .in('id', ownerTargetReports.map((r) => r.id));
    fetchAll();
  };

  // ── 모임장 승계 ──
  const acceptSuccession = async () => {
    if (!mySuccession) return;
    await supabase.from('challenges').update({ created_by: myProfileId, sub_owner_id: null }).eq('id', id);
    await supabase.from('challenge_members').update({ role: 'owner' }).eq('challenge_id', id).eq('user_id', myProfileId);
    await supabase.from('succession_requests').update({ status: 'accepted' }).eq('id', mySuccession.id);
    fetchAll();
  };

  const declineSuccession = async () => {
    if (!mySuccession) return;
    await supabase.from('succession_requests').update({ status: 'declined' }).eq('id', mySuccession.id);
    fetchAll();
  };

  const volunteerAsOwner = async () => {
    if (!myProfileId) return;
    await supabase.from('challenges').update({ created_by: myProfileId, sub_owner_id: null }).eq('id', id);
    await supabase.from('challenge_members').update({ role: 'owner' }).eq('challenge_id', id).eq('user_id', myProfileId);
    fetchAll();
  };

  const myContinuationVote = continuationVotes.find((v) => v.voter_id === myProfileId);
  const continueAgree      = continuationVotes.filter((v) => v.agree).length;
  const continueDisagree   = continuationVotes.filter((v) => !v.agree).length;
  const nonOwnerActive     = participantMembers.filter((m) => m.role !== 'owner');
  const continueMajorityEnd = nonOwnerActive.length > 0 && continueDisagree > nonOwnerActive.length / 2;

  const castContinuationVote = async (agree) => {
    if (!myProfileId) return;
    await supabase.from('continuation_votes').upsert({ challenge_id: id, voter_id: myProfileId, agree }, { onConflict: 'challenge_id,voter_id' });
    fetchAll();
  };

  const finalizeDisband = async () => {
    await supabase.from('challenges').update({ status: 'early_closed' }).eq('id', id);
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

        {/* 모임장 승계 제안 (나에게 온 경우) */}
        {mySuccession && (
          <div style={{ background: 'white', borderRadius: '16px', padding: '20px', border: '2px solid var(--primary)' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 'bold', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--primary)' }}>
              <Crown size={16} /> 모임장 승계 제안
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '14px' }}>
              모임장이 퇴출되어 부모임장이신 회원님께 운영을 제안드려요. 수락하시겠어요?
            </p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={declineSuccession} style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'white', cursor: 'pointer', fontSize: '14px' }}>거절</button>
              <button onClick={acceptSuccession} style={{ flex: 2, padding: '12px', borderRadius: '10px', border: 'none', background: 'var(--primary)', color: 'white', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' }}>수락하고 운영 맡기</button>
            </div>
          </div>
        )}

        {/* 모임장 공석 — 승계 지원 / 존속 투표 */}
        {!ownerActive && !mySuccession && challenge.status === 'active' && (
          <div style={{ background: 'white', borderRadius: '16px', padding: '20px', border: '2px solid #F59E0B' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 'bold', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px', color: '#F59E0B' }}>
              <ShieldAlert size={16} /> 모임장이 공석이에요
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '14px' }}>
              운영을 맡을 참여자가 필요해요. 직접 맡거나, 계속 운영할지 투표할 수 있어요.
            </p>
            <button onClick={volunteerAsOwner} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: 'none', background: 'var(--primary)', color: 'white', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold', marginBottom: '12px' }}>
              내가 운영을 맡을게요
            </button>

            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
              <p style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '8px' }}>모임을 계속 운영할까요?</p>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                <button onClick={() => castContinuationVote(true)} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: `1px solid ${myContinuationVote?.agree ? 'var(--success)' : 'var(--border-color)'}`, background: myContinuationVote?.agree ? '#E0FAF4' : 'white', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold', color: myContinuationVote?.agree ? 'var(--success)' : 'var(--text-main)' }}>계속 운영 ({continueAgree})</button>
                <button onClick={() => castContinuationVote(false)} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: `1px solid ${myContinuationVote && !myContinuationVote.agree ? '#EF4444' : 'var(--border-color)'}`, background: myContinuationVote && !myContinuationVote.agree ? '#FEF2F2' : 'white', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold', color: myContinuationVote && !myContinuationVote.agree ? '#EF4444' : 'var(--text-main)' }}>종료 ({continueDisagree})</button>
              </div>
              {continueMajorityEnd && (
                <button onClick={finalizeDisband} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: 'none', background: '#EF4444', color: 'white', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}>
                  과반 종료 동의 — 모임 종료 확정
                </button>
              )}
            </div>
          </div>
        )}

        {/* 모임장 본인 인증 신고 — 참여자 투표 */}
        {canManage && ownerTargetReports.length > 0 && (
          <div style={{ background: 'white', borderRadius: '16px', padding: '20px', border: '2px solid #EF4444' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 'bold', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px', color: '#EF4444' }}>
              <Flag size={16} /> 모임장 인증 신고 — 참여자 투표
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
              {ownerTargetReports[0].report_date} 인증에 대한 신고예요. 참여자 과반 동의 시 경고가 부여돼요. ({ownerVoteAgree}/{ownerReportEligible.length}명 동의)
            </p>
            {!isOwner && (
              <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                <button onClick={() => castOwnerVote(true)} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: `1px solid ${myOwnerVote?.agree ? '#EF4444' : 'var(--border-color)'}`, background: myOwnerVote?.agree ? '#FEF2F2' : 'white', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}>동의(부적합)</button>
                <button onClick={() => castOwnerVote(false)} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: `1px solid ${myOwnerVote && !myOwnerVote.agree ? 'var(--success)' : 'var(--border-color)'}`, background: myOwnerVote && !myOwnerVote.agree ? '#E0FAF4' : 'white', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}>반대</button>
              </div>
            )}
            {isSubOwner && ownerVoteMajority && (
              <button onClick={finalizeOwnerVote} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: 'none', background: '#EF4444', color: 'white', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}>
                과반 동의 — 모임장 경고 확정
              </button>
            )}
          </div>
        )}

        {/* 신고 관리 (일반 멤버 대상) */}
        {canManage && memberReportGroups.length > 0 && (
          <div style={{ background: 'white', borderRadius: '16px', padding: '20px', border: '1px solid var(--border-color)' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 'bold', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Flag size={16} color="var(--primary)" /> 신고 관리 ({memberReportGroups.length}건)
            </h3>
            {memberReportGroups.map((group) => (
              <div key={group.key} style={{ padding: '14px', background: '#FFF5F5', borderRadius: '12px', marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '18px' }}>{group.profile?.avatar || '🐰'}</span>
                  <span style={{ fontWeight: 'bold', fontSize: '14px' }}>{group.profile?.nickname || '알 수 없음'}</span>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{group.date} · 신고 {group.items.length}건</span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
                  {group.items.map((r) => (
                    <span key={r.id} style={{ fontSize: '11px', background: '#F3F4F6', color: 'var(--text-muted)', padding: '3px 8px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {r.reporterProfile?.nickname || '익명'}
                      <button onClick={() => handleMarkFalse(r)} style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', fontSize: '10px', fontWeight: 'bold', padding: 0 }}>허위표시</button>
                    </span>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => handleDismissGroup(group)} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'white', cursor: 'pointer', fontSize: '13px' }}>기각</button>
                  <button onClick={() => handleWarnGroup(group)} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', background: '#EF4444', color: 'white', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}>경고 부여</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 부모임장 관리 (모임장 전용) */}
        {isOwner && (
          <div style={{ background: 'white', borderRadius: '16px', padding: '20px', border: '1px solid var(--border-color)' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 'bold', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Crown size={16} color="var(--primary)" /> 부모임장
            </h3>
            {challenge.sub_owner_id ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '14px', fontWeight: 'bold' }}>
                  {members.find((m) => m.user_id === challenge.sub_owner_id)?.profiles?.nickname || '지정됨'}
                </span>
                <button onClick={handleRemoveSubOwner} style={{ fontSize: '12px', color: '#EF4444', background: '#FEF2F2', border: '1px solid #FFD4C8', borderRadius: '20px', padding: '5px 12px', cursor: 'pointer', fontWeight: 'bold' }}>해제</button>
              </div>
            ) : subOwnerPicker ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {modableCandidates.length === 0 ? (
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>지정 가능한 참여자가 없어요</p>
                ) : modableCandidates.map((m) => (
                  <button key={m.user_id} onClick={() => handleSetSubOwner(m.user_id)} style={{ textAlign: 'left', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'white', cursor: 'pointer', fontSize: '13px' }}>
                    {m.profiles?.avatar} {m.profiles?.nickname || '익명'}
                  </button>
                ))}
              </div>
            ) : (
              <button onClick={() => setSubOwnerPicker(true)} style={{ width: '100%', padding: '11px', borderRadius: '10px', border: '1px solid var(--primary)', background: '#FFF0EB', color: 'var(--primary)', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}>
                부모임장 지정하기
              </button>
            )}
          </div>
        )}

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
                    {challenge.sub_owner_id === m.user_id && (
                      <span style={{ marginLeft: '6px', fontSize: '11px', color: 'var(--secondary)', background: '#E8E8F0', padding: '1px 6px', borderRadius: '8px', fontWeight: 'bold' }}>부모임장</span>
                    )}
                    {m.warning_count > 0 && (
                      <span style={{ marginLeft: '6px', fontSize: '11px', color: '#EF4444', background: '#FEF2F2', padding: '1px 6px', borderRadius: '8px', fontWeight: 'bold' }}>경고 {m.warning_count}</span>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {m.certifiedToday
                    ? <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#10B981', background: '#D1FAE5', padding: '3px 10px', borderRadius: '20px' }}>✓ 인증완료</span>
                    : <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-muted)', background: '#F3F4F6', padding: '3px 10px', borderRadius: '20px' }}>미인증</span>
                  }
                  {isOwner && m.role !== 'owner' && (
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
        {isOwner && (
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
        )}

        {/* 챌린지 중지 요청 */}
        {isOwner && (
          <div style={{ background: 'white', borderRadius: '16px', padding: '20px', border: `1px solid ${voteActive ? '#EF4444' : '#FFD4C8'}` }}>
            <h3 style={{ fontSize: '15px', fontWeight: 'bold', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px', color: '#EF4444' }}>
              <AlertTriangle size={16} color="#EF4444" /> 챌린지 중지 요청
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '14px' }}>
              참여자 75% 이상 동의 시 중지 가능
            </p>

            {voteActive ? (
              <>
                <div style={{ background: '#FEF2F2', border: '1px solid #FFD4C8', borderRadius: '12px', padding: '16px', textAlign: 'center', marginBottom: '16px' }}>
                  <p style={{ fontSize: '12px', color: '#EF4444', fontWeight: 'bold', marginBottom: '6px' }}>응답 마감</p>
                  <p style={{ fontSize: '28px', fontWeight: 'bold', color: isVoteExpired ? 'var(--text-muted)' : '#EF4444', letterSpacing: '2px', margin: 0, fontVariantNumeric: 'tabular-nums' }}>
                    {isVoteExpired ? '만료됨' : `${countdown} 전`}
                  </p>
                </div>

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
                    24시간 이내에 75% 이상 동의해야 중지할 수 있어요.
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
        )}
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
