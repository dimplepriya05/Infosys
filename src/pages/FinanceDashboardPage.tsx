import { useState, useEffect } from 'react';
import { paymentsApi, claimsApi } from '@/services/api';
import { useToast } from '@/context/ToastContext';
import { Payment, Claim } from '@/types';
import { formatCurrency, formatDateTime } from '@/utils/helpers';
import { SectionHeader, Badge, Avatar, Tabs } from '@/components/shared';

export const FinanceDashboardPage = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'settlements' | 'reconciliation' | 'ledger'>('overview');
  
  // Data State
  const [payments, setPayments] = useState<Payment[]>([]);
  const [settlementClaims, setSettlementClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Reconciliation State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [reconcileStatus, setReconcileStatus] = useState('CONFIRMED');
  const [remarks, setRemarks] = useState('');
  
  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [activeClaim, setActiveClaim] = useState<Claim | null>(null);
  const [paymentForm, setPaymentForm] = useState({
    paymentMethod: 'Bank Transfer',
    amount: '',
    accountDetails: '',
    bankName: '',
    ifscCode: '',
    beneficiaryName: '',
    remarks: ''
  });

  const toast = useToast();

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const res = await paymentsApi.getAll();
      setPayments(res.data.data);
    } catch (error) {
      console.error(error);
      toast('Failed to load payments', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchSettlementClaims = async () => {
    try {
      const res = await claimsApi.list({ status: 'SETTLEMENT', size: '100' });
      const content = res.data?.data?.content || res.data?.data || [];
      // Filter out claims that are fully paid
      const readyClaims = content.filter((c: Claim) => {
        const approved = c.approvedAmount || 0;
        const paid = c.paidAmount || 0;
        return approved > 0 && paid < approved;
      });
      setSettlementClaims(readyClaims);
    } catch (e) {
      console.error(e);
      toast('Failed to load pending settlements', 'error');
    }
  };

  useEffect(() => {
    fetchPayments();
    fetchSettlementClaims();
  }, []);

  // --- Actions ---

  const handleExport = async () => {
    try {
      const res = await paymentsApi.export();
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'finance-payouts-ledger.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error("Failed to export ledger", err);
      toast('Failed to export ledger', 'error');
    }
  };

  const handleDownloadReceipt = async (paymentId: number, txnRef: string) => {
    try {
      const res = await paymentsApi.downloadReceipt(paymentId);
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Receipt_${txnRef}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error("Failed to download receipt", err);
      toast('Failed to download receipt. It may not be generated yet.', 'error');
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleReconcile = async () => {
    if (!selectedIds.length) {
      toast('Select at least one payment to reconcile', 'warning');
      return;
    }
    const payload = selectedIds.map(id => {
      const p = payments.find(x => x.id === id);
      return {
        transactionReference: p?.transactionReference || p?.referenceNumber,
        status: reconcileStatus,
        remarks: remarks
      };
    });
    
    try {
      await paymentsApi.reconcile(payload);
      toast(`Successfully reconciled ${selectedIds.length} payments as ${reconcileStatus}`, 'success');
      setSelectedIds([]);
      setRemarks('');
      fetchPayments();
      fetchSettlementClaims();
    } catch (e: any) {
      toast('Failed to reconcile payments', 'error');
    }
  };

  const handleRetry = async (paymentId: string) => {
    try {
      await paymentsApi.retry(Number(paymentId));
      toast('Payment retried successfully', 'success');
      fetchPayments();
    } catch (e: any) {
      toast('Failed to retry payment', 'error');
    }
  };

  const openPaymentModal = (claim: Claim) => {
    setActiveClaim(claim);
    const approved = claim.approvedAmount || 0;
    const paid = claim.paidAmount || 0;
    const balance = Math.max(0, approved - paid);
    
    setPaymentForm({
      paymentMethod: 'Bank Transfer',
      amount: balance.toString(),
      accountDetails: '',
      bankName: '',
      ifscCode: '',
      beneficiaryName: claim.policyholder || '',
      remarks: 'Settlement Payment'
    });
    setShowModal(true);
  };

  const submitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeClaim) return;
    try {
      await paymentsApi.initiate(Number(activeClaim.id), {
        ...paymentForm,
        paymentMethod: paymentForm.paymentMethod.toUpperCase().replace(' ', '_')
      });
      toast('Payment initiated successfully', 'success');
      setShowModal(false);
      fetchPayments();
      fetchSettlementClaims();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to initiate payment';
      toast(msg, 'error');
    }
  };

  // --- Derived Metrics ---
  const pendingPayments = payments.filter(p => ['PENDING', 'INITIATED', 'PROCESSING'].includes(p.status?.toUpperCase() || ''));
  const failedPayments = payments.filter(p => p.status?.toUpperCase() === 'FAILED');
  const confirmedPayments = payments.filter(p => p.status?.toUpperCase() === 'CONFIRMED');

  const totalDisbursed = confirmedPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const totalPendingAmount = pendingPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const totalFailedAmount = failedPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

  return (
    <div style={{ paddingBottom: '3rem' }}>
      <SectionHeader 
        title="Finance & Payouts"
        subtitle="Manage settlements, reconcile payments, and export ledgers."
        actions={
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button className="btn btn-outline" onClick={() => { fetchPayments(); fetchSettlementClaims(); }} disabled={loading}>
              🔄 Refresh
            </button>
            <button className="btn btn-primary" onClick={handleExport}>
              📥 Export Ledger
            </button>
          </div>
        }
      />

      {/* Tabs */}
      <Tabs
        tabs={[
          { id: 'overview', label: 'Overview' },
          { id: 'settlements', label: `Pending Settlements (${settlementClaims.length})` },
          { id: 'reconciliation', label: `Reconciliation (${pendingPayments.length})` },
          { id: 'ledger', label: 'Ledger & Receipts' }
        ]}
        active={activeTab}
        onChange={(id) => setActiveTab(id as any)}
      />

      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
            <div className="card" style={{ padding: '1.5rem' }}>
              <div style={{ fontSize: '0.875rem', color: 'var(--gray-500)', fontWeight: 500 }}>Total Disbursed</div>
              <div style={{ fontSize: '2rem', fontWeight: 700, marginTop: '0.5rem', color: 'var(--gray-900)' }}>{formatCurrency(totalDisbursed)}</div>
              <div style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: 'var(--green)' }}>✓ Confirmed Payments</div>
            </div>
            <div className="card" style={{ padding: '1.5rem' }}>
              <div style={{ fontSize: '0.875rem', color: 'var(--gray-500)', fontWeight: 500 }}>Pending Processing</div>
              <div style={{ fontSize: '2rem', fontWeight: 700, marginTop: '0.5rem', color: 'var(--gray-900)' }}>{formatCurrency(totalPendingAmount)}</div>
              <div style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: 'var(--yellow)' }}>⏳ Awaiting Gateway</div>
            </div>
            <div className="card" style={{ padding: '1.5rem' }}>
              <div style={{ fontSize: '0.875rem', color: 'var(--gray-500)', fontWeight: 500 }}>Failed Payments</div>
              <div style={{ fontSize: '2rem', fontWeight: 700, marginTop: '0.5rem', color: 'var(--red)' }}>{formatCurrency(totalFailedAmount)}</div>
              <div style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: 'var(--red)' }}>❌ Requires Retry</div>
            </div>
            <div className="card" style={{ padding: '1.5rem' }}>
              <div style={{ fontSize: '0.875rem', color: 'var(--gray-500)', fontWeight: 500 }}>Ready for Settlement</div>
              <div style={{ fontSize: '2rem', fontWeight: 700, marginTop: '0.5rem', color: 'var(--gray-900)' }}>{settlementClaims.length} Claims</div>
              <div style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: 'var(--primary)' }}>Action Required</div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'settlements' && (
        <div className="card">
          <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--gray-200)' }}>
            <h3 style={{ margin: 0, fontSize: '1.125rem' }}>Claims Ready For Settlement</h3>
            <p style={{ margin: 0, marginTop: '0.25rem', color: 'var(--gray-500)', fontSize: '0.875rem' }}>
              These claims have been approved and moved to the SETTLEMENT phase. Initiate full or partial payments.
            </p>
          </div>
          <table className="table">
            <thead>
              <tr>
                <th>Claim Ref</th>
                <th>Policyholder</th>
                <th>Approved Amount</th>
                <th>Paid So Far</th>
                <th>Remaining Balance</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {settlementClaims.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--gray-500)' }}>No pending settlements.</td></tr>
              ) : settlementClaims.map(claim => {
                const approved = claim.approvedAmount || 0;
                const paid = claim.paidAmount || 0;
                const balance = Math.max(0, approved - paid);
                return (
                  <tr key={claim.id}>
                    <td style={{ fontWeight: 500 }}>{claim.referenceNumber}</td>
                    <td>{claim.policyholder}</td>
                    <td>{formatCurrency(approved)}</td>
                    <td style={{ color: paid > 0 ? 'var(--green)' : 'inherit' }}>{formatCurrency(paid)}</td>
                    <td style={{ fontWeight: 600 }}>{formatCurrency(balance)}</td>
                    <td>
                      <button className="btn btn-sm btn-primary" onClick={() => openPaymentModal(claim)}>
                        Initiate Payment
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'reconciliation' && (
        <div className="card">
          <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--gray-200)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.125rem' }}>Payment Reconciliation</h3>
              <p style={{ margin: 0, marginTop: '0.25rem', color: 'var(--gray-500)', fontSize: '0.875rem' }}>
                Batch process pending payments to confirm or fail them based on gateway logs.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <select className="form-input" style={{ width: '150px' }} value={reconcileStatus} onChange={(e) => setReconcileStatus(e.target.value)}>
                <option value="CONFIRMED">Confirm</option>
                <option value="FAILED">Mark Failed</option>
              </select>
              <input type="text" className="form-input" placeholder="Remarks..." value={remarks} onChange={(e) => setRemarks(e.target.value)} />
              <button className="btn btn-primary" onClick={handleReconcile}>
                Apply ({selectedIds.length})
              </button>
            </div>
          </div>
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: '40px' }}>
                  <input type="checkbox" onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedIds(pendingPayments.concat(failedPayments).map(p => p.id));
                    } else {
                      setSelectedIds([]);
                    }
                  }} />
                </th>
                <th>Txn Ref</th>
                <th>Claim Ref</th>
                <th>Amount</th>
                <th>Method</th>
                <th>Status</th>
                <th>Details / Error</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {pendingPayments.concat(failedPayments).length === 0 ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--gray-500)' }}>No pending or failed payments to reconcile.</td></tr>
              ) : pendingPayments.concat(failedPayments).map(p => (
                <tr key={p.id}>
                  <td>
                    <input type="checkbox" checked={selectedIds.includes(p.id)} onChange={() => toggleSelect(p.id)} />
                  </td>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{p.transactionReference || p.referenceNumber}</td>
                  <td>{p.claimReferenceNumber || '—'}</td>
                  <td style={{ fontWeight: 600 }}>{formatCurrency(p.amount)}</td>
                  <td>{p.paymentMethod || p.method}</td>
                  <td>
                    <Badge variant={p.status?.toUpperCase() === 'FAILED' ? 'red' : 'yellow'}>{p.status}</Badge>
                  </td>
                  <td style={{ fontSize: '0.85rem', color: p.status?.toUpperCase() === 'FAILED' ? 'var(--red)' : 'var(--gray-500)' }}>
                    {p.failureReason || p.remarks || '—'}
                  </td>
                  <td>
                    {p.status?.toUpperCase() === 'FAILED' && (
                      <button className="btn btn-sm btn-outline" onClick={() => handleRetry(p.id)}>
                        Retry
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'ledger' && (
        <div className="card">
          <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--gray-200)' }}>
            <h3 style={{ margin: 0, fontSize: '1.125rem' }}>Confirmed Ledger & Receipts</h3>
            <p style={{ margin: 0, marginTop: '0.25rem', color: 'var(--gray-500)', fontSize: '0.875rem' }}>
              Historical record of all successful disbursements.
            </p>
          </div>
          <table className="table">
            <thead>
              <tr>
                <th>Txn Ref</th>
                <th>Claim Ref</th>
                <th>Beneficiary</th>
                <th>Amount</th>
                <th>Date Confirmed</th>
                <th>Receipt</th>
              </tr>
            </thead>
            <tbody>
              {confirmedPayments.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--gray-500)' }}>No confirmed payments found.</td></tr>
              ) : confirmedPayments.map(p => (
                <tr key={p.id}>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.85rem', fontWeight: 600 }}>{p.transactionReference || p.referenceNumber}</td>
                  <td>{p.claimReferenceNumber || '—'}</td>
                  <td>{p.beneficiaryName || '—'}</td>
                  <td style={{ color: 'var(--green)', fontWeight: 600 }}>{formatCurrency(p.amount)}</td>
                  <td>{formatDateTime(p.confirmedAt || '')}</td>
                  <td>
                    <button 
                      className="btn btn-sm btn-outline" 
                      onClick={() => handleDownloadReceipt(Number(p.id), p.transactionReference || p.referenceNumber || '')}
                      disabled={!p.receiptPath}
                      title={!p.receiptPath ? "Receipt PDF not generated yet" : "Download PDF"}
                    >
                      {p.receiptPath ? '📄 Download' : '⏳ Pending'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Initiation Modal */}
      {showModal && activeClaim && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h3>Initiate Payment</h3>
              <button className="btn-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <div className="modal-body" style={{ padding: '1.5rem' }}>
              <div style={{ background: 'var(--gray-50)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--gray-500)', fontSize: '0.875rem' }}>Claim Reference</span>
                  <span style={{ fontWeight: 600 }}>{activeClaim.referenceNumber}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--gray-500)', fontSize: '0.875rem' }}>Approved Amount</span>
                  <span style={{ fontWeight: 600 }}>{formatCurrency(activeClaim.approvedAmount || 0)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--gray-500)', fontSize: '0.875rem' }}>Paid So Far</span>
                  <span style={{ color: 'var(--green)' }}>{formatCurrency(activeClaim.paidAmount || 0)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--gray-200)', paddingTop: '0.5rem', marginTop: '0.5rem' }}>
                  <span style={{ color: 'var(--gray-900)', fontWeight: 600 }}>Remaining Balance</span>
                  <span style={{ fontWeight: 700, fontSize: '1.125rem' }}>{formatCurrency(Math.max(0, (activeClaim.approvedAmount || 0) - (activeClaim.paidAmount || 0)))}</span>
                </div>
              </div>

              <form id="payment-form" onSubmit={submitPayment} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label className="form-label">Amount to Pay</label>
                    <input 
                      type="number" 
                      className="form-input" 
                      step="0.01"
                      required 
                      max={Math.max(0, (activeClaim.approvedAmount || 0) - (activeClaim.paidAmount || 0))}
                      value={paymentForm.amount} 
                      onChange={e => setPaymentForm({...paymentForm, amount: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="form-label">Payment Method</label>
                    <select 
                      className="form-input" 
                      value={paymentForm.paymentMethod} 
                      onChange={e => setPaymentForm({...paymentForm, paymentMethod: e.target.value})}
                    >
                      <option>Bank Transfer</option>
                      <option>UPI</option>
                      <option>Cheque</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="form-label">Beneficiary Name</label>
                  <input type="text" className="form-input" required value={paymentForm.beneficiaryName} onChange={e => setPaymentForm({...paymentForm, beneficiaryName: e.target.value})} />
                </div>
                
                {paymentForm.paymentMethod === 'Bank Transfer' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label className="form-label">Account Number</label>
                      <input type="text" className="form-input" required value={paymentForm.accountDetails} onChange={e => setPaymentForm({...paymentForm, accountDetails: e.target.value})} />
                    </div>
                    <div>
                      <label className="form-label">IFSC / Routing Code</label>
                      <input type="text" className="form-input" required value={paymentForm.ifscCode} onChange={e => setPaymentForm({...paymentForm, ifscCode: e.target.value})} />
                    </div>
                  </div>
                )}
                {paymentForm.paymentMethod === 'UPI' && (
                  <div>
                    <label className="form-label">UPI ID</label>
                    <input type="text" className="form-input" required value={paymentForm.accountDetails} onChange={e => setPaymentForm({...paymentForm, accountDetails: e.target.value})} placeholder="example@bank" />
                  </div>
                )}

                <div>
                  <label className="form-label">Remarks</label>
                  <textarea className="form-input" rows={2} value={paymentForm.remarks} onChange={e => setPaymentForm({...paymentForm, remarks: e.target.value})}></textarea>
                </div>
              </form>
            </div>
            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', padding: '1rem 1.5rem', borderTop: '1px solid var(--gray-200)' }}>
              <button className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
              <button type="submit" form="payment-form" className="btn btn-primary">Submit Payment</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
