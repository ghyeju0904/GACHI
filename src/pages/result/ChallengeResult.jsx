import React, { useState, useEffect } from 'react';
import { ArrowLeft, Trophy, Coins, ShieldAlert } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import { awardPoints } from '../../utils/points';

const REWARD_TABLE = [
  { max: 0, points: 5, label: '경고 0회 · 완료' },
  { max: 1, points: 3, label: '경고 1회 · 완료' },
  { max: 2, points: 2, label: '경고 2회 · 완료' },
];

function rewardFor(warningCount) {
  const tier = REWARD_TABLE.find((t) => warningCount <= t.max);
  return tier || { points: 0, label: '경고 3회 · 퇴출' };
}

export default function ChallengeResult() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [challenge, setChallenge] = useState(null);
  const [members,   setMembers]   = useState([]);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    const load = async () => {
      const [{ data: ch }, { data: mems }, { data: certs }] = await Promise.all([
        supabase.from('challenges').select('*').eq('id', id).single(),
        supabase.from('challenge_members').select('*, profiles(avatar, nickname)').eq('challenge_id', id),
        supabase.from('certifications').select('user_id').eq('challenge_id', id),
      ]);

      setChallenge(ch);

      const certCountByUser = {};
      (certs || []).forEach((c) => { certCountByUser[c.user_id] = (certCountByUser[c.user_id] || 0) + 1; });

      const memberList = (mems || []).map((m) => ({
        ...m,
        certCount: certCountByUser[m.user_id] || 0,
        reward: rewardFor(m.warning_count || 0),
      }));
      setMembers(memberList);

      // 완료된 챌린지 최초 조회 시 보상 포인트를 1회 지급
      if (ch && (ch.status === 'completed' || ch.status === 'early_closed')) {
        for (const m of memberList) {
          if (m.status === 'active' && !m.reward_claimed && m.reward.points > 0) {
            await awardPoints(m.user_id, m.reward.points, 'challenge_complete', `'${ch.title}' 챌린지 완료 보상 (${m.reward.label})`, ch.id);
            await supabase.from('challenge_members').update({ reward_claimed: true }).eq('challenge_id', id).eq('user_id', m.user_id);
          }
        }
      }

      setLoading(false);
    };
    load();
  }, [id]);

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

  const activeMembers  = members.filter((m) => m.status === 'active');
  const kickedMembers  = members.filter((m) => m.status === 'kicked');
  const gaveUpMembers  = members.filter((m) => m.status === 'gave_up');
  const ranking = [...activeMembers].sort((a, b) => b.certCount - a.certCount);

  return (
    <div style={{ backgroundColor: '#F8F9FA', minHeight: '100vh', paddingBottom: '40px' }}>
      <header style={{ padding: '16px 20px', background: 'white', display: 'flex', alignItems: 'center', borderBottom: '1px solid var(--border-color)', position: 'sticky', top: 0, zIndex: 10 }}>
        <ArrowLeft size={24} style={{ cursor: 'pointer', marginRight: '16px' }} onClick={() => navigate(-1)} />
        <h1 style={{ fontSize: '17px', fontWeight: 'bold', margin: 0 }}>챌린지 결과</h1>
      </header>

      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* 챌린지 요약 배너 */}
        <div style={{ background: 'var(--secondary)', borderRadius: '16px', padding: '24px', color: 'white', textAlign: 'center' }}>
          <div style={{ fontSize: '36px', marginBottom: '8px' }}>🎉</div>
          <h2 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '4px', color: 'rgba(255,255,255,0.7)' }}>{challenge.title}</h2>
          <p style={{ fontSize: '22px', fontWeight: 'bold', color: 'var(--warning)' }}>
            {activeMembers.length}명 완료!
          </p>
        </div>

        {/* 포인트 보상 현황 */}
        <div style={{ background: 'white', borderRadius: '16px', padding: '20px', border: '1px solid var(--border-color)' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Coins size={18} color="var(--primary)" /> 포인트 보상
          </h3>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '14px' }}>
            경고 누적 횟수에 따라 완료 보상이 달라져요 (0회 5P · 1회 3P · 2회 2P · 3회 퇴출 0P)
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {activeMembers.map((m) => (
              <div key={m.user_id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: '#F8F9FA', borderRadius: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '18px' }}>{m.profiles?.avatar || '🐰'}</span>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 'bold' }}>{m.profiles?.nickname || '익명'}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{m.reward.label} · 인증 {m.certCount}회</div>
                  </div>
                </div>
                <span style={{ fontSize: '15px', fontWeight: 'bold', color: 'var(--primary)' }}>+{m.reward.points}P</span>
              </div>
            ))}
          </div>

          {(kickedMembers.length > 0 || gaveUpMembers.length > 0) && (
            <div style={{ borderTop: '1px solid var(--border-color)', marginTop: '14px', paddingTop: '12px' }}>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <ShieldAlert size={12} /> 미완료 참여자
              </p>
              {[...kickedMembers, ...gaveUpMembers].map((m) => (
                <div key={m.user_id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 0', opacity: 0.5, fontSize: '13px' }}>
                  <span>{m.profiles?.avatar}</span>
                  <span>{m.profiles?.nickname}</span>
                  <span style={{ color: 'var(--text-muted)' }}>— {m.status === 'kicked' ? '퇴출' : '중도 포기'}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 랭킹 */}
        <div style={{ background: 'white', borderRadius: '16px', padding: '20px', border: '1px solid var(--border-color)' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Trophy size={18} color="var(--warning)" /> 인증 랭킹
          </h3>
          {ranking.length === 0 ? (
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center', padding: '12px 0' }}>완료한 참여자가 없어요</p>
          ) : ranking.map((member, idx) => (
            <div key={member.user_id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0', borderBottom: idx < ranking.length - 1 ? '1px solid var(--border-color)' : 'none' }}>
              <span style={{ fontSize: '18px', width: '28px', textAlign: 'center' }}>
                {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}`}
              </span>
              <span style={{ fontSize: '18px' }}>{member.profiles?.avatar}</span>
              <span style={{ fontWeight: 'bold', flex: 1 }}>{member.profiles?.nickname}</span>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{member.certCount}회 인증</span>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
