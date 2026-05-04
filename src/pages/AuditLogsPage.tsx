import { useState, useEffect } from 'react';
import { api, auditApi } from '@/services/api';
import { format } from 'date-fns';
import { SectionHeader, Alert } from '@/components/shared';

interface AuditLog {
  id: number;
  userId: number | null;
  userName: string;
  action: string;
  entityType: string;
  entityId: number | null;
  details: string;
  ipAddress: string;
  success: boolean;
  createdAt: string;
  hashSummary: string;
}

export const AuditLogsPage = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<{ valid: boolean, message: string } | null>(null);

  const [filters, setFilters] = useState({
    action: '',
    from: '',
    to: ''
  });

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.action) params.append('action', filters.action);
      if (filters.from) params.append('from', filters.from + 'T00:00:00');
      if (filters.to) params.append('to', filters.to + 'T23:59:59');

      const response = await api.get(`/audit?${params.toString()}`);
      if (response.data.data.content) {
          setLogs(response.data.data.content);
      } else {
          // Fallback if backend pagination differs
          setLogs(response.data.content || response.data.data || []);
      }
    } catch (error) {
      console.error('Failed to load audit logs', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    setVerifying(true);
    setVerifyResult(null);
    try {
      const response = await api.get('/audit/verify');
      setVerifyResult({
        valid: response.data.data,
        message: response.data.data ? 'Cryptographic hash chain is valid. No tampering detected.' : 'Hash chain validation failed! Logs may have been tampered with.'
      });
    } catch (error) {
      setVerifyResult({ valid: false, message: 'Failed to perform integrity check.' });
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div>
      <SectionHeader 
        title="Audit Logs" 
        subtitle="System compliance and integrity monitoring."
        actions={
          <div style={{ display: 'flex', gap: '.625rem' }}>
            <button className="btn btn-secondary" onClick={handleVerify} disabled={verifying}>
              {verifying ? 'Verifying...' : '🛡️ Verify Integrity'}
            </button>
            <button className="btn btn-secondary" onClick={async () => {
              try {
                const res = await auditApi.export();
                const url = window.URL.createObjectURL(new Blob([res.data]));
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute('download', 'audit-logs.csv');
                document.body.appendChild(link);
                link.click();
                link.remove();
              } catch (err) {
                console.error("Failed to export audit logs", err);
              }
            }}>
              ⬇️ Export CSV
            </button>
          </div>
        }
      />

      {verifyResult && (
        <div style={{ marginBottom: '1.5rem' }}>
          <Alert 
            variant={verifyResult.valid ? 'success' : 'danger'} 
            title={verifyResult.valid ? 'Integrity Check Passed' : 'Integrity Violation'}
            children={verifyResult.message}
          />
        </div>
      )}

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Filter Logs</h3>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div className="form-group" style={{ flex: 1, minWidth: '200px', marginBottom: 0 }}>
            <label className="form-label">Action</label>
            <input
              className="form-control"
              placeholder="e.g. LOGIN, UPDATE_CLAIM"
              value={filters.action}
              onChange={(e: any) => setFilters(prev => ({ ...prev, action: e.target.value }))}
            />
          </div>
          <div className="form-group" style={{ flex: 1, minWidth: '200px', marginBottom: 0 }}>
            <label className="form-label">From Date</label>
            <input
              className="form-control"
              type="date"
              value={filters.from}
              onChange={(e: any) => setFilters(prev => ({ ...prev, from: e.target.value }))}
            />
          </div>
          <div className="form-group" style={{ flex: 1, minWidth: '200px', marginBottom: 0 }}>
            <label className="form-label">To Date</label>
            <input
              className="form-control"
              type="date"
              value={filters.to}
              onChange={(e: any) => setFilters(prev => ({ ...prev, to: e.target.value }))}
            />
          </div>
          <button className="btn btn-primary" onClick={fetchLogs} disabled={loading}>
            🔍 Filter
          </button>
        </div>
      </div>

      <div className="card">
        <div className="overflow-x-auto">
          <table>
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Actor</th>
                <th>Action</th>
                <th>Entity</th>
                <th>Details</th>
                <th>IP Address</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    {log.createdAt ? format(new Date(log.createdAt), 'yyyy-MM-dd HH:mm:ss') : 'N/A'}
                  </td>
                  <td>
                    <span style={{ fontWeight: 500 }}>{log.userName}</span> <span className="text-muted" style={{ fontSize: '.8rem' }}>({log.userId || 'System'})</span>
                  </td>
                  <td>
                    <span className="badge badge-gray">{log.action}</span>
                  </td>
                  <td>
                    {log.entityType} {log.entityId ? `#${log.entityId}` : ''}
                  </td>
                  <td style={{ maxWidth: '250px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={log.details}>
                    {log.details}
                  </td>
                  <td className="text-muted">{log.ipAddress}</td>
                  <td>
                    {log.success ? (
                      <span className="badge badge-green">Success</span>
                    ) : (
                      <span className="badge badge-red">Failed</span>
                    )}
                  </td>
                </tr>
              ))}
              {logs.length === 0 && !loading && (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                    No audit logs found matching criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
