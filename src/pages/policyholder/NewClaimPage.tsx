import { useState, useEffect } from 'react';
import type { ClaimWizardForm, ClaimType } from '@/types';
import { policiesApi, claimsApi, documentsApi, api } from '@/services/api';
import { SectionHeader, ProgressBar, Alert, StatusBadge } from '@/components/shared';
import { useToast } from '@/context/ToastContext';
import { useUpload } from '@/hooks';
import { formatCurrency, formatFileSize, getFileIcon } from '@/utils/helpers';

// ─── Step components ──────────────────────────────────────────────────────────

function StepIncident({ form, setForm }: { form: ClaimWizardForm; setForm: (f: Partial<ClaimWizardForm>) => void }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
      <div className="form-group">
        <label className="form-label">Incident Date *</label>
        <input className="form-control" type="date" value={form.incidentDate}
          max={new Date().toISOString().split('T')[0]}
          onChange={(e) => setForm({ incidentDate: e.target.value })} />
      </div>
      <div className="form-group">
        <label className="form-label">Incident Type *</label>
        <select className="form-control" value={form.incidentType} onChange={(e) => setForm({ incidentType: e.target.value })}>
          <option value="">Select type…</option>
          <option>Accident</option><option>Theft</option><option>Natural Disaster</option>
          <option>Fire</option><option>Vandalism</option><option>Medical Emergency</option><option>Other</option>
        </select>
      </div>
      <div className="form-group" style={{ gridColumn: 'span 2' }}>
        <label className="form-label">Incident Location *</label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem', marginBottom: '1rem' }}>
          <input className="form-control" placeholder="House/Flat No." value={form.houseNo} onChange={(e) => setForm({ houseNo: e.target.value })} />
          <input className="form-control" placeholder="Street/Locality" value={form.street} onChange={(e) => setForm({ street: e.target.value })} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
          <input className="form-control" placeholder="City" value={form.city} onChange={(e) => setForm({ city: e.target.value })} />
          <input className="form-control" placeholder="State" value={form.state} onChange={(e) => setForm({ state: e.target.value })} />
          <input className="form-control" placeholder="PIN Code" value={form.pinCode} onChange={(e) => setForm({ pinCode: e.target.value })} />
        </div>
      </div>
      <div className="form-group" style={{ gridColumn: 'span 2' }}>
        <label className="form-label">Description *</label>
        <textarea className="form-control" rows={4} style={{ resize: 'none' }}
          placeholder="Describe what happened in detail — circumstances, parties involved, injuries or damage…"
          value={form.description} onChange={(e) => setForm({ description: e.target.value })} />
      </div>
    </div>
  );
}

