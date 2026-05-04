import { useState, useRef } from 'react';
import type { Claim, UserRole } from '@/types';
import { useEffect } from 'react';
import { claimsApi } from '@/services/api';
import { StatusBadge, PriorityBadge, FilterPills, SectionHeader, EmptyState, Paginator } from '@/components/shared';
import { formatCurrency, formatDate, WORKFLOW_STAGES } from '@/utils/helpers';
import { useToast } from '@/context/ToastContext';
import { usePagination, useDebounce } from '@/hooks';

const PRIORITIES = ['All', 'High', 'Medium', 'Low'];
const STATUSES   = ['All', ...WORKFLOW_STAGES];

interface ClaimsPageProps {
  role: UserRole;
  setActive: (id: string) => void;
  setSelectedClaim: (c: Claim) => void;
}

export default function ClaimsPage({ role, setActive, setSelectedClaim }: ClaimsPageProps) {
  const toast = useToast();
  const [statusFilter,   setStatusFilter]   = useState(role === 'Finance' ? 'Settlement' : 'All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [assigneeFilter, setAssigneeFilter] = useState('All');
  const [rawSearch,      setRawSearch]      = useState('');
  const search = useDebounce(rawSearch, 250);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkAssignee, setBulkAssignee] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [baseClaims, setBaseClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadClaims() {
      setLoading(true);
      try {
        const res = await claimsApi.list();
        // Check if the backend response is PagedResponse
        const content = res.data?.data?.content || res.data?.data || [];
        
        const mapped: Claim[] = content.map((backendClaim: any) => ({
          id: String(backendClaim.id),
          referenceNumber: backendClaim.referenceNumber,
          type: backendClaim.claimType || 'Unknown',
          status: backendClaim.status,
          priority: backendClaim.priority,
          policyholderId: 0, 
          policyholder: backendClaim.policyholderName || 'Unknown',
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
          isOverdue: backendClaim.overdue,
          daysOverdue: backendClaim.daysOverdue,
        }));
        
        if (role === 'Policyholder') {
           // Wait, backend should already filter by policyholder if token is passed, 
           // but we can leave it or filter just in case.
           setBaseClaims(mapped);
        } else {
           setBaseClaims(mapped);
        }
      } catch (err) {
        console.error('Failed to load claims', err);
        toast('Failed to load claims', 'error');
      } finally {
        setLoading(false);
      }
    }
    loadClaims();
  }, [role, toast]);

  const filtered = baseClaims.filter((c) => {
    if (statusFilter !== 'All' && c.status?.toUpperCase() !== statusFilter.toUpperCase()) return false;
    if (priorityFilter !== 'All' && c.priority?.toUpperCase() !== priorityFilter.toUpperCase()) return false;
    if (assigneeFilter === 'Unassigned' && c.assignee !== 'Unassigned') return false;
    if (search) {
      const q = search.toLowerCase();
      if (!c.id.toLowerCase().includes(q) && !(c.referenceNumber || '').toLowerCase().includes(q) && !(c.policyholder || '').toLowerCase().includes(q) && !(c.type || '').toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const { page, totalPages, pageItems, next, prev } = usePagination(filtered, 8);

  const toggleSelect = (id: string) => {
    setSelectedIds(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  };
  const toggleAll = () => {
    if (selectedIds.length === pageItems.length) setSelectedIds([]);
    else setSelectedIds(pageItems.map(x => x.id));
  };

  const handleBulkAssign = async () => {
    if (!bulkAssignee || selectedIds.length === 0) return;
    try {
      setLoading(true);
      await claimsApi.bulkAssign({ claimIds: selectedIds.map(Number), adjusterId: Number(bulkAssignee) });
      toast('Claims reassigned successfully', 'success');
      setSelectedIds([]);
      setBulkAssignee('');
      // Trigger a reload
      const res = await claimsApi.list();
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
        isOverdue: backendClaim.overdue,
        daysOverdue: backendClaim.daysOverdue,
      }));
      setBaseClaims(mapped);
    } catch (e: any) {
      toast(e.response?.data?.message || 'Failed to bulk assign', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    const csv = [
      ['Claim ID', 'Type', 'Policyholder', 'Status', 'Priority', 'Amount', 'Filed'],
      ...filtered.map((c) => [c.referenceNumber || c.id, c.type, c.policyholder, c.status, c.priority, c.amount, c.filedDate]),
    ].map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'claims-export.csv'; a.click();
    URL.revokeObjectURL(url);
    toast('Claims exported as CSV', 'success');
  };

  const handleBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setLoading(true);
      const res = await claimsApi.bulkUpload(file);
      const data = res.data?.data || {};
      toast(`Bulk upload complete: ${data.successfulCount} created, ${data.failedCount} failed`, 'success');
      
      const reloadRes = await claimsApi.list();
      const content = reloadRes.data?.data?.content || reloadRes.data?.data || [];
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
        isOverdue: backendClaim.overdue,
        daysOverdue: backendClaim.daysOverdue,
      }));
      setBaseClaims(mapped);
    } catch (err: any) {
      toast(err.response?.data?.message || 'Bulk upload failed', 'error');
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div>
      <SectionHeader
        title={role === 'Policyholder' ? 'My Claims' : 'Claims Queue'}
        subtitle={loading ? 'Loading claims...' : `${filtered.length} claim${filtered.length !== 1 ? 's' : ''} found`}
        actions={
          <>
            {(role === 'Policyholder' || role === 'Partner/TPA') && (
              <button className="btn btn-primary" onClick={() => { setSelectedClaim(null as any); setActive('newclaim'); }}>➕ New Claim</button>
            )}
            {(role === 'Partner/TPA' || role === 'Admin') && (
              <>
                <button className="btn btn-primary" onClick={() => fileInputRef.current?.click()}>⬆️ Upload CSV (Bulk)</button>
                <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept=".csv" onChange={handleBulkUpload} />
              </>
            )}
            <button className="btn btn-secondary" onClick={handleExport}>⬇️ Export CSV</button>
          </>
        }
      />

      {/* Filter bar */}
      <div className="card mb-4" style={{ padding: '1rem 1.5rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.875rem', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', background: '#f1f5f9', borderRadius: 10, padding: '.5rem .875rem', flex: '1 1 220px', maxWidth: 320 }}>
            <span style={{ color: '#94a3b8' }}>🔎</span>
            <input
              style={{ background: 'transparent', border: 'none', outline: 'none', fontFamily: 'inherit', fontSize: '.875rem', width: '100%', color: '#1e293b' }}
              placeholder="Search by ID, name, type…"
              value={rawSearch}
              onChange={(e) => setRawSearch(e.target.value)}
            />
            {rawSearch && (
              <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }} onClick={() => setRawSearch('')}>✕</button>
            )}
          </div>

          <div>
            <div style={{ fontSize: '.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: '.375rem' }}>Status</div>
            <FilterPills options={STATUSES} active={statusFilter} onChange={setStatusFilter} />
          </div>
          <div>
            <div style={{ fontSize: '.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: '.375rem' }}>Priority</div>
            <FilterPills options={PRIORITIES} active={priorityFilter} onChange={setPriorityFilter} />
          </div>
          {role !== 'Policyholder' && (
            <div>
              <div style={{ fontSize: '.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: '.375rem' }}>Assignee</div>
              <FilterPills options={['All', 'Unassigned', 'Mine']} active={assigneeFilter} onChange={setAssigneeFilter} />
            </div>
          )}
          {(statusFilter !== 'All' || priorityFilter !== 'All' || rawSearch) && (
            <button className="btn btn-ghost btn-sm" onClick={() => { setStatusFilter('All'); setPriorityFilter('All'); setRawSearch(''); }}>
              ✕ Clear
            </button>
          )}
        </div>
      </div>

      {role !== 'Policyholder' && selectedIds.length > 0 && (
        <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div><span style={{ fontWeight: 600, color: '#1e40af' }}>{selectedIds.length}</span> claims selected</div>
          <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center' }}>
            <select className="form-control" style={{ width: 200, padding: '.375rem .75rem' }} value={bulkAssignee} onChange={e => setBulkAssignee(e.target.value)}>
              <option value="">Select Adjuster...</option>
              <option value="2">Alice Adjuster</option>
              <option value="5">Jane Smith</option>
            </select>
            <button className="btn btn-primary btn-sm" onClick={handleBulkAssign} disabled={!bulkAssignee || loading}>
              {loading ? 'Assigning...' : 'Bulk Assign'}
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="card">
        {pageItems.length === 0 ? (
          <EmptyState
            icon="📭"
            title="No claims found"
            description="Try adjusting your search or filter criteria."
            action={<button className="btn btn-primary" onClick={() => { setStatusFilter('All'); setPriorityFilter('All'); setRawSearch(''); }}>Clear filters</button>}
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table>
                <thead>
                  <tr>
                    {role !== 'Policyholder' && (
                      <th style={{ width: 40, textAlign: 'center' }}>
                        <input type="checkbox" checked={selectedIds.length === pageItems.length && pageItems.length > 0} onChange={toggleAll} />
                      </th>
                    )}
                    <th>Claim ID</th>
                    <th>Type</th>
                    <th>Policyholder</th>
                    <th>Policy</th>
                    <th>Status</th>
                    <th>Priority</th>
                    <th>Amount</th>
                    <th>Filed</th>
                    {role !== 'Policyholder' && <th>Assignee</th>}
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {pageItems.map((c) => (
                    <tr key={c.id} style={{ cursor: 'pointer', background: c.isOverdue ? '#fff1f2' : undefined }} onClick={() => { setSelectedClaim(c); setActive(c.status?.toUpperCase() === 'DRAFT' && role === 'Policyholder' ? 'newclaim' : 'claimdetail'); }}>
                      {role !== 'Policyholder' && (
                        <td onClick={e => e.stopPropagation()} style={{ textAlign: 'center' }}>
                          <input type="checkbox" checked={selectedIds.includes(c.id)} onChange={() => toggleSelect(c.id)} />
                        </td>
                      )}
                      <td>
                        <span className="mono fw-600" style={{ color: '#2563eb', fontSize: '.8125rem' }}>{c.referenceNumber || c.id}</span>
                        {c.isOverdue && <span style={{ marginLeft: '8px', fontSize: '.7rem', color: '#e11d48', fontWeight: 700, padding: '2px 6px', background: '#ffe4e6', borderRadius: 4 }}>OVERDUE ({c.daysOverdue}d)</span>}
                      </td>
                      <td>
                        <span className="text-sm">{
                          c.type === 'Auto' ? '🚗' : c.type === 'Health' ? '🏥' : c.type === 'Property' ? '🏠' : c.type === 'Life' ? '❤️' : '📋'
                        } {c.type}</span>
                      </td>
                      <td className="text-sm fw-500">{c.policyholder}</td>
                      <td><span className="mono text-xs text-muted">{c.policyId}</span></td>
                      <td><StatusBadge status={c.status} /></td>
                      <td><PriorityBadge priority={c.priority} /></td>
                      <td><span className="mono text-sm fw-600">{formatCurrency(c.amount)}</span></td>
                      <td className="text-sm text-muted">{formatDate(c.filedDate)}</td>
                      {role !== 'Policyholder' && (
                        <td className="text-sm">
                          {c.assignee === 'Unassigned'
                            ? <span className="text-muted">Unassigned</span>
                            : c.assignee}
                        </td>
                      )}
                      <td onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'flex', gap: '.375rem' }}>
                          <button
                            className="btn btn-ghost btn-sm"
                            style={{ color: '#2563eb' }}
                            onClick={() => { setSelectedClaim(c); setActive(c.status?.toUpperCase() === 'DRAFT' && role === 'Policyholder' ? 'newclaim' : 'claimdetail'); }}
                          >
                            {c.status?.toUpperCase() === 'DRAFT' && role === 'Policyholder' ? 'Edit Draft →' : 'View →'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Paginator
              page={page} totalPages={totalPages}
              total={filtered.length} pageSize={8}
              onPrev={prev} onNext={next} onGoTo={() => {}}
            />
          </>
        )}
      </div>
    </div>
  );
}
