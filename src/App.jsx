import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';

import Onboarding from './pages/onboarding/Onboarding';
import Home from './pages/home/Home';
import Explore from './pages/explore/Explore';
import ChallengeDetail from './pages/challenge/ChallengeDetail';
import ChallengeCreate from './pages/challenge/ChallengeCreate';
import ChallengeManage from './pages/manage/ChallengeManage';
import Certify from './pages/certify/Certify';
import GroupFeed from './pages/feed/GroupFeed';
import Profile from './pages/profile/Profile';
import ProfileEdit from './pages/profile/ProfileEdit';
import Notifications from './pages/notifications/Notifications';
import ChallengeResult from './pages/result/ChallengeResult';
import Stats from './pages/stats/Stats';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Navigate to="/onboarding" replace />} />

          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/home" element={<Home />} />
          <Route path="/explore" element={<Explore />} />

          <Route path="/challenge/:id" element={<ChallengeDetail />} />
          <Route path="/feed/:id" element={<GroupFeed />} />
          <Route path="/certify/:id" element={<Certify />} />
          <Route path="/result/:id" element={<ChallengeResult />} />

          <Route path="/create" element={<ChallengeCreate />} />
          <Route path="/manage/:id" element={<ChallengeManage />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/profile/edit" element={<ProfileEdit />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/stats" element={<Stats />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
