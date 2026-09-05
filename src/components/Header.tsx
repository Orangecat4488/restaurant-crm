import { useState } from 'react';
import { Search, Bell, ChevronDown, LogOut } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

const ROLE_LABELS: Record<string, string> = {
  admin: 'Администратор',
  cashier: 'Кассир',
  waiter: 'Официант',
};

export default function Header() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const logout = useAuthStore((s) => s.logout);
  const [showDropdown, setShowDropdown] = useState(false);

  const handleLogout = () => {
    logout();
    setShowDropdown(false);
  };

  return (
    <header className="app-header">
      <div className="header-container">
        <div className="search-box">
          <Search />
          <input type="text" placeholder="Поиск..." />
        </div>

        <div className="header-right">
          <button className="notification-btn">
            <Bell size={20} />
            <span className="notification-badge"></span>
          </button>

          <div style={{ position: 'relative' }}>
            <div
              className="profile-section"
              onClick={() => setShowDropdown(!showDropdown)}
              style={{ cursor: 'pointer' }}
            >
              <div className="profile-avatar">
                {currentUser?.name.charAt(0) || '?'}
              </div>
              <div className="profile-info">
                <strong>{currentUser?.name || 'Гость'}</strong>
                <small>{currentUser ? ROLE_LABELS[currentUser.role] : ''}</small>
              </div>
              <ChevronDown size={16} />
            </div>

            {/* ВЫПАДАЮЩЕЕ МЕНЮ */}
            {showDropdown && (
              <>
                <div
                  onClick={() => setShowDropdown(false)}
                  style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 999,
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    marginTop: '8px',
                    background: 'white',
                    borderRadius: '12px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    minWidth: '200px',
                    zIndex: 1000,
                    overflow: 'hidden',
                  }}
                >
                  <div style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid #e5e7eb',
                    background: '#f9fafb',
                  }}>
                    <p style={{ margin: 0, fontWeight: '600', fontSize: '14px' }}>
                      {currentUser?.name}
                    </p>
                    <p style={{ margin: 0, fontSize: '12px', color: '#6b7280' }}>
                      {currentUser && ROLE_LABELS[currentUser.role]}
                    </p>
                  </div>
                  <div style={{ padding: '8px' }}>
                    <button
                      onClick={handleLogout}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '10px 12px',
                        border: 'none',
                        background: 'transparent',
                        cursor: 'pointer',
                        fontSize: '14px',
                        borderRadius: '8px',
                        color: '#EF4444',
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.background = '#FEE2E2';
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.background = 'transparent';
                      }}
                    >
                      <LogOut size={16} />
                      Выйти
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
