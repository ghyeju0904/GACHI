import React, { useState, useEffect } from 'react';
import { ArrowLeft, BellRing, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import { getProfileId } from '../../utils/getProfileId';
import { logEvent } from '../../services/logger';

function getRelativeTime(isoStr) {
  const diff = Date.now() - new Date(isoStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return '방금 전';
  if (mins < 60) return `${mins}분 전`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}시간 전`;
  return `${Math.floor(hrs / 24)}일 전`;
}

const TYPE_ICON = {
  early_close_request: '⚠️',
  challenge_join:      '🎉',
  certification:       '🔥',
};

export default function Notifications() {
  const navigate = useNavigate();
  const [notifs, setNotifs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    logEvent('page_view', '/notifications');

    const fetchNotifs = async () => {
      const profileId = await getProfileId();
      console.log('[NOTIF] profileId:', profileId);
      if (!profileId) {
        console.log('[NOTIF] profileId 없음 → 프로필이 Supabase에 없어요');
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', profileId)
        .order('created_at', { ascending: false });

      console.log('[NOTIF] 조회 결과:', { data, error });

      setNotifs(data || []);
      setLoading(false);

      // 전체 읽음 처리
      if (data && data.some((n) => !n.read)) {
        await supabase
          .from('notifications')
          .update({ read: true })
          .eq('user_id', profileId)
          .eq('read', false);
      }
    };
    fetchNotifs();
  }, []);

  return (
    <div style={{ backgroundColor: '#F8F9FA', minHeight: '100vh' }}>
      <header style={{ padding: '16px 20px', background: 'white', display: 'flex', alignItems: 'center', borderBottom: '1px solid var(--border-color)', position: 'sticky', top: 0, zIndex: 10 }}>
        <ArrowLeft size={24} style={{ cursor: 'pointer', marginRight: '16px' }} onClick={() => navigate(-1)} />
        <h1 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0 }}>알림</h1>
      </header>

      <div style={{ padding: '16px 20px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>불러오는 중...</div>
        ) : notifs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <BellRing size={40} color="var(--border-color)" style={{ marginBottom: '12px' }} />
            <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>알림이 없어요</p>
          </div>
        ) : (
          notifs.map((n) => (
            <div
              key={n.id}
              onClick={() => n.challenge_id && navigate(`/feed/${n.challenge_id}`)}
              style={{
                display: 'flex', gap: '14px', padding: '16px',
                background: n.read ? 'white' : '#FFF8F5',
                borderRadius: '12px', marginBottom: '10px',
                border: `1px solid ${n.read ? 'var(--border-color)' : '#FFD4C8'}`,
                cursor: n.challenge_id ? 'pointer' : 'default',
                alignItems: 'flex-start',
              }}
            >
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: n.read ? '#F3F4F6' : '#FFF0EB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>
                {TYPE_ICON[n.type] || '🔔'}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '14px', fontWeight: n.read ? '400' : '600', lineHeight: 1.5, margin: 0 }}>
                  {n.message}
                </p>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  {getRelativeTime(n.created_at)}
                </div>
              </div>
              {n.challenge_id && <ChevronRight size={16} color="var(--text-muted)" style={{ flexShrink: 0, marginTop: '2px' }} />}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
