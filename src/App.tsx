import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import LoginPage from '@/components/auth/LoginPage';
import RegisterPage from '@/components/auth/RegisterPage';
import ForgotPasswordPage from '@/components/auth/ForgotPasswordPage';
import AppShell from '@/components/layout/AppShell';
import Dashboard from '@/pages/shared/Dashboard';
import ClaimsPage from '@/pages/shared/ClaimsPage';
import ClaimDetail from '@/pages/shared/ClaimDetail';
import NewClaimPage from '@/pages/policyholder/NewClaimPage';
import {
  PoliciesPage, DocumentsPage, ReportsPage,
  UsersPage, ProfilePage,
} from '@/pages/shared/OtherPages';
import { AuditLogsPage } from '@/pages/AuditLogsPage';
import { SystemSettingsPage } from '@/pages/SystemSettingsPage';
import { AdminDashboardPage } from '@/pages/AdminDashboardPage';
import { FinanceDashboardPage } from '@/pages/FinanceDashboardPage';
import AppealsPage from '@/pages/shared/AppealsPage';
import UnderwriterClaimsPage from '@/pages/underwriter/UnderwriterClaimsPage';
import UnderwriterClaimDetail from '@/pages/underwriter/UnderwriterClaimDetail';
import type { Claim } from '@/types';

// ─── Route guard ──────────────────────────────────────────────────────────────

const ROLE_ALLOWED_PAGES: Record<string, string[]> = {
  Admin:            ['dashboard','claims','claimdetail','appeals','policies','documents','reports','users','audit','settings','profile','finance'],
  'Claims Adjuster':['dashboard','claims','claimdetail','appeals','reports','profile'],
  Underwriter:      ['dashboard','policies','underwriter_claims','underwriter_claimdetail','profile'],
  Policyholder:     ['dashboard','claims','claimdetail','newclaim','policies','documents','profile'],
  'Partner/TPA':    ['dashboard','claims','claimdetail','newclaim','reports','documents','profile'],
  Finance:          ['dashboard','claims','claimdetail','finance','reports','profile'],
};

export default function App() {
  const { user, isAuthenticated, logout } = useAuth();
  const [active,        setActive]        = useState('dashboard');
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);
  const [authView,      setAuthView]      = useState<'login' | 'register' | 'forgot'>('login');
  const toast = useToast();

  useEffect(() => {
    const handleUnauth = () => toast('Unauthorized access', 'error');
    const handleMaint = (e: any) => toast(e.detail || 'System is under maintenance. Read-only mode is active.', 'warning');
    const handleExpired = () => {
      logout();
      toast('Session expired. Please login again.', 'warning');
    };

    window.addEventListener('ics:unauthorized', handleUnauth);
    window.addEventListener('ics:maintenance', handleMaint);
    window.addEventListener('ics:session_expired', handleExpired);

    return () => {
      window.removeEventListener('ics:unauthorized', handleUnauth);
      window.removeEventListener('ics:maintenance', handleMaint);
      window.removeEventListener('ics:session_expired', handleExpired);
    };
  }, [toast, isAuthenticated, logout]);

  if (!isAuthenticated || !user) {
    if (authView === 'forgot') {
      return <ForgotPasswordPage onSwitchToLogin={() => setAuthView('login')} />;
    }
    return authView === 'login' 
        ? <LoginPage onSwitchToRegister={() => setAuthView('register')} onSwitchToForgot={() => setAuthView('forgot')} /> 
        : <RegisterPage onSwitchToLogin={() => setAuthView('login')} />;
  }

  const role    = user.role;
  const allowed = ROLE_ALLOWED_PAGES[role] ?? [];

  // Safeguard: redirect to dashboard if role doesn't have access
  const safePage = allowed.includes(active) ? active : 'dashboard';

  const navigate = (page: string) => {
    if (!allowed.includes(page)) {
      setActive('dashboard');
      return;
    }
    setActive(page);
  };

  const renderPage = () => {
    switch (safePage) {
      case 'dashboard':   return <Dashboard role={role} setActive={navigate} setSelectedClaim={setSelectedClaim} />;
      case 'claims':      return <ClaimsPage     role={role} setActive={navigate} setSelectedClaim={setSelectedClaim} />;
      case 'claimdetail': return <ClaimDetail    claim={selectedClaim} role={role} setActive={navigate} setSelectedClaim={setSelectedClaim} />;
      case 'newclaim':    return <NewClaimPage   setActive={navigate} existingDraft={selectedClaim?.status?.toUpperCase() === 'DRAFT' ? selectedClaim : undefined} />;
      case 'appeals':     return <AppealsPage    role={role} setActive={navigate} setSelectedClaim={setSelectedClaim} />;
      case 'policies':    return <PoliciesPage   role={role} setActive={navigate} selectedClaim={selectedClaim} />;
      case 'documents':   return <DocumentsPage />;
      case 'reports':     return ['Admin', 'Supervisor'].includes(role) ? <AdminDashboardPage /> : <ReportsPage />;
      case 'users':       return allowed.includes('users') ? <UsersPage /> : <UnauthorizedPage />;
      case 'audit':       return allowed.includes('audit') ? <AuditLogsPage /> : <UnauthorizedPage />;
      case 'settings':    return allowed.includes('settings') ? <SystemSettingsPage /> : <UnauthorizedPage />;
      case 'finance':     return allowed.includes('finance') ? <FinanceDashboardPage /> : <UnauthorizedPage />;
      case 'underwriter_claims': return allowed.includes('underwriter_claims') ? <UnderwriterClaimsPage role={role} setActive={navigate} setSelectedClaim={setSelectedClaim} /> : <UnauthorizedPage />;
      case 'underwriter_claimdetail': return allowed.includes('underwriter_claimdetail') ? <UnderwriterClaimDetail claim={selectedClaim} role={role} setActive={navigate} setSelectedClaim={setSelectedClaim} /> : <UnauthorizedPage />;
      case 'profile':     return <ProfilePage />;
      default:            return <Dashboard role={role} setActive={navigate} setSelectedClaim={setSelectedClaim} />;
    }
  };

  return (
    <AppShell active={safePage} setActive={navigate}>
      {renderPage()}
    </AppShell>
  );
}

function UnauthorizedPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', textAlign: 'center' }}>
      <div style={{ fontSize: '4rem', marginBottom: '1.5rem' }}>🔒</div>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '.75rem', color: '#0f172a' }}>Access Denied</h2>
      <p style={{ color: '#64748b', maxWidth: 360, lineHeight: 1.7 }}>
        You don't have permission to view this page. Contact your administrator if you believe this is a mistake.
      </p>
    </div>
  );
}
