import { useState, useEffect } from 'react';
import { api } from '@/services/api';
import { SectionHeader } from '@/components/shared';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';

export const AdminDashboardPage = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  
  const [filters, setFilters] = useState({
    from: '',
    to: '',
    product: '',
    region: '',
    channel: '',
    premiumProxy: '1000000'
  });
  
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart');

  const COLORS = ['#2563eb', '#16a34a', '#dc2626', '#f59e0b', '#8b5cf6'];

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.from) params.append('from', filters.from + 'T00:00:00');
      if (filters.to) params.append('to', filters.to + 'T23:59:59');
      if (filters.product && filters.product !== 'ALL') params.append('product', filters.product);
      if (filters.region && filters.region !== 'ALL') params.append('region', filters.region);
      if (filters.channel && filters.channel !== 'ALL') params.append('channel', filters.channel);
      if (filters.premiumProxy) params.append('premiumProxy', filters.premiumProxy);

      const response = await api.get(`/reports/dashboard?${params.toString()}`);
      setData(response.data.data);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to load dashboard', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const handleExport = async () => {
    const params = new URLSearchParams();
    if (filters.from) params.append('from', filters.from + 'T00:00:00');
    if (filters.to) params.append('to', filters.to + 'T23:59:59');
    if (filters.product && filters.product !== 'ALL') params.append('product', filters.product);
    if (filters.region && filters.region !== 'ALL') params.append('region', filters.region);
    if (filters.channel && filters.channel !== 'ALL') params.append('channel', filters.channel);
    if (filters.premiumProxy) params.append('premiumProxy', filters.premiumProxy);
    try {
      const res = await api.get(`/reports/export/metrics?${params.toString()}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'dashboard-metrics.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error("Failed to export metrics", err);
    }
  };

  if (!data && loading) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '16rem', color: '#64748b' }}>Loading...</div>;
  }

  if (!data) return null;

  return (
    <div>
      <SectionHeader 
        title="Operational Dashboard" 
        subtitle={`Analytics and performance metrics. Last updated: ${lastUpdated.toLocaleTimeString()}`}
        actions={
          <div style={{ display: 'flex', gap: '.625rem', alignItems: 'center' }}>
            <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: '6px', padding: '2px', marginRight: '1rem' }}>
              <button 
                onClick={() => setViewMode('chart')}
                style={{ padding: '4px 12px', border: 'none', borderRadius: '4px', background: viewMode === 'chart' ? '#fff' : 'transparent', boxShadow: viewMode === 'chart' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', cursor: 'pointer', fontSize: '.875rem', fontWeight: viewMode === 'chart' ? 600 : 400, color: viewMode === 'chart' ? '#0f172a' : '#64748b' }}
              >📈 Chart</button>
              <button 
                onClick={() => setViewMode('table')}
                style={{ padding: '4px 12px', border: 'none', borderRadius: '4px', background: viewMode === 'table' ? '#fff' : 'transparent', boxShadow: viewMode === 'table' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', cursor: 'pointer', fontSize: '.875rem', fontWeight: viewMode === 'table' ? 600 : 400, color: viewMode === 'table' ? '#0f172a' : '#64748b' }}
              >📋 Table</button>
            </div>
            <button className="btn btn-secondary" onClick={fetchDashboard} disabled={loading}>
              {loading ? 'Refreshing...' : '🔄 Refresh'}
            </button>
            <button className="btn btn-secondary" onClick={handleExport}>
              ⬇️ Export CSV
            </button>
          </div>
        }
      />

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div className="form-group" style={{ flex: 1, minWidth: '150px', marginBottom: 0 }}>
            <label className="form-label">From Date</label>
            <input className="form-control" type="date" value={filters.from} onChange={(e: any) => setFilters(prev => ({ ...prev, from: e.target.value }))} />
          </div>
          <div className="form-group" style={{ flex: 1, minWidth: '150px', marginBottom: 0 }}>
            <label className="form-label">To Date</label>
            <input className="form-control" type="date" value={filters.to} onChange={(e: any) => setFilters(prev => ({ ...prev, to: e.target.value }))} />
          </div>
          <div className="form-group" style={{ flex: 1, minWidth: '150px', marginBottom: 0 }}>
            <label className="form-label">Product Type</label>
            <select className="form-control" value={filters.product} onChange={(e: any) => setFilters(prev => ({ ...prev, product: e.target.value }))}>
              <option value="ALL">All Products</option>
              <option value="AUTO">Auto</option>
              <option value="HOME">Home</option>
              <option value="HEALTH">Health</option>
            </select>
          </div>
          <div className="form-group" style={{ flex: 1, minWidth: '150px', marginBottom: 0 }}>
            <label className="form-label">Region</label>
            <select className="form-control" value={filters.region} onChange={(e: any) => setFilters(prev => ({ ...prev, region: e.target.value }))}>
              <option value="ALL">All Regions</option>
              <option value="North">North</option>
              <option value="South">South</option>
              <option value="East">East</option>
              <option value="West">West</option>
            </select>
          </div>
          <div className="form-group" style={{ flex: 1, minWidth: '150px', marginBottom: 0 }}>
            <label className="form-label">Channel</label>
            <select className="form-control" value={filters.channel} onChange={(e: any) => setFilters(prev => ({ ...prev, channel: e.target.value }))}>
              <option value="ALL">All Channels</option>
              <option value="Direct">Direct</option>
              <option value="Agent">Agent</option>
              <option value="Broker">Broker</option>
              <option value="Online">Online</option>
            </select>
          </div>
          <div className="form-group" style={{ flex: 1, minWidth: '150px', marginBottom: 0 }}>
            <label className="form-label">Premium Proxy ($)</label>
            <input className="form-control" type="number" value={filters.premiumProxy} onChange={(e: any) => setFilters(prev => ({ ...prev, premiumProxy: e.target.value }))} />
          </div>
          <button className="btn btn-primary" onClick={fetchDashboard} disabled={loading}>Apply Filters</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
        <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
          <div style={{ fontSize: '.875rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Loss Ratio (Lite)</div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: '#0f172a' }}>{data.lossRatioSummary?.lossRatioPercent?.toFixed(2)}%</div>
          <div style={{ fontSize: '.75rem', color: '#64748b' }}>Based on ${data.lossRatioSummary?.premiumProxy?.toLocaleString()} premium proxy</div>
        </div>
        <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
          <div style={{ fontSize: '.875rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Total Paid</div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: '#16a34a' }}>${data.lossRatioSummary?.totalPaid?.toLocaleString()}</div>
        </div>
        <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
          <div style={{ fontSize: '.875rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Fraud Flags</div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: '#f59e0b' }}>{data.fraudSummary?.totalFlagged}</div>
          <div style={{ fontSize: '.75rem', color: '#64748b' }}>{data.fraudSummary?.resolvedDenied} resolved, {data.fraudSummary?.pendingInvestigation} pending</div>
        </div>
        <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
          <div style={{ fontSize: '.875rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Active Adjusters</div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: '#2563eb' }}>{data.adjusterWorkload?.length || 0}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
        <div className="card">
          <div style={{ marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Claim Volume & Outcomes</h3>
            <p style={{ fontSize: '.875rem', color: '#64748b' }}>Monthly claims filed by outcome</p>
          </div>
          <div style={{ height: '300px', overflowY: 'auto' }}>
            {viewMode === 'chart' ? (
              data.claimVolumeAndOutcomes?.length > 0 ? (
                <ResponsiveContainer width="99%" height="100%">
                  <BarChart data={data.claimVolumeAndOutcomes}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="period" axisLine={false} tickLine={false} />
                    <YAxis axisLine={false} tickLine={false} />
                    <RechartsTooltip cursor={{ fill: '#f8fafc' }} />
                    <Legend />
                    <Bar dataKey="approved" stackId="a" fill="#16a34a" name="Approved" isAnimationActive={false} />
                    <Bar dataKey="partial" stackId="a" fill="#f59e0b" name="Partial" isAnimationActive={false} />
                    <Bar dataKey="denied" stackId="a" fill="#dc2626" name="Denied" isAnimationActive={false} />
                    <Bar dataKey="pending" stackId="a" fill="#94a3b8" name="Pending" isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                  No data available for the selected period
                </div>
              )
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.875rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left', color: '#64748b' }}>
                    <th style={{ padding: '8px' }}>Period</th>
                    <th style={{ padding: '8px' }}>Approved</th>
                    <th style={{ padding: '8px' }}>Partial</th>
                    <th style={{ padding: '8px' }}>Denied</th>
                    <th style={{ padding: '8px' }}>Pending</th>
                    <th style={{ padding: '8px' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {data.claimVolumeAndOutcomes?.map((row: any, i: number) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '8px' }}>{row.period}</td>
                      <td style={{ padding: '8px' }}>{row.approved}</td>
                      <td style={{ padding: '8px' }}>{row.partial}</td>
                      <td style={{ padding: '8px' }}>{row.denied}</td>
                      <td style={{ padding: '8px' }}>{row.pending}</td>
                      <td style={{ padding: '8px', fontWeight: 600 }}>{row.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="card">
          <div style={{ marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Average TAT by Product</h3>
            <p style={{ fontSize: '.875rem', color: '#64748b' }}>Turnaround time in days</p>
          </div>
          <div style={{ height: '300px', overflowY: 'auto' }}>
            {viewMode === 'chart' ? (
              data.tatByStageAndProduct?.length > 0 ? (
                <ResponsiveContainer width="99%" height="100%">
                  <BarChart data={data.tatByStageAndProduct} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                    <XAxis type="number" axisLine={false} tickLine={false} />
                    <YAxis dataKey="product" type="category" axisLine={false} tickLine={false} />
                    <RechartsTooltip cursor={{ fill: '#f8fafc' }} />
                    <Bar dataKey="avgDays" fill="#2563eb" name="Avg Days" radius={[0, 4, 4, 0]} isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                  No completed claims found to calculate TAT
                </div>
              )
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.875rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left', color: '#64748b' }}>
                    <th style={{ padding: '8px' }}>Product</th>
                    <th style={{ padding: '8px' }}>Average TAT (Days)</th>
                  </tr>
                </thead>
                <tbody>
                  {data.tatByStageAndProduct?.map((row: any, i: number) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '8px' }}>{row.product}</td>
                      <td style={{ padding: '8px', fontWeight: 600 }}>{row.avgDays}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="card">
          <div style={{ marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Adjuster Workload</h3>
            <p style={{ fontSize: '.875rem', color: '#64748b' }}>Active claims per adjuster</p>
          </div>
          <div style={{ height: '300px', overflowY: 'auto' }}>
            {viewMode === 'chart' ? (
              data.adjusterWorkload?.length > 0 ? (
                <ResponsiveContainer width="99%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.adjusterWorkload}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="activeClaims"
                      nameKey="adjuster"
                      isAnimationActive={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {data.adjusterWorkload?.map((_: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                  No active adjusters assigned
                </div>
              )
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.875rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left', color: '#64748b' }}>
                    <th style={{ padding: '8px' }}>Adjuster</th>
                    <th style={{ padding: '8px' }}>Active Claims</th>
                  </tr>
                </thead>
                <tbody>
                  {data.adjusterWorkload?.map((row: any, i: number) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '8px' }}>{row.adjuster}</td>
                      <td style={{ padding: '8px', fontWeight: 600 }}>{row.activeClaims}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="card">
          <div style={{ marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Claims by Status</h3>
            <p style={{ fontSize: '.875rem', color: '#64748b' }}>Current snapshot</p>
          </div>
          <div style={{ height: '300px', overflowY: 'auto' }}>
            {viewMode === 'chart' ? (
              <ResponsiveContainer width="99%" height="100%">
                <PieChart>
                  <Pie
                    data={Object.entries(data.claimsByStatus || {}).map(([name, value]) => ({ name, value }))}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    dataKey="value"
                    isAnimationActive={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {Object.entries(data.claimsByStatus || {}).map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.875rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left', color: '#64748b' }}>
                    <th style={{ padding: '8px' }}>Status</th>
                    <th style={{ padding: '8px' }}>Count</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(data.claimsByStatus || {}).map(([name, value]: any, i: number) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '8px' }}>{name}</td>
                      <td style={{ padding: '8px', fontWeight: 600 }}>{value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
