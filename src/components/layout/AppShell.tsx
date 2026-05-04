import { type ReactNode } from 'react';
import { useAuth } from '@/context/AuthContext';
import Sidebar from './Sidebar';
import Header from './Header';
import { PAGE_TITLES } from '@/utils/helpers';

interface AppShellProps {
  active: string;
  setActive: (id: string) => void;
  children: ReactNode;
}

export default function AppShell({ active, setActive, children }: AppShellProps) {
  const { sessionWarning, keepAlive, logout } = useAuth();
  const pageTitle = PAGE_TITLES[active] ?? 'Dashboard';

  return (
    <div className="app-layout">
      <Sidebar active={active} setActive={setActive} />

      <div className="main-area">
        <Header pageTitle={pageTitle} setActive={setActive} />
        <main className="content-area" id="main-content" tabIndex={-1}>
          {children}
        </main>
      </div>

      {/* Session timeout warning */}
      {sessionWarning && (
        <div className="session-banner" role="alert">
          <span>⏳</span>
          <span style={{ fontWeight: 600 }}>Your session will expire soon.</span>
          <button
            className="btn btn-sm"
            style={{ background: 'rgba(0,0,0,.15)', color: 'inherit', fontWeight: 700 }}
            onClick={keepAlive}
          >
            Stay Logged In
          </button>
          <button
            className="btn btn-sm"
            style={{ background: 'rgba(0,0,0,.25)', color: 'inherit' }}
            onClick={logout}
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
}
