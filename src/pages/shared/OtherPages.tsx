// ─── PoliciesPage ─────────────────────────────────────────────────────────────
import type { UserRole, NewUserForm, PasswordPolicy, WorkflowRule, NotificationTemplate } from '@/types';
import { CLAIM_VOLUME_DATA, DEFAULT_PASSWORD_POLICY, DEFAULT_WORKFLOW_RULE, DEFAULT_NOTIFICATION_TEMPLATES } from '@/data/mockData';
import { SectionHeader, StatusBadge, Modal, Avatar, Tabs } from '@/components/shared';
import { useToast } from '@/context/ToastContext';
import { formatCurrency } from '@/utils/helpers';
import { useDisclosure } from '@/hooks';
import { useState, useEffect, useRef } from 'react';
import { policiesApi, claimsApi, documentsApi, reportsApi, usersApi, api, auditApi } from '@/services/api';

export function PoliciesPage({ role, setActive, selectedClaim }: { role: UserRole, setActive?: (page: string) => void, selectedClaim?: any }) {
  const toast = useToast();
  const [basePolicies, setBasePolicies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPolicy, setSelectedPolicy] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const newPolicyModal = useDisclosure();
  const [policyholders, setPolicyholders] = useState<any[]>([]);
  const [isSubmittingPolicy, setIsSubmittingPolicy] = useState(false);
  const [newPolicyForm, setNewPolicyForm] = useState({
    policyholderId: '',
    policyType: 'AUTO',
    coverageAmount: '',
    annualPremium: '',
    deductible: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
    vehicleDetails: '',
    propertyAddress: '',
  });

  const fetchPolicies = async () => {
    // Underwriter constraint: requires selectedClaim to fetch policies
    if (role === 'Underwriter' && !selectedClaim) {
      setBasePolicies([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const params = role === 'Underwriter' && selectedClaim ? { holderId: String(selectedClaim.policyholderId) } : undefined;
      const res = await policiesApi.list(params);
      const content = res.data?.data?.content || res.data?.data || [];
      
      let mapped = content.map((backendPolicy: any) => ({
        id: backendPolicy.policyNumber || String(backendPolicy.id),
        type: backendPolicy.policyType,
        status: backendPolicy.active ? 'Active' : (backendPolicy.expired ? 'Expired' : 'Suspended'),
        holderId: 0,
        holder: backendPolicy.policyholderName,
        premium: backendPolicy.annualPremium || 0,
        coverage: backendPolicy.coverageAmount || 0,
        startDate: backendPolicy.startDate,
        renewalDate: backendPolicy.endDate,
        vehicle: backendPolicy.vehicleDetails,
        address: backendPolicy.propertyAddress,
        members: backendPolicy.coveredMembers,
        riskScore: backendPolicy.riskScore, 
      }));
      setBasePolicies(mapped);
    } catch (err) {
      console.error('Failed to load policies', err);
      setBasePolicies([]);
      toast('Failed to load policies', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPolicies();
  }, [role, selectedClaim, toast]);

  useEffect(() => {
    async function loadPolicyholders() {
      if (role === 'Admin') {
        try {
          const res = await usersApi.list();
          const content = res.data?.data?.content || res.data?.data || [];
          setPolicyholders(content.filter((u: any) => u.role === 'Policyholder'));
        } catch (e) {
          console.error('Failed to load policyholders', e);
        }
      }
    }
    loadPolicyholders();
  }, [role]);

  const handleCreatePolicy = async () => {
    if (!newPolicyForm.policyholderId) return toast('Please select a policyholder', 'error');
    setIsSubmittingPolicy(true);
    try {
      await policiesApi.create({
        ...newPolicyForm,
        coverageAmount: Number(newPolicyForm.coverageAmount),
        annualPremium: Number(newPolicyForm.annualPremium),
        deductible: Number(newPolicyForm.deductible),
      });
      toast('Policy created successfully', 'success');
      newPolicyModal.close();
      setNewPolicyForm({
        ...newPolicyForm,
        policyholderId: '',
        coverageAmount: '',
        annualPremium: '',
        deductible: '',
        vehicleDetails: '',
        propertyAddress: '',
      });
      fetchPolicies();
    } catch (e) {
      console.error(e);
      toast('Failed to create policy', 'error');
    } finally {
      setIsSubmittingPolicy(false);
    }
  };

  const isUw = role === 'Underwriter';

  if (isUw && !selectedClaim) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
        <h3>No Policyholder Selected</h3>
        <p>Please select a claim from the Validation Queue to view the policyholder's policies.</p>
        <button className="btn btn-primary mt-4" onClick={() => setActive && setActive('underwriter_claims')}>Go to Validation Queue</button>
      </div>
    );
  }

  return (
    <div>
      <SectionHeader
        title={isUw ? 'Policy Verification' : role === 'Policyholder' ? 'My Policies' : 'Policy Management'}
        subtitle={isUw ? `Showing policies for policyholder: ${selectedClaim?.policyholder}` : loading ? 'Loading policies...' : `${basePolicies.length} policies`}
        actions={
          role === 'Admin'
            ? <button className="btn btn-primary" onClick={newPolicyModal.open}>➕ New Policy</button>
            : undefined
        }
      />
      <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem' }}>
        <input 
          type="text" 
          placeholder="Search by Policy ID, Type, or Holder Name..." 
          className="form-control" 
          style={{ maxWidth: '400px' }}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>
      {basePolicies.length === 0 && !loading && (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b', background: '#f8fafc', borderRadius: '8px' }}>
          No policies available for this policyholder
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
        {basePolicies.filter(p => 
          p.id.toLowerCase().includes(searchQuery.toLowerCase()) || 
          p.type.toLowerCase().includes(searchQuery.toLowerCase()) || 
          (p.holder && p.holder.toLowerCase().includes(searchQuery.toLowerCase()))
        ).map((p) => {
          const isLinked = isUw && selectedClaim?.policyId === p.id;
          const statusColor = p.status === 'Expired' ? '#ef4444' : p.status === 'Active' ? '#22c55e' : '#f59e0b';
          
          return (
            <div key={p.id} className="card card-hover p-5" style={isLinked ? { border: '2px solid #3b82f6' } : {}}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div>
                  <div style={{ fontSize: '2rem', marginBottom: '.5rem' }}>
                    {p.type.includes('Auto') ? '🚗' : p.type.includes('Health') ? '🏥' : '🏠'}
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '1rem' }}>{p.type}</div>
                  <div className="mono text-sm text-muted mt-1">{p.id}</div>
                  {isLinked && <span className="badge badge-blue mt-2" style={{ fontSize: '0.65rem' }}>Linked to current claim</span>}
                </div>
                <span className="badge" style={{ backgroundColor: `${statusColor}15`, color: statusColor }}>{p.status}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.75rem', marginBottom: '1.125rem' }}>
                {[
                  ['Annual Premium', formatCurrency(p.premium)],
                  ['Coverage',       formatCurrency(p.coverage)],
                  ['Renewal Date',   p.renewalDate],
                  ['Details',        p.vehicle ?? (p.members ? `${p.members} members` : p.address?.split(',')[0] ?? '—')],
                ].map(([l, v]) => (
                  <div key={l}>
                    <div style={{ fontSize: '.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: '.2rem' }}>{l}</div>
                    <div style={{ fontSize: '.875rem', fontWeight: 600, color: '#1e293b' }}>{v}</div>
                  </div>
                ))}
              </div>
              {p.riskScore !== undefined && (
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.78rem', marginBottom: '.3rem' }}>
                    <span style={{ color: '#64748b', fontWeight: 500 }}>Risk Score</span>
                    <span style={{ fontWeight: 700, color: p.riskScore > 70 ? '#dc2626' : p.riskScore > 50 ? '#a16207' : '#15803d' }}>{p.riskScore}/100</span>
                  </div>
                  <div style={{ height: 5, background: '#f1f5f9', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${p.riskScore}%`, background: p.riskScore > 70 ? '#ef4444' : p.riskScore > 50 ? '#f59e0b' : '#22c55e', borderRadius: 99 }} />
                  </div>
                </div>
              )}
              <div style={{ display: 'flex', gap: '.625rem' }}>
                <button className="btn btn-outline btn-sm" style={{ flex: 1 }} onClick={() => setSelectedPolicy(p)}>
                  {isUw ? 'View Coverage' : 'View Details'}
                </button>
                {role === 'Policyholder' && (
                  <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={() => setActive ? setActive('newclaim') : toast('Redirecting to claim wizard…', 'info')}>File Claim</button>
                )}
                {isUw && isLinked && (
                  <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={() => setActive && setActive('underwriter_claimdetail')}>View Claim</button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <Modal isOpen={!!selectedPolicy} onClose={() => setSelectedPolicy(null)} title="Policy Details" width={600}>
        {selectedPolicy && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', paddingBottom: '1rem', borderBottom: '1px solid #f1f5f9' }}>
              <div style={{ fontSize: '2.5rem' }}>
                {selectedPolicy.type.includes('Auto') ? '🚗' : selectedPolicy.type.includes('Health') ? '🏥' : selectedPolicy.type.includes('Property') ? '🏠' : '👤'}
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>{selectedPolicy.type}</h3>
                <div className="text-muted mono">{selectedPolicy.id}</div>
              </div>
              <div style={{ marginLeft: 'auto' }}>
                <StatusBadge status={selectedPolicy.status} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <div className="text-xs text-muted fw-600 mb-1 text-upper">Holder Name</div>
                <div>{selectedPolicy.holder || 'N/A'}</div>
              </div>
              <div>
                <div className="text-xs text-muted fw-600 mb-1 text-upper">Coverage Amount</div>
                <div className="fw-700 text-primary">{formatCurrency(selectedPolicy.coverage)}</div>
              </div>
              <div>
                <div className="text-xs text-muted fw-600 mb-1 text-upper">Annual Premium</div>
                <div className="fw-700">{formatCurrency(selectedPolicy.premium)}</div>
              </div>
              <div>
                <div className="text-xs text-muted fw-600 mb-1 text-upper">Effective Dates</div>
                <div>{selectedPolicy.startDate} to {selectedPolicy.renewalDate}</div>
              </div>
            </div>

            <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px' }}>
              <h4 style={{ margin: '0 0 .5rem 0', fontSize: '.875rem' }}>Specific Details</h4>
              {selectedPolicy.vehicle && <div>🚗 <b>Vehicle:</b> {selectedPolicy.vehicle}</div>}
              {selectedPolicy.address && <div>🏠 <b>Property:</b> {selectedPolicy.address}</div>}
              {selectedPolicy.members && <div>👥 <b>Covered Members:</b> {selectedPolicy.members}</div>}
              {!selectedPolicy.vehicle && !selectedPolicy.address && !selectedPolicy.members && (
                <div className="text-muted text-sm">No specific details available for this policy.</div>
              )}
            </div>

            {role !== 'Policyholder' && (
              <div style={{ marginTop: '1rem' }}>
                <button className="btn btn-primary w-full" onClick={() => {
                  toast('Policy modification functionality is not yet available in the demo UI.', 'warning');
                  setSelectedPolicy(null);
                }}>Modify Policy Details</button>
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal isOpen={newPolicyModal.isOpen} onClose={newPolicyModal.close} title="➕ Create New Policy" width={600}
        footer={<><button className="btn btn-secondary" onClick={newPolicyModal.close}>Cancel</button><button className="btn btn-primary" onClick={handleCreatePolicy} disabled={isSubmittingPolicy}>{isSubmittingPolicy ? 'Creating...' : 'Create Policy'}</button></>}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="form-label">Policyholder *</label>
            <select className="form-control" value={newPolicyForm.policyholderId} onChange={e => setNewPolicyForm(p => ({ ...p, policyholderId: e.target.value }))}>
              <option value="">-- Select Policyholder --</option>
              {policyholders.map(u => (
                <option key={u.id} value={u.id}>{u.fullName || u.name} ({u.email})</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Policy Type *</label>
            <select className="form-control" value={newPolicyForm.policyType} onChange={e => setNewPolicyForm(p => ({ ...p, policyType: e.target.value }))}>
              <option value="AUTO">Auto</option>
              <option value="HOME">Home</option>
              <option value="HEALTH">Health</option>
              <option value="PROPERTY">Property</option>
            </select>
          </div>
          <div className="form-group"><label className="form-label">Coverage Amount *</label><input className="form-control" type="number" placeholder="50000" value={newPolicyForm.coverageAmount} onChange={e => setNewPolicyForm(p => ({ ...p, coverageAmount: e.target.value }))} /></div>
          <div className="form-group"><label className="form-label">Annual Premium *</label><input className="form-control" type="number" placeholder="1200" value={newPolicyForm.annualPremium} onChange={e => setNewPolicyForm(p => ({ ...p, annualPremium: e.target.value }))} /></div>
          <div className="form-group"><label className="form-label">Deductible *</label><input className="form-control" type="number" placeholder="500" value={newPolicyForm.deductible} onChange={e => setNewPolicyForm(p => ({ ...p, deductible: e.target.value }))} /></div>
          <div className="form-group"><label className="form-label">Start Date *</label><input className="form-control" type="date" value={newPolicyForm.startDate} onChange={e => setNewPolicyForm(p => ({ ...p, startDate: e.target.value }))} /></div>
          <div className="form-group"><label className="form-label">End Date *</label><input className="form-control" type="date" value={newPolicyForm.endDate} onChange={e => setNewPolicyForm(p => ({ ...p, endDate: e.target.value }))} /></div>
          {newPolicyForm.policyType === 'AUTO' && (
            <div className="form-group" style={{ gridColumn: '1 / -1' }}><label className="form-label">Vehicle Details</label><input className="form-control" placeholder="2022 Toyota Camry" value={newPolicyForm.vehicleDetails} onChange={e => setNewPolicyForm(p => ({ ...p, vehicleDetails: e.target.value }))} /></div>
          )}
          {(newPolicyForm.policyType === 'HOME' || newPolicyForm.policyType === 'PROPERTY') && (
            <div className="form-group" style={{ gridColumn: '1 / -1' }}><label className="form-label">Property Address</label><input className="form-control" placeholder="123 Main St, City" value={newPolicyForm.propertyAddress} onChange={e => setNewPolicyForm(p => ({ ...p, propertyAddress: e.target.value }))} /></div>
          )}
        </div>
      </Modal>
    </div>
  );
}

// ─── DocumentsPage ────────────────────────────────────────────────────────────

export function DocumentsPage() {
  const toast = useToast();
  const [claims, setClaims] = useState<any[]>([]);
  const [selectedClaimId, setSelectedClaimId] = useState<string>('All');
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Upload & Drag-and-Drop State
  const [isDragging, setIsDragging] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadCategory, setUploadCategory] = useState('Evidence');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const uploadModal = useDisclosure();

  // Replace Flow State
  const [documentToReplace, setDocumentToReplace] = useState<string | null>(null);
  const replaceFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function loadInitialData() {
      try {
        const cRes = await claimsApi.list();
        const cData = cRes.data?.data?.content || cRes.data?.data || [];
        setClaims(cData);
      } catch (err) {
        console.error('Failed to load claims for docs page');
      }
    }
    loadInitialData();
  }, []);

  useEffect(() => {
    async function loadDocs() {
      if (selectedClaimId === 'All') {
        setDocs([]);
        return;
      }
      setLoading(true);
      try {
        const selectedClaim = claims.find(c => (c.referenceNumber || String(c.id)) === selectedClaimId);
        if (!selectedClaim) return;
        const res = await documentsApi.list(selectedClaim.id);
        const data = res.data?.data || [];
        const mapped = data.map((d: any) => ({
          id: String(d.id),
          name: d.originalFileName || d.fileName,
          size: d.fileSizeBytes || d.fileSize || 0,
          mimeType: d.contentType || d.fileType || 'application/pdf',
          status: d.status,
          version: d.version || 1,
          category: d.category || 'Uncategorized',
          uploadedBy: d.uploadedByName || 'System',
          uploadedAt: d.uploadedAt,
          claimId: selectedClaimId,
        }));
        setDocs(mapped);
      } catch (err) {
        toast('Failed to load documents', 'error');
      } finally {
        setLoading(false);
      }
    }
    loadDocs();
  }, [selectedClaimId, claims, toast, refreshTrigger]);

  const handleDownload = async (id: string, name: string) => {
    try {
      const res = await documentsApi.download(id);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', name);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      toast(`Failed to download ${name}`, 'error');
    }
  };

  const handlePreview = async (id: string, mimeType: string) => {
    try {
      const res = await documentsApi.download(id);
      const url = window.URL.createObjectURL(new Blob([res.data], { type: mimeType }));
      window.open(url, '_blank');
    } catch (err) {
      toast('Failed to preview document', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await documentsApi.delete(id);
      toast('Document deleted', 'success');
      setRefreshTrigger(prev => prev + 1);
    } catch (err) {
      toast('Failed to delete document', 'error');
    }
  };

  // Drag and Drop Handlers
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (selectedClaimId === 'All') {
      toast('Please select a claim first', 'warning');
      return;
    }
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileSelection(file);
  };
  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelection(file);
    e.target.value = '';
  };

  const handleFileSelection = (file: File) => {
    if (file.size > 2 * 1024 * 1024) {
      toast('File exceeds the maximum limit of 2 MB', 'error');
      return;
    }
    setUploadFile(file);
    setUploadProgress(0);
    uploadModal.open();
  };

  const submitUpload = async () => {
    if (!uploadFile) return;
    const selectedClaim = claims.find(c => (c.referenceNumber || String(c.id)) === selectedClaimId);
    if (!selectedClaim) return;

    setIsUploading(true);
    try {
      await documentsApi.upload(selectedClaim.id, uploadFile, uploadCategory, false, (progressEvent) => {
        if (progressEvent.total) {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percentCompleted);
        }
      });
      toast('Document uploaded successfully', 'success');
      setRefreshTrigger(prev => prev + 1);
      uploadModal.close();
    } catch (err: any) {
      toast(err.response?.data?.message || 'Failed to upload document', 'error');
    } finally {
      setIsUploading(false);
      setUploadFile(null);
      setUploadProgress(0);
    }
  };

  const initiateReplace = (docId: string) => {
    setDocumentToReplace(docId);
    if (replaceFileInputRef.current) replaceFileInputRef.current.click();
  };

  const handleReplaceFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !documentToReplace) return;

    if (file.size > 2 * 1024 * 1024) {
      toast('File exceeds the maximum limit of 2 MB', 'error');
      setDocumentToReplace(null);
      return;
    }

    try {
      toast('Replacing document...', 'info');
      await documentsApi.replace(documentToReplace, file);
      toast('Document replaced and versioned successfully', 'success');
      setRefreshTrigger(prev => prev + 1);
    } catch (err: any) {
      toast(err.response?.data?.message || 'Failed to replace document', 'error');
    } finally {
      setDocumentToReplace(null);
    }
  };

  const icons: Record<string, string> = { 'application/pdf': '📄', 'application/zip': '🗜️', 'image/jpeg': '🖼️', 'image/png': '🖼️' };
  const fmtSize = (b: number) => b < 1048576 ? `${(b/1024).toFixed(0)} KB` : `${(b/1048576).toFixed(1)} MB`;

  return (
    <div>
      <SectionHeader title="Document Center" subtitle={selectedClaimId === 'All' ? 'Select a claim to view its documents' : `${docs.length} documents for claim`}
        actions={<button className="btn btn-secondary" onClick={() => toast('Bulk download started', 'success')}>⬇️ Download All</button>} />
      
      <div className="card">
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <h3 style={{ fontWeight: 700, fontSize: '1rem' }}>{loading ? 'Loading...' : 'Documents'}</h3>
          <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center' }}>
            <select className="form-control" style={{ width: 'auto', fontSize: '.8125rem' }} value={selectedClaimId} onChange={(e) => setSelectedClaimId(e.target.value)}>
              <option value="All">Select a Claim</option>
              {claims.map(c => (
                 <option key={c.id} value={c.referenceNumber || String(c.id)}>
                   {c.referenceNumber || String(c.id)}
                 </option>
              ))}
            </select>
          </div>
        </div>

        {selectedClaimId !== 'All' && (
          <div 
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            style={{ 
              padding: '3rem 2rem', 
              margin: '1.5rem', 
              border: `2px dashed ${isDragging ? '#2563eb' : '#cbd5e1'}`, 
              borderRadius: '8px', 
              backgroundColor: isDragging ? '#eff6ff' : '#f8fafc',
              textAlign: 'center',
              transition: 'all 0.2s ease',
              cursor: 'pointer'
            }}
            onClick={() => document.getElementById('drag-drop-file-input')?.click()}
          >
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📥</div>
            <h4 style={{ margin: '0 0 .5rem 0', color: '#1e293b', fontWeight: 600 }}>Drag and drop files here</h4>
            <p style={{ margin: 0, color: '#64748b', fontSize: '.875rem' }}>or click to browse from your computer</p>
            <p style={{ margin: '.5rem 0 0 0', color: '#94a3b8', fontSize: '.75rem' }}>Supported formats: PDF, JPEG, PNG (Max 2MB)</p>
            <input id="drag-drop-file-input" type="file" style={{ display: 'none' }} onChange={handleFileInput} />
          </div>
        )}

        {/* Hidden input for Replace flow */}
        <input ref={replaceFileInputRef} type="file" style={{ display: 'none' }} onChange={handleReplaceFileInput} />

        <div className="overflow-x-auto">
          {selectedClaimId === 'All' ? (
             <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
               Please select a claim from the dropdown above to view its documents.
             </div>
          ) : docs.length === 0 ? (
             <div style={{ padding: '1rem 3rem 3rem', textAlign: 'center', color: '#64748b' }}>
               No documents found for this claim.
             </div>
          ) : (
          <table>
            <thead><tr><th>Document</th><th>Category</th><th>Size</th><th>Version</th><th>Uploaded By</th><th>Date</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {docs.map((d) => (
                <tr key={d.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem' }}>
                      <span style={{ fontSize: '1.375rem' }}>{icons[d.mimeType] ?? '📁'}</span>
                      <span style={{ fontWeight: 600, fontSize: '.875rem', wordBreak: 'break-all' }}>{d.name}</span>
                    </div>
                  </td>
                  <td><span className="badge badge-gray">{d.category}</span></td>
                  <td className="text-sm text-muted">{fmtSize(d.size)}</td>
                  <td><span className="badge badge-blue">v{d.version}</span></td>
                  <td className="text-sm">{d.uploadedBy}</td>
                  <td className="text-sm text-muted">{d.uploadedAt ? new Date(d.uploadedAt).toLocaleDateString() : '—'}</td>
                  <td><StatusBadge status={d.status} /></td>
                  <td>
                    <div style={{ display: 'flex', gap: '.25rem' }}>
                      <button className="btn btn-ghost btn-icon btn-sm" title="Preview"  onClick={() => handlePreview(d.id, d.mimeType)}>👁️</button>
                      <button className="btn btn-ghost btn-icon btn-sm" title="Download" onClick={() => handleDownload(d.id, d.name)}>⬇️</button>
                      <button className="btn btn-ghost btn-icon btn-sm" title="Replace"  onClick={() => initiateReplace(d.id)}>🔄</button>
                      <button className="btn btn-ghost btn-icon btn-sm" title="Delete"   onClick={() => handleDelete(d.id)} style={{ color: '#ef4444' }}>🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          )}
        </div>
      </div>

      <Modal isOpen={uploadModal.isOpen} onClose={() => { if (!isUploading) uploadModal.close(); }} title="Categorize Document" width={400}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <div style={{ fontSize: '.875rem', fontWeight: 600, color: '#1e293b', marginBottom: '.25rem' }}>Selected File:</div>
            <div style={{ fontSize: '.875rem', color: '#64748b' }}>{uploadFile?.name} ({uploadFile ? fmtSize(uploadFile.size) : ''})</div>
          </div>
          <div className="form-group">
            <label className="form-label">Document Category *</label>
            <select className="form-control" value={uploadCategory} onChange={e => setUploadCategory(e.target.value)} disabled={isUploading}>
              <option value="Medical">Medical Records</option>
              <option value="Identity">Identity Proof</option>
              <option value="Evidence">Incident Evidence</option>
              <option value="Estimate">Cost Estimate</option>
              <option value="Other">Other</option>
            </select>
          </div>
          
          {isUploading && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.75rem', marginBottom: '.25rem', color: '#64748b' }}>
                <span>Uploading...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div style={{ height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ width: `${uploadProgress}%`, height: '100%', background: '#2563eb', transition: 'width 0.2s' }} />
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '.5rem', marginTop: '1rem' }}>
            <button className="btn btn-secondary" onClick={uploadModal.close} disabled={isUploading}>Cancel</button>
            <button className="btn btn-primary" onClick={submitUpload} disabled={isUploading}>
              {isUploading ? 'Uploading...' : 'Upload File'}
            </button>
          </div>
        </div>
      </Modal>

    </div>
  );
}

// ─── ReportsPage ──────────────────────────────────────────────────────────────



export function ReportsPage() {
  const toast = useToast();
  const [range, setRange] = useState('year');
  const [stats, setStats] = useState<any>({});
  
  useEffect(() => {
    async function loadStats() {
      try {
        const res = await reportsApi.dashboard();
        setStats(res.data?.data || {});
      } catch (err) {
        console.error(err);
      }
    }
    loadStats();
  }, []);

  const max = Math.max(...CLAIM_VOLUME_DATA.map((d) => d.count));

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

  return (
    <div>
      <SectionHeader title="Reports & Analytics" subtitle="Claim performance metrics and insights"
        actions={
          <>
            <select className="form-control" style={{ width: 'auto' }} value={range} onChange={(e) => setRange(e.target.value)}>
              <option value="week">This Week</option><option value="month">This Month</option>
              <option value="quarter">This Quarter</option><option value="year">This Year</option>
            </select>
            <button className="btn btn-secondary" onClick={handleExport}>⬇️ Export CSV</button>
          </>
        }
      />
      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          ['Total Claims', stats.totalClaims || '1,284', '#dbeafe', '#1d4ed8'],
          ['Approved', stats.approvedClaims || '947', '#dcfce7', '#15803d'],
          ['Denied', stats.deniedClaims || '182', '#fee2e2', '#dc2626'],
          ['Avg TAT', `${stats.avgTatDays || '8.4'} days`, '#ede9fe', '#7c3aed']
        ].map(([l,v,_bg,c])=>(
          <div key={l as string} className="card p-4" style={{ borderTop: `4px solid ${c}` }}>
            <div style={{ fontSize: '.8rem', fontWeight: 600, color: '#64748b', marginBottom: '.5rem' }}>{l as string}</div>
            <div style={{ fontSize: '1.875rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-.04em' }}>{v as string}</div>
          </div>
        ))}
      </div>
      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        <div className="card p-6">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h3 style={{ fontWeight: 700, fontSize: '1rem' }}>Claims Volume by Month</h3>
            <span className="badge badge-blue">2024</span>
          </div>
          <div className="bar-chart" style={{ height: 160, alignItems: 'flex-end' }}>
            {CLAIM_VOLUME_DATA.map((d, _i) => (
              <div key={d.month} className="bar-col">
                <div className="bar-value">{d.count}</div>
                <div className="bar" style={{ height: `${(d.count/max)*130}px`, background: `linear-gradient(to top, #2563eb, #60a5fa)`, minHeight: 4 }} title={`${d.month}: ${d.count}`} />
                <div className="bar-label">{d.month.slice(0,1)}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="card p-6">
          <h3 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '1.25rem' }}>Outcome Breakdown</h3>
          {[['Fully Approved',73,'#22c55e'],['Partial Approval',12,'#f59e0b'],['Denied',14,'#ef4444'],['Withdrawn',1,'#94a3b8']].map(([l,v,c])=>(
            <div key={l} style={{ marginBottom: '.875rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.8125rem', marginBottom: '.3rem' }}>
                <span style={{ fontWeight: 500, color: '#475569' }}>{l}</span>
                <span style={{ fontWeight: 700, color: String(c) }}>{v}%</span>
              </div>
              <div style={{ height: 7, background: '#f1f5f9', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${v}%`, background: String(c), borderRadius: 99 }} />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        <div className="card p-6">
          <h3 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '1.25rem' }}>Claims by Type</h3>
          {[['Auto',38,'#2563eb'],['Health',28,'#0d9488'],['Property',22,'#8b5cf6'],['Life',8,'#f59e0b'],['Other',4,'#94a3b8']].map(([l,v,c])=>(
            <div key={l} style={{ display: 'flex', alignItems: 'center', gap: '.75rem', marginBottom: '.75rem' }}>
              <div style={{ width: 12, height: 12, borderRadius: 3, background: String(c), flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: '.875rem', color: '#475569', fontWeight: 500 }}>{l}</span>
              <div style={{ width: 140, height: 7, background: '#f1f5f9', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${v}%`, background: String(c), borderRadius: 99 }} />
              </div>
              <span style={{ fontSize: '.8rem', fontWeight: 700, width: 32, textAlign: 'right' }}>{v}%</span>
            </div>
          ))}
        </div>
        <div className="card p-6">
          <h3 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '1.25rem' }}>TAT Distribution (days)</h3>
          <div className="bar-chart" style={{ height: 130, alignItems: 'flex-end' }}>
            {[[1,15],[2,42],[3,68],[4,55],[5,38],[6,25],[7,18],[8,22]].map(([d,v])=>(
              <div key={d} className="bar-col">
                <div className="bar" style={{ height: `${(Number(v)/70)*110}px`, background: Number(v)>50?'#ef4444':Number(v)>30?'#f59e0b':'#22c55e', minHeight: 4 }} />
                <div className="bar-label">{d}{d===8?'+':''}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── UsersPage ────────────────────────────────────────────────────────────────



export function UsersPage() {
  const toast = useToast();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Search & Pagination State
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  
  const addModal     = useDisclosure();
  const importModal  = useDisclosure();
  const auditModal   = useDisclosure();
  
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [selectedUserForAudit, setSelectedUserForAudit] = useState<any | null>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [form, setForm] = useState<NewUserForm>({ name: '', email: '', role: 'Policyholder', department: '' });

  // Bulk Upload State
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadSummary, setUploadSummary] = useState<any | null>(null);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await usersApi.list();
      const content = res.data?.data?.content || res.data?.data || [];
      const mapped = content.map((u: any) => ({
        id: u.id,
        name: u.fullName,
        email: u.email,
        role: u.role,
        department: u.department,
        isActive: u.active,
        lastLogin: u.lastLoginAt,
        avatar: u.fullName ? u.fullName.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase() : 'U',
        avatarBg: '#2563eb'
      }));
      setUsers(mapped);
    } catch (err) {
      console.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  // Filter and Paginate
  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const totalPages = Math.ceil(filteredUsers.length / pageSize) || 1;
  const paginatedUsers = filteredUsers.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleSaveUser = async () => {
    if (!form.name.trim() || !form.email.trim()) { toast('Name and email are required', 'error'); return; }
    try {
      if (editingUser) {
        await usersApi.updateUser(editingUser.id, {
          fullName: form.name,
          role: form.role?.toUpperCase(),
          department: form.department,
        });
        toast(`User "${form.name}" updated successfully`, 'success');
      } else {
        toast('Creating user...', 'info');
      }
      loadUsers();
      setForm({ name: '', email: '', role: 'Policyholder', department: '' });
      setEditingUser(null);
      addModal.close();
    } catch (err: any) {
      toast(err.response?.data?.message || 'Failed to update user', 'error');
    }
  };

  const toggleStatus = async (user: any) => {
    try {
      const newStatus = !(user.isActive ?? user.active);
      await usersApi.toggleStatus(user.id, newStatus);
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, isActive: newStatus, active: newStatus } : u));
      toast(`User ${newStatus ? 'activated' : 'suspended'} successfully`, 'success');
    } catch (err: any) {
      toast('Failed to change user status', 'error');
    }
  };

  const handleBulkUpload = async () => {
    if (!csvFile) return;
    setUploading(true);
    setUploadSummary(null);
    try {
      const res = await usersApi.bulkUpload(csvFile);
      setUploadSummary(res.data?.data);
      toast('Bulk import processed', 'success');
      loadUsers();
    } catch (err: any) {
      toast(err.response?.data?.message || 'Failed to process CSV file', 'error');
    } finally {
      setUploading(false);
      setCsvFile(null);
    }
  };

  const openAudit = async (user: any) => {
    setSelectedUserForAudit(user);
    setAuditLogs([]);
    auditModal.open();
    try {
      // Fetch global logs and filter by this user's email
      const res = await api.get('/audit');
      const content = res.data?.data?.content || res.data?.data || [];
      const userLogs = content.filter((l: any) => l.userId === user.id);
      setAuditLogs(userLogs);
    } catch (err) {
      toast('Failed to load audit logs', 'error');
    }
  };

  const activeCount = users.filter(u => u.isActive || u.active).length;

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
        <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
          <div style={{ fontSize: '.875rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Total Users</div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: '#0f172a' }}>{users.length}</div>
        </div>
        <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
          <div style={{ fontSize: '.875rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Active Accounts</div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: '#059669' }}>{activeCount}</div>
        </div>
        <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
          <div style={{ fontSize: '.875rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Inactive Accounts</div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: '#e11d48' }}>{users.length - activeCount}</div>
        </div>
      </div>

      <SectionHeader title="User Management" subtitle={loading ? 'Loading...' : 'Manage system access and roles'}
        actions={
          <div style={{ display: 'flex', gap: '.625rem' }}>
            <button className="btn btn-secondary" onClick={() => {
              setUploadSummary(null);
              importModal.open();
            }}>
              📁 Bulk Import CSV
            </button>
            <button className="btn btn-secondary" onClick={async () => {
              try {
                const res = await usersApi.downloadRolesPdf();
                const url = window.URL.createObjectURL(new Blob([res.data]));
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute('download', 'roles-restrictions.pdf');
                document.body.appendChild(link);
                link.click();
                link.remove();
              } catch (err) {
                console.error("Failed to download PDF", err);
              }
            }}>
              📄 Download Roles Restrictions
            </button>
            <button className="btn btn-primary" onClick={() => {
              setEditingUser(null);
              setForm({ name: '', email: '', role: 'Policyholder', department: '' });
              addModal.open();
            }}>➕ Add User</button>
          </div>
        } />
        
      <div className="card">
        <div style={{ padding: '1rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between' }}>
          <input 
            type="text" 
            placeholder="Search by name or email..." 
            className="form-control" 
            style={{ maxWidth: '300px' }}
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
          />
        </div>
        <div className="overflow-x-auto">
          <table>
            <thead><tr><th>User</th><th>Email</th><th>Role</th><th>Department</th><th>Status</th><th>Last Login</th><th>Actions</th></tr></thead>
            <tbody>
              {paginatedUsers.map((u) => (
                <tr key={u.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem' }}>
                      <Avatar initials={u.avatar || u.name.charAt(0) || 'U'} bg={u.avatarBg} size="sm" />
                      <span style={{ fontWeight: 600, fontSize: '.875rem' }}>{u.fullName || u.name}</span>
                    </div>
                  </td>
                  <td className="text-sm text-muted">{u.email}</td>
                  <td><span className="badge badge-blue">{u.role}</span></td>
                  <td className="text-sm text-muted">{u.department ?? '—'}</td>
                  <td><span className={`badge badge-${u.active ?? u.isActive ? 'green' : 'gray'}`}>{u.active ?? u.isActive ? 'Active' : 'Inactive'}</span></td>
                  <td className="text-sm text-muted">{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString() : (u.lastLogin ?? '—')}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '.375rem' }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => {
                        setEditingUser(u);
                        setForm({ name: u.fullName || u.name, email: u.email, role: u.role, department: u.department || '' });
                        addModal.open();
                      }}>✏️ Edit</button>
                      <button className="btn btn-ghost btn-sm" style={{ color: (u.active ?? u.isActive) ? '#ef4444' : '#22c55e' }} onClick={() => toggleStatus(u)}>
                        {(u.active ?? u.isActive) ? '🛑 Suspend' : '✅ Activate'}
                      </button>
                      <button className="btn btn-ghost btn-sm" onClick={() => openAudit(u)}>📜 Audit</button>
                    </div>
                  </td>
                </tr>
              ))}
              {paginatedUsers.length === 0 && (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>No users found matching your search.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div style={{ padding: '1rem', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '.875rem', color: '#64748b' }}>Showing {Math.min((currentPage - 1) * pageSize + 1, filteredUsers.length)} to {Math.min(currentPage * pageSize, filteredUsers.length)} of {filteredUsers.length} users</span>
          <div style={{ display: 'flex', gap: '.5rem' }}>
            <button className="btn btn-outline btn-sm" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>Previous</button>
            <span style={{ padding: '0.25rem 0.5rem', fontSize: '.875rem' }}>Page {currentPage} of {totalPages}</span>
            <button className="btn btn-outline btn-sm" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>Next</button>
          </div>
        </div>
      </div>

      <Modal isOpen={addModal.isOpen} onClose={addModal.close} title={editingUser ? "✏️ Edit User" : "➕ Add New User"} width={460}
        footer={<><button className="btn btn-secondary" onClick={addModal.close}>Cancel</button><button className="btn btn-primary" onClick={handleSaveUser}>{editingUser ? "Save Changes" : "Create User"}</button></>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-group"><label className="form-label">Full Name *</label><input className="form-control" placeholder="Jane Smith" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} /></div>
          <div className="form-group"><label className="form-label">Email Address *</label><input className="form-control" type="email" placeholder="jane@company.com" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} disabled={!!editingUser} /></div>
          <div className="form-group"><label className="form-label">Role</label>
            <select className="form-control" value={form.role} onChange={(e) => setForm((p) => ({ ...p, role: e.target.value as UserRole }))}>
              <option>Admin</option><option>Adjuster</option><option>Underwriter</option><option>Policyholder</option><option>Partner</option><option>Finance</option>
            </select>
          </div>
          <div className="form-group"><label className="form-label">Department</label><input className="form-control" placeholder="e.g. Claims, Operations" value={form.department ?? ''} onChange={(e) => setForm((p) => ({ ...p, department: e.target.value }))} /></div>
        </div>
      </Modal>
      
      <Modal isOpen={importModal.isOpen} onClose={importModal.close} title="📁 Bulk Import Users (CSV)" width={500}>
        {!uploadSummary ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <p style={{ fontSize: '.875rem', color: '#64748b' }}>Upload a CSV file containing user records. Required columns: <b>fullName, email, role</b>. Optional: department.</p>
            <input type="file" accept=".csv" className="form-control" onChange={(e) => setCsvFile(e.target.files?.[0] || null)} />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '.5rem', marginTop: '1rem' }}>
              <button className="btn btn-secondary" onClick={importModal.close}>Cancel</button>
              <button className="btn btn-primary" disabled={!csvFile || uploading} onClick={handleBulkUpload}>
                {uploading ? 'Processing...' : 'Upload & Process'}
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
               <div className="card" style={{ flex: 1, padding: '1rem', textAlign: 'center', background: '#f0fdf4', borderColor: '#bbf7d0' }}>
                 <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#166534' }}>{uploadSummary.successCount}</div>
                 <div style={{ fontSize: '.75rem', color: '#166534', fontWeight: 600 }}>IMPORTED</div>
               </div>
               <div className="card" style={{ flex: 1, padding: '1rem', textAlign: 'center', background: '#fef2f2', borderColor: '#fecaca' }}>
                 <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#991b1b' }}>{uploadSummary.failureCount}</div>
                 <div style={{ fontSize: '.75rem', color: '#991b1b', fontWeight: 600 }}>FAILED</div>
               </div>
            </div>
            {uploadSummary.errors && uploadSummary.errors.length > 0 && (
              <div style={{ maxHeight: '200px', overflowY: 'auto', background: '#f8fafc', padding: '.75rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '.875rem', fontWeight: 600, marginBottom: '.5rem', color: '#0f172a' }}>Validation Errors:</div>
                <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '.8125rem', color: '#ef4444' }}>
                  {uploadSummary.errors.map((err: string, i: number) => <li key={i}>{err}</li>)}
                </ul>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button className="btn btn-primary" onClick={importModal.close}>Done</button>
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={auditModal.isOpen} onClose={auditModal.close} title={`📜 Audit Logs: ${selectedUserForAudit?.name}`} width={700}>
        <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
          {auditLogs.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>No audit history found for this user.</div>
          ) : (
            <table style={{ width: '100%', fontSize: '.875rem' }}>
              <thead><tr><th style={{ textAlign: 'left', padding: '8px' }}>Action</th><th style={{ textAlign: 'left', padding: '8px' }}>Target</th><th style={{ textAlign: 'left', padding: '8px' }}>Time</th></tr></thead>
              <tbody>
                {auditLogs.map((log: any) => (
                  <tr key={log.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '8px', fontWeight: 500 }}>{log.action}</td>
                    <td style={{ padding: '8px', color: '#64748b' }}>{log.targetType}-{log.targetId}</td>
                    <td style={{ padding: '8px', color: '#64748b' }}>{new Date(log.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Modal>
    </div>
  );
}

// ─── AuditPage ────────────────────────────────────────────────────────────────



export function AuditPage() {
  const toast = useToast();
  const [logs, setLogs] = useState<any[]>([]);
  const [_loading, setLoading] = useState(true);
  const targetColors: Record<string, string> = { claim: '#2563eb', policy: '#0d9488', user: '#7c3aed', system: '#f59e0b' };

  useEffect(() => {
    async function loadLogs() {
      setLoading(true);
      try {
        const res = await auditApi.list();
        const content = res.data?.data?.content || res.data?.data || [];
        const mapped = content.map((l: any) => ({
          id: l.id,
          user: l.userEmail,
          action: l.action,
          target: l.targetId ? `${l.targetType}-${l.targetId}` : l.targetType,
          targetType: l.targetType ? l.targetType.toLowerCase() : 'system',
          timestamp: l.createdAt,
          ipAddress: l.ipAddress
        }));
        setLogs(mapped);
      } catch (err) {
        console.error('Failed to load audit logs');
      } finally {
        setLoading(false);
      }
    }
    loadLogs();
  }, []);

  const handleExport = () => {
    const csv = ['#,User,Action,Target,Timestamp,IP', ...logs.map((l) => `${l.id},"${l.user}","${l.action}","${l.target}","${l.timestamp}",${l.ipAddress}`)].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a'); a.href = url; a.download = 'audit-logs.csv'; a.click();
    URL.revokeObjectURL(url);
    toast('Audit logs exported', 'success');
  };

  return (
    <div>
      <SectionHeader title="Audit Logs" subtitle="Complete activity trail for compliance and security"
        actions={<button className="btn btn-secondary" onClick={handleExport}>⬇️ Export Logs</button>} />
      <div className="card">
        <div className="overflow-x-auto">
          <table>
            <thead><tr><th>#</th><th>User</th><th>Action</th><th>Target</th><th>Type</th><th>Timestamp</th><th>IP Address</th></tr></thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id}>
                  <td><span className="mono text-xs text-muted">#{l.id}</span></td>
                  <td><span style={{ fontWeight: 600, fontSize: '.875rem' }}>{l.user}</span></td>
                  <td><span style={{ fontSize: '.875rem', color: '#334155' }}>{l.action}</span></td>
                  <td><span className="mono text-sm fw-600" style={{ color: targetColors[l.targetType] ?? '#2563eb' }}>{l.target}</span></td>
                  <td><span className="badge badge-gray">{l.targetType}</span></td>
                  <td className="text-sm text-muted">{l.timestamp}</td>
                  <td><span className="mono text-xs text-muted">{l.ipAddress}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── SettingsPage ─────────────────────────────────────────────────────────────



export function SettingsPage() {
  const toast = useToast();
  const [tab, setTab] = useState('password');
  const [pwdPolicy, setPwdPolicy]     = useState<PasswordPolicy>(DEFAULT_PASSWORD_POLICY);
  const [wfRules, setWfRules]         = useState<WorkflowRule>(DEFAULT_WORKFLOW_RULE);
  const [templates, setTemplates]     = useState<NotificationTemplate[]>(DEFAULT_NOTIFICATION_TEMPLATES);
  const [uiStyles, setUiStyles]       = useState({ primaryColor: '#2563eb', sidebarColor: '#0a1628', borderRadius: 10 });

  const TABS = [
    { id: 'password', label: 'Password Policy', icon: '🔐' }, 
    { id: 'workflow', label: 'Workflow Rules', icon: '🔄' }, 
    { id: 'notifications', label: 'Notification Templates', icon: '📧' },
    { id: 'uistyling', label: 'UI Styling', icon: '🎨' }
  ];

  return (
    <div>
      <SectionHeader title="System Settings" subtitle="Configure system-wide policies and automation rules" />
      <Tabs tabs={TABS} active={tab} onChange={setTab} />
      <div style={{ marginTop: '1.5rem' }}>
        {tab === 'password' && (
          <div className="card p-6" style={{ maxWidth: 560 }}>
            <h3 style={{ fontWeight: 700, marginBottom: '1.5rem', fontSize: '1rem' }}>Password Policy</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group"><label className="form-label">Minimum Length</label><input className="form-control" type="number" value={pwdPolicy.minLength} onChange={(e) => setPwdPolicy((p) => ({ ...p, minLength: Number(e.target.value) }))} /></div>
              <div className="form-group"><label className="form-label">Password Expiry (days)</label><input className="form-control" type="number" value={pwdPolicy.expiryDays} onChange={(e) => setPwdPolicy((p) => ({ ...p, expiryDays: Number(e.target.value) }))} /></div>
              <div className="form-group"><label className="form-label">Max Failed Attempts</label><input className="form-control" type="number" value={pwdPolicy.maxFailedAttempts} onChange={(e) => setPwdPolicy((p) => ({ ...p, maxFailedAttempts: Number(e.target.value) }))} /></div>
              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
                {([['requireUppercase','Require uppercase letters'],['requireNumbers','Require numbers'],['requireSpecial','Require special characters'],['enable2FA','Enable two-factor authentication (2FA)']] as const).map(([k, label]) => (
                  <label key={k} style={{ display: 'flex', alignItems: 'center', gap: '.875rem', cursor: 'pointer', fontSize: '.9375rem' }}>
                    <input type="checkbox" checked={pwdPolicy[k]} onChange={(e) => setPwdPolicy((p) => ({ ...p, [k]: e.target.checked }))} style={{ width: 18, height: 18, accentColor: '#2563eb' }} />
                    <span style={{ fontWeight: 500 }}>{label}</span>
                  </label>
                ))}
              </div>
              <button className="btn btn-primary mt-2" onClick={() => toast('Password policy saved', 'success')}>💾 Save Policy</button>
            </div>
          </div>
        )}
        {tab === 'workflow' && (
          <div className="card p-6" style={{ maxWidth: 560 }}>
            <h3 style={{ fontWeight: 700, marginBottom: '1.5rem', fontSize: '1rem' }}>Workflow Configuration</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group"><label className="form-label">Auto-assign Threshold (claims/adjuster)</label><input className="form-control" type="number" value={wfRules.autoAssignThreshold} onChange={(e) => setWfRules((p) => ({ ...p, autoAssignThreshold: Number(e.target.value) }))} /></div>
              <div className="form-group"><label className="form-label">High-Value Approval Threshold ($)</label><input className="form-control" type="number" value={wfRules.highValueThreshold} onChange={(e) => setWfRules((p) => ({ ...p, highValueThreshold: Number(e.target.value) }))} /></div>
              <div className="form-group"><label className="form-label">SLA Turn-around Time (days)</label><input className="form-control" type="number" value={wfRules.tatSlaDays} onChange={(e) => setWfRules((p) => ({ ...p, tatSlaDays: Number(e.target.value) }))} /></div>
              <div className="form-group"><label className="form-label">Escalation Trigger (days past SLA)</label><input className="form-control" type="number" value={wfRules.escalationDays} onChange={(e) => setWfRules((p) => ({ ...p, escalationDays: Number(e.target.value) }))} /></div>
              <button className="btn btn-primary mt-2" onClick={() => toast('Workflow rules saved', 'success')}>💾 Save Rules</button>
            </div>
          </div>
        )}
        {tab === 'notifications' && (
          <div className="card p-6">
            <h3 style={{ fontWeight: 700, marginBottom: '1.5rem', fontSize: '1rem' }}>Notification Templates</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {templates.map((t, i) => (
                <div key={t.id} style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '1.5rem' }}>
                  <div style={{ fontWeight: 700, fontSize: '.875rem', marginBottom: '.75rem', color: '#1e293b' }}>
                    📧 {t.trigger}
                  </div>
                  <div className="form-group mb-3">
                    <label className="form-label">Subject Line</label>
                    <input className="form-control" value={t.subject}
                      onChange={(e) => setTemplates((prev) => prev.map((x, j) => j === i ? { ...x, subject: e.target.value } : x))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email Body</label>
                    <textarea className="form-control" rows={4} value={t.body}
                      onChange={(e) => setTemplates((prev) => prev.map((x, j) => j === i ? { ...x, body: e.target.value } : x))}
                      style={{ resize: 'vertical' }} />
                    <p style={{ fontSize: '.73rem', color: '#94a3b8', marginTop: '.375rem' }}>
                      Variables: &#123;name&#125;, &#123;id&#125;, &#123;status&#125;, &#123;amount&#125;, &#123;method&#125;
                    </p>
                  </div>
                </div>
              ))}
              <button className="btn btn-primary" style={{ alignSelf: 'flex-start' }} onClick={() => toast('Templates saved', 'success')}>💾 Save All Templates</button>
            </div>
          </div>
        )}
        {tab === 'uistyling' && (
          <div className="card p-6" style={{ maxWidth: 560 }}>
            <h3 style={{ fontWeight: 700, marginBottom: '1.5rem', fontSize: '1rem' }}>UI Styling Configuration</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Primary Color</label>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <input type="color" value={uiStyles.primaryColor} onChange={(e) => setUiStyles((p) => ({ ...p, primaryColor: e.target.value }))} style={{ width: '50px', height: '40px', padding: 0, border: 'none', cursor: 'pointer' }} />
                  <input className="form-control" type="text" value={uiStyles.primaryColor} onChange={(e) => setUiStyles((p) => ({ ...p, primaryColor: e.target.value }))} style={{ flex: 1 }} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Sidebar Background Color</label>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <input type="color" value={uiStyles.sidebarColor} onChange={(e) => setUiStyles((p) => ({ ...p, sidebarColor: e.target.value }))} style={{ width: '50px', height: '40px', padding: 0, border: 'none', cursor: 'pointer' }} />
                  <input className="form-control" type="text" value={uiStyles.sidebarColor} onChange={(e) => setUiStyles((p) => ({ ...p, sidebarColor: e.target.value }))} style={{ flex: 1 }} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Border Radius ({uiStyles.borderRadius}px)</label>
                <input type="range" min="0" max="24" value={uiStyles.borderRadius} onChange={(e) => setUiStyles((p) => ({ ...p, borderRadius: Number(e.target.value) }))} style={{ width: '100%', accentColor: 'var(--blue-2)' }} />
              </div>
              <button className="btn btn-primary mt-4" onClick={() => {
                document.documentElement.style.setProperty('--blue-2', uiStyles.primaryColor);
                document.documentElement.style.setProperty('--navy', uiStyles.sidebarColor);
                document.documentElement.style.setProperty('--radius', `${uiStyles.borderRadius}px`);
                document.documentElement.style.setProperty('--radius-lg', `${Math.max(uiStyles.borderRadius, 4) + 6}px`);
                toast('UI Styling updated successfully', 'success');
              }}>
                💾 Apply Styles
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── ProfilePage ──────────────────────────────────────────────────────────────

import { useAuth } from '@/context/AuthContext';
import type { ProfileForm } from '@/types';

export function ProfilePage() {
  const { user, updateUser } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState<ProfileForm>({
    name: user?.name ?? '', email: user?.email ?? '',
    phone: user?.phone ?? '', address: user?.address ?? '', dateOfBirth: user?.dateOfBirth ?? '',
  });
  const [prefForm, setPrefForm] = useState({
    emailNotificationsEnabled: user?.emailNotificationsEnabled ?? true,
    smsNotificationsEnabled: user?.smsNotificationsEnabled ?? false,
  });
  const [errors, setErrors] = useState<Partial<ProfileForm>>({});
  const up = (k: keyof ProfileForm, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const validate = () => {
    const e: Partial<ProfileForm> = {};
    if (!form.name.trim())   e.name  = 'Name is required';
    if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Valid email required';
    if (!form.phone) e.phone = 'Phone number is required';
    if (!form.dateOfBirth) e.dateOfBirth = 'Date of birth is required';
    if (form.newPassword) {
      if (!form.oldPassword) e.oldPassword = 'Required to change password';
      if (form.newPassword !== form.confirmPassword) e.confirmPassword = 'Passwords do not match';
    }
    setErrors(e);
    if (Object.keys(e).length > 0) {
      toast('Please fix the validation errors in the form.', 'warning');
      return false;
    }
    return true;
  };
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      await usersApi.updateProfile({ fullName: form.name, phone: form.phone, dateOfBirth: form.dateOfBirth, address: form.address });
      updateUser({ name: form.name, phone: form.phone, dateOfBirth: form.dateOfBirth, address: form.address });
      
      if (form.newPassword && form.oldPassword) {
        await usersApi.changePassword({ oldPassword: form.oldPassword, newPassword: form.newPassword });
        up('oldPassword', '');
        up('newPassword', '');
        up('confirmPassword', '');
      }
      
      // Update preferences
      if (user?.emailNotificationsEnabled !== prefForm.emailNotificationsEnabled || 
          user?.smsNotificationsEnabled !== prefForm.smsNotificationsEnabled) {
        await usersApi.updatePreferences({
          emailNotificationsEnabled: prefForm.emailNotificationsEnabled,
          smsNotificationsEnabled: prefForm.smsNotificationsEnabled
        });
        updateUser({ 
          emailNotificationsEnabled: prefForm.emailNotificationsEnabled,
          smsNotificationsEnabled: prefForm.smsNotificationsEnabled
        });
      }

      toast('Profile updated successfully', 'success');
    } catch (err: any) {
      toast(err.response?.data?.message || 'Failed to update profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <SectionHeader 
        title="My Profile" 
        subtitle="Manage your personal information and security" 
        actions={
          <button className="btn btn-secondary" onClick={async () => {
            try {
              const res = await usersApi.exportProfilePdf();
              const url = window.URL.createObjectURL(new Blob([res.data]));
              const link = document.createElement('a');
              link.href = url;
              link.setAttribute('download', 'profile_summary.pdf');
              document.body.appendChild(link);
              link.click();
              link.remove();
            } catch (err) {
              toast('Failed to download profile PDF', 'error');
            }
          }}>
            📄 Export Profile Summary
          </button>
        }
      />
      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '1.5rem' }}>
        {/* Avatar card */}
        <div className="card p-6" style={{ textAlign: 'center', height: 'fit-content' }}>
          <Avatar initials={user?.avatar ?? 'U'} bg={user?.avatarBg} size="xl" />
          <div style={{ marginTop: '1rem' }}>
            <div style={{ fontWeight: 800, fontSize: '1.0625rem', color: '#0f172a' }}>{user?.name}</div>
            <div style={{ fontSize: '.8125rem', color: '#64748b', marginTop: '.25rem' }}>{user?.role}</div>
            <div style={{ fontSize: '.8125rem', color: '#94a3b8', marginTop: '.1rem' }}>{user?.email}</div>
          </div>
          <div style={{ marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px solid #f1f5f9', textAlign: 'left' }}>
            <div style={{ fontSize: '.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '.75rem' }}>Account Info</div>
            {[['Member since', user?.createdAt ?? '—'], ['Last login', user?.lastLogin ?? '—'], ['Dept.', user?.department ?? '—']].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.8125rem', padding: '.3rem 0', borderBottom: '1px solid #f8fafc' }}>
                <span style={{ color: '#64748b' }}>{k}</span>
                <span style={{ fontWeight: 600, color: '#334155' }}>{v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Form card */}
        <div className="card p-6">
          <h3 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '1.5rem' }}>Personal Information</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
            <div className="form-group">
              <label className="form-label">Full Name <span style={{ color: '#ef4444' }}>*</span></label>
              <input className={`form-control ${errors.name ? 'is-error' : ''}`} value={form.name} onChange={(e) => up('name', e.target.value)} />
              {errors.name && <p className="form-error">⚠ {errors.name}</p>}
            </div>
            <div className="form-group">
              <label className="form-label">Email Address <span style={{ color: '#ef4444' }}>*</span></label>
              <input className={`form-control ${errors.email ? 'is-error' : ''}`} type="email" value={form.email} onChange={(e) => up('email', e.target.value)} />
              {errors.email && <p className="form-error">⚠ {errors.email}</p>}
            </div>
            <div className="form-group">
              <label className="form-label">Phone Number <span style={{ color: '#ef4444' }}>*</span></label>
              <input className={`form-control ${errors.phone ? 'is-error' : ''}`} type="tel" value={form.phone} onChange={(e) => up('phone', e.target.value)} />
              {errors.phone && <p className="form-error">⚠ {errors.phone}</p>}
            </div>
            <div className="form-group">
              <label className="form-label">Date of Birth <span style={{ color: '#ef4444' }}>*</span></label>
              <input className={`form-control ${errors.dateOfBirth ? 'is-error' : ''}`} type="date" value={form.dateOfBirth} onChange={(e) => up('dateOfBirth', e.target.value)} />
              {errors.dateOfBirth && <p className="form-error">⚠ {errors.dateOfBirth}</p>}
            </div>
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="form-label">Address</label>
              <input className="form-control" value={form.address} onChange={(e) => up('address', e.target.value)} />
            </div>
          </div>

          <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '1.5rem', marginBottom: '1.5rem' }}>
            <h4 style={{ fontWeight: 700, fontSize: '.9375rem', marginBottom: '1rem' }}>Change Password</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Current Password</label>
                <input className={`form-control ${errors.oldPassword ? 'is-error' : ''}`} type="password" placeholder="••••••••" value={form.oldPassword ?? ''} onChange={(e) => up('oldPassword', e.target.value)} />
                {errors.oldPassword && <p className="form-error">⚠ {errors.oldPassword}</p>}
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">New Password</label>
                <input className="form-control" type="password" placeholder="••••••••" value={form.newPassword ?? ''} onChange={(e) => up('newPassword', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Confirm New Password</label>
                <input className={`form-control ${errors.confirmPassword ? 'is-error' : ''}`} type="password" placeholder="••••••••" value={form.confirmPassword ?? ''} onChange={(e) => up('confirmPassword', e.target.value)} />
                {errors.confirmPassword && <p className="form-error">⚠ {errors.confirmPassword}</p>}
              </div>
            </div>
          </div>

          <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '1.5rem', marginBottom: '1.5rem' }}>
            <h4 style={{ fontWeight: 700, fontSize: '.9375rem', marginBottom: '1rem' }}>Notification Preferences</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '.875rem', cursor: 'pointer', fontSize: '.9375rem' }}>
                <input type="checkbox" checked={prefForm.emailNotificationsEnabled} onChange={(e) => setPrefForm(p => ({ ...p, emailNotificationsEnabled: e.target.checked }))} style={{ width: 18, height: 18, accentColor: '#2563eb' }} />
                <span style={{ fontWeight: 500 }}>Receive Email Notifications</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '.875rem', cursor: 'pointer', fontSize: '.9375rem' }}>
                <input type="checkbox" checked={prefForm.smsNotificationsEnabled} onChange={(e) => setPrefForm(p => ({ ...p, smsNotificationsEnabled: e.target.checked }))} style={{ width: 18, height: 18, accentColor: '#2563eb' }} />
                <span style={{ fontWeight: 500 }}>Receive SMS Notifications</span>
              </label>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '.75rem' }}>
            <button className="btn btn-secondary">Cancel</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : '💾 Save Changes'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
