import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, CheckCircle, ThumbsUp, ThumbsDown, Flame, Trophy, LogOut } from 'lucide-react';
import { logEvent } from '../../services/logger';
import { supabase } from '../../services/supabase';
import { useNavigate, useParams } from 'react-router-dom';

function getRelativeTime(isoStr) {
  const diff = Date.now() - new Date(isoStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return '방금 전';
  if (mins < 60) return `${mins}분 전`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}시간 전`;
  return `${Math.floor(hrs / 24)}일 전`;
}

export default function GroupFeed() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [challengeTitle, setChallengeTitle] = useState('챌린지 피드');

  useEffect(() => {
    logEvent('feed_view', `/feed/${id}`, { challenge_id: id });

    // Supabase에서 챌린지 제목 fetch
    const fetchTitle = async () => {
      const { data, error } = await supabase
        .from('challenges')
        .select('title')
        .eq('id', id)
        .single();

      if (!error && data) {
        setChallengeTitle(data.title);
      } else {
        // localStorage fallback
        try {
          const owned = JSON.parse(localStorage.getItem('my_challenges') || '[]');
          const found = owned.find((c) => String(c.id) === String(id));
          if (found) setChallengeTitle(found.title);
        } catch {}
      }
    };
    fetchTitle();
  }, [id]);

  const challengeData = useMemo(() => {
    try {
      const all = JSON.parse(localStorage.getItem('my_challenges') || '[]');
      return all.find((c) => String(c.id) === String(id)) || null;
    } catch { return null; }
  }, [id]);

  const [giveUpModal, setGiveUpModal] = useState(false);
  const [giveUpStep,  setGiveUpStep]  = useState(1);

  const openGiveUp  = () => { setGiveUpModal(true); setGiveUpStep(1); };
  const closeGiveUp = () => setGiveUpModal(false);

  const handleConfirmGiveUp = () => {
    try {
      const all = JSON.parse(localStorage.getItem('my_challenges') || '[]');
      localStorage.setItem('my_challenges', JSON.stringify(all.filter((c) => String(c.id) !== String(id))));
      const prev = JSON.parse(localStorage.getItem('given_up_challenges') || '[]');
      localStorage.setItem('given_up_challenges', JSON.stringify([...new Set([...prev.map(String), String(id)])]));
    } catch {}
    logEvent('challenge_give_up', `/feed/${id}`, { challenge_id: id });
    navigate('/home');
  };

  const [posts, setPosts] = useState(() => {
    const myPosts = (() => {
      try {
        const allPosts = JSON.parse(localStorage.getItem('feed_posts') || '{}');
        return (allPosts[id] || []).map((p) => ({ ...p, time: getRelativeTime(p.createdAt) }));
      } catch { return []; }
    })();
    return [...myPosts];
  });

  const totalMembers = 12;

  const handleVote = (postId, voteType) => {
    setPosts((prev) =>
      prev.map((post) => {
        if (post.id !== postId) return post;
        const prev_vote = post.myVote;
        if (prev_vote === voteType) {
          // 같은 투표 다시 누르면 취소
          return {
            ...post,
            myVote: null,
            approve: voteType === 'approve' ? post.approve - 1 : post.approve,
            reject: voteType === 'reject' ? post.reject - 1 : post.reject,
          };
        }
        // 이전 투표 취소 후 새 투표 반영
        return {
          ...post,
          myVote: voteType,
          approve: voteType === 'approve'
            ? post.approve + 1
            : prev_vote === 'approve' ? post.approve - 1 : post.approve,
          reject: voteType === 'reject'
            ? post.reject + 1
            : prev_vote === 'reject' ? post.reject - 1 : post.reject,
        };
      })
    );
  };

  const getVoteStatus = (post) => {
    const total = post.approve + post.reject;
    if (total === 0) return null;
    const approveRate = post.approve / total;
    if (approveRate >= 0.5) return 'approved';
    return 'rejected';
  };

  return (
    <div style={{ backgroundColor: '#F8F9FA', minHeight: '100vh', paddingBottom: '100px' }}>
      <header style={{ padding: '16px 20px', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <ArrowLeft size={24} style={{ cursor: 'pointer', marginRight: '16px' }} onClick={() => navigate('/home')} />
          <h1 className="font-display" style={{ fontSize: '15px', margin: 0, color: 'var(--primary)' }}>{challengeTitle}</h1>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {/* 중도 포기 버튼 */}
          <button onClick={openGiveUp}
            style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'none', border: '1px solid var(--border-color)', borderRadius: '20px', padding: '6px 12px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', color: 'var(--text-muted)' }}>
            <LogOut size={14} /> 포기
          </button>
          {/* 챌린지 종료 결과 보기 버튼 */}
          <button
            onClick={() => navigate(`/result/${id}`)}
            style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'none', border: '1px solid var(--border-color)', borderRadius: '20px', padding: '6px 12px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', color: 'var(--text-muted)' }}
          >
            <Trophy size={14} /> 결과보기
          </button>
        </div>
      </header>

      {/* 그룹 달성률 요약 */}
      <div style={{ padding: '16px 20px', background: 'white', borderBottom: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span style={{ fontWeight: 'bold', fontSize: '14px' }}>오늘의 그룹 달성률</span>
          <span style={{ color: 'var(--primary)', fontWeight: 'bold', fontSize: '14px' }}>
            {posts.filter(p => getVoteStatus(p) === 'approved').length}/{totalMembers}명 인증 완료
          </span>
        </div>
        <div style={{ width: '100%', height: '8px', background: '#F3F4F6', borderRadius: '4px', overflow: 'hidden' }}>
          <div style={{ width: `${(posts.filter(p => getVoteStatus(p) === 'approved').length / totalMembers) * 100}%`, height: '100%', background: 'var(--primary)', borderRadius: '4px', transition: 'width 0.3s' }} />
        </div>
        <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>
          참여자 과반 인정 투표 시 인증 확정 · 미달 시 해당 일 실패 처리
        </p>
      </div>

      {/* 인증 타임라인 */}
      <div style={{ padding: '20px' }}>
        {posts.map((post) => {
          const voteStatus = getVoteStatus(post);
          const totalVotes = post.approve + post.reject;
          const approveRate = totalVotes > 0 ? Math.round((post.approve / totalVotes) * 100) : 0;

          return (
            <div key={post.id} style={{ background: 'white', borderRadius: '16px', padding: '20px', marginBottom: '16px', border: `1px solid ${voteStatus === 'rejected' ? '#FFD4C8' : 'var(--border-color)'}`, boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>

              {/* 인증 상태 배지 */}
              {voteStatus && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
                  <span style={{
                    fontSize: '11px', fontWeight: 'bold', padding: '3px 8px', borderRadius: '20px',
                    background: voteStatus === 'approved' ? '#E0FAF4' : '#FFF0EB',
                    color: voteStatus === 'approved' ? 'var(--success)' : 'var(--primary)'
                  }}>
                    {voteStatus === 'approved' ? '✓ 인증 확정' : '⚠ 미인정 위험'}
                  </span>
                </div>
              )}

              {/* 유저 정보 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <div style={{ width: '40px', height: '40px', background: '#F3F4F6', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>
                  {post.avatar}
                </div>
                <div>
                  <div style={{ fontWeight: 'bold', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {post.username}
                    {voteStatus === 'approved' && <CheckCircle size={14} color="var(--success)" />}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{post.time}</div>
                </div>
              </div>

              {/* 인증 콘텐츠 */}
              {post.type === 'text' ? (
                <div style={{ background: '#F8F9FA', borderRadius: '8px', padding: '16px', marginBottom: '12px', fontSize: '14px', lineHeight: 1.7, color: 'var(--text-main)', whiteSpace: 'pre-wrap' }}>
                  {post.textBody || post.content}
                </div>
              ) : post.type === 'check' ? (
                <div style={{ height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#E0FAF4', borderRadius: '8px', marginBottom: '12px', fontSize: '16px', fontWeight: 'bold', color: 'var(--success)' }}>
                  ✅ 체크인 완료
                </div>
              ) : post.photoData ? (
                <img src={post.photoData} alt="인증 사진" style={{ width: '100%', height: '200px', objectFit: 'cover', borderRadius: '8px', marginBottom: '12px', display: 'block' }} />
              ) : (
                <div style={{ height: '200px', background: '#F3F4F6', borderRadius: '8px', marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
                  인증 사진 영역
                </div>
              )}

              {post.content && (
                <p style={{ fontSize: '14px', lineHeight: 1.5, marginBottom: '16px', color: 'var(--text-main)' }}>{post.content}</p>
              )}

              {/* 인정/미인정 투표 */}
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '14px' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Flame size={12} color="var(--primary)" />
                  이 인증, 인정하시나요? ({totalVotes}명 투표 · 인정 {approveRate}%)
                </div>

                {/* 투표 진행 바 */}
                {totalVotes > 0 && (
                  <div style={{ width: '100%', height: '4px', background: '#FFD4C8', borderRadius: '2px', marginBottom: '12px', overflow: 'hidden' }}>
                    <div style={{ width: `${approveRate}%`, height: '100%', background: 'var(--success)', borderRadius: '2px', transition: 'width 0.3s' }} />
                  </div>
                )}

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => handleVote(post.id, 'approve')}
                    style={{
                      flex: 1, padding: '10px', borderRadius: '8px', border: `1px solid ${post.myVote === 'approve' ? 'var(--success)' : 'var(--border-color)'}`,
                      background: post.myVote === 'approve' ? '#E0FAF4' : 'white',
                      color: post.myVote === 'approve' ? 'var(--success)' : 'var(--text-muted)',
                      fontSize: '13px', fontWeight: 'bold', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                    }}
                  >
                    <ThumbsUp size={16} /> 인정 {post.approve}
                  </button>
                  <button
                    onClick={() => handleVote(post.id, 'reject')}
                    style={{
                      flex: 1, padding: '10px', borderRadius: '8px', border: `1px solid ${post.myVote === 'reject' ? 'var(--primary)' : 'var(--border-color)'}`,
                      background: post.myVote === 'reject' ? '#FFF0EB' : 'white',
                      color: post.myVote === 'reject' ? 'var(--primary)' : 'var(--text-muted)',
                      fontSize: '13px', fontWeight: 'bold', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                    }}
                  >
                    <ThumbsDown size={16} /> 미인정 {post.reject}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 하단 인증하기 CTA */}
      <div style={{ position: 'fixed', bottom: 'var(--nav-height)', left: 0, right: 0, padding: '16px 20px', background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(10px)', borderTop: '1px solid var(--border-color)', maxWidth: '480px', margin: '0 auto', zIndex: 100 }}>
        <button
          onClick={() => navigate(`/certify/${id}`)}
          style={{ width: '100%', padding: '16px', background: 'var(--primary)', color: 'white', borderRadius: '12px', fontSize: '16px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}
        >
          오늘도 챌리 불꽃 지켜! (인증하기)
        </button>
      </div>

      {/* 중도 포기 모달 */}
      {giveUpModal && (
        <div onClick={closeGiveUp}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div onClick={(e) => e.stopPropagation()}
            style={{ width: '100%', maxWidth: '480px', background: 'white', borderRadius: '20px 20px 0 0', padding: '28px 24px 40px' }}>

            {giveUpStep === 1 ? (
              <>
                <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                  <div style={{ fontSize: '52px', marginBottom: '14px' }}>🔥</div>
                  <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '10px', color: 'var(--text-main)' }}>포기하기 전에 잠깐만요!</h3>
                  <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.7, margin: 0 }}>
                    챌린지 완주까지 앞으로<br />
                    <strong style={{ fontSize: '20px', color: 'var(--primary)' }}>D-{challengeData?.dDay ?? '?'}</strong>일 남았어요.<br />
                    여기서 멈추기엔 너무 아깝잖아요.<br />
                    우리 좀 더 같이 달려봐요! 💪
                  </p>
                </div>
                <button onClick={closeGiveUp}
                  style={{ width: '100%', padding: '15px', background: 'var(--primary)', color: 'white', borderRadius: '12px', fontSize: '16px', fontWeight: 'bold', border: 'none', cursor: 'pointer', marginBottom: '10px' }}>
                  계속 도전할게요! 💪
                </button>
                <button onClick={() => setGiveUpStep(2)}
                  style={{ width: '100%', padding: '12px', background: 'none', color: 'var(--text-muted)', borderRadius: '12px', fontSize: '14px', border: 'none', cursor: 'pointer' }}>
                  그래도 포기할게요
                </button>
              </>
            ) : (
              <>
                <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                  <div style={{ fontSize: '52px', marginBottom: '14px' }}>⚠️</div>
                  <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '10px', color: '#EF4444' }}>중도 포기 = 실패 처리</h3>
                  <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.7, margin: 0 }}>
                    중도 포기는 챌린지 실패와 동일하게 처리돼요.<br />
                    납부하신 보증금{' '}
                    <strong style={{ color: '#EF4444' }}>{challengeData?.deposit?.toLocaleString() ?? 0}원</strong>은<br />
                    <strong>반환되지 않습니다.</strong>
                  </p>
                </div>
                <button onClick={handleConfirmGiveUp}
                  style={{ width: '100%', padding: '15px', background: '#EF4444', color: 'white', borderRadius: '12px', fontSize: '16px', fontWeight: 'bold', border: 'none', cursor: 'pointer', marginBottom: '10px' }}>
                  포기하기
                </button>
                <button onClick={() => setGiveUpStep(1)}
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
