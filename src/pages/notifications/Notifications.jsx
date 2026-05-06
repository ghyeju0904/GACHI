import React, { useEffect } from 'react';
import { ArrowLeft, BellRing, Clock, Star, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { logEvent } from '../../services/logger';

export default function Notifications() {
  const navigate = useNavigate();

  useEffect(() => {
    logEvent('page_view', '/notifications');
  }, []);

  const notis = [
    {
      type: 'CERTIFY',
      text: '하루 1시간 바이브코딩 — 오늘 멤버 9명이 인증했어요! 챌린지가 기다려요 🔥',
      time: '10분 전',
      icon: <Star size={16} color="var(--primary)" />,
      challengeId: 7,
    },
    {
      type: 'REMINDER',
      text: '매일 아침 6시 기상 — 인증 마감까지 1시간 남았습니다.',
      time: '1시간 전',
      icon: <Clock size={16} color="var(--warning)" />,
      challengeId: 1,
    },
    {
      type: 'VOTE',
      text: '매일 1시간 집중 공부 — 김직장인님의 인증에 미인정 투표가 늘고 있어요. 확인해보세요.',
      time: '3시간 전',
      icon: <BellRing size={16} color="var(--primary)" />,
      challengeId: 5,
    },
    {
      type: 'EVENT',
      text: '🎉 3일 연속 달성! 불씨 챌리 레벨이 되었습니다.',
      time: '어제',
      icon: <BellRing size={16} color="var(--success)" />,
      challengeId: null,
    },
  ];

  return (
    <div style={{ backgroundColor: '#F8F9FA', minHeight: '100vh' }}>
      <header style={{ padding: '16px 20px', background: 'white', display: 'flex', alignItems: 'center', borderBottom: '1px solid var(--border-color)', position: 'sticky', top: 0, zIndex: 10 }}>
        <ArrowLeft size={24} style={{ cursor: 'pointer', marginRight: '16px' }} onClick={() => navigate(-1)} />
        <h1 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0 }}>알림</h1>
      </header>

      <div style={{ padding: '16px 20px' }}>
        {notis.map((n, i) => (
          <div
            key={i}
            onClick={() => n.challengeId && navigate(`/feed/${n.challengeId}`)}
            style={{
              display: 'flex', gap: '14px', padding: '16px',
              background: 'white', borderRadius: '12px',
              border: '1px solid var(--border-color)', marginBottom: '10px',
              cursor: n.challengeId ? 'pointer' : 'default',
              alignItems: 'center',
            }}
          >
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {n.icon}
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: '14px', fontWeight: '500', lineHeight: 1.5, margin: 0 }}>{n.text}</p>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>{n.time}</div>
            </div>
            {n.challengeId && <ChevronRight size={16} color="var(--text-muted)" style={{ flexShrink: 0 }} />}
          </div>
        ))}
      </div>
    </div>
  );
}
