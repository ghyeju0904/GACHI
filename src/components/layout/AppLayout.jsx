import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { BottomNav } from './BottomNav';

/**
 * AppLayout.jsx
 * 전체 모바일 뷰(최대 가로 480px) 중앙 정렬을 위한 래퍼 컴포넌트입니다.
 * 하단 탭바(BottomNav)를 공통으로 둡니다. (스플래시/온보딩 화면 등에서는 숨길 수 있도록 분기 처리)
 */
export function AppLayout() {
  const location = useLocation();
  
  // 온보딩(S-01), 로그인(S-02) 등 하단 탭 바가 필요 없는 화면 경로
  const hideNavRoutes = ['/', '/login', '/onboarding'];
  const shouldHideNav = hideNavRoutes.includes(location.pathname);

  return (
    <div className="mobile-wrapper">
      <main className="main-content">
        {/* 하위 라우트 컴포넌트(페이지) 렌더링 영역 */}
        <Outlet />
      </main>
      
      {!shouldHideNav && <BottomNav />}
    </div>
  );
}
