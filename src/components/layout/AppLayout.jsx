import React, { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { BottomNav } from './BottomNav';
import { supabase } from '../../services/supabase';
import { getProfileId } from '../../utils/getProfileId';

export function AppLayout() {
  const location = useLocation();

  const hideNavRoutes = ['/', '/login', '/onboarding'];
  const shouldHideNav = hideNavRoutes.includes(location.pathname);

  // 앱 시작 시 Supabase certifications → localStorage 동기화
  useEffect(() => {
    const syncCertifiedDates = async () => {
      try {
        const profileId = await getProfileId();
        if (!profileId) return;

        const { data, error } = await supabase
          .from('certifications')
          .select('cert_date, challenge_id')
          .eq('user_id', profileId);

        if (error || !data) return;

        // Supabase 데이터가 있을 때만 localStorage 갱신 (빈 데이터로 로컬 기록 덮어쓰기 방지)
        if (data.length === 0) return;

        // certified_dates: 전체 인증 날짜 Set
        const allDates = [...new Set(data.map((r) => r.cert_date))];
        localStorage.setItem('certified_dates', JSON.stringify(allDates));

        // certified_by_challenge: 챌린지별 인증 날짜 Map
        const byChallenge = {};
        data.forEach(({ challenge_id, cert_date }) => {
          const key = String(challenge_id);
          if (!byChallenge[key]) byChallenge[key] = [];
          if (!byChallenge[key].includes(cert_date)) byChallenge[key].push(cert_date);
        });
        localStorage.setItem('certified_by_challenge', JSON.stringify(byChallenge));
      } catch {}
    };

    syncCertifiedDates();
  }, []);

  return (
    <div className="mobile-wrapper">
      <main className="main-content">
        <Outlet />
      </main>

      {!shouldHideNav && <BottomNav />}
    </div>
  );
}
