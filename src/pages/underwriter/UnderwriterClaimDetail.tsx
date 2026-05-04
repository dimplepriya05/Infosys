import { useState, useEffect } from 'react';
import type { Claim, UserRole } from '@/types';
import { SectionHeader, StatusBadge } from '@/components/shared';
import { formatCurrency, formatDate } from '@/utils/helpers';
import { useToast } from '@/context/ToastContext';
import { underwriterApi, policiesApi } from '@/services/api';

interface Props {
  claim: Claim | null;
  role: UserRole;
  setActive: (page: string) => void;
  setSelectedClaim: (c: Claim) => void;
}

export default function UnderwriterClaimDetail({ claim, role: _role, setActive }: Props) {
  const toast = useToast();
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [fullClaim, setFullClaim] = useState<any>(null);
  const [policy, setPolicy] = useState<any>(null);

  useEffect(() => {
    if (claim?.id) {
      fetchClaimDetails();
    }
  }, [claim?.id]);

  const fetchClaimDetails = async () => {
    try {
      const targetId = claim!.referenceNumber || String(claim!.id);
      const res = await underwriterApi.getClaim(targetId);
      const claimData = res.data?.data;
      setFullClaim(claimData);
      
      if (claimData?.policyNumber) {
        const polRes = await policiesApi.get(claimData.policyNumber).catch(() => null);
        if (polRes?.data?.data) {
          setPolicy(polRes.data.data);
        }
      }
    } catch (err) {
      console.error('Failed to load full claim details', err);
    }
  };

  if (!claim) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem' }}>
        <p style={{ color: 'var(--gray-500)' }}>No claim selected.</p>
        <button className="btn btn-secondary mt-4" onClick={() => setActive('underwriter_claims')}>Back to Queue</button>
      </div>
    );
  }

  const handleValidate = async (status: string) => {
    if (!notes.trim() && status !== 'ELIGIBLE') {
      toast('Validation notes are required when marking as not eligible or needs review.', 'warning');
      return;
    }
    
    setLoading(true);
    try {
      const targetId = claim.referenceNumber || String(claim.id);
      await underwriterApi.validate(targetId, { status, notes });
      toast(`Claim validation submitted: ${status}`, 'success');
      setActive('underwriter_claims');
    } catch (err: any) {
      toast(err.response?.data?.error || 'Validation failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const isDuplicateRisk = fullClaim?.duplicateFlag;
  const isHighFreqRisk = fullClaim?.frequentClaimFlag;
  const isOverLimitRisk = fullClaim?.exceedsLimitFlag;
  const hasRisk = isDuplicateRisk || isHighFreqRisk || isOverLimitRisk;

  return (
    <div>
      <SectionHeader 
        title={`Validate Claim ${claim.referenceNumber || claim.id}`} 
        subtitle="Review claim details against policy coverage"
        actions={
          <button className="btn btn-secondary" onClick={() => setActive('underwriter_claims')}>
            ← Back to Queue
          </button>
        }
      />

      {hasRisk && (
        <div style={{ padding: '1rem', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 'var(--radius)', marginBottom: '1.5rem', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
          <div style={{ fontSize: '1.25rem' }}>⚠️</div>
          <div>
            <div style={{ fontWeight: 600, color: '#991b1b', marginBottom: '0.25rem' }}>Risk Indicators Detected</div>
            <ul style={{ margin: 0, paddingLeft: '1.25rem', color: '#b91c1c', fontSize: '0.875rem' }}>
              {isDuplicateRisk && <li>Potential duplicate claim detected for this policyholder.</li>}
              {isHighFreqRisk && <li>Policyholder has a high frequency of recent claims.</li>}
              {isOverLimitRisk && <li>Claim amount exceeds typical limits for this policy.</li>}
            </ul>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '1.5rem', alignItems: 'start' }}>
        
        {/* Left Column: Details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div className="card p-6">
            <h3 style={{ fontWeight: 700, fontSize: '1.0625rem', marginBottom: '1.25rem' }}>Claim Information</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
              <div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--gray-500)', marginBottom: '0.25rem' }}>Claim Type</div>
                <div style={{ fontWeight: 500 }}>{claim.type || fullClaim?.claimType}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--gray-500)', marginBottom: '0.25rem' }}>Claimed Amount</div>
                <div style={{ fontWeight: 700, color: 'var(--blue-600)', fontSize: '1.125rem' }}>{formatCurrency(fullClaim?.claimedAmount || claim.amount || 0)}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--gray-500)', marginBottom: '0.25rem' }}>Incident Date</div>
                <div style={{ fontWeight: 500 }}>{formatDate(claim.incidentDate || fullClaim?.incidentDate || '')}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--gray-500)', marginBottom: '0.25rem' }}>Incident Type</div>
                <div style={{ fontWeight: 500 }}>{fullClaim?.incidentType || '—'}</div>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <div style={{ fontSize: '0.8125rem', color: 'var(--gray-500)', marginBottom: '0.25rem' }}>Description</div>
                <div style={{ fontSize: '0.9375rem', lineHeight: 1.6, background: 'var(--gray-50)', padding: '1rem', borderRadius: 'var(--radius)' }}>
                  {claim.description || fullClaim?.description || 'No description provided.'}
                </div>
              </div>
              {fullClaim?.documents && fullClaim.documents.length > 0 && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--gray-500)', marginBottom: '0.5rem' }}>Uploaded Documents ({fullClaim.documents.length})</div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {fullClaim.documents.map((doc: any) => (
                      <span key={doc.id} className="badge badge-gray">📄 {doc.fileName}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="card p-6">
            <h3 style={{ fontWeight: 700, fontSize: '1.0625rem', marginBottom: '1.25rem' }}>Policy Information</h3>
            {policy ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                <div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--gray-500)', marginBottom: '0.25rem' }}>Policy Status</div>
                  <div><StatusBadge status={policy.expired ? 'Expired' : 'Active'} /></div>
                </div>
                <div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--gray-500)', marginBottom: '0.25rem' }}>Coverage Details</div>
                  <div style={{ fontWeight: 500 }}>{policy.policyType} / {policy.policyNumber}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--gray-500)', marginBottom: '0.25rem' }}>Coverage Limit</div>
                  <div style={{ fontWeight: 500 }}>{formatCurrency(policy.coverageAmount)}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--gray-500)', marginBottom: '0.25rem' }}>Deductible</div>
                  <div style={{ fontWeight: 500 }}>{formatCurrency(policy.deductible)}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--gray-500)', marginBottom: '0.25rem' }}>Validity Dates</div>
                  <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>{formatDate(policy.startDate)} - {formatDate(policy.endDate)}</div>
                </div>
                <div style={{ gridColumn: '1 / -1', marginTop: '0.5rem' }}>
                  <button className="btn btn-outline" style={{ width: '100%', borderColor: '#2563eb', color: '#2563eb' }} onClick={() => setActive('policies')}>
                    📋 View All Policyholder Policies
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ color: 'var(--gray-500)', fontSize: '0.875rem' }}>{fullClaim ? 'Loading policy details...' : 'Awaiting claim details...'}</div>
            )}
          </div>

        </div>

        {/* Right Column: Validation Panel */}
        <div className="card p-6" style={{ position: 'sticky', top: '1.5rem' }}>
          <h3 style={{ fontWeight: 700, fontSize: '1.0625rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>✅</span> Validation Panel
          </h3>
          
          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 600 }}>Validation Notes (Required for rejection)</label>
            <textarea
              className="form-control"
              rows={4}
              placeholder="Enter details about policy coverage, exclusions, or missing information..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1.5rem' }}>
            <button 
              className="btn btn-primary" 
              style={{ background: '#16a34a', borderColor: '#16a34a', width: '100%' }}
              onClick={() => handleValidate('ELIGIBLE')}
              disabled={loading}
            >
              ✅ Mark as ELIGIBLE
            </button>
            <button 
              className="btn btn-secondary" 
              style={{ width: '100%', borderColor: '#f59e0b', color: '#b45309' }}
              onClick={() => handleValidate('NEEDS_REVIEW')}
              disabled={loading}
            >
              ⚠️ Needs Adjuster Review
            </button>
            <button 
              className="btn btn-secondary" 
              style={{ width: '100%', borderColor: '#dc2626', color: '#b91c1c' }}
              onClick={() => handleValidate('NOT_ELIGIBLE')}
              disabled={loading}
            >
              ❌ Mark as NOT ELIGIBLE
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
