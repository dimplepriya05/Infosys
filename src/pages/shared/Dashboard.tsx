import type { UserRole, Claim } from '@/types';
import { useEffect, useState } from 'react';
import { claimsApi, reportsApi, underwriterApi } from '@/services/api';
import { CLAIM_VOLUME_DATA } from '@/data/mockData';
import { StatusBadge, PriorityBadge, SectionHeader } from '@/components/shared';
import { formatCurrency, formatDate } from '@/utils/helpers';
import { useToast } from '@/context/ToastContext';

// ─── Stat cards config per role ───────────────────────────────────────────────

const STATS: Record<string, { label: string; value: string; change: string; positive: boolean; icon: string; color: string; ic: string }[]> = {
  Admin: [
    { label: 'Total Claims (YTD)', value: '1,284', change: '+12%', positive: true,  icon: '📋', color: '#dbeafe', ic: '#1d4ed8' },
    { label: 'Open Claims',        value: '247',   change: '+5',   positive: false, icon: '⏳', color: '#fef9c3', ic: '#a16207' },
    { label: 'Avg TAT (days)',     value: '8.4',   change: '-1.2', positive: true,  icon: '🕐', color: '#dcfce7', ic: '#15803d' },
    { label: 'Settlement Paid',    value: '$2.4M', change: '+18%', positive: true,  icon: '💰', color: '#ede9fe', ic: '#7c3aed' },
  ],
  'Claims Adjuster': [
    { label: 'Assigned to Me',      value: '23',   change: '+3',   positive: false, icon: '📋', color: '#dbeafe', ic: '#1d4ed8' },
    { label: 'Pending Decision',    value: '8',    change: '-2',   positive: true,  icon: '⚖️', color: '#fef9c3', ic: '#a16207' },
    { label: 'Resolved This Week',  value: '11',   change: '+4',   positive: true,  icon: '✅', color: '#dcfce7', ic: '#15803d' },
    { label: 'Avg Processing Time', value: '6.2d', change: '-0.8', positive: true,  icon: '🕐', color: '#ede9fe', ic: '#7c3aed' },
  ],
  Underwriter: [
    { label: 'Pending validation count', value: '18',     change: '-2',   positive: true,  icon: '⏳', color: '#fef9c3', ic: '#a16207' },
    { label: 'Claims validated',         value: '142',    change: '+12',  positive: true,  icon: '✅', color: '#dcfce7', ic: '#15803d' },
    { label: 'Risk alerts',              value: '14',     change: '+3',   positive: false, icon: '⚠️', color: '#fee2e2', ic: '#dc2626' },
    { label: 'Policies checked',         value: '342',    change: '+28',  positive: true,  icon: '📄', color: '#dbeafe', ic: '#1d4ed8' },
  ],
  Policyholder: [
    { label: 'Active Policies',   value: '3',      change: '',     positive: true,  icon: '📄', color: '#dbeafe', ic: '#1d4ed8' },
    { label: 'Open Claims',       value: '1',      change: '',     positive: true,  icon: '📋', color: '#fef9c3', ic: '#a16207' },
    { label: 'Next Premium Due',  value: 'Feb 15', change: '',     positive: true,  icon: '📅', color: '#dcfce7', ic: '#15803d' },
    { label: 'Total Coverage',    value: '$900K',  change: '',     positive: true,  icon: '🛡️', color: '#ede9fe', ic: '#7c3aed' },
  ],
  'Partner/TPA': [
    { label: 'Active Claims',     value: '38',    change: '+4',   positive: false, icon: '📋', color: '#dbeafe', ic: '#1d4ed8' },
    { label: 'Resolved (30d)',    value: '22',    change: '+6',   positive: true,  icon: '✅', color: '#dcfce7', ic: '#15803d' },
    { label: 'Avg TAT',          value: '9.1d',  change: '-0.5', positive: true,  icon: '🕐', color: '#fef9c3', ic: '#a16207' },
    { label: 'Total Billed',     value: '$1.1M', change: '+11%', positive: true,  icon: '💰', color: '#ede9fe', ic: '#7c3aed' },
  ],
  Finance: [
    { label: 'Pending Payments',    value: '42',     change: '+5',   positive: false, icon: '⏳', color: '#fef9c3', ic: '#a16207' },
    { label: 'Total Disbursed',     value: '$1.4M',  change: '+8%',  positive: true,  icon: '💰', color: '#dcfce7', ic: '#15803d' },
    { label: 'Rejected Invoices',   value: '7',      change: '-2',   positive: true,  icon: '❌', color: '#fee2e2', ic: '#dc2626' },
    { label: 'Available Reserves',  value: '$5.2M',  change: '-1%',  positive: true,  icon: '🏦', color: '#dbeafe', ic: '#1d4ed8' },
  ],
};

