import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useOutsideClick } from '@/hooks';
import { Avatar } from '@/components/shared';

interface HeaderProps {
  pageTitle: string;
  setActive: (id: string) => void;
}

const NOTIFICATIONS = [
  { icon: '📋', msg: 'New claim CLM-2024-007 submitted', time: '2m ago', unread: true },
  { icon: '⚠️', msg: 'CLM-2024-001 requires urgent review', time: '1h ago', unread: true },
  { icon: '✅', msg: 'CLM-2024-004 settlement approved', time: '3h ago', unread: false },
  { icon: '💳', msg: 'Payment of $41,000 initiated', time: '5h ago', unread: false },
];

export default function Header({ pageTitle, setActive }: HeaderProps) {
  const { user, logout } = useAuth();
  const toast = useToast();
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen]     = useState(false);
  const profileRef = useOutsideClick<HTMLDivElement>(() => setProfileOpen(false));
  const notifRef   = useOutsideClick<HTMLDivElement>(() => setNotifOpen(false));

  if (!user) return null;

  return (
    <header className="app-header">
      <div className="breadcrumbs" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1rem', fontWeight: 600 }}>
        {pageTitle !== 'Dashboard' ? (
          <>
            <button 
              onClick={() => setActive('dashboard')}
              style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 0, fontWeight: 500 }}
              className="breadcrumb-link hover-text"
            >
              Dashboard
            </button>
            <span style={{ color: '#cbd5e1' }}>/</span>
            <span className="header-title" style={{ fontSize: '1rem' }}>{pageTitle}</span>
          </>
        ) : (
          <span className="header-title">{pageTitle}</span>
        )}
      </div>

      {/* Search */}
      {user.role !== 'Policyholder' && (
        <div className="header-search" style={{ marginLeft: '1.5rem' }}>
          <span style={{ fontSize: '1rem', color: '#94a3b8' }}>🔎</span>
          <input
            placeholder="Search claims, policies, users…"
            aria-label="Global search"
            onKeyDown={(e) => e.key === 'Enter' && toast('Search coming soon', 'info')}
          />
        </div>
      )}

      <div className="header-actions">
        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button
            className="btn btn-ghost btn-icon relative"
            aria-label="Notifications"
            onClick={() => setNotifOpen((o) => !o)}
          >
            🔔
            {NOTIFICATIONS.some((n) => n.unread) && <span className="notif-dot" />}
          </button>

          {notifOpen && (
            <div className="dropdown-menu" style={{ minWidth: 340, right: 0 }}>
              <div style={{ padding: '.875rem 1rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, fontSize: '.9375rem' }}>Notifications</span>
                <button className="btn btn-ghost btn-sm" style={{ color: '#2563eb', fontSize: '.8125rem' }}
                  onClick={() => { toast('All cleared', 'success'); setNotifOpen(false); }}>
                  Clear all
                </button>
              </div>
              {NOTIFICATIONS.map((n, i) => (
                <div key={i} className="dropdown-item" style={{ padding: '.875rem 1rem', gap: '.875rem', background: n.unread ? '#f8fafc' : undefined, alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '1.25rem', flexShrink: 0, marginTop: '.1rem' }}>{n.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '.8125rem', fontWeight: n.unread ? 600 : 400, color: '#1e293b', lineHeight: 1.45 }}>{n.msg}</div>
                    <div style={{ fontSize: '.73rem', color: '#94a3b8', marginTop: '.2rem' }}>{n.time}</div>
                  </div>
                  {n.unread && <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#2563eb', flexShrink: 0, marginTop: '.375rem' }} />}
                </div>
              ))}
              <div style={{ padding: '.75rem 1rem', borderTop: '1px solid #f1f5f9', textAlign: 'center' }}>
                <button className="btn btn-ghost btn-sm" style={{ color: '#2563eb', width: '100%', justifyContent: 'center' }}>
                  View all notifications
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Profile dropdown */}
        <div className="relative" ref={profileRef}>
          <Avatar
            initials={user.name?.[0]?.toUpperCase() ?? '?'}
            bg={user.avatarBg}
            size="md"
            onClick={() => setProfileOpen((o) => !o)}
          />
          {profileOpen && (
            <div className="dropdown-menu" style={{ minWidth: 220 }}>
              <div style={{ padding: '1rem 1rem .25rem' }}>
                <div style={{ fontWeight: 700, fontSize: '.9375rem', color: '#0f172a' }}>{user.name}</div>
                <div style={{ fontSize: '.78rem', color: '#64748b', marginTop: '.15rem' }}>{user.email}</div>
                <div style={{ marginTop: '.5rem' }}>
                  <span className="badge badge-blue" style={{ fontSize: '.68rem' }}>{user.role}</span>
                </div>
              </div>
              <div className="dropdown-divider" style={{ margin: '.625rem 0 .25rem' }} />
              <div className="dropdown-item" onClick={() => { setActive('profile'); setProfileOpen(false); }}>
                👤 My Profile
              </div>
              <div className="dropdown-item" onClick={() => { setActive('settings'); setProfileOpen(false); }}>
                ⚙️ Settings
              </div>
              <div className="dropdown-item" onClick={() => { toast('Keyboard shortcuts guide', 'info'); setProfileOpen(false); }}>
                ⌨️ Shortcuts
              </div>
              <div className="dropdown-divider" />
              <div className="dropdown-item" style={{ color: '#ef4444' }} onClick={() => { logout(); setProfileOpen(false); }}>
                🚪 Sign Out
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
