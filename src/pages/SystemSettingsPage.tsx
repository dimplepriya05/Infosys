import React, { useState, useEffect, useRef } from 'react';
import { api, settingsApi } from '@/services/api';
import { SectionHeader } from '@/components/shared';
import { useToast } from '@/context/ToastContext';
import { DEFAULT_NOTIFICATION_TEMPLATES, DEFAULT_WORKFLOW_RULE } from '@/data/mockData';

interface SystemSettings {
  maintenance_mode: string;
  password_policy_min_length: string;
  branding_primary_color: string;
  branding_logo_url: string;
  sla_triage_hours: string;
  sla_assessment_hours: string;
  sla_decision_hours: string;
  appeal_window_days: string;
  max_appeals_per_claim: string;
  sla_appeal_review_hours: string;
  session_timeout_minutes: string;
  refresh_timeout_minutes: string;
  template_claim_assigned_subject: string;
  template_claim_assigned_body: string;
  template_payment_confirmed_subject: string;
  template_payment_confirmed_body: string;
  workflow_transitions_json: string;
}

const defaultSettings: SystemSettings = {
  maintenance_mode: 'false',
  password_policy_min_length: '8',
  branding_primary_color: '#2563eb',
  branding_logo_url: '/logo.png',
  sla_triage_hours: '4',
  sla_assessment_hours: '48',
  sla_decision_hours: '72',
  appeal_window_days: '30',
  max_appeals_per_claim: '1',
  sla_appeal_review_hours: '72',
  session_timeout_minutes: '60',
  refresh_timeout_minutes: '1440',
  template_claim_assigned_subject: '',
  template_claim_assigned_body: '',
  template_payment_confirmed_subject: '',
  template_payment_confirmed_body: '',
  workflow_transitions_json: '{}'
};

