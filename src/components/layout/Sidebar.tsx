import { useAuth } from '@/context/AuthContext';
import { ROLE_MENUS } from '@/utils/helpers';
import { Avatar } from '@/components/shared';

interface SidebarProps {
  active: string;
  setActive: (id: string) => void;
}

export default function Sidebar({ active, setActive }: SidebarProps) {
  const { user, logout } = useAuth();
  if (!user) return null;
  const sections = ROLE_MENUS[user.role] ?? ROLE_MENUS['Admin'];

  return (
    <aside className="sidebar" role="navigation" aria-label="Main navigation">
      {/* Logo */}
      <div className="sidebar-logo">
        <div style={{ width: 38, height: 38, borderRadius: 11, background: 'var(--teal)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
            <path d="M10 11l2 2 4-4"></path>
          </svg>
        </div>
        <div>
          <div className="sidebar-logo-text">InsureClaim <span style={{ color: 'var(--teal)' }}>Pro™</span></div>
          <div className="sidebar-logo-sub">Enterprise Edition v2.4</div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {sections.map((sec) => (
          <div key={sec.section}>
            <div className="sidebar-section-label">{sec.section}</div>
            {sec.items.map((item) => (
              <div
                key={item.id}
                className={`nav-item ${active === item.id ? 'active' : ''}`}
                onClick={() => setActive(item.id)}
                role="menuitem"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && setActive(item.id)}
                aria-current={active === item.id ? 'page' : undefined}
              >
                <span className="nav-item-icon" aria-hidden="true">{item.icon}</span>
                <span>{item.label}</span>
                {item.badge !== undefined && (
                  <span className="nav-item-badge" aria-label={`${item.badge} items`}>{item.badge}</span>
                )}
              </div>
            ))}
          </div>
        ))}
      </nav>

      {/* User footer */}
      <div style={{ borderTop: '1px solid var(--gray-200)', padding: '1.125rem 1.5rem', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem', marginBottom: '.75rem' }}>
          <Avatar initials={user.name?.[0]?.toUpperCase() ?? '?'} bg={user.avatarBg} size="sm" />
          <div style={{ overflow: 'hidden', flex: 1 }}>
            <div className="truncate" style={{ fontSize: '.875rem', fontWeight: 700, color: 'var(--gray-900)', letterSpacing: '-.01em' }}>{user.name}</div>
            <div style={{ fontSize: '.7rem', color: 'var(--gray-500)', marginTop: '.05rem' }}>{user.role}</div>
          </div>
        </div>
        <button
          className="btn btn-ghost btn-sm w-full"
          style={{ color: 'black', justifyContent: 'flex-start', gap: '.625rem', fontWeight: 600 }}
          onClick={logout}
        >
          🚪 Sign Out
        </button>
      </div>
    </aside>
  );
}