function StepPolicy({ form, setForm }: { form: ClaimWizardForm; setForm: (f: Partial<ClaimWizardForm>) => void }) {
  const [policies, setPolicies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPolicies() {
      try {
        const res = await policiesApi.list();
        const content = res.data?.data?.content || res.data?.data || [];
        setPolicies(content);
      } catch (err) {
        console.error('Failed to load policies', err);
      } finally {
        setLoading(false);
      }
    }
    loadPolicies();
  }, []);

  if (loading) return <div>Loading policies...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <p style={{ fontSize: '.875rem', color: '#64748b' }}>Select the policy this claim is filed against.</p>
      {policies.length === 0 && (
        <div style={{ padding: '2rem', textAlign: 'center', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
          <p style={{ color: '#475569', marginBottom: '.75rem', fontSize: '1.1rem', fontWeight: 600 }}>No active policies found</p>
          <p style={{ color: '#64748b', marginBottom: '1.5rem', fontSize: '.9375rem', maxWidth: 400, margin: '0 auto 1.5rem' }}>
            You cannot file a claim because you don't have any active insurance policies. Please purchase a policy or contact support.
          </p>
          <button className="btn btn-outline" onClick={() => window.location.href = '#'}>Contact Support</button>
        </div>
      )}
      {policies.map((p) => (
        <div
          key={p.id}
          className="card card-hover"
          style={{ padding: '1.125rem 1.25rem', cursor: 'pointer', border: form.policyId === (p.policyNumber || String(p.id)) ? '2px solid #2563eb' : '2px solid transparent', background: form.policyId === (p.policyNumber || String(p.id)) ? '#eff6ff' : undefined }}
          onClick={() => setForm({ policyId: p.policyNumber || String(p.id) })}
          role="radio" aria-checked={form.policyId === (p.policyNumber || String(p.id))}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem', marginBottom: '.375rem' }}>
                <span style={{ fontSize: '1.375rem' }}>
                  {p.policyType === 'AUTO' ? '🚗' : 
                   p.policyType === 'HEALTH' ? '🏥' : 
                   p.policyType === 'PROPERTY' ? '🏠' : 
                   p.policyType === 'LIFE' ? '👤' : '📄'}
                </span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '.9375rem' }}>
                    {p.policyType === 'AUTO' ? 'Auto Insurance' : 
                     p.policyType === 'HEALTH' ? 'Health Insurance' : 
                     p.policyType === 'PROPERTY' ? 'Property Insurance' : 
                     p.policyType === 'LIFE' ? 'Life Insurance' : p.policyType}
                  </div>
                  <div className="mono text-xs text-muted">{p.policyNumber || p.id}</div>
                </div>
              </div>
              {p.vehicleDetails && <div className="text-sm text-muted">🚗 {p.vehicleDetails}</div>}
              {p.propertyAddress && <div className="text-sm text-muted">🏠 {p.propertyAddress}</div>}
              {p.coveredMembers && <div className="text-sm text-muted">👥 {p.coveredMembers} members</div>}
            </div>
            <div style={{ textAlign: 'right' }}>
              <StatusBadge status={p.active ? 'Active' : 'Expired'} />
              <div className="text-sm mt-2"><span className="text-muted">Coverage: </span><span className="fw-600">{formatCurrency(p.coverageAmount || 0)}</span></div>
              <div className="text-xs text-muted">Renews {p.endDate}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

const CLAIM_TYPES: { type: ClaimType; icon: string; desc: string }[] = [
  { type: 'Auto',      icon: '🚗', desc: 'Vehicle damage, accidents, theft' },
  { type: 'Health',    icon: '🏥', desc: 'Medical expenses, hospitalization' },
  { type: 'Property',  icon: '🏠', desc: 'Home, office or rental property' },
  { type: 'Life',      icon: '👤', desc: 'Life insurance benefit claim' },
  { type: 'Liability', icon: '⚖️', desc: 'Third-party liability coverage' },
  { type: 'Travel',    icon: '✈️', desc: 'Trip cancellation, lost baggage' },
];

function StepClaimType({ form, setForm }: { form: ClaimWizardForm; setForm: (f: Partial<ClaimWizardForm>) => void }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '1rem' }}>
      {CLAIM_TYPES.map((ct) => (
        <div
          key={ct.type}
          className="card card-hover"
          style={{ padding: '1.375rem', cursor: 'pointer', textAlign: 'center', border: form.claimType === ct.type ? '2px solid #2563eb' : '2px solid transparent', background: form.claimType === ct.type ? '#eff6ff' : undefined }}
          onClick={() => setForm({ claimType: ct.type })}
        >
          <div style={{ fontSize: '2rem', marginBottom: '.625rem' }}>{ct.icon}</div>
          <div style={{ fontWeight: 700, fontSize: '.9375rem', marginBottom: '.3rem' }}>{ct.type}</div>
          <div style={{ fontSize: '.78rem', color: '#64748b', lineHeight: 1.5 }}>{ct.desc}</div>
        </div>
      ))}
    </div>
  );
}

