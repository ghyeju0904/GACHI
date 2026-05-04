import React, { useState } from 'react';
import { ArrowLeft, Flame, Trophy, Wallet, ThumbsUp } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';

export default function ChallengeResult() {
  const navigate = useNavigate();
  const { id } = useParams();

  const challenge = {
    title: '하루 1시간 바이브코딩 완료하기',
    duration: '30일',
    deposit: 10000,
    totalMembers: 12,
  };

  const [members, setMembers] = useState([
    { id: 1, username: '김직장인', avatar: '🐰', successDays: 28, totalDays: 30, status: 'success', passionVote: 0, myVoted: false },
    { id: 2, username: '이대학원', avatar: '🐻', successDays: 30, totalDays: 30, status: 'success', passionVote: 0, myVoted: false },
    { id: 3, username: '박스타트업', avatar: '🦊', successDays: 15, totalDays: 30, status: 'fail', passionVote: 0, myVoted: false },
    { id: 4, username: '최직장인', avatar: '🐯', successDays: 29, totalDays: 30, status: 'success', passionVote: 0, myVoted: false },
  ]);

  const [refundDone, setRefundDone] = useState(false);
  const [passionVoteDone, setPassionVoteDone] = useState(false);

  const successMembers = members.filter((m) => m.status === 'success');
  const failMembers = members.filter((m) => m.status === 'fail');
  const totalPool = challenge.deposit * challenge.totalMembers;
  const refundPerPerson = successMembers.length > 0
    ? Math.floor(totalPool / successMembers.length)
    : 0;

  const handlePassionVote = (memberId) => {
    setMembers((prev) =>
      prev.map((m) => {
        if (m.id !== memberId || m.myVoted) return m;
        return { ...m, passionVote: m.passionVote + 1, myVoted: true };
      })
    );
  };

  const allVoted = members.every((m) => m.myVoted || m.status === 'fail');

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
            {successMembers.length}/{challenge.totalMembers}명 완주!
          </p>
        </div>

        {/* 보증금 정산 현황 */}
        <div style={{ background: 'white', borderRadius: '16px', padding: '20px', border: '1px solid var(--border-color)' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Wallet size={18} color="var(--primary)" /> 보증금 정산 현황
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
              <span style={{ color: 'var(--text-muted)' }}>전체 보증금 풀</span>
              <span style={{ fontWeight: 'bold' }}>{totalPool.toLocaleString()}원</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
              <span style={{ color: 'var(--text-muted)' }}>완주자 수</span>
              <span style={{ fontWeight: 'bold', color: 'var(--success)' }}>{successMembers.length}명</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
              <span style={{ color: 'var(--text-muted)' }}>미완주자 수</span>
              <span style={{ fontWeight: 'bold', color: 'var(--primary)' }}>{failMembers.length}명</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '12px', borderTop: '1px solid var(--border-color)', fontSize: '15px' }}>
              <span style={{ fontWeight: 'bold' }}>1인당 환급액</span>
              <span style={{ fontWeight: 'bold', color: 'var(--primary)', fontSize: '18px' }}>{refundPerPerson.toLocaleString()}원</span>
            </div>
          </div>
          {!refundDone ? (
            <button
              onClick={() => setRefundDone(true)}
              style={{ width: '100%', padding: '14px', background: 'var(--primary)', color: 'white', borderRadius: '10px', fontSize: '15px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}
            >
              토스페이로 {refundPerPerson.toLocaleString()}원 환급받기
            </button>
          ) : (
            <div style={{ background: '#E0FAF4', color: 'var(--success)', padding: '14px', borderRadius: '10px', textAlign: 'center', fontWeight: 'bold', fontSize: '15px' }}>
              ✓ 환급 완료!
            </div>
          )}
        </div>

        {/* 열정 투표 섹션 */}
        <div style={{ background: 'white', borderRadius: '16px', padding: '20px', border: '1px solid var(--border-color)' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Flame size={18} color="var(--primary)" /> 열정왕 투표
          </h3>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px', lineHeight: 1.5 }}>
            이번 챌린지에서 가장 열정적이었던 멤버에게 투표해주세요.<br />
            이 결과는 향후 챌린지 개설자가 참여자를 선별하는 데 활용됩니다.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
            {successMembers.map((member) => (
              <div key={member.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#F8F9FA', borderRadius: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#FFF0EB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>
                    {member.avatar}
                  </div>
                  <div>
                    <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{member.username}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      {member.successDays}/{member.totalDays}일 성공
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--primary)', minWidth: '20px', textAlign: 'center' }}>
                    {member.passionVote > 0 ? `+${member.passionVote}` : ''}
                  </span>
                  <button
                    onClick={() => handlePassionVote(member.id)}
                    disabled={member.myVoted}
                    style={{
                      padding: '8px 16px', borderRadius: '20px', border: 'none', cursor: member.myVoted ? 'default' : 'pointer',
                      background: member.myVoted ? '#E0FAF4' : 'var(--primary)',
                      color: member.myVoted ? 'var(--success)' : 'white',
                      fontSize: '13px', fontWeight: 'bold',
                      display: 'flex', alignItems: 'center', gap: '4px'
                    }}
                  >
                    <ThumbsUp size={14} /> {member.myVoted ? '투표 완료' : '투표'}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {failMembers.length > 0 && (
            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>미완주 멤버</p>
              {failMembers.map((member) => (
                <div key={member.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', opacity: 0.5 }}>
                  <div style={{ fontSize: '16px' }}>{member.avatar}</div>
                  <span style={{ fontSize: '14px' }}>{member.username}</span>
                  <span style={{ fontSize: '12px', color: 'var(--primary)' }}>— {member.successDays}/{member.totalDays}일</span>
                </div>
              ))}
            </div>
          )}

          {allVoted && !passionVoteDone && (
            <button
              onClick={() => setPassionVoteDone(true)}
              style={{ width: '100%', marginTop: '12px', padding: '14px', background: 'var(--secondary)', color: 'white', borderRadius: '10px', fontSize: '15px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}
            >
              투표 결과 제출하기
            </button>
          )}
          {passionVoteDone && (
            <div style={{ marginTop: '12px', background: '#E0FAF4', color: 'var(--success)', padding: '14px', borderRadius: '10px', textAlign: 'center', fontWeight: 'bold', fontSize: '15px' }}>
              ✓ 열정 투표 완료! 결과가 반영됩니다.
            </div>
          )}
        </div>

        {/* 랭킹 */}
        <div style={{ background: 'white', borderRadius: '16px', padding: '20px', border: '1px solid var(--border-color)' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Trophy size={18} color="var(--warning)" /> 이번 챌린지 랭킹
          </h3>
          {[...successMembers].sort((a, b) => b.successDays - a.successDays).map((member, idx) => (
            <div key={member.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0', borderBottom: idx < successMembers.length - 1 ? '1px solid var(--border-color)' : 'none' }}>
              <span style={{ fontSize: '18px', width: '28px', textAlign: 'center' }}>
                {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}`}
              </span>
              <span style={{ fontSize: '18px' }}>{member.avatar}</span>
              <span style={{ fontWeight: 'bold', flex: 1 }}>{member.username}</span>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{member.successDays}일 성공</span>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
