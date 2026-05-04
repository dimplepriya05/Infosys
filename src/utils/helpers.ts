import type { ClaimStatus, Priority, BadgeVariant, UserRole, NavSection } from '@/types';

// ─── Badge helpers ────────────────────────────────────────────────────────────

export const STATUS_BADGE_MAP: Record<ClaimStatus | string, BadgeVariant> = {
  Draft: 'gray', Submitted: 'blue', Triage: 'yellow', Assessment: 'purple',
  Decision: 'orange', Settlement: 'teal', Closed: 'green',
  Active: 'green', Expired: 'red', Suspended: 'yellow', Cancelled: 'gray',
  Verified: 'green', Pending: 'yellow', Rejected: 'red',
  Completed: 'green', Processing: 'blue', Failed: 'red', QUARANTINED: 'red',
};

export const PRIORITY_BADGE_MAP: Record<Priority, BadgeVariant> = {
  High: 'red', Medium: 'yellow', Low: 'green',
};

export function getStatusBadgeVariant(status: string): BadgeVariant {
  return STATUS_BADGE_MAP[status] ?? 'gray';
}

export function getPriorityBadgeVariant(priority: string): BadgeVariant {
  return PRIORITY_BADGE_MAP[priority as Priority] ?? 'gray';
}

// ─── Currency formatting ──────────────────────────────────────────────────────

export function formatCurrency(amount: number, currency = 'USD'): string {
  if (currency === 'INR') {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 0,
    }).format(amount);
  }
  
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(amount);
  
  // Fix Canadian currency symbol overlap by adding a space after CA$
  if (currency === 'CAD') {
    return formatted.replace('CA$', 'CA$ ');
  }
  return formatted;
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat('en-US').format(n);
}

// ─── Date formatting ──────────────────────────────────────────────────────────

export function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function formatDateTime(dateStr: string): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(dateStr);
}

// ─── File helpers ─────────────────────────────────────────────────────────────

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function getFileIcon(mimeType: string): string {
  if (mimeType === 'application/pdf') return '📄';
  if (mimeType.startsWith('image/')) return '🖼️';
  if (mimeType.includes('zip') || mimeType.includes('archive')) return '🗜️';
  if (mimeType.includes('word') || mimeType.includes('document')) return '📝';
  return '📁';
}

export function isValidFileType(mimeType: string): boolean {
  const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
  return allowed.includes(mimeType);
}

// ─── Token (JWT stub) ─────────────────────────────────────────────────────────

const TOKEN_KEY = 'ics_auth_token';
const USER_KEY  = 'ics_auth_user';

export function saveToken(token: string): void {
  sessionStorage.setItem(TOKEN_KEY, token);
}
export function getToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY);
}
export function clearToken(): void {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
}
export function generateMockToken(userId: number): string {
  const payload = btoa(JSON.stringify({ sub: userId, iat: Date.now(), exp: Date.now() + 30 * 60 * 1000 }));
  return `mock.${payload}.sig`;
}

// ─── Navigation menus per role ────────────────────────────────────────────────

export const ROLE_MENUS: Record<UserRole, NavSection[]> = {
  Admin: [
    { section: 'Overview', items: [{ id: 'dashboard', label: 'Dashboard', icon: '📊' }] },
    { section: 'Claims', items: [{ id: 'claims', label: 'All Claims', icon: '📋', badge: 3 }, { id: 'appeals', label: 'Appeals Queue', icon: '📝' }, { id: 'reports', label: 'Reports', icon: '📈' }] },
    { section: 'Administration', items: [{ id: 'finance', label: 'Finance & Payouts', icon: '💰' }, { id: 'users', label: 'User Management', icon: '👥' }, { id: 'audit', label: 'Audit Logs', icon: '🔍' }, { id: 'settings', label: 'System Settings', icon: '⚙️' }] },
  ],
  'Claims Adjuster': [
    { section: 'Work', items: [{ id: 'dashboard', label: 'Dashboard', icon: '📊' }, { id: 'claims', label: 'Claims Queue', icon: '📋', badge: 5 }, { id: 'appeals', label: 'Appeals Queue', icon: '📝' }] },
    { section: 'Tools', items: [{ id: 'reports', label: 'Reports', icon: '📈' }] },
  ],
  Underwriter: [
    { section: 'Overview', items: [{ id: 'dashboard', label: 'Dashboard', icon: '📊' }, { id: 'policies', label: 'Policies', icon: '📄' }] },
    { section: 'Validation', items: [{ id: 'underwriter_claims', label: 'Validation Queue', icon: '✅' }] },
  ],
  Policyholder: [
    { section: 'My Account', items: [{ id: 'dashboard', label: 'Dashboard', icon: '📊' }, { id: 'policies', label: 'My Policies', icon: '📄' }, { id: 'claims', label: 'My Claims', icon: '📋' }] },
    { section: 'Actions', items: [{ id: 'newclaim', label: 'File a Claim', icon: '➕' }, { id: 'documents', label: 'Documents', icon: '🗂️' }, { id: 'profile', label: 'My Profile', icon: '👤' }] },
  ],
  'Partner/TPA': [
    { section: 'Overview', items: [{ id: 'dashboard', label: 'Dashboard', icon: '📊' }, { id: 'claims', label: 'Claims', icon: '📋' }] },
    { section: 'Data', items: [{ id: 'reports', label: 'Reports', icon: '📈' }, { id: 'documents', label: 'Documents', icon: '🗂️' }] },
  ],
  Finance: [
    { section: 'Overview', items: [{ id: 'dashboard', label: 'Dashboard', icon: '📊' }, { id: 'claims', label: 'Approved Claims', icon: '📋' }] },
    { section: 'Payments', items: [{ id: 'finance', label: 'Finance & Payouts', icon: '💰' }, { id: 'reports', label: 'Financial Reports', icon: '📈' }] },
  ],
};

export const PAGE_TITLES: Record<string, string> = {
  dashboard: 'Dashboard', claims: 'Claims Queue', claimdetail: 'Claim Detail', appeals: 'Appeals Queue',
  newclaim: 'File a New Claim', policies: 'Policies', documents: 'Document Center',
  reports: 'Reports & Analytics', users: 'User Management', audit: 'Audit Logs',
  settings: 'System Settings', profile: 'My Profile', finance: 'Finance & Payouts',
  underwriter_claims: 'Validation Queue', underwriter_claimdetail: 'Validation Detail',
};

// ─── Workflow ─────────────────────────────────────────────────────────────────

export const WORKFLOW_STAGES: ClaimStatus[] = [
  'Draft', 'Submitted', 'Triage', 'Assessment', 'Decision', 'Settlement', 'Closed'
];

export function getWorkflowStageIndex(status: string): number {
  return WORKFLOW_STAGES.findIndex(s => s.toUpperCase() === status.toUpperCase());
}

// ─── Misc ─────────────────────────────────────────────────────────────────────

export function generateId(prefix = 'id'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function clsx(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function computeNetPayable(
  reserveAmount: number,
  deductible: number, depreciationPct: number, taxPct: number
): number {
  const afterDeductible = Math.max(0, reserveAmount - deductible);
  const depreciation = afterDeductible * (depreciationPct / 100);
  const preTax = Math.max(0, afterDeductible - depreciation);
  const taxAmount = preTax * (taxPct / 100);
  return preTax + taxAmount;
}

export function truncate(str: string, maxLen = 60): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen) + '…';
}