function StepDamages({ form, setForm }: { form: ClaimWizardForm; setForm: (f: Partial<ClaimWizardForm>) => void }) {
  const currencySymbols: Record<string, string> = { USD: '$', EUR: '€', GBP: '£', CAD: 'C$', INR: '₹' };
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
      <div className="form-group" style={{ gridColumn: 'span 2' }}>
        <label className="form-label">Damage / Loss Description *</label>
        <textarea className="form-control" rows={4} style={{ resize: 'none' }}
          placeholder="Describe all damages, losses, or injuries in detail (Min 20 characters) ..."
          value={form.damages} onChange={(e) => setForm({ damages: e.target.value })} />
      </div>
      <div className="form-group">
        <label className="form-label">Estimated Amount *</label>
        <div className="relative">
          <span style={{ position: 'absolute', left: '.875rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontWeight: 600 }}>{currencySymbols[form.currency || 'USD']}</span>
          <input className="form-control" type="number" min={0} step={100} style={{ paddingLeft: '2.5rem' }}
            placeholder="0.00" value={form.estimatedAmount} onChange={(e) => setForm({ estimatedAmount: e.target.value })} />
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">Currency</label>
        <select className="form-control" value={form.currency} onChange={(e) => setForm({ currency: e.target.value })}>
          <option value="USD">USD</option><option value="EUR">EUR</option><option value="GBP">GBP</option><option value="CAD">CAD</option><option value="INR">INR</option>
        </select>
      </div>
      {form.estimatedAmount && Number(form.estimatedAmount) >= 10000 && (
        <div style={{ gridColumn: 'span 2' }}>
          <Alert variant="warning" title="High-Value Claim">
            Claims over $10,000 will require senior adjuster approval and may take additional processing time.
          </Alert>
        </div>
      )}
    </div>
  );
}

function StepDocuments({ form, setForm }: { form: ClaimWizardForm; setForm: (f: Partial<ClaimWizardForm>) => void }) {
  const toast = useToast();
  const { files, addFiles, removeFile, updateFile } = useUpload(form.files || []);
  const [drag, setDrag] = useState(false);

  useEffect(() => {
    setForm({ files });
  }, [files]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDrag(false);
    const result = addFiles(Array.from(e.dataTransfer.files));
    if (result.invalidType > 0) toast(`${result.invalidType} file(s) skipped — only PDF, JPG, PNG allowed`, 'warning');
    if (result.invalidSize > 0) toast(`${result.invalidSize} file(s) skipped — max 2MB per file`, 'warning');
  };
  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const result = addFiles(Array.from(e.target.files));
    if (result.invalidType > 0) toast(`${result.invalidType} file(s) skipped — only PDF, JPG, PNG allowed`, 'warning');
    if (result.invalidSize > 0) toast(`${result.invalidSize} file(s) skipped — max 2MB per file`, 'warning');
  };

  return (
    <div>
      <div
        className={`upload-zone ${drag ? 'is-drag' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={handleDrop}
        onClick={() => document.getElementById('wizardFileInput')?.click()}
      >
        <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📁</div>
        <div style={{ fontWeight: 700, fontSize: '1.0625rem', marginBottom: '.5rem', color: '#1e293b' }}>
          Drop files here or click to browse
        </div>
        <div style={{ fontSize: '.875rem', color: '#64748b' }}>Supports PDF, JPG, PNG · Max 2 MB per file</div>
        <input id="wizardFileInput" type="file" multiple accept=".pdf,.jpg,.jpeg,.png" style={{ display: 'none' }} onChange={handleInput} />
      </div>

      {files.length > 0 && (
        <div style={{ marginTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
          {files.map((f) => (
            <div key={f.id} className="card p-3" style={{ display: 'flex', alignItems: 'center', gap: '.875rem' }}>
              <span style={{ fontSize: '1.5rem' }}>{getFileIcon(f.mimeType)}</span>
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <div style={{ fontWeight: 600, fontSize: '.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</div>
                <div style={{ fontSize: '.73rem', color: '#94a3b8', marginTop: '.15rem' }}>{formatFileSize(f.size)}</div>
                <div style={{ marginTop: '.375rem' }}>
                  <ProgressBar value={f.progress} color={f.progress >= 100 ? '#22c55e' : '#2563eb'} />
                </div>
              </div>
              <div style={{ width: '150px' }}>
                <select 
                  className="form-control form-control-sm" 
                  value={f.category || ''} 
                  onChange={(e) => updateFile(f.id, { category: e.target.value })}
                  style={{ fontSize: '.8rem', padding: '.25rem .5rem' }}
                >
                  <option value="" disabled>Select Category</option>
                  <option value="ID Proof">ID Proof</option>
                  <option value="Policy Copy">Policy Copy</option>
                  <option value="FIR/Report">FIR/Report</option>
                  <option value="Bills">Bills</option>
                  <option value="Photos">Photos</option>
                  <option value="Medical Records">Medical Records</option>
                </select>
              </div>
              {f.progress >= 100
                ? <span style={{ color: '#22c55e', fontWeight: 800, fontSize: '1.125rem' }}>✓</span>
                : <span style={{ fontSize: '.78rem', color: '#64748b', fontWeight: 600 }}>{Math.round(f.progress)}%</span>
              }
              <button className="btn btn-ghost btn-icon-sm" style={{ color: '#ef4444' }} onClick={() => removeFile(f.id)}>✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StepReview({ form, setForm }: { form: ClaimWizardForm; setForm: (f: Partial<ClaimWizardForm>) => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.125rem' }}>
      <Alert variant="success" title="Ready to Submit">
        Review your claim details below. Once submitted, you'll receive a confirmation and claim ID.
      </Alert>
      <div className="card p-4">
        <div style={{ fontWeight: 700, fontSize: '.875rem', marginBottom: '1rem', color: '#0f172a' }}>Claim Summary</div>
        {[
          ['Incident Type',  form.incidentType  || '—'],
          ['Incident Date',  form.incidentDate   || '—'],
          ['Location',       [form.houseNo, form.street, form.city, form.state, form.pinCode].filter(Boolean).join(', ') || '—'],
          ['Policy',         form.policyId ? `${form.policyId}` : '—'],
          ['Claim Type',     form.claimType      || '—'],
          ['Est. Amount',    form.estimatedAmount ? formatCurrency(Number(form.estimatedAmount), form.currency || 'USD') : '—'],
          ['Documents',      `${form.files?.length ?? 0} file(s) attached`],
        ].map(([k, v]) => (
          <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '.5rem 0', borderBottom: '1px solid #f1f5f9', fontSize: '.875rem' }}>
            <span style={{ color: '#64748b', fontWeight: 500 }}>{k}</span>
            <span style={{ fontWeight: 600, color: '#0f172a', textAlign: 'right', maxWidth: '55%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v}</span>
          </div>
        ))}
      </div>
      <div className="form-group" style={{ marginTop: '0.5rem', background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
        <label style={{ display: 'flex', alignItems: 'flex-start', gap: '.75rem', cursor: 'pointer' }}>
          <input 
            type="checkbox" 
            style={{ marginTop: '.25rem', width: '1.25rem', height: '1.25rem' }} 
            checked={form.declarationAccepted || false}
            onChange={(e) => setForm({ declarationAccepted: e.target.checked })} 
          />
          <span style={{ fontSize: '.875rem', color: '#334155', lineHeight: 1.5 }}>
            <strong>Digital Declaration:</strong> I hereby declare that the details furnished above are true and correct to the best of my knowledge and belief. I understand that false or misleading information may lead to the rejection of this claim and possible legal action.
          </span>
        </label>
      </div>
    </div>
  );
}

// ─── Wizard ───────────────────────────────────────────────────────────────────

interface NewClaimPageProps { 
  setActive: (id: string) => void;
  existingDraft?: any;
}

const STEP_LABELS = ['Incident', 'Policy', 'Claim Type', 'Damages', 'Documents', 'Review'];

const EMPTY_FORM: ClaimWizardForm = {
  incidentDate: '', incidentType: '', description: '', houseNo: '', street: '', city: '', state: '', pinCode: '',
  policyId: '', claimType: '', damages: '', estimatedAmount: '', currency: 'USD', files: [], declarationAccepted: false
};

function validateStep(step: number, form: ClaimWizardForm): string | null {
  if (step === 0) {
    if (!form.incidentDate) return 'Please enter the incident date.';
    if (!form.incidentType) return 'Please select an incident type.';
    if (!form.houseNo || !form.street || !form.city || !form.state || !form.pinCode) return 'Please complete the structured location fields.';
    if (!form.description.trim()) return 'Please describe the incident.';
  }
  if (step === 1 && !form.policyId) return 'Please select a policy.';
  if (step === 2 && !form.claimType) return 'Please select a claim type.';
  if (step === 3) {
    if (!form.damages.trim()) return 'Please describe the damages.';
    if (!form.estimatedAmount || Number(form.estimatedAmount) <= 0) return 'Please enter a valid estimated amount.';
  }
  if (step === 4) {
    if (form.files?.some(f => !f.category)) return 'Please select a category for all uploaded documents.';
  }
  return null;
}

export default function NewClaimPage({ setActive, existingDraft }: NewClaimPageProps) {
  const toast = useToast();
  const [step, setStep]   = useState(0);
  const [form, _setForm]  = useState<ClaimWizardForm>(EMPTY_FORM);
  const [saved, setSaved] = useState(false);
  const [draftClaimId, setDraftClaimId] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  const setForm = (f: Partial<ClaimWizardForm>) => _setForm((p) => ({ ...p, ...f }));

  useEffect(() => {
    if (existingDraft) {
      setDraftClaimId(String(existingDraft.id));
      const parts = (existingDraft.incidentLocation || '').split(', ');
      
      _setForm({
        ...EMPTY_FORM,
        incidentDate: existingDraft.incidentDate || '',
        incidentType: existingDraft.incidentType || '',
        description: existingDraft.description || '',
        houseNo: parts[0] || '',
        street: parts[1] || '',
        city: parts[2] || '',
        state: parts[3] || '',
        pinCode: parts[4] || '',
        policyId: existingDraft.policyId || '',
        claimType: existingDraft.type || '',
        damages: existingDraft.description || '',
        estimatedAmount: existingDraft.amount || '',
      });
    }
  }, [existingDraft]);

  const handleNext = async () => {
    const err = validateStep(step, form);
    if (err) { toast(err, 'error'); return; }
    if (step < STEP_LABELS.length - 1) { setStep((s) => s + 1); }
    else {
      try {
        const fullLoc = [form.houseNo, form.street, form.city, form.state, form.pinCode].filter(Boolean).join(', ');
        const payload = {
          policyNumber: form.policyId,
          claimType: form.claimType ? form.claimType.toUpperCase() : 'AUTO',
          incidentDate: form.incidentDate,
          incidentType: form.incidentType || 'Other',
          incidentLocation: fullLoc,
          description: form.damages || form.description,
          claimedAmount: form.estimatedAmount || '0',
          isDraft: false,
        };
        
        let newClaim;
        if (draftClaimId) {
           await claimsApi.update(draftClaimId, payload);
           // MUST DO THIS instead of changeStatus which doesn't exist on backend
           const submitRes = await api.patch(`/claims/${draftClaimId}/submit`);
           newClaim = submitRes.data?.data;
        } else {
           const res = await claimsApi.create(payload);
           newClaim = res.data?.data;
        }
        const claimId = newClaim?.id || draftClaimId;
        
        if (claimId && form.files && form.files.length > 0) {
           for (const f of form.files) {
             if (f.file) {
               await documentsApi.upload(String(claimId), f.file, f.category);
             }
           }
        }

        toast(`🎉 Claim submitted successfully! Reference Number: ${newClaim?.referenceNumber || claimId}`, 'success');
        setActive('claims');
      } catch (err: any) {
        console.error(err);
        let errMsg = 'Failed to submit claim';
        if (err.response?.data?.errors) {
          const firstError = Object.values(err.response.data.errors)[0];
          if (firstError) errMsg = String(firstError);
        } else if (err.response?.data?.message) {
          errMsg = err.response.data.message;
        }
        toast(errMsg, 'error');
      }
    }
  };

  const handleBack  = () => step === 0 ? setActive('claims') : setStep((s) => s - 1);

  const handleSaveDraft = async (isAuto = false) => {
    const isFormEmpty = Object.keys(form).every(k => k === 'currency' || !form[k as keyof ClaimWizardForm] || (Array.isArray(form[k as keyof ClaimWizardForm]) && (form[k as keyof ClaimWizardForm] as any[]).length === 0));
    if (isFormEmpty || !form.policyId) {
      if (!isAuto) toast('Please select a policy before saving a draft', 'warning');
      return;
    }

    try {
      const fullLoc = [form.houseNo, form.street, form.city, form.state, form.pinCode].filter(Boolean).join(', ');
      const payload = {
        policyNumber: form.policyId,
        claimType: form.claimType ? form.claimType.toUpperCase() : 'AUTO',
        incidentDate: form.incidentDate,
        incidentType: form.incidentType || 'Other',
        incidentLocation: fullLoc,
        description: form.damages || form.description || 'Draft',
        claimedAmount: form.estimatedAmount || 0,
        saveDraft: true,
      };
      
      if (draftClaimId) {
        await claimsApi.update(draftClaimId, payload);
      } else {
        const res = await claimsApi.create(payload);
        if (res.data?.data?.id) {
          setDraftClaimId(String(res.data.data.id));
        }
      }
      setSaved(true);
      setLastSavedAt(new Date());
      if (isAuto) {
        toast('💾 Progress saved as draft due to inactivity.', 'success');
      } else {
        toast('💾 Draft saved successfully!', 'success');
      }
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      console.error('Failed to save draft', err);
      if (!isAuto) toast('Failed to save draft', 'error');
    }
  };

  // Auto-save effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      handleSaveDraft(true);
    }, 45000); // Wait 45 seconds of inactivity before saving

    return () => clearTimeout(timeoutId);
  }, [form]);

  const completedPct = Math.round((step / (STEP_LABELS.length - 1)) * 100);

  return (
    <div>
      <SectionHeader
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span>File a New Claim</span>
            {lastSavedAt && (
              <span style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: 'normal' }}>
                {saved ? 'Saving...' : `(Last saved at ${lastSavedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`}
              </span>
            )}
          </div>
        }
        subtitle={`Step ${step + 1} of ${STEP_LABELS.length} — ${STEP_LABELS[step]}`}
        actions={
          <>
            {saved && <span className="badge badge-green">✓ Draft Saved</span>}
          </>
        }
      />

      {/* Overall progress */}
      <div className="card p-4 mb-5">
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '.625rem' }}>
          <span style={{ fontSize: '.8125rem', fontWeight: 600, color: '#475569' }}>Claim Progress</span>
          <span style={{ fontSize: '.8125rem', fontWeight: 700, color: '#2563eb' }}>{completedPct}% complete</span>
        </div>
        <ProgressBar value={completedPct} height={8} />

        {/* Step indicators */}
        <div className="steps" style={{ marginTop: '1.5rem', marginBottom: 0 }}>
          {STEP_LABELS.map((label, i) => (
            <div key={label} className={`step-item ${i < step ? 'completed' : i === step ? 'active' : ''}`}>
              <div className="step-content">
                <div className="step-circle">{i < step ? '✓' : i + 1}</div>
                <div className="step-label">{label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Step content */}
      <div className="card p-6 mb-5">
        {step === 0 && <StepIncident    form={form} setForm={setForm} />}
        {step === 1 && <StepPolicy      form={form} setForm={setForm} />}
        {step === 2 && <StepClaimType   form={form} setForm={setForm} />}
        {step === 3 && <StepDamages     form={form} setForm={setForm} />}
        {step === 4 && <StepDocuments   form={form} setForm={setForm} />}
        {step === 5 && <StepReview      form={form} setForm={setForm} />}
      </div>

      {/* Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button className="btn btn-secondary" onClick={handleBack}>
          {step === 0 ? '✕ Cancel' : '← Back'}
        </button>
        <div style={{ display: 'flex', gap: '.75rem', alignItems: 'center' }}>
          <span style={{ fontSize: '.8125rem', color: '#94a3b8' }}>Step {step + 1} / {STEP_LABELS.length}</span>
          {step < STEP_LABELS.length - 1 && (
            <button className="btn btn-secondary" onClick={() => handleSaveDraft(false)}>
              💾 Save Draft
            </button>
          )}
          <button className="btn btn-primary btn-lg" onClick={handleNext} disabled={step === 5 && !form.declarationAccepted}>
            {step === STEP_LABELS.length - 1 ? '🚀 Submit Claim' : `Continue: ${STEP_LABELS[step + 1]} →`}
          </button>
        </div>
      </div>
    </div>
  );
}
