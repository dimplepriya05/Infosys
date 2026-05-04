import { useState, useEffect, useRef } from 'react';
import type { Claim, UserRole, DecisionForm, PaymentForm, ReserveForm, Assessment, AssessmentForm, ReserveMovement } from '@/types';
import { WORKFLOW_STAGES, formatCurrency, formatDateTime, computeNetPayable, getWorkflowStageIndex, formatFileSize, getFileIcon, formatDate } from '@/utils/helpers';
import { StatusBadge, PriorityBadge, Tabs, Modal, Alert, InfoGrid, ProgressBar } from '@/components/shared';
import { useToast } from '@/context/ToastContext';
import { api, appealsApi, documentsApi, claimRfiApi, claimsApi } from '@/services/api';

import { useAuth } from '@/context/AuthContext';

// ─── Workflow bar ─────────────────────────────────────────────────────────────

function WorkflowBar({ status }: { status: string }) {
  const idx = getWorkflowStageIndex(status as never);
  return (
    <div className="card p-4 mb-4">
      <p style={{ fontSize: '.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: '1rem' }}>
        Claim Workflow
      </p>
      <div className="workflow-track">
        {WORKFLOW_STAGES.map((stage, i) => (
          <div key={stage} className="wf-state">
            <div className={`wf-dot ${i < idx ? 'done' : i === idx ? 'current' : ''}`}>
              {i < idx ? '✓' : i + 1}
            </div>
            <div className="wf-label">{stage}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Timeline tab ─────────────────────────────────────────────────────────────

import { paymentsApi } from '@/services/api';

function TimelineTab({ claim, refreshClaim }: { claim: Claim; refreshClaim: () => void }) {
  const { user } = useAuth();
  const toast = useToast();
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const [internalOnly, setInternalOnly] = useState(false);

  const handlePostNote = async () => {
    if (!note.trim()) return;
    setSaving(true);
    try {
      await claimsApi.addNote(claim.id, note, internalOnly);
      toast('Note posted successfully', 'success');
      setNote('');
      refreshClaim();
    } catch (e) {
      toast('Failed to post note', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card p-6">
      <h3 style={{ fontWeight: 700, marginBottom: '1.5rem', fontSize: '1rem' }}>Activity Timeline</h3>
      <div className="timeline">
        {(claim.timeline || []).map((t) => (
          <div key={t.id} className="timeline-item">
            <div className="timeline-dot" style={{ background: t.color }} />
            <div style={{ fontSize: '.875rem', fontWeight: 600, color: '#1e293b' }}>
              {t.action}
              {t.internalOnly && <span style={{ marginLeft: 8, padding: '2px 6px', fontSize: '.7rem', background: '#fef3c7', color: '#b45309', borderRadius: 4 }}>Internal</span>}
            </div>
            <div style={{ fontSize: '.78rem', color: '#94a3b8', marginTop: '.2rem' }}>
              {t.transitionedByName || t.actor} · {formatDateTime(t.transitionedAt || t.timestamp)}
            </div>
            {t.reason && <div style={{ fontSize: '.85rem', color: '#475569', marginTop: '.375rem', padding: '.5rem', background: '#f8fafc', borderRadius: 4, border: '1px solid #e2e8f0' }}>{t.reason}</div>}
          </div>
        ))}
      </div>
      <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid #f1f5f9' }}>
        <h4 style={{ fontWeight: 600, fontSize: '.875rem', marginBottom: '.75rem' }}>Send Message / Add Note</h4>
        <textarea
          className="form-control" rows={3}
          placeholder={user?.role === 'Policyholder' ? "Type your message here..." : "Add a note, update, or internal comment..."}
          value={note} onChange={(e) => setNote(e.target.value)}
          style={{ resize: 'none' }}
        />
        {user?.role !== 'Policyholder' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginTop: '.75rem' }}>
            <input type="checkbox" id="internalNote" checked={internalOnly} onChange={e => setInternalOnly(e.target.checked)} />
            <label htmlFor="internalNote" style={{ fontSize: '.875rem', color: '#475569', fontWeight: 500, cursor: 'pointer' }}>Internal Note (Visible to adjusters only)</label>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '.75rem' }}>
          <button className="btn btn-primary btn-sm" onClick={handlePostNote} disabled={saving}>
            {saving ? 'Posting...' : (user?.role === 'Policyholder' ? 'Send Message' : 'Post Note')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Documents tab ────────────────────────────────────────────────────────────

function DocumentsTab({ claim, refreshClaim }: { claim: Claim, refreshClaim?: () => void }) {
  const toast = useToast();
  const { user } = useAuth();
  const [drag, setDrag] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [internalOnly, setInternalOnly] = useState(false);

  const isRFI = (user?.role === 'Policyholder' || user?.role === 'Partner/TPA') && claim.status === 'Assessment';

  const [rfis, setRfis] = useState<any[]>([]);
  const [newRfi, setNewRfi] = useState({ requestedInfo: '', dueDate: '' });
  const [showRfiForm, setShowRfiForm] = useState(false);
  const [fulfillRfiId, setFulfillRfiId] = useState<number | null>(null);

  useEffect(() => {
    claimRfiApi.list(claim.id).then((r: any) => setRfis(r.data.data)).catch(console.error);
  }, [claim.id]);

  const handleCreateRFI = async () => {
    try {
      await claimRfiApi.create(claim.id, newRfi);
      toast('RFI created successfully', 'success');
      setShowRfiForm(false);
      setNewRfi({ requestedInfo: '', dueDate: '' });
      claimRfiApi.list(claim.id).then((r: any) => setRfis(r.data.data));
    } catch (e: any) {
      toast(e.response?.data?.message || 'Failed to create RFI', 'error');
    }
  };

  const handleFileUpload = async (file: File) => {
    if (file.size > 2 * 1024 * 1024) {
      toast('File exceeds the maximum limit of 2 MB', 'error');
      return;
    }
    try {
      const res = await documentsApi.upload(claim.id, file, undefined, internalOnly);
      
      // If uploading to fulfill an RFI
      if (fulfillRfiId && res.data.data.id) {
        await claimRfiApi.fulfill(claim.id, fulfillRfiId, res.data.data.id);
        toast('RFI fulfilled successfully', 'success');
        setFulfillRfiId(null);
        claimRfiApi.list(claim.id).then((r: any) => setRfis(r.data.data));
      } else {
        toast('Document uploaded successfully', 'success');
      }
      
      setInternalOnly(false); // Reset after upload
      if (refreshClaim) refreshClaim();
    } catch (err: any) {
      toast(err.response?.data?.message || 'Failed to upload document', 'error');
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDrag(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileUpload(e.target.files[0]);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* RFI Section */}
      <div className="card p-6">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h3 style={{ fontWeight: 700, fontSize: '1rem' }}>Information Requests (RFI)</h3>
          {['Admin', 'Claims Adjuster', 'Underwriter'].includes(user?.role || '') && (
            <button className="btn btn-secondary btn-sm" onClick={() => setShowRfiForm(!showRfiForm)}>
              {showRfiForm ? 'Cancel' : '➕ Request Info'}
            </button>
          )}
        </div>

        {showRfiForm && (
          <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: 8, marginBottom: '1.25rem', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
              <div style={{ flex: 2 }}>
                <label className="form-label">Requested Information</label>
                <input type="text" className="form-control" value={newRfi.requestedInfo} onChange={e => setNewRfi({ ...newRfi, requestedInfo: e.target.value })} placeholder="e.g. Please provide police report" />
              </div>
              <div style={{ flex: 1 }}>
                <label className="form-label">Due Date</label>
                <input type="date" className="form-control" value={newRfi.dueDate} onChange={e => setNewRfi({ ...newRfi, dueDate: e.target.value })} />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-primary btn-sm" onClick={handleCreateRFI}>Send Request</button>
            </div>
          </div>
        )}

        {rfis.length === 0 ? (
          <div style={{ color: '#64748b', fontSize: '.875rem' }}>No pending requests for information.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
            {rfis.map(rfi => (
              <div key={rfi.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: '#fff', border: `1px solid ${rfi.status === 'PENDING' ? '#f59e0b' : '#e2e8f0'}`, borderRadius: 8, borderLeft: `4px solid ${rfi.status === 'PENDING' ? '#f59e0b' : rfi.status === 'FULFILLED' ? '#22c55e' : '#dc2626'}` }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '.9rem', color: '#0f172a', marginBottom: '.25rem' }}>{rfi.requestedInfo}</div>
                  <div style={{ fontSize: '.8rem', color: '#64748b' }}>Due: {formatDate(rfi.dueDate)} · Requested by {rfi.requestedByName}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <StatusBadge status={rfi.status} />
                  {rfi.status === 'PENDING' && (user?.role === 'Policyholder' || user?.role === 'Partner/TPA') && (
                    <button className="btn btn-primary btn-sm" onClick={() => {
                      setFulfillRfiId(rfi.id);
                      fileInputRef.current?.click();
                    }}>
                      Upload
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    <div className="card p-6">
      <h3 style={{ fontWeight: 700, marginBottom: '1.25rem', fontSize: '1rem' }}>Claim Documents</h3>
      {fulfillRfiId && (
        <Alert variant="warning" title="Fulfilling Request">
          The next document you upload will be used to fulfill the selected request.
        </Alert>
      )}
      {((user?.role === 'Admin' || user?.role === 'Claims Adjuster' || user?.role === 'Underwriter') || 
         (['DRAFT', 'SUBMITTED', 'TRIAGE'].includes(claim.status.toUpperCase())) || 
         isRFI) && (
        <div
          className={`upload-zone ${drag ? 'is-drag' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
          style={{ cursor: 'pointer', marginBottom: '1.25rem', border: isRFI ? '2px dashed #f59e0b' : undefined, background: isRFI ? '#fffbeb' : undefined }}
        >
          <div style={{ fontSize: '2rem', marginBottom: '.75rem' }}>📁</div>
          <div style={{ fontWeight: 600, marginBottom: '.375rem', color: '#334155' }}>Drop files or click to upload</div>
          <div style={{ fontSize: '.8125rem', color: '#64748b' }}>PDF, JPG, PNG · Max 2 MB</div>
          <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={onFileSelect} accept="image/png, image/jpeg, application/pdf" />
        </div>
      )}

      {/* Internal Only Checkbox */}
      {user?.role !== 'Policyholder' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginBottom: '1.25rem' }}>
          <input 
            type="checkbox" 
            id="internalOnlyDoc" 
            checked={internalOnly} 
            onChange={(e) => setInternalOnly(e.target.checked)} 
          />
          <label htmlFor="internalOnlyDoc" style={{ fontSize: '.875rem', fontWeight: 500, cursor: 'pointer', color: '#475569' }}>
            Mark as Internal Only (Hidden from Policyholder)
          </label>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
        {(claim.documents || []).map((doc) => (
          <div key={doc.id} className="card p-3" style={{ display: 'flex', alignItems: 'center', gap: '.875rem' }}>
            <span style={{ fontSize: '1.5rem' }}>{getFileIcon(doc.mimeType || (doc as any).contentType || '')}</span>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <div style={{ fontWeight: 600, fontSize: '.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '.5rem' }}>
                {doc.name || (doc as any).originalFileName || 'Unknown'}
                {doc.internalOnly && <span className="badge badge-gray" style={{ fontSize: '.65rem', padding: '.1rem .4rem' }}>Internal</span>}
              </div>
              <div style={{ fontSize: '.73rem', color: '#94a3b8', marginTop: '.15rem' }}>
                {formatFileSize(doc.size || (doc as any).fileSizeBytes || 0)} · v{doc.version} · {doc.uploadedBy || (doc as any).uploadedByName} · {formatDateTime(doc.uploadedAt || (doc as any).createdAt)}
              </div>
            </div>
            <StatusBadge status={doc.status} />
            <div style={{ display: 'flex', gap: '.375rem' }}>
              <button className="btn btn-ghost btn-icon btn-sm" title="Preview" onClick={() => toast(`Previewing ${doc.name}`, 'info')}>👁️</button>
              <button className="btn btn-ghost btn-icon btn-sm" title="Download" onClick={() => toast(`Downloading ${doc.name}`, 'success')}>⬇️</button>
            </div>
          </div>
        ))}
        {(!claim.documents || claim.documents.length === 0) && (
          <div style={{ textAlign: 'center', padding: '1.5rem', color: '#94a3b8', fontSize: '.875rem' }}>
            No documents attached yet.
          </div>
        )}
      </div>
    </div>
    </div>
  );
}

// ─── Assessment tab ─────────────────────────────────────────────────────────────

function AssessmentTab({ claim, refreshClaim }: { claim: Claim, refreshClaim?: () => void }) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [form, setForm] = useState<AssessmentForm>({
    causeOfLoss: '',
    damagesSummary: '',
    siteVisitScheduled: false,
    siteVisitDate: '',
    siteVisitOutcome: '',
    externalVerificationRequired: false,
    timeSpentMinutes: 0,
    peerReviewRequested: false,
    initialReserveAmount: ''
  });

  useEffect(() => {
    claimsApi.getAssessment(claim.id)
      .then(r => {
        if (r.data.data) {
          const a = r.data.data;
          setAssessment(a);
          setForm({
            causeOfLoss: a.causeOfLoss || '',
            damagesSummary: a.damagesSummary || '',
            siteVisitScheduled: a.siteVisitScheduled || false,
            siteVisitDate: a.siteVisitDate ? a.siteVisitDate.slice(0, 16) : '',
            siteVisitOutcome: a.siteVisitOutcome || '',
            externalVerificationRequired: a.externalVerificationRequired || false,
            timeSpentMinutes: a.timeSpentMinutes || 0,
            peerReviewRequested: a.peerReviewRequested || false
          });
        }
      })
      .catch(e => {
        console.log("No assessment found or error", e);
      });
  }, [claim.id]);

  const up = (k: keyof AssessmentForm, v: any) => setForm((p: AssessmentForm) => ({ ...p, [k]: v }));

  const handleSave = async () => {
    try {
      setLoading(true);
      await claimsApi.saveAssessment(claim.id, form);
      toast('Assessment saved successfully. Fraud flags updated.', 'success');
      // refresh assessment
      const r = await claimsApi.getAssessment(claim.id);
      setAssessment(r.data.data);
      if (refreshClaim) refreshClaim();
    } catch (e: any) {
      toast(e.response?.data?.message || 'Failed to save assessment', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = async () => {
    try {
      const res = await api.get(`/claims/${claim.id}/assessment/print`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `claim-${claim.id}-assessment.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error("Failed to print assessment", err);
      toast('Failed to download assessment printout', 'error');
    }
  };

  return (
    <div className="card p-6">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <h3 style={{ fontWeight: 700, fontSize: '1rem' }}>Claim Assessment</h3>
        {assessment && (
          <button className="btn btn-secondary btn-sm" onClick={handlePrint}>🖨️ Print Summary</button>
        )}
      </div>

      {assessment?.fraudFlags && (
        <Alert variant="warning" title="Fraud Flags Detected">
          {assessment.fraudFlags}
        </Alert>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
        <div className="form-group">
          <label className="form-label">Cause of Loss</label>
          <input className="form-control" value={form.causeOfLoss} onChange={e => up('causeOfLoss', e.target.value)} placeholder="e.g. Hailstorm, Rear-end collision" />
        </div>
        <div className="form-group">
          <label className="form-label">Time Spent (Minutes)</label>
          <input className="form-control" type="number" value={form.timeSpentMinutes} onChange={e => up('timeSpentMinutes', Number(e.target.value))} />
        </div>
        <div className="form-group">
          <label className="form-label">Initial Reserve ($)</label>
          <input className="form-control" type="number" value={form.initialReserveAmount} onChange={e => up('initialReserveAmount', e.target.value)} placeholder="0.00" />
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Damages Summary</label>
        <textarea className="form-control" rows={3} value={form.damagesSummary} onChange={e => up('damagesSummary', e.target.value)} placeholder="Detailed description of damages..." />
      </div>

      <div style={{ padding: '1rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
          <input type="checkbox" id="siteVisit" checked={form.siteVisitScheduled} onChange={e => up('siteVisitScheduled', e.target.checked)} />
          <label htmlFor="siteVisit" style={{ fontWeight: 600 }}>Site Visit Scheduled?</label>
        </div>
        {form.siteVisitScheduled && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem' }}>
            <div className="form-group mb-0">
              <label className="form-label">Visit Date/Time</label>
              <input type="datetime-local" className="form-control" value={form.siteVisitDate} onChange={e => up('siteVisitDate', e.target.value)} />
            </div>
            <div className="form-group mb-0">
              <label className="form-label">Outcome / Notes</label>
              <input className="form-control" value={form.siteVisitOutcome} onChange={e => up('siteVisitOutcome', e.target.value)} placeholder="Outcome of visit..." />
            </div>
          </div>
        )}
      </div>

      <div style={{ padding: '1rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <input type="checkbox" id="extVerif" checked={form.externalVerificationRequired} onChange={e => up('externalVerificationRequired', e.target.checked)} />
          <label htmlFor="extVerif" style={{ fontWeight: 600 }}>External Verification Required (e.g. Hospital/Garage)?</label>
        </div>
        {assessment?.externalVerificationRequired && (
          <div style={{ marginTop: '.5rem', fontSize: '.875rem' }}>Status: <strong>{assessment.externalVerificationStatus || 'PENDING'}</strong></div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
        <input type="checkbox" id="peerReview" checked={form.peerReviewRequested} onChange={e => up('peerReviewRequested', e.target.checked)} />
        <label htmlFor="peerReview" style={{ fontWeight: 600, color: '#b45309' }}>Request Peer Review before decision?</label>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button className="btn btn-primary" onClick={handleSave} disabled={loading}>
          {loading ? 'Saving...' : '💾 Save Assessment'}
        </button>
      </div>
    </div>
  );
}

// ─── Financial tab ────────────────────────────────────────────────────────────

function FinancialTab({ claim }: { claim: Claim }) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<ReserveMovement[]>([]);
  const [form, setForm] = useState<ReserveForm>({
    reserveAmount:  String(claim.reserveAmount ?? claim.amount ?? 0),
    deductibleApplied:     String(claim.deductibleApplied ?? 0),
    depreciationPercent:String(claim.depreciationPercent ?? 0),
    taxPercent: String(claim.taxPercent ?? 0),
    reason: '',
  });

  useEffect(() => {
    claimsApi.getReserveHistory(claim.id).then(r => setHistory(r.data.data)).catch(console.error);
  }, [claim.id]);

  const fetchSuggestions = async () => {
    try {
      const res = await claimsApi.getFinancialSuggestions(claim.id);
      const data = res.data.data;
      setForm(p => ({
        ...p,
        deductibleApplied: String(data.suggestedDeductible ?? 0),
        depreciationPercent: String(data.suggestedDepreciation ?? 0),
        taxPercent: String(data.suggestedTaxRate ?? 0)
      }));
      toast('Financial suggestions applied', 'success');
    } catch (e) {
      toast('Failed to load suggestions', 'error');
    }
  };

  const net = computeNetPayable(
    Number(form.reserveAmount) || 0,
    Number(form.deductibleApplied) || 0,
    Number(form.depreciationPercent) || 0,
    Number(form.taxPercent) || 0
  );
  const needsApproval = claim.amount >= 10000;

  return (
    <div className="card p-6">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <h3 style={{ fontWeight: 700, fontSize: '1rem', margin: 0 }}>Financial Assessment</h3>
        <button className="btn btn-outline btn-sm" onClick={fetchSuggestions}>
          ⚡ Auto-Calculate
        </button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="form-group">
          <label className="form-label">Reserve Amount ($)</label>
          <input className="form-control" type="number" value={form.reserveAmount}
            onChange={(e) => setForm((p) => ({ ...p, reserveAmount: e.target.value }))} />
        </div>
        <div className="form-group">
          <label className="form-label">Deductible ($)</label>
          <input className="form-control" type="number" value={form.deductibleApplied}
            onChange={(e) => setForm((p) => ({ ...p, deductibleApplied: e.target.value }))} />
        </div>
        <div className="form-group">
          <label className="form-label">Depreciation (%)</label>
          <input className="form-control" type="number" min={0} max={100} value={form.depreciationPercent}
            onChange={(e) => setForm((p) => ({ ...p, depreciationPercent: e.target.value }))} />
        </div>
        <div className="form-group">
          <label className="form-label">Tax (%)</label>
          <input className="form-control" type="number" min={0} max={100} value={form.taxPercent}
            onChange={(e) => setForm((p) => ({ ...p, taxPercent: e.target.value }))} />
        </div>
        <div className="form-group">
          <label className="form-label">Net Payable (calculated)</label>
          <input className="form-control" value={formatCurrency(net)} readOnly
            style={{ background: '#f8fafc', fontWeight: 700, color: '#15803d' }} />
        </div>
      </div>

      {/* Summary card */}
      <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: '1rem', marginBottom: '1rem' }}>
        <div style={{ fontWeight: 700, color: '#15803d', marginBottom: '.75rem', fontSize: '.9375rem' }}>Financial Summary</div>
        {[
          ['Claimed Amount',  formatCurrency(claim.amount)],
          ['Reserve Set',     formatCurrency(Number(form.reserveAmount) || 0)],
          ['Deductible',      `− ${formatCurrency(Number(form.deductibleApplied) || 0)}`],
          ['Depreciation',    `− ${formatCurrency(Math.max(0, Number(form.reserveAmount) - Number(form.deductibleApplied)) * (Number(form.depreciationPercent) / 100))}`],
          ['Tax',             `+ ${formatCurrency(Math.max(0, (Number(form.reserveAmount) - Number(form.deductibleApplied)) - (Math.max(0, Number(form.reserveAmount) - Number(form.deductibleApplied)) * (Number(form.depreciationPercent) / 100))) * (Number(form.taxPercent) / 100))}`],
          ['Net Payable',     formatCurrency(net)],
        ].map(([k, v], i) => (
          <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.875rem', padding: '.3rem 0', borderTop: i === 5 ? '1px solid #bbf7d0' : undefined }}>
            <span style={{ color: '#475569' }}>{k}</span>
            <span style={{ fontWeight: i === 5 ? 800 : 600, color: i === 5 ? '#15803d' : '#0f172a' }}>{v}</span>
          </div>
        ))}
      </div>

      <div className="form-group">
        <label className="form-label">Adjustment Reason *</label>
        <input className="form-control" value={form.reason} onChange={e => setForm(p => ({ ...p, reason: e.target.value }))} placeholder="Reason for reserve change..." />
      </div>

      {needsApproval && (
        <Alert variant="warning" title="High-Value Approval Required">
          Reserves over $10,000 will require underwriter approval before the adjusted amount takes effect.
        </Alert>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.25rem', gap: '1rem' }}>
        <button className="btn btn-secondary" onClick={async () => {
          try {
            const res = await api.get(`/claims/${claim.id}/reserves/export`, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `claim-${claim.id}-reserves.csv`);
            document.body.appendChild(link);
            link.click();
            link.remove();
          } catch (err) {
            console.error("Failed to export reserves", err);
            toast('Failed to export history', 'error');
          }
        }}>
          📥 Export History
        </button>
        <button className="btn btn-primary" onClick={async () => {
          if (!form.reason?.trim()) {
            toast('Adjustment Reason is required', 'error');
            return;
          }
          try {
            setLoading(true);
            const req = {
              newReserveAmount: Number(form.reserveAmount) || 0,
              deductibleAmount: Number(form.deductibleApplied) || 0,
              depreciationAmount: Math.max(0, Number(form.reserveAmount) - Number(form.deductibleApplied)) * (Number(form.depreciationPercent) / 100),
              depreciationPercent: Number(form.depreciationPercent) || 0,
              taxPercent: Number(form.taxPercent) || 0,
              reason: form.reason
            };
            await claimsApi.updateReserve(claim.id, req);
            toast('Reserve updated successfully', 'success');
            const r = await claimsApi.getReserveHistory(claim.id);
            setHistory(r.data.data);
            setForm(p => ({...p, reason: ''}));
          } catch (e: any) {
            toast(e.response?.data?.message || 'Failed to update reserve', 'error');
          } finally {
            setLoading(false);
          }
        }} disabled={loading}>
          {loading ? 'Saving...' : '💾 Save Financial Details'}
        </button>
      </div>

      {/* Reserve History */}
      {history.length > 0 && (
        <div style={{ marginTop: '2rem' }}>
          <h4 style={{ fontWeight: 700, fontSize: '.9375rem', marginBottom: '1rem' }}>Reserve Audit History</h4>
          <div style={{ background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: '.8125rem' }}>
              <thead style={{ background: '#f1f5f9', color: '#475569' }}>
                <tr>
                  <th style={{ padding: '.75rem', borderBottom: '1px solid #e2e8f0' }}>Date</th>
                  <th style={{ padding: '.75rem', borderBottom: '1px solid #e2e8f0' }}>New Reserve</th>
                  <th style={{ padding: '.75rem', borderBottom: '1px solid #e2e8f0' }}>Change</th>
                  <th style={{ padding: '.75rem', borderBottom: '1px solid #e2e8f0' }}>Adjusted By</th>
                  <th style={{ padding: '.75rem', borderBottom: '1px solid #e2e8f0' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {history.map(h => (
                  <tr key={h.id}>
                    <td style={{ padding: '.75rem', borderBottom: '1px solid #e2e8f0' }}>{new Date(h.createdAt).toLocaleDateString()}</td>
                    <td style={{ padding: '.75rem', borderBottom: '1px solid #e2e8f0', fontWeight: 600 }}>{formatCurrency(h.newReserveAmount)}</td>
                    <td style={{ padding: '.75rem', borderBottom: '1px solid #e2e8f0', color: h.adjustmentAmount > 0 ? '#b45309' : '#15803d' }}>
                      {h.adjustmentAmount > 0 ? '+' : ''}{formatCurrency(h.adjustmentAmount)}
                    </td>
                    <td style={{ padding: '.75rem', borderBottom: '1px solid #e2e8f0' }}>{h.adjustedByName}</td>
                    <td style={{ padding: '.75rem', borderBottom: '1px solid #e2e8f0' }}>
                      <span style={{ padding: '2px 6px', borderRadius: 4, background: h.approved ? '#dcfce7' : '#fef08a', color: h.approved ? '#166534' : '#854d0e', fontSize: '.75rem' }}>
                        {h.approved ? 'Approved' : 'Pending'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Decision modal ───────────────────────────────────────────────────────────

function DecisionModal({ isOpen, onClose, claim, refreshClaim }: { isOpen: boolean; onClose: () => void; claim: Claim, refreshClaim?: () => void }) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [memoFile, setMemoFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<DecisionForm>({ 
    type: '', 
    reason: '',
    policyClauseReference: '',
    deductibleAmount: '0',
    depreciationAmount: '0',
    freeTextNote: '',
    requiresSupervisorReview: false,
    checklistVerified: false
  });
  
  const up = (k: keyof DecisionForm, v: any) => setForm((p) => ({ ...p, [k]: v }));

  const hasPhoto = claim.documents?.some(d => {
    const n = d.name || (d as any).originalFileName || '';
    return n.includes('Photo') || n.includes('Damage');
  });

  const handleSubmit = async () => {
    if (!form.type || !form.reason.trim()) { 
      toast('Please complete all required fields', 'error'); 
      return; 
    }
    
    if ((form.type === 'APPROVED' || form.type === 'PARTIALLY_APPROVED') && !form.checklistVerified) {
      toast('Please verify all required documents first.', 'error');
      return;
    }
    
    if (form.type === 'DENIED' && (!form.freeTextNote || !form.freeTextNote.trim())) {
      toast('A free-text note is required when denying a claim.', 'error');
      return;
    }

    try {
      setLoading(true);
      await claimsApi.decide(claim.id, {
        decisionType: form.type,
        reason: form.reason,
        policyClauseReference: form.policyClauseReference,
        deductibleAmount: Number(form.deductibleAmount || 0),
        depreciationAmount: Number(form.depreciationAmount || 0),
        freeTextNote: form.freeTextNote,
        requiresSupervisorReview: form.requiresSupervisorReview,
        checklistVerified: form.checklistVerified,
        approvedAmount: Number(claim.amount)
      });
      const label = form.type === 'APPROVED' ? 'Approved ✅' : form.type === 'PARTIALLY_APPROVED' ? 'Partially Approved 🔶' : 'Denied ❌';
      toast(`Claim ${label}. Policyholder notified.`, form.type === 'DENIED' ? 'warning' : 'success');
      
      // Upload decision memo if selected
      if (memoFile) {
        try {
          await documentsApi.upload(claim.id, memoFile, 'Decision Memo');
          toast('Decision memo attached successfully', 'success');
        } catch (uploadErr) {
          toast('Decision recorded, but failed to upload memo.', 'warning');
        }
      }

      if (refreshClaim) refreshClaim();
      onClose();
    } catch (e: any) {
      toast(e.response?.data?.message || 'Failed to submit decision', 'error');
    } finally {
      setLoading(false);
    }
  };

  const netApproved = Number(claim.amount || 0) - Number(form.deductibleAmount || 0) - Number(form.depreciationAmount || 0);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="⚖️ Record Decision" width={600}
      footer={<><button className="btn btn-secondary" onClick={onClose} disabled={loading}>Cancel</button><button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>Confirm Decision</button></>}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <div className="form-group" style={{ flex: 1 }}>
            <label className="form-label">Decision Outcome *</label>
            <select className="form-control" value={form.type} onChange={(e) => up('type', e.target.value)}>
              <option value="">Select an outcome…</option>
              <option value="APPROVED">✅ Approve — Full Amount</option>
              <option value="PARTIALLY_APPROVED">🔶 Approve — Partial Amount</option>
              <option value="DENIED">❌ Deny Claim</option>
              <option value="PENDING_INFO">⏳ Request More Info</option>
            </select>
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <label className="form-label">Structured Reason *</label>
            <select className="form-control" value={form.reason} onChange={(e) => up('reason', e.target.value)}>
              <option value="">Select a reason…</option>
              <option value="Damage covered by policy">Damage covered by policy</option>
              <option value="Partial coverage applied">Partial coverage applied</option>
              <option value="Out of network provider">Out of network provider</option>
              <option value="Policy exclusion">Policy exclusion</option>
              <option value="Insufficient evidence">Insufficient evidence</option>
              <option value="Suspected fraud">Suspected fraud</option>
            </select>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Policy Clause Reference</label>
          <input className="form-control" placeholder="e.g. Section 4.A (Coverage limits)"
            value={form.policyClauseReference} onChange={(e) => up('policyClauseReference', e.target.value)} />
        </div>

        {(form.type === 'APPROVED' || form.type === 'PARTIALLY_APPROVED') && (
          <div style={{ padding: '1rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <h4 style={{ fontWeight: 600, fontSize: '.875rem', marginBottom: '1rem' }}>Financial Calculation</h4>
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
              <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '.75rem' }}>Claimed Amount</label>
                <input className="form-control" type="text" readOnly value={`$${claim.amount || 0}`} style={{ background: '#f1f5f9' }} />
              </div>
              <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '.75rem' }}>Deductible ($)</label>
                <input className="form-control" type="number" value={form.deductibleAmount} onChange={(e) => up('deductibleAmount', e.target.value)} />
              </div>
              <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '.75rem' }}>Depreciation ($)</label>
                <input className="form-control" type="number" value={form.depreciationAmount} onChange={(e) => up('depreciationAmount', e.target.value)} />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #cbd5e1', paddingTop: '.75rem' }}>
              <span style={{ fontWeight: 600, color: '#475569' }}>Net Approved Amount:</span>
              <span style={{ fontSize: '1.25rem', fontWeight: 800, color: netApproved < 0 ? '#ef4444' : '#16a34a' }}>${Math.max(0, netApproved).toFixed(2)}</span>
            </div>
          </div>
        )}

        {(form.type === 'DENIED' || form.type === 'PENDING_INFO') && (
          <div className="form-group">
            <label className="form-label">Free-Text Note {form.type === 'DENIED' ? '*' : ''}</label>
            <textarea className="form-control" rows={3} style={{ resize: 'none' }}
              placeholder={form.type === 'DENIED' ? "Mandatory explanation for denial…" : "Additional details…"}
              value={form.freeTextNote} onChange={(e) => up('freeTextNote', e.target.value)} />
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginTop: '.5rem' }}>
          <input type="checkbox" id="supervisorReview" checked={form.requiresSupervisorReview} onChange={(e) => up('requiresSupervisorReview', e.target.checked)} />
          <label htmlFor="supervisorReview" style={{ fontSize: '.875rem', fontWeight: 500, cursor: 'pointer' }}>Require Supervisor Review before finalization</label>
        </div>

        {/* Decision Memo Upload */}
        <div style={{ marginTop: '1rem' }}>
          <label className="form-label">Attach Decision Memo (PDF)</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button className="btn btn-secondary btn-sm" onClick={() => fileInputRef.current?.click()}>
              📎 Choose File
            </button>
            <span style={{ fontSize: '.875rem', color: '#64748b' }}>
              {memoFile ? memoFile.name : 'No file chosen (Optional)'}
            </span>
            {memoFile && (
              <button className="btn btn-ghost btn-sm" style={{ color: '#ef4444' }} onClick={() => setMemoFile(null)}>
                ✖ Remove
              </button>
            )}
          </div>
          <input 
            type="file" 
            ref={fileInputRef} 
            style={{ display: 'none' }} 
            accept="application/pdf"
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                setMemoFile(e.target.files[0]);
              }
            }} 
          />
        </div>

        {/* Document checklist */}
        <div style={{ marginTop: '1rem', borderTop: '1px solid #f1f5f9', paddingTop: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.75rem' }}>
            <div style={{ fontWeight: 600, fontSize: '.875rem' }}>Mandatory Document Checklist</div>
            <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center' }}>
              <input type="checkbox" id="checklistVerified" checked={form.checklistVerified} onChange={(e) => up('checklistVerified', e.target.checked)} />
              <label htmlFor="checklistVerified" style={{ fontSize: '.75rem', fontWeight: 600, color: '#2563eb', cursor: 'pointer' }}>I verify checklist is complete</label>
            </div>
          </div>
          {[
            ['Damage Photos / Evidence', hasPhoto, true],
            ['Police / Incident Report', (claim.documents || []).some(d => { const n = d.name || (d as any).originalFileName || ''; return n.includes('Police'); }), false],
            ['ID Verification', true, true],
          ].map(([item, done, isRequired]) => (
            <div key={String(item)} style={{ display: 'flex', alignItems: 'center', gap: '.625rem', padding: '.3rem 0', fontSize: '.8125rem' }}>
              <span style={{ color: done ? '#16a34a' : '#ef4444', fontWeight: 800 }}>{done ? '✓' : '❌'}</span>
              <span style={{ color: done ? '#1e293b' : '#ef4444', textDecoration: !done && isRequired ? 'underline' : 'none' }}>{String(item)} {isRequired ? '*' : ''}</span>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}

// ─── Payment modal ────────────────────────────────────────────────────────────

function PaymentModal({ isOpen, onClose, claim }: { isOpen: boolean; onClose: () => void; claim: Claim }) {
  const toast = useToast();
  const [form, setForm] = useState<PaymentForm>({ method: 'Bank Transfer', accountDetails: '', amount: String(claim.approvedAmount ?? claim.amount) });
  const up = (k: keyof PaymentForm, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = async () => {
    if (!form.accountDetails.trim() || !form.amount) { toast('Fill all required fields', 'error'); return; }
    try {
      await paymentsApi.initiate(Number(claim.id), {
        paymentMethod: form.method === 'Bank Transfer' ? 'BANK_TRANSFER' : form.method === 'UPI' ? 'UPI' : 'CHEQUE',
        accountDetails: form.accountDetails,
        amount: Number(form.amount),
        bankName: form.method === 'Bank Transfer' ? 'Bank' : undefined,
      });
      toast(`Payment of ${formatCurrency(Number(form.amount))} initiated via ${form.method}`, 'success');
      onClose();
    } catch (e: any) {
      toast(e.response?.data?.message || 'Failed to initiate payment', 'error');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="💳 Initiate Payment" width={480}
      footer={<><button className="btn btn-secondary" onClick={onClose}>Cancel</button><button className="btn btn-success" onClick={handleSubmit}>💳 Initiate Payment</button></>}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div className="form-group">
          <label className="form-label">Payment Method</label>
          <select className="form-control" value={form.method} onChange={(e) => up('method', e.target.value)}>
            <option>Bank Transfer</option><option>UPI</option><option>Cheque</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">{form.method === 'UPI' ? 'UPI ID' : form.method === 'Cheque' ? 'Payee Name' : 'Account Number'} *</label>
          <input className="form-control" placeholder={form.method === 'UPI' ? 'username@bank' : 'Enter details'}
            value={form.accountDetails} onChange={(e) => up('accountDetails', e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Amount ($) *</label>
          <input className="form-control" type="number" value={form.amount} onChange={(e) => up('amount', e.target.value)} />
        </div>
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: '1rem' }}>
          <div style={{ fontWeight: 700, color: '#15803d', marginBottom: '.5rem', fontSize: '.875rem' }}>Settlement Summary</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.875rem' }}>
            <span style={{ color: '#475569' }}>Net Payable:</span>
            <span style={{ fontWeight: 700 }}>{formatCurrency(claim.approvedAmount ?? claim.amount)}</span>
          </div>
        </div>
      </div>
    </Modal>
  );
}

// ─── Appeal modal ─────────────────────────────────────────────────────────────

function AppealModal({ isOpen, onClose, claim, setSelectedClaim }: { isOpen: boolean; onClose: () => void; claim: Claim; setSelectedClaim?: (c: Claim) => void; }) {
  const toast = useToast();
  const [form, setForm] = useState({ reason: '', justification: '' });
  const [submitting, setSubmitting] = useState(false);
  const [appealFile, setAppealFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const up = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = async () => {
    if (!form.reason.trim() || !form.justification.trim()) { toast('Fill all required fields', 'error'); return; }
    setSubmitting(true);
    try {
      await appealsApi.submit(claim.id, form);
      toast('Appeal submitted successfully. The adjuster team will review it.', 'success');
      
      // Upload supporting document if selected
      if (appealFile) {
        try {
          await documentsApi.upload(claim.id, appealFile, 'Appeal Document');
          toast('Supporting document attached successfully', 'success');
        } catch (uploadErr) {
          toast('Appeal submitted, but failed to upload document.', 'warning');
        }
      }

      if (setSelectedClaim) {
        claimsApi.get(claim.id).then(r => setSelectedClaim(r.data.data)).catch(console.error);
      }
      onClose();
    } catch (e: any) {
      toast(e.response?.data?.message || 'Failed to submit appeal', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="📝 Submit Appeal" width={520}
      footer={<><button className="btn btn-secondary" onClick={onClose} disabled={submitting}>Cancel</button><button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>{submitting ? 'Submitting...' : 'Submit Appeal'}</button></>}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <Alert variant="info" title="Appeal Process">
          Appealing a decision requires a valid reason and justification. Our team will review your appeal within 3-5 business days.
        </Alert>
        <div className="form-group">
          <label className="form-label">Appeal Reason *</label>
          <select className="form-control" value={form.reason} onChange={(e) => up('reason', e.target.value)}>
            <option value="">Select a reason...</option>
            <option value="Incorrect Damage Assessment">Incorrect Damage Assessment</option>
            <option value="Denied Coverage Dispute">Denied Coverage Dispute</option>
            <option value="Deductible Issue">Deductible Issue</option>
            <option value="Other">Other</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Justification *</label>
          <textarea className="form-control" rows={4} placeholder="Provide details on why you are appealing this decision..."
            value={form.justification} onChange={(e) => up('justification', e.target.value)} />
        </div>
        
        {/* Supporting Document Upload */}
        <div style={{ marginTop: '.5rem' }}>
          <label className="form-label">Supporting Document (Optional)</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button className="btn btn-secondary btn-sm" onClick={() => fileInputRef.current?.click()}>
              📎 Choose File
            </button>
            <span style={{ fontSize: '.875rem', color: '#64748b' }}>
              {appealFile ? appealFile.name : 'No file chosen'}
            </span>
            {appealFile && (
              <button className="btn btn-ghost btn-sm" style={{ color: '#ef4444' }} onClick={() => setAppealFile(null)}>
                ✖ Remove
              </button>
            )}
          </div>
          <input 
            type="file" 
            ref={fileInputRef} 
            style={{ display: 'none' }} 
            accept="image/png, image/jpeg, application/pdf"
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                setAppealFile(e.target.files[0]);
              }
            }} 
          />
        </div>
      </div>
    </Modal>
  );
}

// ─── Reassign modal ───────────────────────────────────────────────────────────

function ReassignModal({ isOpen, onClose, claim, setSelectedClaim }: { isOpen: boolean; onClose: () => void; claim: Claim; setSelectedClaim?: (c: Claim) => void; }) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ adjusterId: '' });

  const handleSubmit = async () => {
    if (!form.adjusterId) {
      toast('Please select an adjuster', 'error');
      return;
    }
    
    try {
      setLoading(true);
      await claimsApi.assign(claim.id, { adjusterId: Number(form.adjusterId) });
      toast('Claim reassigned successfully', 'success');
      
      if (setSelectedClaim) {
        claimsApi.get(claim.id).then(r => setSelectedClaim(r.data.data)).catch(console.error);
      }
      onClose();
    } catch (e: any) {
      toast(e.response?.data?.message || 'Failed to reassign claim', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="👤 Reassign Claim" width={400}
      footer={<><button className="btn btn-secondary" onClick={onClose} disabled={loading}>Cancel</button><button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>{loading ? 'Reassigning...' : 'Confirm Reassignment'}</button></>}
    >
      <div className="form-group">
        <label className="form-label">Select Adjuster *</label>
        <select className="form-control" value={form.adjusterId} onChange={(e) => setForm({ adjusterId: e.target.value })}>
          <option value="">Select an adjuster...</option>
          <option value="2">Alice Adjuster</option>
          <option value="5">Jane Smith</option>
        </select>
      </div>
    </Modal>
  );
}

// ─── Claim Detail ─────────────────────────────────────────────────────────────

interface ClaimDetailProps {
  claim: Claim | null;
  role: UserRole;
  setActive: (id: string) => void;
  setSelectedClaim?: (c: Claim) => void;
}

export default function ClaimDetail({ claim, role, setActive, setSelectedClaim }: ClaimDetailProps) {
  const toast = useToast();
  const [tab, setTab] = useState('overview');
  const [decisionOpen, setDecisionOpen] = useState(false);
  const [paymentOpen,  setPaymentOpen]  = useState(false);
  const [appealOpen,   setAppealOpen]   = useState(false);
  const [triageOpen,   setTriageOpen]   = useState(false);
  const [reopenOpen,   setReopenOpen]   = useState(false);
  const [reassignOpen, setReassignOpen] = useState(false);

  if (!claim) return (
    <div className="card p-6" style={{ textAlign: 'center', color: '#94a3b8', padding: '4rem' }}>
      <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📋</div>
      <div>No claim selected. <button className="btn btn-ghost btn-sm" style={{ color: '#2563eb' }} onClick={() => setActive('claims')}>Go to Claims →</button></div>
    </div>
  );

  const canActOnClaim = role === 'Claims Adjuster' || role === 'Admin' || role === 'Finance';

  const TABS = [
    { id: 'overview',   label: 'Overview',   icon: '📋' },
    { id: 'timeline',   label: 'Timeline',   icon: '🕐' },
    ...(['Admin', 'Claims Adjuster', 'Underwriter'].includes(role) ? [
      { id: 'assessment', label: 'Assessment', icon: '📝' }
    ] : []),
    { id: 'documents',  label: 'Documents',  icon: '📁' },
    ...(['Admin', 'Claims Adjuster', 'Underwriter'].includes(role) ? [
      { id: 'financial',  label: 'Financial',  icon: '💰' }
    ] : []),
  ];

  return (
    <div>
      {/* Page header */}
      <div className="page-header">
        <div className="page-header-row">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button className="btn btn-secondary btn-sm" onClick={() => setActive('claims')}>← Back</button>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem', flexWrap: 'wrap' }}>
                <h1 className="page-title" style={{ fontSize: '1.25rem' }}>{claim.referenceNumber || claim.id}</h1>
                <StatusBadge status={claim.status} />
                <PriorityBadge priority={claim.priority} />
              </div>
              <p className="page-subtitle">{claim.type} Claim · {claim.policyholder} · Filed {claim.filedDate}</p>
            </div>
          </div>
          {canActOnClaim && (
            <div style={{ display: 'flex', gap: '.625rem', flexWrap: 'wrap' }}>
              <button className="btn btn-secondary btn-sm" onClick={() => toast('Claim flagged for review', 'warning')}>🚩 Flag</button>
              <button className="btn btn-secondary btn-sm" onClick={() => setReassignOpen(true)}>👤 Reassign</button>
              {claim.status.toUpperCase() === 'SUBMITTED' && (
                <button className="btn btn-primary btn-sm" onClick={() => setTriageOpen(true)}>🚦 Triage</button>
              )}
              {['REVIEW', 'DECISION'].includes(claim.status.toUpperCase()) && (
                <button className="btn btn-warning btn-sm" onClick={() => setReopenOpen(true)}>🔄 Reopen</button>
              )}
              {claim.status.toUpperCase() === 'ASSESSMENT' && (
                <button className="btn btn-primary btn-sm" onClick={async () => {
                  try {
                    await claimsApi.transition(claim.id, { targetStatus: 'DECISION', reason: 'Assessment completed' });
                    toast('Claim moved to Decision stage', 'success');
                    if (setSelectedClaim) claimsApi.get(claim.id).then(r => setSelectedClaim(r.data.data)).catch(console.error);
                  } catch (e: any) {
                    toast(e.response?.data?.message || 'Failed to transition', 'error');
                  }
                }}>➡️ Move to Decision</button>
              )}
              {['DECISION', 'REVIEW'].includes(claim.status.toUpperCase()) && (
                <button className="btn btn-primary btn-sm" onClick={() => setDecisionOpen(true)}>⚖️ Record Decision</button>
              )}
              {claim.status.toUpperCase() === 'SETTLEMENT' && (role === 'Finance' || role === 'Admin') && (
                <button className="btn btn-success btn-sm" onClick={() => setPaymentOpen(true)}>💳 Payment</button>
              )}
            </div>
          )}
          {(role === 'Policyholder' || role === 'Partner/TPA') && (claim.status.toUpperCase() === 'DRAFT' || claim.status.toUpperCase() === 'SUBMITTED' || claim.status.toUpperCase() === 'TRIAGE') && (
            <div style={{ display: 'flex', gap: '.625rem', flexWrap: 'wrap' }}>
              {claim.status.toUpperCase() === 'DRAFT' && (
                <button className="btn btn-primary btn-sm" onClick={() => setActive('newclaim')}>✏️ Edit Draft</button>
              )}
              <button className="btn btn-danger btn-sm" onClick={async () => {
                if (confirm('Are you sure you want to withdraw this claim?')) {
                  try {
                    await claimsApi.withdraw(claim.id);
                    toast('Claim withdrawn successfully', 'success');
                    if (setSelectedClaim) {
                      claimsApi.get(claim.id).then(r => setSelectedClaim(r.data.data)).catch(console.error);
                    }
                  } catch (e) {
                    toast('Failed to withdraw claim', 'error');
                  }
                }
              }}>🗑️ Withdraw Claim</button>
            </div>
          )}
          {role === 'Policyholder' && (claim.status.toUpperCase() === 'CLOSED' || claim.status.toUpperCase() === 'REJECTED') && (
            <div style={{ display: 'flex', gap: '.625rem', flexWrap: 'wrap' }}>
              <button className="btn btn-warning btn-sm" disabled={claim.appealed} onClick={() => setAppealOpen(true)}>
                {claim.appealed ? 'Already Appealed' : '📝 Appeal Decision'}
              </button>
            </div>
          )}
        </div>
      </div>

      <WorkflowBar status={claim.status} />

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
        {/* Left col */}
        <div>
          <Tabs tabs={TABS} active={tab} onChange={setTab} />
          <div style={{ marginTop: '1.25rem' }}>
            {tab === 'overview' && (
              <div className="card p-6">
                <h3 style={{ fontWeight: 700, marginBottom: '1.25rem', fontSize: '1rem' }}>Claim Details</h3>
                <InfoGrid cols={2} items={[
                  { label: 'Claim ID',      value: <span className="mono fw-600">{claim.referenceNumber || claim.id}</span> },
                  { label: 'Policy Number', value: <span className="mono">{claim.policyId}</span> },
                  { label: 'Claim Type',    value: claim.type },
                  { label: 'Policyholder',  value: claim.policyholder },
                  { label: 'Incident Date', value: claim.incidentDate ?? '—' },
                  { label: 'Incident Type', value: claim.incidentType ?? '—' },
                  { label: 'Location',      value: claim.incidentLocation ?? '—' },
                  { label: 'Filed Date',    value: claim.filedDate },
                  { label: 'Amount',        value: <span className="fw-700" style={{ color: '#0f172a' }}>{formatCurrency(claim.amount)}</span> },
                  { label: 'Assignee',      value: claim.assignee },
                ]} />
                {claim.description && (
                  <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid #f1f5f9' }}>
                    <div style={{ fontSize: '.78rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: '.5rem' }}>Description</div>
                    <p style={{ fontSize: '.9375rem', color: '#334155', lineHeight: 1.7 }}>{claim.description}</p>
                  </div>
                )}
                {/* Notes/Messages */}
                {(claim.notes || []).length > 0 && (
                  <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid #f1f5f9' }}>
                    <h4 style={{ fontWeight: 700, fontSize: '.875rem', marginBottom: '1rem' }}>Messages & Notes</h4>
                    {(claim.notes || []).map((n) => (
                      <div key={n.id} style={{ background: '#f8fafc', borderRadius: 10, padding: '.875rem', marginBottom: '.75rem', border: '1px solid #f1f5f9' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '.375rem' }}>
                          <span style={{ fontWeight: 600, fontSize: '.8125rem' }}>{n.author}</span>
                          <span style={{ fontSize: '.73rem', color: '#94a3b8' }}>{formatDateTime(n.createdAt)}</span>
                        </div>
                        <p style={{ fontSize: '.875rem', color: '#475569', lineHeight: 1.6 }}>{n.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            {tab === 'timeline'  && <TimelineTab  claim={claim} refreshClaim={() => {
              if (setSelectedClaim && claim) {
                claimsApi.get(claim.id).then(r => setSelectedClaim(r.data.data)).catch(console.error);
              }
            }} />}
            {tab === 'assessment' && <AssessmentTab claim={claim} refreshClaim={() => {
              if (setSelectedClaim && claim) {
                claimsApi.get(claim.id).then(r => setSelectedClaim(r.data.data)).catch(console.error);
              }
            }} />}
            {tab === 'documents' && <DocumentsTab claim={claim} refreshClaim={() => {
              claimsApi.get(claim.id).then(r => setSelectedClaim?.(r.data.data)).catch(console.error);
            }} />}
            {tab === 'financial' && <FinancialTab claim={claim} />}
          </div>
        </div>

        {/* Right col */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="card p-4">
            <h4 style={{ fontWeight: 700, fontSize: '.875rem', marginBottom: '1rem' }}>Quick Actions</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
              {[
                ...(role !== 'Policyholder' && claim.policyholderEmail ? [['📧', 'Contact Policyholder', () => window.location.href = `mailto:${claim.policyholderEmail}`]] : []),
                ['🖨️', 'Print Claim',           () => window.print()],
                ...(claim.decision ? [['📄', 'Print Decision Summary', async () => {
                  try {
                    const res = await api.get(`/claims/${claim.id}/decision/print`, { responseType: 'blob' });
                    const blob = new Blob([res.data], { type: 'application/pdf' });
                    const url = window.URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.setAttribute('download', `claim-${claim.id}-decision.pdf`);
                    document.body.appendChild(link);
                    link.click();
                    link.remove();
                  } catch (e) {
                    toast('Failed to print decision summary', 'error');
                  }
                }]] : []),
              ].map(([icon, label, action]) => (
                <button key={String(label)} className="btn btn-secondary btn-sm w-full"
                  style={{ justifyContent: 'flex-start', gap: '.75rem' }}
                  onClick={action as () => void}>
                  {String(icon)} {String(label)}
                </button>
              ))}
            </div>
          </div>

          {/* Financial Snapshot */}
          <div className="card p-4">
            <h4 style={{ fontWeight: 700, fontSize: '.875rem', marginBottom: '1rem' }}>Financial Snapshot</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem', fontSize: '.8125rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#475569' }}>Claim Amount:</span>
                <span style={{ fontWeight: 600 }}>{formatCurrency(claim.amount)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#475569' }}>Reserve Set:</span>
                <span style={{ fontWeight: 600 }}>{formatCurrency(claim.reserveAmount || 0)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#475569' }}>Net Payable:</span>
                <span style={{ fontWeight: 700, color: '#15803d' }}>{formatCurrency(claim.netPayableAmount || 0)}</span>
              </div>
              {claim.approvedAmount !== undefined && (
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e2e8f0', paddingTop: '.5rem', marginTop: '.25rem' }}>
                  <span style={{ color: '#475569', fontWeight: 600 }}>Approved:</span>
                  <span style={{ fontWeight: 800, color: '#0f172a' }}>{formatCurrency(claim.approvedAmount)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Document checklist */}
          <div className="card p-4">
            <h4 style={{ fontWeight: 700, fontSize: '.875rem', marginBottom: '1rem' }}>Document Checklist</h4>
            {[
              ['Police / Incident Report', (claim.documents || []).some((d) => (d.name || (d as any).originalFileName || '').includes('Police'))],
              ['Damage Photos / Evidence', (claim.documents || []).some((d) => { const n = d.name || (d as any).originalFileName || ''; return n.includes('Photo') || n.includes('Damage'); })],
              ['Medical Records',          false],
              ['Repair / Cost Estimate',   (claim.documents || []).some((d) => { const n = d.name || (d as any).originalFileName || ''; return n.includes('Repair') || n.includes('Estimate'); })],
              ['ID Verification',          true],
            ].map(([item, done]) => (
              <div key={String(item)} style={{ display: 'flex', alignItems: 'center', gap: '.75rem', padding: '.375rem 0', fontSize: '.8125rem', borderBottom: '1px solid #f8fafc' }}>
                <span style={{ color: done ? '#16a34a' : '#cbd5e1', fontWeight: 800, fontSize: '1rem' }}>{done ? '✓' : '○'}</span>
                <span style={{ color: done ? '#1e293b' : '#94a3b8' }}>{String(item)}</span>
                {!done && <span className="badge badge-yellow" style={{ marginLeft: 'auto', fontSize: '.65rem' }}>Missing</span>}
              </div>
            ))}
            <div style={{ marginTop: '.875rem' }}>
              <ProgressBar value={60} color="#2563eb" />
              <div style={{ fontSize: '.73rem', color: '#64748b', marginTop: '.375rem' }}>3 of 5 documents verified</div>
            </div>
          </div>

          {/* Policyholder card */}
          <div className="card p-4">
            <h4 style={{ fontWeight: 700, fontSize: '.875rem', marginBottom: '.875rem' }}>Policyholder</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem', fontSize: '.8125rem', color: '#475569' }}>
              <div>👤 <strong>{claim.policyholder}</strong></div>
              <div>📧 {claim.policyholderEmail || 'N/A'}</div>
              <div>📱 {claim.policyholderPhone || 'N/A'}</div>
              <div>📄 <span className="mono">{claim.policyId}</span></div>
            </div>
          </div>

          {/* Payments info if exists */}
          {claim.payments && claim.payments.length > 0 && (
            <div className="card p-4 mt-4">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.875rem' }}>
                <h4 style={{ fontWeight: 700, fontSize: '.875rem' }}>Payment History</h4>
                <div style={{ fontSize: '.75rem', fontWeight: 600, color: '#16a34a' }}>
                  Paid: {formatCurrency(claim.paidAmount || 0)} / {formatCurrency(claim.approvedAmount || 0)}
                </div>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {claim.payments.map((payment, idx) => (
                  <div key={payment.id || idx} style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1rem' }}>
                    <InfoGrid cols={2} items={[
                      { label: 'Amount',  value: formatCurrency(payment.amount) },
                      { label: 'Status',  value: <StatusBadge status={payment.status} /> },
                      { label: 'Method',  value: payment.method || payment.paymentMethod },
                      { label: 'Account', value: <span className="mono">{payment.accountDetails}</span> },
                    ]} />
                    {payment.transactionReference && (
                      <div style={{ marginTop: '.75rem', fontSize: '.78rem', color: '#64748b' }}>
                        Ref: <span className="mono">{payment.transactionReference}</span>
                      </div>
                    )}
                    {payment.status === 'FAILED' && (
                      <div style={{ marginTop: '.5rem', fontSize: '.78rem', color: '#ef4444' }}>
                        Reason: {payment.failureReason || 'Unknown error'}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <DecisionModal isOpen={decisionOpen} onClose={() => setDecisionOpen(false)} claim={claim} refreshClaim={() => {
        if (setSelectedClaim && claim) {
          claimsApi.get(claim.id).then(r => setSelectedClaim(r.data.data)).catch(console.error);
        }
      }} />
      <PaymentModal  isOpen={paymentOpen}  onClose={() => setPaymentOpen(false)}  claim={claim} />
      <AppealModal   isOpen={appealOpen}   onClose={() => setAppealOpen(false)}   claim={claim} setSelectedClaim={setSelectedClaim} />
      <ReassignModal isOpen={reassignOpen} onClose={() => setReassignOpen(false)} claim={claim} setSelectedClaim={setSelectedClaim} />
      
      {/* Triage Modal */}
      <Modal isOpen={triageOpen} onClose={() => setTriageOpen(false)} title="🚦 Triage Claim" width={500} footer={null}>
        <form onSubmit={async (e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          try {
            await claimsApi.triage(claim.id, {
              priority: fd.get('priority'),
              queue: fd.get('queue'),
              adjusterId: fd.get('adjusterId') ? Number(fd.get('adjusterId')) : null,
              notes: fd.get('notes')
            });
            toast('Claim triaged successfully', 'success');
            setTriageOpen(false);
            if (setSelectedClaim) {
              claimsApi.get(claim.id).then(r => setSelectedClaim(r.data.data)).catch(console.error);
            }
          } catch (err: any) {
            toast(err.response?.data?.message || 'Failed to triage', 'error');
          }
        }}>
          <div className="form-group">
            <label className="form-label">Priority</label>
            <select name="priority" className="form-control" defaultValue={claim.priority}>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Queue / Department</label>
            <select name="queue" className="form-control" defaultValue="General">
              <option value="General">General Auto</option>
              <option value="Complex">Complex Claims</option>
              <option value="Fraud">Special Investigation Unit</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Assign Adjuster (Optional)</label>
            <select name="adjusterId" className="form-control">
              <option value="">-- Auto-assign or Leave Unassigned --</option>
              <option value="2">Alice Adjuster</option>
              <option value="5">Jane Smith</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Triage Notes (Internal)</label>
            <textarea name="notes" className="form-control" rows={3} placeholder="Initial assessment notes..."></textarea>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setTriageOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary">Submit Triage</button>
          </div>
        </form>
      </Modal>

      {/* Reopen Modal */}
      <Modal isOpen={reopenOpen} onClose={() => setReopenOpen(false)} title="🔄 Reopen Claim" width={500} footer={null}>
        <form onSubmit={async (e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          try {
            await claimsApi.transition(claim.id, {
              targetStatus: 'ASSESSMENT',
              reason: fd.get('reason'),
              internalOnly: true
            });
            toast('Claim reopened back to Assessment', 'success');
            setReopenOpen(false);
            if (setSelectedClaim) {
              claimsApi.get(claim.id).then(r => setSelectedClaim(r.data.data)).catch(console.error);
            }
          } catch (err: any) {
            toast(err.response?.data?.message || 'Failed to reopen', 'error');
          }
        }}>
          <div className="form-group">
            <label className="form-label">Reason for Reopening</label>
            <textarea name="reason" className="form-control" rows={4} placeholder="Why is this claim being reopened?" required></textarea>
          </div>
          <Alert variant="warning" title="Warning">
            Reopening this claim will send it back to the Assessment stage. This action will be recorded in the audit trail.
          </Alert>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setReopenOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-warning">Reopen Claim</button>
          </div>
        </form>
      </Modal>

    </div>
  );
}
