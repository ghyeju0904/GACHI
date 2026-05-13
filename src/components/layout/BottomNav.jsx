import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Plus, User } from 'lucide-react';

export function BottomNav() {
  return (
    <nav style={{
      position: 'absolute', bottom: 0, left: 0, right: 0,
      height: 'var(--nav-height)',
      background: 'var(--card-bg)',
      borderTop: '1px solid var(--border-color)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-around',
      zIndex: 100,
      paddingBottom: 'env(safe-area-inset-bottom)',
    }}>
      <NavLink to="/home" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <Home size={24} />
        <span>홈</span>
      </NavLink>

      <NavLink to="/create" style={{ textDecoration: 'none' }}>
        <div className="fab-create">
          <Plus size={28} />
        </div>
      </NavLink>

<NavLink to="/profile" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <User size={24} />
        <span>마이</span>
      </NavLink>
    </nav>
  );
}
