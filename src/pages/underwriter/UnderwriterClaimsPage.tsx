import { useState, useEffect } from 'react';
import { underwriterApi } from '@/services/api';
import type { Claim, UserRole } from '@/types';
import { SectionHeader, PriorityBadge } from '@/components/shared';
import { formatCurrency, formatDate } from '@/utils/helpers';
import { useToast } from '@/context/ToastContext';

interface Props {
  role: UserRole;
  setActive: (page: string) => void;
  setSelectedClaim: (c: Claim) => void;
}

export default function UnderwriterClaimsPage({ role: _role, setActive, setSelectedClaim }: Props) {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    fetchClaims();
  }, []);

  const fetchClaims = async () => {
    setLoading(true);
    try {
      const res = await underwriterApi.listPending({ page: '0', size: '50' });
      setClaims(res.data?.data?.content || []);
    } catch (err) {
      console.error('Failed to load pending validation claims', err);
      toast('Failed to load validation queue', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleValidate = (claim: Claim) => {
    setSelectedClaim(claim);
    setActive('underwriter_claimdetail');
  };

  return (
    <div>
      <SectionHeader 
        title="Validation Queue" 
        subtitle="Review and validate claims before assessment"
      />

      <div className="card p-6">
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Claim ID</th>
                <th>Policyholder</th>
                <th>Type</th>
                <th>Amount</th>
                <th>Incident Date</th>
                <th>Priority</th>
                <th>Validation Status</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--gray-500)' }}>
                    Loading validation queue...
                  </td>
                </tr>
              ) : claims.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--gray-500)' }}>
                    No claims pending validation.
                  </td>
                </tr>
              ) : (
                claims.map((claim) => (
                  <tr key={claim.id}>
                    <td style={{ fontWeight: 600, color: 'var(--blue-600)' }}>{claim.referenceNumber || claim.id}</td>
                    <td>{claim.policyholder}</td>
                    <td>{claim.type}</td>
                    <td style={{ fontWeight: 500 }}>{formatCurrency(claim.amount || (claim as any).claimedAmount || 0)}</td>
                    <td>{formatDate(claim.incidentDate || '')}</td>
                    <td><PriorityBadge priority={claim.priority || 'Medium'} /></td>
                    <td>
                      <span className={`badge badge-${claim.validationStatus === 'PENDING' ? 'yellow' : claim.validationStatus === 'ELIGIBLE' ? 'green' : 'red'}`}>
                        {claim.validationStatus || 'PENDING'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button 
                        className="btn btn-sm btn-primary"
                        onClick={() => handleValidate(claim)}
                      >
                        Validate
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
