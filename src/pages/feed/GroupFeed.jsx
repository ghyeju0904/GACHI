import React, { useState, useMemo } from 'react';
import { ArrowLeft, CheckCircle, ThumbsUp, ThumbsDown, Flame, Trophy } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';

const ALL_CHALLENGES = [
  { id: 1,  title: '새벽 5시 기상 루틴 21일',     category: '미라클모닝' },
  { id: 2,  title: '매일 아침 6시 전 일어나기',     category: '미라클모닝' },
  { id: 3,  title: '하루 30분 홈트레이닝',          category: '운동' },
  { id: 4,  title: '매일 만보 걷기 30일',           category: '운동' },
  { id: 5,  title: '매일 1시간 집중 공부',          category: '스터디' },
  { id: 6,  title: '자격증 합격 30일 스터디',       category: '스터디' },
  { id: 7,  title: '하루 1시간 바이브코딩',         category: '바이브코딩' },
  { id: 8,  title: '사이드 프로젝트 30일 완성',     category: '바이브코딩' },
  { id: 9,  title: '하루 30분 독서 습관',           category: '독서' },
  { id: 10, title: '다이어트 식단 21일 기록',       category: '다이어트' },
  { id: 11, title: '매일 명상 10분',                category: '명상' },
  { id: 12, title: '영어 단어 20개 암기 30일',      category: '외국어' },
];

export default function GroupFeed() {
  const navigate = useNavigate();
  const { id } = useParams();

  const challengeTitle = useMemo(() => {
    const found = ALL_CHALLENGES.find((c) => String(c.id) === String(id));
    if (found) return found.title;
    try {
      const owned = JSON.parse(localStorage.getItem('my_challenges') || '[]');
      const o = owned.find((c) => String(c.id) === String(id));
      if (o) return o.title;
    } catch {}
    return '챌린지 피드';
  }, [id]);

  const [posts, setPosts] = useState([
    {
      id: 1,
      username: '김직장인',
      avatar: '🐰',
      time: '10분 전',
      content: '오늘도 바이브코딩 달렸습니다!!',
      approve: 8,
      reject: 1,
      myVote: null,
    },
    {
      id: 2,
      username: '이대학원',
      avatar: '🐻',
      time: '1시간 전',
      content: '리액트 기초 복습 끝!',
      approve: 5,
      reject: 4,
      myVote: null,
    },
  ]);

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
        {/* 챌린지 종료 결과 보기 버튼 */}
        <button
          onClick={() => navigate(`/result/${id}`)}
          style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'none', border: '1px solid var(--border-color)', borderRadius: '20px', padding: '6px 12px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', color: 'var(--text-muted)' }}
        >
          <Trophy size={14} /> 결과보기
        </button>
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

              {/* 인증 사진 영역 */}
              <div style={{ height: '200px', background: '#F3F4F6', borderRadius: '8px', marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
                인증 사진 영역
              </div>

              <p style={{ fontSize: '14px', lineHeight: 1.5, marginBottom: '16px', color: 'var(--text-main)' }}>{post.content}</p>

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
    </div>
  );
}
