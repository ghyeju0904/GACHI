import React, { useState, useMemo } from 'react';
import { ArrowLeft, Users, Clock, Flame, Wallet, ShieldCheck, X, CheckCircle } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';

const ALL_CHALLENGES = [
  { id: 1,  title: '새벽 5시 기상 루틴 21일',   category: '미라클모닝', duration: '21일', members: 8,  maxMembers: 15, deposit: 10000, certifyType: '사진 인증', description: '매일 새벽 5시에 기상하여 하루를 일찍 시작하는 습관을 만듭니다.' },
  { id: 2,  title: '매일 아침 6시 전 일어나기',   category: '미라클모닝', duration: '30일', members: 12, maxMembers: 20, deposit: 5000,  certifyType: '사진 인증', description: '아침형 인간이 되기 위한 30일 프로젝트.' },
  { id: 3,  title: '하루 30분 홈트레이닝',        category: '운동',       duration: '30일', members: 20, maxMembers: 30, deposit: 20000, certifyType: '사진 인증', description: '집에서 30분 운동으로 건강한 습관을 만들어요.' },
  { id: 4,  title: '매일 만보 걷기 30일',         category: '운동',       duration: '30일', members: 6,  maxMembers: 10, deposit: 10000, certifyType: '체크인', description: '하루 1만 보를 걸으며 건강을 챙겨요.' },
  { id: 5,  title: '매일 1시간 집중 공부',        category: '스터디',     duration: '30일', members: 9,  maxMembers: 15, deposit: 15000, certifyType: '사진 인증', description: '매일 1시간 집중해서 공부하는 습관을 만들어요.' },
  { id: 6,  title: '자격증 합격 30일 스터디',     category: '스터디',     duration: '30일', members: 5,  maxMembers: 10, deposit: 30000, certifyType: '텍스트 인증', description: '자격증 취득을 위한 30일 집중 스터디.' },
  { id: 7,  title: '하루 1시간 바이브코딩',       category: '바이브코딩', duration: '30일', members: 14, maxMembers: 20, deposit: 10000, certifyType: '사진 인증', description: '하루에 1시간씩 사이드 프로젝트나 알고리즘 등을 바이브코딩합니다.' },
  { id: 8,  title: '사이드 프로젝트 30일 완성',   category: '바이브코딩', duration: '30일', members: 7,  maxMembers: 10, deposit: 20000, certifyType: '사진 인증', description: '30일 안에 나만의 사이드 프로젝트를 완성해요.' },
  { id: 9,  title: '하루 30분 독서 습관',         category: '독서',       duration: '30일', members: 11, maxMembers: 20, deposit: 5000,  certifyType: '텍스트 인증', description: '매일 30분 독서로 지식을 쌓아요.' },
  { id: 10, title: '다이어트 식단 21일 기록',     category: '다이어트',   duration: '21일', members: 18, maxMembers: 30, deposit: 15000, certifyType: '사진 인증', description: '21일 동안 건강한 식단을 기록하고 유지해요.' },
  { id: 11, title: '매일 명상 10분',              category: '명상',       duration: '30일', members: 6,  maxMembers: 15, deposit: 5000,  certifyType: '체크인', description: '하루 10분 명상으로 마음의 평화를 찾아요.' },
  { id: 12, title: '영어 단어 20개 암기 30일',    category: '외국어',     duration: '30일', members: 8,  maxMembers: 20, deposit: 10000, certifyType: '텍스트 인증', description: '매일 영어 단어 20개를 암기하여 어휘력을 키워요.' },
];

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

  const challenge = useMemo(() => {
    const found = ALL_CHALLENGES.find((c) => String(c.id) === String(id));
    if (found) return found;
    // localStorage owned challenge
    try {
      const owned = JSON.parse(localStorage.getItem('my_challenges') || '[]');
      return owned.find((c) => String(c.id) === String(id)) || ALL_CHALLENGES[6];
    } catch { return ALL_CHALLENGES[6]; }
  }, [id]);

  const memberStatus = getMemberStatus(challenge.members || 0, challenge.maxMembers || 30);

  // 이미 참가 중인지 확인
  const alreadyJoined = useMemo(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('my_challenges') || '[]');
      return saved.some((c) => String(c.id) === String(id));
    } catch { return false; }
  }, [id]);

  const handlePay = () => {
    setPaying(true);
    // 토스페이 연동 시뮬레이션 (1.2초 후 완료)
    setTimeout(() => {
      // localStorage에 참여 챌린지 추가
      const newEntry = {
        id: Number(id),
        title: challenge.title,
        category: challenge.category,
        deposit: challenge.deposit,
        dDay: 30,
        streak: 0,
        role: 'member',
        joinedAt: new Date().toISOString(),
      };
      const prev = JSON.parse(localStorage.getItem('my_challenges') || '[]');
      if (!prev.some((c) => String(c.id) === String(id))) {
        localStorage.setItem('my_challenges', JSON.stringify([newEntry, ...prev]));
      }
      setPaying(false);
      setPaid(true);
      setTimeout(() => {
        setShowDepositModal(false);
        navigate(`/feed/${id}`);
      }, 1000);
    }, 1200);
  };

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
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Clock size={16} /> {challenge.duration}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Users size={16} /> {challenge.members}/{challenge.maxMembers}명</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><ShieldCheck size={16} /> {challenge.certifyType}</span>
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
        {alreadyJoined ? (
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
              onClick={() => challenge.members >= challenge.maxMembers ? null : setShowDepositModal(true)}
              disabled={challenge.members >= challenge.maxMembers}
              style={{ width: '100%', padding: '16px', background: challenge.members >= challenge.maxMembers ? '#E5E7EB' : 'var(--primary)', color: challenge.members >= challenge.maxMembers ? 'var(--text-muted)' : 'white', borderRadius: '12px', fontSize: '16px', fontWeight: 'bold', border: 'none', cursor: challenge.members >= challenge.maxMembers ? 'not-allowed' : 'pointer' }}>
              {challenge.members >= challenge.maxMembers ? '멤버 마감' : '보증금 납부하고 참여하기'}
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
              {[['챌린지', challenge.title], ['기간', challenge.duration], ['인증 방식', challenge.certifyType]].map(([label, val]) => (
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
