import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './styles/index.css';

// 최초 실행 시 데모 참여 챌린지 시딩 (localStorage에 데이터가 없을 때만)
if (!localStorage.getItem('my_challenges')) {
  localStorage.setItem('my_challenges', JSON.stringify([
    { id: 7, title: '하루 1시간 바이브코딩', category: '바이브코딩', dDay: 14, streak: 5,  deposit: 10000, role: 'member', joinedAt: new Date().toISOString() },
    { id: 5, title: '매일 1시간 집중 공부',  category: '스터디',     dDay: 22, streak: 12, deposit: 15000, role: 'member', joinedAt: new Date().toISOString() },
  ]));
}

// React 애플리케이션 진입점
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