// ─── Tiny bar chart ───────────────────────────────────────────────────────────

function MiniBar({ data }: { data: typeof CLAIM_VOLUME_DATA }) {
  const max = Math.max(...data.map((d) => d.count));
  return (
    <div className="bar-chart" style={{ height: 140, alignItems: 'flex-end' }}>
      {data.map((d, i) => (
        <div key={d.month} className="bar-col">
          <div
            className="bar"
            style={{
              height: `${(d.count / max) * 120}px`,
              background: i === data.length - 4
                ? 'linear-gradient(to top, #2563eb, #60a5fa)'
                : i >= data.length - 3
                  ? '#bfdbfe'
                  : '#dbeafe',
              minHeight: 4,
            }}
            title={`${d.month}: ${d.count}`}
          />
          <div className="bar-label">{d.month.charAt(0)}</div>
        </div>
      ))}
    </div>
  );
}

// ─── Status donut (css-only) ──────────────────────────────────────────────────

const STATUS_BREAKDOWN = [
  { label: 'Assessment', pct: 28, color: '#8b5cf6' },
  { label: 'Submitted',  pct: 22, color: '#3b82f6' },
  { label: 'Settlement', pct: 18, color: '#0d9488' },
  { label: 'Triage',     pct: 15, color: '#f59e0b' },
  { label: 'Closed',     pct: 17, color: '#22c55e' },
];

// ─── Recent Claims mini-table ─────────────────────────────────────────────────