export const SystemSettingsPage = () => {
  const toast = useToast();
  const [settings, setSettings] = useState<SystemSettings>(defaultSettings);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await api.get('/settings');
      const data = response.data.data;
      
      setSettings((prev) => ({ 
        ...prev, 
        ...data,
        workflow_transitions_json: data.workflow_transitions_json || JSON.stringify(DEFAULT_WORKFLOW_RULE, null, 2),
        template_claim_assigned_subject: data.template_claim_assigned_subject || DEFAULT_NOTIFICATION_TEMPLATES[0].subject,
        template_claim_assigned_body: data.template_claim_assigned_body || DEFAULT_NOTIFICATION_TEMPLATES[0].body,
        template_payment_confirmed_subject: data.template_payment_confirmed_subject || DEFAULT_NOTIFICATION_TEMPLATES[3].subject,
        template_payment_confirmed_body: data.template_payment_confirmed_body || DEFAULT_NOTIFICATION_TEMPLATES[3].body
      }));
    } catch (error) {
      console.error('Failed to load settings', error);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await api.put('/settings', settings);
      
      // Dynamically apply styles
      document.documentElement.style.setProperty('--blue-2', settings.branding_primary_color);
      
      toast('Settings updated successfully', 'success');
    } catch (error: any) {
      toast(error.response?.data?.error || 'Failed to update settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const res = await settingsApi.export();
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'system-config.json');
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast('Config exported successfully', 'success');
    } catch (err) {
      console.error("Failed to export settings", err);
      toast('Failed to export settings', 'error');
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      setLoading(true);
      await api.post('/settings/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast('Settings imported successfully', 'success');
      fetchSettings();
    } catch (error: any) {
      toast(error.response?.data?.error || 'Failed to import settings', 'error');
    } finally {
      setLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleChange = (key: keyof SystemSettings, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div>
      <SectionHeader 
        title="System Settings" 
        subtitle="Manage global system configuration and branding"
        actions={
          <div style={{ display: 'flex', gap: '.625rem' }}>
            <button className="btn btn-secondary" onClick={handleExport}>
              ⬇️ Export Config
            </button>
            <button className="btn btn-secondary" onClick={() => fileInputRef.current?.click()}>
              ⬆️ Import Config
            </button>
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: 'none' }}
              accept=".json"
              onChange={handleImport}
            />
          </div>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
        <div className="card p-6">
          <h3 style={{ fontWeight: 700, marginBottom: '1.5rem', fontSize: '1.0625rem' }}>Platform Configuration</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', background: 'var(--gray-50)', borderRadius: 'var(--radius)', border: '1px solid var(--gray-200)' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '.9375rem', marginBottom: '.25rem' }}>Maintenance Mode</div>
                <div style={{ fontSize: '.8125rem', color: 'var(--gray-500)' }}>Restrict access to Admins only. Active sessions will not be interrupted immediately.</div>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={settings.maintenance_mode === 'true'}
                  onChange={(e) => handleChange('maintenance_mode', e.target.checked ? 'true' : 'false')}
                  style={{ width: '1.2rem', height: '1.2rem', accentColor: 'var(--blue-2)' }}
                />
              </label>
            </div>
            
            <div className="form-group">
              <label className="form-label">Minimum Password Length</label>
              <input
                className="form-control"
                type="number"
                value={settings.password_policy_min_length}
                onChange={(e: any) => handleChange('password_policy_min_length', e.target.value)}
              />
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Session Timeout (min)</label>
                <input
                  className="form-control"
                  type="number"
                  value={settings.session_timeout_minutes}
                  onChange={(e: any) => handleChange('session_timeout_minutes', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Refresh Timeout (min)</label>
                <input
                  className="form-control"
                  type="number"
                  value={settings.refresh_timeout_minutes}
                  onChange={(e: any) => handleChange('refresh_timeout_minutes', e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <h3 style={{ fontWeight: 700, marginBottom: '1.5rem', fontSize: '1.0625rem' }}>Branding & UI</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="form-group">
              <label className="form-label">Primary Color (Hex)</label>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <input
                  type="color"
                  value={settings.branding_primary_color}
                  onChange={(e: any) => handleChange('branding_primary_color', e.target.value)}
                  style={{ width: '50px', height: '40px', padding: 0, border: 'none', cursor: 'pointer' }}
                />
                <input
                  className="form-control"
                  type="text"
                  value={settings.branding_primary_color}
                  onChange={(e: any) => handleChange('branding_primary_color', e.target.value)}
                  style={{ flex: 1 }}
                />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Logo URL</label>
              <input
                className="form-control"
                value={settings.branding_logo_url}
                onChange={(e: any) => handleChange('branding_logo_url', e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="card p-6" style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ fontWeight: 700, marginBottom: '1.5rem', fontSize: '1.0625rem' }}>Service Level Agreements (SLA in Hours)</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
          <div className="form-group">
            <label className="form-label">Triage Stage</label>
            <input
              className="form-control"
              type="number"
              value={settings.sla_triage_hours}
              onChange={(e: any) => handleChange('sla_triage_hours', e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Assessment Stage</label>
            <input
              className="form-control"
              type="number"
              value={settings.sla_assessment_hours}
              onChange={(e: any) => handleChange('sla_assessment_hours', e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Decision Stage</label>
            <input
              className="form-control"
              type="number"
              value={settings.sla_decision_hours}
              onChange={(e: any) => handleChange('sla_decision_hours', e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Appeal Review Stage</label>
            <input
              className="form-control"
              type="number"
              value={settings.sla_appeal_review_hours}
              onChange={(e: any) => handleChange('sla_appeal_review_hours', e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Appeal Window (Days)</label>
            <input
              className="form-control"
              type="number"
              value={settings.appeal_window_days}
              onChange={(e: any) => handleChange('appeal_window_days', e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Max Appeals Per Claim</label>
            <input
              className="form-control"
              type="number"
              value={settings.max_appeals_per_claim}
              onChange={(e: any) => handleChange('max_appeals_per_claim', e.target.value)}
            />
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
        <div className="card p-6">
          <h3 style={{ fontWeight: 700, marginBottom: '1.5rem', fontSize: '1.0625rem' }}>Workflow Transitions (JSON)</h3>
          <div className="form-group">
            <label className="form-label">Define allowed state transitions</label>
            <textarea
              className="form-control"
              rows={8}
              value={settings.workflow_transitions_json}
              onChange={(e: any) => handleChange('workflow_transitions_json', e.target.value)}
              style={{ fontFamily: 'monospace', fontSize: '0.875rem', whiteSpace: 'pre-wrap' }}
            />
            <small style={{ color: 'var(--gray-500)', marginTop: '0.5rem', display: 'block' }}>
              Must be valid JSON object mapping statuses to arrays of allowed next statuses.
            </small>
          </div>
        </div>

        <div className="card p-6">
          <h3 style={{ fontWeight: 700, marginBottom: '1.5rem', fontSize: '1.0625rem' }}>Notification Templates</h3>
          
          <div className="form-group">
            <label className="form-label">Claim Assigned - Subject</label>
            <input
              className="form-control"
              value={settings.template_claim_assigned_subject}
              onChange={(e: any) => handleChange('template_claim_assigned_subject', e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Claim Assigned - Body</label>
            <textarea
              className="form-control"
              rows={3}
              value={settings.template_claim_assigned_body}
              onChange={(e: any) => handleChange('template_claim_assigned_body', e.target.value)}
            />
          </div>

          <hr style={{ borderTop: '1px solid var(--gray-200)', margin: '1rem 0' }} />

          <div className="form-group">
            <label className="form-label">Payment Confirmed - Subject</label>
            <input
              className="form-control"
              value={settings.template_payment_confirmed_subject}
              onChange={(e: any) => handleChange('template_payment_confirmed_subject', e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Payment Confirmed - Body</label>
            <textarea
              className="form-control"
              rows={3}
              value={settings.template_payment_confirmed_body}
              onChange={(e: any) => handleChange('template_payment_confirmed_body', e.target.value)}
            />
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button className="btn btn-primary btn-lg" onClick={handleSave} disabled={loading}>
          {loading ? 'Saving...' : '💾 Save Settings'}
        </button>
      </div>
    </div>
  );
};
