import { useState, useEffect } from 'react';
import type { UserRole } from '@/types';
import { appealsApi } from '@/services/api';
import { SectionHeader, StatusBadge } from '@/components/shared';
import { formatDate } from '@/utils/helpers';
import { useToast } from '@/context/ToastContext';

export default function AppealsPage({ role: _role, setActive, setSelectedClaim: _setSelectedClaim }: { role: UserRole; setActive: (id: string) => void; setSelectedClaim: (c: any) => void; }) {
  const toast = useToast();
  const [appeals, setAppeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAppeals() {
      setLoading(true);
      try {
        const res = await appealsApi.listAll();
        setAppeals(res.data?.data || []);
      } catch (err) {
        toast('Failed to load appeals', 'error');
      } finally {
        setLoading(false);
      }
    }
    loadAppeals();
  }, [toast]);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <SectionHeader title="Appeals Queue" subtitle="Manage policyholder appeals" />
        <button 
          className="btn btn-secondary btn-sm" 
          onClick={async () => {
            try {
              const res = await appealsApi.export();
              const url = window.URL.createObjectURL(new Blob([res.data]));
              const link = document.createElement('a');
              link.href = url;
              link.setAttribute('download', 'appeals_export.csv');
              document.body.appendChild(link);
              link.click();
              link.remove();
              toast('Export successful', 'success');
            } catch (err) {
              toast('Failed to export appeals', 'error');
            }
          }}
        >
          ⬇️ Export CSV
        </button>
      </div>
      <div className="card">
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>Loading appeals...</div>
        ) : appeals.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📝</div>
            No appeals found.
          </div>
        ) : (
          <table className="table" style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '.75rem', textTransform: 'uppercase' }}>
                <th style={{ padding: '1rem 1.25rem' }}>Claim ID</th>
                <th style={{ padding: '1rem 1.25rem' }}>Submitted By</th>
                <th style={{ padding: '1rem 1.25rem' }}>Reason</th>
                <th style={{ padding: '1rem 1.25rem' }}>Status</th>
                <th style={{ padding: '1rem 1.25rem' }}>Date</th>
                <th style={{ padding: '1rem 1.25rem' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {appeals.map((a) => (
                <tr key={a.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '1rem 1.25rem', fontWeight: 600 }}>#{a.claimId}</td>
                  <td style={{ padding: '1rem 1.25rem' }}>{a.submittedByName}</td>
                  <td style={{ padding: '1rem 1.25rem' }}>{a.reason}</td>
                  <td style={{ padding: '1rem 1.25rem' }}>
                    <StatusBadge status={a.status === 'PENDING' ? 'Draft' : a.status === 'APPROVED' ? 'Settlement' : a.status === 'DENIED' ? 'Closed' : 'Assessment'} />
                  </td>
                  <td style={{ padding: '1rem 1.25rem', color: '#64748b' }}>{formatDate(a.createdAt)}</td>
                  <td style={{ padding: '1rem 1.25rem' }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => {
                      // Navigate to claim detail
                      setActive('claims'); // Actually we'd need to fetch claim and set it, or just navigate to claims page and let them search
                      toast('Navigating to claim...', 'info');
                    }}>View Claim →</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