function RecentClaimsTable({ claims, setActive, setSelectedClaim, role }: {
  claims: Claim[];
  setActive: (id: string) => void;
  setSelectedClaim: (c: Claim) => void;
  role: string;
}) {
  const isUw = role === 'Underwriter';
  return (
    <div className="card">
      <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ fontWeight: 700, fontSize: '1rem', color: '#0f172a' }}>
          {isUw ? 'Claims Pending Validation' : 'Recent Claims'}
        </h3>
        <button className="btn btn-ghost btn-sm" style={{ color: '#2563eb' }} onClick={() => setActive(isUw ? 'underwriter_claims' : 'claims')}>
          View all →
        </button>
      </div>
      <div className="overflow-x-auto">
        <table>
          <thead>
            <tr>
              <th>Claim ID</th><th>Type</th><th>Policyholder</th>
              <th>Status</th>
              {isUw ? <th>Validation Status</th> : <th>Priority</th>}
              {isUw ? null : <th>Amount</th>}
              {isUw ? null : <th>Filed</th>}
              <th style={{ textAlign: 'right' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {claims.map((c) => (
              <tr key={c.id}>
                <td>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <span className="mono fw-600" style={{ color: '#2563eb', fontSize: '.8125rem' }}>{c.referenceNumber || c.id}</span>
                    {isUw && (
                      <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                        {c.duplicateFlag && <span className="badge" style={{ background: '#fef2f2', color: '#991b1b', fontSize: '0.65rem' }}>Duplicate</span>}
                        {c.exceedsLimitFlag && <span className="badge" style={{ background: '#fef2f2', color: '#991b1b', fontSize: '0.65rem' }}>Over Limit</span>}
                        {c.frequentClaimFlag && <span className="badge" style={{ background: '#fef2f2', color: '#991b1b', fontSize: '0.65rem' }}>High Freq</span>}
                      </div>
                    )}
                  </div>
                </td>
                <td className="text-sm">{c.type}</td>
                <td className="text-sm">{c.policyholder}</td>
                <td><StatusBadge status={c.status} /></td>
                {isUw ? <td><StatusBadge status={c.validationStatus || 'PENDING'} /></td> : <td><PriorityBadge priority={c.priority} /></td>}
                {isUw ? null : <td><span className="mono text-sm fw-600">{formatCurrency(c.amount)}</span></td>}
                {isUw ? null : <td className="text-sm text-muted">{formatDate(c.filedDate)}</td>}
                <td style={{ textAlign: 'right' }}>
                  {isUw ? (
                    <button className="btn btn-primary btn-sm"
                      onClick={() => { setSelectedClaim(c); setActive('underwriter_claimdetail'); }}>
                      Validate
                    </button>
                  ) : (
                    <button className="btn btn-ghost btn-sm" style={{ color: '#2563eb' }}
                      onClick={() => { setSelectedClaim(c); setActive('claimdetail'); }}>
                      View
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

interface DashboardProps {
  role: UserRole;
  setActive: (id: string) => void;
  setSelectedClaim: (c: Claim) => void;
}

export default function Dashboard({ role, setActive, setSelectedClaim }: DashboardProps) {
  const toast = useToast();
  const stats = STATS[role] ?? STATS['Admin'];

  const handleExport = async () => {
    try {
      const res = await reportsApi.exportClaims();
      const blob = new Blob([res.data], { type: 'text/csv' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a'); a.href = url; a.download = 'claims-export.csv'; a.click();
      URL.revokeObjectURL(url);
      toast('Report exported as CSV', 'success');
    } catch (err) {
      toast('Failed to export', 'error');
    }
  };
  
  const [recentClaims, setRecentClaims] = useState<Claim[]>([]);
  const [_loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadRecentClaims() {
      setLoading(true);
      try {
        let res;
        if (role === 'Underwriter') {
          res = await underwriterApi.listPending({ size: '10', page: '0' });
        } else {
          res = await claimsApi.list({ size: '10', page: '0' });
        }
        const content = res.data?.data?.content || res.data?.data || [];
        
        const mapped: Claim[] = content.map((backendClaim: any) => ({
          id: String(backendClaim.id),
          referenceNumber: backendClaim.referenceNumber,
          type: backendClaim.claimType,
          status: backendClaim.status,
          priority: backendClaim.priority,
          policyholderId: 0, 
          policyholder: backendClaim.policyholderName,
          assignee: backendClaim.assignedAdjusterName || 'Unassigned',
          policyId: backendClaim.policyNumber,
          amount: backendClaim.claimedAmount || 0,
          reserveAmount: backendClaim.reserveAmount,
          deductible: backendClaim.deductibleApplied,
          depreciation: backendClaim.depreciationPercent,
          netPayable: backendClaim.netPayableAmount,
          approvedAmount: backendClaim.approvedAmount,
          description: backendClaim.description,
          incidentDate: backendClaim.incidentDate,
          incidentType: backendClaim.incidentType,
          incidentLocation: backendClaim.incidentLocation,
          filedDate: backendClaim.submittedAt || backendClaim.createdAt,
          updatedAt: backendClaim.updatedAt,
          notes: backendClaim.notes || [],
          documents: backendClaim.documents || [],
          timeline: backendClaim.workflowHistory || [],
          payment: backendClaim.payment,
          validationStatus: backendClaim.validationStatus,
          duplicateFlag: backendClaim.duplicateFlag,
          exceedsLimitFlag: backendClaim.exceedsLimitFlag,
          frequentClaimFlag: backendClaim.frequentClaimFlag,
        }));
        
        setRecentClaims(mapped);
      } catch (err) {
        console.error('Failed to load recent claims', err);
      } finally {
        setLoading(false);
      }
    }
    loadRecentClaims();
  }, [role]);

  return (
    <div>
      <SectionHeader
        title="Dashboard"
        subtitle={`Good morning 👋 Here's what's happening today`}
        actions={
          role === 'Policyholder' ? (
            <button className="btn btn-primary" onClick={() => setActive('newclaim')}>➕ File New Claim</button>
          ) : role === 'Admin' ? (
            <button className="btn btn-secondary" onClick={handleExport}>⬇️ Export Report</button>
          ) : undefined
        }
      />

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {stats.map((s, i) => (
          <div key={i} className="card stat-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div className="stat-label">{s.label}</div>
                <div className="stat-value">{s.value}</div>
                {s.change && (
                  <div className="stat-change" style={{ color: s.positive ? '#16a34a' : '#dc2626' }}>
                    {s.positive ? '↑' : '↓'} {s.change} vs last period
                  </div>
                )}
              </div>
              <div className="stat-icon" style={{ background: s.color, color: s.ic }}>{s.icon}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        <div className="card p-6">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h3 style={{ fontWeight: 700, fontSize: '1rem', color: '#0f172a' }}>Claims Volume — 2024</h3>
            <span className="badge badge-blue">Monthly</span>
          </div>
          <MiniBar data={CLAIM_VOLUME_DATA} />
        </div>

        <div className="card p-6">
          <h3 style={{ fontWeight: 700, fontSize: '1rem', color: '#0f172a', marginBottom: '1.25rem' }}>By Status</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.875rem' }}>
            {STATUS_BREAKDOWN.map((s) => (
              <div key={s.label}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.8rem', marginBottom: '.3rem' }}>
                  <span style={{ color: '#475569', fontWeight: 500 }}>{s.label}</span>
                  <span style={{ color: '#94a3b8', fontWeight: 600 }}>{s.pct}%</span>
                </div>
                <div style={{ height: 6, background: '#f1f5f9', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${s.pct}%`, background: s.color, borderRadius: 99, transition: 'width .6s ease' }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick actions (role-specific) */}
      {(() => {
        let quickActions: any[] = [];
        if (role === 'Admin') {
          quickActions = [
            { icon: '📋', label: 'Review Queue', count: '5 pending', action: 'claims' },
            { icon: '📄', label: 'New Policy', count: 'Start now', action: 'policies' },
            { icon: '📊', label: 'Run Report', count: 'Analytics', action: 'reports' },
            { icon: '👥', label: 'Manage Users', count: '12 active', action: 'users' },
          ];
        } else if (role === 'Claims Adjuster') {
          quickActions = [
            { icon: '📋', label: 'Review Queue', count: '5 pending', action: 'claims' },
            { icon: '📄', label: 'New Policy', count: 'Start now', action: 'policies' },
          ];
        } else if (role === 'Partner/TPA') {
          quickActions = [
            { icon: '➕', label: 'File New Claim', count: 'For Policyholder', action: 'newclaim' },
            { icon: '📋', label: 'My Review Queue', count: 'Assigned claims', action: 'claims' },
            { icon: '📤', label: 'Bulk Upload', count: 'Multiple claims', action: 'claims' },
            { icon: '📊', label: 'Run Report', count: 'My claims export', action: 'reports' },
          ];
        }
        
        if (quickActions.length === 0) return null;

        return (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '.875rem', marginBottom: '1.5rem' }}>
            {quickActions.map((qa) => (
              <button
                key={qa.label}
                className="card card-hover p-4"
                style={{ textAlign: 'left', border: 'none', cursor: 'pointer', width: '100%' }}
                onClick={() => setActive(qa.action)}
              >
                <div style={{ fontSize: '1.5rem', marginBottom: '.5rem' }}>{qa.icon}</div>
                <div style={{ fontWeight: 700, fontSize: '.875rem', color: '#0f172a' }}>{qa.label}</div>
                <div style={{ fontSize: '.78rem', color: '#64748b', marginTop: '.2rem' }}>{qa.count}</div>
              </button>
            ))}
          </div>
        );
      })()}

      {/* Recent claims table */}
      <RecentClaimsTable claims={recentClaims} setActive={setActive} setSelectedClaim={setSelectedClaim} role={role} />
    </div>
  );
}
